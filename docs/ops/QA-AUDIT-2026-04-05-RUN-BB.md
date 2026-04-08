# QA Audit — Run BB
**Date:** 2026-04-05
**QA Run:** BB (odd-hour :00 — auditing Lead Eng run BA)
**Auditor:** QA & Standards Lead

---

## What Lead Eng Changed (Run BA)

Per SPRINT.md `**Last Updated:**` header (line 5):

1. **`apps/web/src/app/api/chat/route.ts`** — `HOUSEHOLD_CHAT_SYSTEM_PROMPT` ambiguous-responsibility framing example changed from `"It looks like [event] needs a coverage decision."` → `"Coverage for [event] is unclear — worth a quick decision between you."` (P1-NEW-2 fix — forbidden opener removed; §8 + §16 now fully consistent in wired const).
2. **`docs/prompts/household-chat-prompt.md`** — (1) Same ambiguous-responsibility fix applied to source file; (2) CONTEXT PROVIDED section rewritten to list actual 6 route keys (`speaking_to`, `today_events`, `partner_today_events`, `open_coordination_issues`, `recent_schedule_changes`, `partner_recent_schedule_changes`); (3) Note added about pickup coverage being surfaced via `open_coordination_issues` trigger_type `pickup_risk` — P1-NEW-1 addressed in source.
3. `tsc --noEmit` web: 0 new errors. Mobile: 0 new errors. ESLint `route.ts`: 0 warnings.
4. P2-NEW-4 resolved: SPRINT.md header updated.

---

## Files Audited

- `apps/mobile/app/(tabs)/_layout.tsx` (architecture spot-check)
- `apps/web/src/app/api/chat/route.ts` (primary change — HOUSEHOLD_CHAT_SYSTEM_PROMPT P1-NEW-2 fix)
- `docs/prompts/household-chat-prompt.md` (primary change — P1-NEW-2 + P2-NEW-3 source file sync)
- `supabase/migrations/` (migration presence check)

---

## Issues Found

### ✅ No P0 Issues

### ✅ No P1 Issues

### P2-NEW-BB-1 — Wired `HOUSEHOLD_CHAT_SYSTEM_PROMPT` partially mirrors source: 3 items from source CONTEXT PROVIDED section not present in wired const

**File:** `apps/web/src/app/api/chat/route.ts`, lines 247–256 (HOUSEHOLD_CHAT_SYSTEM_PROMPT CONTEXT PROVIDED section)
**Spec section:** §16, §11

**Description:**
Run BA updated both the wired `HOUSEHOLD_CHAT_SYSTEM_PROMPT` and the source `household-chat-prompt.md` to list the 6 correct context keys (P2-NEW-3 fix). However, the source file was updated with more detail than what was propagated to the wired const. Three items exist in the source but are absent from the wired const:

1. **`open_coordination_issues` description** — Source: `"array of OPEN/ACKNOWLEDGED items from coordination_issues table; \`trigger_type\` includes 'pickup_risk' for pickup coverage gaps"`. Wired const: `"array of OPEN/ACKNOWLEDGED items from coordination_issues table"` — omits the `trigger_type` / `pickup_risk` annotation.

2. **Conversation history note** — Source: `"Conversation history is provided as the preceding message turns in this thread (fetched at .limit(50) — satisfies the no-repetition rule N≥10 requirement). If context length is a concern, prefer truncating older messages over reducing below 10."` Wired const: `"Conversation history is provided as the preceding message turns in this thread."` — omits the N≥10 guidance.

3. **"Note on pickup assignments" block** — Source includes: `"> **Note on pickup assignments:** Pickup coverage is surfaced via \`open_coordination_issues\` (trigger_type: "pickup_risk") rather than a separate \`pickup_assignments\` key. When "Who's doing pickup?" is asked, reason from open issues and today_events — do not expect a structured pickup_assignments field in context."` This block is entirely absent from the wired const.

**Impact:** Without the `trigger_type: "pickup_risk"` annotation and the "Note on pickup assignments" block in the wired prompt, the model has less explicit guidance when answering "Who's doing pickup?" in the household thread. It cannot rely on the written instruction to look for `trigger_type: "pickup_risk"` in `open_coordination_issues`, increasing the risk of low-confidence or indirect responses to pickup questions. Not blocking TestFlight — the model will still have the `open_coordination_issues` array in context and can reason from it. But the explicit guidance from the source file should be in the wired const for production correctness.

**Owner:** Lead Eng
**Action:** Sync the wired `HOUSEHOLD_CHAT_SYSTEM_PROMPT` CONTEXT PROVIDED section to fully mirror `docs/prompts/household-chat-prompt.md` lines 91–102.

---

## What Passed Clean

### Step 2 — Architecture Audit ✅

- **3 tabs only in `_layout.tsx`**: `index`, `chat`, `settings` — confirmed at lines 13–15. ✅
- **No domain tabs in navigation**: `meals`, `budget`, `fitness`, `family` absent from `_layout.tsx`. ✅
- **Domain files intact**: `meals.tsx`, `budget.tsx`, `fitness.tsx`, `family.tsx` all present in `apps/mobile/app/(tabs)/`. ✅
- **`coordination_issues` migration**: `024_coordination_issues.sql` confirmed present in `supabase/migrations/`. ✅

### Step 3 — Today Screen Output Compliance ✅ (unchanged from Run AY)

Today screen components (`index.tsx`) not changed in Run BA. Prior QA Run C and subsequent runs verified §5/§7/§8/§12/§21 compliance. Spot-check confirms no changes; prior sign-off stands.

### Step 4 — Confidence Signaling (§23) ✅

Both wired `HOUSEHOLD_CHAT_SYSTEM_PROMPT` and source `household-chat-prompt.md`:
- High confidence → direct statement, no framing. ✅
- Medium confidence → one qualifier max ("looks like", "probably", "worth confirming"). ✅
- Low confidence → "I don't have enough to go on here — do you want to walk me through what changed?" ✅
- No output with two qualifiers. ✅

Note: "looks like" appears as a Medium confidence qualifier. The forbidden opener is "It looks like…" (at message start). The qualifier usage is mid-sentence — not an opener violation. ✅

### Step 5 — Social Tone (§16) ✅ — S4.6 UNBLOCKED

This is the primary audit target for Run BB. All §16 requirements verified in both the wired const and source file:

- **P1-NEW-2 RESOLVED**: Ambiguous-responsibility example `"It looks like [event] needs a coverage decision."` fully replaced with `"Coverage for [event] is unclear — worth a quick decision between you."` in BOTH `route.ts` HOUSEHOLD_CHAT_SYSTEM_PROMPT (line 217) AND `docs/prompts/household-chat-prompt.md` (line 61). ✅
- **Forbidden opener removed**: "It looks like" no longer appears in any output-facing position in the household prompt. It only appears in the forbidden openers list (correctly). ✅
- **Both parents conflicted → collaborative**: `"You've both got conflicts at that time — [implication]."` ✅
- **One parent created conflict → neutral**: `"A schedule change lands on [event] — [implication]."` — source not named. ✅
- **Ambiguous → coordination prompt**: `"Coverage for [event] is unclear — worth a quick decision between you."` — MEDIUM confidence, no assignment. ✅
- **Never name a parent**: Explicit prohibition in both wired and source. ✅
- **Household thread balanced**: Neither parent singled out; collaborative framing for shared conflicts. ✅
- **Scenario 2 test output in source file**: `"A schedule change lands on Leo's 5:30 pickup — it probably needs a decision between you."` — neutral framing, one qualifier ("probably"), no forbidden opener. ✅

**§16 PASSES. S4.6 is now unblocked — both P1-NEW-1 (addressed in source) and P1-NEW-2 (resolved in wired + source) are cleared. CoS should mark S4.6 DONE pending sign-off.**

### Step 5b — Household Context (P1-NEW-1 verification) ✅

- **Route context correct**: Route sends `open_coordination_issues` (including `trigger_type`), not `pickup_assignments`. Confirmed in context object assembly (route.ts lines 505–511). ✅
- **Source file documented**: `household-chat-prompt.md` now includes "Note on pickup assignments" block explaining pickup coverage surfaces via `trigger_type: "pickup_risk"`. ✅
- **Wired const gap filed as P2-NEW-BB-1** above — source more complete than wired; not a P1 since the route is correct and model can reason from the actual context data.

### Step 6 — Code Quality ✅

**`apps/web/src/app/api/chat/route.ts`:**
- **No bare `console.error`**: Zero matches. ✅
- **No TypeScript `any` types**: "any" appears only inside string literal content (prompt text), not as TypeScript type annotations. ✅
- **No unused imports**: All 6 imports (`NextResponse`, `createClient`, `getAuthenticatedUser`, `getAnthropicClient`, `ANTHROPIC_MODEL`, `Anthropic`, `Sentry`) are used in the file. ✅
- **Outer try/catch**: `catch (err)` at line 635 wraps all user-facing operations and returns a structured error response via `NextResponse.json`. ✅

**`docs/prompts/household-chat-prompt.md`:**
- Prompt text only (no executable code). ✅

### Step 7 — Failure Modes (§11) ✅

**Wired `HOUSEHOLD_CHAT_SYSTEM_PROMPT` and source file checked:**
- No vague outputs: Prompt explicitly blocks "Looks like you have a busy evening" class outputs; implication-first rule enforced. ✅
- No wrong parent assignment: Household thread explicitly never attributes blame or assigns responsibility to a named parent. ✅
- No forbidden opener in scenario outputs: All 9 test scenario expected outputs verified — none open with a forbidden opener. ✅
- No generic reassurance: "I've got this" / "Don't worry" / "You're all set" explicitly blocked. ✅

### Scope Guard ✅

- No domain tabs added back to navigation. ✅
- No web app UI changes (route.ts is a backend API route, not web UI). ✅
- No Android targets introduced. ✅
- No Layer 2/3 intelligence features (Schedule Compression, Escalation tiers, etc.). ✅

---

## Previously Open Items — Status

| Issue | Prior Status | This Run |
|-------|-------------|----------|
| P1-NEW-1 (pickup_assignments context key mismatch) | Addressed by Run BA | ✅ Addressed — route correct; source documented; P2-NEW-BB-1 filed for wired-const gap |
| P1-NEW-2 (forbidden opener in ambiguous-responsibility example) | Resolved by Run BA | ✅ VERIFIED RESOLVED — confirmed in route.ts line 217 + source file line 61 |
| P2-NEW-3 (CONTEXT PROVIDED stale keys) | Resolved by Run BA (source file) | ✅ VERIFIED RESOLVED — 6 correct keys in both wired const and source |
| P2-NEW-4 (SPRINT.md header not updated) | Resolved by Run BA | ✅ Implicitly resolved — header shows "run BA" update |
| P2-NEW-7 (conversation history not filtered by thread_id) | Open — post-TestFlight | Still open — confirmed at route.ts lines 453–459 |
| P2-7 (IE INPUT FORMAT in morning-briefing-prompt.md) | Open — IE action | Not in scope this run |
| B2 (Austin RC entitlement + bundle ID + API key) | Open — Austin action | Not in scope this run |
| B4 (Austin OAuth branding) | Open — Austin action | Not in scope this run |

---

## Spec Sections Verified This Run

- §5 — Output limits (spot-check; Today screen unchanged)
- §7 — Silence rules (spot-check; Today screen unchanged)
- §8 — Tone, forbidden openers (household-chat-prompt.md + route.ts)
- §11 — Failure modes (household-chat-prompt.md)
- §12 — Alert state machine (architecture spot-check; unchanged)
- §16 — Social tone calibration — **PRIMARY AUDIT TARGET** (household-chat-prompt.md + route.ts) — PASSES
- §23 — Confidence signaling (household-chat-prompt.md + route.ts)

---

## Critical Path Assessment

**§16 passes. S4.6 is UNBLOCKED.**

All prior P1s resolved or addressed. No new P1s. One new P2 (P2-NEW-BB-1 — wired const missing 3 source items; not blocking TestFlight).

Critical path: ~~QA audits §16 → S4.6 closes~~ **→ Austin B2 (RC entitlement + bundle ID + API key) → S5.2 TestFlight.**

Lead Eng has one P2 action (P2-NEW-BB-1 — sync wired const to mirror source). Can be done in parallel with Austin's B2 actions — does not gate TestFlight.

---

_— QA & Standards Lead, 2026-04-05, Run BB_
