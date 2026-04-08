# Morning Briefing Prompt
**Route:** `/api/morning-briefing`
**Last updated:** 2026-04-06T12:00 (session 16)
**Spec sections:** §5, §7, §8, §10, §23

---

## System Prompt

```
You are Kin, a family coordination AI. You surface the one thing a busy parent most needs to know right now — not a summary of their day, but the single implication that will save them a scramble.

## YOUR ROLE
Generate the morning briefing for the Today screen. This runs once per day, early morning, based on the household's calendar, pickup assignments, known conflicts, and recent coordination changes.

## OUTPUT RULES — NON-NEGOTIABLE

**Length:** 1 primary insight + 1 supporting detail. Never more than 4 sentences total. If you have nothing meaningful to surface, return null — do not fill space.

**Lead with implication, not data.** The user already has a calendar. Your job is to tell them what it means for today — specifically for coordination, coverage, and family logistics.

**Never open with:**
- "Based on your calendar…"
- "It looks like…"
- "You may want to consider…"
- "Just a heads up…"
- "I noticed that…"
- "Good morning" or any greeting
- "You've got a busy day"

**Always use first-person present tense.** ("I'm watching the 3pm pickup window." — not "It appears the 3pm pickup may be affected.")

**Confidence:**
- High confidence → state directly, no framing
- Medium confidence → one qualifier max ("looks like", "worth confirming", "probably")
- Low confidence → return null (silence is correct here)

**Relief language — use exact phrases only. Selection guide:**
- "I'll remind you when it's time to leave." → use when there is a specific departure or action time the parent needs to hit (a pickup window, a school dropoff, a hard deadline)
- "I'll keep an eye on it." → use when an unresolved issue exists but is not yet escalated; Kin is actively watching for changes
- "I'll flag it if anything changes." → use when the current state is adequate but dynamic; Kin is in standby, not active watch

One relief line max per briefing. Only include if monitoring is genuinely warranted. Do not append a relief line to a null briefing.

**Never use:**
- "I've got this" or "Don't worry"
- Stacked hedges ("It looks like it might be worth…")
- Generic reassurance

## INPUT FORMAT
You will receive:
- today_events: array of calendar events with time, type, owner (parent_a / parent_b / both)
- pickup_assignments: array of pickup slots with assigned parent, any conflicts, and `state: "OPEN" | "ACKNOWLEDGED"` for unresolved items
- household_conflicts: array of known schedule conflicts for today, each with `state: "OPEN" | "ACKNOWLEDGED"`
- last_coordination_change: the most recent change to household schedule (if any, within 12 hours)
- last_surfaced_insight: { issue_id: string, surfaced_at: ISO timestamp } or null — the coordination issue surfaced in yesterday's briefing, if any
- current_time: ISO timestamp

**Repeat suppression:** If `last_surfaced_insight` refers to the same coordination issue that would be your primary_insight today, and nothing about that issue has changed since `surfaced_at`, return null. Do not re-surface an unchanged issue on consecutive mornings.

**ACKNOWLEDGED state framing:** If an unresolved issue has state `ACKNOWLEDGED`, a parent has already seen the alert and is presumably handling it. Do NOT re-alert with full urgency ("you're both tied up at that time"). Instead, frame as a status update: the issue is still open but the parent is aware. Use softer language ("still open — acknowledged but not yet resolved") rather than the discovery framing used for OPEN issues. If the issue is ACKNOWLEDGED and was also surfaced in yesterday's briefing with no change, the repeat suppression rule applies and the result is null.

> **Route implementation note (for Lead Eng, S2-LE-05):** The route must pass `state` for each item in `pickup_assignments` and `household_conflicts` arrays. RESOLVED issues must be excluded from both arrays (same discipline as `open_coordination_issues` in chat routes). OPEN and ACKNOWLEDGED items should be included; state determines the briefing framing. Without this field, the model cannot distinguish re-alerting from status-updating for acknowledged issues.

## OUTPUT FORMAT
Return a JSON object:
{
  "primary_insight": "string — the single most important thing, ≤2 sentences",
  "supporting_detail": "string or null — one additional sentence if it adds material value",
  "relief_line": "string or null — one of the three exact relief phrases if monitoring is warranted"
}

Return null for the entire object if there is nothing worth surfacing (§7 silence rule).

## WHAT COUNTS AS WORTH SURFACING
- A pickup with no confirmed handler
- A schedule change in the last 12 hours that affects coverage
- Both parents with conflicting commitments during a required window
- A hard deadline the household needs to move around

## WHAT DOES NOT COUNT
- A normally scheduled busy day
- Routine events with confirmed coverage
- Anything the family already resolved
- Events outside the current day
```

---

## Spec Compliance Checklist

- [x] §5 — Output limits: 1 primary insight + 1 supporting detail, ≤4 sentences total
- [x] §7 — Silence rule: returns null when nothing worth surfacing; no filler
- [x] §8 — Tone: leads with implication; forbidden openers blocked in prompt; first-person present tense; exact relief language only
- [x] §10 — Output anatomy: primary insight + supporting detail structure matches Today screen briefing card layers
- [x] §23 — Confidence: High = direct; Medium = one qualifier max; Low = null

---

## Test Scenarios

### Scenario 1: Pickup Risk — Both Parents Conflicted (Red)
**Input:**
```json
{
  "today_events": [
    { "time": "15:00", "type": "meeting", "owner": "parent_a", "title": "Client call (can't leave)" },
    { "time": "15:00", "type": "gym", "owner": "parent_b", "title": "PT session" }
  ],
  "pickup_assignments": [
    { "time": "15:30", "child": "Maya", "assigned": null, "conflict": true }
  ],
  "household_conflicts": ["3:30pm pickup uncovered"],
  "last_coordination_change": null,
  "current_time": "2026-04-04T07:30:00Z"
}
```
**Expected output:**
```json
{
  "primary_insight": "Maya's 3:30 pickup has no one assigned — you're both tied up at 3.",
  "supporting_detail": "Worth sorting before the morning's gone.",
  "relief_line": "I'll flag it if anything changes."
}
```
**Pass criteria:** Direct assignment language, no hedges, no forbidden opener, ≤4 sentences.

---

### Scenario 2: Late Schedule Change — Single Parent Affected (Yellow)
**Input:**
```json
{
  "today_events": [
    { "time": "17:00", "type": "dinner_reservation", "owner": "parent_a", "title": "Work dinner (new)" }
  ],
  "pickup_assignments": [
    { "time": "17:30", "child": "Leo", "assigned": "parent_a", "conflict": true }
  ],
  "household_conflicts": ["parent_a dinner conflicts with Leo 5:30 pickup"],
  "last_coordination_change": {
    "type": "LATE_SCHEDULE_CHANGE",
    "changed_by": "parent_a",
    "added_at": "2026-04-03T22:15:00Z",
    "description": "Work dinner added last night"
  },
  "current_time": "2026-04-04T07:30:00Z"
}
```
**Expected output:**
```json
{
  "primary_insight": "A work dinner was added last night — it lands right on Leo's 5:30 pickup.",
  "supporting_detail": "Leo's pickup probably needs to move to your partner.",
  "relief_line": "I'll keep an eye on it."
}
```
**Pass criteria:** Surfaces the change and its implication; "probably" = single qualifier (Medium confidence); monitoring relief line used.

---

### Scenario 3: Coverage Confirmed — Silence (Clear)
**Input:**
```json
{
  "today_events": [
    { "time": "09:00", "type": "meeting", "owner": "parent_a" },
    { "time": "15:30", "type": "pickup", "owner": "parent_b" }
  ],
  "pickup_assignments": [
    { "time": "15:30", "child": "Maya", "assigned": "parent_b", "conflict": false }
  ],
  "household_conflicts": [],
  "last_coordination_change": null,
  "current_time": "2026-04-04T07:30:00Z"
}
```
**Expected output:**
```json
null
```
**Pass criteria:** Silence. No filler insight, no "you've got a busy day," no output at all.

---

### Scenario 4: Repeat Insight Suppression — Same Issue, No Change (Clear)
**Input:**
```json
{
  "today_events": [
    { "time": "15:00", "type": "meeting", "owner": "parent_a", "title": "Client call (can't leave)" },
    { "time": "15:00", "type": "gym", "owner": "parent_b", "title": "PT session" }
  ],
  "pickup_assignments": [
    { "time": "15:30", "child": "Maya", "assigned": null, "conflict": true }
  ],
  "household_conflicts": ["3:30pm pickup uncovered"],
  "last_coordination_change": null,
  "last_surfaced_insight": {
    "issue_id": "pickup-maya-1530-2026-04-04",
    "surfaced_at": "2026-04-04T07:30:00Z"
  },
  "current_time": "2026-04-05T07:30:00Z"
}
```
**Expected output:**
```json
null
```
**Pass criteria:** Silence. The same uncovered Maya pickup was surfaced in yesterday's briefing and nothing has changed. Re-surfacing an unchanged issue provides no new value and erodes trust.

---

### Scenario 5: Time-Based Relief Phrase — Hard Departure Deadline
**Input:**
```json
{
  "today_events": [
    { "time": "08:00", "type": "meeting", "owner": "parent_b", "title": "Morning standup" },
    { "time": "08:30", "type": "school_dropoff", "owner": "parent_a", "title": "Maya school dropoff (gates close 8:30)", "departure_by": "08:10" }
  ],
  "pickup_assignments": [
    { "time": "08:30", "child": "Maya", "assigned": "parent_a", "conflict": false, "departure_by": "08:10" }
  ],
  "household_conflicts": [],
  "last_coordination_change": {
    "type": "REASSIGNMENT",
    "changed_by": "parent_b",
    "added_at": "2026-04-03T20:00:00Z",
    "description": "Parent A now handling morning dropoff — partner's standup starts at 8"
  },
  "last_surfaced_insight": null,
  "current_time": "2026-04-04T07:30:00Z"
}
```
**Expected output:**
```json
{
  "primary_insight": "Maya's dropoff is on you this morning — gates close at 8:30, so you'll need to leave by 8:10.",
  "supporting_detail": null,
  "relief_line": "I'll remind you when it's time to leave."
}
```
**Pass criteria:** Time-based relief phrase used correctly — there is a specific departure time the parent needs to hit. Not "I'll keep an eye on it" (no unresolved issue; coverage is confirmed). Not "I'll flag it if anything changes" (this is a hard deadline, not standby monitoring). Primary insight surfaces the reassignment and its implication (departure time). ≤4 sentences. No forbidden opener.

**Relief phrase selection validation:** This scenario distinguishes all three relief phrases:
- ✅ "I'll remind you when it's time to leave." — correct for hard departure deadline
- ❌ "I'll keep an eye on it." — wrong; no open issue to monitor
- ❌ "I'll flag it if anything changes." — wrong; this is time-certain, not conditional on change

---

### Scenario 6: Repeat Suppression BYPASSED — Same Issue, Status Changed (Should Surface)
**Input:**
```json
{
  "today_events": [
    { "time": "15:00", "type": "meeting", "owner": "parent_a", "title": "Client call (can't leave)" },
    { "time": "14:30", "type": "meeting", "owner": "parent_b", "title": "Standup (moved to 2:30, frees parent_b by 3)" }
  ],
  "pickup_assignments": [
    { "time": "15:30", "child": "Maya", "assigned": null, "conflict": true }
  ],
  "household_conflicts": ["3:30pm pickup — parent_a still conflicted; parent_b now free"],
  "last_coordination_change": {
    "type": "SCHEDULE_ADJUSTED",
    "changed_by": "parent_b",
    "added_at": "2026-04-05T06:45:00Z",
    "description": "Parent B standup moved to 2:30 — frees parent_b at 3pm"
  },
  "last_surfaced_insight": {
    "issue_id": "pickup-maya-1530-2026-04-04",
    "surfaced_at": "2026-04-04T07:30:00Z"
  },
  "current_time": "2026-04-05T07:30:00Z"
}
```
**Expected output:**
```json
{
  "primary_insight": "Maya's 3:30 pickup now looks like it's on your partner — their standup moved and they're free by 3.",
  "supporting_detail": null,
  "relief_line": "I'll flag it if anything changes."
}
```
**Pass criteria:** Suppression is BYPASSED — `last_coordination_change.added_at` (06:45 today) is AFTER `last_surfaced_insight.surfaced_at` (07:30 yesterday). The issue has materially changed (parent_b is now free). The briefing correctly re-surfaces with updated framing. One qualifier ("looks like") = MEDIUM confidence, appropriate since parent_b status has changed but not yet confirmed as AVAILABLE. Exactly 1 sentence primary insight. This is the critical inverse of Scenario 4.

**Suppression bypass logic:**
- Scenario 4: `last_coordination_change = null` + same issue → SUPPRESS (no change since surfaced)
- Scenario 6: `last_coordination_change.added_at` > `last_surfaced_insight.surfaced_at` → BYPASS SUPPRESSION (issue state changed)

---

### Scenario 7: Different Issue Today — Suppression Does Not Apply
**Input:**
```json
{
  "today_events": [
    { "time": "17:00", "type": "work_event", "owner": "parent_a", "title": "Late project meeting (just added)" }
  ],
  "pickup_assignments": [
    { "time": "17:30", "child": "Leo", "assigned": "parent_a", "conflict": true }
  ],
  "household_conflicts": ["parent_a late meeting conflicts with Leo 5:30 pickup"],
  "last_coordination_change": null,
  "last_surfaced_insight": {
    "issue_id": "pickup-maya-1530-2026-04-04",
    "surfaced_at": "2026-04-04T07:30:00Z"
  },
  "current_time": "2026-04-05T07:30:00Z"
}
```
**Expected output:**
```json
{
  "primary_insight": "A late meeting leaves Leo's 5:30 pickup without a confirmed handler.",
  "supporting_detail": "Worth sorting with your partner before end of day.",
  "relief_line": "I'll keep an eye on it."
}
```
**Pass criteria:** Suppression does NOT apply. Yesterday's `last_surfaced_insight` referenced `pickup-maya-1530-2026-04-04`; today's issue is Leo's 5:30 pickup — a different issue_id entirely. The suppression rule scopes to the same coordination issue only. A new issue must always be surfaced regardless of what was surfaced yesterday. `last_coordination_change: null` means the suppression bypass path (Scenario 6) is not triggered here — suppression simply does not apply because the issue_ids are different.

**Suppression scope validation (all three cases now tested):**
- Scenario 4: same issue_id + no change → **SUPPRESS**
- Scenario 6: same issue_id + status changed → **BYPASS** (surface with updated framing)
- Scenario 7: different issue_id entirely → **SURFACE NORMALLY** (suppression does not apply)

---

### Scenario 8: Multiple Open Issues — Primary Wins (Prioritization)
**Input:**
```json
{
  "today_events": [
    { "time": "15:00", "type": "meeting", "owner": "parent_a", "title": "Client call (can't leave)" },
    { "time": "15:00", "type": "gym", "owner": "parent_b", "title": "PT session" },
    { "time": "17:00", "type": "dinner_reservation", "owner": "parent_a", "title": "Work dinner (added last night)" }
  ],
  "pickup_assignments": [
    { "time": "15:30", "child": "Maya", "assigned": null, "conflict": true },
    { "time": "17:30", "child": "Leo", "assigned": "parent_a", "conflict": true }
  ],
  "household_conflicts": [
    "3:30pm pickup uncovered — both parents tied up (RED)",
    "parent_a dinner conflicts with Leo 5:30 pickup — late addition (YELLOW)"
  ],
  "last_coordination_change": {
    "type": "LATE_SCHEDULE_CHANGE",
    "changed_by": "parent_a",
    "added_at": "2026-04-04T23:00:00Z",
    "description": "Work dinner added last night — conflicts with Leo 5:30 pickup"
  },
  "last_surfaced_insight": null,
  "current_time": "2026-04-04T07:30:00Z"
}
```
**Expected output:**
```json
{
  "primary_insight": "Maya's 3:30 pickup has no one confirmed — you're both tied up at that time.",
  "supporting_detail": "A work dinner also puts Leo's 5:30 pickup at risk — worth deciding who handles that too.",
  "relief_line": "I'll keep an eye on it."
}
```
**Pass criteria:** Primary insight = the more urgent issue (RED pickup risk, both parents conflicted). Supporting detail = the secondary issue (YELLOW late change), framed efficiently in 1 sentence. Briefing does NOT list both as co-equal concerns ("you've got two things today"). Never more than 1 primary insight. Supporting detail adds material value (flags a second issue the parent needs to act on). Total ≤ 4 sentences. Relief line = "I'll keep an eye on it" (unresolved open issue, monitoring warranted — not time-based and not conditional-standby).

**Prioritization rule:** When multiple open coordination issues exist, the severity hierarchy determines the primary slot:
- RED beats YELLOW
- PICKUP_RISK beats LATE_SCHEDULE_CHANGE when severity is equal
- If equal on all dimensions, the earlier event window takes the primary slot

**Route implementation note (for Lead Eng):** The route should pass pickup_assignments and household_conflicts ranked by urgency, or include a priority signal in the input. Without ranking, the model may select the primary issue inconsistently across runs. See Failure Mode 8.

---

### Scenario 9: LOW Confidence — Return Null (Distinct from CLEAR)
**Input:**
```json
{
  "today_events": [
    { "time": "15:00", "type": "meeting", "owner": "parent_a", "title": "Team meeting" },
    { "time": "15:00", "type": "appointment", "owner": "parent_b", "title": "Doctor appointment (time unconfirmed)" }
  ],
  "pickup_assignments": [
    { "time": "15:30", "child": "Maya", "assigned": null, "conflict": null }
  ],
  "household_conflicts": [],
  "last_coordination_change": null,
  "last_surfaced_insight": null,
  "current_time": "2026-04-04T07:30:00Z",
  "confidence": "LOW"
}
```
**Expected output:**
```json
null
```
**Pass criteria:** Silence. `confidence: LOW` → return null. The data suggests a potential pickup risk (both parents have commitments at 3pm, pickup assignment is null and conflict status is null), but the system cannot confirm a real conflict — parent_b's appointment time is unconfirmed and may not actually overlap with the 3:30 pickup. Surfacing an uncertain insight as the morning briefing erodes trust if the parent acts on it and it turns out to be a false alarm.

**Key distinction from Scenario 3 (CLEAR → null):** Scenario 3 returns null because there is nothing to surface — coverage is confirmed (no conflicts, `household_conflicts: []`, assignment is confirmed). Scenario 9 returns null because the system has data that might indicate a coordination need but lacks sufficient confidence to surface it. CLEAR = nothing going on; LOW = something might be going on but the data is too ambiguous to act on.

**Key distinction from Scenario 2 (MEDIUM → surface with qualifier):** Scenario 2 has MEDIUM confidence — one parent is definitively CONFLICTED, the other's pickup assignment is in question. MEDIUM → surface with one qualifier ("probably"). LOW → silence. The threshold: if the system cannot confidently characterize the coordination gap, silence is correct. A LOW-confidence morning briefing is worse than no briefing — it trains the parent to dismiss Kin's alerts.

**Null path taxonomy (all three now tested):**
- Scenario 3: CLEAR (no conflict, coverage confirmed) → null
- Scenario 4/7: repeat suppression (same issue, unchanged) → null
- Scenario 9: LOW confidence (potential issue, data too ambiguous) → null

---

### Scenario 10: ACKNOWLEDGED Issue in Morning Briefing — Status-Aware Framing (Not Re-Alert)
**Input:**
```json
{
  "today_events": [
    { "time": "15:00", "type": "meeting", "owner": "parent_a", "title": "Client call (can't leave)" },
    { "time": "15:00", "type": "gym", "owner": "parent_b", "title": "PT session" }
  ],
  "pickup_assignments": [
    { "time": "15:30", "child": "Maya", "assigned": null, "conflict": true, "state": "ACKNOWLEDGED" }
  ],
  "household_conflicts": [
    { "description": "3:30pm pickup uncovered", "state": "ACKNOWLEDGED" }
  ],
  "last_coordination_change": null,
  "last_surfaced_insight": null,
  "current_time": "2026-04-05T07:30:00Z",
  "confidence": "HIGH"
}
```
**Expected output:**
```json
{
  "primary_insight": "Maya's 3:30 pickup is still open — acknowledged but not yet resolved.",
  "supporting_detail": null,
  "relief_line": "I'll keep an eye on it."
}
```
**Pass criteria:** Does NOT use OPEN-state re-alert language ("you're both tied up at that time"). Uses status-aware framing: "still open — acknowledged but not yet resolved." 1 sentence primary insight. Relief line = "I'll keep an eye on it." (unresolved issue being monitored — not time-based and not conditional). `last_surfaced_insight: null` means this is the first morning briefing for this issue despite it being acknowledged at the alert/chat level; suppression does not apply.

**Key distinction from Scenario 1 (OPEN):** Scenario 1 is an OPEN issue — Kin surfaces with full discovery urgency ("Maya's 3:30 pickup has no one assigned — you're both tied up at 3"). Scenario 10 is an ACKNOWLEDGED issue — a parent has already seen the alert and is presumably handling it. Kin reflects the known state: "still open — acknowledged but not yet resolved." The urgency register drops; the parent doesn't need the problem explained to them again.

**Key distinction from Scenario 4 (repeat suppression):** Scenario 4 suppresses because the same issue was surfaced in yesterday's briefing AND nothing changed (`last_surfaced_insight` references the same issue_id). Scenario 10 is NOT suppressed because `last_surfaced_insight: null` — this issue was acknowledged via the alert card or chat thread, but has not previously appeared in the morning briefing. First appearance in the briefing = surface (with softer framing).

**§26 drift check — ACKNOWLEDGED framing:** "Still open — acknowledged but not yet resolved" is not an insight that changes nothing. It is a status update the parent needs: the issue survives from yesterday, someone engaged with it, but it is not closed. The parent needs to know this so they can decide whether to act this morning or trust that it is handled.

**Route implementation note (for Lead Eng, S2-LE-05):** The route must pass `state: "ACKNOWLEDGED"` for each acknowledged issue in `pickup_assignments` and `household_conflicts`. Without this field, the model defaults to OPEN-state framing and re-alerts the parent about something they already know — eroding trust. See INPUT FORMAT section above for the full schema note.

---

### Scenario 11: ACKNOWLEDGED Primary Yields to OPEN Secondary — OPEN Takes Priority
**Input:**
```json
{
  "today_events": [
    { "time": "15:00", "type": "meeting", "owner": "parent_a", "title": "Client call (can't leave)" },
    { "time": "15:00", "type": "gym", "owner": "parent_b", "title": "PT session" },
    { "time": "17:00", "type": "dinner_reservation", "owner": "parent_a", "title": "Work dinner (added last night)" }
  ],
  "pickup_assignments": [
    { "time": "15:30", "child": "Maya", "assigned": null, "conflict": true, "state": "ACKNOWLEDGED" },
    { "time": "17:30", "child": "Leo", "assigned": "parent_a", "conflict": true, "state": "OPEN" }
  ],
  "household_conflicts": [
    { "description": "3:30pm pickup uncovered — both parents tied up", "state": "ACKNOWLEDGED", "severity": "RED" },
    { "description": "parent_a dinner conflicts with Leo 5:30 pickup", "state": "OPEN", "severity": "YELLOW" }
  ],
  "last_coordination_change": {
    "type": "LATE_SCHEDULE_CHANGE",
    "changed_by": "parent_a",
    "added_at": "2026-04-04T23:00:00Z",
    "description": "Work dinner added last night — conflicts with Leo 5:30 pickup"
  },
  "last_surfaced_insight": null,
  "current_time": "2026-04-05T07:30:00Z",
  "confidence": "HIGH"
}
```
**Expected output:**
```json
{
  "primary_insight": "A work dinner puts Leo's 5:30 pickup at risk — no coverage confirmed.",
  "supporting_detail": "Maya's 3:30 is acknowledged but still open.",
  "relief_line": "I'll keep an eye on it."
}
```
**Pass criteria:** The OPEN YELLOW issue takes the primary slot over the ACKNOWLEDGED RED. Although Maya's 3:30 pickup has higher nominal severity (RED), it is ACKNOWLEDGED — someone has already engaged with it and is presumably handling it. Leo's 5:30 pickup is OPEN — no parent has yet acted on it. The morning briefing must direct the parent's attention to the issue that most needs action right now (the OPEN issue), not the one already in-progress. The ACKNOWLEDGED issue is demoted to `supporting_detail` with status-aware softer framing. Relief line = "I'll keep an eye on it." (both issues remain open and unresolved — monitoring warranted).

**New prioritization dimension (extends Scenario 8):** Scenario 8 established that when two OPEN issues compete, RED > YELLOW for the primary slot. Scenario 11 adds a new dimension: **OPEN > ACKNOWLEDGED when selecting the primary slot, regardless of severity.** An ACKNOWLEDGED issue has already received parent attention; an OPEN issue has not. Actionability takes precedence over severity when the states differ.

Full prioritization rule (all dimensions now documented):
1. **OPEN issues before ACKNOWLEDGED issues** (actionability — the parent needs to act on what hasn't been seen)
2. **Within OPEN issues: RED > YELLOW** (severity hierarchy from Scenario 8; earlier event window breaks ties)
3. **ACKNOWLEDGED issues in supporting_detail only** — use status-aware framing ("acknowledged but still open"), not discovery/urgency framing ("you're both tied up")

**Key distinction from Scenario 8 (two OPEN issues):** Scenario 8 has two OPEN issues where severity determines primary. Scenario 11 has one ACKNOWLEDGED and one OPEN; state determines primary regardless of severity.

**Key distinction from Scenario 10 (single ACKNOWLEDGED):** Scenario 10 tests ACKNOWLEDGED-only — one issue, softer framing for primary_insight. Scenario 11 tests mixed state — the OPEN issue captures the primary slot; the ACKNOWLEDGED is demoted and framed as a status note in supporting_detail.

**§26 drift check — supporting_detail:** "Maya's 3:30 is acknowledged but still open" is not an empty insight. It tells the parent the status of a known issue: seen, in-progress, not yet resolved. This is materially different from a filler supporting detail. The parent needs this to know they haven't forgotten about Maya's pickup — it's being handled.

**Route implementation note (for Lead Eng, S2-LE-05):** The route should pass `pickup_assignments` and `household_conflicts` pre-sorted with OPEN items before ACKNOWLEDGED items within each severity band. Without route-level ordering, the model must infer priority from state; consistent output requires consistent input ordering. The Session 10 flag (rank by urgency) now has a second dimension: within urgency bands, OPEN items precede ACKNOWLEDGED items.

---

### Scenario 12: ACKNOWLEDGED Issue — Previously Surfaced in Briefing, No Change → Suppress (Null)
**Input:**
```json
{
  "today_events": [
    { "time": "15:00", "type": "meeting", "owner": "parent_a", "title": "Client call (can't leave)" },
    { "time": "15:00", "type": "gym", "owner": "parent_b", "title": "PT session" }
  ],
  "pickup_assignments": [
    { "time": "15:30", "child": "Maya", "assigned": null, "conflict": true, "state": "ACKNOWLEDGED" }
  ],
  "household_conflicts": [
    { "description": "3:30pm pickup uncovered", "state": "ACKNOWLEDGED" }
  ],
  "last_coordination_change": null,
  "last_surfaced_insight": {
    "issue_id": "pickup-maya-1530-2026-04-05",
    "surfaced_at": "2026-04-05T07:30:00Z"
  },
  "current_time": "2026-04-06T07:30:00Z",
  "confidence": "HIGH"
}
```
**Expected output:**
```json
null
```
**Pass criteria:** SUPPRESSED. The same issue (`pickup-maya-1530-2026-04-05`) was surfaced in yesterday's morning briefing — at that point with ACKNOWLEDGED framing ("still open — acknowledged but not yet resolved"). Nothing has changed: `last_coordination_change: null`, state is still ACKNOWLEDGED, pickup is still uncovered. Repeat suppression applies to ACKNOWLEDGED issues exactly as it applies to OPEN issues: if the same issue_id was surfaced in the prior briefing and no material change has occurred, the result is null.

**Key distinction from Scenario 10 (ACKNOWLEDGED — first briefing appearance):** Scenario 10 has `last_surfaced_insight: null` — the issue was acknowledged via alert/chat but has never appeared in a morning briefing. First briefing appearance with ACKNOWLEDGED state → surface with status-aware framing. Scenario 12 has `last_surfaced_insight` pointing to the same issue_id — yesterday's briefing already delivered the ACKNOWLEDGED framing. Second consecutive briefing, no change → SUPPRESS.

**Key distinction from Scenario 6 (suppression bypass — status changed):** Scenario 6 has a `last_coordination_change.added_at` that postdates `last_surfaced_insight.surfaced_at` — the issue changed (parent_b freed up), so bypassing suppression is correct. Scenario 12 has `last_coordination_change: null` — nothing has changed at all, making suppression correct regardless of the issue's ACKNOWLEDGED state.

**Suppression taxonomy — all five cases now fully tested:**
- Scenario 4: OPEN + same issue_id + no change → **SUPPRESS**
- Scenario 6: OPEN + same issue_id + status changed → **BYPASS** (re-surface with updated framing)
- Scenario 7: any state + different issue_id → **SURFACE NORMALLY** (suppression does not apply)
- Scenario 10: ACKNOWLEDGED + `last_surfaced_insight: null` → **SURFACE** (status-aware softer framing, first briefing appearance)
- Scenario 12: ACKNOWLEDGED + same issue_id + no change → **SUPPRESS** (repeat suppression applies to ACKNOWLEDGED state)

**§26 drift check:** The ACKNOWLEDGED state does not exempt an issue from repeat suppression. A parent who received "still open — acknowledged but not yet resolved" yesterday and sees nothing new in the data today does not benefit from hearing it again. Daily re-surfacing of a known, acknowledged issue degrades the morning briefing's utility and trains the parent to expect repetition rather than signal.

**Failure mode this validates:** Failure Mode 11 (below) — model re-delivers ACKNOWLEDGED framing each morning because the state is not RESOLVED, ignoring that `last_surfaced_insight` already covered this issue with the same framing on the prior day. (New — Session 16)

---

## Known Failure Modes

1. **Vague primary_insight** — "You've got a busy afternoon" or "Today looks hectic." These pass format checks but fail §8. Fix: ensure prompt explicitly blocks these patterns; QA validates rendered strings.
2. **Repeated insight** — If the same coordination issue was surfaced yesterday and nothing changed, the briefing may re-surface it. Fix: `last_surfaced_insight` now included in input format; prompt suppresses unchanged issues on consecutive days. (Session 3 fix — field was in failure modes but not in input schema; corrected.)
3. **Wrong parent assignment** — If pickup ownership is ambiguous in the data, the model may assign to the wrong parent. Fix: when `assigned` is null or `conflict: true`, do not name a specific parent — surface as shared coordination issue.
4. **Stacked qualifier drift** — Under time pressure or unusual contexts the model may produce "It looks like it might be worth confirming…" Fix: §26 drift review on every output before rendering; block double-qualifier patterns in route validation.
5. **Relief line mismatch** — Using "I'll keep an eye on it" when the correct phrase is "I'll remind you when it's time to leave." Fix: include time vs. monitoring context in input so model selects correctly.
6. **Suppression bypassed incorrectly when change is unrelated** — A minor schedule change (e.g., a meeting moved for a different child's context) triggers surfacing when the core coordination issue is unchanged. Fix: route logic should scope `last_coordination_change` to the same issue_id before treating it as a bypass signal. Flag for Lead Eng when wiring S2-LE-05.
7. **Suppression applied to wrong issue** — Model applies suppression because `last_surfaced_insight` is non-null, even though the issue it covers is different from today's primary issue. Fix: suppression rule is scoped to the same issue_id only. The model checks whether `last_surfaced_insight.issue_id` matches the issue it would surface today before suppressing. A different issue must always surface — validated in Scenario 7.
8. **Dual-insight output when multiple issues exist** — When two open issues are present, the model lists both ("Maya's pickup is uncovered AND Leo's pickup is at risk"). This violates the 1-primary-insight rule and overwhelms the parent rather than directing attention. Fix: prompt enforces exactly 1 `primary_insight`. When multiple issues exist, the highest-urgency issue takes the primary slot (RED > YELLOW; PICKUP_RISK > LATE_SCHEDULE_CHANGE when urgency is equal). The secondary issue appears in `supporting_detail` only — and only if it adds material value beyond the primary. Never co-equal issue listing. Validated in Scenario 8.
9. **ACKNOWLEDGED issue re-alerted with OPEN urgency in morning briefing** — The model outputs "you're both tied up at that time" for an issue with `state: ACKNOWLEDGED`, ignoring that a parent has already seen and engaged with the alert. Fix: ACKNOWLEDGED = parent has seen it and is presumably handling it. Framing should be a status update: "still open — acknowledged but not yet resolved." OPEN-state language ("you're both tied up", "no one confirmed", "has no coverage") is for issues the parent has NOT yet engaged with. Validated in Scenario 10. (New — Session 12)
10. **ACKNOWLEDGED issue retains primary slot when OPEN issue also exists** — When an ACKNOWLEDGED RED issue and an OPEN YELLOW issue coexist, the model places the ACKNOWLEDGED issue in `primary_insight` because its severity is higher. Fix: OPEN > ACKNOWLEDGED for primary slot selection regardless of severity. An ACKNOWLEDGED issue is presumably in-progress; the OPEN issue is the one that needs attention now. ACKNOWLEDGED issues belong in `supporting_detail` with status-aware framing when an OPEN issue exists. Validated in Scenario 11. (New — Session 13)
11. **ACKNOWLEDGED issue resurfaces despite suppression** — Model re-delivers ACKNOWLEDGED-state framing ("still open — acknowledged but not yet resolved") on consecutive mornings because the issue is not RESOLVED and the model treats ACKNOWLEDGED as perpetually worth re-surfacing. Fix: repeat suppression applies equally to ACKNOWLEDGED and OPEN issues. If `last_surfaced_insight.issue_id` matches today's surfaced issue AND `last_coordination_change` is null, the result is null — regardless of the issue's state. An acknowledged issue the parent already heard about yesterday, with no new development, does not warrant a second briefing. Validated in Scenario 12. (New — Session 16)
