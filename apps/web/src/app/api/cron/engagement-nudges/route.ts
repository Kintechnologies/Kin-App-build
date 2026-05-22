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
import { notifySlack } from "@/lib/notify";

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
  trial_ends_at: string | null;
  nudges_sent: Record<string, string> | null;
}

const NUDGE_COLUMNS =
  "id, family_name, phone_number, timezone, created_at, onboarding_step, " +
  "onboarding_completed, welcome_sms_sent_at, calendar_connect_token, " +
  "subscription_status, billing_exempt, trial_ends_at, nudges_sent";

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
 *
 * P2-E3 (audit v6): unknown-timezone fallback used to be
 * "America/Los_Angeles" — that silently assumed PT for India / EU users
 * whose profile timezone wasn't captured, so they got nudges at 8 AM PT
 * (≈ 8:30 PM IST). Switched to UTC: a wider band of recipients see the
 * nudge at a defensible local hour, and the morning-briefing pipeline
 * already requires a real timezone (so the unknown-timezone path here
 * only fires for stale rows). UTC's 8–21 window covers most of the
 * waking hours for both Americas and Europe.
 */
function isDaytime(timezone: string | null): boolean {
  try {
    const hour = parseInt(
      new Intl.DateTimeFormat("en-US", {
        timeZone: timezone ?? "UTC",
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
 * V6 P1-E1: per-day cross-type cap. We already de-dupe per nudge key, but a
 * trial-day-7 user who also tripped the onboarding-silent guard would have
 * received both SMS in the same 12-hour window. Three engagement texts in a
 * day feels like spam and quietly bumps STOP-rate. One nudge per 24h across
 * all keys is the right ceiling.
 */
const MAX_PER_DAY_WINDOW_MS = 24 * 60 * 60 * 1000;
function sentInLastDay(p: NudgeProfile): boolean {
  const sent = p.nudges_sent ?? {};
  const cutoff = Date.now() - MAX_PER_DAY_WINDOW_MS;
  for (const ts of Object.values(sent)) {
    if (typeof ts !== "string") continue;
    const ms = Date.parse(ts);
    if (Number.isFinite(ms) && ms >= cutoff) return true;
  }
  return false;
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
    if (sentInLastDay(p)) {
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
    if (sentInLastDay(p)) {
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

/**
 * Flip expired trials (trial_ends_at < now AND no Stripe customer) to
 * `canceled` so the briefing fan-out filter `(trial, active)` stops sending
 * free briefings to users who never paid.
 *
 * The Stripe webhook only writes `canceled` on `customer.subscription.deleted`
 * — a user who finishes 14 days without paying has no Stripe subscription, so
 * nothing fires that event. Without this nightly flip the trial-gating fix in
 * the briefing edge functions is neutralized for the common case. (audit v4 P0-1)
 *
 * Runs at the top of the daily trial-mode cron so the trial-ended one-shot SMS
 * (below) catches the newly-canceled users on the same run.
 */
async function expireUnpaidTrials(supabase: AdminClient): Promise<number> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ subscription_status: "canceled" })
    .eq("subscription_status", "trial")
    .eq("billing_exempt", false)
    .lt("trial_ends_at", new Date().toISOString())
    .select("id");

  if (error) {
    console.error("expireUnpaidTrials failed:", error.message);
    await notifySlack(
      `Trial-expiry flip failed: ${error.message}`,
      "critical"
    ).catch(() => {});
    return 0;
  }
  return data?.length ?? 0;
}

async function runTrialNudges(
  supabase: AdminClient,
  results: Results
): Promise<void> {
  // Flip expired-without-paying trials to canceled first — see expireUnpaidTrials.
  // The trial-ended one-shot below then catches them on the same run.
  const expired = await expireUnpaidTrials(supabase);
  if (expired > 0) {
    console.log(`expireUnpaidTrials: flipped ${expired} trial(s) to canceled`);
  }

  // Trial-ended one-shot. When a trial flips to canceled (P0-1 stopped them
  // receiving briefings the same day), send one warm goodbye-with-an-upgrade-
  // link SMS so the user knows what happened and how to come back. Exactly
  // once per profile — gated on the nudges_sent key. (audit v3 P1-E4)
  const { data: justEnded } = await supabase
    .from("profiles")
    .select(NUDGE_COLUMNS)
    .eq("subscription_status", "canceled")
    .eq("billing_exempt", false)
    .eq("onboarding_completed", true)
    .not("phone_number", "is", null)
    .is("sms_opted_out_at", null)
    .returns<NudgeProfile[]>();

  for (const p of justEnded ?? []) {
    if (alreadySent(p, "trial_ended")) continue;
    // 72h window: don't surprise a long-canceled user with a goodbye SMS days
    // or weeks after their trial expired (e.g. backfill, support reinstate,
    // or anyone whose row sat un-flipped). If trial_ends_at is missing, skip —
    // we can't establish the freshness window.
    const trialEndedAt = p.trial_ends_at
      ? new Date(p.trial_ends_at).getTime()
      : null;
    if (!trialEndedAt || Date.now() - trialEndedAt > 3 * DAY_MS) {
      results.skipped++;
      continue;
    }
    if (!isDaytime(p.timezone)) {
      results.skipped++;
      continue;
    }
    if (sentInLastDay(p)) {
      results.skipped++;
      continue;
    }
    try {
      const name = firstName(p);
      const fallback =
        `${name} — your trial ended, so the morning briefings have paused. ` +
        `If you want them back, you can resubscribe here: ${BILLING_URL}`;
      const body = await generateKinMessage({
        intent:
          "Trial-ended one-shot SMS. The trial just lapsed and the user is " +
          "no longer receiving briefings. Be warm and brief: tell them the " +
          "trial ended, that briefings have paused, and that they can " +
          "resubscribe via the billing URL exactly as given. No urgency " +
          "theater, no exclamation points. This is sent exactly once.",
        context: {
          parent_first_name: name,
          billing_url: BILLING_URL,
        },
        fallback,
        maxChars: 320,
      });
      await sendNudge(supabase, p, "trial_ended", body);
      results.sent++;
    } catch (err) {
      results.failed++;
      results.errors.push(`trial_ended ${p.id}: ${errMsg(err)}`);
    }
  }

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
    if (sentInLastDay(p)) {
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

  // P2-E1 (audit v6): strict enum check on ?mode=. Previously an unknown
  // value (typo, stale pg_cron job after a rename) silently fell through
  // to "all", running BOTH onboarding + trial fan-outs. That doubled the
  // intended send volume and made misconfiguration invisible.
  const rawMode = new URL(request.url).searchParams.get("mode");
  const mode = rawMode ?? "all";
  const ALLOWED_MODES = new Set(["all", "onboarding", "trial"]);
  if (!ALLOWED_MODES.has(mode)) {
    return NextResponse.json(
      {
        error: "Invalid mode",
        allowed: Array.from(ALLOWED_MODES),
        received: mode,
      },
      { status: 400 }
    );
  }
  const supabase = createAdminClient();
  const results: Results = { sent: 0, skipped: 0, failed: 0, errors: [] };

  if (mode === "onboarding" || mode === "all") {
    await runOnboardingNudges(supabase, results);
  }
  if (mode === "trial" || mode === "all") {
    await runTrialNudges(supabase, results);
  }

  // Aggregate alert per run, not per failure — a Twilio outage would otherwise
  // spam the channel. Critical: every trial-drip nudge that doesn't land is a
  // conversion that quietly evaporates and a user that doesn't see day 12/13's
  // payment ask.
  if (results.failed > 0) {
    await notifySlack(
      `Engagement nudges (${mode}) failed for ${results.failed} send(s) (sent ${results.sent}). First few: ${results.errors.slice(0, 3).join(" | ")}`,
      "critical"
    ).catch(() => {});
  }

  // V6 P1-I5: signal failure to Vercel Cron so it retries with exponential
  // backoff. Returning 200 on partial failure used to lose every onboarding
  // nudge during a 30-min Twilio outage with no recovery. 500 lets the cron
  // come back around on its own.
  const status = results.failed > 0 ? 500 : 200;
  return NextResponse.json(
    {
      ok: results.failed === 0,
      mode,
      sent: results.sent,
      skipped: results.skipped,
      failed: results.failed,
      errors: results.errors.length > 0 ? results.errors : undefined,
    },
    { status }
  );
}
