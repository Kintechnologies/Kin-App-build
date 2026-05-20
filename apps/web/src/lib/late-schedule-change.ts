/**
 * Late Schedule Change Detection — §3C
 *
 * Fires after each calendar sync. When a newly created or modified calendar
 * event collides with a known pickup/dropoff window for today, this surfaces an
 * OPEN coordination_issue and texts the household a real-time heads-up — the
 * "your 4pm meeting just broke your 5pm pickup" alert.
 *
 * Data model (post-pivot — see migration 036, briefing rewrite 87c306a):
 *   - Recurring pickup/dropoff times are extracted from profiles.context_notes
 *     by pickup-windows.ts — the pre-pivot children_activities table was
 *     dropped, which is why this detector silently failed.
 *   - Conflicting events are synced Google/Apple events in calendar_events.
 *
 * Delivery routing (§3C):
 *   10am–6pm local — "immediate": create the issue and send the SMS now.
 *   Outside that window — "briefing": do nothing here. The morning briefing
 *   picks up open coordination_issues via its own query, and pickup-risk.ts
 *   re-detects the same conflict on its next cron tick.
 *
 * Suppression:
 *   - All-day events (no time-based coordination implication).
 *   - Events on a day other than today.
 *   - Events with no overlap against any of today's pickup windows.
 *   - A window that already has an OPEN/ACKNOWLEDGED late_schedule_change issue
 *     (deduplication by event_window_start).
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { generateAlertContent } from "@/lib/generate-alert-content";
import {
  resolveHousehold,
  extractPickupWindows,
  windowRunsOn,
  coverageWindow,
  overlaps,
  zonedTimeToUtc,
  localDateInTz,
  localWeekdayInTz,
  localHourInTz,
  formatTimeInTz,
  describeWindow,
  shortTitle,
  sendAlertSms,
  type HouseholdParent,
} from "@/lib/pickup-windows";

// ─── Tuning ─────────────────────────────────────────────────────────────────

/** How far back to look for "recently changed" events after a sync. */
const CHANGE_WINDOW_MINUTES = 5;

/** Immediate-delivery window (local hours). Outside it, briefing mode. */
const PUSH_WINDOW_START_HOUR = 10; // 10am inclusive
const PUSH_WINDOW_END_HOUR = 18; // 6pm exclusive

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChangedEventRow {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  all_day: boolean | null;
  profile_id: string;
}

// ─── Main detection ─────────────────────────────────────────────────────────

/**
 * Runs immediately after a calendar sync for `profileId`.
 *
 * Resolves the household, checks whether any event changed in the last few
 * minutes now collides with a pickup/dropoff window today, and — during the
 * 10am–6pm delivery window — surfaces a coordination_issue and texts the
 * household. Never throws; per-window failures are isolated.
 *
 * @returns number of new OPEN coordination_issues created this run.
 */
export async function detectLateScheduleChanges(
  supabase: SupabaseClient,
  profileId: string
): Promise<number> {
  const household = await resolveHousehold(supabase, profileId);
  if (!household) return 0;
  const { primaryId, parents, contextNotes, timezone } = household;
  if (parents.length === 0) return 0;

  // ── Delivery mode: only act inside the immediate window ───────────────────
  const hour = localHourInTz(timezone);
  if (hour < PUSH_WINDOW_START_HOUR || hour >= PUSH_WINDOW_END_HOUR) return 0;

  const parentIds = parents.map((p) => p.id);
  const today = localDateInTz(timezone);
  const weekday = localWeekdayInTz(timezone);

  // ── Recently-changed timed events for today ───────────────────────────────
  const changeWindowStart = new Date(
    Date.now() - CHANGE_WINDOW_MINUTES * 60 * 1000
  ).toISOString();
  // Lower bound reaches back 12h so an overnight event can still be detected
  // overlapping an early-morning dropoff window.
  const dayStart = zonedTimeToUtc(today, "00:00", timezone);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const fetchFrom = new Date(dayStart.getTime() - 12 * 60 * 60 * 1000);

  const { data: changed } = await supabase
    .from("calendar_events")
    .select("id, title, start_time, end_time, all_day, profile_id")
    .in("profile_id", parentIds)
    .gte("updated_at", changeWindowStart)
    .gte("start_time", fetchFrom.toISOString())
    .lt("start_time", dayEnd.toISOString())
    .is("deleted_at", null)
    .returns<ChangedEventRow[]>();

  const changedEvents = (changed ?? []).filter((e) => !e.all_day);
  if (changedEvents.length === 0) return 0;

  // ── Today's pickup/dropoff windows ────────────────────────────────────────
  const { data: members } = await supabase
    .from("family_members")
    .select("name")
    .eq("household_id", primaryId)
    .eq("member_type", "child")
    .returns<{ name: string }[]>();
  const childNames = (members ?? []).map((m) => m.name);

  const windows = (await extractPickupWindows(contextNotes, childNames)).filter(
    (w) => windowRunsOn(w, weekday)
  );
  if (windows.length === 0) return 0;

  // ── Deduplication: windows already covered by an open issue ───────────────
  const { data: existing } = await supabase
    .from("coordination_issues")
    .select("event_window_start")
    .eq("household_id", primaryId)
    .eq("trigger_type", "late_schedule_change")
    .in("state", ["OPEN", "ACKNOWLEDGED"])
    .returns<{ event_window_start: string | null }[]>();

  const coveredWindows = new Set<string>(
    (existing ?? [])
      .map((i) => i.event_window_start)
      .filter((w): w is string => w !== null)
  );

  const now = Date.now();
  let issuesCreated = 0;

  // ── Evaluate each window against the recently-changed events ──────────────
  for (const window of windows) {
    try {
      const pickupAt = zonedTimeToUtc(today, window.time, timezone);
      // A pickup already in the past can no longer be salvaged — skip it.
      if (pickupAt.getTime() <= now) continue;

      const windowKey = pickupAt.toISOString();
      if (coveredWindows.has(windowKey)) continue;

      const { start, end } = coverageWindow(pickupAt);

      // Did any recently-changed event land in this coverage window?
      const conflict = changedEvents.find((e) =>
        overlaps(new Date(e.start_time), new Date(e.end_time), start, end)
      );
      if (!conflict) continue;

      const owner =
        parents.find((p) => p.id === conflict.profile_id) ?? parents[0];
      const pickupTime = formatTimeInTz(pickupAt, timezone);
      const desc = describeWindow(window, pickupTime);
      const evTime = formatTimeInTz(new Date(conflict.start_time), timezone);
      const evTitle = shortTitle(conflict.title);

      // ── Coordination issue (AI content, template fallback) ────────────────
      const changeDesc = `${evTitle} at ${evTime} overlaps ${desc}`;
      const fallbackContent = `A schedule change at ${evTime} overlaps ${desc} — coverage needs a quick check.`;

      const alert = await generateAlertContent(
        {
          trigger_type: "LATE_SCHEDULE_CHANGE",
          severity: "YELLOW",
          event_window_start: pickupAt.toISOString(),
          event_window_end: end.toISOString(),
          affected_child: window.child,
          parent_a_status: "CONFLICTED",
          parent_b_status: parents.length > 1 ? "AVAILABLE" : "UNCONFIRMED",
          change_description: changeDesc,
          confidence: "HIGH",
        },
        fallbackContent
      );

      // null = AI low-confidence suppression → no issue, no alert.
      if (!alert) continue;

      const { data: newIssue, error } = await supabase
        .from("coordination_issues")
        .insert({
          household_id: primaryId,
          trigger_type: "late_schedule_change",
          state: "OPEN",
          content: alert.content,
          severity: alert.severity,
          event_window_start: pickupAt.toISOString(),
          event_window_end: end.toISOString(),
          surfaced_at: new Date().toISOString(),
        })
        .select("id")
        .single<{ id: string }>();

      if (error || !newIssue) {
        if (process.env.NODE_ENV !== "production") {
          console.error(
            "late-schedule-change: failed to insert issue for event",
            conflict.id,
            error
          );
        }
        continue;
      }

      issuesCreated++;
      coveredWindows.add(windowKey);

      // ── Real-time SMS to the household ────────────────────────────────────
      await dispatchAlerts(supabase, parents, owner, evTime, evTitle, desc, window.kind);
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error(
          "late-schedule-change: error evaluating window",
          window,
          err
        );
      }
    }
  }

  return issuesCreated;
}

// ─── Real-time SMS ──────────────────────────────────────────────────────────

/**
 * Text the household about a schedule change that just broke a pickup window.
 * The parent whose event changed gets a direct heads-up; the other parent is
 * told the pickup may now fall to them. Best-effort — never throws.
 */
async function dispatchAlerts(
  supabase: SupabaseClient,
  parents: HouseholdParent[],
  owner: HouseholdParent,
  evTime: string,
  evTitle: string,
  desc: string,
  kind: "pickup" | "dropoff"
): Promise<void> {
  for (const parent of parents) {
    // Voice matches the morning briefing: the new event leads, the
    // implication follows, no "Heads up." preamble.
    const body =
      parent.id === owner.id
        ? `Your ${evTime} ${evTitle} just landed on the calendar and runs into ${desc} — worth confirming coverage.`
        : `${owner.name ?? "Your partner"}'s ${evTime} ${evTitle} just landed and runs into ${desc} — ${kind} may be on you.`;
    await sendAlertSms(supabase, parent, body);
  }
}
