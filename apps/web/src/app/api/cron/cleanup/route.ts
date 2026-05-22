import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/cron-auth";
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

  if (reminderUsers && reminderUsers.length > 0) {
    for (const user of reminderUsers) {
      // TODO: Send reminder email via Beehiiv
      // "Your Kin data will be deleted on [date]. Reactivate to keep your family profile."
      await supabase
        .from("profiles")
        .update({ deletion_reminded: true })
        .eq("id", user.id);
    }
    // Aggregate, count-only breadcrumb. Per-user messages used to include the
    // deletion timestamp (and email rows were in scope), leaking PII into
    // Sentry. (audit v3 P1-I2)
    Sentry.captureMessage(
      `cleanup: sent day-75 reminders to ${reminderUsers.length} user(s)`,
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
      // Delete all user data (cascade handles related tables)
      // But first delete from tables without cascade
      await supabase.from("conversations").delete().eq("profile_id", user.id);
      await supabase.from("family_members").delete().eq("profile_id", user.id);
      await supabase.from("onboarding_preferences").delete().eq("profile_id", user.id);

      // Delete the profile itself (auth.users cascade will handle the rest)
      await supabase.from("profiles").delete().eq("id", user.id);

      // Delete the auth user
      await supabase.auth.admin.deleteUser(user.id);
      deletedCount++;
    }
    Sentry.captureMessage(
      `cleanup: deleted ${deletedCount} account(s) per 90-day retention policy`,
      "info"
    );
  }

  return NextResponse.json({
    reminders_sent: reminderUsers?.length || 0,
    accounts_deleted: deletedCount,
    timestamp: now.toISOString(),
  });
}
