/**
 * GET /api/cron/pickup-risk
 *
 * Cron job: run pickup-risk detection for every household.
 *
 * Runs every 30 minutes. The Vercel Hobby plan only allows daily crons, so the
 * schedule lives in pg_cron (supabase/migrations/058_subdaily_crons.sql) and
 * reaches this route via the cron-dispatch edge function. detectPickupRisk is
 * the intra-day proactive alert engine: each tick re-detects pickup conflicts
 * and texts the household a heads-up for any conflict whose pickup is ~30
 * minutes out. The work is idempotent — coordination_issues dedupe by window
 * and the SMS dedupes via coordination_issues.alert_sms_sent_at.
 *
 * Invoked with GET and an `Authorization: Bearer <CRON_SECRET>` header — same
 * pattern as the other cron routes.
 *
 * Each household is processed independently; partial failures are logged but
 * do not abort the run. Returns a summary of issues created.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { detectPickupRisk } from "@/lib/pickup-risk";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { notifySlack } from "@/lib/notify";
import * as Sentry from "@sentry/nextjs";

interface ProfileRow {
  id: string;
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Fetch all primary parent profiles (household_id IS NULL = primary/only parent).
  // We run detection once per household, not once per parent.
  const { data: primaryProfiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id")
    .is("household_id", null)
    .returns<ProfileRow[]>();

  if (profilesError || !primaryProfiles) {
    if (process.env.NODE_ENV !== "production") {
      console.error("pickup-risk cron: failed to fetch profiles", profilesError);
    }
    return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
  }

  let totalCreated = 0;
  const errors: string[] = [];

  for (const profile of primaryProfiles) {
    try {
      const created = await detectPickupRisk(supabase, profile.id);
      totalCreated += created.length;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`profile ${profile.id}: ${msg}`);
      // Audit V7 P2-E4: route per-profile failures to Sentry — the previous
      // implementation only pushed to the in-memory errors[] array, so no
      // alerting surface ever saw them.
      Sentry.captureException(err, { extra: { profile_id: profile.id } });
      if (process.env.NODE_ENV !== "production") {
        console.error(`pickup-risk cron error for profile ${profile.id}:`, err);
      }
    }
  }

  // Aggregate failure-rate alert (audit V7 P2-E3): mirror the
  // calendar-renewal pattern so a Twilio brownout or a buggy detector
  // change surfaces immediately instead of waiting for someone to read
  // pickup-risk telemetry.
  const failureRatio =
    primaryProfiles.length > 0 ? errors.length / primaryProfiles.length : 0;
  if (failureRatio >= 0.5 && errors.length > 0) {
    await notifySlack(
      `pickup-risk cron failure rate ${Math.round(failureRatio * 100)}% (${errors.length} of ${primaryProfiles.length}). First few: ${errors.slice(0, 3).join(" | ")}`,
      "critical"
    ).catch(() => {});
  }

  // Audit V7 P2-I5: return 500 on any failure so Vercel Cron / cron-
  // dispatch retries with backoff — returning 200 used to silently lose
  // the run during transient outages, mirroring the V6 P1-I5 fix for
  // engagement-nudges.
  const status = errors.length > 0 ? 500 : 200;
  return NextResponse.json(
    {
      ok: errors.length === 0,
      householdsProcessed: primaryProfiles.length,
      issuesCreated: totalCreated,
      errors: errors.length > 0 ? errors : undefined,
    },
    { status }
  );
}
