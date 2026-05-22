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
//   GOOGLE_MAPS_API_KEY — live drive-time estimates via Distance Matrix API.
//                         Key must have the Distance Matrix API enabled.
//   SLACK_BRIEFING_WEBHOOK_URL / ADMIN_PHONE — reliability alerting (see _shared/briefing.ts).

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import {
  supabase,
  getLocalHour,
  getLocalDate,
  resolveTimezone,
  generateBriefing,
  deliverBriefing,
  notifySlack,
  type BriefingProfile,
} from "../_shared/briefing.ts";

// Length-aware constant-time compare so the test-mode auth gate doesn't leak
// secret length via response timing.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

interface TestInvocation {
  target_phone: string;
  dry_run?: boolean;
}

// Audit v5 P0-8: restrict actual SMS sends from the test endpoint to the
// founder phone set. CRON_SECRET is a single shared bearer (Vercel crons,
// cron-dispatch, Vault, /api/test/*) — leak in any of those paths would let
// an attacker send arbitrary briefings to any user. Pinning sends to an
// explicit allowlist contains that blast radius. dry_run=true is still allowed
// to any number (founder pipeline tracing) but the response strips PII.
const ADMIN_PHONES_FALLBACK = ["+16266762222", "+16266762832", "+16266761832"];
function adminPhones(): Set<string> {
  const env = Deno.env.get("ADMIN_PHONES");
  if (!env) return new Set(ADMIN_PHONES_FALLBACK);
  const parsed = env
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return new Set(parsed.length > 0 ? parsed : ADMIN_PHONES_FALLBACK);
}

/**
 * Single-profile test invocation. Lets `/api/test/morning-briefing` exercise
 * the real production briefing pipeline (the same code path the 6am fan-out
 * uses) instead of carrying a drifting Node copy. Audit v4 P0-6 deleted the
 * duplicate web copy.
 *
 * Auth: requires the `x-cron-secret` header to match CRON_SECRET — the test
 * route already gates itself on this same secret.
 *
 * Modes:
 *   dry_run = true  → generate only; return text + context. No Twilio, no DB
 *                     writes. Founder pipeline-trace use case.
 *   dry_run = false → full deliverBriefing(): generate + send + persist +
 *                     audit log + alerting. Same as the production fan-out.
 *
 * Bypasses the local-hour and already-sent guards on purpose so a founder can
 * trigger a briefing at any time of day.
 */
async function handleTestInvocation(
  req: Request,
  body: TestInvocation
): Promise<Response> {
  const secret = Deno.env.get("CRON_SECRET");
  const presented = req.headers.get("x-cron-secret") ?? "";
  if (!secret || !timingSafeEqual(presented, secret)) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // P0-8: actual SMS sends are gated to the admin phone allowlist. dry_run
  // mode is still allowed against any phone for pipeline tracing but the
  // response payload is scrubbed below.
  if (!body.dry_run) {
    const allowed = adminPhones();
    if (!allowed.has(body.target_phone)) {
      return new Response(
        JSON.stringify({
          error:
            "Forbidden: target_phone is not in ADMIN_PHONES; live sends from " +
            "the test endpoint are restricted to founder numbers",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, family_name, last_name, phone_number, timezone, created_at, " +
        "subscription_status, billing_exempt, sms_opted_out_at"
    )
    .eq("phone_number", body.target_phone)
    .maybeSingle();

  if (error) {
    return new Response(
      JSON.stringify({ error: `Profile lookup failed: ${error.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!profile) {
    return new Response(
      JSON.stringify({
        error: `No profile found with phone_number ${body.target_phone}`,
      }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const p = profile as BriefingProfile;
  const tz = resolveTimezone(p.timezone);

  if (body.dry_run) {
    let daysSinceCreated = 0;
    if (p.created_at) {
      daysSinceCreated = Math.floor(
        (Date.now() - new Date(p.created_at).getTime()) / 86_400_000
      );
    }
    const appendPaymentNudge =
      !p.billing_exempt &&
      p.subscription_status === "trial" &&
      daysSinceCreated >= 14;

    const generationStart = Date.now();
    const generated = await generateBriefing(
      p.id,
      p.family_name,
      p.last_name,
      tz,
      appendPaymentNudge
    );
    // P0-8: scrub PII from the dry_run response. CRON_SECRET is shared with
    // every cron route + Vault; a leak there would otherwise let an attacker
    // enumerate every paying family's name, timezone, and briefing context.
    return new Response(
      JSON.stringify({
        dry_run: true,
        target: {
          id: p.id,
          phone_number: p.phone_number,
        },
        briefing: generated.text,
        degraded: generated.degraded,
        briefing_chars: generated.text.length,
        duration_ms: Date.now() - generationStart,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  const briefingDate = getLocalDate(tz);
  const result = await deliverBriefing(p, briefingDate, "test-invocation");
  return new Response(
    JSON.stringify({
      dry_run: false,
      target: {
        id: p.id,
        family_name: p.family_name,
        phone_number: p.phone_number,
        timezone: tz,
      },
      briefing_date: briefingDate,
      delivery: result,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Caller authentication (audit v5 P0-2): every invocation requires the
  // x-cron-secret header to match CRON_SECRET. pg_cron sends the header via
  // public.cron_dispatch_headers() (migration 064). Without this, the function
  // is a public DoS amplifier — a curl with empty body would fall straight
  // through to the production fan-out and burn Claude + Twilio spend.
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

  // Single-profile test invocation: POST body with target_phone + matching
  // x-cron-secret header. Skips the fan-out entirely. (audit v4 P0-6)
  if (req.headers.get("content-type")?.includes("application/json")) {
    let parsed: unknown = null;
    try {
      parsed = await req.json();
    } catch {
      parsed = null;
    }
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as TestInvocation).target_phone === "string" &&
      (parsed as TestInvocation).target_phone.length > 0
    ) {
      return handleTestInvocation(req, parsed as TestInvocation);
    }
  }

  // Fan-out: only profiles whose local hour is 6:xx and have a phone number.
  // TCPA: sms_opted_out_at IS NULL drops any user who replied STOP — the
  // inbound webhook stamps that column on opt-out, and we treat non-NULL
  // as a hard suppression for every automated briefing path.
  //
  // Billing gate: only trial + active subscribers receive briefings.
  // past_due/canceled accounts would be both a cost leak (Twilio fees on a
  // lapsed customer) and a TCPA risk — 10DLC treats post-cancellation auto-SMS
  // as outside the consented "duration of the relationship". billing_exempt
  // (founder/comp) overrides the status filter via .or().
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, family_name, last_name, phone_number, timezone, created_at, subscription_status, billing_exempt, sms_opted_out_at")
    .not("phone_number", "is", null)
    .is("sms_opted_out_at", null)
    .eq("onboarding_completed", true)
    .or("subscription_status.in.(trial,active),billing_exempt.eq.true");

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
    } else if (result.status === "skipped") {
      results.skipped++;
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
