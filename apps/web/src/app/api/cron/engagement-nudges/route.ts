/**
 * GET /api/cron/engagement-nudges
 *
 * Engagement + trial nudge SMS. Two modes, selected by the ?mode= query param,
 * each on its own schedule:
 *
 *   ?mode=onboarding — hourly. Two onboarding nudges:
 *     • completed SMS onboarding but no calendar connected 24h+ later
 *     • started onboarding but went silent before finishing, 24h+ ago
 *     The Vercel Hobby plan only allows daily crons, so this hourly schedule
 *     lives in pg_cron (supabase/migrations/058_subdaily_crons.sql) and
 *     reaches this route via the cron-dispatch edge function.
 *
 *   ?mode=trial — daily, scheduled by Vercel Cron (apps/web/vercel.json). The
 *     trial drip sequence, by days since signup:
 *     • day 3  — check-in on the first briefings
 *     • day 7  — one-week encouragement
 *     • day 12 — "trial ends in 2 days" + payment link
 *     • day 13 — "last day tomorrow" + payment link
 *
 * With no mode (or ?mode=all) both run — handy for manual invocation.
 *
 * Every nudge is sent at most once per profile, guarded by the
 * profiles.nudges_sent jsonb map. SMS go out only during the recipient's local
 * daytime (8am–9pm) so a nudge never lands in the middle of the night; an
 * hourly run picks it up the moment the recipient wakes into that window.
 *
 * Protected by CRON_SECRET — same Bearer pattern as the other cron routes.
 */

import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/twilio";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { generateKinMessage } from "@/lib/generate-nudge";

type AdminClient = ReturnType<typeof createAdminClient>;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://kinai.family";
const BILLING_URL = `${APP_URL}/dashboard/billing`;
const DAY_MS = 86_400_000;

interface NudgeProfile {
  id: string;
  family_name: string | null;
  phone_number: string | null;
  timezone: string | null;
  created_at: string;
  onboarding_step: number | null;
  onboarding_completed: boolean | null;
  welcome_sms_sent_at: string | null;
  calendar_connect_token: string | null;
  subscription_status: string | null;
  billing_exempt: boolean | null;
  nudges_sent: Record<string, string> | null;
}

const NUDGE_COLUMNS =
  "id, family_name, phone_number, timezone, created_at, onboarding_step, " +
  "onboarding_completed, welcome_sms_sent_at, calendar_connect_token, " +
  "subscription_status, billing_exempt, nudges_sent";

interface Results {
  sent: number;
  skipped: number;
  failed: number;
  errors: string[];
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** First name only, with a friendly fallback. */
function firstName(p: NudgeProfile): string {
  return (p.family_name ?? "").split(/\s+/)[0] || "there";
}

/** Whole days elapsed since an ISO timestamp. */
function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS);
}

/**
 * True when it's a reasonable hour (8am–9pm) in the recipient's timezone to
 * send a nudge. An unknown/invalid timezone falls back to "yes" rather than
 * silencing the profile forever.
 */
function isDaytime(timezone: string | null): boolean {
  try {
    const hour = parseInt(
      new Intl.DateTimeFormat("en-US", {
        timeZone: timezone ?? "America/Los_Angeles",
        hour: "numeric",
        hour12: false,
      }).format(new Date()),
      10
    );
    return hour >= 8 && hour <= 21;
  } catch {
    return true;
  }
}

/** Already sent this nudge to this profile? */
function alreadySent(p: NudgeProfile, key: string): boolean {
  return Boolean((p.nudges_sent ?? {})[key]);
}

/**
 * Send one nudge SMS, log it to sms_conversations, and stamp nudges_sent so it
 * never sends again. Throws on Twilio failure so the caller can record it.
 */
async function sendNudge(
  supabase: AdminClient,
  profile: NudgeProfile,
  nudgeKey: string,
  body: string
): Promise<void> {
  await sendSms(profile.phone_number as string, body);

  await supabase.from("sms_conversations").insert({
    profile_id: profile.id,
    direction: "outbound",
    body,
    from_number: process.env.TWILIO_PHONE_NUMBER ?? "",
    to_number: profile.phone_number,
  });

  await supabase
    .from("profiles")
    .update({
      nudges_sent: {
        ...(profile.nudges_sent ?? {}),
        [nudgeKey]: new Date().toISOString(),
      },
    })
    .eq("id", profile.id);
}

// ─── Onboarding nudges (hourly) ─────────────────────────────────────────────

async function runOnboardingNudges(
  supabase: AdminClient,
  results: Results
): Promise<void> {
  const cutoff = new Date(Date.now() - DAY_MS).toISOString();

  // Nudge 1 — completed SMS onboarding (welcome SMS sent 24h+ ago) but never
  // connected a calendar. welcome_sms_sent_at is set only for SMS-onboarded
  // profiles, so the `<` filter naturally scopes this to them. TCPA: drop
  // anyone who replied STOP.
  const { data: completed } = await supabase
    .from("profiles")
    .select(NUDGE_COLUMNS)
    .eq("onboarding_completed", true)
    .not("phone_number", "is", null)
    .is("sms_opted_out_at", null)
    .lt("welcome_sms_sent_at", cutoff)
    .returns<NudgeProfile[]>();

  const calendarCandidates = (completed ?? []).filter(
    (p) => !alreadySent(p, "onboarding_calendar")
  );

  // One bulk query for who already has a calendar connection.
  const connected = new Set<string>();
  if (calendarCandidates.length > 0) {
    const { data: conns } = await supabase
      .from("calendar_connections")
      .select("profile_id")
      .in(
        "profile_id",
        calendarCandidates.map((p) => p.id)
      );
    for (const c of conns ?? []) {
      connected.add((c as { profile_id: string }).profile_id);
    }
  }

  for (const p of calendarCandidates) {
    if (connected.has(p.id)) continue;
    if (!isDaytime(p.timezone)) {
      results.skipped++;
      continue;
    }
    try {
      // Reuse the existing connect token if there is one; mint a fresh one
      // otherwise. The /connect/<token> page maps the token back to the profile.
      let token = p.calendar_connect_token;
      if (!token) {
        token = randomBytes(12).toString("hex");
        await supabase
          .from("profiles")
          .update({ calendar_connect_token: token })
          .eq("id", p.id);
      }
      const connectUrl = `${APP_URL}/connect/${token}`;
      const fallback =
        `Hey ${firstName(p)} — Kin's briefings get a lot sharper once your ` +
        `calendar's connected. 30 seconds, here: ${connectUrl}`;
      const body = await generateKinMessage({
        intent:
          "Nudge a parent who finished SMS onboarding 24h+ ago but never " +
          "connected a calendar. Lead with the specific value of connecting " +
          "(briefings that actually know their day), keep it under 320 chars, " +
          "and include the connect URL exactly as given. This is the first " +
          "SMS in a new thread, so opening with their first name is fine.",
        context: {
          parent_first_name: firstName(p),
          connect_url: connectUrl,
        },
        fallback,
        maxChars: 320,
      });
      await sendNudge(supabase, p, "onboarding_calendar", body);
      results.sent++;
    } catch (err) {
      results.failed++;
      results.errors.push(`onboarding_calendar ${p.id}: ${errMsg(err)}`);
    }
  }

  // Nudge 2 — started onboarding (past step 0) but went silent before
  // finishing, with the profile created 24h+ ago. TCPA: drop anyone who
  // replied STOP, even mid-onboarding.
  const { data: silent } = await supabase
    .from("profiles")
    .select(NUDGE_COLUMNS)
    .eq("onboarding_completed", false)
    .gte("onboarding_step", 1)
    .not("phone_number", "is", null)
    .is("sms_opted_out_at", null)
    .lt("created_at", cutoff)
    .returns<NudgeProfile[]>();

  for (const p of silent ?? []) {
    if (alreadySent(p, "onboarding_silent")) continue;
    if (!isDaytime(p.timezone)) {
      results.skipped++;
      continue;
    }
    try {
      const fallback =
        `Hey ${firstName(p)} — looks like setup got cut short. Want to pick ` +
        `up where you left off? Just reply here.`;
      const body = await generateKinMessage({
        intent:
          "Nudge a parent who started onboarding 24h+ ago but went silent " +
          "before finishing. Acknowledge that life got in the way without " +
          "guilt-tripping. Offer to pick up where they left off and tell " +
          "them they can just reply here to continue. One question max.",
        context: {
          parent_first_name: firstName(p),
        },
        fallback,
        maxChars: 320,
      });
      await sendNudge(supabase, p, "onboarding_silent", body);
      results.sent++;
    } catch (err) {
      results.failed++;
      results.errors.push(`onboarding_silent ${p.id}: ${errMsg(err)}`);
    }
  }
}

// ─── Trial drip (daily) ─────────────────────────────────────────────────────

interface TrialNudge {
  key: string;
  intent: string;
  fallback: (firstName: string) => string;
  includeBillingUrl: boolean;
}

/**
 * The single trial-drip nudge a profile is due for, given days since signup,
 * or null. Checked latest-first so a profile that missed an earlier message
 * jumps to the current one rather than backfilling a stale message. Days 12
 * and 13 are time-critical, so they match exactly; days 3 and 7 carry a grace
 * window in case a daily run is missed.
 *
 * Each entry describes intent + fallback. The actual body is LLM-generated at
 * send time so the wording shares the briefing voice (kin-voice.ts).
 */
function pickTrialNudge(days: number): TrialNudge | null {
  if (days === 13) {
    return {
      key: "trial_day13",
      intent:
        "Last-day-of-trial reminder. Your trial ends tomorrow. Be direct " +
        "without being alarmist: name what they'd lose (the personalized " +
        "morning briefing they've been getting) and include the billing " +
        "URL exactly as given. No exclamation points. No salesy language.",
      fallback: (n) =>
        `${n} — last day of your trial tomorrow. To keep the morning ` +
        `briefings going, subscribe here: ${BILLING_URL}`,
      includeBillingUrl: true,
    };
  }
  if (days === 12) {
    return {
      key: "trial_day12",
      intent:
        "Trial-ends-in-2-days reminder. Mention the timing concretely (2 " +
        "days) so they can act. Include the billing URL verbatim. Keep it " +
        "low-pressure but specific — no exclamation points, no urgency theater.",
      fallback: (n) =>
        `${n} — your trial ends in 2 days. To keep the morning briefings ` +
        `going, you can subscribe anytime: ${BILLING_URL}`,
      includeBillingUrl: true,
    };
  }
  if (days >= 7 && days <= 11) {
    return {
      key: "trial_day7",
      intent:
        "One-week-in encouragement message. Acknowledge they're a week into " +
        "the trial and that Kin has had time to learn their family's " +
        "rhythm. Warm, brief, no question, no link. This is a moment of " +
        "appreciation, not a sales pitch.",
      fallback: (n) =>
        `${n} — one week in. Kin's getting a feel for your family's rhythm. ` +
        `Here's to smoother mornings.`,
      includeBillingUrl: false,
    };
  }
  if (days >= 3 && days <= 6) {
    return {
      key: "trial_day3",
      intent:
        "Day-3 check-in on early briefings. Ask how the first few briefings " +
        "have been landing — what's working, what isn't. Genuinely curious, " +
        "not a survey. One open-ended question, then stop.",
      fallback: (n) =>
        `${n} — how are the first few briefings landing for you? What's ` +
        `working, what isn't? Reply and let me know.`,
      includeBillingUrl: false,
    };
  }
  return null;
}

async function runTrialNudges(
  supabase: AdminClient,
  results: Results
): Promise<void> {
  // Only onboarded profiles still on the trial. Paying/past-due/canceled
  // accounts have left the funnel; billing-exempt (team, comped, partners)
  // profiles are never nagged about billing. TCPA: drop anyone who replied STOP.
  const { data: trialing } = await supabase
    .from("profiles")
    .select(NUDGE_COLUMNS)
    .eq("subscription_status", "trial")
    .eq("billing_exempt", false)
    .eq("onboarding_completed", true)
    .not("phone_number", "is", null)
    .is("sms_opted_out_at", null)
    .returns<NudgeProfile[]>();

  for (const p of trialing ?? []) {
    const due = pickTrialNudge(daysSince(p.created_at));
    if (!due || alreadySent(p, due.key)) {
      results.skipped++;
      continue;
    }
    if (!isDaytime(p.timezone)) {
      results.skipped++;
      continue;
    }
    try {
      const name = firstName(p);
      const body = await generateKinMessage({
        intent: due.intent,
        context: {
          parent_first_name: name,
          billing_url: due.includeBillingUrl ? BILLING_URL : undefined,
        },
        fallback: due.fallback(name),
        maxChars: 320,
      });
      await sendNudge(supabase, p, due.key, body);
      results.sent++;
    } catch (err) {
      results.failed++;
      results.errors.push(`${due.key} ${p.id}: ${errMsg(err)}`);
    }
  }
}

// ─── Route ──────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mode = new URL(request.url).searchParams.get("mode") ?? "all";
  const supabase = createAdminClient();
  const results: Results = { sent: 0, skipped: 0, failed: 0, errors: [] };

  if (mode === "onboarding" || mode === "all") {
    await runOnboardingNudges(supabase, results);
  }
  if (mode === "trial" || mode === "all") {
    await runTrialNudges(supabase, results);
  }

  return NextResponse.json({
    ok: true,
    mode,
    sent: results.sent,
    skipped: results.skipped,
    failed: results.failed,
    errors: results.errors.length > 0 ? results.errors : undefined,
  });
}
