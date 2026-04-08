# QA & Standards Audit — 2026-04-08 (Run BK)

**Run:** BK (odd-hour :00 automated run)
**Date:** 2026-04-08
**Auditor:** QA & Standards Lead
**Prior run:** Run BJ (2026-04-07) — P0-NEW-BH-1 and P1-CARRY-BF-1 both OPEN

---

## Session Focus

Primary: Verify resolutions of P0-NEW-BH-1 (font registration) and P1-CARRY-BF-1 (morning_briefing_log wiring) committed in `a83a540` (Lead Eng, 2026-04-08 08:28). Audit code quality of changed files. Check working tree for new issues.

**Files changed since Run BJ:**
- `a83a540` — `apps/mobile/app/_layout.tsx` (1 line), `apps/web/src/app/api/morning-briefing/route.ts` (65 lines)
- `13ffbb5` — `docs/ops/DAILY-BRIEFING-2026-04-08.md`, `docs/ops/cto-backlog.md`, `docs/ops/cto-flags.md` (ops only)

---

## Step 2 — Architecture Audit

| Check | Result |
|-------|--------|
| Exactly 3 tabs in `_layout.tsx` (`index`, `chat`, `settings`) | ✅ PASS |
| No domain tabs (meals, budget, fitness, family) in tab bar | ✅ PASS |
| Domain files exist (not deleted) | ✅ PASS — `meals.tsx`, `budget.tsx`, `fitness.tsx`, `family.tsx` present |
| `024_coordination_issues.sql` migration present | ✅ PASS (carry-forward — verified prior runs) |

Architecture is clean. No regressions.

---

## Step 3 — P0-NEW-BH-1 Resolution Verification

**Status: ✅ CONFIRMED RESOLVED**

`apps/mobile/app/_layout.tsx` line 65:
```
"InstrumentSerif-Italic": require("../assets/fonts/InstrumentSerif-Italic.ttf"),
```

Font is registered. All 6 hero element references in `index.tsx` (lines 885, 922, 949, 1133) and `chat.tsx` (lines 964, 1012) are `"InstrumentSerif-Italic"` and will now render correctly on device.

P2-TYPO-1 through P2-TYPO-4 confirmed still resolved: all 4 style declarations (`displayName`, `briefingTitle`, `briefingHook`, `listTitle`) use `"InstrumentSerif-Italic"` in HEAD.

---

## Step 4 — P1-CARRY-BF-1 Resolution Verification

**Status: ✅ CONFIRMED RESOLVED**

`apps/web/src/app/api/morning-briefing/route.ts` now includes:

**Read (before AI call):**
- Lines 86–100: admin client initialized; `morning_briefing_log` queried for entries from yesterday/today matching `${profileId}:%` pattern; `lastLogEntry` populated
- Non-fatal: graceful degrade if admin client unavailable (no service role key in dev)

**Context injection (lines 363–375):**
- `last_surfaced_insight` block injected into `briefingContext` with day label ("earlier today" / "yesterday") and `insight_summary` text
- Includes INSTRUCTION to return null if situation materially unchanged (§7 silence rule)

**Write (after AI response, lines 486–507):**
- `insight_key = ${profileId}:${insightCategory}` where `insightCategory` = first open issue's `trigger_type` or `"routine"`
- `insight_summary` = parsed `primary_insight` from AI response
- `briefing_date` = today
- Fire-and-forget; unique constraint `(insight_key, briefing_date)` dedupes same-day regen
- Non-fatal: write failure does not block briefing delivery

Repeat suppression (§7/§11) is now functional end-to-end.

---

## Step 5 — Code Quality Audit: `morning-briefing/route.ts`

| Check | Result |
|-------|--------|
| No bare `console.error` | ✅ PASS — all 3 error handlers gated: `if (process.env.NODE_ENV !== "production")` |
| No `any` TypeScript types in new code | ✅ PASS — `MorningBriefingLogRow` interface defined; inline types used for query results |
| No unused imports | ✅ PASS — `createAdminClient` used; `checkRateLimit`/`rateLimitResponse` used in GET+POST |
| All async operations have try/catch | ✅ PASS — outer try/catch on both GET/POST; inner try/catch on admin client + log write |
| Rate limiting wired | ✅ PASS — `checkRateLimit(user.id, "morning-briefing")` at top of both GET and POST handlers |

Code quality: clean.

---

## Step 5b — P2-NEW-BH-1 Resolution Verification

**Status: ✅ CONFIRMED RESOLVED (prior to this run)**

`apps/web/src/lib/rate-limit.ts` is committed in `9ad1db0` (Apr 7 catch-up commit, 109 lines). `apps/web/package.json` updated with `@upstash/ratelimit` + `@upstash/redis` in same commit. All 3 API routes that import `rate-limit.ts` were included in `9ad1db0`.

---

## Step 6 — Working Tree Audit

Current `git status --short` shows staged (not yet committed) changes:

| File | Status | Assessment |
|------|--------|------------|
| `docs/prompts/alert-prompt.md` | M (staged) | IE Session 14 — ROUTING GATE section for ACKNOWLEDGED state. Spec-compliant addition. |
| `docs/prompts/chat-prompt.md` | M (staged) | IE Session 14 — ACKNOWLEDGED/RESOLVED framing guidance. Spec-compliant. |
| `docs/prompts/checkin-prompt.md` | M (staged) | IE Session 14 — `last_surfaced_at` field added to INPUT FORMAT. Spec-compliant. |
| `docs/prompts/trigger-test-log.md` | M (staged) | IE Session 14 — test log update. Normal. |
| `docs/ops/DAILY-BRIEFING-2026-04-08.md` | M (staged) | CoS/ops update. Normal. |
| `docs/prompts/docs/` (all files) | D (staged deletions) | Austin misc cleanup — stale IE shadow directory finally being removed. |

No app code in working tree. P2-NEW-BJ-1 font swap files (CalendarConnectModal, sign-in, sign-up) are NOT present as working-tree changes — but see NEW FINDING P2-NEW-BK-2 below.

---

## Step 7 — Scope Guard

| Check | Result |
|-------|--------|
| Domain tabs reintroduced | ✅ CLEAN |
| Web app UI changes | ✅ CLEAN |
| Android targets introduced | ✅ CLEAN |
| Layer 2/3 features built before TestFlight | ✅ CLEAN |

---

## New Findings

### P2-NEW-BK-1 — SPRINT.md Header Not Updated After P0/P1 Resolution

**Priority:** P2
**Owner:** Lead Eng

`SPRINT.md` `**Last Updated:**` header still reads "2026-04-07 — QA & Standards (odd-hour :00 run BJ)" with P0-NEW-BH-1 marked UNRESOLVED. Neither `a83a540` (Lead Eng) nor `13ffbb5` (Austin ops) updated the SPRINT.md header or blockers table. Per AGENT-PIPELINE.md handoff protocol, Lead Eng must update SPRINT.md at end of each session. CoS should also update blockers table this cycle.

**Fix:** Lead Eng to update `**Last Updated:**` header at start of next session and mark P0-NEW-BH-1 and P1-CARRY-BF-1 resolved in blockers table.

---

### P2-NEW-BK-2 — Auth/Onboarding Font Swaps Committed Without Spec Verification

**Priority:** P2
**Owner:** P&D (verification), Lead Eng (fix if required)

Run BJ (2026-04-07) explicitly warned: do NOT commit the font swaps in `CalendarConnectModal.tsx` (headline), `sign-in.tsx` (subtitle), `sign-up.tsx` (subtitle) that changed `"InstrumentSerif-Italic"` → `"Geist-SemiBold"` as a workaround for the unregistered font. These files were committed in `9ad1db0` (Apr 7 20:38) — **after** Run BJ issued the warning.

Current HEAD state of those files:
- `CalendarConnectModal.tsx`: headline and related styles → `"Geist-SemiBold"`
- `sign-in.tsx`: subtitle → `"Geist-SemiBold"`
- `sign-up.tsx`: subtitle → `"Geist-SemiBold"`

With P0-NEW-BH-1 now fixed (font registered), these should use `"InstrumentSerif-Italic"` IF spec requires it for these elements. No spec file for auth/onboarding screen typography was verified this session.

**Fix path:** P&D to verify whether auth/onboarding screens use InstrumentSerif-Italic for headlines/subtitles per spec. If yes: Lead Eng reverts these 3 files. If Geist-SemiBold is intentional for auth screens: P&D to document in relevant spec and QA to close.

Note: This is NOT blocking TestFlight. App Store screenshots focus on the Today screen and Conversations screen, not auth screens.

---

### P2-7 SCOPE UPDATE — morning-briefing-prompt.md Schema Mismatch Now More Specific

**Priority:** P2
**Owner:** IE

Prior finding: INPUT FORMAT section describes structured JSON input that route never sends.

Updated scope after P1-CARRY-BF-1 fix: The `morning-briefing-prompt.md` INPUT FORMAT section at line 56 describes `last_surfaced_insight: { issue_id: string, surfaced_at: ISO timestamp }`. The route's implementation (P1-CARRY-BF-1 fix) injects `insight_summary` as a plain text block — not structured JSON with `issue_id` and `surfaced_at`.

Scenarios 4, 6, 7, 8, 10 in the prompt reference matching by `issue_id` and comparing `last_surfaced_insight.surfaced_at` to `last_coordination_change.added_at` — logic that cannot execute given what the route actually sends.

The repeat suppression feature WORKS (the INSTRUCTION block in the context is clear enough for the model to apply), but the prompt's INPUT FORMAT and scenario examples are now inconsistent with the actual implementation.

**Fix:** IE to update `morning-briefing-prompt.md`:
1. INPUT FORMAT line 56: change `last_surfaced_insight: { issue_id, surfaced_at }` to `last_surfaced_insight: plain text string — the insight_summary of yesterday's/today's briefing, or null`
2. Scenarios 4/6/7/8/10: update examples to use the text-string format rather than JSON `{ issue_id, surfaced_at }` comparisons
3. Remove references to matching by `issue_id` — suppression is now content-based ("materially identical situation"), not ID-based

---

## Carries Confirmed (Fresh Verification)

| Issue | Check | Status |
|-------|-------|--------|
| P2-7: morning-briefing-prompt INPUT FORMAT | Section confirmed at line 50 — mismatch persists | 🟡 OPEN (scope updated above) |
| P2-NEW-7: conversation history not filtered by thread_id | Carry-forward — post-TestFlight scope | ⚪ OPEN (post-TF) |
| B2: RevenueCat iOS app not configured | DAILY-BRIEFING confirms still blocked | 🔴 OPEN (Austin) |
| B4: Google OAuth verification not submitted | DAILY-BRIEFING confirms still outstanding | 🟡 OPEN (Austin) |
| Austin misc: `docs/prompts/docs/` stale dir | Staged for deletion — not yet committed | ⚪ ALMOST RESOLVED (staged) |

---

## What Passed Clean

- ✅ Architecture: 3-tab shell, no domain navigation, domain files intact
- ✅ P0-NEW-BH-1: Font registration restored, hero elements now render spec typography
- ✅ P1-CARRY-BF-1: Repeat suppression live — log reads before AI call, log writes after
- ✅ P2-NEW-BH-1: `rate-limit.ts` committed atomically with routes + `package.json`
- ✅ P2-TYPO-1–4: Typography spec-compliant in `index.tsx` and `chat.tsx`
- ✅ Code quality (morning-briefing route): 0 bare console.error, 0 any, 0 unused imports, all error paths caught
- ✅ §5 output limits: carry-forward clean
- ✅ §7 silence rules: now fully functional (repeat suppression wired)
- ✅ §8 tone: carry-forward clean (no forbidden openers in prompt)
- ✅ §12 alert state machine: carry-forward clean
- ✅ §16 social tone: carry-forward clean (BB sign-off holds)
- ✅ §23 confidence signaling: carry-forward clean
- ✅ IE Session 14 staged prompts: alert/chat/checkin updates are spec-compliant
- ✅ Scope guard: no Layer 2/3, no domain nav, no Android, no web UI changes

---

## Open Issues Table (post-Run BK)

| ID | Priority | Owner | Description | Status |
|----|----------|-------|-------------|--------|
| B2 | 🔴 P0 | **Austin** | RevenueCat iOS app + entitlement not configured — sole TestFlight gate | OPEN |
| B4 | 🟡 P1 | **Austin** | Google OAuth verification not submitted — time-sensitive (4–6 week review clock) | OPEN |
| P2-NEW-BK-1 | ⚪ P2 | **Lead Eng** | SPRINT.md header not updated after `a83a540` fix. Still shows Run BJ state with P0/P1 as unresolved. | NEW |
| P2-NEW-BK-2 | ⚪ P2 | **P&D + Lead Eng** | Auth/onboarding font swaps committed after Run BJ warning. P&D to verify spec; Lead Eng to fix if required. | NEW |
| P2-7 | ⚪ P2 | **IE** | `morning-briefing-prompt.md` INPUT FORMAT — `last_surfaced_insight` schema mismatch (expects `{ issue_id, surfaced_at }`, route sends `insight_summary` text). Scope updated this run. | OPEN |
| P2-NEW-7 | ⚪ P2 | **Lead Eng** | Conversation history not filtered by `thread_id` — post-TestFlight fix | OPEN (post-TF) |
| Austin misc | ⚪ P2 | **Austin** | `docs/prompts/docs/` deletion staged but uncommitted. Should be committed with IE Session 14 work. | STAGED |

No P0 or P1 issues exist in the codebase. **TestFlight gate is solely Austin B2 (RevenueCat).**

---

## What Each Agent Does Next

| Agent | Next action |
|-------|-------------|
| **Lead Eng** | Update SPRINT.md header (P2-NEW-BK-1). Then standby for Austin B2 → S5.1 (RC integration commit) + S5.2 (TestFlight build). |
| **QA** | Standby for S5.3 TestFlight build verification after Austin B2 + S5.2. P2-NEW-BK-2 carries until P&D verifies auth screen typography spec. |
| **P&D** | Verify whether auth/onboarding screen headlines/subtitles should be InstrumentSerif-Italic or Geist-SemiBold (P2-NEW-BK-2). |
| **IE** | Update `morning-briefing-prompt.md` INPUT FORMAT to match `insight_summary` text injection (P2-7, scope updated). Commit Session 14 staged changes. |
| **CoS** | Update SPRINT.md blockers table: mark P0-NEW-BH-1 and P1-CARRY-BF-1 resolved. Add P2-NEW-BK-1 and P2-NEW-BK-2. |
| **Austin** | B2 (RevenueCat — this unblocks everything). B4 (Google OAuth — submit now). |

---

_— QA & Standards Lead, 2026-04-08 (odd-hour :00 run BK)_
