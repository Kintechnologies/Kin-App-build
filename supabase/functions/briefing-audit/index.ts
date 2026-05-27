// Briefing-audit backstop — the "by any means necessary" delivery guarantee.
//
// Runs once daily at 14:00 UTC via the pg_cron job (registered through
// migration 072's functions_base_url() helper; originally 047/064). pg_cron
// doesn't respect DST, so the wall-clock CT time shifts with the season:
//   * 14:00 UTC = 08:00 CST in winter (UTC-6)
//   * 14:00 UTC = 09:00 CDT in summer (UTC-5)
// Audit V7 P2-I3: this is intentional and acceptable because by 14:00 UTC
// every mainland-US timezone has already passed its 6:00am local morning-
// briefing window in both DST modes. If we ever need 9am CT exactly, split
// into two cron rows (`0 15 * * *` Nov–Mar, `0 14 * * *` Mar–Nov) gated by
// a `EXTRACT(month FROM now())` predicate inside the job body.
//
// Any user still missing a briefing at this point was genuinely missed —
// a failed send, a cron that didn't fire, a transient outage.
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
  generateBriefing,
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
  try {
    return await runAudit(req);
  } catch (err) {
    // Top-level safety net (audit V7 P2-I4): the route already alerts on
    // profile-load failures and missed deliveries, but any uncaught
    // exception above would have surfaced only in Supabase logs. Slack the
    // failure with the same severity as the other cron crit alerts so the
    // backstop's silence never goes unnoticed.
    const msg = err instanceof Error ? err.message : String(err);
    try {
      await notifySlack(`Briefing audit crashed: ${msg}`, "critical");
    } catch {
      /* notify is best-effort */
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

async function runAudit(req: Request): Promise<Response> {
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
  //
  // P2-M3 (audit v6): the .or() gate at query time is the sole subscription
  // check on the force-send path. We intentionally do NOT re-check
  // subscription_status before the per-user force-send below — the query-
  // level filter is sufficient because:
  //   (a) the loop iterates the result set, never a re-query, so no row
  //       can sneak in mid-iteration;
  //   (b) a status that flips mid-run (canceled five minutes after the
  //       audit started) was active when the user paid for that day, so
  //       resuming their missed briefing is the correct fairness call;
  //   (c) double-defending in code would diverge from the primary 6am
  //       cron's behavior (same single gate at the query layer) and make
  //       drift between the two crons harder to spot.
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
    degradedRetried: 0,
    degradedUpgraded: 0,
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
    let degradedRetry = false;

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
        // V8: also pick up 'degraded' rows for an AI-only retry. The user
        // already received the plaintext fallback SMS this morning, so we
        // do NOT re-send — we only upgrade the persisted content if Claude
        // comes back online. Atomic CAS prevents concurrent retries.
        const { data: flippedDegraded } = await supabase
          .from("morning_briefings")
          .update({ delivery_status: "generated" })
          .eq("profile_id", profile.id)
          .eq("briefing_date", briefingDate)
          .eq("delivery_status", "degraded")
          .select("id")
          .maybeSingle();
        if (flippedDegraded) {
          claimed = true;
          degradedRetry = true;
        }
      }

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

    if (degradedRetry) {
      // AI-only retry path. The SMS already went out this morning with the
      // plaintext fallback; here we only attempt to regenerate higher-quality
      // content and overwrite the persisted row. No SMS, no nudge mutation,
      // no quality scoring — this is a backfill of the stored briefing.
      results.degradedRetried++;
      try {
        let daysSinceCreated = 0;
        if (profile.created_at) {
          daysSinceCreated = Math.floor(
            (Date.now() - new Date(profile.created_at).getTime()) / 86_400_000
          );
        }
        const appendPaymentNudge =
          !profile.billing_exempt &&
          profile.subscription_status === "trial" &&
          daysSinceCreated >= 14;
        const gen = await generateBriefing(
          profile.id,
          profile.family_name,
          profile.last_name,
          tz,
          appendPaymentNudge
        );
        if (!gen.degraded) {
          await supabase
            .from("morning_briefings")
            .update({ content: gen.text, delivery_status: "sent" })
            .eq("profile_id", profile.id)
            .eq("briefing_date", briefingDate);
          results.degradedUpgraded++;
        } else {
          // AI still down — return the row to 'degraded' so the next day's
          // audit will retry. Leave content alone (the plaintext that was
          // actually sent stays the source of truth).
          await supabase
            .from("morning_briefings")
            .update({ delivery_status: "degraded" })
            .eq("profile_id", profile.id)
            .eq("briefing_date", briefingDate);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await supabase
          .from("morning_briefings")
          .update({ delivery_status: "degraded" })
          .eq("profile_id", profile.id)
          .eq("briefing_date", briefingDate);
        results.errors.push(`${profile.id} (degraded-retry): ${msg}`);
      }
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
}
