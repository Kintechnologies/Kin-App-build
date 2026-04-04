/**
 * Pickup-Risk Daily Cron — GET /api/cron/pickup-risk
 *
 * Runs daily at 6 AM UTC via Vercel cron.
 * Scans today's kid events for windows where no parent in the household
 * appears to be available (both parents have overlapping non-kid events).
 * When a risk is detected and no OPEN pickup_risk issue exists for that
 * window, inserts a coordination_issue row so the Today screen can surface
 * an alert card.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import * as Sentry from "@sentry/nextjs";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  // Scan window: from now until end of today (UTC)
  const endOfDay = new Date(now);
  endOfDay.setUTCHours(23, 59, 59, 999);

  // 1. Fetch kid events that start within today's remaining window
  const { data: kidEvents, error: kidError } = await supabase
    .from("calendar_events")
    .select("id, profile_id, household_id, title, start_time, end_time, assigned_member")
    .eq("is_kid_event", true)
    .is("deleted_at", null)
    .gte("start_time", now.toISOString())
    .lte("start_time", endOfDay.toISOString());

  if (kidError) {
    Sentry.captureException(kidError);
    return NextResponse.json({ error: "Failed to fetch kid events" }, { status: 500 });
  }

  if (!kidEvents || kidEvents.length === 0) {
    return NextResponse.json({
      issues_created: 0,
      message: "No kid events today",
      timestamp: now.toISOString(),
    });
  }

  let issuesCreated = 0;

  for (const kidEvent of kidEvents) {
    try {
      // household_id falls back to the profile's own id for single-parent households
      const householdId = kidEvent.household_id ?? kidEvent.profile_id;

      // 2. Find all profiles in this household
      const { data: householdMembers } = await supabase
        .from("profiles")
        .select("id")
        .or(`id.eq.${householdId},household_id.eq.${householdId}`);

      if (!householdMembers || householdMembers.length === 0) continue;

      const parentIds = householdMembers.map((m: { id: string }) => m.id);

      // 3. Find non-kid events for any household parent that overlap this kid event's window
      const { data: conflictingEvents } = await supabase
        .from("calendar_events")
        .select("profile_id")
        .in("profile_id", parentIds)
        .eq("is_kid_event", false)
        .is("deleted_at", null)
        .lt("start_time", kidEvent.end_time)
        .gt("end_time", kidEvent.start_time);

      const busyParentIds = new Set(
        (conflictingEvents ?? []).map((e: { profile_id: string }) => e.profile_id)
      );

      // Risk: every parent in the household is busy during the pickup window
      const allParentsBusy = parentIds.every((id: string) => busyParentIds.has(id));
      if (!allParentsBusy) continue;

      // 4. Skip if an OPEN pickup_risk issue already exists for this window
      const { data: existing } = await supabase
        .from("coordination_issues")
        .select("id")
        .eq("household_id", householdId)
        .eq("trigger_type", "pickup_risk")
        .eq("state", "OPEN")
        .lte("event_window_start", kidEvent.end_time)
        .gte("event_window_end", kidEvent.start_time)
        .limit(1);

      if (existing && existing.length > 0) continue;

      // 5. Create the coordination issue
      const memberLabel = kidEvent.assigned_member
        ? `${kidEvent.assigned_member}'s`
        : "a kid's";

      const { error: insertError } = await supabase
        .from("coordination_issues")
        .insert({
          household_id: householdId,
          trigger_type: "pickup_risk",
          state: "OPEN",
          content: `Pickup risk: ${memberLabel} event "${kidEvent.title}" has no available parent — all household members have conflicting commitments at this time.`,
          event_window_start: kidEvent.start_time,
          event_window_end: kidEvent.end_time,
          surfaced_at: now.toISOString(),
        });

      if (insertError) {
        Sentry.captureException(insertError);
        continue;
      }

      issuesCreated++;
    } catch (err) {
      Sentry.captureException(err);
      // Non-fatal: continue to next event
    }
  }

  return NextResponse.json({
    issues_created: issuesCreated,
    kid_events_scanned: kidEvents.length,
    timestamp: now.toISOString(),
  });
}
