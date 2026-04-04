/**
 * Late Schedule Change Detection — §3C
 *
 * Fires after each calendar sync. Detects whether any newly-modified or
 * created calendar events introduce a real-time coordination dependency
 * for the household, then surfaces an OPEN coordination_issue and sends
 * an Expo push notification (10am–6pm delivery window only).
 *
 * Delivery routing (spec §3C):
 *   Before 10am  — "briefing" mode: suppress issue + push; morning briefing
 *                  picks up existing issues via its own coordination_issues query.
 *   10am–6pm     — "immediate" mode: create OPEN issue + send push notification.
 *   After 6pm    — "briefing" mode (for next-morning delivery).
 *
 * Suppression rules (spec §3C §5):
 *   - All-day events (no time-based coordination implication)
 *   - Events starting 3+ days from now
 *   - Events with no overlap with known pickup windows or evening coordination window
 *   - Events where an OPEN or ACKNOWLEDGED late_schedule_change issue already
 *     exists for the same event_window_start (deduplication)
 *
 * Not in scope for v0 (Layer 2 — post-TestFlight):
 *   - Escalation tiers T-6/T-2/T-45
 *   - Resolving existing issues when a conflict clears (RESOLVED transition
 *     triggered by a calendar change — tracked separately from state machine)
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  generateAlertContent,
  type ParentStatus,
} from "@/lib/generate-alert-content";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/** How far back to look for "recently changed" events after a sync. */
const CHANGE_WINDOW_MINUTES = 5;

/** Suppress events that start more than this many days from now. */
const MAX_DAYS_AHEAD = 3;

/** Inclusive start of the push delivery window (local hour). */
const PUSH_WINDOW_START_HOUR = 10; // 10am

/** Exclusive end of the push delivery window (local hour). */
const PUSH_WINDOW_END_HOUR = 18; // 6pm

/**
 * Evening coordination window: partner events landing during these hours
 * are flagged even without a direct pickup overlap.
 */
const EVENING_WINDOW_START_HOUR = 16; // 4pm
const EVENING_WINDOW_END_HOUR = 20; // 8pm

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChangedEventRow {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  all_day: boolean | null;
  owner_parent_id: string;
  created_at: string;
}

interface ActivityRow {
  id: string;
  name: string;
  end_time: string | null;
  day_of_week: string[] | null;
  profile_id: string;
  family_member: { name: string } | null;
}

interface ExistingIssueRow {
  id: string;
  state: string;
  event_window_start: string | null;
}

interface PushTokenRow {
  token: string;
}

interface ProfileRow {
  id: string;
  household_id: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the English day name ("Monday", etc.) for the given Date. */
function getDayName(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

/**
 * Truncates content to ≤100 characters at the last complete word boundary,
 * appending "—" (em-dash) to signal truncation. Implication clause preserved
 * by truncating the change clause first (the em-dash split point).
 */
function truncateForPush(content: string): string {
  if (content.length <= 100) return content;
  const truncated = content.slice(0, 100);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + "—";
}

/** Current local hour (0–23). Used for delivery-mode gating. */
function localHour(): number {
  return new Date().getHours();
}

/**
 * Determines delivery mode from the current local time.
 * Returns "immediate" (10am–6pm) or "briefing" (outside window).
 */
function deliveryMode(): "immediate" | "briefing" {
  const h = localHour();
  return h >= PUSH_WINDOW_START_HOUR && h < PUSH_WINDOW_END_HOUR
    ? "immediate"
    : "briefing";
}

/** Formats a Date as "3:45 PM" for use in one-sentence alert content. */
function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Sends a push notification for a new coordination_issue.
 * Title is always "Kin" per spec §3.
 * Body is the one-sentence alert content (truncated to ≤100 chars).
 * Data payload includes issue_id for Today-screen deep link.
 */
async function sendPush(
  tokens: string[],
  body: string,
  issueId: string
): Promise<void> {
  if (tokens.length === 0) return;
  const truncated = truncateForPush(body);
  const messages = tokens.map((token) => ({
    to: token,
    sound: "default",
    title: "Kin",
    body: truncated,
    data: { type: "coordination_issue", issue_id: issueId },
    badge: 1,
  }));
  await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });
}

// ─── Main Detection ───────────────────────────────────────────────────────────

/**
 * Runs immediately after a calendar sync for `profileId`.
 *
 * Queries recently-modified/created calendar events for the household and
 * checks whether any introduce a new coordination dependency (pickup window
 * conflict or partner evening commitment). When detected, creates an OPEN
 * `coordination_issue` and sends an Expo push notification (10am–6pm only).
 *
 * @param supabase  Supabase client (service-role context — called from sync webhook)
 * @param profileId Profile whose calendar was just synced
 * @returns         Number of new OPEN coordination_issues created this run
 */
export async function detectLateScheduleChanges(
  supabase: SupabaseClient,
  profileId: string
): Promise<number> {
  // ── Resolve household ────────────────────────────────────────────────────────
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("id, household_id")
    .eq("id", profileId)
    .single<ProfileRow>();

  // coordination_issues.household_id always stores the primary parent ID
  const primaryId = profileRow?.household_id ?? profileId;

  // ── Find partner ─────────────────────────────────────────────────────────────
  const { data: partnerRows } = await supabase
    .from("profiles")
    .select("id")
    .or(`id.eq.${primaryId},household_id.eq.${primaryId}`)
    .neq("id", profileId)
    .limit(1)
    .returns<{ id: string }[]>();

  const partnerId: string | null = partnerRows?.[0]?.id ?? null;

  // ── Delivery mode ────────────────────────────────────────────────────────────
  // In "briefing" mode we do nothing here — the morning briefing route picks up
  // open coordination_issues via its own query (§3C delivery routing).
  if (deliveryMode() === "briefing") return 0;

  // ── Recently-changed events ──────────────────────────────────────────────────
  const changeWindowStart = new Date(
    Date.now() - CHANGE_WINDOW_MINUTES * 60 * 1000
  ).toISOString();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const maxDate = new Date(
    todayStart.getTime() + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000
  );

  // Build owner filter: always include the syncing profile; include partner if linked
  const ownerFilter = partnerId
    ? `owner_parent_id.eq.${profileId},owner_parent_id.eq.${partnerId}`
    : `owner_parent_id.eq.${profileId}`;

  const { data: changedEvents } = await supabase
    .from("calendar_events")
    .select("id, title, start_time, end_time, all_day, owner_parent_id, created_at")
    .or(ownerFilter)
    .gte("updated_at", changeWindowStart)
    .gte("start_time", todayStart.toISOString())
    .lte("start_time", maxDate.toISOString())
    .is("deleted_at", null)
    .returns<ChangedEventRow[]>();

  if (!changedEvents?.length) return 0;

  // ── Today's children's activities (pickup windows) ───────────────────────────
  const todayName = getDayName(new Date());

  const { data: activities } = await supabase
    .from("children_activities")
    .select("id, name, end_time, day_of_week, profile_id, family_member:family_members(name)")
    .eq("profile_id", primaryId)
    .eq("active", true)
    .returns<ActivityRow[]>();

  const todayActivities: ActivityRow[] = (activities ?? []).filter((a) =>
    (a.day_of_week ?? []).includes(todayName)
  );

  // ── Deduplication: existing OPEN/ACK issues for same window ─────────────────
  const { data: existingIssues } = await supabase
    .from("coordination_issues")
    .select("id, state, event_window_start")
    .eq("household_id", primaryId)
    .eq("trigger_type", "late_schedule_change")
    .in("state", ["OPEN", "ACKNOWLEDGED"])
    .returns<ExistingIssueRow[]>();

  const existingWindowStarts = new Set<string>(
    (existingIssues ?? [])
      .map((i) => i.event_window_start)
      .filter((w): w is string => w !== null)
  );

  // ── Push tokens for the syncing profile ─────────────────────────────────────
  const { data: pushTokenRows } = await supabase
    .from("push_tokens")
    .select("token")
    .eq("profile_id", profileId)
    .eq("active", true)
    .returns<PushTokenRow[]>();

  const pushTokens: string[] = (pushTokenRows ?? []).map((pt) => pt.token);

  // ── Evaluate each changed event ──────────────────────────────────────────────
  let issuesCreated = 0;

  for (const event of changedEvents) {
    try {
      // Suppress: all-day events have no time-based coordination implication
      if (event.all_day) continue;

      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);

      // Deduplication: skip if an OPEN/ACK issue already covers this window
      if (existingWindowStarts.has(event.start_time)) continue;

      let fallbackContent: string | null = null;
      let alertSeverity: "RED" | "YELLOW" | null = null;
      let alertParentA: ParentStatus = "UNCONFIRMED";
      let alertParentB: ParentStatus = "UNCONFIRMED";
      let alertChild = "your child";
      let alertChangeDesc: string | null = null;
      let windowStart = event.start_time;
      let windowEnd = event.end_time;

      // ── Check 1: Pickup window overlap ───────────────────────────────────────
      // For each child activity today, check if the changed event overlaps the
      // pickup window (activity end_time → end_time + 30 min).
      for (const activity of todayActivities) {
        if (!activity.end_time) continue;

        const [h, m] = activity.end_time.split(":").map(Number);
        const pickupStart = new Date();
        pickupStart.setHours(h, m, 0, 0);
        const pickupEnd = new Date(pickupStart.getTime() + 30 * 60 * 1000);

        // Does the changed event overlap the pickup window?
        const overlaps = eventStart < pickupEnd && eventEnd > pickupStart;
        if (!overlaps) continue;

        const childName = activity.family_member?.name ?? "your child";
        const activityName = activity.name ?? "activity";
        const timeStr = formatTime(eventStart);

        const isOwnEvent = event.owner_parent_id === profileId;
        const isPartnerEvent = event.owner_parent_id === partnerId;

        if (isOwnEvent) {
          // A new event on the syncing parent's calendar conflicts with their pickup
          // §P2-1: implication clause uses verb form ("needs coverage"), not noun phrase
          fallbackContent = `Your ${timeStr} just landed — pickup for ${childName}'s ${activityName} needs coverage.`;
          alertSeverity = "YELLOW";
          alertParentA = "CONFLICTED";
          alertParentB = "UNCONFIRMED";
          alertChild = childName;
          alertChangeDesc = `${event.title} at ${timeStr} overlaps ${childName}'s ${activityName} pickup`;
        } else if (isPartnerEvent) {
          // Partner has a new conflict during pickup window
          fallbackContent = `Your partner's ${timeStr} is now busy — ${childName}'s ${activityName} pickup may need you.`;
          alertSeverity = "YELLOW";
          alertParentA = "AVAILABLE";
          alertParentB = "CONFLICTED";
          alertChild = childName;
          alertChangeDesc = `Partner's ${event.title} at ${timeStr} overlaps ${childName}'s ${activityName} pickup`;
        }

        if (fallbackContent) {
          windowStart = pickupStart.toISOString();
          windowEnd = pickupEnd.toISOString();
          break;
        }
      }

      // ── Check 2: Partner evening commitment (4pm–8pm) ────────────────────────
      // If no pickup window was matched, flag significant partner evening events
      // that may affect household coordination (dinner, drop-off, etc.).
      if (!fallbackContent && partnerId && event.owner_parent_id === partnerId) {
        const eventHour = eventStart.getHours();
        if (eventHour >= EVENING_WINDOW_START_HOUR && eventHour < EVENING_WINDOW_END_HOUR) {
          const timeStr = formatTime(eventStart);
          // §P2-3: distinguish new events ("just landed") from moved events ("just moved")
          // using created_at vs the change window start — avoids vague "just changed"
          const isNewEvent = new Date(event.created_at) >= new Date(changeWindowStart);
          const changeVerb = isNewEvent ? "just landed" : "just moved";
          fallbackContent = `Your partner's ${timeStr} ${changeVerb} — check your evening coverage.`;
          alertSeverity = "YELLOW";
          alertParentA = "AVAILABLE";
          alertParentB = "CONFLICTED";
          alertChild = "your household";
          alertChangeDesc = `Partner's ${event.title} at ${timeStr} (evening event)`;
          windowStart = event.start_time;
          windowEnd = event.end_time;
        }
      }

      // No coordination implication detected — suppress per spec §3C
      if (!fallbackContent || !alertSeverity) continue;

      // ── AI alert content generation (alert-prompt.md, IE S1.7) ───────────────
      const alertResult = await generateAlertContent(
        {
          trigger_type: "LATE_SCHEDULE_CHANGE",
          severity: alertSeverity,
          event_window_start: windowStart,
          event_window_end: windowEnd,
          affected_child: alertChild,
          parent_a_status: alertParentA,
          parent_b_status: alertParentB,
          change_description: alertChangeDesc,
          confidence: alertParentB === "UNCONFIRMED" ? "MEDIUM" : "HIGH",
        },
        fallbackContent
      );

      // null = AI returned low-confidence suppression — skip issue creation
      if (!alertResult) continue;

      const coordinationContent = alertResult.content;

      // ── Create coordination_issue ────────────────────────────────────────────
      const { data: newIssue, error: insertError } = await supabase
        .from("coordination_issues")
        .insert({
          household_id: primaryId,
          trigger_type: "late_schedule_change",
          state: "OPEN",
          content: coordinationContent,
          severity: alertResult.severity,
          event_window_start: windowStart,
          event_window_end: windowEnd,
          surfaced_at: new Date().toISOString(),
        })
        .select("id")
        .single<{ id: string }>();

      if (insertError || !newIssue) {
        if (process.env.NODE_ENV !== "production") {
          console.error(
            "late-schedule-change: failed to insert issue for event",
            event.id,
            insertError
          );
        }
        continue;
      }

      issuesCreated++;

      // Add the new window to the dedup set so subsequent events in this
      // same batch don't create a duplicate for the overlapping window.
      existingWindowStarts.add(windowStart);

      // ── Send Expo push notification ──────────────────────────────────────────
      // sendPush is non-throwing — failures are silently ignored for TestFlight.
      // Wire Sentry before GA.
      await sendPush(pushTokens, coordinationContent, newIssue.id).catch(() => {
        if (process.env.NODE_ENV !== "production") {
          console.error(
            "late-schedule-change: push failed for issue",
            newIssue.id
          );
        }
      });
    } catch (err) {
      // Per-event errors are isolated — continue processing remaining events
      if (process.env.NODE_ENV !== "production") {
        console.error(
          "late-schedule-change: error evaluating event",
          event.id,
          err
        );
      }
    }
  }

  return issuesCreated;
}
