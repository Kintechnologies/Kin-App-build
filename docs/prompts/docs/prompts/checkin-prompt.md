# Check-In Prompt
**Route:** Check-in card copy generation
**Last updated:** 2026-04-06T08:00 (session 14)
**Spec sections:** §5, §7, §8, §12, §23

---

## System Prompt

```
You are Kin, a family coordination AI. Check-in cards are light-touch surfaces — they surface a soft observation and optionally invite a response. They are not alerts. They do not escalate. They disappear when dismissed.

## YOUR ROLE
Generate the copy for a check-in card on the Today screen. Check-in cards render when:
- No High-priority alert is OPEN
- The household has at most 2 check-in cards for the day
- There is a meaningful, low-urgency coordination observation worth surfacing

## OUTPUT RULES — NON-NEGOTIABLE

**Format:** [observation] + [optional prompt]
- Observation: 1 sentence, states what Kin notices
- Prompt: 1 sentence or null — a light invitation to confirm, plan, or respond. Never a demand.
- Total: maximum 2 sentences

**Never open with:**
- "Based on your calendar…"
- "It looks like…"
- "You may want to consider…"
- "Just a heads up…"
- "I noticed that…"
- Any greeting

**Always use first-person present tense.**

**Tone:** Calm, light, unhurried. This is not an alert. Never use urgency language. Never use words like "unresolved," "risk," "conflict," or "gap" — those belong in alerts.

**Confidence (§23):**
- High → direct observation, no qualifier
- Medium → one qualifier ("looks like", "probably")
- Low → return null. Do not generate a check-in.

**Suppression rule:** If a HIGH-priority alert is OPEN in the household, return null — do not generate a check-in.

**Frequency rule:** Maximum 2 check-in cards per day. If 2 have already been generated today, return null.

**What makes a good check-in:**
- An upcoming event where confirmation would be helpful (not urgent)
- A low-signal coordination observation (e.g., partner hasn't confirmed attendance)
- A logistics question that's easy to answer now and annoying to scramble later

**What does not make a good check-in:**
- Repeating an observation from yesterday with no change
- Anything already covered by an alert
- Generic filler ("Looks like a busy week ahead")
- Anything requiring immediate action (that's an alert)

**Prompt field — monitoring offers:** When the optional `prompt` invites Kin to monitor or flag something, use the exact conditional relief phrase — do not ask permission. Say "I'll flag it if it's still open by [time]." not "Want me to flag it if...?" Kin acts; it does not request approval.

## INPUT FORMAT
You will receive:
- observation_type: "CONFIRMATION_PENDING" | "SOFT_COORDINATION" | "UPCOMING_LOGISTICS"
- upcoming_event: { time, type, child, assigned_parent, confirmed: bool }
- household_has_open_high_priority_alert: bool
- checkins_generated_today: number
- last_surfaced_at: ISO timestamp or null — when this same observation was last surfaced
- confidence: "HIGH" | "MEDIUM" | "LOW"

## OUTPUT FORMAT
Return a JSON object:
{
  "observation": "string — 1 sentence, what Kin notices",
  "prompt": "string or null — 1 sentence, optional light invitation"
}

Return null if:
- household_has_open_high_priority_alert is true
- checkins_generated_today >= 2
- confidence is LOW
- last_surfaced_at is within 24 hours and the underlying situation has not changed
- There is nothing worth a soft surface
```

---

## Spec Compliance Checklist

- [x] §5 — Output limits: [observation] + [optional prompt], max 2 sentences
- [x] §7 — Silence rule: returns null when suppressed, no alert exists, nothing meaningful to surface
- [x] §8 — Tone: forbidden openers blocked; first-person present tense; calm/unhurried language
- [x] §12 — State awareness: suppressed when High-priority OPEN alert exists
- [x] §23 — Confidence: LOW = null; MEDIUM = one qualifier; HIGH = direct

---

## Test Scenarios

### Scenario 1: Confirmation Pending — High Confidence
**Input:**
```json
{
  "observation_type": "CONFIRMATION_PENDING",
  "upcoming_event": {
    "time": "16:00",
    "type": "soccer_practice",
    "child": "Maya",
    "assigned_parent": "parent_b",
    "confirmed": false
  },
  "household_has_open_high_priority_alert": false,
  "checkins_generated_today": 0,
  "last_surfaced_at": null,
  "confidence": "HIGH"
}
```
**Expected output:**
```json
{
  "observation": "Maya's 4pm soccer practice hasn't been confirmed yet.",
  "prompt": "I'll flag it if it's still open by 3."
}
```
**Pass criteria:** Direct (no qualifier), calm tone, no forbidden opener, no urgency language. `prompt` uses exact conditional relief phrase — not a permission-seeking question.

---

### Scenario 2: Soft Coordination — Medium Confidence
**Input:**
```json
{
  "observation_type": "SOFT_COORDINATION",
  "upcoming_event": {
    "time": "18:30",
    "type": "dinner_plan",
    "child": null,
    "assigned_parent": "both",
    "confirmed": false
  },
  "household_has_open_high_priority_alert": false,
  "checkins_generated_today": 1,
  "last_surfaced_at": null,
  "confidence": "MEDIUM"
}
```
**Expected output:**
```json
{
  "observation": "Tonight's dinner plan looks like it hasn't been finalized.",
  "prompt": null
}
```
**Pass criteria:** One qualifier ("looks like"), no prompt (observation only is fine), calm, 1 sentence. `last_surfaced_at: null` = no repeat suppression applies.

---

### Scenario 3: Suppressed — High-Priority Alert Open
**Input:**
```json
{
  "observation_type": "CONFIRMATION_PENDING",
  "upcoming_event": { "time": "15:30", "child": "Leo", "confirmed": false },
  "household_has_open_high_priority_alert": true,
  "checkins_generated_today": 0,
  "confidence": "HIGH"
}
```
**Expected output:**
```json
null
```
**Pass criteria:** Silence. Never render a check-in when a High-priority alert is OPEN.

---

### Scenario 4: Repeat Observation — Suppressed (Same Issue, Within 24h)
**Input:**
```json
{
  "observation_type": "CONFIRMATION_PENDING",
  "upcoming_event": {
    "time": "16:00",
    "type": "soccer_practice",
    "child": "Maya",
    "assigned_parent": "parent_b",
    "confirmed": false
  },
  "household_has_open_high_priority_alert": false,
  "checkins_generated_today": 1,
  "last_surfaced_at": "2026-04-04T07:30:00Z",
  "confidence": "HIGH"
}
```
**Expected output:**
```json
null
```
**Pass criteria:** Silence. The same unconfirmed practice was surfaced this morning; nothing has changed. Do not re-surface within 24h.

---

### Scenario 5: Upcoming Logistics — Tomorrow's Unplanned Event
**Input:**
```json
{
  "observation_type": "UPCOMING_LOGISTICS",
  "upcoming_event": {
    "time": "09:00",
    "type": "class_trip",
    "child": "Maya",
    "assigned_parent": null,
    "confirmed": false,
    "date": "tomorrow",
    "note": "Permission slip required; no lunch provided"
  },
  "household_has_open_high_priority_alert": false,
  "checkins_generated_today": 0,
  "last_surfaced_at": null,
  "confidence": "HIGH"
}
```
**Expected output:**
```json
{
  "observation": "Maya has a class trip tomorrow morning — no lunch is provided.",
  "prompt": "Worth sorting tonight if you haven't already."
}
```
**Pass criteria:** UPCOMING_LOGISTICS type demonstrated. Calm, forward-looking, no urgency language. Observation is specific (names child, event type, the logistics detail that matters — no lunch). Prompt is a light invitation, not a demand or an alert. HIGH confidence → no qualifier. No forbidden opener. Does not use alert-register vocabulary ("risk," "conflict," "gap," "unresolved").

**Tone distinction:** This is not an alert — there is no coverage gap. It is a soft logistics notice about something the household may not have on their radar. The goal is to surface it early so it doesn't become a scramble tomorrow morning.

### Scenario 6: Frequency Cap — Maximum Check-Ins Reached, Return Null
**Input:**
```json
{
  "observation_type": "CONFIRMATION_PENDING",
  "upcoming_event": {
    "time": "19:00",
    "type": "school_event",
    "child": "Leo",
    "assigned_parent": "parent_a",
    "confirmed": false
  },
  "household_has_open_high_priority_alert": false,
  "checkins_generated_today": 2,
  "last_surfaced_at": null,
  "confidence": "HIGH"
}
```
**Expected output:**
```json
null
```
**Pass criteria:** Silence. `checkins_generated_today: 2` means the daily maximum has been reached. The frequency cap applies regardless of observation type, confidence level, or whether the event is genuinely worth surfacing. No third check-in card is generated.

**Suppression precedence (all null-return cases now tested):**
- Scenario 3: `household_has_open_high_priority_alert: true` → suppress (alert takes priority)
- Scenario 4: `last_surfaced_at` within 24h, no change → suppress (repeat suppression)
- Scenario 6: `checkins_generated_today >= 2` → suppress (frequency cap)

**Note:** The route must pass the accurate `checkins_generated_today` count before calling this prompt. If the route calls this prompt before confirming the count, more than 2 check-ins can render on a single day. Route must check count first, call prompt only if count is below 2.

---

### Scenario 7: LOW Confidence — No Check-In Generated
**Input:**
```json
{
  "observation_type": "SOFT_COORDINATION",
  "upcoming_event": {
    "time": "18:30",
    "type": "dinner_plan",
    "child": null,
    "assigned_parent": "both",
    "confirmed": false
  },
  "household_has_open_high_priority_alert": false,
  "checkins_generated_today": 0,
  "last_surfaced_at": null,
  "confidence": "LOW"
}
```
**Expected output:**
```json
null
```
**Pass criteria:** Silence. `confidence: LOW` → no check-in generated, regardless of other conditions. No open alert, no frequency cap, no repeat suppression — the sole reason for null is insufficient confidence. The system cannot characterize a meaningful soft observation from the available data.

**Suppression precedence (all four null-return cases now tested):**
- Scenario 3: `household_has_open_high_priority_alert: true` → suppress (alert takes priority)
- Scenario 4: `last_surfaced_at` within 24h, no change → suppress (repeat suppression)
- Scenario 6: `checkins_generated_today >= 2` → suppress (frequency cap)
- Scenario 7: `confidence: LOW` → suppress (insufficient confidence)

**Key distinction from Scenario 2 (MEDIUM):** Scenario 2 has MEDIUM confidence and returns an observation with one qualifier ("looks like"). Scenario 7 has LOW confidence and returns null. The threshold: if the system cannot confidently characterize a soft observation worth surfacing, silence is correct — a weak or uncertain check-in creates noise without value. LOW confidence check-ins are the worst failure mode: they surface uncertain content in a low-urgency slot, training the parent to ignore check-in cards.

**Key distinction from Scenario 3 (suppressed by alert):** In Scenario 3, the observation has HIGH confidence but is suppressed because an alert takes priority. Here, the suppression is purely confidence-based — the underlying event data is ambiguous.

---

### Scenario 8: Repeat Suppression BYPASSED — Situation Changed (Re-Surface with Updated Observation)
**Input:**
```json
{
  "observation_type": "CONFIRMATION_PENDING",
  "upcoming_event": {
    "time": "17:00",
    "type": "soccer_practice",
    "child": "Maya",
    "assigned_parent": "parent_b",
    "confirmed": false,
    "previous_time": "16:00",
    "note": "Practice rescheduled from 4pm to 5pm"
  },
  "household_has_open_high_priority_alert": false,
  "checkins_generated_today": 1,
  "last_surfaced_at": "2026-04-04T07:30:00Z",
  "confidence": "HIGH"
}
```
**Expected output:**
```json
{
  "observation": "Maya's soccer practice moved to 5pm — it still hasn't been confirmed.",
  "prompt": "I'll flag it if it's still open by 4."
}
```
**Pass criteria:** Suppression is BYPASSED — `last_surfaced_at` is within 24h, but the underlying event changed (practice time moved from 4pm to 5pm). The prior check-in ("Maya's 4pm soccer practice hasn't been confirmed yet") is no longer accurate. Re-surface with updated observation. The suppression rule scopes to "underlying situation has not changed" — a time change IS a change. HIGH confidence → no qualifier. `prompt` uses exact conditional relief phrase.

**Suppression scope (all branches now tested):**
- Scenario 4: `last_surfaced_at` within 24h + underlying situation unchanged → **SUPPRESS** (null)
- Scenario 8: `last_surfaced_at` within 24h + underlying situation changed → **BYPASS** (re-surface with updated framing)

**Key distinction from Scenario 4 (suppress):** Scenario 4 — same child, same practice, same time, same confirmation state, no changes → null. Scenario 8 — same child and event type, but the event time moved (4pm → 5pm). The prior check-in no longer reflects reality; the observation must update.

**Parallel structure with morning-briefing-prompt.md:** Morning briefing has three named suppression branches: suppress (Scenario 4), bypass (Scenario 6), and N/A/different-issue (Scenario 7). Check-in now has two named branches: suppress (Scenario 4) and bypass (Scenario 8). The N/A branch doesn't apply to check-in since the suppression rule is event-scoped, not issue-id-scoped.

---

## Known Failure Modes

1. **Alert-tone language in a check-in** — "Leo's pickup is at risk" or "Conflict detected." Fix: block urgency vocabulary in prompt; QA validates rendered strings.
2. **Check-in rendered with open High-priority alert** — Suppression rule missed by routing logic. Fix: check `household_has_open_high_priority_alert` before calling this prompt; also enforced in prompt itself.
3. **Third check-in generated** — Frequency cap not respected. Fix: route must check `checkins_generated_today` before calling; prompt also enforces.
4. **Repeated check-in** — Same observation surfaced two days in a row with no change. Fix: include `last_surfaced_at` in context; prompt should return null if unchanged within 24h.
5. **Prompt is a demand** — "You need to confirm this now." Fix: prompt field must be invitation language only; block imperative constructions.
6. **Prompt asks permission instead of stating intent** — "Want me to flag it if...?" instead of "I'll flag it if it's still open by [time]." Fix: monitoring offers in the `prompt` field must use exact conditional relief phrase; permission-seeking language is inconsistent with Kin's quietly capable persona. (Session 3 fix — was present in Scenario 1 output; corrected.)
7. **Repeat suppression applied despite situation change** — Model returns null because `last_surfaced_at` is within 24h, ignoring that the event details changed (time moved, assigned parent changed, logistics detail updated, etc.). Fix: suppression rule scopes to "underlying situation unchanged" — if the event time, assigned parent, or any material detail has changed since `last_surfaced_at`, the check-in should re-surface with updated information. Parallel to morning-briefing Scenario 6 (suppression bypass when issue state changes). Validated in Scenario 8. (New — Session 14)
