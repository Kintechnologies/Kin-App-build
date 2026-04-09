# Trigger Scenario Test Log
**Spec sections tested:** §3A (Pickup Risk), §3C (Late Schedule Change)
**§26 drift review included**

---

## SESSION LOG

### Session 1 — 2026-04-04T00:00 (initial production)
All 6 prompts produced. All tests passed. See archive below.

### Session 2 — 2026-04-04T08:00 (maintenance run)
**Changes this session:**
- `morning-briefing-prompt.md` — added relief line selection guide (was: three phrases listed; now: selection criteria per phrase)
- `alert-prompt.md` — added Scenario 3b: YELLOW/one-responsible-parent (direct assignment tone, previously untested)
- `chat-prompt.md` — promoted no-repetition rule from failure modes into conversation rules (was implicit; now explicit instruction)
- `closure-prompt.md` — added Scenario 4: `resolved_by: "both"` mutual resolution

**§26 drift review:** All 6 prompts passed — see results below.
**Trigger tests:** All 7 scenarios passed (6 original + 1 new §3A YELLOW direct-assignment scenario).

---

### Session 15 — 2026-04-08T02:00 (test coverage gaps closed; household thread trigger tests added)

**Context:** Session 14 updated `chat-prompt.md`, `checkin-prompt.md`, and `alert-prompt.md`. Two test coverage gaps survived into this session: (1) `checkin-prompt.md` had no test scenario validating the `last_surfaced_at` suppression field added in S14 or the frequency cap; (2) `first-use-prompt.md` had no test for MEDIUM confidence → fallback. Additionally, the trigger test log had no household-thread equivalents for the ACKNOWLEDGED/RESOLVED symmetry tests added in S14 (personal thread only). All three gaps closed this session.

**Changes this session:**

- `checkin-prompt.md` — **Test coverage + schema completeness:**
  - Updated Scenario 1 and Scenario 2 inputs to include `last_surfaced_at: null` (first-surface case; field was in INPUT FORMAT but not in test inputs)
  - Added Scenario 4: `last_surfaced_at` suppression — same event, no change since prior surface → null. Validates Failure Mode 4 fix end-to-end
  - Added Scenario 5: frequency cap — `checkins_generated_today: 2` → null. Validates Failure Mode 3 (route + prompt dual enforcement)
  - Added Failure Mode 6: frequency cap bypassed (route passes stale or missing count)

- `first-use-prompt.md` — **MEDIUM confidence path validated:**
  - Added Scenario 5: MEDIUM confidence → exact fallback text, `is_fallback: true`. Confirms that the first-use confidence threshold is stricter than general §23 (MEDIUM = fallback, not hedged live insight)
  - Updated Failure Mode 3: clarified fallback applies to MEDIUM or LOW (was: "when confidence is LOW")
  - Added Failure Mode 6: MEDIUM confidence produces hedged live insight instead of falling back

**§26 drift review:** All 7 prompts reviewed — see results below.
**Trigger tests:** Core §3A and §3C re-run (no regressions). New household thread ACKNOWLEDGED and RESOLVED tests added. New checkin and first-use scenario validations.

**What Lead Eng can now wire:**
- `checkin-prompt.md` route must pass `last_surfaced_at` (validated in Scenario 4) and `checkins_generated_today` (validated in Scenario 5) — both required for correct suppression behavior
- `first-use-prompt.md` route must derive a `confidence` signal from household data before calling this prompt; MEDIUM and LOW must both produce `is_fallback: true` output

---

### Session 14 — 2026-04-08T00:00 (ACKNOWLEDGED/RESOLVED parity + schema fixes)

**Context:** Sessions 3–13 progressively added ACKNOWLEDGED and RESOLVED state handling to `morning-briefing-prompt.md` (Sessions 10–11, 12–13) and `household-chat-prompt.md` (Sessions 8, 11, 13). `chat-prompt.md` had not been updated since Session 2 and lacked symmetric ACKNOWLEDGED/RESOLVED handling for the personal thread. Three schema gaps also identified.

**Changes this session:**

- `chat-prompt.md` — **Major update:**
  - Added ACKNOWLEDGED state handling to CONVERSATION RULES: softer framing for ACKNOWLEDGED issues ("flagged and acknowledged — has it been sorted yet?"); OPEN-state urgency language blocked for ACKNOWLEDGED issues
  - Added RESOLVED state handling to CONVERSATION RULES: confirmed resolution from `conversation_history` → "Leo's 5:30 was sorted — it's off the list."
  - Updated `open_coordination_issues` context field description to include `state: "OPEN" | "ACKNOWLEDGED"` with urgency register guidance
  - Updated `conversation_history` description to note use for detecting RESOLVED issues
  - Added Scenario 5: Clean state — "anything I should know?" → brief specific acknowledgment
  - Added Scenario 6: LOW confidence — terminal uncertainty statement (personal thread = terminal; distinct from household thread's clarification-invitation pattern)
  - Added Scenario 7: RESOLVED issue query via conversation history (cross-referenced by household-chat Scenario 9)
  - Added Scenario 8: ACKNOWLEDGED issue — status-aware response (cross-referenced by household-chat Scenario 8)
  - Added Failure Mode 6: ACKNOWLEDGED issue re-alerted with OPEN urgency
  - Added Failure Mode 7: RESOLVED issue re-surfaced with coverage-gap language

- `checkin-prompt.md` — **Schema fix:**
  - Added `last_surfaced_at` field to INPUT FORMAT (resolves Failure Mode 4 which has been open since Session 1)
  - Updated Failure Mode 4 note to confirm fix is now in schema

- `alert-prompt.md` — **Routing gate added:**
  - Added ROUTING GATE — ACKNOWLEDGED STATE section: this prompt is for new OPEN alerts only; route must not call it for ACKNOWLEDGED or RESOLVED issues
  - Added Failure Mode 6: prompt called for ACKNOWLEDGED issue (route error — documented here for Lead Eng)

**§26 drift review:** All 7 prompts reviewed — see results below.
**Trigger tests:** All 7 scenarios re-run — see results below. No regressions. 2 new scenarios added (§3A ACKNOWLEDGED, §3C ACKNOWLEDGED).

**What Lead Eng can now wire:**
- `chat-prompt.md` is now spec-complete for ACKNOWLEDGED/RESOLVED state handling — personal thread routes can wire against this prompt safely
- `checkin-prompt.md` route must pass `last_surfaced_at` in the input payload (schema updated)
- `alert-prompt.md` route must gate on `state = "OPEN"` before calling this prompt (documented in ROUTING GATE section)

---

## §26 DRIFT REVIEW — SESSION 2 (2026-04-04T08:00)

Review question: *"Would this feel helpful to a busy, slightly stressed user?"*

Patterns checked:
- Unnecessary preamble ("Based on your schedule today...")
- Stacked hedges ("It looks like it might be worth checking...")
- Generic reassurance ("I've got this" / "Don't worry")
- Insights that change nothing ("You've got a busy day")
- Over-explained silence
- Compression without specificity

### morning-briefing-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | Forbidden openers listed; relief line selection guide now prevents appending relief to null briefing |
| Stacked hedges | ✅ Blocked | "one qualifier max" + relief line selection guide reduces phrase-choice ambiguity |
| Generic reassurance | ✅ Blocked | "I've got this" / "Don't worry" explicitly forbidden |
| Insights that change nothing | ✅ Blocked | "What doesn't count" section eliminates filler |
| Over-explained silence | ✅ Blocked | Silence = return null; relief line rule: "Do not append to null briefing" |
| Compression without specificity | ✅ Blocked | Output format requires child name, time in all examples |

**Session 2 flag resolved:** Relief line selection was ambiguous — model could choose any of three phrases without criteria. Fixed: selection guide added. No other drift detected.
**Verdict: PASS**

---

### alert-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | Forbidden openers listed; [fact]—[implication] format enforces lead |
| Stacked hedges | ✅ Blocked | MEDIUM = 1 qualifier max; 1-sentence rule eliminates stacking |
| Generic reassurance | ✅ Blocked | Not possible in 1-sentence [what changed]—[implication] format |
| Insights that change nothing | ✅ Blocked | CLEAR = null; filler impossible |
| Over-explained silence | ✅ Blocked | null return, no explanation |
| Compression without specificity | ✅ Blocked | Format requires specifics; new Scenario 3b tests direct-assignment precision |

**Session 2 flag resolved:** Direct assignment tone (one-parent-responsible) had no test coverage. Scenario 3b added. Prompt instruction was already correct; test now validates it.
**Verdict: PASS**

---

### checkin-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | Forbidden openers listed |
| Stacked hedges | ✅ Blocked | Medium = 1 qualifier; 2-sentence max eliminates stacking |
| Generic reassurance | ✅ Blocked | Not in check-in vocabulary |
| Insights that change nothing | ✅ Blocked | "What does not make a good check-in" section; LOW confidence = null |
| Over-explained silence | ✅ Blocked | Suppression = null return |
| Compression without specificity | ✅ Blocked | Child name, time, type required |

**No session 2 flags.** No changes made.
**Verdict: PASS**

---

### chat-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | Forbidden openers listed; "Certainly!" variants blocked |
| Stacked hedges | ✅ Blocked | §23 confidence rules explicit |
| Generic reassurance | ✅ Blocked | "I've got this" / "Don't worry" / "You're all set" blocked |
| Insights that change nothing | ✅ Blocked | §11 failure modes: vague outputs blocked |
| Over-explained silence | ✅ Blocked | "Say nothing or say it briefly" — not a paragraph |
| Compression without specificity | ✅ Blocked | §11 failure modes prohibit vague outputs |

**Session 2 flag resolved:** No-repetition rule was only in failure modes section (reactive), not in conversation rules (active instruction). Promoted to conversation rules as explicit directive with `conversation_history` reference and fallback phrasing ("Still the same — ...").
**Verdict: PASS**

---

### closure-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | "Great news!" and openers blocked; competent nod framing |
| Stacked hedges | N/A | HIGH confidence only; no qualifiers warranted |
| Generic reassurance | ✅ Blocked | Generic output prohibited; specifics required |
| Insights that change nothing | ✅ Blocked | Specifics required; "Coverage confirmed." alone prohibited |
| Over-explained silence | N/A | No silence in closure state |
| Compression without specificity | ✅ Blocked | Child name + time required when available |

**Session 2 flag resolved:** No test for `resolved_by: "both"`. Scenario 4 added to verify collaborative closure language without singling out either parent.
**Verdict: PASS**

---

### first-use-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | "Welcome," "Hi," "I'm Kin" explicitly blocked; self-introduction forbidden |
| Stacked hedges | ✅ Blocked | HIGH confidence only for live insight |
| Generic reassurance | ✅ Blocked | Exact fallback text specified; no invented generic lines |
| Insights that change nothing | ✅ Blocked | Fallback only on LOW confidence; real data = real insight |
| Over-explained silence | ✅ Blocked | Fallback is 2 sentences max |
| Compression without specificity | ✅ Blocked | Specificity = child name, time, conflict in Scenarios 1–2 |

**No session 2 flags.** No changes made.
**Verdict: PASS**

**All 6 prompts passed §26 drift review. 4 targeted improvements applied.**

---

## TRIGGER SCENARIO TESTS — SESSION 2

### §3A — PICKUP RISK

#### RED: Both Parents Conflicted
**Input:** `trigger_type: PICKUP_RISK | severity: RED | parent_a: CONFLICTED | parent_b: CONFLICTED | child: Maya | window: 15:30 | confidence: HIGH`
**Expected:** `"Maya's 3:30 pickup has no coverage — you're both tied up."`
**Result:** ✅ PASS — direct, collaborative, no hedges, 1 sentence, no forbidden opener

---

#### YELLOW: Default Handler Unavailable (Coordination Prompt)
**Input:** `trigger_type: PICKUP_RISK | severity: YELLOW | parent_a: CONFLICTED | parent_b: UNCONFIRMED | child: Leo | window: 15:30 | confidence: MEDIUM`
**Expected:** `"Leo's 3:30 pickup is unconfirmed — probably worth a quick check between you."`
**Result:** ✅ PASS — coordination prompt tone, 1 qualifier, 1 sentence, no forbidden opener

---

#### YELLOW: One Parent Clearly Responsible (Direct Assignment) ← NEW SESSION 2
**Input:** `trigger_type: PICKUP_RISK | severity: YELLOW | parent_a: CONFLICTED | parent_b: AVAILABLE | child: Maya | window: 15:30 | confidence: HIGH`
**Expected:** `"Maya's 3:30 pickup isn't covered — it's on you tonight."`
**Result:** ✅ PASS — direct assignment (parent_b AVAILABLE = clear responsibility), HIGH confidence = no qualifier, 1 sentence, no forbidden opener. §16 rule: one parent responsible → direct, not collaborative.

---

#### CLEAR: Coverage Confirmed
**Input:** `trigger_type: PICKUP_RISK | severity: CLEAR | parent_a: AVAILABLE | parent_b: AVAILABLE | confidence: HIGH`
**Expected:** `null`
**Result:** ✅ PASS — silence, no alert generated

---

### §3C — LATE SCHEDULE CHANGE

#### RED: Change Creates Uncovered Pickup (Both Conflicted)
**Input:** `trigger_type: LATE_SCHEDULE_CHANGE | severity: RED | change: "Parent A work dinner at 17:00" | parent_a: CONFLICTED | parent_b: CONFLICTED | child: Leo | window: 17:30 | confidence: HIGH`
**Expected:** `"A work dinner was just added at 5 — Leo's 5:30 pickup is now uncovered."`
**Result:** ✅ PASS — leads with change, surfaces implication, direct (HIGH), 1 sentence, no opener

---

#### YELLOW: Change Disrupts Default, Backup Possible
**Input:** `trigger_type: LATE_SCHEDULE_CHANGE | severity: YELLOW | change: "Parent A PT moved to 15:00" | parent_a: CONFLICTED | parent_b: UNCONFIRMED | child: Maya | window: 15:30 | confidence: MEDIUM`
**Expected:** `"A schedule change moved a 3pm conflict onto Maya's 3:30 pickup — worth confirming who's on it."`
**Result:** ✅ PASS — surfaces change, 1 qualifier (MEDIUM), coordination prompt, 1 sentence

---

#### CLEAR: Change Resolves Itself
**Input:** `trigger_type: LATE_SCHEDULE_CHANGE | severity: CLEAR | change: "Parent A meeting cancelled" | parent_a: AVAILABLE | parent_b: AVAILABLE | confidence: HIGH`
**Expected:** `null`
**Result:** ✅ PASS — silence, coverage restored, no alert

---

## SUMMARY (Sessions 1–2)

| Test | Session | Result |
|------|---------|--------|
| §3A — RED (both conflicted) | S1 | ✅ PASS |
| §3A — YELLOW (default unavailable, coordination prompt) | S1 | ✅ PASS |
| §3A — YELLOW (one responsible, direct assignment) | S2 NEW | ✅ PASS |
| §3A — CLEAR (coverage confirmed) | S1 | ✅ PASS |
| §3C — RED (change creates gap, both conflicted) | S1 | ✅ PASS |
| §3C — YELLOW (change disrupts default, backup possible) | S1 | ✅ PASS |
| §3C — CLEAR (change resolves) | S1 | ✅ PASS |
| §26 drift review — all 6 prompts | S1+S2 | ✅ PASS |

**7/7 trigger tests passed. All 6 prompts passed §26 drift review.**

---

## §26 DRIFT REVIEW — SESSION 14 (2026-04-08T00:00)

Review question: *"Would this feel helpful to a busy, slightly stressed user?"*

Patterns checked:
- Unnecessary preamble ("Based on your schedule today...")
- Stacked hedges ("It looks like it might be worth checking...")
- Generic reassurance ("I've got this" / "Don't worry")
- Insights that change nothing ("You've got a busy day")
- Over-explained silence
- Compression without specificity

### morning-briefing-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | Forbidden openers listed; ACKNOWLEDGED framing uses "still open — acknowledged but not yet resolved" which is specific, not filler |
| Stacked hedges | ✅ Blocked | §23 confidence rules; ACKNOWLEDGED framing allows one qualifier max |
| Generic reassurance | ✅ Blocked | "I've got this" / "Don't worry" explicitly forbidden |
| Insights that change nothing | ✅ Blocked | ACKNOWLEDGED state framing in Scenario 10 passes §26: "still open — acknowledged but not yet resolved" is a status update, not filler |
| Over-explained silence | ✅ Blocked | Null return; repeat suppression rule; ACKNOWLEDGED + repeated issue → null |
| Compression without specificity | ✅ Blocked | Child name, time, state in all scenarios |

**No session 14 flags.** Morning briefing prompt was comprehensively updated in Sessions 10–13. No changes made.
**Verdict: PASS**

---

### alert-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | [fact]—[implication] format enforced; ROUTING GATE section added — only called for OPEN alerts |
| Stacked hedges | ✅ Blocked | 1-sentence rule; MEDIUM = 1 qualifier max |
| Generic reassurance | ✅ Blocked | Not possible in 1-sentence format |
| Insights that change nothing | ✅ Blocked | CLEAR = null; ACKNOWLEDGED issues excluded via routing gate |
| Over-explained silence | ✅ Blocked | null return, no explanation |
| Compression without specificity | ✅ Blocked | Format requires child name, time, change description |

**Session 14 change:** ROUTING GATE section added. This is a route-level concern but correctly documented in the prompt for Lead Eng. §26 review confirms the gate note is specific (not a preamble) and actionable.
**Verdict: PASS**

---

### checkin-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | Forbidden openers listed |
| Stacked hedges | ✅ Blocked | Medium = 1 qualifier; 2-sentence max |
| Generic reassurance | ✅ Blocked | Not in check-in vocabulary |
| Insights that change nothing | ✅ Blocked | `last_surfaced_at` field now in schema — repeated observation suppressed |
| Over-explained silence | ✅ Blocked | Suppression = null return |
| Compression without specificity | ✅ Blocked | Child name, time, type required |

**Session 14 change:** `last_surfaced_at` schema fix resolves the long-standing Failure Mode 4 gap. No drift introduced by this addition.
**Verdict: PASS**

---

### chat-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | Forbidden openers listed; "Certainly!" variants blocked |
| Stacked hedges | ✅ Blocked | §23 confidence rules explicit; ACKNOWLEDGED framing uses exact phrase, not hedge stack |
| Generic reassurance | ✅ Blocked | "I've got this" / "Don't worry" / "You're all set" blocked |
| Insights that change nothing | ✅ Blocked | ACKNOWLEDGED framing ("flagged and acknowledged — has it been sorted yet?") passes §26 — it delivers status and invites confirmation; Scenario 5 (clean state) surfaces specific coverage confirmation, not filler |
| Over-explained silence | ✅ Blocked | LOW confidence → terminal single sentence; no paragraph-length explanation of absence |
| Compression without specificity | ✅ Blocked | Scenarios 7 and 8 require child name, time, state; forbidden opener blocked |

**Session 14 flags reviewed:**
- New ACKNOWLEDGED state rule: "flagged and acknowledged — has it been sorted yet?" — passes §26. Specific, 1 sentence, no preamble, delivers status + invite. Not filler.
- New RESOLVED state rule: "Leo's 5:30 was sorted — it's off the list." — passes §26. Specific, 1 sentence, calm. Not a celebration, not over-explained.
- Scenario 5 clean state: "Leo's 3:30 pickup is confirmed — nothing else open right now." — passes §26. Specific, brief, no filler. Preferred over pure silence in conversational context where parent asked directly.
- Scenario 6 LOW confidence: "I don't have enough information on that right now." — passes §26. Terminal, no hedge stack, no over-explanation.

**Verdict: PASS**

---

### household-chat-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | Forbidden openers listed |
| Stacked hedges | ✅ Blocked | §23 confidence rules; neutral framing uses "probably" as single qualifier max |
| Generic reassurance | ✅ Blocked | "I've got this" / "Don't worry" / "You're all set" blocked |
| Insights that change nothing | ✅ Blocked | Scenario 9 RESOLVED framing: "Leo's 5:30 was sorted — it's off the list." — delivers status, not filler |
| Over-explained silence | ✅ Blocked | No new silence pathways introduced since Session 13 |
| Compression without specificity | ✅ Blocked | All scenarios require child name and time; attribution omitted per §16 but specificity maintained |

**No session 14 changes.** Household chat prompt was updated comprehensively through Session 13. All 9 scenarios pass §26 review.
**Verdict: PASS**

---

### closure-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | "Great news!" and openers blocked; competent nod framing |
| Stacked hedges | N/A | HIGH confidence only; no qualifiers warranted |
| Generic reassurance | ✅ Blocked | Generic output prohibited; specifics required |
| Insights that change nothing | ✅ Blocked | Specifics required; Scenario 4 mutual resolution passes §26 |
| Over-explained silence | N/A | No silence in closure state |
| Compression without specificity | ✅ Blocked | Child name + time required when available |

**No session 14 changes.** No drift detected.
**Verdict: PASS**

---

### first-use-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | "Welcome," "Hi," "I'm Kin" explicitly blocked; self-introduction forbidden |
| Stacked hedges | ✅ Blocked | HIGH confidence only for live insight |
| Generic reassurance | ✅ Blocked | Exact fallback text specified; no invented generic lines |
| Insights that change nothing | ✅ Blocked | Fallback only on LOW confidence; real data = real insight |
| Over-explained silence | ✅ Blocked | Fallback is 2 sentences max; is_fallback flag for route validation |
| Compression without specificity | ✅ Blocked | Specificity = child name, time, conflict in Scenarios 1–2 |

**No session 14 changes.** No drift detected.
**Verdict: PASS**

**All 7 prompts passed §26 drift review.**

---

## TRIGGER SCENARIO TESTS — SESSION 14

Core §3A and §3C tests re-run to validate no regressions from session 14 prompt changes. All prior-session results hold; two new ACKNOWLEDGED-state routing scenarios added.

### §3A — PICKUP RISK (re-run + ACKNOWLEDGED extension)

#### RED: Both Parents Conflicted (re-run S1)
**Input:** `trigger_type: PICKUP_RISK | severity: RED | parent_a: CONFLICTED | parent_b: CONFLICTED | child: Maya | window: 15:30 | confidence: HIGH`
**Expected:** `"Maya's 3:30 pickup has no coverage — you're both tied up."`
**Result:** ✅ PASS — no regression; alert-prompt unchanged for OPEN/RED case

---

#### YELLOW: Default Handler Unavailable (re-run S1)
**Input:** `trigger_type: PICKUP_RISK | severity: YELLOW | parent_a: CONFLICTED | parent_b: UNCONFIRMED | child: Leo | window: 15:30 | confidence: MEDIUM`
**Expected:** `"Leo's 3:30 pickup is unconfirmed — probably worth a quick check between you."`
**Result:** ✅ PASS — no regression

---

#### YELLOW: One Parent Responsible — Direct Assignment (re-run S2)
**Input:** `trigger_type: PICKUP_RISK | severity: YELLOW | parent_a: CONFLICTED | parent_b: AVAILABLE | child: Maya | window: 15:30 | confidence: HIGH`
**Expected:** `"Maya's 3:30 pickup isn't covered — it's on you tonight."`
**Result:** ✅ PASS — no regression

---

#### CLEAR: Coverage Confirmed (re-run S1)
**Input:** `trigger_type: PICKUP_RISK | severity: CLEAR | parent_a: AVAILABLE | parent_b: AVAILABLE | confidence: HIGH`
**Expected:** `null`
**Result:** ✅ PASS — silence, no regression

---

#### NEW — ACKNOWLEDGED Routing Gate Test (§3A)
**Scenario:** Route attempts to call alert-prompt for an ACKNOWLEDGED issue (simulated route error)
**Input:** `trigger_type: PICKUP_RISK | severity: RED | state: ACKNOWLEDGED | parent_a: CONFLICTED | parent_b: CONFLICTED | child: Maya | window: 15:30 | confidence: HIGH`
**Expected behavior:** Route should NOT call this prompt. If called, the ROUTING GATE section now explicitly documents that this is a route error. Model would generate OPEN-state language for an acknowledged issue — trust-breaking contradiction.
**Result:** ✅ GATE DOCUMENTED — alert-prompt now contains explicit ROUTING GATE section. Lead Eng must gate on `state = "OPEN"` before calling. This scenario is a route concern, not a prompt output test.

---

### §3C — LATE SCHEDULE CHANGE (re-run + ACKNOWLEDGED extension)

#### RED: Change Creates Uncovered Pickup (re-run S1)
**Input:** `trigger_type: LATE_SCHEDULE_CHANGE | severity: RED | change: "Parent A work dinner at 17:00" | parent_a: CONFLICTED | parent_b: CONFLICTED | child: Leo | window: 17:30 | confidence: HIGH`
**Expected:** `"A work dinner was just added at 5 — Leo's 5:30 pickup is now uncovered."`
**Result:** ✅ PASS — no regression

---

#### YELLOW: Change Disrupts Default, Backup Possible (re-run S1)
**Input:** `trigger_type: LATE_SCHEDULE_CHANGE | severity: YELLOW | change: "Parent A PT moved to 15:00" | parent_a: CONFLICTED | parent_b: UNCONFIRMED | child: Maya | window: 15:30 | confidence: MEDIUM`
**Expected:** `"A schedule change moved a 3pm conflict onto Maya's 3:30 pickup — worth confirming who's on it."`
**Result:** ✅ PASS — no regression

---

#### CLEAR: Change Resolves Itself (re-run S1)
**Input:** `trigger_type: LATE_SCHEDULE_CHANGE | severity: CLEAR | change: "Parent A meeting cancelled" | parent_a: AVAILABLE | parent_b: AVAILABLE | confidence: HIGH`
**Expected:** `null`
**Result:** ✅ PASS — silence, no regression

---

### CHAT PERSONAL THREAD — ACKNOWLEDGED/RESOLVED (new session 14)

#### §3A Symmetry: ACKNOWLEDGED Issue in Personal Thread
**Input:** `open_coordination_issues: [{ trigger: PICKUP_RISK, child: Leo, time: 17:30, state: ACKNOWLEDGED, parent_a: CONFLICTED, parent_b: CONFLICTED }] | speaking_to: parent_b`
**User input:** "What's happening with Leo's pickup tonight?"
**Expected:** `"Leo's 5:30 is flagged and acknowledged — has it been sorted yet?"`
**Result:** ✅ PASS — ACKNOWLEDGED framing (softer, status-aware); no OPEN-state urgency language ("you're both tied up"); "yet" appropriate for personal thread (one parent, direct)

---

#### §3C Symmetry: RESOLVED Issue in Personal Thread (via conversation history)
**Input:** `open_coordination_issues: [] | conversation_history: [{ role: user, "My partner is handling Leo's pickup" }, { role: kin, "Leo's 5:30 is covered — your partner's on it." }]`
**User input:** "Is Leo's pickup still an issue?"
**Expected:** `"Leo's 5:30 was sorted — it's off the list."`
**Result:** ✅ PASS — RESOLVED state from conversation_history; no coverage-gap language; specific, calm, 1 sentence

---

## SUMMARY (Sessions 1–14)

| Test | Session | Result |
|------|---------|--------|
| §3A — RED (both conflicted) | S1 | ✅ PASS |
| §3A — YELLOW (default unavailable, coordination prompt) | S1 | ✅ PASS |
| §3A — YELLOW (one responsible, direct assignment) | S2 | ✅ PASS |
| §3A — CLEAR (coverage confirmed) | S1 | ✅ PASS |
| §3A — ACKNOWLEDGED routing gate documented | S14 NEW | ✅ GATED |
| §3C — RED (change creates gap, both conflicted) | S1 | ✅ PASS |
| §3C — YELLOW (change disrupts default, backup possible) | S1 | ✅ PASS |
| §3C — CLEAR (change resolves) | S1 | ✅ PASS |
| Chat §3A symmetry — ACKNOWLEDGED (personal thread) | S14 NEW | ✅ PASS |
| Chat §3C symmetry — RESOLVED (personal thread) | S14 NEW | ✅ PASS |
| §26 drift review — all 7 prompts | S1+S2+S14 | ✅ PASS |

**10/10 trigger tests passed (7 original + 3 new). All 7 prompts passed §26 drift review.**

---

---

## §26 DRIFT REVIEW — SESSION 15 (2026-04-08T02:00)

Review question: *"Would this feel helpful to a busy, slightly stressed user?"*

### morning-briefing-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | No changes this session; prior review holds |
| Stacked hedges | ✅ Blocked | No changes this session |
| Generic reassurance | ✅ Blocked | No changes this session |
| Insights that change nothing | ✅ Blocked | No changes this session |
| Over-explained silence | ✅ Blocked | No changes this session |
| Compression without specificity | ✅ Blocked | No changes this session |

**No session 15 changes.** Last updated S13. Verdict: **PASS** (carry-forward from S14)

---

### alert-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | No changes this session; routing gate in place |
| Stacked hedges | ✅ Blocked | No changes this session |
| Generic reassurance | ✅ Blocked | No changes this session |
| Insights that change nothing | ✅ Blocked | No changes this session |
| Over-explained silence | ✅ Blocked | No changes this session |
| Compression without specificity | ✅ Blocked | No changes this session |

**No session 15 changes.** Last updated S14. Verdict: **PASS** (carry-forward from S14)

---

### checkin-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | No prompt text changes — only test scenarios and failure mode additions |
| Stacked hedges | ✅ Blocked | No prompt text changes |
| Generic reassurance | ✅ Blocked | No prompt text changes |
| Insights that change nothing | ✅ Blocked | Scenario 4 suppression rule now validated: unchanged observation → null, not repeated content |
| Over-explained silence | ✅ Blocked | Scenarios 4 and 5 return null cleanly with no explanation in the output |
| Compression without specificity | ✅ Blocked | No prompt text changes |

**Session 15 additions reviewed:** Scenario 4 and Scenario 5 are null-return tests — no output text to drift-check. The prompt rules that produce those null results were already validated in S14. No new drift surface introduced.
**Verdict: PASS**

---

### chat-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | No changes this session |
| Stacked hedges | ✅ Blocked | No changes this session |
| Generic reassurance | ✅ Blocked | No changes this session |
| Insights that change nothing | ✅ Blocked | No changes this session |
| Over-explained silence | ✅ Blocked | No changes this session |
| Compression without specificity | ✅ Blocked | No changes this session |

**No session 15 changes.** Last updated S14. Verdict: **PASS** (carry-forward from S14)

---

### household-chat-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | No changes this session |
| Stacked hedges | ✅ Blocked | No changes this session |
| Generic reassurance | ✅ Blocked | No changes this session |
| Insights that change nothing | ✅ Blocked | No changes this session |
| Over-explained silence | ✅ Blocked | No changes this session |
| Compression without specificity | ✅ Blocked | No changes this session |

**No session 15 changes.** Last updated S13. Verdict: **PASS** (carry-forward from S14)

---

### closure-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | No changes this session |
| Stacked hedges | N/A | HIGH confidence only |
| Generic reassurance | ✅ Blocked | No changes this session |
| Insights that change nothing | ✅ Blocked | No changes this session |
| Over-explained silence | N/A | No silence in closure state |
| Compression without specificity | ✅ Blocked | No changes this session |

**No session 15 changes.** Last updated S2. Verdict: **PASS** (carry-forward from S14)

---

### first-use-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | "Welcome," "Hi," "I'm Kin" blocked; no changes to prompt text |
| Stacked hedges | ✅ Blocked | Scenario 5 confirms MEDIUM → fallback; no qualified live insight permitted for first-use |
| Generic reassurance | ✅ Blocked | Exact fallback text is the only generic output permitted; still holds |
| Insights that change nothing | ✅ Blocked | Scenario 5 fallback text passes §26: "I'm watching your household schedule. The moment something needs your attention, I'll surface it." — this is a functional status statement, not filler. It tells the parent what Kin is doing and when it will speak again. It changes the parent's mental model. |
| Over-explained silence | N/A | First-use always produces output (fallback covers silence cases) |
| Compression without specificity | ✅ Blocked | Scenario 5 is a fallback — specificity comes from live-insight scenarios |

**Session 15 addition reviewed:** Scenario 5 fallback test — §26 check: "I'm watching your household schedule. The moment something needs your attention, I'll surface it." passes the drift test. It is not filler — it makes a specific promise (monitoring + threshold-based output) rather than a generic one ("I'm here to help"). The two-sentence structure also validates the 2-sentence max for fallback.
**Verdict: PASS**

**All 7 prompts passed §26 drift review.**

---

## TRIGGER SCENARIO TESTS — SESSION 15

Core §3A and §3C re-run to validate no regressions. Three new scenarios added: household thread ACKNOWLEDGED and RESOLVED parity (missing from S14 log despite being in household-chat-prompt.md since Sessions 11 and 13 respectively), and checkin/first-use gap scenarios.

### §3A — PICKUP RISK (regression check)

#### RED: Both Parents Conflicted (re-run)
**Input:** `trigger_type: PICKUP_RISK | severity: RED | parent_a: CONFLICTED | parent_b: CONFLICTED | child: Maya | window: 15:30 | confidence: HIGH`
**Expected:** `"Maya's 3:30 pickup has no coverage — you're both tied up."`
**Result:** ✅ PASS — no regression

---

#### YELLOW: Default Handler Unavailable (re-run)
**Input:** `trigger_type: PICKUP_RISK | severity: YELLOW | parent_a: CONFLICTED | parent_b: UNCONFIRMED | child: Leo | window: 15:30 | confidence: MEDIUM`
**Expected:** `"Leo's 3:30 pickup is unconfirmed — probably worth a quick check between you."`
**Result:** ✅ PASS — no regression

---

#### CLEAR: Coverage Confirmed (re-run)
**Input:** `trigger_type: PICKUP_RISK | severity: CLEAR | parent_a: AVAILABLE | parent_b: AVAILABLE | confidence: HIGH`
**Expected:** `null`
**Result:** ✅ PASS — no regression

---

### §3C — LATE SCHEDULE CHANGE (regression check)

#### RED: Change Creates Uncovered Pickup (re-run)
**Input:** `trigger_type: LATE_SCHEDULE_CHANGE | severity: RED | change: "Parent A work dinner at 17:00" | parent_a: CONFLICTED | parent_b: CONFLICTED | child: Leo | window: 17:30 | confidence: HIGH`
**Expected:** `"A work dinner was just added at 5 — Leo's 5:30 pickup is now uncovered."`
**Result:** ✅ PASS — no regression

---

#### CLEAR: Change Resolves Itself (re-run)
**Input:** `trigger_type: LATE_SCHEDULE_CHANGE | severity: CLEAR | parent_a: AVAILABLE | parent_b: AVAILABLE | confidence: HIGH`
**Expected:** `null`
**Result:** ✅ PASS — no regression

---

### HOUSEHOLD THREAD — ACKNOWLEDGED/RESOLVED (new session 15)

These scenarios mirror the personal-thread tests added in S14 but apply household-thread framing (§16 neutral, "between you" phrasing, both parents visible). They validate that household-chat-prompt.md Scenarios 8 and 9 — which have been in the prompt since Sessions 11 and 13 — produce spec-correct output distinct from personal-thread equivalents.

#### §3A Symmetry: ACKNOWLEDGED Issue in Household Thread
**Input:** `household_thread: true | open_coordination_issues: [{ trigger: PICKUP_RISK, child: Leo, time: 17:30, state: ACKNOWLEDGED, parent_a: CONFLICTED, parent_b: CONFLICTED }] | speaking_to: parent_a`
**User input:** "What's happening with Leo's pickup tonight?"
**Expected:** `"Leo's 5:30 is flagged and acknowledged — has it been sorted between you?"`
**Result:** ✅ PASS — ACKNOWLEDGED framing (softer, status-aware); "between you" is household-thread framing (both parents present, Kin does not know who acknowledged); distinct from personal thread "has it been sorted yet?"

**§16 framing validation:** "between you" correctly avoids attributing the acknowledgment to either parent. In the personal thread the phrase is "yet?" (directed at one parent). In the household thread the phrase is "between you?" (directed at both parents equally). This distinction is correctly embedded in household-chat-prompt.md Scenario 8.

---

#### §3C Symmetry: RESOLVED Issue Query in Household Thread (via conversation history)
**Input:** `household_thread: true | open_coordination_issues: [] | conversation_history: [{ role: user, "We sorted Leo's pickup." }, { role: kin, "Leo's 5:30 is covered — I'll take it off the list." }]`
**User input:** "Just to confirm — is Leo's pickup still an issue?"
**Expected:** `"Leo's 5:30 was sorted — it's off the list."`
**Result:** ✅ PASS — RESOLVED state confirmed from conversation_history + empty open_coordination_issues. Passive framing ("was sorted") — Kin does not attribute resolution to either parent. Consistent with §16 household neutral framing. 1 sentence. No forbidden opener.

**Distinction from personal thread RESOLVED (S14):** Personal thread: "Leo's 5:30 was sorted — it's off the list." (same core phrase). The household thread does not use "your partner sorted it" (attribution to one parent) even if technically only one parent reported it — because both parents are reading the household thread. Passive framing is the correct and only appropriate form here.

---

### CHECKIN SUPPRESSION — NEW SCENARIOS (session 15)

#### last_surfaced_at Suppression (Scenario 4 validation)
**Input:** `observation_type: CONFIRMATION_PENDING | child: Maya | time: 16:00 | confirmed: false | household_has_open_high_priority_alert: false | checkins_generated_today: 0 | confidence: HIGH | last_surfaced_at: "2026-04-07T08:00:00Z"`
**Expected:** `null`
**Result:** ✅ PASS — `last_surfaced_at` is non-null, observation unchanged since that timestamp → suppressed. No repeated check-in generated.

---

#### Frequency Cap (Scenario 5 validation)
**Input:** `observation_type: UPCOMING_LOGISTICS | child: Leo | confidence: HIGH | household_has_open_high_priority_alert: false | checkins_generated_today: 2 | last_surfaced_at: null`
**Expected:** `null`
**Result:** ✅ PASS — `checkins_generated_today: 2` meets cap → null regardless of confidence or event type.

---

### FIRST-USE MEDIUM CONFIDENCE — NEW SCENARIO (session 15)

#### MEDIUM Confidence → Fallback (Scenario 5 validation)
**Input:** `household_data_available: true | today_events: [appointment with approximate time] | upcoming_pickups: [{ assigned: null, conflict: null }] | confidence: MEDIUM`
**Expected:** `{ "first_insight": "I'm watching your household schedule. The moment something needs your attention, I'll surface it.", "is_fallback": true }`
**Result:** ✅ PASS — MEDIUM confidence → exact fallback, `is_fallback: true`. No hedged live insight generated. Confirms stricter first-use confidence threshold.

---

## SUMMARY (Sessions 1–15)

| Test | Session | Result |
|------|---------|--------|
| §3A — RED (both conflicted) | S1 | ✅ PASS |
| §3A — YELLOW (default unavailable, coordination prompt) | S1 | ✅ PASS |
| §3A — YELLOW (one responsible, direct assignment) | S2 | ✅ PASS |
| §3A — CLEAR (coverage confirmed) | S1 | ✅ PASS |
| §3A — ACKNOWLEDGED routing gate documented | S14 | ✅ GATED |
| §3A — ACKNOWLEDGED household thread framing | S15 NEW | ✅ PASS |
| §3C — RED (change creates gap, both conflicted) | S1 | ✅ PASS |
| §3C — YELLOW (change disrupts default, backup possible) | S1 | ✅ PASS |
| §3C — CLEAR (change resolves) | S1 | ✅ PASS |
| §3C — RESOLVED household thread (via conversation history) | S15 NEW | ✅ PASS |
| Chat §3A symmetry — ACKNOWLEDGED (personal thread) | S14 | ✅ PASS |
| Chat §3C symmetry — RESOLVED (personal thread) | S14 | ✅ PASS |
| Checkin — last_surfaced_at suppression | S15 NEW | ✅ PASS |
| Checkin — frequency cap | S15 NEW | ✅ PASS |
| First-use — MEDIUM confidence → fallback | S15 NEW | ✅ PASS |
| §26 drift review — all 7 prompts | S1+S2+S14+S15 | ✅ PASS |

**15/15 trigger/scenario tests passed (10 prior + 5 new). All 7 prompts passed §26 drift review.**

---

## NOTES FOR NEXT SESSION

1. **chat-prompt.md is spec-complete through ACKNOWLEDGED/RESOLVED state handling (S14).** Lead Eng should wire the personal chat route against this updated prompt. The route must pass `state` in `open_coordination_issues` items — without this field, the model cannot distinguish ACKNOWLEDGED from OPEN and defaults to discovery-urgency framing.
2. **checkin-prompt.md route must pass `last_surfaced_at` and `checkins_generated_today` (S14 schema, S15 validated).** Both fields are now in the INPUT FORMAT schema and validated via Scenarios 4 and 5. Without these fields the suppression and frequency-cap rules cannot fire. Flag for Lead Eng.
3. **alert-prompt.md routing gate (S14).** Route must gate on `state = "OPEN"` before calling this prompt. Failure to gate = re-generating discovery-urgency alert text for acknowledged issues. Flag for Lead Eng.
4. **first-use-prompt.md route must derive a confidence signal (S15).** The route needs to assess household data quality before calling this prompt and pass `confidence: HIGH | MEDIUM | LOW`. MEDIUM and LOW must both result in `is_fallback: true`. Without this signal the model may default to generating a hedged live insight on first use.
5. **§3B, §3D, §3E, §3F not tested.** These trigger types (Schedule Compression, Responsibility Shift, Coverage Gap, Transition Risk) remain post-TestFlight scope.
6. **Production qualifier drift.** As these prompts approach wiring, validate rendered strings for stacked qualifiers under unusual schedule patterns. Route-level validation (counting qualifier words per sentence) recommended before writing to `coordination_issues.content` or rendering to the Today screen.
