/**
 * POST /api/cron/pickup-risk
 *
 * Cron job: run pickup risk detection for all households.
 * Intended to fire once daily before morning briefings are generated (~6 AM).
 *
 * Protected by CRON_SECRET header — same pattern as other cron routes.
 *
 * Each household is processed independently; partial failures are logged
 * but do not abort the run. Returns a summary of issues created.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { detectPickupRisk } from "@/lib/pickup-risk";

interface ProfileRow {
  id: string;
}

export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
