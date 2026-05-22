// Briefing-audit backstop — the "by any means necessary" delivery guarantee.
//
// Runs once daily at 14:00 UTC (9am CT) via the pg_cron job in
// migration 047_briefing_audit_cron.sql. By 9am CT every mainland-US timezone
// has already passed its 6:00am morning-briefing window, so any user without a
// briefing today was genuinely missed — a failed send, a cron that didn't
// fire, a transient outage.
//
// For each missed user this function force-sends their briefing immediately
// (same generation + Twilio retry + AI fallback path as the morning cron) and
// alerts Slack so a human knows the backstop had to step in.
//
// The morning-briefing function has verify_jwt = false (config.toml); this one
// is registered the same way, so the cron POST needs no Authorization header.

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

  // TCPA: sms_opted_out_at IS NULL drops any user who replied STOP. The
  // backstop must respect the opt-out exactly as the 6am cron does — a
  // "by-any-means-necessary" recovery that re-texted an unsubscribed user
  // would be a TCPA violation, not reliability.
  //
  // Billing gate mirrors morning-briefing: trial/active subscribers only,
  // plus billing_exempt overrides. The audit must never recover a briefing
  // for a canceled or past_due account — that would defeat the gating on
  // the primary cron and re-introduce the same cost+compliance leak.
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, family_name, last_name, phone_number, timezone, created_at, subscription_status, billing_exempt, sms_opted_out_at")
    .not("phone_number", "is", null)
    .is("sms_opted_out_at", null)
    .eq("onboarding_completed", true)
    .or("subscription_status.in.(trial,active),billing_exempt.eq.true");

  if (error) {
    console.error("Audit failed to load profiles:", error.message);
    await notifySlack(
      `Briefing audit could not load profiles: ${error.message}`,
      "critical"
    );
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const results = {
    checked: 0,
    notYetDue: 0,
    alreadySent: 0,
    missed: 0,
    recovered: 0,
    stillFailed: 0,
    errors: [] as string[],
  };
  const missedNames: string[] = [];

  for (const profile of (profiles ?? []) as BriefingProfile[]) {
    const tz = resolveTimezone(profile.timezone);

    // Skip users whose 6am send window hasn't fully passed yet. At 14:00 UTC a
    // far-west timezone (e.g. Hawaii) may still be pre-6am local — their
    // briefing simply isn't due, not missed.
    if (getLocalHour(tz) < 7) {
      results.notYetDue++;
      continue;
    }

    results.checked++;
    const briefingDate = getLocalDate(tz);

    const { data: existing } = await supabase
      .from("morning_briefings")
      .select("id, delivery_status")
      .eq("profile_id", profile.id)
      .eq("briefing_date", briefingDate)
      .maybeSingle();

    // Already delivered — nothing to do.
    if (existing?.delivery_status === "sent") {
      results.alreadySent++;
      continue;
    }

    // No row at all, or a row stuck at 'failed' / 'generated' → missed.
    // Force-send now.
    results.missed++;
    missedNames.push(profile.family_name ?? profile.id);

    const result = await deliverBriefing(profile, briefingDate, "audit-backstop");
    if (result.status === "sent") {
      results.recovered++;
    } else if (result.status === "skipped") {
      // Defensive — the query already filters opt-outs, so this branch
      // should never fire. Decrement missed so the run isn't reported as
      // having unresolved gaps.
      results.missed--;
      missedNames.pop();
    } else {
      results.stillFailed++;
      results.errors.push(`${profile.id}: ${result.error}`);
    }
  }

  if (results.missed > 0) {
    const severity = results.stillFailed > 0 ? "critical" : "warning";
    await notifySlack(
      `Delivery audit found ${results.missed} user(s) with no briefing today: ` +
        `${missedNames.join(", ")}. Recovered ${results.recovered}, ` +
        `still failed ${results.stillFailed}.`,
      severity
    );
  }

  console.log("Briefing audit:", results);
  return new Response(JSON.stringify(results), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
