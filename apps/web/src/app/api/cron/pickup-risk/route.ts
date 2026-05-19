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
      if (process.env.NODE_ENV !== "production") {
        console.error(`pickup-risk cron error for profile ${profile.id}:`, err);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    householdsProcessed: primaryProfiles.length,
    issuesCreated: totalCreated,
    errors: errors.length > 0 ? errors : undefined,
  });
}
