/**
 * GET /api/cron/engagement-nudges
 *
 * Engagement + trial nudge SMS. Two modes, selected by the ?mode= query param
 * so one route backs two Vercel Cron schedules (see apps/web/vercel.json):
 *
 *   ?mode=onboarding — hourly. Two onboarding nudges:
 *     • completed SMS onboarding but no calendar connected 24h+ later
 *     • started onboarding but went silent before finishing, 24h+ ago
 *
 *   ?mode=trial — daily. The trial drip sequence, by days since signup:
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
  // profiles, so the `<` filter naturally scopes this to them.
  const { data: completed } = await supabase
    .from("profiles")
    .select(NUDGE_COLUMNS)
    .eq("onboarding_completed", true)
    .not("phone_number", "is", null)
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
      const body =
        `Hey ${firstName(p)}! Connect your Google Calendar so Kin can give you ` +
        `personalized briefings. It takes 30 seconds: ${APP_URL}/connect/${token}`;
      await sendNudge(supabase, p, "onboarding_calendar", body);
      results.sent++;
    } catch (err) {
      results.failed++;
      results.errors.push(`onboarding_calendar ${p.id}: ${errMsg(err)}`);
    }
  }

  // Nudge 2 — started onboarding (past step 0) but went silent before
  // finishing, with the profile created 24h+ ago.
  const { data: silent } = await supabase
    .from("profiles")
    .select(NUDGE_COLUMNS)
    .eq("onboarding_completed", false)
    .gte("onboarding_step", 1)
    .not("phone_number", "is", null)
    .lt("created_at", cutoff)
    .returns<NudgeProfile[]>();

  for (const p of silent ?? []) {
    if (alreadySent(p, "onboarding_silent")) continue;
    if (!isDaytime(p.timezone)) {
      results.skipped++;
      continue;
    }
    try {
      const body =
        "Hey! Looks like you didn't finish setting up Kin. Want to pick up " +
        "where you left off? Just reply here.";
      await sendNudge(supabase, p, "onboarding_silent", body);
      results.sent++;
    } catch (err) {
      results.failed++;
      results.errors.push(`onboarding_silent ${p.id}: ${errMsg(err)}`);
    }
  }
}

// ─── Trial drip (daily) ─────────────────────────────────────────────────────

/**
 * The single trial-drip nudge a profile is due for, given days since signup,
 * or null. Checked latest-first so a profile that missed an earlier message
 * jumps to the current one rather than backfilling a stale message. Days 12
 * and 13 are time-critical, so they match exactly; days 3 and 7 carry a grace
 * window in case a daily run is missed.
 */
function pickTrialNudge(days: number): { key: string; body: string } | null {
  if (days === 13) {
    return {
      key: "trial_day13",
      body:
        "Last day of your trial tomorrow! Don't lose your personalized " +
        `briefings: ${BILLING_URL}`,
    };
  }
  if (days === 12) {
    return {
      key: "trial_day12",
      body:
        "Heads up — your free trial ends in 2 days. To keep your morning " +
        `briefings, you can subscribe anytime: ${BILLING_URL}`,
    };
  }
  if (days >= 7 && days <= 11) {
    return {
      key: "trial_day7",
      body:
        "You're one week in! Kin has learned a lot about your family's " +
        "rhythm. Here's to smoother mornings.",
    };
  }
  if (days >= 3 && days <= 6) {
    return {
      key: "trial_day3",
      body: "How are your first few briefings? Reply and let us know what you think!",
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
  // profiles are never nagged about billing.
  const { data: trialing } = await supabase
    .from("profiles")
    .select(NUDGE_COLUMNS)
    .eq("subscription_status", "trial")
    .eq("billing_exempt", false)
    .eq("onboarding_completed", true)
    .not("phone_number", "is", null)
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
      await sendNudge(supabase, p, due.key, due.body);
      results.sent++;
    } catch (err) {
      results.failed++;
      results.errors.push(`${due.key} ${p.id}: ${errMsg(err)}`);
    }
  }
}

// ─── Route ──────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
