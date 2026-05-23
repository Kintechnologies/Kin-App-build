import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { sendEmail, deletionReminderEmail } from "@/lib/email";
import * as Sentry from "@sentry/nextjs";

// This route should be called daily by a Vercel cron job
// Add to vercel.json: { "crons": [{ "path": "/api/cron/cleanup", "schedule": "0 6 * * *" }] }

export async function GET(request: Request) {
  // Consistent cron auth with every other cron route. (audit v3 P1-I1)
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  // 1. Send day-75 reminder to users approaching deletion
  const reminderDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 days from now
  const { data: reminderUsers } = await supabase
    .from("profiles")
    .select("id, email, family_name, data_deletion_at")
    .lte("data_deletion_at", reminderDate.toISOString())
    .gt("data_deletion_at", now.toISOString())
    .eq("deletion_reminded", false);

  let remindersSent = 0;
  if (reminderUsers && reminderUsers.length > 0) {
    for (const user of reminderUsers) {
      // Only flip deletion_reminded after the email actually sends, otherwise
      // a Resend outage would silently swallow the user's promised warning
      // and they'd never get one — the next run would skip them.
      if (!user.email || !user.data_deletion_at) continue;
      const template = deletionReminderEmail({
        firstName: user.family_name?.trim().split(/\s+/)[0] ?? null,
        deletionDate: new Date(user.data_deletion_at),
      });
      let sent = false;
      try {
        sent = await sendEmail({
          to: user.email,
          subject: template.subject,
          html: template.html,
          text: template.text,
        });
      } catch (err) {
        Sentry.captureException(err);
      }
      if (sent) {
        await supabase
          .from("profiles")
          .update({ deletion_reminded: true })
          .eq("id", user.id);
        remindersSent++;
      }
    }
    // Aggregate, count-only breadcrumb. Per-user messages used to include the
    // deletion timestamp (and email rows were in scope), leaking PII into
    // Sentry. (audit v3 P1-I2)
    //
    // P2-E5 (audit v6): the count-only breadcrumb is intentional. We do
    // NOT include per-user profile.id even though debugging a stuck
    // single-user case would be easier with one. Sentry projects with
    // wider access lists treat profile_id as quasi-identifier PII when
    // joined with the supabase admin console, and the trade-off (slightly
    // harder per-user debugging vs. a clean Sentry scrub posture) lands on
    // privacy. For one-off debugging use the supabase query log instead.
    Sentry.captureMessage(
      `cleanup: sent day-75 reminders to ${remindersSent} user(s) (eligible: ${reminderUsers.length})`,
      "info"
    );
  }

  // 2. Delete data for users past the 90-day grace period
  const { data: deletionUsers } = await supabase
    .from("profiles")
    .select("id")
    .lte("data_deletion_at", now.toISOString())
    .not("data_deletion_at", "is", null);

  let deletedCount = 0;

  if (deletionUsers && deletionUsers.length > 0) {
    for (const user of deletionUsers) {
      // V6 P1-E2: route through migration 070's atomic delete_user_account()
      // RPC. The legacy two-step (profile DELETE → admin.deleteUser) would
      // happily delete the auth row even if the profile DELETE failed (RLS,
      // FK, transient) — orphaning the auth.users row with no recovery path
      // for the user. The RPC is a single SECURITY DEFINER transaction:
      // either every row goes, or none do.
      const { error: rpcError } = await supabase.rpc("delete_user_account", {
        uid: user.id,
      });
      if (rpcError) {
        Sentry.captureException(
          new Error(
            `cleanup: delete_user_account RPC failed for ${user.id}: ${rpcError.message}`
          )
        );
        continue;
      }

      const { error: authErr } = await supabase.auth.admin.deleteUser(user.id);
      if (authErr) {
        // DB transaction already committed — profile + child rows are gone but
        // the auth.users row remains. Same recovery path as /api/account.
        Sentry.captureException(
          new Error(
            `cleanup: auth delete failed post-tx for ${user.id}: ${authErr.message}`
          )
        );
        continue;
      }
      deletedCount++;
    }
    Sentry.captureMessage(
      `cleanup: deleted ${deletedCount} account(s) per 90-day retention policy`,
      "info"
    );
  }

  // 3. 90-day TTL on briefing prose (audit V7 P2-M3): morning_briefings
  // accumulates ~1/day forever — 1825 rows over 5 years per active user —
  // and the body contains kid names, schools, and partner names. NULL the
  // `content` column after 90 days; quality grade / sent_at / score stay
  // for analytics, but the PII surface ages out.
  const ninetyDaysAgo = new Date(
    now.getTime() - 90 * 24 * 60 * 60 * 1000
  ).toISOString();
  let briefingsAged = 0;
  try {
    const { data: aged } = await supabase
      .from("morning_briefings")
      .update({ content: null })
      .lt("sent_at", ninetyDaysAgo)
      .not("content", "is", null)
      .select("id");
    briefingsAged = aged?.length ?? 0;
  } catch (err) {
    Sentry.captureException(err);
  }

  // 4. Expired-invite PII purge (audit V7 P2-P3): household_invites retains
  // the invitee_email / invitee_phone of someone who never accepted (and
  // never consented to long-term retention of their contact info). Sweep
  // any invite that's either past its expires_at or accepted, leaving
  // accepted=true rows older than 30 days as just the accepted_at audit
  // trail with the PII fields nulled out.
  let invitesPurged = 0;
  try {
    const thirtyDaysAgo = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();
    // Hard-delete invites that expired without being accepted.
    const { data: deletedExpired } = await supabase
      .from("household_invites")
      .delete()
      .lt("expires_at", now.toISOString())
      .eq("accepted", false)
      .select("id");
    invitesPurged += deletedExpired?.length ?? 0;
    // Scrub PII columns on accepted invites older than 30 days; keep the
    // audit row but null the recipient contact fields.
    const { data: scrubbed } = await supabase
      .from("household_invites")
      .update({ invitee_email: null, invitee_phone: null })
      .lt("accepted_at", thirtyDaysAgo)
      .eq("accepted", true)
      .not("invitee_email", "is", null)
      .select("id");
    invitesPurged += scrubbed?.length ?? 0;
  } catch (err) {
    Sentry.captureException(err);
  }

  return NextResponse.json({
    reminders_sent: remindersSent,
    reminders_eligible: reminderUsers?.length || 0,
    accounts_deleted: deletedCount,
    briefings_aged_out: briefingsAged,
    invites_purged: invitesPurged,
    timestamp: now.toISOString(),
  });
}
