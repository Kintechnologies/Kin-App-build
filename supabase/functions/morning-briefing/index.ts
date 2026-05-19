// Morning briefing cron — runs hourly (0 * * * *) and fans out to users
// whose local time is 6:00am–6:59am in their timezone.
//
// The hourly cron trigger (0 * * * *) is a pg_cron job defined in
// migration 046_morning_briefing_cron.sql — version-controlled, not a manual
// dashboard setting. The function fans out internally to users whose local
// hour is 6:xx.
//
// Reliability: per-profile delivery (generation, Twilio retry, AI fallback,
// audit logging, Slack alerting) lives in ../_shared/briefing.ts and is shared
// with the briefing-audit backstop. If a briefing is missed here, the audit
// edge function force-sends it at 9am CT.
//
// Required edge function secrets (set via Supabase dashboard → Edge Functions → Secrets):
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_SERVICE_SID, TWILIO_PHONE_NUMBER
// Optional:
//   OPENWEATHER_API_KEY — weather enrichment; absent keys degrade silently.
//   SLACK_BRIEFING_WEBHOOK_URL / ADMIN_PHONE — reliability alerting (see _shared/briefing.ts).

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import {
  supabase,
  getLocalHour,
  getLocalDate,
  resolveTimezone,
  deliverBriefing,
  notifySlack,
  type BriefingProfile,
} from "../_shared/briefing.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Fan-out: only profiles whose local hour is 6:xx and have a phone number
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, family_name, last_name, phone_number, timezone, created_at, subscription_status, billing_exempt")
    .not("phone_number", "is", null)
    .eq("onboarding_completed", true);

  if (profileError) {
    console.error("Failed to fetch profiles:", profileError.message);
    await notifySlack(
      `Morning-briefing cron could not load profiles: ${profileError.message}`,
      "critical"
    );
    return new Response(JSON.stringify({ error: profileError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!profiles || profiles.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const results = {
    processed: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    degraded: 0,
    errors: [] as string[],
  };

  for (const profile of profiles as BriefingProfile[]) {
    const tz = resolveTimezone(profile.timezone);

    // Only send during the 6am hour in the user's timezone
    if (getLocalHour(tz) !== 6) {
      results.skipped++;
      continue;
    }

    // Dedup key is the user's local date, not UTC — see getLocalDate.
    const briefingDate = getLocalDate(tz);

    // Dedup guard: skip if already sent today
    const { data: existing } = await supabase
      .from("morning_briefings")
      .select("id, delivery_status")
      .eq("profile_id", profile.id)
      .eq("briefing_date", briefingDate)
      .maybeSingle();

    if (existing?.delivery_status === "sent") {
      console.log(`Already sent to ${profile.id} today, skipping`);
      results.skipped++;
      continue;
    }

    results.processed++;

    const result = await deliverBriefing(profile, briefingDate, "morning-cron");
    if (result.status === "sent") {
      results.sent++;
      if (result.degraded) results.degraded++;
    } else {
      results.failed++;
      results.errors.push(`${profile.id}: ${result.error}`);
    }
  }

  console.log("Morning briefing batch:", results);
  return new Response(JSON.stringify(results), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
