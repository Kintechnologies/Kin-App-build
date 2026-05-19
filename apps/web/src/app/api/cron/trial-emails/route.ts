/**
 * POST /api/cron/trial-emails
 *
 * Trial drip sequence. Intended to run once daily; for each onboarded profile
 * still in its trial, it sends the email matching how many days ago the profile
 * was created:
 *
 *   day 2  → "Getting the most out of Kin"
 *   day 4  → "What Kin learns over time"
 *   day 13 → "Your trial wraps up tomorrow"
 *   day 14+ → "Your Kin trial is complete"  (the expiry email)
 *
 * At most one email is sent per profile per run. Each send is guarded by a
 * profiles.*_email_sent_at column so a profile never receives the same drip
 * email twice. Days 2 and 4 use a one-day grace window so a single missed cron
 * run still delivers them.
 *
 * Profiles with no email on file (phone-only signups) are skipped — the task
 * says to check for an email first.
 *
 * Protected by CRON_SECRET header — same pattern as the other cron routes.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendEmail,
  trialDay2Email,
  trialDay4Email,
  trialDay6Email,
  trialExpiryEmail,
  type EmailTemplate,
} from "@/lib/email";

interface TrialProfile {
  id: string;
  email: string | null;
  family_name: string | null;
  created_at: string;
  trial_day2_email_sent_at: string | null;
  trial_day4_email_sent_at: string | null;
  trial_day6_email_sent_at: string | null;
  trial_expiry_email_sent_at: string | null;
}

type SentColumn =
  | "trial_day2_email_sent_at"
  | "trial_day4_email_sent_at"
  | "trial_day6_email_sent_at"
  | "trial_expiry_email_sent_at";

/**
 * Pick the single drip email a profile is due for, or null. Candidates are
 * ordered latest-first so a profile that somehow missed earlier emails skips
 * straight to the current one rather than backfilling stale messages.
 */
function pickDripEmail(
  p: TrialProfile,
  daysSinceCreated: number
): { column: SentColumn; template: EmailTemplate } | null {
  const firstName = (p.family_name ?? "").split(/\s+/)[0] || null;

  if (daysSinceCreated >= 14 && !p.trial_expiry_email_sent_at) {
    return { column: "trial_expiry_email_sent_at", template: trialExpiryEmail(firstName) };
  }
  if (daysSinceCreated === 13 && !p.trial_day6_email_sent_at) {
    return { column: "trial_day6_email_sent_at", template: trialDay6Email(firstName) };
  }
  if (daysSinceCreated >= 4 && daysSinceCreated <= 5 && !p.trial_day4_email_sent_at) {
    return { column: "trial_day4_email_sent_at", template: trialDay4Email(firstName) };
  }
  if (daysSinceCreated >= 2 && daysSinceCreated <= 3 && !p.trial_day2_email_sent_at) {
    return { column: "trial_day2_email_sent_at", template: trialDay2Email(firstName) };
  }
  return null;
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Only trialing, onboarded profiles with an email on file. Paying users
  // (subscription_status 'active') have left the trial funnel.
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(
      "id, email, family_name, created_at, trial_day2_email_sent_at, trial_day4_email_sent_at, trial_day6_email_sent_at, trial_expiry_email_sent_at"
    )
    .eq("onboarding_completed", true)
    .eq("subscription_status", "trial")
    .not("email", "is", null)
    .returns<TrialProfile[]>();

  if (error || !profiles) {
    return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
  }

  const results = { processed: profiles.length, sent: 0, skipped: 0, failed: 0 };
  const errors: string[] = [];

  for (const profile of profiles) {
    const daysSinceCreated = Math.floor(
      (Date.now() - new Date(profile.created_at).getTime()) / 86_400_000
    );

    const due = pickDripEmail(profile, daysSinceCreated);
    if (!due || !profile.email) {
      results.skipped++;
      continue;
    }

    try {
      const sent = await sendEmail({ to: profile.email, ...due.template });
      if (sent) {
        await supabase
          .from("profiles")
          .update({ [due.column]: new Date().toISOString() })
          .eq("id", profile.id);
        results.sent++;
      } else {
        // RESEND_API_KEY absent — sendEmail no-ops; leave unguarded for retry.
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
