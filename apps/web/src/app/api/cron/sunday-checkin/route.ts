/**
 * GET /api/cron/sunday-checkin
 *
 * Weekly Sunday check-in. Runs hourly and fans out internally to users whose
 * local time is currently the 2pm hour on a Sunday — the same per-user-timezone
 * fan-out pattern the morning-briefing edge function uses, since the cron
 * itself has no timezone awareness.
 *
 * The Vercel Hobby plan only allows daily crons, so the hourly schedule lives
 * in pg_cron (supabase/migrations/058_subdaily_crons.sql) and reaches this
 * route via the cron-dispatch edge function.
 *
 * Each matching user gets one casual text asking what's coming up this week.
 * Their reply is captured by the inbound SMS webhook (/api/sms/inbound) into
 * user_context_notes, and the briefing generator folds recent notes into
 * Monday's morning briefing.
 *
 * Idempotent: profiles.sunday_checkin_sent_at is the dedup key. A user texted
 * within the last 3 days is skipped, so a double cron fire never double-sends.
 *
 * Vercel Cron invokes scheduled routes with GET and an
 * `Authorization: Bearer <CRON_SECRET>` header — same pattern as the other
 * cron routes.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/twilio";
import { isAuthorizedCron } from "@/lib/cron-auth";

interface CheckinProfile {
  id: string;
  family_name: string | null;
  phone_number: string;
  timezone: string | null;
  sunday_checkin_sent_at: string | null;
}

// Resend guard window — the cron only fires Sunday 2pm local, so any send in
// the last 3 days means this week's check-in already went out (covers a double
// cron fire within the same hour without ever blocking next week).
const RESEND_GUARD_MS = 3 * 86_400_000;

/** The user's local hour (0–23) and short weekday name ("Sun", "Mon", …). */
function getLocalParts(timezone: string): { hour: number; weekday: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(new Date());
  const hourStr = parts.find((p) => p.type === "hour")?.value ?? "0";
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  return { hour: parseInt(hourStr, 10) % 24, weekday };
}

function checkinMessage(familyName: string | null): string {
  const firstName = (familyName ?? "").trim().split(/\s+/)[0] || "there";
  return (
    `Hey ${firstName}! Anything big coming up this week? Any important ` +
    `reminders, deadlines, or things I should know about? Just reply here.`
  );
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, family_name, phone_number, timezone, sunday_checkin_sent_at")
    .eq("onboarding_completed", true)
    .not("phone_number", "is", null)
    .returns<CheckinProfile[]>();

  if (error || !profiles) {
    return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
  }

  const now = Date.now();
  const results = { processed: profiles.length, sent: 0, skipped: 0, failed: 0 };
  const errors: string[] = [];

  for (const profile of profiles) {
    const tz = profile.timezone ?? "America/Los_Angeles";
    const { hour, weekday } = getLocalParts(tz);

    // Only Sunday, only the 2pm hour in the user's own timezone.
    if (weekday !== "Sun" || hour !== 14) {
      results.skipped++;
      continue;
    }

    // Already checked in this week — guard against a double cron fire.
    if (
      profile.sunday_checkin_sent_at &&
      now - new Date(profile.sunday_checkin_sent_at).getTime() < RESEND_GUARD_MS
    ) {
      results.skipped++;
      continue;
    }

    const message = checkinMessage(profile.family_name);

    try {
      await sendSms(profile.phone_number, message);

      await supabase.from("sms_conversations").insert({
        profile_id: profile.id,
        direction: "outbound",
        body: message,
        from_number: process.env.TWILIO_PHONE_NUMBER ?? "",
        to_number: profile.phone_number,
      });

      // Stamp the send and clear any prior reply marker so the inbound webhook
      // treats this user's next message as a fresh check-in reply.
      await supabase
        .from("profiles")
        .update({
          sunday_checkin_sent_at: new Date().toISOString(),
          sunday_checkin_reply_at: null,
        })
        .eq("id", profile.id);

      results.sent++;
    } catch (err) {
      results.failed++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${profile.id}: ${msg}`);
      await supabase
        .from("sms_conversations")
        .insert({
          profile_id: profile.id,
          direction: "outbound_failed",
          body: `[sunday check-in failed: ${msg}]`,
          from_number: process.env.TWILIO_PHONE_NUMBER ?? "",
          to_number: profile.phone_number,
        })
        .then(() => {}, () => {});
    }
  }

  return NextResponse.json({
    ok: true,
    ...results,
    errors: errors.length > 0 ? errors : undefined,
  });
}
