# QA & Standards Audit — 2026-04-08 (Run BM)

**Run:** BM (odd-hour :00 automated run)
**Date:** 2026-04-08
**Auditor:** QA & Standards Lead
**Prior run:** Run BK (2026-04-08, 14:06) — P0/P1 resolved; no P0/P1 in codebase at BK close
**HEAD commit at time of audit:** `c63b0ff` (QA Run BK audit + SPRINT.md update, 2026-04-08 14:06)
**Working tree:** SPRINT.md modified (Lead Eng run BL header update — uncommitted)

---

## Step 1 — Orientation

**Commits since QA Run BK (`c63b0ff`):**
None. HEAD is unchanged from BK close.

**Lead Eng run BL:** SPRINT.md header update only (P2-NEW-BK-1 resolution). No app code changed. Working tree shows the header update is uncommitted.

**IE Session 14** (committed in `3ec79db`, 2026-04-08 14:05 — just before BK):
- `chat-prompt.md`: ACKNOWLEDGED/RESOLVED state framing (Scenarios 5-8, Failure Modes 6-7)
- `alert-prompt.md`: ROUTING GATE section (do not call for ACKNOWLEDGED/RESOLVED issues)
- `checkin-prompt.md`: `last_surfaced_at` added to INPUT FORMAT (Failure Mode 4 fix)

Run BK audited IE Session 14 staged changes as clean. This run re-verifies committed state.

**Focus this run:** Carry-forward verification of all open issues; fresh check on IE Session 14 committed prompt changes; P2-NEW-BK-2 status; domain files clarification.

---

## Step 2 — Architecture Audit

| Check | Result |
|-------|--------|
| Exactly 3 tabs in `_layout.tsx` (`index`, `chat`, `settings`) | ✅ PASS — confirmed lines 13–15 |
| No domain tabs (meals, budget, fitness, family) in tab bar | ✅ PASS — only `index`, `chat`, `settings` present |
| `InstrumentSerif-Italic` registered in `apps/mobile/app/_layout.tsx` | ✅ PASS — line 65: `"InstrumentSerif-Italic": require("../assets/fonts/InstrumentSerif-Italic.ttf")` |
| `024_coordination_issues.sql` migration present | ✅ PASS |
| `029_morning_briefing_log.sql` migration present | ✅ PASS |

**Domain files note (audit record correction):**
QA Run BK reported `meals.tsx`, `budget.tsx`, `fitness.tsx`, `family.tsx` as present (`✅ PASS`). **This was incorrect.** These files do not exist anywhere in the codebase (confirmed via exhaustive `find` across entire repo, excluding `node_modules`). They were deleted in Lead Eng run BD (commit `3f63d1e`, 2026-04-06, message: "dead tab cleanup"). ARCH-PIVOT-2026-04-03.md specified "do NOT delete files," but the deletion occurred and has been in place for all QA runs since BD without triggering a P0/P1.

**Data layer assessment:** The data-source functionality is fully intact. `assembleFamilyContext()` in `apps/mobile/lib/kin-ai.ts` (line 39) queries Supabase directly for meal plans, budget, activities, pets, etc. Web API routes for domain data (`/api/meals/`, `/api/budget/check-overspend`, etc.) exist at `apps/web/src/app/api/`. The mobile tab screen files were separate from the data layer. The deletion removed UI shell files, not data queries or business logic.

**Recommended action:** No code fix required. Correction to QA audit record only. CoS to note this in SPRINT.md as a resolved clarification item.

---

## Step 3 — Hero Typography Verification (P0-NEW-BH-1 carry-forward)

**Status: ✅ CONFIRMED RESOLVED (carry-forward from Run BK)**

All 6 hero elements use `"InstrumentSerif-Italic"` in HEAD:
- `index.tsx` line 885: `displayName` ✅
- `index.tsx` line 922: `briefingTitle` ✅
- `index.tsx` line 949: `briefingHook` ✅
- `index.tsx` line 1133: `cleanDayText` ✅
- `chat.tsx` line 964: `listTitle` ✅
- `chat.tsx` line 1012: `pinnedThreadName` ✅

Font registered at `_layout.tsx` line 65 ✅ — all 6 will render spec typography on device.

---

## Step 4 — Today Screen Output Compliance (§5, §7, §12)

Auditing `apps/mobile/app/(tabs)/index.tsx` HEAD state.

### §5 — Output Limits

| Check | File/Location | Result |
|-------|--------------|--------|
| Morning briefing: max 4 sentences | `parseBriefingBeats()` line 91: `.slice(0, 4)` | ✅ PASS |
| Alert cards: 1 active OPEN at a time | Line 668: `activeOpenAlert = openIssues[0] ?? null` | ✅ PASS |
| Check-in cards: max 2/day | Line 845: `checkins...slice(0, 2)` | ✅ PASS |
| Check-ins suppressed when High-priority alert OPEN | Line 671: `showCheckins = activeOpenAlert === null` | ✅ PASS |

### §7 — Silence Rules

| Check | File/Location | Result |
|-------|--------------|--------|
| `CleanDayState` renders when no content | Lines 857–858: `!briefingLoading && !hasContent && !firstUseContent` gates `CleanDayState` | ✅ PASS |
| `hasContent` gate correct | Lines 676–683: covers briefing, open alerts, acknowledged, resolved, events, check-ins | ✅ PASS |
| No placeholder/spinner in empty state | `CleanDayState` component at line 258 renders text only (no spinner, no skeleton) | ✅ PASS |

### §12 — Alert State Machine

| State | Visual | Action | Persistence | Result |
|-------|--------|--------|-------------|--------|
| OPEN | Bold (`alertCardOpen`), amber dot, CTA footer | Dismiss → ACKNOWLEDGED (`onAcknowledge`); Tap → chat | Supabase `.update({ state: "ACKNOWLEDGED" })` line 612 | ✅ PASS |
| ACKNOWLEDGED | Muted (`alertCardAcknowledged`), no action affordance | None | State from Supabase via Realtime | ✅ PASS |
| RESOLVED | Closure line ("Sorted. I'll flag it if anything changes."), 1400ms + 600ms fade | Auto-remove | State from Supabase via Realtime | ✅ PASS |

Closure line at line 157: `"Sorted. I'll flag it if anything changes."` — exact spec relief language ✅

---

## Step 5 — IE Session 14 Prompt Audit (Committed in `3ec79db`)

### `alert-prompt.md` — ROUTING GATE Section

New addition: `## ROUTING GATE — ACKNOWLEDGED STATE` (lines 75–83). Spec-compliant:
- Correctly limits prompt to `OPEN` state only ✅
- Does NOT call for `ACKNOWLEDGED` or `RESOLVED` ✅
- Rationale for routing gate provided (prevents overwriting content parent already read) ✅
- No forbidden openers in any example outputs ✅

### `checkin-prompt.md` — `last_surfaced_at` in INPUT FORMAT

New field: `last_surfaced_at: ISO timestamp or null` (line 65). Spec-compliant:
- Implements Failure Mode 4 fix (repeat suppression for check-ins) ✅
- Return null condition: if `last_surfaced_at` non-null and observation unchanged ✅
- No forbidden openers in any example outputs ✅

### `chat-prompt.md` — ACKNOWLEDGED/RESOLVED State Scenarios (Scenarios 5-8, Failure Modes 6-7)

| Addition | Assessment |
|----------|------------|
| Scenario 5: Clean state | ✅ PASS — 1 sentence, specific, no forbidden opener, no "You're all set" |
| Scenario 6: LOW confidence — terminal uncertainty (personal thread) | ✅ PASS — "I don't have enough information on that right now." Terminal. No forbidden opener. |
| Scenario 7: RESOLVED issue from conversation history | ✅ PASS — "Leo's 5:30 was sorted — it's off the list." Past tense. No coverage-gap language. |
| Scenario 8: ACKNOWLEDGED issue — softer framing | ✅ PASS — "Leo's 5:30 is flagged and acknowledged — has it been sorted yet?" Correct ACKNOWLEDGED register. Not OPEN urgency. |
| Failure Mode 6: ACKNOWLEDGED re-alerted with OPEN urgency | ✅ PASS — correctly documented with fix |
| Failure Mode 7: RESOLVED re-surfaced with coverage-gap language | ✅ PASS — correctly documented with fix |

No forbidden openers in any expected output. Confidence signaling correct. ✅

---

## Step 6 — Social Tone Audit (§16)

### `household-chat-prompt.md` — Framing

| Scenario | Spec Requirement | Built | Result |
|----------|-----------------|-------|--------|
| Both parents conflicted | Collaborative: "You've both got conflicts at that time — [implication]." | Line 59: exactly spec language | ✅ PASS |
| One parent created conflict | Neutral, no attribution: "A schedule change lands on [event] — [implication]." | Line 60: neutral framing, no name | ✅ PASS |
| Ambiguous responsibility | Coordination prompt: "Coverage for [event] is unclear — worth a quick decision between you." | Line 61: spec-compliant, no assignment | ✅ PASS |
| No forbidden openers in framing examples | None of the 3 framing examples use forbidden openers | Confirmed | ✅ PASS |

P1-NEW-2 resolution confirmed: "It looks like…" no longer appears in the ambiguous-responsibility framing example. The forbidden opener list at line 49 correctly includes it. ✅

---

## Step 7 — Confidence Signaling Audit (§23)

Checked across `chat-prompt.md`, `alert-prompt.md`, `checkin-prompt.md`, `household-chat-prompt.md`:

| Check | Result |
|-------|--------|
| HIGH confidence → direct, no qualifier | ✅ PASS — all prompts |
| MEDIUM confidence → one qualifier max | ✅ PASS — "looks like", "probably", "worth confirming" only |
| No double-qualifier outputs in test examples | ✅ PASS — no stacked hedges in any expected output |
| LOW confidence → null or explicit uncertainty (not silence) | ✅ PASS — alert/checkin return null; chat prompts return explicit uncertainty statement |

---

## Step 8 — Code Quality Check

### `apps/web/src/app/api/morning-briefing/route.ts` (commit `a83a540` — carry-forward from BK)

| Check | Result |
|-------|--------|
| No bare `console.error` | ✅ PASS — all 3 error handlers gated: `if (process.env.NODE_ENV !== "production")` (lines 520, 569, 613) |
| No `any` TypeScript types | ✅ PASS — `MorningBriefingLogRow` interface defined; no `any` types found |
| No unused imports | ✅ PASS |
| All async operations have try/catch | ✅ PASS — outer try/catch on GET/POST; inner try/catch on admin client + log write |

### `apps/web/src/app/api/chat/route.ts`

| Check | Result |
|-------|--------|
| No bare `console.error` | ✅ PASS — 0 results |
| No `any` TypeScript types | ✅ PASS — 0 results |
| `HOUSEHOLD_CHAT_SYSTEM_PROMPT` wired | ✅ PASS — full prompt at lines 175–175+ |
| 6 correct context keys documented in wired prompt | ✅ PASS — lines 253–262 (speaking_to, today_events, partner_today_events, open_coordination_issues, recent_schedule_changes, partner_recent_schedule_changes) |
| `pickup_assignments` removed from wired prompt | ✅ PASS — Note on pickup assignments at line 262 replaces it |

---

## Step 9 — Scope Guard

| Check | Result |
|-------|--------|
| Domain tabs reintroduced to navigation | ✅ CLEAN |
| Web app UI changes | ✅ CLEAN |
| Android targets introduced | ✅ CLEAN |
| Layer 2/3 features (Schedule Compression, Escalation tiers) | ✅ CLEAN |
| Any new feature files in (tabs)/ | ✅ CLEAN — only `index.tsx`, `chat.tsx`, `settings.tsx`, `_layout.tsx` |

---

## New Findings

### P2-NEW-BM-1 — Stale Context Keys in `household-chat-prompt.md` Test Scenarios

**Priority:** P2
**Owner:** IE
**File:** `docs/prompts/household-chat-prompt.md`

Several test scenario contexts include keys that the route does not actually send:
- `household_thread: true` appears in Scenario 1 (line 123), Scenario 6 (line 199), and others
- `pickup_assignments: []` appears in Scenario 6 (line 201)

The `## CONTEXT PROVIDED PER MESSAGE` section is correct (P1-NEW-1 and P2-NEW-3 were resolved in run BA) and the wired `HOUSEHOLD_CHAT_SYSTEM_PROMPT` in route.ts does not include these stale keys. The test scenario contexts are documentation-level examples and do not affect the live system prompt text.

**Impact:** Low. Test scenarios are illustrative; the model reads the system prompt, not the scenario context labels. However, stale keys create confusion for IE and future QA reviewers auditing these scenarios.

**Fix:** IE to update test scenario contexts to match the 6 actual route keys: remove `household_thread: true` and `pickup_assignments: []` from scenario input blocks, add `speaking_to` where missing.

---

### Audit Record Correction — Domain Screen Files

**No action required.** See Step 2 "Domain files note" above. Prior QA Run BK incorrectly reported `meals.tsx`, `budget.tsx`, `fitness.tsx`, `family.tsx` as present. They were deleted in run BD (2026-04-06). Data layer is intact. This note corrects the audit record; no code fix required.

---

## Carry-Forward Issues (Verified This Run)

| Issue | Check | Status |
|-------|-------|--------|
| P2-NEW-BK-1: SPRINT.md header not updated | Working tree shows Lead Eng BL updated header | ✅ RESOLVED (pending commit) |
| P2-NEW-BK-2: Auth/onboarding font swaps (CalendarConnectModal/sign-in/sign-up) | Confirmed in HEAD: all 3 files use `Geist-SemiBold` for headline/subtitle. P&D spec verification outstanding. | ⚪ OPEN — P&D verification pending |
| P2-7: `morning-briefing-prompt.md` INPUT FORMAT mismatch | Line 56: still describes `{ issue_id, surfaced_at }` not `insight_summary` text | 🟡 OPEN — IE to fix |
| P2-NEW-7: conversation history not filtered by `thread_id` | Carry-forward — post-TestFlight scope | ⚪ OPEN (post-TF) |
| B2: RevenueCat iOS app + entitlement | Not in scope for code audit — Austin-owned | 🔴 OPEN (Austin) |
| B4: Google OAuth verification | Not in scope for code audit — Austin-owned | 🟡 OPEN (Austin) |

---

## What Passed Clean

- ✅ Architecture: 3-tab shell, `InstrumentSerif-Italic` registered, no domain nav
- ✅ All 6 hero elements: `InstrumentSerif-Italic` in HEAD
- ✅ §5 output limits: 4-sentence cap, 1-alert queue, 2-checkin max, suppression logic
- ✅ §7 silence rules: `hasContent` gate, `CleanDayState`, `parseBriefingBeats` null path
- ✅ §8 tone: no forbidden openers in expected outputs across all 4 prompts
- ✅ §12 alert state machine: OPEN/ACKNOWLEDGED/RESOLVED visual + state + persistence
- ✅ §16 social tone: household framing compliant (collaborative, neutral, coordination prompt)
- ✅ §23 confidence: HIGH/MEDIUM/LOW correctly implemented in all prompts
- ✅ Code quality: 0 bare console.error, 0 any types, all error paths caught
- ✅ IE Session 14: alert/chat/checkin prompt additions spec-compliant
- ✅ P1-CARRY-BF-1: repeat suppression wired and functional
- ✅ P1-NEW-2: forbidden opener removed from household-chat framing example
- ✅ Scope guard: no Layer 2/3, no domain nav, no Android, no web UI
- ✅ `docs/prompts/docs/` stale directory: removed in `3ec79db` ✅

---

## Open Issues Table (post-Run BM)

| ID | Priority | Owner | Description | Status |
|----|----------|-------|-------------|--------|
| B2 | 🔴 P0 | **Austin** | RevenueCat iOS app + entitlement not configured — sole TestFlight gate | OPEN |
| B4 | 🟡 P1 | **Austin** | Google OAuth verification not submitted — 4–6 week review clock | OPEN |
| P2-NEW-BK-2 | ⚪ P2 | **P&D + Lead Eng** | Auth/onboarding font swaps (CalendarConnectModal/sign-in/sign-up) committed after BJ warning. P&D to verify spec; Lead Eng to fix if required. | OPEN |
| P2-7 | ⚪ P2 | **IE** | `morning-briefing-prompt.md` INPUT FORMAT: `last_surfaced_insight` schema mismatch (prompt expects `{ issue_id, surfaced_at }`, route sends `insight_summary` text). Feature works; prompt inconsistent. | OPEN |
| P2-NEW-7 | ⚪ P2 | **Lead Eng** | Conversation history not filtered by `thread_id` — post-TestFlight fix | OPEN (post-TF) |
| P2-NEW-BM-1 | ⚪ P2 | **IE** | Stale context keys (`household_thread: true`, `pickup_assignments: []`) in `household-chat-prompt.md` test scenarios. Not runtime-affecting. | NEW |

**No P0 or P1 code issues exist. Sole TestFlight gate remains Austin B2 (RevenueCat).**

---

## What Each Agent Does Next

| Agent | Next action |
|-------|-------------|
| **Lead Eng** | Commit SPRINT.md header update (BL working tree). Then standby for Austin B2 → S5.1/S5.2 TestFlight. |
| **QA** | Run BM filed. Standby for S5.3 TestFlight verification after Austin B2 + S5.2. P2-NEW-BK-2 carries. |
| **P&D** | Verify auth/onboarding screen typography spec (P2-NEW-BK-2): CalendarConnectModal headline, sign-in/sign-up subtitle — InstrumentSerif-Italic or Geist-SemiBold? |
| **IE** | (1) Fix `morning-briefing-prompt.md` INPUT FORMAT: update `last_surfaced_insight` to plain text string (P2-7). (2) Fix `household-chat-prompt.md` test scenario context keys: remove `household_thread: true`, `pickup_assignments: []` (P2-NEW-BM-1). |
| **CoS** | Update SPRINT.md: note P2-NEW-BK-1 resolved; add P2-NEW-BM-1; update domain files audit record correction. |
| **Austin** | B2 (RevenueCat — this is the only remaining TestFlight gate). B4 (Google OAuth — submit verification). |

---

_— QA & Standards Lead, 2026-04-08 (odd-hour :00 run BM)_
