/**
 * Pickup Risk Detection — §3A
 *
 * For each child with a scheduled activity today, checks whether parent calendar
 * coverage exists during the pickup window (activity end_time → end_time + 30min).
 *
 * Severity rules (§3A):
 *   RED    — both parents have calendar events during the pickup window
 *            → create OPEN coordination_issue with trigger_type = 'pickup_risk'
 *   YELLOW — default handler (the parent who registered the activity) is busy,
 *            but the other parent is free
 *            → create OPEN coordination_issue (softer tone)
 *   CLEAR  — default handler is free, or no partner exists → no issue created
 *
 * Deduplication: a new issue is only inserted when no OPEN or ACKNOWLEDGED
 * pickup_risk issue already exists for the same household + event_window_start.
 *
 * Called from:
 *   - /api/cron/pickup-risk  (daily, before morning briefings are generated)
 *   - morning-briefing route  (inline, so briefing content reflects latest risk)
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { generateAlertContent } from "@/lib/generate-alert-content";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityRow {
  id: string;
  name: string;
  end_time: string | null; // TIME string "HH:MM:SS"
  day_of_week: string[] | null;
  profile_id: string; // default handler = parent who registered the activity
  family_member: { name: string } | null;
}

interface CalendarEventRow {
  id: string;
  start_time: string;
  end_time: string;
  owner_parent_id: string;
}

interface ExistingIssueRow {
  id: string;
  event_window_start: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns "Monday", "Tuesday", etc. for the given Date. */
function getDayName(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

/**
 * Parses a TIME string ("HH:MM:SS") into today's UTC Date,
 * treating the time as local (approximate — pickup windows are not sub-second precise).
 */
function todayAtTime(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/**
 * Returns true if a calendar event overlaps with [windowStart, windowEnd).
 * Overlap: event starts before window ends AND event ends after window starts.
 */
function overlapsWindow(
  event: CalendarEventRow,
  windowStart: Date,
  windowEnd: Date
): boolean {
  const evStart = new Date(event.start_time);
  const evEnd = new Date(event.end_time);
  return evStart < windowEnd && evEnd > windowStart;
}

// ─── Main Detection Function ──────────────────────────────────────────────────

/**
 * detectPickupRisk
 *
 * Runs pickup risk detection for a single parent profile.
 * Resolves the household (both parents), checks today's child activities,
 * and creates coordination_issues for any pickup coverage gaps found.
 *
 * @param supabase  Service-role or user-context Supabase client
 * @param profileId Profile ID of either parent in the household
 * @returns Array of issue IDs created (empty if no risks detected or all deduped)
 */
export async function detectPickupRisk(
  supabase: SupabaseClient,
  profileId: string
): Promise<string[]> {
  const createdIssueIds: string[] = [];

  // ── 1. Resolve household members ─────────────────────────────────────────

  // household_id = NULL  → this is the primary parent
  // household_id = <X>   → this parent's primary is X
  const { data: selfProfile } = await supabase
    .from("profiles")
    .select("id, household_id")
    .eq("id", profileId)
    .single<{ id: string; household_id: string | null }>();

  if (!selfProfile) return createdIssueIds;

  // Determine primary profile ID (normalise so we always query from the primary's POV)
  const primaryId = selfProfile.household_id ?? selfProfile.id;

  // Find partner: the other profile whose household_id points to primaryId,
  // or whose id is household_id (if selfProfile IS the partner).
  const { data: partnerProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("household_id", primaryId)
    .neq("id", primaryId)
    .limit(1)
    .maybeSingle<{ id: string }>();

  const partnerId: string | null = partnerProfile?.id ?? null;

  // Both parent IDs in one array for calendar queries
  const parentIds = [primaryId, ...(partnerId ? [partnerId] : [])];

  // ── 2. Find today's children's activities with a known end_time ───────────

  const todayName = getDayName(new Date());

  // Query activities across all children registered by either parent
  const { data: activities, error: actError } = await supabase
    .from("children_activities")
    .select(
      "id, name, end_time, day_of_week, profile_id, family_member:family_members(name)"
    )
    .in("profile_id", parentIds)
    .eq("active", true)
    .not("end_time", "is", null)
    .returns<ActivityRow[]>();

  if (actError || !activities || activities.length === 0) {
    return createdIssueIds;
  }

  // Filter to activities that run today
  const todayActivities = activities.filter(
    (a) => (a.day_of_week ?? []).includes(todayName) && a.end_time
  );

  if (todayActivities.length === 0) return createdIssueIds;

  // ── 3. Fetch existing OPEN/ACKNOWLEDGED pickup_risk issues for dedup ──────

  const { data: existingIssues } = await supabase
    .from("coordination_issues")
    .select("id, event_window_start")
    .eq("household_id", primaryId)
    .eq("trigger_type", "pickup_risk")
    .in("state", ["OPEN", "ACKNOWLEDGED"])
    .returns<ExistingIssueRow[]>();

  const existingWindowStarts = new Set(
    (existingIssues ?? [])
      .map((i) => i.event_window_start)
      .filter(Boolean) as string[]
  );

  // ── 4. Evaluate each activity's pickup window ─────────────────────────────

  for (const activity of todayActivities) {
    if (!activity.end_time) continue;

    const pickupStart = todayAtTime(activity.end_time);
    const pickupEnd = new Date(pickupStart.getTime() + 30 * 60 * 1000); // +30 min

    // Dedup: skip if an issue already exists for this window start
    const windowStartISO = pickupStart.toISOString();
    if (existingWindowStarts.has(windowStartISO)) continue;

    // ── 5. Query both parents' calendars for the pickup window ─────────────

    const { data: conflictingEvents } = await supabase
      .from("calendar_events")
      .select("id, start_time, end_time, owner_parent_id")
      .in("owner_parent_id", parentIds)
      .lt("start_time", pickupEnd.toISOString())
      .gt("end_time", pickupStart.toISOString())
      .is("deleted_at", null)
      .returns<CalendarEventRow[]>();

    const events = conflictingEvents ?? [];

    const defaultHandlerId = activity.profile_id;
    const otherParentId = parentIds.find((id) => id !== defaultHandlerId) ?? null;

    const defaultHandlerBusy = events.some(
      (e) =>
        e.owner_parent_id === defaultHandlerId &&
        overlapsWindow(e, pickupStart, pickupEnd)
    );

    const partnerBusy =
      otherParentId !== null &&
      events.some(
        (e) =>
          e.owner_parent_id === otherParentId &&
          overlapsWindow(e, pickupStart, pickupEnd)
      );

    const childName = activity.family_member?.name ?? "your child";
    const activityName = activity.name;
    const pickupTimeStr = pickupStart.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    // ── 6. Determine risk level and generate AI alert content ─────────────
    // Template strings serve as validated fallbacks if AI generation fails.
    // Severity is stored in migration 027 column for alert-prompt audit trail.

    let severity: "RED" | "YELLOW" | null = null;
    let fallbackContent: string | null = null;
    let parentAStatus: "CONFLICTED" | "AVAILABLE" | "UNCONFIRMED" = "AVAILABLE";
    let parentBStatus: "CONFLICTED" | "AVAILABLE" | "UNCONFIRMED" = "AVAILABLE";

    if (defaultHandlerBusy && (partnerId === null || partnerBusy)) {
      // RED — no coverage: both parents (or only parent) are busy
      severity = "RED";
      fallbackContent =
        `${childName} needs pickup from ${activityName} at ${pickupTimeStr}` +
        ` — both parents have conflicts and no coverage is confirmed.`;
      parentAStatus = "CONFLICTED";
      parentBStatus = partnerId === null ? "UNCONFIRMED" : "CONFLICTED";
    } else if (defaultHandlerBusy && !partnerBusy) {
      // YELLOW — default handler busy, partner free (confirmed: !partnerBusy)
      severity = "YELLOW";
      fallbackContent =
        `${childName} needs pickup from ${activityName} at ${pickupTimeStr}` +
        ` — you're in a conflict, partner is free.`;
      parentAStatus = "CONFLICTED";
      parentBStatus = "AVAILABLE";
    }
    // CLEAR — default handler is free, no issue needed

    if (!severity || !fallbackContent) continue;

    // ── 6a. AI alert content generation (alert-prompt.md, IE S1.7) ────────
    const alertResult = await generateAlertContent(
      {
        trigger_type: "PICKUP_RISK",
        severity,
        event_window_start: pickupStart.toISOString(),
        event_window_end: pickupEnd.toISOString(),
        affected_child: childName,
        parent_a_status: parentAStatus,
        parent_b_status: parentBStatus,
        change_description: null,
        confidence: "HIGH",
      },
      fallbackContent
    );

    // null = AI returned low-confidence suppression — skip issue creation
    if (!alertResult) continue;

    const issueContent = alertResult.content;

    // ── 7. Insert the coordination issue ──────────────────────────────────

    const { data: newIssue } = await supabase
      .from("coordination_issues")
      .insert({
        household_id: primaryId,
        trigger_type: "pickup_risk",
        state: "OPEN",
        content: issueContent,
        severity: alertResult.severity,
        event_window_start: pickupStart.toISOString(),
        event_window_end: pickupEnd.toISOString(),
      })
      .select("id")
      .single<{ id: string }>();

    if (newIssue?.id) {
      createdIssueIds.push(newIssue.id);
      // Track to avoid duplicate inserts within the same run
      existingWindowStarts.add(windowStartISO);
    }
  }

  return createdIssueIds;
}
