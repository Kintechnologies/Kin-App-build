/**
 * POST /api/cron/weekly-recap
 *
 * Sends the "Your week with Kin" recap to every onboarded profile with an
 * email on file. Intended to run Sunday evening. The recap is a progress
 * report: how many briefings landed, how many events Kin tracked, and how
 * many people are in the household it's learning.
 *
 * Idempotent within a week — a profile that already received a recap in the
 * last 5 days is skipped, so a double cron fire never double-sends.
 *
 * Protected by CRON_SECRET header — same pattern as the other cron routes.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, weeklyRecapEmail } from "@/lib/email";

interface RecapProfile {
  id: string;
  email: string | null;
  family_name: string | null;
  weekly_recap_sent_at: string | null;
}

const WEEK_MS = 7 * 86_400_000;

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, family_name, weekly_recap_sent_at")
    .eq("onboarding_completed", true)
    .not("email", "is", null)
    .returns<RecapProfile[]>();

  if (error || !profiles) {
    return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
  }

  const now = Date.now();
  const weekAgoIso = new Date(now - WEEK_MS).toISOString();
  const weekAgoDate = weekAgoIso.slice(0, 10);
  const recentCutoff = now - 5 * 86_400_000;

  const results = { processed: profiles.length, sent: 0, skipped: 0, failed: 0 };
  const errors: string[] = [];

  for (const profile of profiles) {
    if (!profile.email) {
      results.skipped++;
      continue;
    }
    // Already recapped this week — guard against a double cron fire.
    if (
      profile.weekly_recap_sent_at &&
      new Date(profile.weekly_recap_sent_at).getTime() > recentCutoff
    ) {
      results.skipped++;
      continue;
    }

    try {
      const [briefings, events, members] = await Promise.all([
        supabase
          .from("morning_briefings")
          .select("id", { count: "exact", head: true })
          .eq("profile_id", profile.id)
          .eq("delivery_status", "sent")
          .gte("briefing_date", weekAgoDate),
        supabase
          .from("calendar_events")
          .select("id", { count: "exact", head: true })
          .eq("profile_id", profile.id)
          .gte("start_time", weekAgoIso),
        supabase
          .from("family_members")
          .select("id", { count: "exact", head: true })
          .eq("profile_id", profile.id),
      ]);

      const briefingsSent = briefings.count ?? 0;
      const eventsTracked = events.count ?? 0;
      // +1 for the parent themselves — family_members holds the rest of the household.
      const familyMembers = (members.count ?? 0) + 1;

      const firstName = (profile.family_name ?? "").split(/\s+/)[0] || null;
      const sent = await sendEmail({
        to: profile.email,
        ...weeklyRecapEmail({ firstName, briefingsSent, eventsTracked, familyMembers }),
      });

      if (sent) {
        await supabase
          .from("profiles")
          .update({ weekly_recap_sent_at: new Date().toISOString() })
          .eq("id", profile.id);
        results.sent++;
      } else {
        results.skipped++;
      }
    } catch (err) {
      results.failed++;
      errors.push(`${profile.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    ...results,
    errors: errors.length > 0 ? errors : undefined,
  });
}
