/**
 * Pickup Risk Detection — §3A
 *
 * The intra-day "your plan is breaking" alert. For each known recurring pickup
 * or dropoff today, checks whether a parent's calendar event collides with the
 * coverage window around that time, then:
 *   1. records the gap as an OPEN coordination_issue (so the morning briefing
 *      and Today screen surface it), and
 *   2. texts the household a proactive heads-up ~30 minutes before the pickup,
 *      while there is still time to react.
 *
 * Data model (post-pivot — see migration 036, briefing rewrite 87c306a):
 *   - Recurring pickup/dropoff times are extracted from profiles.context_notes
 *     (the SMS onboarding blob) by pickup-windows.ts — the pre-pivot
 *     children_activities table was dropped.
 *   - Children's names come from family_members.
 *   - Conflicting events are synced Google/Apple events in calendar_events.
 *
 * Severity (§3A):
 *   RED    — every household parent has a conflict in the coverage window.
 *   YELLOW — at least one parent is conflicted but another is free.
 *   CLEAR  — no parent is conflicted → no issue, no alert.
 *
 * Deduplication:
 *   - One coordination_issue per pickup window: a new issue is inserted only
 *     when no OPEN/ACKNOWLEDGED pickup_risk issue exists for the same
 *     event_window_start.
 *   - The proactive SMS fires once per issue, gated by alert_sms_sent_at
 *     (migration 048) so repeated cron ticks never re-text the family.
 *
 * Called from:
 *   - /api/cron/pickup-risk      (every 30 min — drives the proactive SMS)
 *   - morning-briefing route     (inline, so the briefing reflects fresh risk)
 *   - briefing edge function     (inline, same reason — supabase/functions/_shared/briefing.ts)
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { generateAlertContent, type ParentStatus } from "@/lib/generate-alert-content";
import {
  resolveHousehold,
  extractPickupWindows,
  windowRunsOn,
  coverageWindow,
  overlaps,
  zonedTimeToUtc,
  localDateInTz,
  localWeekdayInTz,
  formatTimeInTz,
  describeWindow,
  shortTitle,
  sendAlertSms,
  type HouseholdParent,
  type PickupWindow,
} from "@/lib/pickup-windows";

// ─── Types ──────────────────────────────────────────────────────────────────

interface EventRow {
  title: string;
  start_time: string;
  end_time: string;
  profile_id: string;
  all_day: boolean | null;
}

interface ExistingIssueRow {
  id: string;
  event_window_start: string | null;
  alert_sms_sent_at: string | null;
}

/** A parent and the calendar event (if any) that conflicts with a window. */
interface ParentConflict {
  parent: HouseholdParent;
  event: EventRow | null;
}

// ─── SMS lead-time gate ─────────────────────────────────────────────────────

/**
 * The proactive SMS fires when the pickup is between these many minutes away.
 * Centered on ~30 min so a 30-minute cron cadence catches every window exactly
 * once; alert_sms_sent_at is the hard backstop against any double-send.
 */
const SMS_LEAD_MIN = 15;
const SMS_LEAD_MAX = 45;

// ─── Main detection ─────────────────────────────────────────────────────────

/**
 * Run pickup-risk detection for the household that `profileId` belongs to.
 *
 * Creates coordination_issues for any newly-detected conflicts and sends the
 * proactive heads-up SMS for any conflict whose pickup is ~30 minutes out.
 * Idempotent: safe to call on every cron tick and inline from the briefing.
 *
 * @returns ids of coordination_issues created on this run (empty if none/deduped)
 */
export async function detectPickupRisk(
  supabase: SupabaseClient,
  profileId: string
): Promise<string[]> {
  const createdIssueIds: string[] = [];

  const household = await resolveHousehold(supabase, profileId);
  if (!household) return createdIssueIds;
  const { primaryId, parents, contextNotes, timezone } = household;
  if (parents.length === 0) return createdIssueIds;

  const parentIds = parents.map((p) => p.id);
  const today = localDateInTz(timezone);
  const weekday = localWeekdayInTz(timezone);

  // ── Today's calendar events for every household parent ────────────────────
  // Lower bound reaches back 12h so an overnight event can still be detected
  // overlapping an early-morning dropoff window.
  const dayStart = zonedTimeToUtc(today, "00:00", timezone);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const fetchFrom = new Date(dayStart.getTime() - 12 * 60 * 60 * 1000);

  const { data: events } = await supabase
    .from("calendar_events")
    .select("title, start_time, end_time, profile_id, all_day")
    .in("profile_id", parentIds)
    .gte("start_time", fetchFrom.toISOString())
    .lt("start_time", dayEnd.toISOString())
    .is("deleted_at", null)
    .returns<EventRow[]>();

  const dayEvents = (events ?? []).filter((e) => !e.all_day);
  // No timed events today → no possible conflict. Skip the LLM extraction.
  if (dayEvents.length === 0) return createdIssueIds;

  // ── Pickup/dropoff windows from onboarding context ────────────────────────
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
  if (windows.length === 0) return createdIssueIds;

  // ── Existing OPEN/ACK pickup_risk issues, keyed by window start ───────────
  const { data: existing } = await supabase
    .from("coordination_issues")
    .select("id, event_window_start, alert_sms_sent_at")
    .eq("household_id", primaryId)
    .eq("trigger_type", "pickup_risk")
    .in("state", ["OPEN", "ACKNOWLEDGED"])
    .returns<ExistingIssueRow[]>();

  const issueByWindow = new Map<string, ExistingIssueRow>();
  for (const i of existing ?? []) {
    if (i.event_window_start) issueByWindow.set(i.event_window_start, i);
  }

  const now = Date.now();

  // ── Evaluate each window ──────────────────────────────────────────────────
  for (const window of windows) {
    const pickupAt = zonedTimeToUtc(today, window.time, timezone);
    const { start, end } = coverageWindow(pickupAt);
    const windowKey = pickupAt.toISOString();

    // Which parents have an event overlapping the coverage window?
    const conflicts: ParentConflict[] = parents.map((parent) => {
      const event =
        dayEvents.find(
          (e) =>
            e.profile_id === parent.id &&
            overlaps(new Date(e.start_time), new Date(e.end_time), start, end)
        ) ?? null;
      return { parent, event };
    });

    const busy = conflicts.filter((c) => c.event);
    if (busy.length === 0) continue; // CLEAR — coverage exists

    const severity: "RED" | "YELLOW" =
      busy.length === parents.length ? "RED" : "YELLOW";

    // ── Get or create the coordination_issue for this window ────────────────
    let issue = issueByWindow.get(windowKey) ?? null;
    if (!issue) {
      issue = await createIssue(
        supabase,
        primaryId,
        parents,
        conflicts,
        window,
        pickupAt,
        end,
        severity,
        timezone
      );
      if (issue) {
        issueByWindow.set(windowKey, issue);
        createdIssueIds.push(issue.id);
      }
    }
    if (!issue) continue;

    // ── Proactive SMS: fire ~30 min before the pickup, once ─────────────────
    const minutesUntil = (pickupAt.getTime() - now) / 60000;
    const inLeadWindow =
      minutesUntil > SMS_LEAD_MIN && minutesUntil <= SMS_LEAD_MAX;

    if (inLeadWindow && !issue.alert_sms_sent_at) {
      await dispatchAlerts(supabase, conflicts, window, pickupAt, timezone, severity);
      const sentAt = new Date().toISOString();
      await supabase
        .from("coordination_issues")
        .update({ alert_sms_sent_at: sentAt })
        .eq("id", issue.id);
      issue.alert_sms_sent_at = sentAt;
    }
  }

  return createdIssueIds;
}

// ─── Issue creation ─────────────────────────────────────────────────────────

/**
 * Insert a coordination_issue for a detected pickup conflict. Content is
 * AI-generated via the shared alert prompt, with a validated template fallback.
 * Returns the new row (id + alert_sms_sent_at = null), or null on failure.
 */
async function createIssue(
  supabase: SupabaseClient,
  primaryId: string,
  parents: HouseholdParent[],
  conflicts: ParentConflict[],
  window: PickupWindow,
  pickupAt: Date,
  windowEnd: Date,
  severity: "RED" | "YELLOW",
  timezone: string
): Promise<ExistingIssueRow | null> {
  const pickupTime = formatTimeInTz(pickupAt, timezone);
  const desc = describeWindow(window, pickupTime);

  const fallbackContent =
    severity === "RED"
      ? `Both parents have a conflict around ${desc} — no coverage is lined up.`
      : `A calendar conflict overlaps ${desc} — coverage needs a quick check.`;

  // parent_a = primary, parent_b = partner (UNCONFIRMED when solo).
  const parentStatus = (parent: HouseholdParent | undefined): ParentStatus => {
    if (!parent) return "UNCONFIRMED";
    return conflicts.find((c) => c.parent.id === parent.id)?.event
      ? "CONFLICTED"
      : "AVAILABLE";
  };

  const alert = await generateAlertContent(
    {
      trigger_type: "PICKUP_RISK",
      severity,
      event_window_start: pickupAt.toISOString(),
      event_window_end: windowEnd.toISOString(),
      affected_child: window.child,
      parent_a_status: parentStatus(parents[0]),
      parent_b_status: parentStatus(parents[1]),
      change_description: null,
      confidence: "HIGH",
    },
    fallbackContent
  );

  // null = AI low-confidence suppression → do not surface an issue.
  if (!alert) return null;

  const { data, error } = await supabase
    .from("coordination_issues")
    .insert({
      household_id: primaryId,
      trigger_type: "pickup_risk",
      state: "OPEN",
      content: alert.content,
      severity: alert.severity,
      event_window_start: pickupAt.toISOString(),
      event_window_end: windowEnd.toISOString(),
      surfaced_at: new Date().toISOString(),
    })
    .select("id, event_window_start, alert_sms_sent_at")
    .single<ExistingIssueRow>();

  if (error || !data) {
    if (process.env.NODE_ENV !== "production") {
      console.error("pickup-risk: failed to insert coordination_issue", error);
    }
    return null;
  }
  return data;
}

// ─── Proactive SMS ──────────────────────────────────────────────────────────

/**
 * Text each household parent about the conflict. A conflicted parent is told
 * which of their events collides; a free parent (YELLOW) is told the pickup
 * may fall to them. Best-effort — failures are logged, never thrown.
 *
 * These are templates, not LLM-generated, because pickup-risk fires from a
 * 30-min cron and adding a Claude round-trip per parent per alert doubles the
 * AI cost of the issue (the coordination_issues.content is already AI). The
 * wording is kept aligned with Kin's voice (apps/web/src/lib/kin-voice.ts) and
 * the alert prompt's [what changed] — [implication] shape; update both when
 * the voice evolves.
 */
async function dispatchAlerts(
  supabase: SupabaseClient,
  conflicts: ParentConflict[],
  window: PickupWindow,
  pickupAt: Date,
  timezone: string,
  severity: "RED" | "YELLOW"
): Promise<void> {
  const pickupTime = formatTimeInTz(pickupAt, timezone);
  const desc = describeWindow(window, pickupTime);

  // A representative conflicted parent — used to name the conflict for any
  // free partner who needs to know the pickup may land on them.
  const firstConflicted = conflicts.find((c) => c.event);

  for (const { parent, event } of conflicts) {
    let body: string;

    if (event) {
      const evTime = formatTimeInTz(new Date(event.start_time), timezone);
      const head = `Your ${evTime} ${shortTitle(event.title)} overlaps ${desc}`;
      const tail =
        severity === "RED"
          ? conflicts.length > 1
            ? " — you've both got conflicts, so coverage needs a quick call."
            : " — and there's no backup today."
          : ` — ${window.kind} coverage is at risk.`;
      body = `${head}${tail}`;
    } else if (firstConflicted?.event) {
      const other = firstConflicted.parent.name ?? "Your partner";
      const evTime = formatTimeInTz(
        new Date(firstConflicted.event.start_time),
        timezone
      );
      body =
        `${other}'s ${evTime} ${shortTitle(firstConflicted.event.title)} ` +
        `overlaps ${desc} — ${window.kind} may be on you.`;
    } else {
      continue;
    }

    await sendAlertSms(supabase, parent, body);
  }
}
