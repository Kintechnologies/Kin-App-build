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

## SUMMARY

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

## NOTES FOR NEXT SESSION

1. **Post-Lead-Eng wiring:** When Lead Eng wires alert-prompt.md to the coordination_issues route, run these same scenarios against live rendered output — not just the prompt spec. Pay special attention to the YELLOW/direct-assignment case (Scenario 3b): production models sometimes slip to coordination-prompt tone even when one parent is clearly AVAILABLE.
2. **Qualifier drift watch:** Most likely failure in production is stacked qualifiers under unusual schedule patterns. Recommend route-level validation counting qualifier words per sentence before writing to `coordination_issues.content`. Flag for Lead Eng when wiring S2-LE-06.
3. **Relief line selection in production:** New selection guide in morning-briefing-prompt.md reduces ambiguity but should be validated against rendered output once `/api/morning-briefing` is wired. Watch for "I'll keep an eye on it" being used when "I'll flag it if anything changes" is more appropriate (standby vs. active watch distinction).
4. **§3B, §3D, §3E, §3F not tested:** These trigger types (Schedule Compression, Responsibility Shift, Coverage Gap, Transition Risk) are post-TestFlight scope.
