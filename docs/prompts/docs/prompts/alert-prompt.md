# Alert Prompt
**Route:** Coordination issue text generation (writes `content` field in `coordination_issues` table)
**Last updated:** 2026-04-07T00:00 (session 18)
**Spec sections:** §3A, §3C, §5, §8, §12, §16, §23

---

## System Prompt

```
You are Kin, a family coordination AI. When a coordination issue is detected, you write the alert text that appears on the alert card. This is the most time-sensitive output Kin produces — it must be immediately actionable and never vague.

## YOUR ROLE
Generate the `content` field for a coordination_issues record. This text renders on the alert card in the Today screen when state is OPEN.

## OUTPUT RULES — NON-NEGOTIABLE

**Length:** Exactly 1 sentence. Format: [What changed] — [Implication].
No exceptions. Never 2 sentences. Never a question. Never a list.

**Lead with the fact, then the consequence.** Do not lead with who is affected or which child is involved — lead with the coordination gap.

**Never open with:**
- "Based on your calendar…"
- "It looks like…"
- "You may want to consider…"
- "Just a heads up…"
- "I noticed that…"
- "FYI" or "Heads up"

**Always use first-person present tense.**

**Tone by scenario (§16):**
- BOTH parents conflicted → collaborative, direct: "You've both got conflicts — [implication]."
- ONE parent is the clear responsible party → direct assignment: "[What changed] — pickup's on you tonight."
- AMBIGUOUS responsibility → coordination prompt, not assignment: "[What changed] — worth a quick check between you."
- Never blame or single out one parent in household thread context.

**Confidence (§23):**
- High → direct, no qualifier
- Medium → one qualifier max ("looks like", "probably", "worth confirming")
- Low → do not generate an alert — return null (silence)

**Trigger types:**
- PICKUP_RISK (§3A): Coverage for a required pickup is at risk
- LATE_SCHEDULE_CHANGE (§3C): A schedule change was made within 12 hours of the affected event

## INPUT FORMAT
You will receive:
- trigger_type: "PICKUP_RISK" | "LATE_SCHEDULE_CHANGE"
- severity: "RED" | "YELLOW" | "CLEAR"
- event_window_start: ISO timestamp
- event_window_end: ISO timestamp
- affected_child: string
- parent_a_status: "CONFLICTED" | "AVAILABLE" | "UNCONFIRMED"
- parent_b_status: "CONFLICTED" | "AVAILABLE" | "UNCONFIRMED"
- change_description: string (for LATE_SCHEDULE_CHANGE — what changed)
- confidence: "HIGH" | "MEDIUM" | "LOW"

## OUTPUT FORMAT
Return a JSON object:
{
  "content": "string — exactly 1 sentence in [What changed] — [Implication] format",
  "severity": "RED" | "YELLOW" (pass through from input),
  "trigger_type": "PICKUP_RISK" | "LATE_SCHEDULE_CHANGE" (pass through)
}

Return null if confidence is LOW.

## SEVERITY DEFINITIONS
- RED: Both parents conflicted, no coverage exists → use direct, urgent language
- YELLOW: Default handler unavailable but backup may exist → use responsibility prompt language
- CLEAR: Coverage confirmed → return null (no alert generated)
```

---

## Spec Compliance Checklist

- [x] §3A — Pickup Risk trigger: RED/YELLOW/CLEAR logic encoded in prompt
- [x] §3C — Late Schedule Change: trigger_type LATE_SCHEDULE_CHANGE handled with change_description context
- [x] §5 — Output limits: exactly 1 sentence enforced
- [x] §8 — Tone: forbidden openers blocked; first-person present tense; leads with fact then consequence
- [x] §12 — Alert state: content field maps to OPEN state of coordination_issues; state machine managed by app
- [x] §16 — Social tone: both conflicted = collaborative; one responsible = direct assignment; ambiguous = coordination prompt
- [x] §23 — Confidence: LOW returns null; MEDIUM one qualifier max; HIGH direct

---

## Test Scenarios

### Scenario 1: PICKUP_RISK — RED (Both Parents Conflicted)
**Input:**
```json
{
  "trigger_type": "PICKUP_RISK",
  "severity": "RED",
  "event_window_start": "2026-04-04T15:30:00Z",
  "event_window_end": "2026-04-04T16:00:00Z",
  "affected_child": "Maya",
  "parent_a_status": "CONFLICTED",
  "parent_b_status": "CONFLICTED",
  "change_description": null,
  "confidence": "HIGH"
}
```
**Expected output:**
```json
{
  "content": "Maya's 3:30 pickup has no coverage — you're both tied up.",
  "severity": "RED",
  "trigger_type": "PICKUP_RISK"
}
```
**Pass criteria:** Direct, collaborative ("you're both"), no hedges, no forbidden opener, exactly 1 sentence.

---

### Scenario 2: PICKUP_RISK — YELLOW (Default Handler Unavailable)
**Input:**
```json
{
  "trigger_type": "PICKUP_RISK",
  "severity": "YELLOW",
  "event_window_start": "2026-04-04T15:30:00Z",
  "event_window_end": "2026-04-04T16:00:00Z",
  "affected_child": "Leo",
  "parent_a_status": "CONFLICTED",
  "parent_b_status": "UNCONFIRMED",
  "change_description": null,
  "confidence": "MEDIUM"
}
```
**Expected output:**
```json
{
  "content": "Leo's 3:30 pickup is unconfirmed — probably worth a quick check between you.",
  "severity": "YELLOW",
  "trigger_type": "PICKUP_RISK"
}
```
**Pass criteria:** One qualifier ("probably"), symmetric coordination prompt tone (not directional lean, not assignment), exactly 1 sentence.

**§3A vs §3C distinction (important — do not conflate with §3C Scenario 9):** For LATE_SCHEDULE_CHANGE (§3C) with parent_a CONFLICTED + parent_b UNCONFIRMED, the directional lean toward the UNCONFIRMED parent is correct ("worth checking if your partner can cover" — Scenario 9). For PICKUP_RISK (§3A) with the same parent-status combination, the symmetric coordination prompt ("worth a quick check between you") is correct. The distinction: §3C alerts are triggered by a specific action one parent took (a schedule change), which implicitly leans responsibility toward the other parent. §3A alerts surface a systemic coverage gap — neither parent necessarily "caused" the risk by a single action. The CONFLICTED state in §3A indicates unavailability, not causal responsibility. A symmetric coordination prompt is therefore appropriate: both parents need to decide, not just the UNCONFIRMED one. (Note — Session 18)

---

### Scenario 3: LATE_SCHEDULE_CHANGE — RED (Change Creates Gap)
**Input:**
```json
{
  "trigger_type": "LATE_SCHEDULE_CHANGE",
  "severity": "RED",
  "event_window_start": "2026-04-04T17:30:00Z",
  "event_window_end": "2026-04-04T18:00:00Z",
  "affected_child": "Leo",
  "parent_a_status": "CONFLICTED",
  "parent_b_status": "CONFLICTED",
  "change_description": "Parent A added a work dinner at 5pm",
  "confidence": "HIGH"
}
```
**Expected output:**
```json
{
  "content": "A work dinner was just added at 5 — Leo's 5:30 pickup is now uncovered.",
  "severity": "RED",
  "trigger_type": "LATE_SCHEDULE_CHANGE"
}
```
**Pass criteria:** Leads with the change, surfaces the implication, direct (HIGH confidence), no hedges.

---

### Scenario 3b: PICKUP_RISK — YELLOW (One Parent Clearly Responsible — Direct Assignment)
**Input:**
```json
{
  "trigger_type": "PICKUP_RISK",
  "severity": "YELLOW",
  "event_window_start": "2026-04-04T15:30:00Z",
  "event_window_end": "2026-04-04T16:00:00Z",
  "affected_child": "Maya",
  "parent_a_status": "CONFLICTED",
  "parent_b_status": "AVAILABLE",
  "change_description": null,
  "confidence": "HIGH"
}
```
**Expected output:**
```json
{
  "content": "Maya's 3:30 pickup isn't covered — it's on you tonight.",
  "severity": "YELLOW",
  "trigger_type": "PICKUP_RISK"
}
```
**Pass criteria:** Direct assignment language (not coordination prompt — parent_b is AVAILABLE, responsibility is clear). HIGH confidence → no qualifier. Exactly 1 sentence. "It's on you" addresses the AVAILABLE parent directly.

---

### Scenario 4: CLEAR — Silence
**Input:**
```json
{
  "trigger_type": "PICKUP_RISK",
  "severity": "CLEAR",
  "parent_a_status": "AVAILABLE",
  "parent_b_status": "AVAILABLE",
  "confidence": "HIGH"
}
```
**Expected output:**
```json
null
```
**Pass criteria:** No alert generated. Coverage confirmed = silence.

---

### Scenario 5: LOW Confidence — Silence (No Alert Generated)
**Input:**
```json
{
  "trigger_type": "PICKUP_RISK",
  "severity": "YELLOW",
  "event_window_start": "2026-04-04T15:30:00Z",
  "event_window_end": "2026-04-04T16:00:00Z",
  "affected_child": "Leo",
  "parent_a_status": "UNCONFIRMED",
  "parent_b_status": "UNCONFIRMED",
  "change_description": null,
  "confidence": "LOW"
}
```
**Expected output:**
```json
null
```
**Pass criteria:** Silence. LOW confidence → do not generate an alert. Both parents UNCONFIRMED and no change description means the system does not have sufficient data to determine whether coverage is actually at risk. Generating a noisy, uncertain alert erodes trust. The route must handle null gracefully — no coordination_issues record written for LOW confidence triggers.

**Distinction from MEDIUM (Scenario 2):** Scenario 2 has MEDIUM confidence (one parent CONFLICTED, one UNCONFIRMED — partial information). LOW confidence means the data is too ambiguous to support even a coordination prompt. The threshold: if the system cannot confidently characterize the gap, silence is correct.

---

### Scenario 6: LATE_SCHEDULE_CHANGE — YELLOW (One Parent Clearly Responsible — Direct Assignment)
**Input:**
```json
{
  "trigger_type": "LATE_SCHEDULE_CHANGE",
  "severity": "YELLOW",
  "event_window_start": "2026-04-04T15:30:00Z",
  "event_window_end": "2026-04-04T16:00:00Z",
  "affected_child": "Leo",
  "parent_a_status": "CONFLICTED",
  "parent_b_status": "AVAILABLE",
  "change_description": "Parent A meeting extended to 4pm",
  "confidence": "HIGH"
}
```
**Expected output:**
```json
{
  "content": "A 4pm meeting extension puts Leo's 3:30 pickup on you — your partner's tied up.",
  "severity": "YELLOW",
  "trigger_type": "LATE_SCHEDULE_CHANGE"
}
```
**Pass criteria:** LATE_SCHEDULE_CHANGE format: [what changed] — [implication]. Direct assignment (parent_b AVAILABLE = clear responsibility, HIGH confidence = no qualifier). 1 sentence. No forbidden opener.

**§3C + §16 intersection:** Late schedule change trigger type does NOT override the tone rule. When one parent is clearly AVAILABLE, the output is direct assignment language — same as PICKUP_RISK Scenario 3b. The distinction: the first clause leads with the change ("A 4pm meeting extension"), not the coverage state. This is the only structural difference from PICKUP_RISK direct-assignment output.

**Note:** This scenario is also tested in `trigger-test-log.md` (Session 3 new test — "§3C YELLOW: Late Change, One Parent Newly Conflicted, Partner Available"). Adding it here closes the gap where the LATE_SCHEDULE_CHANGE + direct-assignment case was only in the trigger log, not in the prompt file itself. Both §3C trigger types (RED both-conflicted, YELLOW direct-assignment) now tested at the prompt level.

### Scenario 7: §3C CLEAR — Late Change Resolves, No Alert Generated
**Input:**
```json
{
  "trigger_type": "LATE_SCHEDULE_CHANGE",
  "severity": "CLEAR",
  "event_window_start": "2026-04-04T15:30:00Z",
  "event_window_end": "2026-04-04T16:00:00Z",
  "affected_child": "Maya",
  "parent_a_status": "AVAILABLE",
  "parent_b_status": "AVAILABLE",
  "change_description": "Parent A meeting cancelled — now free for pickup",
  "confidence": "HIGH"
}
```
**Expected output:**
```json
null
```
**Pass criteria:** Silence. A LATE_SCHEDULE_CHANGE with severity CLEAR means the change resolved coverage rather than creating a gap. No alert is generated. Mirrors Scenario 4 (§3A CLEAR) but for the §3C trigger type. Coverage confirmed = silence regardless of how that coverage came to be confirmed.

**Note:** This scenario was tested in the Session 2 trigger log ("§3C — CLEAR: Change Resolves Itself") but was not represented at the prompt-file level. Adding here closes the gap between trigger-log and prompt-file coverage for §3C CLEAR.

---

### Scenario 8: §3C YELLOW — Both Parents UNCONFIRMED (Coordination Prompt, Not Assignment)
**Input:**
```json
{
  "trigger_type": "LATE_SCHEDULE_CHANGE",
  "severity": "YELLOW",
  "event_window_start": "2026-04-04T15:30:00Z",
  "event_window_end": "2026-04-04T16:00:00Z",
  "affected_child": "Maya",
  "parent_a_status": "UNCONFIRMED",
  "parent_b_status": "UNCONFIRMED",
  "change_description": "Parent A calendar shows cleared block at 3pm — unclear if meeting was cancelled or rescheduled",
  "confidence": "MEDIUM"
}
```
**Expected output:**
```json
{
  "content": "A schedule change may affect Maya's 3:30 pickup — worth a quick check between you.",
  "severity": "YELLOW",
  "trigger_type": "LATE_SCHEDULE_CHANGE"
}
```
**Pass criteria:** LATE_SCHEDULE_CHANGE + both UNCONFIRMED → coordination prompt, NOT direct assignment. MEDIUM confidence → one qualifier ("may"). 1 sentence. [What changed] — [implication] format maintained. No forbidden opener.

**§3C + §16 intersection — all three tone outcomes now tested at prompt-file level:**
- Scenario 3 (§3C RED): both CONFLICTED → direct, collaborative ("you're both") — HIGH confidence
- Scenario 6 (§3C YELLOW direct): one AVAILABLE → direct assignment — HIGH confidence
- Scenario 8 (§3C YELLOW coord): both UNCONFIRMED → coordination prompt — MEDIUM confidence

**Note:** This scenario was tested in the Session 4 trigger log ("§3C — YELLOW: Late Change, Both UNCONFIRMED — Coordination Prompt, Not Assignment") but was not at the prompt-file level. Adding here closes the gap. The critical distinction: when both parents are UNCONFIRMED (not merely one), the system cannot characterize responsibility — coordination prompt is required even for LATE_SCHEDULE_CHANGE trigger type.

---

### Scenario 9: §3C YELLOW — One Parent CONFLICTED, One UNCONFIRMED (Directional Lean, MEDIUM Confidence)
**Input:**
```json
{
  "trigger_type": "LATE_SCHEDULE_CHANGE",
  "severity": "YELLOW",
  "event_window_start": "2026-04-04T17:30:00Z",
  "event_window_end": "2026-04-04T18:00:00Z",
  "affected_child": "Leo",
  "parent_a_status": "CONFLICTED",
  "parent_b_status": "UNCONFIRMED",
  "change_description": "Parent A work meeting extended to 5pm",
  "confidence": "MEDIUM"
}
```
**Expected output:**
```json
{
  "content": "A 5pm meeting extension puts Leo's 5:30 in question — worth checking if your partner can cover.",
  "severity": "YELLOW",
  "trigger_type": "LATE_SCHEDULE_CHANGE"
}
```
**Pass criteria:** LATE_SCHEDULE_CHANGE format: [what changed] — [implication]. MEDIUM confidence → one qualifier ("in question"). Not a direct assignment (parent_b is UNCONFIRMED, not AVAILABLE — cannot assert responsibility). Not a pure coordination prompt (parent_a is definitively CONFLICTED — responsibility leans toward parent_b). The directional lean ("your partner") reflects the partial information: one parent is known to be unavailable; the other hasn't confirmed. 1 sentence. No forbidden opener.

**§3C × §16 × §23 three-way intersection — all parent-status combinations for LATE_SCHEDULE_CHANGE YELLOW now tested:**
- Scenario 6 (§3C YELLOW): parent_a CONFLICTED + parent_b AVAILABLE + HIGH → direct assignment ("it's on you tonight")
- Scenario 8 (§3C YELLOW): both UNCONFIRMED + MEDIUM → pure coordination prompt ("worth a quick check between you")
- Scenario 9 (§3C YELLOW): parent_a CONFLICTED + parent_b UNCONFIRMED + MEDIUM → directional lean toward UNCONFIRMED parent ("worth checking if your partner can cover")

**Key distinction from Scenario 6 (one AVAILABLE, HIGH):** Scenario 6 — parent_b confirmed AVAILABLE → direct assignment, no qualifier. Scenario 9 — parent_b UNCONFIRMED → soft directional lean, MEDIUM qualifier. UNCONFIRMED ≠ AVAILABLE. The alert cannot assert a confirmed assignment when the parent's status hasn't been verified.

**Key distinction from Scenario 8 (both UNCONFIRMED, MEDIUM):** Scenario 8 — both parents UNCONFIRMED → pure bilateral coordination prompt ("a quick check between you"). Scenario 9 — one parent definitively CONFLICTED → responsibility leans directionally toward the UNCONFIRMED parent, not symmetrically toward both. "Worth checking if your partner can cover" names the likely responsible party without asserting confirmed coverage.

**Confidence calibration:** MEDIUM is correct because parent_a's conflict is known (CONFLICTED) but parent_b's availability is unverified (UNCONFIRMED). The system has partial information: enough to lean directionally, not enough to assert. If parent_b later confirms AVAILABLE, the confidence would be HIGH and the alert could upgrade to Scenario 6 language.

---

## Known Failure Modes

1. **2-sentence output** — The model occasionally generates a second sentence of context. Fix: enforce 1-sentence rule in route validation; reject and retry if `content` contains more than one sentence-ending punctuation.
2. **Wrong responsibility assignment** — Naming a specific parent when both are UNCONFIRMED. Fix: when both statuses are UNCONFIRMED, use coordination prompt tone, not assignment.
3. **Qualifier stacking under ambiguity** — "It looks like it might be worth confirming…" Fix: §26 drift review; route validation should flag strings containing two qualifier words.
4. **CLEAR state generating an alert** — Model produces content even when severity is CLEAR. Fix: explicit null-return rule for CLEAR; validated in QA-S2.
5. **Generic reassurance in content** — "Don't worry, this can be sorted." Fix: blocked in prompt; QA validates all rendered alert strings.
6. **LATE_SCHEDULE_CHANGE defaults to coordination prompt even when one parent is AVAILABLE** — The late-change framing ("A schedule change…") can feel ambiguous, causing the model to default to coordination-prompt tone regardless of parent status. Fix: §16 tone rule applies to ALL trigger types. When parent_b_status is AVAILABLE and confidence is HIGH, output must be direct assignment — not "worth a quick check between you." Validated in Scenario 6.
7. **§3C YELLOW one-CONFLICTED/one-UNCONFIRMED treated as pure coordination prompt** — Model defaults to "worth a quick check between you" even when one parent is definitively CONFLICTED, ignoring the directional lean. Fix: when one parent is CONFLICTED and the other is UNCONFIRMED (not both UNCONFIRMED), the responsibility leans toward the UNCONFIRMED parent. Output should use directional framing ("worth checking if your partner can cover") rather than a symmetric bilateral prompt. The full tone hierarchy for LATE_SCHEDULE_CHANGE YELLOW: one AVAILABLE → direct assignment; one CONFLICTED + one UNCONFIRMED → directional lean; both UNCONFIRMED → coordination prompt. Validated in Scenario 9. (New — Session 17)
8. **§3A PICKUP_RISK Scenario 2 mistakenly updated to use directional lean** — After Session 17 established the §3C directional lean, a reviewer or QA engineer may flag Scenario 2 (§3A PICKUP_RISK YELLOW, one CONFLICTED, one UNCONFIRMED) as inconsistent with §3C Scenario 9. The symmetric coordination prompt in Scenario 2 is intentional and correct. §3A and §3C differ in causal origin: a LATE_SCHEDULE_CHANGE is triggered by one parent's action (making the change), creating a natural directional lean toward the other. A PICKUP_RISK is a systemic coverage gap — neither parent necessarily caused it by a discrete action. The CONFLICTED state in §3A signals unavailability, not responsibility. Do not apply the §3C directional lean to §3A Scenario 2. Scenario 2's expected output remains: "Leo's 3:30 pickup is unconfirmed — probably worth a quick check between you." (New — Session 18)
