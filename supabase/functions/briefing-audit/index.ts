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
// Caller authentication (audit v5 P0-2): every invocation requires the
// x-cron-secret header to match CRON_SECRET. pg_cron sends the header via
// public.cron_dispatch_headers() (migration 064). Without this, the function
// is a public DoS amplifier — anyone could force the "by-any-means-necessary"
// backstop to re-send briefings to the entire user base on demand.

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

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret) {
    return new Response(
      JSON.stringify({ error: "CRON_SECRET not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  const presented = req.headers.get("x-cron-secret") ?? "";
  if (!timingSafeEqual(presented, cronSecret)) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
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

    // Atomic claim (v5 P2-B2): try to insert a placeholder row, or atomically
    // flip a stale 'failed' row to 'generated'. Postgres row-level locking
    // serializes concurrent CAS attempts — the loser sees a row already in
    // 'generated' or 'sent' and skips. Closes the SELECT-then-SEND double-send
    // window if the audit cron retries while a prior invocation is mid-flight.
    const insertAttempt = await supabase
      .from("morning_briefings")
      .insert({
        profile_id: profile.id,
        briefing_date: briefingDate,
        content: "",
        delivery_status: "generated",
      })
      .select("id")
      .maybeSingle();

    let claimed = !!insertAttempt.data;
    let alreadySent = false;

    if (!claimed) {
      // Row exists — try to atomically flip 'failed' → 'generated' to claim.
      const { data: flipped } = await supabase
        .from("morning_briefings")
        .update({ delivery_status: "generated", sent_at: null })
        .eq("profile_id", profile.id)
        .eq("briefing_date", briefingDate)
        .eq("delivery_status", "failed")
        .select("id")
        .maybeSingle();
      claimed = !!flipped;

      if (!claimed) {
        // Row is either 'sent' (already delivered) or 'generated' (another
        // invocation has the claim mid-flight). Either way we don't re-send.
        const { data: existing } = await supabase
          .from("morning_briefings")
          .select("delivery_status")
          .eq("profile_id", profile.id)
          .eq("briefing_date", briefingDate)
          .maybeSingle();
        alreadySent = existing?.delivery_status === "sent";
      }
    }

    if (!claimed) {
      if (alreadySent) {
        results.alreadySent++;
      }
      // 'generated' with another invocation holding the claim: silently skip;
      // the audit re-runs daily and the in-flight original will land 'sent'.
      continue;
    }

    // We own this briefing — force-send now.
    results.missed++;
    // PII: Slack payloads identify users by profile.id UUID only — never the
    // user-supplied family_name. The audit summary goes to a channel with
    // broader access than the database.
    missedNames.push(profile.id);

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
