# Late Schedule Change Alert — Component Spec
**Version:** 1.0
**Author:** Product & Design
**Date:** 2026-04-03
**Status:** APPROVED — Lead Eng may build against this spec
**Reference:** Intelligence Engine §3C; AGENT-PIPELINE S2.5
**Prerequisite specs:** `alert-card-spec.md` (visual container), `today-screen-spec.md` (layer ordering)

---

## Overview

A Late Schedule Change alert fires when a calendar event is created or modified in a way that creates or resolves a real-time coordination dependency. It is the most time-sensitive output Kin produces — it delivers in real time during the day, not just at morning briefing.

The visual container is the **existing AlertCard component** (`OPEN` state). No new UI component is needed. This spec covers:
1. Content format rules specific to late schedule change alerts
2. Delivery routing (three modes depending on time of day)
3. Push notification format
4. Real-time in-app update behavior on the Today screen
5. Suppression rules (when to drop a change without surfacing it)

---

## 1. Alert Content Format

### One sentence. Always. No exceptions.

Pattern: `[What changed] — [Implication]`

The first clause names the calendar change. The second names what the user now needs to do or know. The dash is a literal em-dash (—), not a hyphen.

**Approved examples:**
> "Your partner's 6pm just moved to 7:30 — you've got pickup tonight."
> "Your 3pm cleared — you're back on for pickup."
> "A 5pm meeting just landed on your calendar — dinner window is gone."
> "Your partner's afternoon opened — they can handle school pickup."

**Disallowed patterns:**
| ❌ Never write | Why |
|--------------|-----|
| "It looks like your partner's schedule has changed..." | Hedged opener — §8 violation |
| "Based on the calendar update, you may want to reconsider pickup." | Data-led, not implication-led |
| "Just a heads up — your partner's 6pm moved." | "Just a heads up" is an §8 banned opener. Also: missing implication. |
| "Your partner's event was updated to 7:30 PM." | No implication. Kin is reporting, not coordinating. |
| Two sentences describing the change and then the implication. | Single sentence only — §5 alert rule. |

### Verb tense

Use present-perfect or present for the change clause: "just moved", "just landed", "just cleared", "opened up".
Use present or near-future for the implication: "you've got pickup", "dinner window is gone", "you're back on".

Never use passive voice in the implication: ❌ "pickup will need to be handled" → ✅ "you've got pickup".

### Naming

- Use "your partner" (not the partner's name) for changes to the partner's calendar — household members haven't necessarily shared preferred names with each other through Kin yet.
- Use "you" or "your [timeblock]" for changes to the user's own calendar.
- Use the activity name for known household responsibilities: "pickup", "school drop-off", "practice", "dinner" — not generic terms like "your evening responsibilities".

---

## 2. Delivery Routing

Three delivery modes based on when the calendar change is detected. Lead Eng: implement this as a decision tree at the end of the calendar webhook handler.

| Detection time | Delivery mode | Creates `coordination_issue`? | Push notification? |
|----------------|---------------|-------------------------------|---------------------|
| Before 10:00 AM (same day) | Queue for morning briefing update | No — feed into morning briefing context | No |
| 10:00 AM–6:00 PM (same day) | Real-time — surface immediately | Yes — `state: "OPEN"`, `surfaced_at: now()` | Yes — send push notification |
| After 6:00 PM (for tomorrow) | Queue for next morning briefing | No — store, include in next day's briefing context | No |

**Edge case — change resolves a conflict (coverage confirmed):**
- If the calendar change *eliminates* a previously detected conflict: transition the existing `coordination_issue` to `RESOLVED` state.
- Send a push notification only during 10am–6pm window (same delivery rule).
- Do not create a new `coordination_issue` for a resolution — update the existing one.

**Edge case — minor calendar change:**
Suppress entirely. Do not create an issue or send a push. Suppression criteria:
- Change is a title-only edit with no time or location modification
- Change is a room/conference-link-only update
- Change affects an event more than 3 days in the future (not same-day/next-morning)
- Change affects an event that has no coordination dependency (no overlap with pickup windows, known responsibilities, or other household events)

---

## 3. Push Notification Format

Push notifications fire only in the 10am–6pm delivery window. Format:

| Field | Value |
|-------|-------|
| Title | "Kin" |
| Body | The one-sentence alert content (same text as `coordination_issue.content`) |
| Sound | Default system sound |
| Badge | Increment by 1 |
| Data payload | `{ type: "coordination_issue", issue_id: "[uuid]" }` — used to deep-link to Today screen on tap |

**Tap behavior (deep link):**
- User taps notification → app opens to Today screen
- The `coordination_issue` with `issue_id` renders as the active OPEN alert at top of alert stack
- If app is already open: no navigation change needed (Today screen realtime subscription handles it — see §4)

**Character limits:**
- Notification body must be ≤ 100 characters. If the one-sentence content exceeds 100 characters, truncate at the last complete word before the limit and append "—" (the implication must be preserved — truncate the change clause if needed, not the implication clause).

---

## 4. Real-Time In-App Update Behavior

The Today screen already has a Supabase Realtime subscription on `coordination_issues`. When a new OPEN issue is inserted into the `coordination_issues` table:

**Expected behavior (no code change needed if Realtime is wired correctly):**
1. Supabase Realtime event fires on the mobile client
2. `loadIssues()` re-fetches (or the INSERT event is handled inline)
3. New OPEN alert appears at top of alert stack on Today screen
4. If user is on Today screen: alert appears without requiring pull-to-refresh

**No animation for new alert appearance:** The alert card renders as part of the standard content flow. No "slide in" or "pop in" animation for a newly received real-time alert — it simply renders in the OPEN state, styled per `alert-card-spec.md §1`. The amber border and SemiBold content weight provide sufficient visual salience without additional motion.

**Multiple simultaneous alerts:** If a batch of calendar changes arrives in rapid succession (e.g., partner reschedules a block of meetings), apply the queuing rule from `alert-card-spec.md §5` — only 1 OPEN alert visible at a time. Queue the rest.

---

## 5. Alert Card Visual Treatment

Late schedule change alerts use the **standard AlertCard OPEN state**. No visual differentiation from pickup risk alerts.

Rationale: The content of the alert (one sentence, implication-led) is the signal. Visual differentiation by trigger type would add complexity without adding clarity — users don't need to know *how* Kin detected the change, they need to know *what to do*.

**Color tokens:** Per `alert-card-spec.md §6` — amber border, warm white SemiBold content, amber dot, green CTA. No changes.

---

## 6. Suppression Rules Summary

Do not create a `coordination_issue` or send a push notification if any of the following are true:

| Condition | Reason |
|-----------|--------|
| Calendar change is title/room/link-only | No coordination impact |
| Event is 3+ days in the future | Not same-day/next-morning logistics |
| Change has no overlap with known coordination windows | No implication to surface |
| Kin already has an OPEN issue for the same event window | Avoid duplicate alerts; update existing instead |
| Detection time is before 10am or after 6pm | Route to morning briefing instead |
| Change resolves an already-resolved issue | No action — issue is already closed |
| Confidence is Low per §5 (insufficient data) | Do not surface — stay silent |

---

## 7. `coordination_issues` Record for Late Schedule Change

When creating a `coordination_issue` for a late schedule change:

```
trigger_type: 'late_schedule_change'
state: 'OPEN'
content: "[one sentence, [What changed] — [Implication]]"
event_window_start: [start of the affected event/window]
event_window_end: [end of the affected event/window]
surfaced_at: now()
```

`last_escalation_tier` is `null` for initial creation — escalation tiers (T-6, T-2, T-45) are Layer 2 and do not apply to v0 TestFlight.

---

## 8. Interaction with Existing Alert Stack

Late schedule change alerts participate in the same OPEN/ACKNOWLEDGED/RESOLVED state machine as pickup risk alerts. They are not treated differently by the AlertCard component.

**RESOLVED transition for late schedule change:**
Closure line follows the same format as all RESOLVED alerts: "Sorted. I'll flag it if anything changes."

Dynamic closure line (per §24 — something specific to the resolution, e.g., "Your partner confirmed pickup — you're clear.") is a Layer 2 enhancement, not needed for TestFlight.

---

## 9. Spec Compliance Checklist (for QA — after S2.5 ships)

### Content
- [ ] Alert content is exactly one sentence in `[What changed] — [Implication]` format
- [ ] No §8 banned openers ("It looks like", "Just a heads up", "Based on your calendar", etc.)
- [ ] Change clause uses present-perfect verb ("just moved", "just landed", "just cleared")
- [ ] Implication clause uses present or near-future ("you've got pickup", "dinner window is gone")
- [ ] Content ≤ 100 characters for push notification delivery

### Delivery routing
- [ ] Calendar changes before 10am → no push, no immediate issue; fed into morning briefing context
- [ ] Calendar changes 10am–6pm → `coordination_issue` created as OPEN + push notification sent
- [ ] Calendar changes after 6pm for tomorrow → no push, no immediate issue; queued for morning briefing
- [ ] Minor changes (title/room/link-only) → suppressed entirely, no issue created

### Push notification
- [ ] Notification title is "Kin"
- [ ] Notification body matches `coordination_issue.content` exactly
- [ ] Tap on notification deep-links to Today screen
- [ ] `issue_id` in data payload allows Today screen to surface the correct alert

### In-app
- [ ] Realtime subscription surfaces new OPEN issue without pull-to-refresh
- [ ] New late-schedule-change alert uses standard AlertCard OPEN state (amber border, SemiBold content)
- [ ] Queuing rule enforced — only 1 OPEN alert visible at a time
- [ ] State machine (OPEN → ACKNOWLEDGED → RESOLVED) functions identically to pickup risk alerts
- [ ] No purple in any visual element
