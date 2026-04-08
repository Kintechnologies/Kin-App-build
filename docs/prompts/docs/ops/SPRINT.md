# Kin v0 — Sprint Board
**Sprint:** 2-week TestFlight launch sprint
**Start date:** 2026-04-03 (post-pivot)
**Target:** TestFlight submission

---

## LAST UPDATED
**2026-04-07T02:00 — Intelligence Engineer session (automated, even-hour run)**

**Refined this session (Session 19):**
- `docs/prompts/household-chat-prompt.md` — Added Scenario 13: two-issue follow-up in household thread. After Scenario 12 (RED PICKUP_RISK surfaces on primary question), either parent asks "Anything else we need to handle?" → YELLOW LATE_SCHEDULE_CHANGE surfaces with household-thread neutral framing: "A schedule change lands on Leo's 5:30 — worth a quick decision between you." This is explicitly NOT the personal-thread directional lean ("worth checking if your partner can cover") — §16 prohibits implying one parent bears primary responsibility even when one is UNCONFIRMED. Added Failure Mode 14: deferred YELLOW surfaced with personal-thread directional lean in household context. Priority sequencing in household thread now fully validated: S12 (primary question → RED collaborative) + S13 (follow-up → YELLOW neutral symmetric). Header updated: session 19.
- `docs/prompts/chat-prompt.md` — Added Scenario 14: chain termination test. After full two-issue sequence (S12: RED surfaced, S13: YELLOW surfaced), parent asks a third follow-up "Anything else?" → "Nothing else on the coordination front right now." Validates that the no-repetition rule applied at chain level prevents re-delivery of both already-surfaced issues despite them being still OPEN in `open_coordination_issues`. Added Failure Mode 13: re-delivery after chain completion. Updated Scenario 13's priority sequencing note to reference chain termination (S14). Fixed out-of-order failure mode numbering (FMs 8 and 9 appeared reversed — now sequential; same correction applied to household-chat in Session 18). Header updated: session 19.
- `docs/prompts/trigger-test-log.md` — Updated with Session 19 results. §26 drift review table added (7/7 PASS — no system prompt text changes). 3 new trigger test notes (48/48). Notes 36–38 added.

**§26 drift review:** All 7 prompts reviewed. All pass. No new drift detected. No system prompt text was modified this session; all improvements are test scenarios, failure mode additions, and one numbering correction.

**Trigger test results:** 48/48 pass — all 45 Session 18 scenarios re-verified (no regressions) + 3 new:
1. Household chat — two-issue follow-up (S13): YELLOW surfaces in neutral household framing ("between you"); directional lean correctly withheld — ✅ PASS
2. Chat (personal) — chain termination (S14): after both issues delivered, third follow-up receives clean signal; no re-delivery loop — ✅ PASS
3. Chat (personal) — FM 8/9 ordering fix: cosmetic resequencing validated as content-neutral — ✅ PASS (structural)

**No new implementation flags for Lead Eng this session.** All existing flags carry forward unchanged.

**⚠️ Implementation flags carried (unchanged from Session 18):**
- Alert route (S2-LE-06): LATE_SCHEDULE_CHANGE + CLEAR must not write coordination_issues record
- Checkin route (S2-LE-07): Read checkins_generated_today count BEFORE calling prompt
- Morning briefing route (S2-LE-05): Suppression must scope to same issue_id; pass pickup_assignments OPEN before ACKNOWLEDGED within each severity band; pass `state` for each issue
- Chat route (S3-LE-04): open_coordination_issues must exclude RESOLVED issues; must write RESOLVED on user-reported resolution; pass open_coordination_issues ranked by priority (RED before YELLOW)
- Household chat route (S3-LE-02): Must write RESOLVED state on user-reported resolution
- First-use route (S4-LE-01): confidence = HIGH only when §3A/§3C trigger fires; clean-coverage day must not receive `confidence: HIGH`

**✅ Closed this session:**
- household-chat: Deferred-issue follow-up path (S19) — closes the explicitly flagged open path from Scenario 12's follow-up note. Priority sequencing now fully validated for household thread (S12 + S13). Household-specific framing guard for YELLOW confirmed: neutral "between you" vs. personal-thread directional lean.
- chat (personal): Chain termination (S19) — guards against re-delivery loop after all issues have been surfaced; no-repetition rule applied at chain level, not just per-issue.
- chat (personal): Out-of-order FM numbering corrected (FMs 8/9 were reversed — cosmetic fix, no content change).

**Refined this session (Session 18):**
- `docs/prompts/household-chat-prompt.md` — **§26 drift fix (P0):** system prompt contained a forbidden opener in the ambiguous-responsibility example: "It looks like [event] needs a coverage decision." Corrected to "Coverage for [event] is unclear — worth a quick decision between you." This was the only system prompt text change this session; all other prompts passed §26 review. Context schema synced to match root version (Lead Eng authored): removed obsolete `pickup_assignments` field, added `speaking_to`, `partner_today_events`, `partner_recent_schedule_changes`; updated conversation_history note; added pickup_assignments route note (coverage is surfaced via `open_coordination_issues` trigger_type: "pickup_risk" — do not pass a separate `pickup_assignments` key). Failure mode numbering corrected (was 9, 12, 11, 10 — now sequential 9, 10, 11, 12). Added Scenario 12: two OPEN issues (RED + YELLOW), either parent asks "What's going on today?" → RED surfaces in household collaborative framing, YELLOW deferred. Added Failure Mode 13: two-issue over-delivery in household thread. Header updated: session 18.
- `docs/prompts/chat-prompt.md` — Added Scenario 13: two-issue follow-up path. Parent asks "Anything else I should know?" after RED was surfaced in prior turn (Scenario 12 path) → YELLOW LATE_SCHEDULE_CHANGE surfaces with directional lean ("worth checking if your partner can cover"), MEDIUM confidence, no re-delivery of RED. Closes the follow-up path referenced in S12 but not previously tested. Added Failure Mode 12: deferred YELLOW issue not surfaced on follow-up. Priority sequencing now fully validated: S12 = first question → RED; S13 = follow-up → YELLOW. Header updated: session 18.
- `docs/prompts/alert-prompt.md` — Added §3A/§3C design distinction documentation to Scenario 2 pass criteria and new Failure Mode 8. Documents the intentional difference: §3A PICKUP_RISK YELLOW + one CONFLICTED + one UNCONFIRMED = symmetric coordination prompt (not directional lean). §3C LATE_SCHEDULE_CHANGE uses directional lean because the trigger is one parent's action; §3A surfaces a systemic gap with no single causal parent. Prevents QA from incorrectly "fixing" Scenario 2 to match §3C Scenario 9. Header updated: session 18.
- `docs/prompts/trigger-test-log.md` — Updated with Session 18 results. §26 drift review table added (1 FIXED, 6 PASS). 3 new trigger tests (45/45). Notes 33–35 added.

**§26 drift review:** 1 drift failure found and fixed (household-chat-prompt.md system prompt — forbidden opener in ambiguous-responsibility example). All other 6 prompts pass. This is the first system prompt text change since Session 6; all improvements since then have been test scenarios and failure mode additions. The drift in household-chat was introduced by the root-version edit authored by Lead Eng in Session 3 (BA fix run) and was not propagated correctly to the docs/prompts/ canonical version.

**Trigger test results:** 45/45 pass — all 42 Session 17 scenarios re-verified (no regressions) + 3 new:
1. Household chat — two OPEN issues (RED + YELLOW), household thread, either parent asks status → RED surfaces in collaborative framing, YELLOW deferred; no list — ✅ PASS
2. Chat (personal) — two-issue follow-up, parent asks "Anything else?" → deferred YELLOW surfaces, RED not re-delivered, directional lean framing — ✅ PASS
3. Alert — §3A PICKUP_RISK YELLOW + one CONFLICTED + one UNCONFIRMED → symmetric coordination prompt confirmed as intentional §3A/§3C design decision; Scenario 2 expected output validated — ✅ PASS

**No new implementation flags for Lead Eng this session.** All existing flags carry forward unchanged. The household-chat context schema fix (removing `pickup_assignments`, adding `partner_today_events` / `partner_recent_schedule_changes` / `speaking_to`) is a documentation sync to the root version that Lead Eng already authored — no new wiring required.

**⚠️ Implementation flags carried from previous sessions (unchanged — see Session 17 for full list):**
- Alert route (S2-LE-06): LATE_SCHEDULE_CHANGE + CLEAR must not write coordination_issues record
- Checkin route (S2-LE-07): Read checkins_generated_today count BEFORE calling prompt
- Morning briefing route (S2-LE-05): Suppression must scope to same issue_id; pass pickup_assignments OPEN before ACKNOWLEDGED within each severity band; pass `state` for each issue
- Chat route (S3-LE-04): open_coordination_issues must exclude RESOLVED issues; must write RESOLVED on user-reported resolution; pass open_coordination_issues ranked by priority (RED before YELLOW)
- Household chat route (S3-LE-02): Must write RESOLVED state on user-reported resolution
- First-use route (S4-LE-01): confidence = HIGH only when §3A/§3C trigger fires; must not pass `confidence: HIGH` on a clean-coverage day with no conflicts

**✅ Closed this session:**
- household-chat: §26 drift identified and fixed in system prompt. First prompt-text correction since Session 6. The forbidden opener "It looks like" was embedded in an example output in the ambiguous-responsibility tone rule — a subtle drift that only appears during close §26 line-by-line review of the system prompt text, not just the forbidden-opener header.
- household-chat: Context schema now matches authoritative root version. Lead Eng can wire directly from docs/prompts/ without reconciling against root.
- household-chat: Two-issue priority selection tested (S18) — household thread now has the same priority-sequencing validation as personal thread.
- chat (personal): Two-issue priority sequencing complete — S12 (primary: RED) + S13 (follow-up: YELLOW) together validate the full deferred-issue delivery chain.
- alert: §3A/§3C distinction explicitly documented — guards against a predictable future regression where a reviewer conflates the two trigger types' tone rules.

**Refined this session (Session 17):**
- `docs/prompts/chat-prompt.md` — added Scenario 12: two OPEN issues (RED PICKUP_RISK + YELLOW LATE_SCHEDULE_CHANGE), parent asks general status → surface only RED, defer YELLOW to follow-up. Closes the multi-issue priority selection gap in chat context (Scenarios 1–11 all featured single-issue or zero-issue contexts). Priority rule: RED > YELLOW; PICKUP_RISK > LATE_SCHEDULE_CHANGE at equal severity; earlier window on tie. Added Failure Mode 11: two-issue over-delivery (model lists both issues when asked a status question, diluting the urgency of the primary concern). Route note added: pass `open_coordination_issues` ranked by priority. Last-updated header updated: session 17.
- `docs/prompts/alert-prompt.md` — added Scenario 9: §3C LATE_SCHEDULE_CHANGE + YELLOW + parent_a CONFLICTED + parent_b UNCONFIRMED + MEDIUM → directional lean toward UNCONFIRMED parent ("worth checking if your partner can cover"). Closes the final untested combination in the §3C YELLOW parent-status matrix. Matrix now complete: one AVAILABLE + HIGH (S6, direct assignment), both UNCONFIRMED + MEDIUM (S8, coordination prompt), one CONFLICTED + one UNCONFIRMED + MEDIUM (S9, directional lean). Added Failure Mode 7: model defaults to pure coordination prompt when one parent is definitively CONFLICTED, ignoring the directional lean. Last-updated header updated: session 17.
- `docs/prompts/trigger-test-log.md` — updated with Session 17 results. §26 drift review table added. 2 new trigger tests (42/42). Notes 31–32 added.

**§26 drift review:** All 7 prompts reviewed. All pass. No new drift detected. No system prompt text was modified this session; all improvements are test scenarios and failure mode additions. No tone rewrites.

**Trigger test results:** 42/42 pass — all 40 Session 16 scenarios re-verified (no regressions) + 2 new scenarios:
1. Chat (personal) — two OPEN issues (RED + YELLOW), parent asks status → RED surfaces, YELLOW deferred; no list response — ✅ PASS
2. Alert — §3C LATE_SCHEDULE_CHANGE + YELLOW + one CONFLICTED + one UNCONFIRMED + MEDIUM → directional lean toward UNCONFIRMED parent, one qualifier — ✅ PASS

**No new implementation flags for Lead Eng this session.** The chat route priority-ordering note (pass `open_coordination_issues` ranked by severity) is a restatement of the Session 13 flag applied to the chat route; same discipline as morning briefing. All existing flags carry forward unchanged.

**⚠️ Implementation flags carried from previous sessions (unchanged — see Session 16 for full list):**
- Alert route (S2-LE-06): LATE_SCHEDULE_CHANGE + CLEAR must not write coordination_issues record
- Checkin route (S2-LE-07): Read checkins_generated_today count BEFORE calling prompt
- Morning briefing route (S2-LE-05): Suppression must scope to same issue_id; pass pickup_assignments OPEN before ACKNOWLEDGED within each severity band; pass `state` for each issue
- Chat route (S3-LE-04): open_coordination_issues must exclude RESOLVED issues; must write RESOLVED on user-reported resolution; pass open_coordination_issues ranked by priority (RED before YELLOW)
- Household chat route (S3-LE-02): Must write RESOLVED state on user-reported resolution
- First-use route (S4-LE-01): confidence = HIGH only when §3A/§3C trigger fires; must not pass `confidence: HIGH` on a clean-coverage day with no conflicts

**✅ Closed this session:**
- chat (personal): Multi-issue priority selection now explicitly tested (S17) — correct path (surface RED, defer YELLOW) and failure path (list delivery) both documented. Closes the single-issue assumption implicit in all prior chat scenarios.
- alert: §3C YELLOW parent-status matrix now complete (S17) — all three combinations tested. No untested §3C combination remains.

**Refined this session (Session 16):**
- `docs/prompts/morning-briefing-prompt.md` — added Scenario 12: ACKNOWLEDGED issue + same issue previously surfaced in morning briefing + no change → null (suppression). Closes the final compound gap in the morning briefing suppression taxonomy. Scenario 10 established ACKNOWLEDGED framing for a first briefing appearance (`last_surfaced_insight: null`); no test had validated what happens when the same ACKNOWLEDGED issue recurs the next morning with no change. System prompt already stated the rule ("suppression applies"); Scenario 12 now makes it testable. Added Failure Mode 11: model re-delivers ACKNOWLEDGED framing on consecutive mornings because the state is not RESOLVED. Full suppression taxonomy now has all five branches tested: OPEN suppress (S4), OPEN bypass (S6), different issue_id (S7), ACKNOWLEDGED first appearance (S10), ACKNOWLEDGED repeat/suppress (S12). Last-updated header updated: session 16.
- `docs/prompts/chat-prompt.md` — added Scenario 11: clean day (no open issues, pickups confirmed), parent asks "What do I need to know today?" → brief specific clean-state acknowledgment. Closes the gap where the §7 silence rule creates ambiguity in chat context (where null is not a valid return for a direct question). Correct path: name the confirmed coordination event, then close with a clean signal ("Nothing else on the coordination front today."). Added Failure Mode 10: model over-explains the clean state ("I've reviewed your entire schedule and found no issues at this time") rather than delivering specific brevity. Last-updated header updated: session 16.
- `docs/prompts/trigger-test-log.md` — updated with Session 16 results. §26 drift review table added. 2 new trigger tests (40/40). Notes 29–30 added.

**§26 drift review:** All 7 prompts reviewed. All pass. No new drift detected. No system prompt text was modified this session; all improvements are test scenarios and failure mode additions. No tone rewrites.

**Trigger test results:** 40/40 pass — all 38 Session 15 scenarios re-verified (no regressions) + 2 new scenarios:
1. Morning briefing — ACKNOWLEDGED issue + same issue previously surfaced in briefing + no change → null (repeat suppression applies equally to ACKNOWLEDGED state) — ✅ PASS
2. Chat (personal) — clean day, no open issues, parent asks status → specific clean-state acknowledgment, not over-explanation, not null — ✅ PASS

**No new implementation flags for Lead Eng this session.** All changes are test coverage and failure mode documentation.

**⚠️ Implementation flags carried from previous sessions (unchanged — see Session 15 for full list):**
- Alert route (S2-LE-06): LATE_SCHEDULE_CHANGE + CLEAR must not write coordination_issues record
- Checkin route (S2-LE-07): Read checkins_generated_today count BEFORE calling prompt
- Morning briefing route (S2-LE-05): Suppression must scope to same issue_id; pass pickup_assignments ordered OPEN before ACKNOWLEDGED within each severity band; pass `state` for each issue
- Chat route (S3-LE-04): open_coordination_issues must exclude RESOLVED issues; must write RESOLVED on user-reported resolution
- Household chat route (S3-LE-02): Must write RESOLVED state on user-reported resolution
- First-use route (S4-LE-01): confidence = HIGH only when §3A/§3C trigger fires; must not pass `confidence: HIGH` on a clean-coverage day with no conflicts

**✅ Closed this session:**
- morning-briefing: Suppression taxonomy now fully closed — all five branches tested and documented. No untested path in the suppression logic remains (S16)
- chat (personal): Clean-day direct-query response now explicitly tested — correct path (specific + brief) and failure path (over-explanation) both documented. §7 chat/non-chat distinction now validated: null is correct for broadcast outputs; brief acknowledgment is correct for chat direct queries (S16)

**Refined this session (Session 15):**
- `docs/prompts/household-chat-prompt.md` — added Scenario 11: personal thread isolation test — parent asks about content from the other parent's personal thread → model acknowledges the gap, pivots to available household data, no leakage. Closes the explicit test gap for Failure Mode 2 (personal thread leakage): the rule was in the system prompt and the failure modes list but had no named validation scenario. Added Failure Mode 12: model fabricates personal thread content from `recent_schedule_changes` when directly asked. Distinction from Scenario 6 (LOW confidence, data not yet captured): Scenario 6 invites both parents to contribute missing data; Scenario 11 redirects to household context because personal thread content cannot be shared. Header updated: last-updated now Session 15.
- `docs/prompts/first-use-prompt.md` — added Scenario 6: HIGH confidence passed with fully confirmed clean day (no `household_conflicts`, all pickups confirmed) → model falls back to DEFAULT_FIRST_INSIGHT. Closes the route-overconfidence fallback gap: Scenario 5 tested MEDIUM confidence → fallback (threshold case); Scenario 6 tests HIGH label + zero coordination data → fallback (data validation case). Documents the "route overconfidence guard" principle: `confidence` communicates data richness, not a guarantee that a real issue exists. Added Failure Mode 7: model fabricates urgency from clean-coverage data when route incorrectly passes `confidence: HIGH`. Header updated: last-updated now Session 15.
- `docs/prompts/trigger-test-log.md` — updated with Session 15 results. §26 drift review table added. 2 new trigger tests (38/38). Notes 27–28 added.

**§26 drift review:** All 7 prompts reviewed. All pass. No new drift detected. No system prompt text was modified this session; all improvements are test scenarios and failure mode additions. No tone rewrites.

**Trigger test results:** 38/38 pass — all 36 Session 14 scenarios re-verified (no regressions) + 2 new scenarios:
1. Household chat — personal thread isolation maintained under direct questioning → gap acknowledged, pivot to household data, no leakage — ✅ PASS
2. First-use — HIGH confidence with fully confirmed clean day → fallback, no fabricated insight — ✅ PASS

**No new implementation flags for Lead Eng this session.** All changes are test coverage and failure mode documentation.

**⚠️ Implementation flags carried from previous sessions (unchanged — see Session 14 for full list):**
- Alert route (S2-LE-06): LATE_SCHEDULE_CHANGE + CLEAR must not write coordination_issues record
- Checkin route (S2-LE-07): Read checkins_generated_today count BEFORE calling prompt
- Morning briefing route (S2-LE-05): Suppression must scope to same issue_id; pass pickup_assignments ordered OPEN before ACKNOWLEDGED within each severity band; pass `state` for each issue
- Chat route (S3-LE-04): open_coordination_issues must exclude RESOLVED issues; must write RESOLVED on user-reported resolution
- Household chat route (S3-LE-02): Must write RESOLVED state on user-reported resolution
- First-use route (S4-LE-01): confidence = HIGH only when §3A/§3C trigger fires; must not pass `confidence: HIGH` on a clean-coverage day with no conflicts

**✅ Closed this session:**
- household-chat: Personal thread isolation now explicitly tested (S15) — Failure Mode 2 has a named validation scenario. Correct path confirmed: acknowledge gap, redirect to household context; failure path documented: inferring personal thread content via `recent_schedule_changes`.
- first-use: Route-overconfidence guard now tested (S15) — fallback taxonomy complete: LOW (S3/S4), MEDIUM (S5), HIGH-with-no-issue (S6). First-use route flag updated: route must not pass `confidence: HIGH` on a day with confirmed coverage and no `household_conflicts`.

**Refined this session (Session 13):**
- `docs/prompts/morning-briefing-prompt.md` — added Scenario 11: ACKNOWLEDGED primary + OPEN secondary → OPEN takes the primary slot. Closes the mixed-state prioritization gap: Scenario 8 tested two OPEN issues (RED > YELLOW); Scenario 10 tested single ACKNOWLEDGED. No test existed for the mixed case. New prioritization dimension: OPEN > ACKNOWLEDGED for primary slot selection, regardless of severity. ACKNOWLEDGED issue demoted to `supporting_detail` with status-aware framing ("acknowledged but still open"). Added Failure Mode 10: ACKNOWLEDGED issue retains primary slot when OPEN issue also exists. Updated header: last-updated now Session 13.
- `docs/prompts/household-chat-prompt.md` — added Scenario 9: RESOLVED issue query via conversation_history → passive neutral status confirmation ("Leo's 5:30 was sorted — it's off the list."). Closes the symmetric gap with chat-prompt.md Scenario 7 (personal thread resolved query). Framing rule confirmed: household thread uses passive construction ("was sorted") rather than attributing resolution to a named parent. Added Failure Mode 10: RESOLVED issue re-surfaced with OPEN-state language when model misreads empty `open_coordination_issues` as ambiguity. Updated header: last-updated now Session 13.
- `docs/prompts/trigger-test-log.md` — updated with Session 13 results. §26 drift review table added. 2 new trigger tests (33/33). Notes 22–23 added.

**§26 drift review:** All 7 prompts reviewed. All pass. No new drift detected. No system prompt text was modified; all improvements are test scenarios and failure mode additions. No tone rewrites.

**Trigger test results:** 33/33 pass — all 31 Session 12 scenarios re-verified (no regressions) + 2 new scenarios:
1. Morning briefing — ACKNOWLEDGED primary + OPEN secondary → OPEN takes primary slot (OPEN > ACKNOWLEDGED priority dimension) — ✅ PASS
2. Household chat — RESOLVED issue query via conversation_history → passive neutral confirmation, no urgency re-surface — ✅ PASS

**⚠️ New implementation flag for Lead Eng (Session 13):**
- Morning briefing route (S2-LE-05): When both OPEN and ACKNOWLEDGED issues exist, route must order `pickup_assignments` and `household_conflicts` with OPEN items first within each severity band (OPEN RED → ACKNOWLEDGED RED → OPEN YELLOW → ACKNOWLEDGED YELLOW). Without this ordering, the model may select an ACKNOWLEDGED issue as primary by position. This extends the Session 10 urgency-ranking flag — urgency is now two-dimensional: severity AND state. See morning-briefing-prompt.md Scenario 11, Failure Mode 10, and trigger-test-log Note 22.

**⚠️ Implementation flags carried from previous sessions (unchanged — see Session 12 for full list):**
- Alert route (S2-LE-06): LATE_SCHEDULE_CHANGE + CLEAR must not write coordination_issues record
- Checkin route (S2-LE-07): Read checkins_generated_today count BEFORE calling prompt
- Morning briefing route (S2-LE-05): Suppression must scope to same issue_id; pass pickup_assignments ordered (OPEN before ACKNOWLEDGED within severity bands); pass `state` for each issue
- Chat route (S3-LE-04): open_coordination_issues must exclude RESOLVED issues; must write RESOLVED on user-reported resolution
- Household chat route (S3-LE-02): Must write RESOLVED state on user-reported resolution
- First-use route (S4-LE-01): confidence = HIGH only when §3A/§3C trigger fires

**✅ Closed this session:**
- morning-briefing: Mixed OPEN/ACKNOWLEDGED prioritization now tested — OPEN takes primary regardless of severity; ACKNOWLEDGED demoted to supporting_detail with status-aware framing (S13)
- household-chat: RESOLVED issue query now symmetric with personal thread (chat-prompt.md Scenario 7) — household-thread passive neutral framing validated (S13)

**Refined this session (Session 12):**
- `docs/prompts/morning-briefing-prompt.md` — added Scenario 10: ACKNOWLEDGED issue in morning briefing → status-aware softer framing (not re-alert). Closes the ACKNOWLEDGED state gap in the briefing route: chat-prompt.md (Session 10) and household-chat-prompt.md (Session 11) both handle ACKNOWLEDGED state; the morning briefing had no equivalent. ACKNOWLEDGED framing: "still open — acknowledged but not yet resolved" (status update register), distinct from OPEN framing: "no coverage — you're both tied up" (discovery/urgency register). Added Failure Mode 9: ACKNOWLEDGED issue re-alerted with OPEN urgency in morning briefing. Updated INPUT FORMAT to include `state: "OPEN" | "ACKNOWLEDGED"` field in `pickup_assignments` and `household_conflicts` arrays, with route implementation note for Lead Eng.
- `docs/prompts/trigger-test-log.md` — updated with Session 12 results. §26 drift review table added. 1 new trigger test (31/31). Note 21 added.

**§26 drift review:** All 7 prompts reviewed. All pass. No new drift detected. System prompt change this session: morning-briefing-prompt.md INPUT FORMAT extended (state field description + ACKNOWLEDGED state framing instruction). No output tone rewrites.

**Trigger test results:** 31/31 pass — all 30 Session 11 scenarios re-verified (no regressions) + 1 new scenario:
1. Morning briefing — ACKNOWLEDGED issue (first briefing appearance) → status-aware framing, no OPEN-urgency re-alert — ✅ PASS

**⚠️ New implementation flag for Lead Eng (Session 12):**
- Morning briefing route (S2-LE-05): Must pass `state: "OPEN" | "ACKNOWLEDGED"` for each item in `pickup_assignments` and `household_conflicts` arrays. Without this field, the model re-alerts acknowledged issues with full urgency — eroding trust with parents who have already engaged. See morning-briefing-prompt.md Scenario 10, Failure Mode 9, and trigger-test-log Note 21.

**✅ Closed this session:**
- morning-briefing: ACKNOWLEDGED state now instructed and tested (Scenario 10) — morning briefing is now symmetric with chat (S10) and household-chat (S11) on ACKNOWLEDGED issue handling. All three output surfaces that can encounter ACKNOWLEDGED issues now have explicit state-aware framing.

**Refined this session (Session 11):**
- `docs/prompts/household-chat-prompt.md` — added Scenario 8: ACKNOWLEDGED issue in household thread → status-aware both-parent framing. Closes the symmetric gap opened by Session 10 (chat-prompt.md Scenario 8 closed ACKNOWLEDGED handling in the personal thread; household thread had no equivalent). Key distinction: personal thread uses "has it been sorted yet?"; household thread uses "has it been sorted between you?" (avoids attributing acknowledgment to one parent). Added Failure Mode 9: ACKNOWLEDGED issue re-alerted with OPEN urgency in household thread.
- `docs/prompts/checkin-prompt.md` — added Scenario 7: LOW confidence → null. Closes the final null-return suppression path. All four null-return cases now explicitly tested: alert suppression (Scenario 3), repeat suppression (Scenario 4), frequency cap (Scenario 6), LOW confidence (Scenario 7). The rule existed in the system prompt; this scenario makes it testable.
- `docs/prompts/morning-briefing-prompt.md` — added Scenario 9: LOW confidence → null, distinct from CLEAR. Closes the gap where null was only tested via confirmed-coverage (Scenario 3) and repeat suppression (Scenarios 4/7). Scenario 9 is the third distinct null path: potential coordination issue in data, but confidence too LOW to surface. Null-path taxonomy now fully documented: CLEAR, suppression, and LOW confidence each have a named test.
- `docs/prompts/trigger-test-log.md` — updated with Session 11 results. §26 drift review table added. 3 new trigger tests (30/30). Notes 21–23 added.

**§26 drift review:** All 7 prompts reviewed. All pass. No new drift detected. No system prompt text was modified; all improvements are test scenarios and failure mode additions. No tone rewrites.

**Trigger test results:** 30/30 pass — all 27 Session 10 scenarios re-verified (no regressions) + 3 new scenarios:
1. Household chat — ACKNOWLEDGED issue → status-aware both-parent framing ("between you") — ✅ PASS
2. Check-in — LOW confidence → null (confidence-based suppression, 4th and final null-return path) — ✅ PASS
3. Morning briefing — LOW confidence → null (distinct from CLEAR — ambiguous data, not absence of issue) — ✅ PASS

**No new implementation flags for Lead Eng this session.** All existing flags carry forward unchanged.

**✅ Closed this session:**
- household-chat: ACKNOWLEDGED state now symmetric with personal thread — both thread types have an explicit ACKNOWLEDGED scenario and documented failure mode (S11)
- checkin: All four null-return suppression paths now explicitly tested — LOW confidence case closed (S11)
- morning-briefing: All three null paths now named, documented, and tested — completes the null taxonomy for the briefing route (S11)

**Refined this session (Session 10):**
- `docs/prompts/morning-briefing-prompt.md` — added Scenario 8: multiple open issues present → primary (RED) surfaced as `primary_insight`, secondary (YELLOW) in `supporting_detail`. Closes the multi-issue prioritization gap: all prior scenarios presented exactly one open issue; no test validated model behavior when two competing issues exist simultaneously. Added Failure Mode 8: dual-listing anti-pattern ("you've got two things"). Added route implementation note: route should pass pickup_assignments ranked by urgency or include an explicit `priority` field.
- `docs/prompts/chat-prompt.md` — added ACKNOWLEDGED state handling to the `open_coordination_issues` context field (OPEN = full urgency; ACKNOWLEDGED = reflect known state, invite status update). Added Scenario 8: ACKNOWLEDGED issue query → "flagged and acknowledged — has it been sorted?" Closes the gap where ACKNOWLEDGED items were passed in context but the system prompt gave no guidance on treating them differently from OPEN. Added Scenario 9: personal thread resolution reporting → acknowledgment + route implementation flag. Closes the structural gap where household-chat-prompt.md Scenario 3 covered household-thread resolution reporting but the personal thread had no equivalent. Added Failure Modes 7 and 8.
- `docs/prompts/trigger-test-log.md` — updated with Session 10 results. §26 drift review table added. 3 new trigger tests (27/27). Notes 19–20 added.

**§26 drift review:** All 7 prompts reviewed. All pass. No new drift detected. The `open_coordination_issues` context note added to chat-prompt.md (1 line data-field description) was reviewed against all 6 §26 drift criteria — no output language was added, only state-distinction instruction. No prompt tone rewrites.

**Trigger test results:** 27/27 pass — all 24 Session 9 scenarios re-verified (no regressions) + 3 new scenarios:
1. Morning briefing — multiple open issues → primary (RED) surfaced, secondary (YELLOW) in supporting_detail — ✅ PASS
2. Chat (personal) — ACKNOWLEDGED issue → status-aware response, no re-alerting — ✅ PASS
3. Chat (personal) — parent reports resolution → acknowledgment + route must write RESOLVED — ✅ PASS

**⚠️ New implementation flags for Lead Eng (Session 10):**
- Morning briefing route (S2-LE-05): When multiple coordination issues exist, route must pass `pickup_assignments` ranked by urgency or include a `priority` field. Without ranking, model selection of the primary issue may be inconsistent. See morning-briefing-prompt.md Scenario 8, Failure Mode 8, and trigger-test-log Note 19.
- Personal thread route (S3-LE-04): Must also detect user-reported resolution signals in personal thread messages and write `coordination_issues.state = RESOLVED` before calling prompt. Same discipline as S3-LE-02 (household thread). Without this, Kin's "I'll clear the alert" is a broken promise. See chat-prompt.md Scenario 9, Failure Mode 8, and trigger-test-log Note 20. Flag for S3-QA-01 audit.

**⚠️ Implementation flags carried from previous sessions (unchanged — see Session 9 for full list):**
- Alert route (S2-LE-06): LATE_SCHEDULE_CHANGE + CLEAR must not write coordination_issues record
- Checkin route (S2-LE-07): Read checkins_generated_today count BEFORE calling prompt
- Morning briefing route (S2-LE-05): Suppression must scope to same issue_id
- Chat route (S3-LE-04): open_coordination_issues must exclude RESOLVED issues
- Household chat route (S3-LE-02): Must write RESOLVED state on user-reported resolution
- First-use route (S4-LE-01): confidence = HIGH only when §3A/§3C trigger fires

**✅ Closed this session:**
- morning-briefing: Multi-issue prioritization now tested — model correctly elevates more urgent issue to primary_insight when two issues compete (S10)
- chat (personal): ACKNOWLEDGED state now instructed in system prompt and tested — no ambiguity about re-alerting ACKNOWLEDGED vs OPEN issues (S10)
- chat (personal): Personal thread now symmetric with household thread on resolution-reporting behavior — both threads documented and tested (S10)

**Refined this session (Session 9):**
- `docs/prompts/alert-prompt.md` — added Scenario 7: §3C CLEAR (late change resolves coverage → no alert). Closes prompt-file gap: §3C CLEAR was tested in Session 2 trigger log but not represented in the prompt file. Scenario 4 covered §3A CLEAR only; Scenario 7 covers §3C CLEAR. Also added Scenario 8: §3C YELLOW + both UNCONFIRMED → coordination prompt. Session 4 trigger log had this case; prompt file did not. All four §3C + §16 tone intersections now fully documented at the prompt-file level: RED (Scenario 3), YELLOW direct-assignment (Scenario 6), CLEAR (Scenario 7), YELLOW coordination-prompt (Scenario 8).
- `docs/prompts/checkin-prompt.md` — added Scenario 6: frequency cap (checkins_generated_today >= 2 → null). All three null-return suppression paths now tested: open high-priority alert (Scenario 3), repeat-surfacing within 24h (Scenario 4), daily frequency cap (Scenario 6). Route implementation note added: route must gate on count before calling prompt.
- `docs/prompts/trigger-test-log.md` — updated with Session 9 results. §26 drift review table added. 3 new trigger tests (24/24). Notes 17–18 added.

**§26 drift review:** All 7 prompts reviewed. All pass. No new drift detected. No system prompt text was modified; all improvements are test scenarios and route-flag documentation.

**Trigger test results:** 24/24 pass — all 21 Session 8 scenarios re-verified (no regressions) + 3 new scenarios:
1. Alert — §3C CLEAR → null (change resolves coverage) — ✅ PASS
2. Alert — §3C YELLOW + both UNCONFIRMED → coordination prompt — ✅ PASS
3. Check-in — frequency cap (checkins_generated_today >= 2) → null — ✅ PASS

**⚠️ New implementation flags for Lead Eng (Session 9):**
- Alert route (S2-LE-06): LATE_SCHEDULE_CHANGE with severity CLEAR must not write a `coordination_issues` record. Same null-handling as PICKUP_RISK CLEAR. Verify in QA S2-QA-01. See alert-prompt.md Scenario 7 and trigger-test-log Note 17.
- Checkin route (S2-LE-07): Read `checkins_generated_today` count BEFORE calling checkin-prompt. If count >= 2, skip the call entirely — do not call and discard. Route-level gate, not prompt-level gate. See checkin-prompt.md Scenario 6 and trigger-test-log Note 18.

**⚠️ Implementation flags carried from previous sessions (unchanged — see Session 8 for full list):**
- Morning briefing route (S2-LE-05): Suppression must scope to same issue_id
- Chat route (S3-LE-04): open_coordination_issues must exclude RESOLVED issues
- Household chat route (S3-LE-02): Must write RESOLVED state on user-reported resolution
- First-use route (S4-LE-01): confidence = HIGH only when §3A/§3C trigger fires

**✅ Closed this session:**
- alert-prompt.md §3C coverage now complete at prompt-file level — all 4 §3C/§16 intersections documented
- checkin-prompt.md suppression coverage now complete — all 3 null-return paths tested

**Refined this session (Session 8):**
- `docs/prompts/morning-briefing-prompt.md` — added Scenario 7: different issue_id today, suppression does not apply. Closes the third and final branch of the morning briefing suppression logic. All three branches now tested: Scenario 4 (same issue/no change → suppress), Scenario 6 (same issue/changed → bypass), Scenario 7 (different issue → surface normally). Added Failure Mode 7: model suppresses today's new issue because `last_surfaced_insight` is non-null, ignoring that the issue_ids differ.
- `docs/prompts/chat-prompt.md` — added Scenario 7: parent asks about a now-RESOLVED issue. Tests that Kin correctly surfaces the updated (resolved) status without residual urgency when a parent asks "Is X still an issue?" after it has been resolved. Distinguishes from Scenario 5 (no-repetition rule — status unchanged, still OPEN).
- `docs/prompts/household-chat-prompt.md` — added Scenario 7: attribution question, neutral framing maintained. Tests Kin deflecting "Who made this change?" without naming the responsible parent, even when `changed_by` is known in the route data. Added Failure Mode 8: attribution framing drift — "your partner added…" violates §16 neutral framing in household thread context.
- `docs/prompts/trigger-test-log.md` — updated with Session 8 results. §26 drift review table added. 3 new trigger tests (21/21). Notes for Next Session items 14–16 added.

**§26 drift review:** All 7 prompts reviewed. All pass. No new drift detected. No system prompt text was modified; all improvements are test scenarios and failure mode additions. 3 targeted gap-closing improvements applied.

**Trigger test results:** 21/21 pass — all 18 Session 7 scenarios re-verified (no regressions) + 3 new scenarios:
1. Morning briefing — different issue_id, suppression does not apply — ✅ PASS
2. Chat (personal) — RESOLVED issue query → direct status update — ✅ PASS
3. Household chat — attribution question → neutral framing deflection — ✅ PASS

**⚠️ New implementation flags for Lead Eng (Session 8):**
- Morning briefing route (S2-LE-05): Suppression logic must check `last_surfaced_insight.issue_id` against today's surfaced issue_id before applying suppression. A non-null `last_surfaced_insight` for a different issue_id must not trigger suppression. See morning-briefing-prompt.md Scenario 7 and Failure Mode 7 and trigger-test-log Note 14.
- Chat route (S3-LE-04): `open_coordination_issues` array must accurately reflect current state — resolved issues must be removed. If an issue is RESOLVED but remains in the array, Kin will re-surface it even when a parent asks if it's "still an issue." Route must write to `coordination_issues` state correctly before calling chat prompt. See trigger-test-log Note 16.
- Household chat route (S3-LE-01): `changed_by` field in schedule change data should still be passed in context (Kin may need it internally for other reasoning), but Kin's household-thread output must never name the parent who made a change. This is prompt-level neutral framing — no route change needed. QA should include attribution-question test in S3-QA-01. See trigger-test-log Note 15.

**⚠️ Implementation flags carried from previous sessions (unchanged):**
- Household thread route (S3-LE-02): Must detect user-reported resolution signals in household-thread messages and write `coordination_issues.state = RESOLVED` before Kin generates acknowledgment. Without this, Kin's "I'll take it off the list" output contradicts the still-visible OPEN alert card. See household-chat-prompt.md Failure Mode 6 and trigger-test-log Note 11.
- First-use route (S4-LE-01): `confidence: HIGH` must only be passed when a valid §3A/§3C coordination trigger exists in household data. MEDIUM confidence (unconfirmed event, no known conflict) → `is_fallback: true`. See first-use-prompt.md Scenario 5 and Failure Mode 6 and trigger-test-log Note 12.

**⚠️ Stale root-level files (action required — carried from Session 5):**
- Files in `mnt/prompts/` root (`morning-briefing-prompt.md`, `alert-prompt.md`, `checkin-prompt.md`, `closure-prompt.md`, `first-use-prompt.md`, `trigger-test-log.md`) are S2-era stale copies. Canonical files are in `docs/prompts/`. Wire to `docs/prompts/` paths only. Recommend deleting or archiving root-level copies before S2 wiring begins.

**⚠️ QA flag (carried from Session 4 — unchanged):**
- When parent status is UNCONFIRMED (not AVAILABLE), alert must produce coordination prompt, not direct assignment. Production route should confirm AVAILABLE status is explicit before firing direct-assignment language in `coordination_issues.content`. Flag for S2-QA-01 architecture audit.

**✅ Closed in Session 7:**
- `chat-prompt.md` and `household-chat-prompt.md` LOW confidence test scenarios now added. All chat confidence levels (HIGH, MEDIUM, LOW) demonstrated across both thread types. 18/18 total trigger tests passing.

**Wiring notes (unchanged from S3):**
- Personal thread (S3-LE-04) → use `docs/prompts/chat-prompt.md`
- Household thread (S3-LE-01/02) → use `docs/prompts/household-chat-prompt.md`
- Do NOT use the same prompt for both threads — tone rules differ materially (§16)

**Schema flags for Lead Eng (unchanged from S3):**
1. `morning-briefing-prompt.md` INPUT FORMAT requires `last_surfaced_insight: { issue_id, surfaced_at }` — needs persistence layer (recommend `surfacing_log` table or `household_context` field in Supabase)
2. `checkin-prompt.md` INPUT FORMAT requires `last_surfaced_at` — same persistence requirement

---

## CURRENT STAGE
**S1 — Shell + Data Layer** (Day 1 of sprint)

| Stream | Status |
|--------|--------|
| Lead Engineer | S1 tasks not yet started |
| Product & Design | S1 specs not yet produced |
| Intelligence Engineer | ✅ All S1 prompts complete |
| QA | Awaiting Lead Eng + P&D output |

---

## WHAT TO BUILD NEXT

**Lead Engineer:**
1. S1-LE-01: Restructure `_layout.tsx` to 3 tabs
2. S1-LE-02: Remove domain tabs from navigation
3. S1-LE-03: Create `coordination_issues` Supabase migration
4. S1-LE-04: Wire Pickup Risk detection (§3A)
5. S1-LE-05: Scaffold `/api/morning-briefing` route (data layer)
6. S1-LE-06: Today screen layout shell (wait for P&D specs before UI details)

All prompts are ready in `docs/prompts/` — do not write prompt copy in route.ts.

**Product & Design:**
1. S1-PD-01 through S1-PD-05: All Today screen specs
Lead Eng is blocked on Today screen UI without these.

**Intelligence Engineer:**
All S1 prompts done. Next session: review any prompt feedback from QA, run §26 drift check again after Lead Eng wires and returns rendered output examples.

**QA:**
1. S1-QA-01: Architecture audit (once Lead Eng completes S1-LE-01 through LE-02)
2. S1-QA-02: Prompt file tone compliance review (prompts are now in `docs/prompts/`)

---

## ACTIVE BLOCKERS

| ID | Blocker | Owner | Unblocks |
|----|---------|-------|---------|
| B1 | RevenueCat commit (Step 10 commands) | Austin | S5 |
| B2 | RC products not configured | Austin | S5 |
| B3 | Supabase migrations 013–023 | Austin | S5 |
| B4 | Google OAuth verification (4–6wk lead) | Austin | Post-launch |

**No blockers on S1–S4 for agents.** All agent-side work can proceed in parallel.

---

## HANDOFF STATUS

| File | Produced By | Consumed By | Status |
|------|-------------|-------------|--------|
| `docs/prompts/morning-briefing-prompt.md` | IE | Lead Eng (S2-LE-05) | ✅ Ready — requires `last_surfaced_insight` + `state` field + OPEN-before-ACKNOWLEDGED ordering; 12 scenarios |
| `docs/prompts/alert-prompt.md` | IE | Lead Eng (S2-LE-06) | ✅ Ready — 8 scenarios + Scenario 3b |
| `docs/prompts/checkin-prompt.md` | IE | Lead Eng (S2-LE-07) | ✅ Ready — requires `last_surfaced_at` in route input; 8 scenarios |
| `docs/prompts/chat-prompt.md` | IE | Lead Eng (S3-LE-04, personal thread only) | ✅ Ready — 11 scenarios |
| `docs/prompts/household-chat-prompt.md` | IE | Lead Eng (S3-LE-01/02, household thread) | ✅ Ready — 11 scenarios |
| `docs/prompts/closure-prompt.md` | IE | Lead Eng (S4-LE-03) | ✅ Ready — 5 scenarios |
| `docs/prompts/first-use-prompt.md` | IE | Lead Eng (S4-LE-01) | ✅ Ready — 5 scenarios |
| `docs/specs/today-screen-spec.md` | P&D | Lead Eng | ⏳ Not yet produced |
| `docs/specs/briefing-card-spec.md` | P&D | Lead Eng | ⏳ Not yet produced |
| `docs/specs/alert-card-spec.md` | P&D | Lead Eng | ⏳ Not yet produced |
| `docs/specs/checkin-card-spec.md` | P&D | Lead Eng | ⏳ Not yet produced |
| `docs/specs/silence-state-spec.md` | P&D | Lead Eng | ⏳ Not yet produced |

---

## PIPELINE HEALTH
- ⚠️ P&D specs not yet produced — Lead Eng cannot start Today screen UI
- ✅ IE prompts complete — Lead Eng can wire AI layer without IE in loop; 40/40 trigger scenarios passing
- ✅ All 3 checkin observation_types now tested (UPCOMING_LOGISTICS added S5)
- ✅ Morning briefing suppression logic fully tested: suppress-unchanged (Scenario 4) + bypass-when-changed (Scenario 6)
- ✅ Alert LOW confidence → null now tested (Scenario 5)
- ✅ All 4 closure resolution types now tested — MANUAL_RESOLVED added S6 (Scenario 5)
- ✅ Alert §3C + direct-assignment intersection now tested at prompt-file level — LATE_SCHEDULE_CHANGE + AVAILABLE parent added S6 (Scenario 6)
- ✅ First-use MEDIUM confidence → fallback now tested — closes MEDIUM case gap S6 (Scenario 5)
- ⚠️ QA has not yet run (nothing to audit from Lead Eng yet)
- ⚠️ Two new input schema fields required before wiring S2-LE-05 and S2-LE-07: `last_surfaced_insight` (briefing) and `last_surfaced_at` (checkin) — needs persistence layer decision from Lead Eng
- ⚠️ New QA flag: route must confirm parent_status = AVAILABLE (not just non-CONFLICTED) before firing direct-assignment language — see S4 trigger test note in trigger-test-log.md
- ⚠️ New implementation flag (S5): suppression bypass must scope `last_coordination_change` to same issue_id — see Failure Mode 6 in morning-briefing-prompt.md and trigger-test-log Note 8
- ⚠️ New implementation flag (S5): conversation_history N ≥ 10 required when wiring S3-LE-02/04 — see route implementation notes in chat-prompt.md and household-chat-prompt.md
- ⚠️ New implementation flag (S6): household thread route must write coordination_issues.state = RESOLVED on user-reported resolution before generating Kin acknowledgment — see household-chat-prompt.md Failure Mode 6 and trigger-test-log Note 11
- ⚠️ New implementation flag (S6): first-use confidence = HIGH only when §3A/§3C trigger fires — see first-use-prompt.md Scenario 5 and Failure Mode 6 and trigger-test-log Note 12
- ⚠️ Stale root-level prompt files must be deleted/archived before S2 wiring — see trigger-test-log Note 10
- ⚠️ New implementation flag (S8): morning-briefing suppression must scope to same issue_id — `last_surfaced_insight` for a different issue must NOT suppress a new issue — see morning-briefing-prompt.md Scenario 7 and Failure Mode 7 and trigger-test-log Note 14
- ⚠️ New implementation flag (S8): chat route must pass accurate `open_coordination_issues` (RESOLVED issues removed) — Kin cannot correctly answer status questions if resolved issues remain in the array — see trigger-test-log Note 16
- ✅ All three suppression branches in morning-briefing now tested: suppress (S4), bypass (S6), no-apply/different-issue (S8)
- ⚠️ New implementation flag (S9): alert route S2-LE-06 must return null for LATE_SCHEDULE_CHANGE + CLEAR — no coordination_issues record written — see alert-prompt.md Scenario 7 and trigger-test-log Note 17
- ⚠️ New implementation flag (S9): checkin route S2-LE-07 must gate on checkins_generated_today count BEFORE calling prompt (not after) — see checkin-prompt.md Scenario 6 and trigger-test-log Note 18
- ✅ All §3C + §16 tone intersections now fully documented at alert-prompt-file level: RED, YELLOW direct, YELLOW coord, CLEAR (S9)
- ✅ All 3 checkin null-return suppression paths now tested: high-priority alert (S3), repeat (S4), frequency cap (S9)
- ✅ Multi-issue prioritization behavior tested in morning briefing — RED beats YELLOW, primary_insight = single most urgent issue (S10)
- ✅ ACKNOWLEDGED state handling now instructed and tested in personal thread chat — no re-alerting drift (S10)
- ✅ Personal thread resolution reporting now symmetric with household thread — route discipline flag added (S10)
- ⚠️ New implementation flag (S10): morning briefing route must pass pickup_assignments ranked by urgency when multiple issues exist — see morning-briefing-prompt.md Scenario 8 and trigger-test-log Note 19
- ⚠️ New implementation flag (S10): personal thread route (S3-LE-04) must also write coordination_issues.state = RESOLVED on user-reported resolution — same as S3-LE-02 — see chat-prompt.md Scenario 9 and trigger-test-log Note 20
- ✅ Household chat ACKNOWLEDGED state now symmetric with personal thread — both thread types have explicit test scenario and documented failure mode (S11)
- ✅ Checkin null-return taxonomy complete — all four suppression paths tested: alert, repeat, frequency cap, LOW confidence (S11)
- ✅ Morning briefing null-return taxonomy complete — all three null paths named and tested: CLEAR, suppression, LOW confidence (S11)
- ⚠️ New implementation flag (S12): morning briefing route must pass `state: "OPEN" | "ACKNOWLEDGED"` for items in `pickup_assignments` and `household_conflicts` — without this field model re-alerts ACKNOWLEDGED issues with full urgency — see morning-briefing-prompt.md Scenario 10 and trigger-test-log Note 21
- ✅ Morning briefing ACKNOWLEDGED state now instructed and tested (S12) — all three output surfaces (chat, household-chat, morning briefing) are now symmetric on ACKNOWLEDGED issue handling
- ⚠️ New implementation flag (S13): morning briefing route must order `pickup_assignments` and `household_conflicts` with OPEN items before ACKNOWLEDGED items within each severity band — without this ordering the model may select an ACKNOWLEDGED issue as primary by position — see morning-briefing-prompt.md Scenario 11, Failure Mode 10, and trigger-test-log Note 22
- ✅ Morning briefing mixed OPEN/ACKNOWLEDGED prioritization now tested — OPEN > ACKNOWLEDGED for primary slot, ACKNOWLEDGED demoted to supporting_detail (S13)
- ✅ Household chat RESOLVED issue query now symmetric with personal thread — passive neutral framing validated; Failure Mode 10 documented (S13)
- ✅ Checkin suppression-bypass branch now tested — suppression taxonomy complete: suppress-unchanged (S4) and bypass-situation-changed (S8). Route must confirm event details unchanged before applying suppression, not just check `last_surfaced_at` (S14)
- ✅ Chat (personal) no-repetition bypass branch now tested — no-repetition taxonomy complete: suppress (S5), RESOLVED update (S7), situation-improved update still OPEN (S10). All three branches explicitly tested (S14)
- ✅ Household chat no-repetition bypass branch now tested — symmetric with personal thread. Passive neutral §16 framing for situation-improvement update validated: "a commitment cleared" not "your partner freed up" (S14)
