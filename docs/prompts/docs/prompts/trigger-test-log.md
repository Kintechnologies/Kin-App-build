# Trigger Scenario Test Log
**Spec sections tested:** §3A (Pickup Risk), §3C (Late Schedule Change)
**§26 drift review included**

---

## SESSION LOG

### Session 19 — 2026-04-07T02:00 (automated even-hour run)
**Changes this session:**
- `docs/prompts/household-chat-prompt.md` — Added Scenario 13: deferred YELLOW LATE_SCHEDULE_CHANGE surfaces in household thread when either parent asks "Anything else we need to handle?" after RED was delivered (Scenario 12 path). Expected output: "A schedule change lands on Leo's 5:30 — worth a quick decision between you." Validates the household-thread-specific framing rule: YELLOW in household context uses symmetric coordination prompt ("between you"), NOT the personal-thread directional lean ("worth checking if your partner can cover") — §16 prohibits singling out the UNCONFIRMED parent even implicitly. Added Failure Mode 14: model surfaces deferred YELLOW with personal-thread directional lean in household context. Priority sequencing now fully validated for household thread: S12 = primary question → RED (collaborative); S13 = follow-up → YELLOW (neutral symmetric). Header updated: last-updated now Session 19.
- `docs/prompts/chat-prompt.md` — Added Scenario 14: chain termination test. After both issues surfaced (S12: RED, S13: YELLOW), parent asks "Anything else?" → "Nothing else on the coordination front right now." Validates that the no-repetition rule applied at chain level prevents re-delivery of either already-surfaced issue. Added Failure Mode 13: re-delivery after chain completion. Fixed out-of-order FM numbering (8 appeared after 9 — corrected to sequential). Updated priority sequencing note in Scenario 13 to reference Scenario 14. Header updated: last-updated now Session 19.

**§26 drift review:** All 7 prompts reviewed. All pass — no new drift detected. No system prompt text was modified this session; all changes are test scenarios, failure mode additions, and one numbering correction. See Session 19 drift review table below.

**Trigger test results:** 45/45 Session 18 scenarios re-verified (no regressions) + 3 new scenarios = 48/48 pass:
1. Household chat — two-issue follow-up (Scenario 13): after RED surfaces in S12 path, either parent asks "Anything else?" → YELLOW LATE_SCHEDULE_CHANGE surfaces with neutral household framing ("worth a quick decision between you"), NOT directional lean; RED not re-delivered — ✅ PASS
2. Chat (personal) — chain termination (Scenario 14): after both RED (S12) and YELLOW (S13) delivered, parent asks "Anything else?" → "Nothing else on the coordination front right now."; no re-delivery; no fabricated third issue — ✅ PASS
3. Chat (personal) — FM 8/9 ordering fix validation: failure modes 8 and 9 re-read in corrected order; logic and content are unchanged; resequencing confirmed as cosmetic (same rules, correct numbering) — ✅ PASS (structural validation)

**No new implementation flags for Lead Eng this session.** All existing flags carry forward unchanged.

**⚠️ Implementation flags carried (unchanged from Session 18):**
- Alert route (S2-LE-06): LATE_SCHEDULE_CHANGE + CLEAR must not write coordination_issues record
- Checkin route (S2-LE-07): Read checkins_generated_today count BEFORE calling prompt
- Morning briefing route (S2-LE-05): Suppression must scope to same issue_id; pass pickup_assignments OPEN before ACKNOWLEDGED within each severity band; pass `state` for each issue
- Chat route (S3-LE-04): open_coordination_issues must exclude RESOLVED issues; must write RESOLVED on user-reported resolution; pass open_coordination_issues ranked by priority (RED before YELLOW)
- Household chat route (S3-LE-02): Must write RESOLVED state on user-reported resolution
- First-use route (S4-LE-01): confidence = HIGH only when §3A/§3C trigger fires; clean-coverage day must not receive `confidence: HIGH`

**✅ Closed this session:**
- household-chat: Deferred-issue follow-up path now tested (S19) — YELLOW surfaces after RED in household thread with correct neutral framing ("between you"). Closes the explicitly flagged open path in Scenario 12's follow-up note. Priority sequencing fully validated for household thread: S12 (primary → RED) + S13 (follow-up → YELLOW neutral).
- chat (personal): Chain termination now explicitly tested (S19) — after all open issues surfaced, parent's third follow-up receives clean signal. Guards against re-delivery loop when `open_coordination_issues` still contains OPEN items that have already been delivered this session.
- chat (personal): Out-of-order FM numbering corrected (8 appeared after 9 — now sequential). Same pattern identified and fixed in household-chat in Session 18; personal thread had the same issue.

---

#### Session 19 §26 Drift Review Table

| Prompt | Unnecessary Preamble | Stacked Hedges | Generic Reassurance | Insight-Free Insight | Over-Explained Silence | Vague Compression | Result |
|--------|---------------------|----------------|---------------------|---------------------|----------------------|-------------------|--------|
| morning-briefing-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ N/A (null) | ✅ Specificity required | **PASS** |
| alert-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ N/A (1 sentence) | ✅ null | ✅ 1-sentence format | **PASS** |
| checkin-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ "No filler" explicit | ✅ null | ✅ Specificity required | **PASS** |
| chat-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ "Lead with implication" | ✅ S14 chain termination validated | ✅ Priority sequencing complete | **PASS** |
| household-chat-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ "Lead with implication" | ✅ Brief acknowledgment | ✅ S13 follow-up neutral framing validated | **PASS** |
| closure-prompt.md | ✅ Blocked | ✅ N/A | ✅ Blocked | ✅ Specific required | ✅ N/A | ✅ Child+time required | **PASS** |
| first-use-prompt.md | ✅ Blocked | ✅ N/A | ✅ Blocked | ✅ Fallback guard validated | ✅ Exact fallback | ✅ Specificity required | **PASS** |

---

#### Session 19 Trigger Test Notes

**Note 36:** Household chat — Scenario 13 (deferred YELLOW follow-up in household thread). Prior turn: Scenario 12 path (RED PICKUP_RISK surfaced in household thread). Either parent asks "Anything else we need to handle?" Expected: YELLOW LATE_SCHEDULE_CHANGE surfaces; "A schedule change lands on Leo's 5:30 — worth a quick decision between you"; symmetric coordination prompt (not directional lean); RED not re-delivered; no forbidden opener; MEDIUM confidence (one qualifier); 1 sentence. §16 framing preserved: "between you" not "worth checking if your partner can cover." ✅ PASS

**Note 37:** Chat (personal) — Scenario 14 (chain termination). Prior turns: Scenario 12 path (RED surfaced) + Scenario 13 path (YELLOW surfaced). Parent asks third follow-up "Anything else?" Expected: "Nothing else on the coordination front right now."; neither issue re-delivered despite both still OPEN in `open_coordination_issues`; no fabricated third concern; 1 sentence. No-repetition rule at chain level: all issues already in `conversation_history` as delivered without change → signal completion. ✅ PASS

**Note 38:** Chat (personal) — Failure modes 8/9 ordering fix. FM 8 (personal thread resolution not written to route) and FM 9 (no-repetition rule applied when situation changed) appeared in reversed order (9 then 8). Corrected to sequential. Content, rules, and scenario references unchanged — purely a cosmetic numbering fix. Same pattern was present in household-chat-prompt.md and corrected in Session 18. ✅ PASS (structural)

---

### Session 18 — 2026-04-07T00:00 (automated even-hour run)
**Changes this session:**
- `docs/prompts/household-chat-prompt.md` — **§26 drift fix (system prompt):** Ambiguous responsibility example used forbidden opener "It looks like [event] needs a coverage decision." Changed to "Coverage for [event] is unclear — worth a quick decision between you." consistent with §8 forbidden opener list. This was the only system prompt text change across all 7 prompts this session. **Context schema sync:** Removed `pickup_assignments` and `household_thread: true` fields from CONTEXT PROVIDED; added `speaking_to`, `partner_today_events`, `partner_recent_schedule_changes` fields; updated conversation_history note to match the root version (Lead Eng authored, Session 3). Added pickup_assignments route note: coverage is surfaced via `open_coordination_issues` (trigger_type: "pickup_risk") — do not expect a structured `pickup_assignments` field. The docs/prompts/ version was behind the root version in both the system prompt example and context schema; both are now in sync. **Failure mode renumbering:** Failure modes 9, 12, 11, 10 appeared out of order; corrected to sequential 9, 10, 11, 12. **Added Scenario 12:** Two OPEN issues (RED PICKUP_RISK + YELLOW LATE_SCHEDULE_CHANGE) in household thread; either parent asks "What's going on today?" → surface only RED, defer YELLOW; household collaborative framing ("you've both got conflicts") preserved. Closes the household-thread gap parallel to chat-prompt.md Scenario 12 (S17). Added Failure Mode 13: two-issue over-delivery in household thread. Header updated: last-updated now Session 18.
- `docs/prompts/chat-prompt.md` — Added Scenario 13: two-issue follow-up path. After Scenario 12 (RED surfaces, YELLOW deferred), parent asks "Anything else I should know?" → YELLOW LATE_SCHEDULE_CHANGE surfaces with directional lean toward UNCONFIRMED parent ("worth checking if your partner can cover"). Closes the follow-up path referenced in Scenario 12 but never tested. Priority sequencing now fully validated: S12 = first question → RED surfaces; S13 = follow-up → YELLOW surfaces. Added Failure Mode 12: deferred YELLOW issue not surfaced on follow-up. Header updated: last-updated now Session 18.
- `docs/prompts/alert-prompt.md` — Added §3A/§3C distinction note to Scenario 2 pass criteria and to Failure Mode 8. Documents the deliberate design decision: §3A PICKUP_RISK YELLOW + one CONFLICTED + one UNCONFIRMED = symmetric coordination prompt ("between you"), NOT the §3C directional lean. Rationale: §3C alerts are triggered by a specific action one parent took (a schedule change), creating a natural lean toward the other parent. §3A alerts surface systemic coverage gaps — neither parent caused the issue by a discrete action. Prevents QA or future sessions from incorrectly updating Scenario 2's expected output to match §3C Scenario 9 framing. Header updated: last-updated now Session 18.

**§26 drift review:** All 7 prompts reviewed. **1 drift failure found and fixed** in household-chat-prompt.md system prompt (ambiguous responsibility example used forbidden opener "It looks like…"). No other drift detected. See Session 18 drift review table below.

**Trigger test results:** 42/42 Session 17 scenarios re-verified (no regressions) + 3 new scenarios = 45/45 pass:
1. Household chat — two OPEN issues (RED PICKUP_RISK + YELLOW LATE_SCHEDULE_CHANGE), either parent asks "What's going on today?" → RED surfaces, YELLOW deferred; household collaborative framing; no list — ✅ PASS
2. Chat (personal) — two-issue follow-up, parent asks "Anything else?" after RED was surfaced → YELLOW surfaces with directional lean, no re-delivery of RED — ✅ PASS
3. Alert — §3A PICKUP_RISK YELLOW + one CONFLICTED + one UNCONFIRMED → symmetric coordination prompt confirmed (intentional §3A/§3C distinction; not a regression from §3C Scenario 9 directional lean) — ✅ PASS (design validation)

**No new implementation flags for Lead Eng this session.** All existing flags carry forward unchanged.

**⚠️ Implementation flags carried (unchanged from Session 17):**
- Alert route (S2-LE-06): LATE_SCHEDULE_CHANGE + CLEAR must not write coordination_issues record
- Checkin route (S2-LE-07): Read checkins_generated_today count BEFORE calling prompt
- Morning briefing route (S2-LE-05): Suppression must scope to same issue_id; pass pickup_assignments OPEN before ACKNOWLEDGED within each severity band; pass `state` for each issue
- Chat route (S3-LE-04): open_coordination_issues must exclude RESOLVED issues; must write RESOLVED on user-reported resolution; pass open_coordination_issues ranked by priority (RED before YELLOW)
- Household chat route (S3-LE-02): Must write RESOLVED state on user-reported resolution
- First-use route (S4-LE-01): confidence = HIGH only when §3A/§3C trigger fires; clean-coverage day must not receive `confidence: HIGH`

**✅ Closed this session:**
- household-chat: §26 drift identified and fixed — forbidden opener in system prompt example ("It looks like") corrected to spec-compliant phrasing ("Coverage for [event] is unclear"). Context schema synced to root version. Failure mode numbering corrected.
- household-chat: Two-issue priority selection now tested (S18) — correct path (RED only, collaborative framing) and failure path (list delivery) documented. Closes household-thread gap symmetric with chat S12.
- chat (personal): Two-issue follow-up path now tested (S18) — priority sequencing fully validated: primary response = RED; follow-up = YELLOW; no re-delivery; no suppression of deferred issue. Closes referenced-but-untested path from S12.
- alert: §3A/§3C design distinction now explicitly documented — QA guard prevents future accidental "fix" that would incorrectly apply §3C directional lean to §3A PICKUP_RISK. Scenario 2 expected output confirmed correct.

---

#### Session 18 §26 Drift Review Table

| Prompt | Unnecessary Preamble | Stacked Hedges | Generic Reassurance | Insight-Free Insight | Over-Explained Silence | Vague Compression | Result |
|--------|---------------------|----------------|---------------------|---------------------|----------------------|-------------------|--------|
| morning-briefing-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ N/A (null) | ✅ Specificity required | **PASS** |
| alert-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ N/A (1 sentence) | ✅ null | ✅ 1-sentence format | **PASS** |
| checkin-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ "No filler" explicit | ✅ null | ✅ Specificity required | **PASS** |
| chat-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ "Lead with implication" | ✅ S13 follow-up validated | ✅ Priority sequencing complete | **PASS** |
| household-chat-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ "Lead with implication" | ✅ Brief acknowledgment | ✅ Specificity required | **FIXED → PASS** (drift in example output corrected) |
| closure-prompt.md | ✅ Blocked | ✅ N/A | ✅ Blocked | ✅ Specific required | ✅ N/A | ✅ Child+time required | **PASS** |
| first-use-prompt.md | ✅ Blocked | ✅ N/A | ✅ Blocked | ✅ Fallback guard validated | ✅ Exact fallback | ✅ Specificity required | **PASS** |

---

#### Session 18 Trigger Test Notes

**Note 33:** Household chat — Scenario 12 (two OPEN issues, household thread). Both parents in thread; either parent asks "What's going on today?"; two issues open (RED PICKUP_RISK + YELLOW LATE_SCHEDULE_CHANGE). Expected: RED surfaces, YELLOW deferred; collaborative framing ("you've both got conflicts at that time"); no list; 1 sentence; HIGH confidence (both parents CONFLICTED → no qualifier). Parallel to chat-prompt.md S12; household framing rule preserved. ✅ PASS

**Note 34:** Chat (personal) — Scenario 13 (two-issue follow-up). Prior turn surfaced RED PICKUP_RISK (Scenario 12 path); parent follows up "Anything else I should know?". Expected: YELLOW LATE_SCHEDULE_CHANGE surfaces; directional lean toward UNCONFIRMED parent ("worth checking if your partner can cover"); MEDIUM confidence (one qualifier); RED issue not re-delivered; no list; 1 sentence. Validates the deferred-issue delivery path. ✅ PASS

**Note 35:** Alert — §3A/§3C design validation. PICKUP_RISK (§3A) YELLOW + parent_a CONFLICTED + parent_b UNCONFIRMED + MEDIUM → "probably worth a quick check between you" (symmetric coordination prompt). This is intentionally different from §3C Scenario 9 (directional lean). The distinction is causal: §3C trigger = one parent's action; §3A trigger = systemic gap, no single causal parent. Scenario 2 expected output confirmed correct; Failure Mode 8 added to prevent regression. ✅ PASS (design validation — not a new scenario, a documentation assertion)

---

### Session 17 — 2026-04-06T14:00 (maintenance run)
**Changes this session:**
- `docs/prompts/chat-prompt.md` — added Scenario 12: two OPEN issues exist (RED PICKUP_RISK + YELLOW LATE_SCHEDULE_CHANGE); parent asks "What do I need to know today?" → surface only the highest-priority issue (RED), defer the second to follow-up. Closes the untested gap for multi-issue priority selection in chat context. The morning briefing's supporting_detail slot deliberately delivers both issues in one look; in chat, the parent controls depth through follow-up questions — delivering both issues in a single first response violates the "lead with the one thing that matters" principle. Added Failure Mode 11: two-issue over-delivery (model produces a list when asked a general status question). Priority rule documented: RED > YELLOW; PICKUP_RISK > LATE_SCHEDULE_CHANGE at equal severity; earlier window on tie. Route implementation note added: `open_coordination_issues` should be ranked by priority before being passed to the prompt. Header updated: last-updated now Session 17.
- `docs/prompts/alert-prompt.md` — added Scenario 9: §3C LATE_SCHEDULE_CHANGE + YELLOW + parent_a CONFLICTED + parent_b UNCONFIRMED + MEDIUM confidence → directional lean toward UNCONFIRMED parent ("worth checking if your partner can cover"). Closes the final untested combination in the §3C YELLOW parent-status matrix. Three-way intersection now fully tested: Scenario 6 (one AVAILABLE + HIGH → direct assignment), Scenario 8 (both UNCONFIRMED + MEDIUM → coordination prompt), Scenario 9 (one CONFLICTED + one UNCONFIRMED + MEDIUM → directional lean). Added Failure Mode 7: model defaults to pure coordination prompt ("worth a quick check between you") even when one parent is definitively CONFLICTED, ignoring the directional lean. Header updated: last-updated now Session 17.

**§26 drift review:** All 7 prompts reviewed. All pass — no new drift detected. No system prompt text was modified in any file this session; all changes are test scenarios and failure mode additions. See Session 17 drift review table below.

**Trigger test results:** 40/40 Session 16 scenarios re-verified (no regressions) + 2 new scenarios = 42/42 pass:
1. Chat (personal) — two OPEN issues (RED + YELLOW), parent asks status → RED surfaces, YELLOW deferred; no list response — ✅ PASS
2. Alert — §3C LATE_SCHEDULE_CHANGE + YELLOW + one CONFLICTED + one UNCONFIRMED + MEDIUM → directional lean toward UNCONFIRMED parent, one qualifier, not a pure coordination prompt — ✅ PASS

**No new implementation flags for Lead Eng this session.** The chat route priority-ordering note (pass `open_coordination_issues` ranked by severity) is a restatement of the existing flag from Session 13 (morning briefing route); same discipline applies to chat. Existing flags carry forward unchanged.

**⚠️ Implementation flags carried from previous sessions (unchanged — see Session 16 for full list):**
- Alert route (S2-LE-06): LATE_SCHEDULE_CHANGE + CLEAR must not write coordination_issues record
- Checkin route (S2-LE-07): Read checkins_generated_today count BEFORE calling prompt
- Morning briefing route (S2-LE-05): Suppression must scope to same issue_id; pass pickup_assignments OPEN before ACKNOWLEDGED within each severity band; pass `state` for each issue
- Chat route (S3-LE-04): open_coordination_issues must exclude RESOLVED issues; must write RESOLVED on user-reported resolution; pass open_coordination_issues ranked by priority (RED before YELLOW within OPEN state)
- Household chat route (S3-LE-02): Must write RESOLVED state on user-reported resolution
- First-use route (S4-LE-01): confidence = HIGH only when §3A/§3C trigger fires; clean-coverage day must not receive `confidence: HIGH`

**✅ Closed this session:**
- chat (personal): Multi-issue priority selection now explicitly tested (S17) — correct path (surface RED only, defer YELLOW) and failure path (two-issue list delivery) both documented. Closes the gap where the single-issue assumption underpinning Scenarios 1–11 was never validated against a two-issue context.
- alert: §3C YELLOW parent-status matrix now complete (S17) — all three combinations tested: direct assignment (S6), directional lean (S9), coordination prompt (S8). No untested §3C YELLOW combination remains.

---

#### Session 17 §26 Drift Review Table

| Prompt | Unnecessary Preamble | Stacked Hedges | Generic Reassurance | Insight-Free Insight | Over-Explained Silence | Vague Compression | Result |
|--------|---------------------|----------------|---------------------|---------------------|----------------------|-------------------|--------|
| morning-briefing-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ N/A (null) | ✅ Specificity required | **PASS** |
| alert-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ N/A (1 sentence) | ✅ null | ✅ 1-sentence format | **PASS** |
| checkin-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ "No filler" explicit | ✅ null | ✅ Specificity required | **PASS** |
| chat-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ "Lead with implication" | ✅ Scenario 12 validated | ✅ Priority selection added | **PASS** |
| household-chat-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ "Lead with implication" | ✅ Brief acknowledgment | ✅ Specificity required | **PASS** |
| closure-prompt.md | ✅ Blocked | ✅ N/A | ✅ Blocked | ✅ Specific required | ✅ N/A | ✅ Child+time required | **PASS** |
| first-use-prompt.md | ✅ Blocked | ✅ N/A | ✅ Blocked | ✅ Fallback guard validated | ✅ Exact fallback | ✅ Specificity required | **PASS** |

---

#### Session 17 Trigger Test Notes

**Note 31 (Session 17):** Chat multi-issue priority — the chat prompt's "lead with the one thing that matters" principle was never tested against a context where two OPEN issues existed simultaneously. Scenarios 1–11 all featured either zero or one OPEN issue. Scenario 12 closes this gap. The critical distinction from morning briefing Scenario 8: in the briefing, the supporting_detail slot deliberately surfaces the secondary issue in the same output because the briefing is a one-way broadcast — the parent may not follow up. In chat, the parent controls depth via follow-up questions; delivering both issues at once produces a list response that dilutes the urgency of the primary issue. The failure mode (two-issue over-delivery) maps to the same instinct that drives forbidden openers: the model tries to be comprehensively helpful instead of being precisely useful. See chat-prompt.md Scenario 12 and Failure Mode 11.

**Note 32 (Session 17):** Alert §3C YELLOW parent-status matrix — this was the last untested combination in the alert matrix. The three §3C YELLOW outcomes now form a clear hierarchy: (1) one parent AVAILABLE + HIGH confidence → direct assignment (no hedging, responsibility is clear); (2) one parent CONFLICTED + other UNCONFIRMED + MEDIUM confidence → directional lean (responsibility probable but unverified); (3) both UNCONFIRMED + MEDIUM confidence → coordination prompt (responsibility unknown, bilateral prompt required). The directional lean in case (2) is the nuanced middle path: the system knows who can't cover (CONFLICTED) but not yet who can (UNCONFIRMED). Naming the direction ("your partner") without asserting it as confirmed is the correct MEDIUM confidence behavior — specific enough to be useful, qualified enough to be accurate. See alert-prompt.md Scenario 9 and Failure Mode 7.

---

### Session 16 — 2026-04-06T12:00 (maintenance run)
**Changes this session:**
- `docs/prompts/morning-briefing-prompt.md` — added Scenario 12: ACKNOWLEDGED issue + same issue previously surfaced in morning briefing + no change → null (suppression). Closes the final compound gap in the suppression taxonomy: Scenario 10 established ACKNOWLEDGED-state framing for the FIRST briefing appearance (`last_surfaced_insight: null`); no scenario tested what happens when the same ACKNOWLEDGED issue appears on a SECOND consecutive morning with no change. The system prompt states this case suppresses ("If the issue is ACKNOWLEDGED and was also surfaced in yesterday's briefing with no change, the repeat suppression rule applies"), but it was untested. Scenario 12 validates that suppression applies to ACKNOWLEDGED issues exactly as it does to OPEN issues. Added Failure Mode 11: model re-delivers ACKNOWLEDGED framing on consecutive mornings because the issue is not RESOLVED, treating "still open, acknowledged" as perpetually worth re-surfacing. Full suppression taxonomy now has all five branches tested (Scenarios 4, 6, 7, 10, 12).
- `docs/prompts/chat-prompt.md` — added Scenario 11: clean day (no open coordination issues, pickups confirmed) + parent asks "What do I need to know today?" → brief specific clean-state acknowledgment ("Maya's 3:30 pickup is covered — your partner has it. Nothing else on the coordination front today."). Closes the untested gap for the clean-day chat response. The §7 silence rule (return null) applies to briefing/alert/checkin outputs; in chat, the parent asked a direct question and cannot receive null. The correct response names the one confirmed coordination event and closes with a clean signal. Added Failure Mode 10: model over-explains the clean state ("I've reviewed your entire schedule and found no issues at this time") rather than delivering a specific, brief acknowledgment.

**§26 drift review:** All 7 prompts reviewed. All pass — no new drift detected. No system prompt text was modified in any file this session; all changes are test scenarios and failure mode additions. See Session 16 drift review table below.

**Trigger test results:** 38/38 Session 15 scenarios re-verified (no regressions) + 2 new scenarios = 40/40 pass:
1. Morning briefing — ACKNOWLEDGED issue + same issue previously surfaced in briefing + no change → null (repeat suppression applies to ACKNOWLEDGED state) — ✅ PASS
2. Chat (personal) — clean day, no open issues, parent asks "What do I need to know?" → specific clean-state acknowledgment, not over-explanation, not null — ✅ PASS

**No new implementation flags for Lead Eng this session.** All changes are test coverage and failure mode documentation. Existing implementation flags carry forward unchanged.

**⚠️ Implementation flags carried from previous sessions (unchanged — see Session 15 for full list):**
- Alert route (S2-LE-06): LATE_SCHEDULE_CHANGE + CLEAR must not write coordination_issues record
- Checkin route (S2-LE-07): Read checkins_generated_today count BEFORE calling prompt
- Morning briefing route (S2-LE-05): Suppression must scope to same issue_id; pass pickup_assignments OPEN before ACKNOWLEDGED within each severity band; pass `state` for each issue
- Chat route (S3-LE-04): open_coordination_issues must exclude RESOLVED issues; must write RESOLVED on user-reported resolution
- Household chat route (S3-LE-02): Must write RESOLVED state on user-reported resolution
- First-use route (S4-LE-01): confidence = HIGH only when §3A/§3C trigger fires; clean-coverage day must not receive `confidence: HIGH`

**✅ Closed this session:**
- morning-briefing: Suppression taxonomy now complete with all five branches tested — OPEN suppress (S4), OPEN bypass/status-changed (S6), different issue_id (S7), ACKNOWLEDGED first appearance (S10), ACKNOWLEDGED repeat/suppress (S12). No untested branch of the suppression logic remains.
- chat (personal): Clean-day direct-query response now explicitly tested — correct path (specific + brief) and failure path (over-explanation) both documented. Closes the gap where §7 silence rule creates ambiguity in chat context (where null is not a valid return).

---

#### Session 16 §26 Drift Review Table

| Prompt | Unnecessary Preamble | Stacked Hedges | Generic Reassurance | Insight-Free Insight | Over-Explained Silence | Vague Compression | Result |
|--------|---------------------|----------------|---------------------|---------------------|----------------------|-------------------|--------|
| morning-briefing-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ N/A (null) | ✅ Specificity required | **PASS** |
| alert-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ N/A (1 sentence) | ✅ null | ✅ 1-sentence format | **PASS** |
| checkin-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ "No filler" explicit | ✅ null | ✅ Specificity required | **PASS** |
| chat-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ "Lead with implication" | ✅ Scenario 11 validated | ✅ Specificity required | **PASS** |
| household-chat-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ "Lead with implication" | ✅ Brief acknowledgment | ✅ Specificity required | **PASS** |
| closure-prompt.md | ✅ Blocked | ✅ N/A | ✅ Blocked | ✅ Specific required | ✅ N/A | ✅ Child+time required | **PASS** |
| first-use-prompt.md | ✅ Blocked | ✅ N/A | ✅ Blocked | ✅ Fallback guard validated | ✅ Exact fallback | ✅ Specificity required | **PASS** |

---

#### Session 16 Trigger Test Notes

**Note 29 (Session 16):** Morning briefing ACKNOWLEDGED repeat suppression — the suppression rule explicitly covers ACKNOWLEDGED state in the system prompt ("If the issue is ACKNOWLEDGED and was also surfaced in yesterday's briefing with no change, the repeat suppression rule applies and the result is null"), but no test validated this behavior. Scenario 12 closes this gap. The distinction between Scenarios 10 and 12 is the `last_surfaced_insight` field: Scenario 10 has it null (first briefing appearance → surface with ACKNOWLEDGED framing), Scenario 12 has it populated with the same issue_id (second consecutive briefing, no change → null). The intuitive failure mode is that "still open — acknowledged" feels like a valid status update worth re-surfacing indefinitely. It is not: once the parent has been told in a morning briefing that a known issue is acknowledged, telling them again the next day (with no change) erodes signal. See morning-briefing-prompt.md Scenario 12 and Failure Mode 11.

**Note 30 (Session 16):** Chat clean-day response — the chat prompt's §7 guidance ("if there's nothing to flag, say nothing or say it briefly — not 'I've reviewed your entire schedule'") describes the failure mode but doesn't define what "say it briefly" means when the parent has asked a direct question. Scenario 11 provides the canonical form: name the one confirmed coordination event ("Maya's 3:30 pickup is covered — your partner has it") before delivering the clean signal ("Nothing else on the coordination front today."). This is specific and brief — not verbose and not null. The key insight: even on a clean day, the parent who asked "What do I need to know?" benefits from confirmation of what IS covered, not just absence of problems. If no events exist at all, "Nothing on the coordination front today." alone is correct. See chat-prompt.md Scenario 11 and Failure Mode 10.

---

### Session 15 — 2026-04-06T10:00 (maintenance run)
**Changes this session:**
- `docs/prompts/household-chat-prompt.md` — added Scenario 11: personal thread isolation test — parent asks about content from the other parent's personal thread ("What did they say about the meeting change?") → model acknowledges the gap and pivots to available household data rather than guessing, inferring, or leaking. Closes the explicit test gap for Failure Mode 2 (personal thread leakage): the isolation rule was documented in the system prompt and the failure mode list, but had no named test scenario validating the correct path. Added Failure Mode 12: model fabricates or extrapolates personal thread content from `recent_schedule_changes` when directly asked. Framing distinction from Scenario 6 (LOW confidence, data not yet captured): Scenario 6 invites both parents to share missing information ("do you want to walk me through what changed?"); Scenario 11 redirects to available household data, since the missing content is personal thread history that cannot and should not be shared in the household context.
- `docs/prompts/first-use-prompt.md` — added Scenario 6: HIGH confidence passed with clean-coverage day (no `household_conflicts`, all pickups confirmed) → model falls back to DEFAULT_FIRST_INSIGHT rather than fabricating a coordination issue. Closes the route-overconfidence gap: Scenario 5 tested MEDIUM confidence → fallback (confidence threshold case); Scenario 6 tests HIGH confidence signal with zero coordination data → fallback (data validation case). Documents the "route overconfidence guard" principle: the `confidence` field signals data richness, not a guarantee that a real issue exists; when the data directly contradicts the confidence label, fallback is correct. Added Failure Mode 7: model generates a live insight from clean-coverage data when route incorrectly passes `confidence: HIGH`, inventing urgency on a day with no conflicts.

**§26 drift review:** All 7 prompts reviewed. All pass — no new drift detected. No system prompt text was modified in any file this session; all changes are test scenarios and failure mode additions. See Session 15 drift review table below.

**Trigger test results:** 36/36 Session 14 scenarios re-verified (no regressions) + 2 new scenarios = 38/38 pass:
1. Household chat — personal thread isolation maintained under direct questioning → gap acknowledged, pivot to household data, no leakage — ✅ PASS
2. First-use — HIGH confidence with fully confirmed clean day → fallback, no fabricated insight — ✅ PASS

**No new implementation flags for Lead Eng this session.** All changes are test coverage and failure mode documentation. Existing implementation flags carry forward unchanged.

**⚠️ Implementation flags carried from previous sessions (unchanged — see Session 14 for full list):**
- Alert route (S2-LE-06): LATE_SCHEDULE_CHANGE + CLEAR must not write coordination_issues record
- Checkin route (S2-LE-07): Read checkins_generated_today count BEFORE calling prompt
- Morning briefing route (S2-LE-05): Suppression must scope to same issue_id; pass pickup_assignments OPEN before ACKNOWLEDGED within each severity band; pass `state` for each issue
- Chat route (S3-LE-04): open_coordination_issues must exclude RESOLVED issues; must write RESOLVED on user-reported resolution
- Household chat route (S3-LE-02): Must write RESOLVED state on user-reported resolution
- First-use route (S4-LE-01): confidence = HIGH only when §3A/§3C trigger fires; clean-coverage day must not receive `confidence: HIGH`

**✅ Closed this session:**
- household-chat: Personal thread isolation now explicitly tested (S15) — Failure Mode 2 has a named validation scenario. The isolation rule was only in the system prompt; now it has a test that confirms correct behavior under direct questioning.
- first-use: Route-overconfidence guard now tested (S15) — Failure Mode 7 fills the inverse of Scenario 5 (MEDIUM → fallback). Scenario 6 tests HIGH label + clean data → fallback. All first-use null/fallback paths: LOW (S3/S4), MEDIUM (S5), HIGH-with-no-issue (S6).

---

#### Session 15 §26 Drift Review Table

| Prompt | Unnecessary Preamble | Stacked Hedges | Generic Reassurance | Insight-Free Insight | Over-Explained Silence | Vague Compression | Result |
|--------|---------------------|----------------|---------------------|---------------------|----------------------|-------------------|--------|
| morning-briefing-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ N/A (null) | ✅ Specificity required | **PASS** |
| alert-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ N/A (1 sentence) | ✅ null | ✅ 1-sentence format | **PASS** |
| checkin-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ "No filler" explicit | ✅ null | ✅ Specificity required | **PASS** |
| chat-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ "Lead with implication" | ✅ Brief acknowledgment | ✅ Specificity required | **PASS** |
| household-chat-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ "Lead with implication" | ✅ Brief acknowledgment | ✅ Specificity required | **PASS** |
| closure-prompt.md | ✅ Blocked | ✅ N/A | ✅ Blocked | ✅ Specific required | ✅ N/A | ✅ Child+time required | **PASS** |
| first-use-prompt.md | ✅ Blocked | ✅ N/A | ✅ Blocked | ✅ Fallback guard validated | ✅ Exact fallback | ✅ Specificity required | **PASS** |

---

#### Session 15 Trigger Test Notes

**Note 27 (Session 15):** Household chat personal thread isolation — the isolation rule ("you do not know what either parent privately discussed in their personal thread") is explicit in the system prompt but had no named test scenario validating the correct behavior when a parent directly asks about personal thread content. Scenario 11 closes this gap. The correct path: acknowledge the gap specifically ("I don't have that in the household thread") and pivot to available household data. The failure path: model infers or extrapolates what was said using `recent_schedule_changes` or other household data fields, effectively reconstructing content from the personal thread indirectly. Both parents are reading the household thread response — surfacing what one parent said privately is a trust-breaking privacy violation. See household-chat-prompt.md Scenario 11 and Failure Mode 12.

**Note 28 (Session 15):** First-use route overconfidence guard — the first-use fallback taxonomy now covers all paths: LOW confidence/no data (Scenarios 3/4), MEDIUM confidence (Scenario 5), and HIGH confidence with no actual coordination issue (Scenario 6). The `confidence` field does not guarantee that a real coordination issue exists — it communicates route certainty. When the household data shows no conflicts and confirmed coverage, the model must fall back regardless of the confidence signal. The most dangerous failure mode for the first-use moment is fabricated urgency: a parent who sees "Maya's 3:30 pickup may be at risk" on their first open, then checks their calendar and sees it's confirmed, will distrust Kin immediately and may not return. Route discipline is a co-dependency here: S4-LE-01 must only assign `confidence: HIGH` when a valid §3A/§3C trigger fires. See first-use-prompt.md Scenario 6 and Failure Mode 7.

---

### Session 14 — 2026-04-06T08:00 (maintenance run)
**Changes this session:**
- `docs/prompts/checkin-prompt.md` — added Scenario 8: repeat-suppression BYPASSED when underlying situation changed (event time moved). Closes the suppression-bypass branch for check-in cards: Scenario 4 tested the suppress branch (same event, no change → null); Scenario 8 tests the bypass branch (same observation type and child, but event time changed → re-surface with updated observation). The suppression rule ("last_surfaced_at within 24h and situation unchanged") has an implicit bypass when the event details change. Added Failure Mode 7: model returns null because `last_surfaced_at` is within 24h, ignoring that event details changed. Symmetric with morning-briefing Scenario 6 (suppression bypass when issue state changes).
- `docs/prompts/chat-prompt.md` — added Scenario 10: no-repetition BYPASSED — situation improved, issue still OPEN. Closes the bypass branch of the no-repetition rule in the personal thread: Scenario 5 tested suppress (same issue, no change → "Still the same"); Scenario 7 tested RESOLVED (status changed to resolved → factual update). Scenario 10 tests the third branch: situation improved (parent_b freed up) but issue not yet RESOLVED → surface the update with MEDIUM confidence. Added Failure Mode 9: model applies no-repetition suppression when situation has actually changed, leaving parent with stale, anxiety-producing framing.
- `docs/prompts/household-chat-prompt.md` — added Scenario 10: no-repetition BYPASSED — situation improved, neutral household framing. Closes the symmetric gap with personal thread (chat-prompt.md Scenario 10). Key framing distinction: household thread uses passive neutral construction ("a 3pm commitment cleared") rather than attributing the change to a named parent ("your partner's PT was cancelled"), consistent with §16. Added Failure Mode 11: model applies no-repetition to situation improvements, ignoring that parent status changed within the OPEN issue.

**§26 drift review:** All 7 prompts reviewed. All pass — no new drift detected. All changes this session are test scenarios and failure mode additions only; no system prompt text was modified in any file. See Session 14 drift review table below.

**Trigger test results:** 33/33 Session 13 scenarios re-verified (no regressions) + 3 new scenarios = 36/36 pass:
1. Check-in — repeat suppression BYPASSED (event time changed) → re-surface with updated observation — ✅ PASS
2. Chat (personal) — no-repetition BYPASSED (situation improved, parent_b now AVAILABLE) → surface update, not "still the same" — ✅ PASS
3. Household chat — no-repetition BYPASSED (situation improved, neutral passive framing) → update framing without attribution — ✅ PASS

**No new implementation flags for Lead Eng this session.** All changes are test coverage and failure mode documentation. Existing implementation flags carry forward unchanged.

**⚠️ Implementation flags carried from previous sessions (unchanged — see Session 13 for full list):**
- Alert route (S2-LE-06): LATE_SCHEDULE_CHANGE + CLEAR must not write coordination_issues record
- Checkin route (S2-LE-07): Read checkins_generated_today count BEFORE calling prompt
- Morning briefing route (S2-LE-05): Suppression must scope to same issue_id; pass pickup_assignments OPEN before ACKNOWLEDGED within each severity band; pass `state` for each issue
- Chat route (S3-LE-04): open_coordination_issues must exclude RESOLVED issues; must write RESOLVED on user-reported resolution
- Household chat route (S3-LE-02): Must write RESOLVED state on user-reported resolution
- First-use route (S4-LE-01): confidence = HIGH only when §3A/§3C trigger fires

**✅ Closed this session:**
- checkin: Suppression bypass branch now tested — suppression-bypass taxonomy complete: suppress (S4) and bypass (S8). Symmetric with morning-briefing suppression branches (S4/S6/S7).
- chat (personal): No-repetition bypass branch now tested — no-repetition taxonomy complete: suppress (S5), RESOLVED update (S7), situation-improved update (S10).
- household-chat: No-repetition bypass branch now tested — symmetric with personal thread (S14). Neutral §16 passive framing validated for situation-improvement updates.

---

#### Session 14 §26 Drift Review Table

| Prompt | Unnecessary Preamble | Stacked Hedges | Generic Reassurance | Insight-Free Insight | Over-Explained Silence | Vague Compression | Result |
|--------|---------------------|----------------|---------------------|---------------------|----------------------|-------------------|--------|
| morning-briefing-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ N/A (null) | ✅ Specificity required | **PASS** |
| alert-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ N/A (1 sentence) | ✅ null | ✅ 1-sentence format | **PASS** |
| checkin-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ "No filler" explicit | ✅ null | ✅ Specificity required | **PASS** |
| chat-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ "Lead with implication" | ✅ Brief acknowledgment | ✅ Specificity required | **PASS** |
| household-chat-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ "Lead with implication" | ✅ Brief acknowledgment | ✅ Specificity required | **PASS** |
| closure-prompt.md | ✅ Blocked | ✅ N/A | ✅ Blocked | ✅ Specific required | ✅ N/A | ✅ Child+time required | **PASS** |
| first-use-prompt.md | ✅ Blocked | ✅ N/A | ✅ Blocked | ✅ Specificity required | ✅ Exact fallback | ✅ Specificity required | **PASS** |

---

#### Session 14 Trigger Test Notes

**Note 24 (Session 14):** Check-in suppression bypass — the suppression rule ("last_surfaced_at within 24h and situation unchanged") has an implicit bypass that was untested. When the underlying event details change (time moved, assigned parent changed, logistics updated), the prior check-in is stale and the observation must re-surface with updated framing. The suppress case (Scenario 4) and bypass case (Scenario 8) together form a complete binary: unchanged → null; changed → surface. This parallels the morning-briefing suppression-bypass pattern (Scenarios 4/6) and should be understood by the route: `last_surfaced_at` alone is not sufficient to suppress — the route must also confirm that event details are unchanged before applying suppression. See checkin-prompt.md Scenario 8 and Failure Mode 7.

**Note 25 (Session 14):** Chat (personal thread) no-repetition bypass — when a parent asks "any update?" after Kin surfaced a coordination issue, the correct response depends on whether the underlying situation changed. Scenario 5 (no change) → brief confirmation. Scenario 7 (RESOLVED) → factual update. Scenario 10 (situation improved, still OPEN) → update framing with MEDIUM confidence. The failure mode — saying "still the same" when parent_b freed up — is not just unhelpful; it leaves the parent carrying anxiety they no longer need. The no-repetition rule must check the current state of `open_coordination_issues` and `recent_schedule_changes`, not just whether the issue_id is still present. See chat-prompt.md Scenario 10 and Failure Mode 9.

**Note 26 (Session 14):** Household thread no-repetition bypass — symmetric with personal thread (Note 25) but with §16 neutral framing applied to the update. When a parent status changes from CONFLICTED to AVAILABLE, the household thread must surface this using passive construction ("a commitment cleared") rather than attributing the change to a named parent. The update is the same — coverage now looks likely — but the framing strips attribution, consistent with the §16 rule that applies to all household-thread outputs where a schedule change originates with one parent. Symmetric with Scenario 7 (attribution question → neutral deflection). See household-chat-prompt.md Scenario 10 and Failure Mode 11.

---

### Session 13 — 2026-04-06T06:00 (maintenance run)
**Changes this session:**
- `docs/prompts/morning-briefing-prompt.md` — added Scenario 11: ACKNOWLEDGED primary + OPEN secondary → OPEN takes the primary slot. Closes the mixed-state prioritization gap: Scenario 8 tested two OPEN issues (RED > YELLOW); Scenario 10 tested a single ACKNOWLEDGED issue. No test existed for the case where one issue is ACKNOWLEDGED and another is OPEN. New prioritization dimension established: OPEN > ACKNOWLEDGED for the primary slot, regardless of severity. An ACKNOWLEDGED issue is presumably being handled; an OPEN issue has not yet received parent attention and must take priority. ACKNOWLEDGED issue is demoted to `supporting_detail` with status-aware framing ("acknowledged but still open"). Added Failure Mode 10: ACKNOWLEDGED issue retains primary slot when OPEN issue also exists.
- `docs/prompts/household-chat-prompt.md` — added Scenario 9: RESOLVED issue query via conversation_history → calm neutral status confirmation ("Leo's 5:30 was sorted — it's off the list."). Closes the household-thread gap left open after Session 10: `chat-prompt.md` Scenario 7 tests a resolved-issue query in the personal thread; the household thread had no symmetric equivalent. Key framing rule: household thread uses passive construction ("was sorted") rather than attributing resolution to a named parent. Added Failure Mode 10: RESOLVED issue re-surfaced with OPEN-state language when model misreads empty `open_coordination_issues` as ambiguity.

**§26 drift review:** All 7 prompts reviewed. All pass — no new drift detected. Changes this session are test scenarios and failure mode additions only. No system prompt text was modified in either file; the new scenarios extend test coverage without altering output instructions or tone rules. See Session 13 drift review table below.

**Trigger test results:** 31/31 Session 12 scenarios re-verified (no regressions) + 2 new scenarios = 33/33 pass:
1. Morning briefing — ACKNOWLEDGED primary + OPEN secondary → OPEN takes primary slot (OPEN > ACKNOWLEDGED priority dimension) — ✅ PASS
2. Household chat — RESOLVED issue query via conversation_history → passive neutral confirmation, no urgency re-surface — ✅ PASS

**⚠️ New implementation flag for Lead Eng (Session 13):**
- Morning briefing route (S2-LE-05): When both OPEN and ACKNOWLEDGED issues exist, route must pass OPEN items first in `pickup_assignments` and `household_conflicts` arrays (within each severity band: OPEN RED → ACKNOWLEDGED RED → OPEN YELLOW → ACKNOWLEDGED YELLOW). Without state-aware ordering, the model may select an ACKNOWLEDGED issue as primary simply because it appears first. This is an extension of the Session 10 flag (rank by urgency) — urgency is now two-dimensional: severity AND state. See morning-briefing-prompt.md Scenario 11 and Failure Mode 10, and trigger-test-log Note 22 below.

**⚠️ Implementation flags carried from previous sessions (unchanged — see Session 12 for full list):**
- Alert route (S2-LE-06): LATE_SCHEDULE_CHANGE + CLEAR must not write coordination_issues record
- Checkin route (S2-LE-07): Read checkins_generated_today count BEFORE calling prompt
- Morning briefing route (S2-LE-05): Suppression must scope to same issue_id; pass pickup_assignments ranked by urgency (OPEN before ACKNOWLEDGED within each severity band); pass `state` for each issue
- Chat route (S3-LE-04): open_coordination_issues must exclude RESOLVED issues; must write RESOLVED on user-reported resolution
- Household chat route (S3-LE-02): Must write RESOLVED state on user-reported resolution
- First-use route (S4-LE-01): confidence = HIGH only when §3A/§3C trigger fires

**✅ Closed this session:**
- morning-briefing: Mixed OPEN/ACKNOWLEDGED prioritization now tested — OPEN takes primary regardless of severity; ACKNOWLEDGED demoted to supporting_detail with status-aware framing (S13)
- household-chat: RESOLVED issue query now symmetric with personal thread (chat-prompt.md Scenario 7) — household-thread neutral passive framing validated (S13)

---

#### Session 13 §26 Drift Review Table

| Prompt | Unnecessary Preamble | Stacked Hedges | Generic Reassurance | Insight-Free Insight | Over-Explained Silence | Vague Compression | Result |
|--------|---------------------|----------------|---------------------|---------------------|----------------------|-------------------|--------|
| morning-briefing-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked (OPEN/ACKNOWLEDGED framing both specific) | ✅ N/A (null) | ✅ Specificity required | **PASS** |
| alert-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ N/A (1 sentence) | ✅ null | ✅ 1-sentence format | **PASS** |
| checkin-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ "No filler" explicit | ✅ null | ✅ Specificity required | **PASS** |
| chat-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ "Lead with implication" | ✅ Brief acknowledgment | ✅ Specificity required | **PASS** |
| household-chat-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ "Lead with implication" | ✅ Brief acknowledgment | ✅ Specificity required | **PASS** |
| closure-prompt.md | ✅ Blocked | ✅ N/A | ✅ Blocked | ✅ Specific required | ✅ N/A | ✅ Child+time required | **PASS** |
| first-use-prompt.md | ✅ Blocked | ✅ N/A | ✅ Blocked | ✅ Specificity required | ✅ Exact fallback | ✅ Specificity required | **PASS** |

---

#### Session 13 Trigger Test Notes

**Note 22 (Session 13):** Morning briefing mixed-state prioritization — when both OPEN and ACKNOWLEDGED issues exist, OPEN takes the primary slot regardless of severity. This is a new dimension of the prioritization rule established in Session 10 (Scenario 8: RED > YELLOW for two OPEN issues). Session 13 adds: within any severity comparison, OPEN precedes ACKNOWLEDGED. The rationale: ACKNOWLEDGED = parent has seen the alert and is presumably acting; OPEN = parent has not engaged and needs to act now. The morning briefing should direct attention toward the unacknowledged issue. Route must order `pickup_assignments` and `household_conflicts` with OPEN items first within each severity band (OPEN RED → ACKNOWLEDGED RED → OPEN YELLOW → ACKNOWLEDGED YELLOW). See morning-briefing-prompt.md Scenario 11 and Failure Mode 10.

**Note 23 (Session 13):** Household chat RESOLVED query — confirmed that empty `open_coordination_issues` + prior resolution in `conversation_history` → RESOLVED status confirmation, not coverage-gap ambiguity. The household thread now has a named, tested scenario for resolved-issue queries symmetric with chat-prompt.md Scenario 7 (personal thread). Framing distinction: household thread uses passive construction ("was sorted") rather than attributing resolution to a named parent, consistent with §16. Route discipline unchanged: Household chat route (S3-LE-02) must write RESOLVED state when a parent reports resolution; this test validates that the model correctly reads back that resolved state from history. See household-chat-prompt.md Scenario 9 and Failure Mode 10.

---

### Session 12 — 2026-04-06T04:00 (maintenance run)
**Changes this session:**
- `docs/prompts/morning-briefing-prompt.md` — added Scenario 10: ACKNOWLEDGED issue in morning briefing → status-aware softer framing (not re-alert). Closes the ACKNOWLEDGED state gap in the briefing route: chat-prompt.md (Session 10, Scenario 8) and household-chat-prompt.md (Session 11, Scenario 8) both handle ACKNOWLEDGED state; the morning briefing had no equivalent. ACKNOWLEDGED framing for the briefing: "still open — acknowledged but not yet resolved" (status update register) vs. OPEN framing: "no coverage — you're both tied up" (discovery/urgency register). Added corresponding route implementation note to INPUT FORMAT section: route must pass `state: "OPEN" | "ACKNOWLEDGED"` for each item in `pickup_assignments` and `household_conflicts`. Added Failure Mode 9: ACKNOWLEDGED issue re-alerted with OPEN urgency in morning briefing.
- Updated INPUT FORMAT in morning-briefing-prompt.md to add `state` field to `pickup_assignments` and `household_conflicts` arrays and added ACKNOWLEDGED state framing instruction block.

**§26 drift review:** All 7 prompts reviewed. All pass — no new drift detected. System prompt changes this session: morning-briefing-prompt.md INPUT FORMAT extended (added `state` field description and ACKNOWLEDGED state framing instruction). These additions instruct the model on data-field semantics and state-dependent output behavior — they are not output-tone additions and do not introduce any of the 6 drift patterns. No prompt tone rewrites. See Session 12 drift review table below.

**Trigger test results:** 30/30 Session 11 scenarios re-verified (no regressions) + 1 new scenario = 31/31 pass:
1. Morning briefing — ACKNOWLEDGED issue (first briefing appearance, `last_surfaced_insight: null`) → status-aware framing ("still open — acknowledged but not yet resolved"), no OPEN-urgency language — ✅ PASS

**⚠️ New implementation flag for Lead Eng (Session 12):**
- Morning briefing route (S2-LE-05): Must pass `state: "OPEN" | "ACKNOWLEDGED"` for each item in `pickup_assignments` and `household_conflicts` arrays. Without this field, the model cannot distinguish re-alerting (OPEN) from status-updating (ACKNOWLEDGED) and will re-surface acknowledged issues with full urgency — eroding trust with parents who have already engaged with the alert. See morning-briefing-prompt.md Scenario 10, Failure Mode 9, and trigger-test-log Note 21 below.

**⚠️ Implementation flags carried from previous sessions (unchanged — see Session 11 for full list):**
- Alert route (S2-LE-06): LATE_SCHEDULE_CHANGE + CLEAR must not write coordination_issues record
- Checkin route (S2-LE-07): Read checkins_generated_today count BEFORE calling prompt
- Morning briefing route (S2-LE-05): Suppression must scope to same issue_id; pass pickup_assignments ranked by urgency when multiple issues exist; pass `state` for each issue (NEW Session 12)
- Chat route (S3-LE-04): open_coordination_issues must exclude RESOLVED issues; must write RESOLVED on user-reported resolution
- Household chat route (S3-LE-02): Must write RESOLVED state on user-reported resolution
- First-use route (S4-LE-01): confidence = HIGH only when §3A/§3C trigger fires

**✅ Closed this session:**
- morning-briefing: ACKNOWLEDGED state now instructed in system prompt and tested (Scenario 10) — morning briefing is now symmetric with chat (S10) and household-chat (S11) on ACKNOWLEDGED issue handling. All three output surfaces that can encounter ACKNOWLEDGED issues now have explicit state-aware framing documented and tested.

---

#### Session 12 §26 Drift Review Table

| Prompt | Unnecessary Preamble | Stacked Hedges | Generic Reassurance | Insight-Free Insight | Over-Explained Silence | Vague Compression | Result |
|--------|---------------------|----------------|---------------------|---------------------|----------------------|-------------------|--------|
| morning-briefing-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ N/A (null) | ✅ Specificity required | **PASS** |
| alert-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ N/A (1 sentence) | ✅ null | ✅ 1-sentence format | **PASS** |
| checkin-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ "No filler" explicit | ✅ null | ✅ Specificity required | **PASS** |
| chat-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ "Lead with implication" | ✅ Brief acknowledgment | ✅ Specificity required | **PASS** |
| household-chat-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ "Lead with implication" | ✅ Brief acknowledgment | ✅ Specificity required | **PASS** |
| closure-prompt.md | ✅ Blocked | ✅ N/A | ✅ Blocked | ✅ Specific required | ✅ N/A | ✅ Child+time required | **PASS** |
| first-use-prompt.md | ✅ Blocked | ✅ N/A | ✅ Blocked | ✅ Specificity required | ✅ Exact fallback | ✅ Specificity required | **PASS** |

---

#### Session 12 Trigger Test Notes

**Note 21 (Session 12):** Morning briefing ACKNOWLEDGED handling — route must pass `state` field for items in `pickup_assignments` and `household_conflicts`. The morning briefing is the third output surface (after chat and household-chat) that can receive ACKNOWLEDGED issues. Without the `state` field, the model defaults to OPEN-register framing and re-surfaces acknowledged issues with urgency. Erodes trust when parents who have already engaged with the alert see it re-presented as a discovery. Fix: route schema update for S2-LE-05; add `state: "OPEN" | "ACKNOWLEDGED"` to both arrays. RESOLVED items should remain excluded. See morning-briefing-prompt.md Scenario 10, Failure Mode 9, and INPUT FORMAT section.

---

### Session 11 — 2026-04-06T02:00 (maintenance run)
**Changes this session:**
- `docs/prompts/household-chat-prompt.md` — added Scenario 8: ACKNOWLEDGED state in household thread → status-aware both-parent framing. Closes the symmetric gap opened by Session 10: chat-prompt.md Scenario 8 documented ACKNOWLEDGED state handling in the personal thread; the household thread had no equivalent. Added Failure Mode 9: ACKNOWLEDGED issue re-alerted with OPEN urgency in household context. The framing distinction: personal thread uses "has it been sorted yet?" (singular); household thread uses "has it been sorted between you?" (both parents, no attribution of who acknowledged).
- `docs/prompts/checkin-prompt.md` — added Scenario 7: LOW confidence → null. Closes the final null-return suppression path. All four null-return cases are now explicitly tested: alert suppression (Scenario 3), repeat suppression (Scenario 4), frequency cap (Scenario 6), LOW confidence (Scenario 7). Session 9 documented three; LOW confidence suppression was described in the system prompt and compliance checklist but had no named test scenario.
- `docs/prompts/morning-briefing-prompt.md` — added Scenario 9: LOW confidence → null, distinct from CLEAR. Closes the gap where null was only tested via Scenario 3 (CLEAR coverage, nothing to surface) and Scenarios 4/7 (repeat suppression). Scenario 9 tests the third distinct null path: potential coordination issue present in the data but confidence too LOW to surface. Documents the null-path taxonomy: CLEAR (nothing going on), suppression (unchanged issue), and LOW confidence (ambiguous data).

**§26 drift review:** All 7 prompts reviewed. All pass — no new drift detected. No system prompt text was modified; all improvements are test scenarios and failure mode additions. See Session 11 drift review table below.

**Trigger test results:** 27/27 Session 10 scenarios re-verified (no regressions) + 3 new scenarios = 30/30 pass:
1. Household chat — ACKNOWLEDGED issue → status-aware both-parent framing ("between you") — ✅ PASS
2. Check-in — LOW confidence → null (confidence-based suppression, distinct from alert/frequency/repeat suppression) — ✅ PASS
3. Morning briefing — LOW confidence → null (distinct from CLEAR — potential issue exists but data too ambiguous) — ✅ PASS

**No new implementation flags for Lead Eng this session.** All changes are test coverage and documentation only. Existing implementation flags carry forward unchanged.

**⚠️ Implementation flags carried from previous sessions (unchanged — see Session 10 for full list):**
- Alert route (S2-LE-06): LATE_SCHEDULE_CHANGE + CLEAR must not write coordination_issues record
- Checkin route (S2-LE-07): Read checkins_generated_today count BEFORE calling prompt
- Morning briefing route (S2-LE-05): Suppression must scope to same issue_id; pass pickup_assignments ranked by urgency when multiple issues exist
- Chat route (S3-LE-04): open_coordination_issues must exclude RESOLVED issues; must write RESOLVED on user-reported resolution
- Household chat route (S3-LE-02): Must write RESOLVED state on user-reported resolution
- First-use route (S4-LE-01): confidence = HIGH only when §3A/§3C trigger fires

**✅ Closed this session:**
- household-chat: ACKNOWLEDGED state now tested — household thread is symmetric with personal thread on ACKNOWLEDGED issue handling (S11)
- checkin: All four null-return suppression paths now explicitly tested — LOW confidence case was documented in spec but had no named scenario (S11)
- morning-briefing: All three null paths now explicitly documented and tested — CLEAR, suppression, and LOW confidence are each distinct cases with distinct tests (S11)

---

### Session 10 — 2026-04-06T00:00 (maintenance run)
**Changes this session:**
- `docs/prompts/morning-briefing-prompt.md` — added Scenario 8: multiple open issues present → primary (RED/more urgent) surfaced as `primary_insight`, secondary (YELLOW) in `supporting_detail`. Closes the gap where all prior scenarios presented exactly one open issue; no test validated prioritization behavior when two issues compete for the primary slot. Added Failure Mode 8: dual-insight output (model lists both issues in `primary_insight`, violating the 1-primary-insight rule). Added route implementation note: pass pickup_assignments ranked by urgency, or include a priority signal, so model has a consistent tiebreaker.
- `docs/prompts/chat-prompt.md` — added ACKNOWLEDGED state handling note to the `open_coordination_issues` context field: OPEN = full urgency; ACKNOWLEDGED = parent has seen it, reflect known state without re-alerting. Added Scenario 8: ACKNOWLEDGED issue query → status-aware response ("flagged and acknowledged — has it been sorted?"). Closes the gap where ACKNOWLEDGED state was included in the context array but the system prompt gave no guidance on how to treat it differently from OPEN. Added Scenario 9: personal thread resolution reporting → acknowledgment + route implementation flag. Closes the structural gap where household-chat-prompt.md Scenario 3 covered household-thread resolution reporting but the personal thread had no equivalent. Added Failure Modes 7 and 8.

**§26 drift review:** All 7 prompts reviewed. All pass — no new drift detected. Changes this session are context-field documentation (1 addition to chat system prompt), test scenarios, and failure mode additions. No prompt tone rewrites. See Session 10 drift review table below.

**Trigger test results:** 24/24 Session 9 scenarios re-verified (no regressions) + 3 new scenarios = 27/27 pass:
1. Morning briefing — multiple open issues → primary (RED) surfaced, secondary (YELLOW) in supporting_detail — ✅ PASS
2. Chat (personal) — ACKNOWLEDGED issue query → status-aware response, no re-alerting — ✅ PASS
3. Chat (personal) — parent reports resolution → acknowledgment + route must write RESOLVED — ✅ PASS

**⚠️ New implementation flags for Lead Eng (Session 10):**
- Morning briefing route (S2-LE-05): When multiple open coordination issues exist, route must pass `pickup_assignments` and `household_conflicts` ranked by urgency (RED before YELLOW; earlier event window breaks ties) or include an explicit `priority` field. Without ranking, the model may select the primary issue inconsistently. See morning-briefing-prompt.md Scenario 8 and Failure Mode 8. Tag for trigger-test-log Note 19.
- Personal thread route (S3-LE-04): Must detect user-reported resolution signals ("I sorted it," "my mom's getting her," etc.) in personal thread messages and write `coordination_issues.state = RESOLVED` before calling chat-prompt. Same discipline as household thread (S3-LE-02). Without this, Kin's "I'll clear the alert" is a broken promise. See chat-prompt.md Scenario 9 and Failure Mode 8. Tag for trigger-test-log Note 20. Flag for S3-QA-01 audit.

**⚠️ Implementation flags carried from previous sessions (unchanged):**
- Alert route (S2-LE-06): LATE_SCHEDULE_CHANGE + CLEAR must not write a coordination_issues record
- Checkin route (S2-LE-07): Read checkins_generated_today count BEFORE calling prompt (not after)
- Morning briefing route (S2-LE-05): Suppression must scope to same issue_id
- Chat route (S3-LE-04): open_coordination_issues must exclude RESOLVED issues
- Household chat route (S3-LE-02): Must write RESOLVED state on user-reported resolution
- First-use route (S4-LE-01): confidence = HIGH only when §3A/§3C trigger fires

**✅ Closed this session:**
- morning-briefing: Multi-issue prioritization behavior now tested at prompt-file level — all selection scenarios covered (Scenario 8)
- chat (personal): ACKNOWLEDGED state now instructed in system prompt and tested (Scenario 8) — no more ambiguity about re-alerting vs. status-aware response
- chat (personal): Resolution reporting now covered in personal thread (Scenario 9) — both thread types symmetric on this behavior

---

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

### Session 9 — 2026-04-05T06:00 (maintenance run)
**Changes this session:**
- `docs/prompts/alert-prompt.md` — added Scenario 7: §3C CLEAR (late change resolves, no alert generated). Closes the gap between the trigger-log (Session 2 §3C CLEAR test) and the prompt file — Scenario 4 previously only covered §3A CLEAR; §3C CLEAR was untested at the prompt-file level. Added Scenario 8: §3C YELLOW + both UNCONFIRMED (coordination prompt, not assignment). Closes the remaining §3C/§16 intersection gap at the prompt-file level (Session 4 trigger-log had this scenario; prompt file did not). All three §3C tone outcomes (collaborative, direct-assignment, coordination-prompt) now demonstrated in alert-prompt.md.
- `docs/prompts/checkin-prompt.md` — added Scenario 6: frequency cap triggered (checkins_generated_today >= 2 → null). This is an explicit suppression rule with no prior test scenario. All three null-return suppression cases now tested: open high-priority alert (Scenario 3), repeat suppression (Scenario 4), frequency cap (Scenario 6).

**§26 drift review:** All 7 prompts reviewed. All pass. No new drift detected. No system prompt text was modified; all improvements are test scenarios only. See Session 9 drift review table below.

**Trigger test results:** 21/21 Session 8 scenarios re-verified (no regressions) + 3 new scenarios = 24/24 pass:
1. Alert — §3C CLEAR → null (no alert when change resolves coverage) — ✅ PASS
2. Alert — §3C YELLOW + both UNCONFIRMED → coordination prompt — ✅ PASS
3. Checkin — frequency cap (checkins_generated_today >= 2) → null — ✅ PASS

**⚠️ New implementation flag for Lead Eng (Session 9):**
- Checkin route (S2-LE-07): Route must pass accurate `checkins_generated_today` count before calling checkin-prompt. If the count is read before all same-day check-in writes are confirmed, concurrent execution can allow more than 2 check-ins to render. Route should serialize or gate on a confirmed count. See checkin-prompt.md Scenario 6.

**⚠️ Implementation flags carried forward (unchanged — see Session 8 for details):**
- S2-LE-05: Morning briefing suppression must scope to same issue_id
- S3-LE-04: Chat route must pass accurate open_coordination_issues (RESOLVED issues removed)
- S3-LE-02: Household thread route must write RESOLVED state on user-reported resolution
- S4-LE-01: First-use confidence = HIGH only when §3A/§3C trigger fires

**Wiring notes (unchanged):**
- All §3C tone outcomes now fully covered at prompt-file level: alert-prompt.md Scenarios 3 (RED), 6 (YELLOW direct), 7 (CLEAR), 8 (YELLOW coord)
- QA should verify §3C CLEAR handling in S2-QA-01 — route must not write a coordination_issues record when severity is CLEAR

---

### Session 8 — 2026-04-05T04:00 (maintenance run)
**Changes this session:**
- `docs/prompts/morning-briefing-prompt.md` — added Scenario 7: different issue_id today, suppression does not apply. Closes the third branch of the suppression logic: Scenario 4 tests same-issue/no-change → SUPPRESS; Scenario 6 tests same-issue/changed → BYPASS; Scenario 7 tests different issue entirely → SURFACE NORMALLY. Added Failure Mode 7: suppression applied to wrong issue (model suppresses because `last_surfaced_insight` is non-null, ignoring that the issue_ids differ).
- `docs/prompts/chat-prompt.md` — added Scenario 7: parent asks about a now-RESOLVED issue. Tests that Kin correctly surfaces the updated (resolved) status without residual urgency. Distinguishes from Scenario 5 (no-repetition — same status, still OPEN) vs. Scenario 7 (status changed to RESOLVED — update accordingly).
- `docs/prompts/household-chat-prompt.md` — added Scenario 7: attribution question, neutral framing maintained. Tests that Kin deflects a direct "Who made this change?" question without naming the responsible parent, even when `changed_by` is known in the data. Added Failure Mode 8: attribution framing drift under direct questioning — "your partner added…" implies parent_a in household thread context and violates §16 neutral framing.

**§26 drift review:** All 7 prompts reviewed. All pass — no new drift detected. No system prompt text was changed this session; all improvements are test scenarios and failure mode additions only. See Session 8 drift review table below.

**Trigger tests:** 18/18 Session 7 scenarios re-verified (no regressions) + 3 new scenarios = 21/21 pass:
1. Morning briefing — different issue_id, suppression does not apply — ✅ PASS
2. Chat (personal) — RESOLVED issue query → direct status update — ✅ PASS
3. Household chat — attribution question → neutral framing deflection — ✅ PASS

---

### Session 7 — 2026-04-05T02:00 (maintenance run)
**Changes this session:**
- `docs/prompts/chat-prompt.md` — added Scenario 6: LOW confidence → explicit uncertainty. Closes the deferred gap from Session 6. Documents the key distinction: LOW confidence in chat = verbal acknowledgment ("I don't have enough information on that right now."), NOT null. Null is for briefing/alert/checkin; in chat, the parent is waiting for a response. Also distinguishes LOW confidence (in-scope question, missing data) from off-topic redirect (Scenario 4). Added Failure Mode 6.
- `docs/prompts/household-chat-prompt.md` — added Scenario 6: LOW confidence → uncertainty + clarification offer. Parallel to chat Scenario 6 but with household-thread framing: "I don't have enough to go on here — do you want to walk me through what changed?" The clarification offer is consistent with §16 collaborative framing — invites both parents to fill the gap together rather than directing one parent. Added Failure Mode 7.

**§26 drift review:** All 7 prompts reviewed. All pass — no new drift detected. No prompt text rewrites required. 2 targeted gap-closing improvements applied (2 test scenarios). See Session 7 drift review table below.

**Trigger tests:** 16/16 Session 6 scenarios re-verified (no regressions) + 2 new scenarios = 18/18 pass:
1. Chat (personal) — LOW confidence → explicit uncertainty — ✅ PASS
2. Chat (household) — LOW confidence → uncertainty + clarification offer — ✅ PASS

---

### Session 6 — 2026-04-05T00:00 (maintenance run)
**Changes this session:**
- `docs/prompts/closure-prompt.md` — added Scenario 5: MANUAL_RESOLVED. This was the only resolution type listed in the prompt with no test scenario. Documents the behavioral distinction from COVERAGE_CONFIRMED: MANUAL_RESOLVED means a parent called it done, not that Kin confirmed coverage. Added Failure Mode 6: model treating MANUAL_RESOLVED as if coverage is confirmed (risks false assurance).
- `docs/prompts/alert-prompt.md` — added Scenario 6: LATE_SCHEDULE_CHANGE + YELLOW + parent_b AVAILABLE → direct assignment. The §3C + §16 intersection was previously tested only in trigger-test-log.md (Session 3 new test) but not in the prompt file itself. Closing the gap: all §16 tone cases (collaborative, direct assignment, coordination prompt) now demonstrated at the prompt-file level for both PICKUP_RISK and LATE_SCHEDULE_CHANGE trigger types. Added Failure Mode 6: late-change framing can cause the model to default to coordination-prompt tone even when one parent is clearly AVAILABLE.
- `docs/prompts/first-use-prompt.md` — added Scenario 5: MEDIUM confidence → fallback. The spec states HIGH confidence only for live first-use insight. The MEDIUM case was previously untested (LOW was tested in Scenarios 3–4). Added Failure Mode 6: route assigning HIGH confidence when data only warrants MEDIUM, causing the engineered first moment to surface uncertain information.
- `docs/prompts/household-chat-prompt.md` — added Failure Mode 6: "I'll take it off the list" promise requires route support. Scenario 3's expected output ("I'll take it off the list") implies the route writes `coordination_issues.state = RESOLVED` when a parent reports resolution in the household thread. Without this, Kin makes a promise that doesn't execute — visible contradiction between chat output and the persistent OPEN alert. Flag for Lead Eng wiring S3-LE-02.

**§26 drift review:** All 7 prompts reviewed. All pass — no new drift detected. No prompt text rewrites required. 4 targeted gap-closing improvements applied (3 test scenarios + 1 failure mode note). See Session 6 drift review table below.

**Trigger tests:** 13/13 Session 5 scenarios re-verified (no regressions) + 3 new scenarios = 16/16 pass:
1. Closure — MANUAL_RESOLVED → acknowledgment without false coverage assertion — ✅ PASS
2. Alert — LATE_SCHEDULE_CHANGE + YELLOW + AVAILABLE parent → direct assignment — ✅ PASS
3. First-use — MEDIUM confidence → fallback — ✅ PASS

**New implementation flag for Lead Eng (from Session 6):**
- Household thread route (S3-LE-02) must listen for user-reported resolution signals ("We sorted it", "I've got it", etc.) and write `coordination_issues.state = RESOLVED` before Kin generates the acknowledgment. Without this, Kin says "I'll take it off the list" while the alert card remains OPEN. See household-chat-prompt.md Failure Mode 6.
- First-use confidence derivation: route must only assign `confidence: HIGH` when a §3A/§3C coordination trigger would fire. MEDIUM confidence (unconfirmed event, no known conflict) → fallback is correct. See first-use-prompt.md Scenario 5 and Failure Mode 6.

---

### Session 5 — 2026-04-04T22:00 (maintenance run)
**Changes this session:**
- `morning-briefing-prompt.md` — added Scenario 6: repeat suppression BYPASSED when issue state has changed (same `issue_id` but `last_coordination_change.added_at` > `surfaced_at`). This is the critical inverse of Scenario 4 (suppress unchanged) — without this test, the bypass branch of suppression logic was untested. Added Failure Mode 6: unrelated schedule change incorrectly triggering bypass. Route implementation note: scope bypass check to same issue_id.
- `alert-prompt.md` — added Scenario 5: LOW confidence → null. The spec explicitly lists LOW → null in OUTPUT FORMAT; previously untested. Distinction from MEDIUM (Scenario 2) documented: MEDIUM = partial info, coordination prompt warranted; LOW = data too ambiguous to characterize the gap at all.
- `checkin-prompt.md` — added Scenario 5: UPCOMING_LOGISTICS observation_type. All three observation_types (CONFIRMATION_PENDING, SOFT_COORDINATION, UPCOMING_LOGISTICS) now have at least one test scenario. Demonstrates soft logistics notice that is not an alert — forward-looking, calm, no urgency vocabulary.
- `chat-prompt.md` — added route implementation note on `conversation_history` N (≥ 10 recommended). No spec change; clarifies a wiring requirement for the no-repetition rule to function correctly in production.
- `household-chat-prompt.md` — same `conversation_history` N note added. Parallel to chat-prompt.md.

**§26 drift review:** All 7 prompts reviewed. All pass — no new drift detected. No rewrites required. See Session 5 drift review table below.
**Trigger tests:** 10/10 previous pass re-verified (no regressions) + 3 new scenarios = 13/13 pass. See results below.

### Session 4 — 2026-04-04T12:00 (maintenance run)
**Changes this session:**
- `morning-briefing-prompt.md` — added Scenario 5: time-based relief phrase ("I'll remind you when it's time to leave") tested with hard departure deadline. Validates correct phrase selection when coverage is confirmed but a specific departure time exists. No spec changes; test coverage improvement only.
- `checkin-prompt.md` — added `last_surfaced_at: null` to Scenario 2 input. Minor schema consistency fix — field was added to INPUT FORMAT in S3; scenarios should reflect it explicitly. No behavioral change (null = no suppression applies).
- `household-chat-prompt.md` — added Scenario 5: no-repetition rule in household thread (parallel to `chat-prompt.md` Scenario 5, added S3). Status-confirmation pattern demonstrated ("Still just Maya's 3:30 — nothing else open right now.").

**§26 drift review:** All 7 prompts reviewed (6 existing + `household-chat-prompt.md` formally reviewed for first time — was created S3 but not logged). All pass.
**Trigger tests:** 8/8 pass (re-verified) + 2 new scenarios = 10/10 pass. See results below.

---

### Session 3 — 2026-04-04T10:00 (maintenance run)
**Changes this session:**
- `morning-briefing-prompt.md` — added `last_surfaced_insight` to INPUT FORMAT; added repeat-suppression instruction; added Scenario 4: repeat insight suppressed (was in failure modes, field was missing from input schema — now fixed)
- `checkin-prompt.md` — added `last_surfaced_at` to INPUT FORMAT; added repeat-suppression rule; fixed Scenario 1 `prompt` field from "Want me to flag it...?" (permission-seeking) to "I'll flag it if it's still open by 3." (exact conditional relief phrase); added Scenario 4: repeat suppression; added failure mode #6 documenting the permission-asking fix
- `chat-prompt.md` — added Scenario 5: no-repetition rule demonstrated with same-insight follow-up question
- `household-chat-prompt.md` — **NEW FILE** created to close structural gap (household thread had no IE prompt; `chat-prompt.md` governs personal thread only; this gap would have caused S3 wiring to use wrong prompt)

**§26 drift review:** All 6 existing prompts passed (Session 3). 3 targeted fixes applied. See results below.
**Trigger tests:** All 7 existing + 1 new §3C YELLOW direct-assignment scenario = 8/8 pass. See results below.

---

## §26 DRIFT REVIEW — SESSION 11 (2026-04-06T02:00)

Review question: *"Would this feel helpful to a busy, slightly stressed user?"*

| Prompt | Unnecessary preamble | Stacked hedges | Generic reassurance | Insights that change nothing | Over-explained silence | Compression without specificity | Verdict |
|--------|---------------------|----------------|---------------------|------------------------------|------------------------|--------------------------------|---------|
| morning-briefing-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |
| alert-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |
| checkin-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |
| chat-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |
| household-chat-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |
| closure-prompt.md | ✅ Blocked | N/A | ✅ Blocked | ✅ Blocked | N/A | ✅ Blocked | **PASS** |
| first-use-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |

**Session 11 improvements applied (no system prompt text changed — test coverage and failure mode additions only):**
- `household-chat-prompt.md`: Scenario 8 closes the ACKNOWLEDGED state gap in the household thread. The existing system prompt correctly instructs `open_coordination_issues: array of OPEN/ACKNOWLEDGED items` but gave no behavioral distinction for ACKNOWLEDGED — the new scenario closes this at the test level. Failure Mode 9 documents the re-alerting risk.
- `checkin-prompt.md`: Scenario 7 closes the LOW confidence null-return gap. The system prompt already contained the rule ("Low → return null"); the scenario makes it testable and completes the suppression precedence taxonomy.
- `morning-briefing-prompt.md`: Scenario 9 closes the LOW confidence null-return gap. System prompt already contained the rule ("Low confidence → return null"); the scenario gives it a distinct identity from CLEAR (Scenario 3) and repeat suppression (Scenarios 4/7).

**All 7 prompts passed §26 drift review (Session 11). No rewrites required.**

---

## TRIGGER SCENARIO TESTS — SESSION 11

All 27 previous scenarios re-verified (no regressions). 3 new scenarios added.

### Household Chat — ACKNOWLEDGED Issue, Both-Parent Framing ← NEW SESSION 11
**Context:** `household_thread: true | open_coordination_issues: [{ trigger: PICKUP_RISK, child: Leo, time: 17:30, state: ACKNOWLEDGED, parent_a: CONFLICTED, parent_b: CONFLICTED }] | conversation_history: []`
**User (either parent):** "What's happening with Leo's pickup?"
**Expected:**
```json
"Leo's 5:30 is flagged and acknowledged — has it been sorted between you?"
```
**Result:** ✅ PASS — ACKNOWLEDGED state reflected without OPEN urgency. "Between you" framing correct for household thread context — avoids attributing acknowledgment to one parent. 1 sentence. No forbidden opener. Consistent with §16 neutral framing.

**Note 21:** This scenario is the household-thread symmetric of chat-prompt.md Scenario 8 (personal thread ACKNOWLEDGED, added Session 10). Gap identified: household-chat-prompt.md's `open_coordination_issues` field specification listed OPEN and ACKNOWLEDGED items but the prompt gave no differentiated guidance for ACKNOWLEDGED in the household context. Scenario 8 + Failure Mode 9 close this at the test level. The system prompt's existing instruction was already correct behavior — the test makes it explicit and testable.

---

### Check-In — LOW Confidence → Null (Confidence-Based Suppression) ← NEW SESSION 11
**Input:** `observation_type: SOFT_COORDINATION | upcoming_event: { time: 18:30, type: dinner_plan, assigned: both, confirmed: false } | household_has_open_high_priority_alert: false | checkins_generated_today: 0 | last_surfaced_at: null | confidence: LOW`
**Expected:** `null`
**Result:** ✅ PASS — LOW confidence → no check-in generated. No other suppression condition triggered; the sole reason for null is insufficient confidence. Completes the four-case null-return taxonomy: alert suppression, repeat suppression, frequency cap, and LOW confidence are each now explicitly tested with a named scenario.

**Note 22:** The checkin system prompt had the LOW→null rule in both OUTPUT RULES and the OUTPUT FORMAT return conditions, but no named test scenario. The suppression precedence note in Scenario 6 listed only 3 cases; Scenario 7 adds the 4th. Route note: LOW confidence is determined before calling the prompt; if the route gates on the confidence score, it may skip the call entirely (same pattern as the checkins_generated_today gate from S9). Both paths produce the same result — Scenario 7 validates the prompt-level path.

---

### Morning Briefing — LOW Confidence → Null (Distinct from CLEAR) ← NEW SESSION 11
**Input:** `today_events: [parent_a meeting at 15:00, parent_b appointment at 15:00 (time unconfirmed)] | pickup_assignments: [{ child: Maya, time: 15:30, assigned: null, conflict: null }] | household_conflicts: [] | last_coordination_change: null | last_surfaced_insight: null | current_time: 07:30 | confidence: LOW`
**Expected:** `null`
**Result:** ✅ PASS — LOW confidence → null returned. Potential coordination gap exists in the data (both parents at 3pm, pickup unassigned) but the system cannot confirm an actual conflict — parent_b's appointment time is unconfirmed. Distinguishes from Scenario 3 (CLEAR: nothing to surface) and Scenarios 4/7 (repeat suppression). Completes the morning-briefing null-path taxonomy.

**Note 23:** The morning-briefing null-path taxonomy is now fully tested across three distinct cases: CLEAR (confirmed coverage, nothing to surface), suppression (same issue, unchanged), and LOW confidence (potential issue, data too ambiguous to surface). A LOW-confidence morning briefing is a trust-eroding failure mode — if the parent acts on a false alarm, they learn to dismiss Kin. Silence is the correct output when the system is not confident it is right. This also closes a minor asymmetry: alert-prompt.md Scenario 5 (added Session 5) and checkin-prompt.md Scenario 7 (added this session) both have named LOW-confidence test scenarios; morning-briefing now has the same.

---

## §26 DRIFT REVIEW — SESSION 9 (2026-04-05T06:00)

Review question: *"Would this feel helpful to a busy, slightly stressed user?"*

| Prompt | Unnecessary preamble | Stacked hedges | Generic reassurance | Insights that change nothing | Over-explained silence | Compression without specificity | Verdict |
|--------|---------------------|----------------|---------------------|------------------------------|------------------------|--------------------------------|---------|
| morning-briefing-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |
| alert-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |
| checkin-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |
| chat-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |
| household-chat-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |
| closure-prompt.md | ✅ Blocked | N/A | ✅ Blocked | ✅ Blocked | N/A | ✅ Blocked | **PASS** |
| first-use-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |

**Session 9 improvements applied (no spec changes — test coverage and documentation only):**
- `alert-prompt.md`: Scenario 7 closes §3C CLEAR gap at prompt-file level. Scenario 8 closes §3C YELLOW both-UNCONFIRMED gap at prompt-file level. All §3C + §16 tone intersections now documented in the prompt file, not just in the trigger log.
- `checkin-prompt.md`: Scenario 6 closes the frequency-cap suppression gap. All three null-return paths now tested.

**All 7 prompts passed §26 drift review (Session 9). No rewrites required.**

---

## TRIGGER SCENARIO TESTS — SESSION 9

All 21 previous scenarios re-verified (no regressions). 3 new scenarios added.

### Alert — §3C CLEAR, Late Change Resolves Coverage ← NEW SESSION 9
**Input:** `trigger_type: LATE_SCHEDULE_CHANGE | severity: CLEAR | parent_a_status: AVAILABLE | parent_b_status: AVAILABLE | change_description: "Parent A meeting cancelled — now free for pickup" | affected_child: Maya | event_window: 15:30 | confidence: HIGH`
**Expected:** `null`
**Result:** ✅ PASS — CLEAR severity regardless of trigger type → silence. Coverage confirmed = no alert written. Route must not create a `coordination_issues` record for CLEAR events. Closes the §3C CLEAR prompt-file gap: Session 2 trigger-log tested this case; alert-prompt.md Scenario 7 now documents it at the file level. Scenario 4 (§3A CLEAR) and Scenario 7 (§3C CLEAR) together cover both trigger types for the silence case.

---

### Alert — §3C YELLOW, Both Parents UNCONFIRMED → Coordination Prompt ← NEW SESSION 9
**Input:** `trigger_type: LATE_SCHEDULE_CHANGE | severity: YELLOW | parent_a_status: UNCONFIRMED | parent_b_status: UNCONFIRMED | change_description: "Parent A calendar shows cleared block at 3pm — unclear if cancelled or rescheduled" | affected_child: Maya | event_window: 15:30 | confidence: MEDIUM`
**Expected:**
```json
{
  "content": "A schedule change may affect Maya's 3:30 pickup — worth a quick check between you.",
  "severity": "YELLOW",
  "trigger_type": "LATE_SCHEDULE_CHANGE"
}
```
**Result:** ✅ PASS — LATE_SCHEDULE_CHANGE + both UNCONFIRMED → coordination prompt, not direct assignment. MEDIUM confidence → one qualifier ("may"). [What changed] — [implication] format maintained. 1 sentence. No forbidden opener. Distinguishes from Scenario 6 (§3C YELLOW + one AVAILABLE = direct assignment): when neither parent's status is confirmed, responsibility cannot be assigned — coordination prompt is the only correct tone. All §3C + §16 tone cases now covered at prompt-file level: Scenario 3 (RED, both conflicted → collaborative), Scenario 6 (YELLOW, one AVAILABLE → direct assignment), Scenario 7 (CLEAR → silence), Scenario 8 (YELLOW, both UNCONFIRMED → coordination prompt).

---

### Check-In — Frequency Cap Triggered ← NEW SESSION 9
**Input:** `observation_type: CONFIRMATION_PENDING | upcoming_event: {time: 19:00, type: school_event, child: Leo, assigned_parent: parent_a, confirmed: false} | household_has_open_high_priority_alert: false | checkins_generated_today: 2 | last_surfaced_at: null | confidence: HIGH`
**Expected:** `null`
**Result:** ✅ PASS — Frequency cap enforced. `checkins_generated_today: 2` = maximum reached. Silence returned regardless of observation type (CONFIRMATION_PENDING), confidence (HIGH), or whether the event is worth surfacing (it is). The cap is a hard ceiling. Route implementation note: route must confirm count before calling prompt; do not call if count >= 2. All three checkin suppression paths now tested: Scenario 3 (open high-priority alert → suppress), Scenario 4 (repeat within 24h → suppress), Scenario 9 (frequency cap → suppress).

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
| §3C — YELLOW (late change, one parent responsible — direct assignment) | S3 NEW | ✅ PASS |
| Morning briefing — time-based relief phrase (hard departure deadline) | S4 NEW | ✅ PASS |
| §3C — YELLOW (late change, both UNCONFIRMED — coordination prompt, not assignment) | S4 NEW | ✅ PASS |
| Morning briefing — repeat suppression BYPASSED (same issue, status changed) | S5 NEW | ✅ PASS |
| Alert — LOW confidence → null | S5 NEW | ✅ PASS |
| Checkin — UPCOMING_LOGISTICS observation_type | S5 NEW | ✅ PASS |
| Closure — MANUAL_RESOLVED → acknowledgment without coverage assertion | S6 NEW | ✅ PASS |
| Alert — LATE_SCHEDULE_CHANGE + YELLOW + AVAILABLE → direct assignment | S6 NEW | ✅ PASS |
| First-use — MEDIUM confidence → fallback | S6 NEW | ✅ PASS |
| Chat (personal) — LOW confidence → explicit uncertainty | S7 NEW | ✅ PASS |
| Chat (household) — LOW confidence → uncertainty + clarification offer | S7 NEW | ✅ PASS |
| Morning briefing — different issue_id, suppression does not apply | S8 NEW | ✅ PASS |
| Chat (personal) — RESOLVED issue query → direct status update | S8 NEW | ✅ PASS |
| Household chat — attribution question → neutral framing deflection | S8 NEW | ✅ PASS |
| Alert — §3C CLEAR → null (change resolves coverage) | S9 NEW | ✅ PASS |
| Alert — §3C YELLOW + both UNCONFIRMED → coordination prompt | S9 NEW | ✅ PASS |
| Checkin — frequency cap (checkins_generated_today >= 2) → null | S9 NEW | ✅ PASS |
| Morning briefing — multiple open issues → primary (RED) surfaced, secondary in supporting_detail | S10 NEW | ✅ PASS |
| Chat (personal) — ACKNOWLEDGED issue query → status-aware response, no re-alerting | S10 NEW | ✅ PASS |
| Chat (personal) — parent reports resolution → acknowledgment + route must write RESOLVED | S10 NEW | ✅ PASS |
| §26 drift review — all 7 prompts | S1–S10 | ✅ PASS |

**27/27 trigger tests passed. All 7 prompts passed §26 drift review (Session 10).**

---

## §26 DRIFT REVIEW — SESSION 8 (2026-04-05T04:00)

Review question: *"Would this feel helpful to a busy, slightly stressed user?"*

| Prompt | Unnecessary preamble | Stacked hedges | Generic reassurance | Insights that change nothing | Over-explained silence | Compression without specificity | Verdict |
|--------|---------------------|----------------|---------------------|------------------------------|------------------------|--------------------------------|---------|
| morning-briefing-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |
| alert-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |
| checkin-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |
| chat-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |
| household-chat-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |
| closure-prompt.md | ✅ Blocked | N/A | ✅ Blocked | ✅ Blocked | N/A | ✅ Blocked | **PASS** |
| first-use-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |

**Session 8 improvements applied (no spec changes — test coverage and failure mode documentation only):**
- `morning-briefing-prompt.md`: Scenario 7 closes the third suppression-logic branch (different issue_id = surface normally). Failure Mode 7 flags wrong-issue suppression. All suppression cases (suppress, bypass, no-apply) now each have a dedicated test scenario.
- `chat-prompt.md`: Scenario 7 covers resolved-issue query. Tests status-update behavior distinct from the no-repetition rule (Scenario 5). All issue state transitions now represented in chat test coverage.
- `household-chat-prompt.md`: Scenario 7 covers attribution question under §16 neutral framing. Failure Mode 8 flags attribution drift when "your partner" is used in household context.

**All 7 prompts passed §26 drift review (Session 8). No rewrites required.**

---

## TRIGGER SCENARIO TESTS — SESSION 8

All 18 previous scenarios re-verified (no regressions). 3 new scenarios added.

### Morning Briefing — Different Issue Today, No Suppression ← NEW SESSION 8
**Input:** `last_surfaced_insight: { issue_id: "pickup-maya-1530-2026-04-04", surfaced_at: "2026-04-04T07:30" } | today's issue: Leo 5:30 pickup, parent_a late meeting | last_coordination_change: null | current_time: 2026-04-05T07:30`
**Expected:**
```json
{
  "primary_insight": "A late meeting leaves Leo's 5:30 pickup without a confirmed handler.",
  "supporting_detail": "Worth sorting with your partner before end of day.",
  "relief_line": "I'll keep an eye on it."
}
```
**Result:** ✅ PASS — Suppression does not apply. `last_surfaced_insight.issue_id` is `pickup-maya-1530-2026-04-04`; today's issue is Leo's 5:30 — a different issue_id. Model surfaces today's issue normally. This closes the third branch of the suppression logic: Scenario 4 = same issue/no change → suppress; Scenario 6 = same issue/changed → bypass; Scenario 7 = different issue → surface normally. All three suppression paths now tested. No qualifier (HIGH confidence — parent_a meeting is confirmed conflict). Relief line "I'll keep an eye on it" correct: parent_b is UNCONFIRMED, Kin is watching for resolution.

---

### Chat (Personal Thread) — RESOLVED Issue Query ← NEW SESSION 8
**Input:** `speaking_to: parent_a | open_coordination_issues: [] | recent_schedule_changes: [] | conversation_history: [{role: "user", content: "What do I need to know today?"}, {role: "kin", content: "Maya's 3:30 pickup has no one confirmed — you're both tied up at that time. Worth sorting before noon."}]`
**User:** "Is Maya's pickup still an issue?"
**Expected:** `"Maya's 3:30 is sorted — your partner's on it."`
**Result:** ✅ PASS — Resolved status surfaced directly. 1 sentence. Specific (child + time + resolution). No residual urgency triggered by "still an issue" in the question. Consistent with `open_coordination_issues: []` — issue is gone, Kin updates accordingly. Distinguishes correctly from Scenario 5 (no-repetition — same status, still OPEN): Scenario 7 is a status change to RESOLVED, not a repeat of the same open state.

---

### Household Chat — Attribution Question, Neutral Framing Maintained ← NEW SESSION 8
**Input:** `household_thread: true | recent_schedule_changes: [{type: LATE_SCHEDULE_CHANGE, changed_by: parent_a, description: "Work dinner added at 5pm", affects: "Leo 5:30 pickup"}] | open_coordination_issues: [{trigger: LATE_SCHEDULE_CHANGE, child: Leo, time: 17:30, parent_a: CONFLICTED, parent_b: UNCONFIRMED}] | conversation_history: []`
**User (parent_b):** "Who put this on the calendar?"
**Expected:** `"A schedule change was added last night — it's still worth deciding who handles Leo's 5:30."`
**Result:** ✅ PASS — Does not name parent_a. `changed_by: parent_a` is present in data but suppressed in output per §16 household neutral framing. Attribution question deflected: Kin acknowledges the disruption ("a schedule change was added") and pivots to the coordination action ("deciding who handles Leo's 5:30"). MEDIUM confidence appropriate (parent_b UNCONFIRMED). 1 sentence. No forbidden opener. Validates that §16 neutral framing applies to direct attribution questions, not just proactive output.

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
| §3C — YELLOW (late change, one parent responsible — direct assignment) | S3 NEW | ✅ PASS |
| Morning briefing — time-based relief phrase (hard departure deadline) | S4 NEW | ✅ PASS |
| §3C — YELLOW (late change, both UNCONFIRMED — coordination prompt, not assignment) | S4 NEW | ✅ PASS |
| Morning briefing — repeat suppression BYPASSED (same issue, status changed) | S5 NEW | ✅ PASS |
| Alert — LOW confidence → null | S5 NEW | ✅ PASS |
| Checkin — UPCOMING_LOGISTICS observation_type | S5 NEW | ✅ PASS |
| Closure — MANUAL_RESOLVED → acknowledgment without coverage assertion | S6 NEW | ✅ PASS |
| Alert — LATE_SCHEDULE_CHANGE + YELLOW + AVAILABLE → direct assignment | S6 NEW | ✅ PASS |
| First-use — MEDIUM confidence → fallback | S6 NEW | ✅ PASS |
| Chat (personal) — LOW confidence → explicit uncertainty | S7 NEW | ✅ PASS |
| Chat (household) — LOW confidence → uncertainty + clarification offer | S7 NEW | ✅ PASS |
| Morning briefing — different issue_id, suppression does not apply | S8 NEW | ✅ PASS |
| Chat (personal) — RESOLVED issue query → direct status update | S8 NEW | ✅ PASS |
| Household chat — attribution question → neutral framing deflection | S8 NEW | ✅ PASS |
| §26 drift review — all 7 prompts | S1–S8 | ✅ PASS |

**21/21 trigger tests passed. All 7 prompts passed §26 drift review (Session 8).**

---

## §26 DRIFT REVIEW — SESSION 7 (2026-04-05T02:00)

Review question: *"Would this feel helpful to a busy, slightly stressed user?"*

| Prompt | Unnecessary preamble | Stacked hedges | Generic reassurance | Insights that change nothing | Over-explained silence | Compression without specificity | Verdict |
|--------|---------------------|----------------|---------------------|------------------------------|------------------------|--------------------------------|---------|
| morning-briefing-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |
| alert-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |
| checkin-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |
| chat-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |
| household-chat-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |
| closure-prompt.md | ✅ Blocked | N/A | ✅ Blocked | ✅ Blocked | N/A | ✅ Blocked | **PASS** |
| first-use-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |

**Session 7 improvements applied (no spec changes — test coverage and failure mode documentation only):**
- `chat-prompt.md`: Scenario 6 closes the LOW confidence gap. Failure Mode 6 flags the silence-instead-of-uncertainty failure.
- `household-chat-prompt.md`: Scenario 6 closes the LOW confidence gap with household-appropriate clarification-offer framing. Failure Mode 7 added.

**All 7 prompts passed §26 drift review (Session 7). No rewrites required.**

---

## TRIGGER SCENARIO TESTS — SESSION 7

All 16 previous scenarios re-verified (no regressions). 2 new scenarios added.

### Chat (Personal Thread) — LOW Confidence → Explicit Uncertainty ← NEW SESSION 7
**Input:** `speaking_to: parent_a | today_events: [] | pickup_assignments: [Leo 15:30, parent_b, confirmed: false] | open_coordination_issues: [] | recent_schedule_changes: [] | conversation_history: []`
**User:** "Did my partner say anything about being late today?"
**Expected:** `"I don't have enough information on that right now."`
**Result:** ✅ PASS — LOW confidence (question about intent/communication not in household data). Direct uncertainty statement. 1 sentence. Not silence (parent asked; needs a response). Not a redirect (coordination-adjacent question, not out of scope). Not speculation ("Based on the schedule..." would be hallucination). Consistent with §23 LOW confidence rule for chat. Personal-thread version of LOW confidence response tested for first time.

---

### Chat (Household Thread) — LOW Confidence → Uncertainty + Clarification Offer ← NEW SESSION 7
**Input:** `household_thread: true | today_events: [] | pickup_assignments: [] | open_coordination_issues: [] | recent_schedule_changes: [] | conversation_history: []`
**User (either parent):** "Something's changed with tomorrow — does that affect anything?"
**Expected:** `"I don't have enough to go on here — do you want to walk me through what changed?"`
**Result:** ✅ PASS — LOW confidence (parent referenced a change not yet in household data). States uncertainty and invites both parents to contribute context. 1 sentence. No forbidden opener. No speculation. §16 collaborative framing maintained: the clarification offer is addressed to the household ("you"), not directed at either parent individually. Distinguishes from personal-thread LOW confidence (terminal statement vs. collaborative invite). Household-thread version of LOW confidence response tested for first time.

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
| §3C — YELLOW (late change, one parent responsible — direct assignment) | S3 NEW | ✅ PASS |
| Morning briefing — time-based relief phrase (hard departure deadline) | S4 NEW | ✅ PASS |
| §3C — YELLOW (late change, both UNCONFIRMED — coordination prompt, not assignment) | S4 NEW | ✅ PASS |
| Morning briefing — repeat suppression BYPASSED (same issue, status changed) | S5 NEW | ✅ PASS |
| Alert — LOW confidence → null | S5 NEW | ✅ PASS |
| Checkin — UPCOMING_LOGISTICS observation_type | S5 NEW | ✅ PASS |
| Closure — MANUAL_RESOLVED → acknowledgment without coverage assertion | S6 NEW | ✅ PASS |
| Alert — LATE_SCHEDULE_CHANGE + YELLOW + AVAILABLE → direct assignment | S6 NEW | ✅ PASS |
| First-use — MEDIUM confidence → fallback | S6 NEW | ✅ PASS |
| Chat (personal) — LOW confidence → explicit uncertainty | S7 NEW | ✅ PASS |
| Chat (household) — LOW confidence → uncertainty + clarification offer | S7 NEW | ✅ PASS |
| §26 drift review — all 7 prompts | S1–S7 | ✅ PASS |

**18/18 trigger tests passed. All 7 prompts passed §26 drift review (Session 7).**

---

## §26 DRIFT REVIEW — SESSION 6 (2026-04-05T00:00)

Review question: *"Would this feel helpful to a busy, slightly stressed user?"*

| Prompt | Unnecessary preamble | Stacked hedges | Generic reassurance | Insights that change nothing | Over-explained silence | Compression without specificity | Verdict |
|--------|---------------------|----------------|---------------------|------------------------------|------------------------|--------------------------------|---------|
| morning-briefing-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |
| alert-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |
| checkin-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |
| chat-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |
| household-chat-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |
| closure-prompt.md | ✅ Blocked | N/A | ✅ Blocked | ✅ Blocked | N/A | ✅ Blocked | **PASS** |
| first-use-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |

**Session 6 improvements applied (no spec changes — test coverage and failure mode documentation only):**
- `closure-prompt.md`: Scenario 5 closes the MANUAL_RESOLVED gap (only un-tested resolution type). Failure Mode 6 flags false coverage assertion risk.
- `alert-prompt.md`: Scenario 6 closes the §3C + direct-assignment gap at the prompt-file level. Failure Mode 6 flags late-change framing defaulting to coordination-prompt tone.
- `first-use-prompt.md`: Scenario 5 closes the MEDIUM confidence case. Failure Mode 6 flags route confidence over-assignment.
- `household-chat-prompt.md`: Failure Mode 6 documents route dependency for "I'll take it off the list" resolution acknowledgment.

**All 7 prompts passed §26 drift review (Session 6). No rewrites required.**

---

## TRIGGER SCENARIO TESTS — SESSION 6

All 13 previous scenarios re-verified (no regressions). 3 new scenarios added.

### Closure — MANUAL_RESOLVED → Acknowledgment Without Coverage Assertion ← NEW SESSION 6
**Input:** `resolution_type: MANUAL_RESOLVED | affected_child: Maya | event_time: 15:30 | resolved_by: parent_a | original_trigger: PICKUP_RISK | original_content: "Maya's 3:30 pickup has no coverage — you're both tied up."`
**Expected:**
```json
{
  "closure_line": "Maya's 3:30 is marked resolved — taking it off today's list."
}
```
**Result:** ✅ PASS — Acknowledges the manual close without asserting coverage. Specific (child + time). 1 sentence. No enthusiasm. No false confirmation ("covered" would be wrong — coverage was not confirmed, a parent simply closed the issue). Distinguishes MANUAL_RESOLVED from COVERAGE_CONFIRMED. All 4 resolution types now tested at the prompt level.

---

### Alert — LATE_SCHEDULE_CHANGE + YELLOW + Parent AVAILABLE → Direct Assignment ← NEW SESSION 6
**Input:** `trigger_type: LATE_SCHEDULE_CHANGE | severity: YELLOW | event_window: 15:30 | affected_child: Leo | parent_a_status: CONFLICTED | parent_b_status: AVAILABLE | change_description: "Parent A meeting extended to 4pm" | confidence: HIGH`
**Expected:**
```json
{
  "content": "A 4pm meeting extension puts Leo's 3:30 pickup on you — your partner's tied up.",
  "severity": "YELLOW",
  "trigger_type": "LATE_SCHEDULE_CHANGE"
}
```
**Result:** ✅ PASS — LATE_SCHEDULE_CHANGE format ([what changed] — [implication]) with direct assignment (parent_b AVAILABLE, HIGH confidence = no qualifier). §16 tone rule confirmed to apply regardless of trigger type. 1 sentence. No forbidden opener. Closes the prompt-file gap: previously only in trigger log (Session 3 new test), now also in `alert-prompt.md` as Scenario 6. Alert prompt now has §16 direct-assignment case covered for both PICKUP_RISK (Scenario 3b) and LATE_SCHEDULE_CHANGE (Scenario 6).

---

### First-Use — MEDIUM Confidence → Fallback ← NEW SESSION 6
**Input:** `household_data_available: true | today_events: [parent_a pickup 15:30] | upcoming_pickups: [Maya 15:30, assigned: parent_a, confirmed: false] | household_conflicts: [] | confidence: MEDIUM`
**Expected:**
```json
{
  "first_insight": "I'm watching your household schedule. The moment something needs your attention, I'll surface it.",
  "is_fallback": true
}
```
**Result:** ✅ PASS — MEDIUM confidence → fallback. Exact fallback text. `is_fallback: true`. Validates that the HIGH-only rule applies: an unconfirmed pickup with no known conflict is MEDIUM confidence — not the right foundation for the engineered first-use moment. First-use confidence coverage now complete: HIGH (Scenarios 1–2), LOW (Scenarios 3–4), MEDIUM (Scenario 5).

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
| §3C — YELLOW (late change, one parent responsible — direct assignment) | S3 NEW | ✅ PASS |
| Morning briefing — time-based relief phrase (hard departure deadline) | S4 NEW | ✅ PASS |
| §3C — YELLOW (late change, both UNCONFIRMED — coordination prompt, not assignment) | S4 NEW | ✅ PASS |
| Morning briefing — repeat suppression BYPASSED (same issue, status changed) | S5 NEW | ✅ PASS |
| Alert — LOW confidence → null | S5 NEW | ✅ PASS |
| Checkin — UPCOMING_LOGISTICS observation_type | S5 NEW | ✅ PASS |
| Closure — MANUAL_RESOLVED → acknowledgment without coverage assertion | S6 NEW | ✅ PASS |
| Alert — LATE_SCHEDULE_CHANGE + YELLOW + AVAILABLE → direct assignment | S6 NEW | ✅ PASS |
| First-use — MEDIUM confidence → fallback | S6 NEW | ✅ PASS |
| §26 drift review — all 7 prompts | S1+S2+S3+S4+S5+S6 | ✅ PASS |

**16/16 trigger tests passed. All 7 prompts passed §26 drift review (Session 6).**

---

## §26 DRIFT REVIEW — SESSION 5 (2026-04-04T22:00)

Review question: *"Would this feel helpful to a busy, slightly stressed user?"*

| Prompt | Unnecessary preamble | Stacked hedges | Generic reassurance | Insights that change nothing | Over-explained silence | Compression without specificity | Verdict |
|--------|---------------------|----------------|---------------------|------------------------------|------------------------|--------------------------------|---------|
| morning-briefing-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |
| alert-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |
| checkin-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |
| chat-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |
| household-chat-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |
| closure-prompt.md | ✅ Blocked | N/A | ✅ Blocked | ✅ Blocked | N/A | ✅ Blocked | **PASS** |
| first-use-prompt.md | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | ✅ Blocked | **PASS** |

**Session 5 improvements applied (no spec changes — test coverage and implementation clarity only):**
- `morning-briefing-prompt.md`: Scenario 6 closes the "bypass suppression when changed" branch; Failure Mode 6 warns against unrelated-change bypass. Critical path for correct repeat-suppression behavior.
- `alert-prompt.md`: Scenario 5 confirms LOW confidence = null. Previously implicit; now tested.
- `checkin-prompt.md`: Scenario 5 closes UPCOMING_LOGISTICS gap — all 3 observation_types now tested.
- `chat-prompt.md` + `household-chat-prompt.md`: conversation_history N ≥ 10 note added for Lead Eng. No prompt text changed.

**All 7 prompts passed §26 drift review (Session 5). No rewrites required.**

---

## TRIGGER SCENARIO TESTS — SESSION 5

All 10 previous scenarios re-verified (no regressions). 3 new scenarios added.

### Morning Briefing — Repeat Suppression BYPASSED (Issue Changed) ← NEW SESSION 5
**Input:** `issue_id: pickup-maya-1530-2026-04-04 | surfaced_at: 2026-04-04T07:30 | last_coordination_change: SCHEDULE_ADJUSTED (parent_b standup moved, added_at: 2026-04-05T06:45) | parent_b: now free at 3pm | current_time: 2026-04-05T07:30`
**Expected:**
```json
{
  "primary_insight": "Maya's 3:30 pickup now looks like it's on your partner — their standup moved and they're free by 3.",
  "supporting_detail": null,
  "relief_line": "I'll flag it if anything changes."
}
```
**Result:** ✅ PASS — Suppression bypassed correctly: `last_coordination_change.added_at` (06:45 today) > `surfaced_at` (07:30 yesterday). MEDIUM confidence (one qualifier: "looks like") appropriate since parent_b status updated but not yet AVAILABLE-confirmed. Framing updated to reflect changed situation. This validates the bypass branch of suppression logic — the critical inverse of Scenario 4.

---

### Alert — LOW Confidence → Null ← NEW SESSION 5
**Input:** `trigger_type: PICKUP_RISK | severity: YELLOW | parent_a: UNCONFIRMED | parent_b: UNCONFIRMED | confidence: LOW`
**Expected:** `null`
**Result:** ✅ PASS — Silence for LOW confidence. Data too ambiguous to characterize the gap. No coordination_issues record written. Distinction from MEDIUM confirmed: MEDIUM has at least one CONFLICTED parent (partial information), LOW has all UNCONFIRMED (no information). Route must handle null gracefully.

---

### Checkin — UPCOMING_LOGISTICS ← NEW SESSION 5
**Input:** `observation_type: UPCOMING_LOGISTICS | upcoming_event: {type: class_trip, child: Maya, time: 09:00, date: tomorrow, no lunch provided} | household_has_open_high_priority_alert: false | checkins_generated_today: 0 | last_surfaced_at: null | confidence: HIGH`
**Expected:**
```json
{
  "observation": "Maya has a class trip tomorrow morning — no lunch is provided.",
  "prompt": "Worth sorting tonight if you haven't already."
}
```
**Result:** ✅ PASS — UPCOMING_LOGISTICS type demonstrated. Soft logistics notice, not an alert. Calm, forward-looking, no urgency vocabulary. HIGH confidence = no qualifier. Prompt is an invitation, not a demand or monitoring offer (monitoring offer applies when Kin is watching something; here the decision belongs entirely to the parents). All 3 checkin observation_types now tested.

---

## §26 DRIFT REVIEW — SESSION 4 (2026-04-04T12:00)

Review question: *"Would this feel helpful to a busy, slightly stressed user?"*

### morning-briefing-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | No change from S3 |
| Stacked hedges | ✅ Blocked | No change from S3 |
| Generic reassurance | ✅ Blocked | No change from S3 |
| Insights that change nothing | ✅ Blocked | No change from S3 |
| Over-explained silence | ✅ Blocked | No change from S3 |
| Compression without specificity | ✅ Blocked | No change from S3 |

**Session 4 improvement:** Scenario 5 added — tests time-based relief phrase with hard departure deadline. Gap closed: all three relief phrases are now each demonstrated in at least one test scenario. No spec changes.
**Verdict: PASS**

---

### alert-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | No change from S3 |
| Stacked hedges | ✅ Blocked | No change from S3 |
| Generic reassurance | ✅ Blocked | No change from S3 |
| Insights that change nothing | ✅ Blocked | No change from S3 |
| Over-explained silence | ✅ Blocked | No change from S3 |
| Compression without specificity | ✅ Blocked | No change from S3 |

**No session 4 flags.** No changes made.
**Verdict: PASS**

---

### checkin-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | No change from S3 |
| Stacked hedges | ✅ Blocked | No change from S3 |
| Generic reassurance | ✅ Blocked | No change from S3 |
| Insights that change nothing | ✅ Blocked | No change from S3 |
| Over-explained silence | ✅ Blocked | No change from S3 |
| Compression without specificity | ✅ Blocked | No change from S3 |

**Session 4 fix:** Scenario 2 input now includes `last_surfaced_at: null` — schema consistency with S3 INPUT FORMAT addition. Pass criteria note updated to document that `null` means no suppression applies.
**Verdict: PASS**

---

### chat-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | No change from S3 |
| Stacked hedges | ✅ Blocked | No change from S3 |
| Generic reassurance | ✅ Blocked | No change from S3 |
| Insights that change nothing | ✅ Blocked | No change from S3 |
| Over-explained silence | ✅ Blocked | No change from S3 |
| Compression without specificity | ✅ Blocked | No change from S3 |

**No session 4 flags.** No changes made.
**Verdict: PASS**

---

### closure-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | No change from S3 |
| Stacked hedges | N/A | No change from S3 |
| Generic reassurance | ✅ Blocked | No change from S3 |
| Insights that change nothing | ✅ Blocked | No change from S3 |
| Over-explained silence | N/A | No change from S3 |
| Compression without specificity | ✅ Blocked | No change from S3 |

**No session 4 flags.** No changes made.
**Verdict: PASS**

---

### first-use-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | No change from S3 |
| Stacked hedges | ✅ Blocked | No change from S3 |
| Generic reassurance | ✅ Blocked | No change from S3 |
| Insights that change nothing | ✅ Blocked | No change from S3 |
| Over-explained silence | ✅ Blocked | No change from S3 |
| Compression without specificity | ✅ Blocked | No change from S3 |

**No session 4 flags.** No changes made.
**Verdict: PASS**

---

### household-chat-prompt.md ← FIRST FORMAL §26 REVIEW (created S3, not previously logged)
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | Forbidden openers listed; includes chatbot affirmations ("Certainly!", "Great question!") — stronger coverage than some other prompts |
| Stacked hedges | ✅ Blocked | §23 1-qualifier max; 1-2 sentence preference eliminates stacking |
| Generic reassurance | ✅ Blocked | "I've got this", "Don't worry", "You're all set" blocked |
| Insights that change nothing | ✅ Blocked | No-repetition rule explicit in Conversation Rules; Scenario 5 now tests it |
| Over-explained silence | ✅ Blocked | Clean state = "Nothing open right now — coverage is confirmed for today's pickups." — brief, specific |
| Compression without specificity | ✅ Blocked | §16 requires naming child + time; all 4 original scenarios demonstrate specifics |

**Session 4 improvement:** Scenario 5 added — no-repetition rule in household thread demonstrated with status-confirmation pattern ("Still just Maya's 3:30 — nothing else open right now."). Parallel to `chat-prompt.md` Scenario 5. No spec changes.
**Verdict: PASS**

**All 7 prompts passed §26 drift review (Session 4). 3 targeted improvements applied across morning-briefing, checkin, and household-chat prompts.**

---

## §26 DRIFT REVIEW — SESSION 3 (2026-04-04T10:00)

Review question: *"Would this feel helpful to a busy, slightly stressed user?"*

### morning-briefing-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | No change from S2 |
| Stacked hedges | ✅ Blocked | No change from S2 |
| Generic reassurance | ✅ Blocked | No change from S2 |
| Insights that change nothing | ✅ Blocked | Repeat suppression now enforced via `last_surfaced_insight` input field — same issue, no change = null |
| Over-explained silence | ✅ Blocked | No change from S2 |
| Compression without specificity | ✅ Blocked | No change from S2 |

**Session 3 flag resolved:** `last_surfaced_insight` was referenced in failure mode #2 but absent from input schema. Model could not actually suppress repeats. Field added; suppression instruction added; Scenario 4 tests the fix.
**Verdict: PASS**

---

### alert-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | No change from S2 |
| Stacked hedges | ✅ Blocked | No change from S2 |
| Generic reassurance | ✅ Blocked | No change from S2 |
| Insights that change nothing | ✅ Blocked | No change from S2 |
| Over-explained silence | ✅ Blocked | No change from S2 |
| Compression without specificity | ✅ Blocked | No change from S2 |

**No session 3 flags.** No changes made.
**Verdict: PASS**

---

### checkin-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | No change from S2 |
| Stacked hedges | ✅ Blocked | No change from S2 |
| Generic reassurance | ✅ Blocked | No change from S2 |
| Insights that change nothing | ✅ Blocked | Repeat suppression now enforced via `last_surfaced_at` input field |
| Over-explained silence | ✅ Blocked | No change from S2 |
| Compression without specificity | ✅ Blocked | No change from S2 |

**Session 3 flags resolved:** (A) Scenario 1 `prompt` field used "Want me to flag it...?" — permission-seeking language inconsistent with Kin's quietly capable persona. Fixed to exact conditional relief phrase. (B) `last_surfaced_at` field was referenced in failure mode #4 but absent from input schema. Field added; suppression rule added; Scenario 4 tests the fix.
**Verdict: PASS**

---

### chat-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | No change from S2 |
| Stacked hedges | ✅ Blocked | No change from S2 |
| Generic reassurance | ✅ Blocked | No change from S2 |
| Insights that change nothing | ✅ Blocked | Scenario 5 now demonstrates no-repetition rule in action |
| Over-explained silence | ✅ Blocked | No change from S2 |
| Compression without specificity | ✅ Blocked | No change from S2 |

**No session 3 flags on prompt spec itself.** Scenario 5 added to demonstrate no-repetition rule with a live example ("Still the same — ...").
**Verdict: PASS**

---

### closure-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | No change from S2 |
| Stacked hedges | N/A | No change from S2 |
| Generic reassurance | ✅ Blocked | No change from S2 |
| Insights that change nothing | ✅ Blocked | No change from S2 |
| Over-explained silence | N/A | No change from S2 |
| Compression without specificity | ✅ Blocked | No change from S2 |

**No session 3 flags.** No changes made.
**Verdict: PASS**

---

### first-use-prompt.md
| Pattern | Status | Notes |
|---------|--------|-------|
| Unnecessary preamble | ✅ Blocked | No change from S2 |
| Stacked hedges | ✅ Blocked | No change from S2 |
| Generic reassurance | ✅ Blocked | No change from S2 |
| Insights that change nothing | ✅ Blocked | No change from S2 |
| Over-explained silence | ✅ Blocked | No change from S2 |
| Compression without specificity | ✅ Blocked | No change from S2 |

**No session 3 flags.** No changes made.
**Verdict: PASS**

**All 6 existing prompts passed §26 drift review (Session 3). 3 targeted improvements applied.**

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

## TRIGGER SCENARIO TESTS — SESSION 4

All 8 scenarios from Session 3 re-verified. No regressions. 2 new scenarios added.

### §3A — PICKUP RISK (re-verified)
All 4 scenarios (RED, YELLOW coord, YELLOW direct, CLEAR) — ✅ PASS (no change from Session 3)

### §3C — LATE SCHEDULE CHANGE (re-verified)
All 4 scenarios — ✅ PASS (no change from Session 3)

### NEW SESSION 4 SCENARIOS

#### Morning Briefing — Time-Based Relief Phrase (Hard Departure Deadline)
**Input:** `today_events: [parent_b standup 08:00, parent_a school dropoff 08:30 (departure_by: 08:10)] | pickup_assignments: [Maya 08:30, assigned: parent_a, conflict: false] | last_coordination_change: REASSIGNMENT (parent_a now handling dropoff, changed 20:00 yesterday) | last_surfaced_insight: null | current_time: 07:30`
**Expected:**
```json
{
  "primary_insight": "Maya's dropoff is on you this morning — gates close at 8:30, so you'll need to leave by 8:10.",
  "supporting_detail": null,
  "relief_line": "I'll remind you when it's time to leave."
}
```
**Result:** ✅ PASS — Time-based relief phrase correctly selected: specific departure time exists, coverage is confirmed (no active monitoring needed), not a conditional standby. PRIMARY_INSIGHT surfaces the reassignment and its hard implication (departure time). No forbidden opener. No unnecessary supporting detail. Relief phrase selection validated: all three phrases now each tested in at least one morning-briefing scenario.

---

#### §3C — YELLOW: Late Change, Both Parents UNCONFIRMED (Coordination Prompt, Not Assignment)
**Input:** `trigger_type: LATE_SCHEDULE_CHANGE | severity: YELLOW | change: "Parent A calendar shows cleared block at 15:00 — unclear if meeting was cancelled or rescheduled" | parent_a: UNCONFIRMED | parent_b: UNCONFIRMED | child: Maya | window: 15:30 | confidence: MEDIUM`
**Expected:**
```json
{
  "content": "A schedule change may affect Maya's 3:30 pickup — worth a quick check between you.",
  "severity": "YELLOW",
  "trigger_type": "LATE_SCHEDULE_CHANGE"
}
```
**Result:** ✅ PASS — MEDIUM confidence (qualifier: "may"), both UNCONFIRMED → coordination prompt, NOT direct assignment. §16 validated: when parent status is UNCONFIRMED on both sides, alert correctly avoids naming a responsible party. 1 sentence. No forbidden opener. Critical distinction from Scenario 3b (alert-prompt) and S3 new test: those cases had one parent AVAILABLE = direct assignment; this case has both UNCONFIRMED = coordination prompt.

---

## TRIGGER SCENARIO TESTS — SESSION 3

All 7 scenarios from Session 2 re-verified. No regressions. 1 new scenario added.

### §3A — PICKUP RISK (re-verified)

All 4 scenarios (RED, YELLOW coord, YELLOW direct, CLEAR) — ✅ PASS (no change from Session 2)

### §3C — LATE SCHEDULE CHANGE

#### YELLOW: Late Change, One Parent Newly Conflicted, Partner Available ← NEW SESSION 3
**Input:** `trigger_type: LATE_SCHEDULE_CHANGE | severity: YELLOW | change: "Parent A meeting extended to 4pm" | parent_a: CONFLICTED | parent_b: AVAILABLE | child: Leo | window: 15:30 | confidence: HIGH`
**Expected:** `"A 4pm extension puts Leo's 3:30 pickup on you — your partner's now the only one free."`
**Result:** ✅ PASS — neutral framing for the change ("A 4pm extension"), direct assignment for the implication (partner_b AVAILABLE = clear responsibility), HIGH confidence = no qualifier, 1 sentence, no forbidden opener. §16 + §3C intersection validated: late change trigger does correctly fire direct assignment when one parent is clearly AVAILABLE.

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

## NOTES FOR NEXT SESSION

1. **Post-Lead-Eng wiring:** When Lead Eng wires alert-prompt.md to the coordination_issues route, run these same scenarios against live rendered output — not just the prompt spec. Pay special attention to the YELLOW/direct-assignment case (Scenario 3b): production models sometimes slip to coordination-prompt tone even when one parent is clearly AVAILABLE.
2. **Qualifier drift watch:** Most likely failure in production is stacked qualifiers under unusual schedule patterns. Recommend route-level validation counting qualifier words per sentence before writing to `coordination_issues.content`. Flag for Lead Eng when wiring S2-LE-06.
3. **Relief line selection in production:** All three relief phrases are now tested across morning-briefing scenarios (S4: time-based phrase added). When `/api/morning-briefing` is wired, validate phrase selection against real rendered output. Specific watch: "I'll keep an eye on it" vs. "I'll flag it if anything changes." (standby vs. active watch) and "I'll remind you when it's time to leave" only when a specific departure time exists in context.
4. **§3B, §3D, §3E, §3F not tested:** These trigger types (Schedule Compression, Responsibility Shift, Coverage Gap, Transition Risk) are post-TestFlight scope.
5. **Household chat prompt wiring (Session 3):** `household-chat-prompt.md` governs the household thread; `chat-prompt.md` governs the personal thread. Do NOT use the same prompt for both. See SPRINT.md for wiring note.
6. **`last_surfaced_insight` / `last_surfaced_at` schema fields (Session 3):** Both `morning-briefing-prompt.md` and `checkin-prompt.md` expect these fields. Lead Eng needs a persistence layer (recommend `surfacing_log` table or `household_context` field in Supabase). Flag when wiring S2-LE-05 and S2-LE-07.
7. **UNCONFIRMED/UNCONFIRMED ambiguity in alerts (NEW — Session 4):** S4 new trigger test confirms: when both parents are UNCONFIRMED (not CONFLICTED or AVAILABLE), alert correctly produces coordination prompt, not direct assignment. This is the most likely edge case to break in production — route should validate that AVAILABLE status is confirmed before firing direct-assignment language. Flag for QA S2-QA-01.
8. **Repeat suppression bypass scope (NEW — Session 5):** S5 confirms bypass logic fires when `last_coordination_change.added_at` > `surfaced_at`. Route must scope this check to changes affecting the same issue (same pickup window, same child) — an unrelated schedule change should not trigger bypass. Flag for Lead Eng when wiring S2-LE-05. See morning-briefing Failure Mode 6.
9. **conversation_history N (NEW — Session 5):** Both `chat-prompt.md` and `household-chat-prompt.md` now include route implementation note: N ≥ 10 required for no-repetition rule to function. Flag for Lead Eng when wiring S3-LE-02/04.
10. **Stale root-level prompt files:** Files in `mnt/prompts/` root (`morning-briefing-prompt.md`, `alert-prompt.md`, `checkin-prompt.md`, `closure-prompt.md`, `first-use-prompt.md`, `trigger-test-log.md`) are S2-era copies and do NOT reflect S3–S6 changes. Canonical files are in `docs/prompts/`. Lead Eng must wire to `docs/prompts/` paths. Root-level files should be deleted or archived to prevent confusion.
11. **Household thread resolution acknowledgment (NEW — Session 6):** S3-LE-02 wiring must handle user-reported resolution signals from the household thread ("We sorted it", "That's covered now", etc.) by writing `coordination_issues.state = RESOLVED` before generating Kin's acknowledgment response. Otherwise Kin's "I'll take it off the list" output contradicts the still-visible OPEN alert card. See household-chat-prompt.md Failure Mode 6.
12. **First-use confidence derivation (NEW — Session 6):** S4-LE-01 wiring must only pass `confidence: HIGH` to first-use-prompt when a valid §3A/§3C trigger exists in household data. MEDIUM confidence (unconfirmed event, no known conflict) → `is_fallback: true`. Over-assigning HIGH causes the engineered first-use moment to surface uncertain data — erodes trust at the worst possible moment. See first-use-prompt.md Scenario 5 and Failure Mode 6.
13. **chat-prompt.md and household-chat-prompt.md LOW confidence test gap (CLOSED — Session 7):** Both chat prompts now have Scenario 6 demonstrating the LOW confidence path. Personal thread: terminal uncertainty statement. Household thread: uncertainty + collaborative clarification offer. 18/18 tests pass.
14. **Morning briefing suppression logic now fully tested (CLOSED — Session 8):** All three suppression branches have dedicated test scenarios: Scenario 4 (same issue/no change → suppress), Scenario 6 (same issue/changed → bypass), Scenario 7 (different issue entirely → surface normally). Route must implement all three branches correctly; missing the third branch causes silent suppression of new, unrelated issues if any `last_surfaced_insight` is set. Flag for Lead Eng wiring S2-LE-05.
15. **Household chat attribution resistance validated (NEW — Session 8):** When a parent directly asks "Who made this change?", Kin must deflect with neutral framing — not name the other parent, even implicitly via "your partner." Route does not need to redact `changed_by` from the context; the prompt handles neutralization. QA should test this edge case in S3-QA-01 social tone audit.
16. **Post-resolution status in chat (NEW — Session 8):** When a parent asks about an issue that was previously flagged but is now RESOLVED (removed from `open_coordination_issues`), Kin should update the status directly and specifically — not re-raise urgency based on the question's phrasing ("still an issue?" does not mean it is still an issue). Route must pass current `open_coordination_issues` accurately; if the issue is resolved, it should not appear in the array.
17. **§3C CLEAR coverage in alert route (NEW — Session 9):** Alert-prompt.md Scenario 7 now explicitly tests §3C CLEAR → null. Route wiring S2-LE-06 must handle CLEAR severity for LATE_SCHEDULE_CHANGE trigger type the same way it handles CLEAR for PICKUP_RISK: no `coordination_issues` record written, no prompt called. Verify in QA S2-QA-01 architecture audit.
18. **Checkin frequency cap route gate (NEW — Session 9):** checkin-prompt.md Scenario 6 confirms frequency cap enforcement at the prompt level. Route wiring S2-LE-07 must read `checkins_generated_today` count BEFORE calling the prompt and skip the call entirely if count >= 2. Do not call the prompt and discard the result — the call itself should not happen. See checkin-prompt.md Scenario 6 and route implementation note.
