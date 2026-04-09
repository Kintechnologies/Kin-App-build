# QA & Standards Audit — 2026-04-08 (Run BN)

**Run:** BN (odd-hour :00 automated run)
**Date:** 2026-04-08
**Auditor:** QA & Standards Lead
**Prior run:** Run BM (2026-04-08) — No P0/P1; sole TestFlight gate Austin B2
**HEAD commit at time of audit:** `5d35704` (fix(marketing): remove Sentry dependency from waitlist API route)
**Commits since BM:** 2 (`054cf93`, `5d35704` — both marketing / docs)
**Working tree:** 5 files modified, uncommitted

---

## Step 1 — Orientation

**What changed since BM:**

**Committed (since `c63b0ff` BM close):**
- `054cf93` — Marketing prototype update + QA Run BM audit committed + SPRINT.md updated (Lead Eng run BN, website-log.md)
  - `docs/ops/website-prototype-v1.html` — marketing site prototype redesign
  - `docs/ops/QA-AUDIT-2026-04-08-RUN-BM.md` — committed (BM audit)
  - `docs/ops/SPRINT.md` — Lead Eng BN "verification-only" session logged; BM audit summary added
  - `docs/ops/website-log.md` — Run 1 summary
- `5d35704` — `apps/marketing/src/app/api/waitlist/route.ts` — Sentry removed, bare `console.error` substituted

**Working tree (uncommitted):**
- `apps/mobile/components/paywall/PaywallModal.tsx` — pricing + product ID change
- `apps/mobile/lib/revenuecat.ts` — product ID comment update + empty block removed
- `docs/prompts/checkin-prompt.md` — IE Session 15: Scenarios 4 & 5, Failure Mode 6
- `docs/prompts/first-use-prompt.md` — IE Session 15: Scenario 5, Failure Mode 6, Failure Mode 3 update
- `docs/prompts/trigger-test-log.md` — IE Session 15 trigger test log + §26 drift review

**Lead Eng BN session:** Verification-only. 55/55 tests pass; tsc clean. No mobile app code changed. Committed BM audit files.

---

## Step 2 — Architecture Audit

No architectural changes since BM. Carry-forward verification confirms clean state.

| Check | Result |
|-------|--------|
| Exactly 3 tabs in `_layout.tsx` (`index`, `chat`, `settings`) | ✅ PASS — carry-forward from BM |
| No domain tabs (meals, budget, fitness, family) reachable from tab bar | ✅ PASS — carry-forward from BM |
| `InstrumentSerif-Italic` registered in `apps/mobile/app/_layout.tsx` line 65 | ✅ PASS — carry-forward from BM |
| `024_coordination_issues.sql` migration present | ✅ PASS |
| `029_morning_briefing_log.sql` migration present | ✅ PASS |

**Domain files note (carry-forward):** `meals.tsx`, `budget.tsx`, `fitness.tsx`, `family.tsx` were deleted in run BD (commit `3f63d1e`, 2026-04-06). Data layer intact via `lib/kin-ai.ts` + web API routes. No code action required.

---

## Step 3 — Today Screen Output Compliance (§5, §7, §12)

No changes to `apps/mobile/app/(tabs)/index.tsx` since BM. All carry-forward verifications confirmed.

| Check | Result |
|-------|--------|
| §5 — Morning briefing max 4 sentences (`parseBriefingBeats().slice(0,4)`) | ✅ PASS |
| §5 — 1 active OPEN alert at a time (line 668: `openIssues[0]`) | ✅ PASS |
| §5 — Check-ins max 2/day (`slice(0, 2)` + `.limit(2)`) | ✅ PASS |
| §5 — Check-ins suppressed when High-priority alert OPEN | ✅ PASS |
| §7 — `CleanDayState` renders only when no content | ✅ PASS |
| §7 — No placeholder/spinner in empty state | ✅ PASS |
| §12 — OPEN state: bold, action affordance | ✅ PASS |
| §12 — ACKNOWLEDGED: muted, no re-prompt | ✅ PASS |
| §12 — RESOLVED: closure line + 1400ms+600ms fade | ✅ PASS |
| §12 — State persists via Supabase Realtime | ✅ PASS |

---

## Step 4 — IE Session 15 Prompt Audit (Working Tree)

### `checkin-prompt.md` — Scenarios 4 & 5 + Failure Mode 6

**Scenario 4 (Repeat Suppression):** `last_surfaced_at` non-null, same event, no state change → `null`. Validates Failure Mode 4 end-to-end. ✅

**Scenario 5 (Frequency Cap):** `checkins_generated_today: 2` → `null`. Validates Failure Mode 3 (both route + prompt enforce the cap). ✅

**Failure Mode 6 (new):** "Frequency cap bypassed — route passes stale or missing count." Correctly documents the route-level requirement. ✅

**Scenarios 1 & 2 updated:** `last_surfaced_at: null` added to inputs (first-surface case). Correctly distinguishes from Scenario 4. ✅

**Assessment:** All additions are spec-compliant per §5 (max 2 check-ins/day) and §7 (silence when nothing new to surface). No prompt text changes that affect live output.

### `first-use-prompt.md` — Scenario 5 + Failure Mode 6 + Failure Mode 3 update

**Scenario 5 (MEDIUM confidence → fallback):** MEDIUM confidence → exact fallback text, `is_fallback: true`. Confirms the first-use confidence threshold is stricter than §23 general rule (MEDIUM = fallback, not hedged live insight). ✅

**Failure Mode 3 updated:** "fallback applies to MEDIUM or LOW" (was "when confidence is LOW") — matches Scenario 5 ruling. ✅

**Failure Mode 6 (new):** MEDIUM confidence must not produce hedged insight; validated in Scenario 5. ✅

**Assessment:** Additions are spec-compliant per §21 (first-use trust-formation requirement). The stricter confidence threshold for first-use vs. §23 general rule is correctly reasoned: a hedged first impression undermines trust before it is earned.

### `trigger-test-log.md`

Session 15 documents: test coverage gaps closed (Scenario 4/5 for check-in, Scenario 5 for first-use), §26 drift review for all 7 prompts, household thread ACKNOWLEDGED/RESOLVED trigger tests added. ✅

**§26 drift review result (Session 15):** All 7 prompts PASS — no unnecessary preamble, no stacked hedges, no generic reassurance, no insights that change nothing.

---

## Step 5 — Code Quality Audit (New Commits)

### `apps/marketing/src/app/api/waitlist/route.ts` (commit `5d35704`)

| Check | Line | Finding |
|-------|------|---------|
| No bare `console.error` | 57 | ❌ FAIL — `console.error("Supabase env vars not configured in marketing app")` — no NODE_ENV gate |
| No bare `console.error` | 74 | ❌ FAIL — `console.error("Waitlist insert error:", error)` — no NODE_ENV gate |
| No bare `console.error` | 80 | ❌ FAIL — `console.error("Waitlist route unhandled error:", err)` — no NODE_ENV gate |
| No `any` TypeScript types | — | ✅ PASS |
| No unused imports | — | ✅ PASS (Sentry removed cleanly) |
| All async ops have try/catch | — | ✅ PASS |

**Context:** The commit message states Sentry was removed to fix a build error (`@sentry/nextjs` config files absent). The replacement bare `console.error` calls will fire in production — consistent with the code quality standard violation documented for other routes in prior audits. However, this is the marketing app (`apps/marketing/`), not the mobile app or web backend (`apps/web/`). Not a TestFlight blocker.

---

## Step 6 — Working Tree: RevenueCat Pricing / Product ID Change

### `apps/mobile/components/paywall/PaywallModal.tsx` + `apps/mobile/lib/revenuecat.ts`

**What changed:**

| Field | Before | After |
|-------|--------|-------|
| Monthly product ID | `kin_monthly_3999` | `kin_monthly_39` |
| Annual product ID | `kin_annual_29900` | `kin_annual_34900` |
| Annual price display | `$299.00 billed annually` | `$349.00 billed annually` |
| Annual CTA subtext | `Then $299/year` | `Then $349/year` |
| Annual static `$25/month` label | unchanged | unchanged (now inconsistent) |

**Impact:**

1. **SPRINT.md B2 blocker table is stale.** Lines 4328 and earlier (lines 152, 268, 1170, 1753) all instruct Austin to create `kin_monthly_3999` and `kin_annual_29900` in RevenueCat dashboard. If Austin follows those instructions after these working-tree changes are committed, the product IDs he creates will not match the code. The paywall will fall back to static-only pricing and all purchase flows will fail silently on TestFlight.

2. **Annual plan display inconsistency.** The static plan shows `$25/month` with `$349.00 billed annually`. `$349 / 12 = $29.08/month` — the "$25/month" label is now meaningfully inaccurate (it was approximately correct for $299/year). This is user-facing and will appear in TestFlight.

3. **Working tree only.** These changes are uncommitted. Once committed, S5.1/S5.2 cannot proceed until Austin creates the matching RC products.

---

## Step 7 — Checkin Route `last_surfaced_at` Wiring (Carry-Forward)

IE Session 15 validated that `last_surfaced_at` suppression works correctly in the prompt. The `loadCheckins()` function in `index.tsx` (lines 549–570) reads existing check-ins from `kin_check_ins` table. There is no `/api/checkin/` route in the codebase.

The AGENT-PIPELINE shows S2.3 check-in AI prompt wiring is flagged as "blocked on S1.7" (system prompts). S1.7 is now complete. This means check-in AI generation is the next un-wired step — the route must be built and must pass `last_surfaced_at` (per Failure Mode 4) and `checkins_generated_today` (per Failure Mode 3/6).

**This is not a new finding** — it was documented in Session 14 as the next required Lead Eng action. Carrying forward as an informational note.

---

## Step 8 — Tone + Social Tone (§8, §16) — Carry-Forward Clean

No changes to `docs/prompts/` that affect live output text tone. Session 15 only added null-return test scenarios and failure mode documentation.

All §8 and §16 verifications from BM carry forward clean:
- ✅ No forbidden openers in any prompt expected output
- ✅ Household thread framing: collaborative, neutral, coordination-prompt
- ✅ No generic reassurance in any prompt
- ✅ All prompt alert examples: exactly one sentence in `[What changed] — [Implication]` format

---

## Step 9 — Confidence Signaling (§23) — Carry-Forward Clean

IE Session 15 Scenario 5 adds an important clarification: the first-use moment uses a **stricter** threshold than §23 general rule. MEDIUM confidence in the general system produces output with one qualifier; MEDIUM confidence at first-use produces the fallback. This tightening is correct per §21 and is now explicitly validated. No §23 violation introduced.

---

## Step 10 — Scope Guard

| Check | Result |
|-------|--------|
| Domain tabs reintroduced to navigation | ✅ CLEAN |
| Web app (`apps/web/`) UI changes | ✅ CLEAN — no changes this run |
| Android targets introduced | ✅ CLEAN |
| Layer 2/3 features (Schedule Compression, Escalation tiers) | ✅ CLEAN |
| Any new feature files in `(tabs)/` | ✅ CLEAN |

---

## New Findings

### P1-NEW-BN-1 — RevenueCat Product ID Mismatch (Working Tree vs. SPRINT.md B2)

**Priority:** P1
**Owner:** Lead Eng + Austin
**Files:** `apps/mobile/components/paywall/PaywallModal.tsx`, `apps/mobile/lib/revenuecat.ts` (both uncommitted)

Working tree changes product IDs from `kin_monthly_3999` / `kin_annual_29900` (old) to `kin_monthly_39` / `kin_annual_34900` (new) and annual price from $299 to $349. SPRINT.md B2 blocker table (line 4328 and multiple earlier references) still instructs Austin to create `kin_monthly_3999` and `kin_annual_29900` in RevenueCat dashboard.

**Risk:** If Austin follows stale SPRINT.md and creates old product IDs in RC dashboard, the paywall code (which will look for `kin_monthly_39` / `kin_annual_34900`) will find no matching offering and fall back to static display only — purchase flow broken on TestFlight.

**Required actions before B2 is completed:**
1. Commit the working-tree changes (`PaywallModal.tsx` + `revenuecat.ts`)
2. Update SPRINT.md B2 blocker to reference new product IDs (`kin_monthly_39`, `kin_annual_34900`, $349/year)
3. Austin creates the new product IDs in RevenueCat dashboard

**Note on pricing display:** After the annual price change to $349/year, the static plan still shows `$25/month` label. `$349 / 12 = $29.08/month`. This label should be updated to `$29/month` or `~$29/month` before TestFlight to avoid user confusion.

---

### P2-NEW-BN-1 — Bare console.error in Marketing Waitlist Route (3 instances)

**Priority:** P2
**Owner:** Lead Eng
**File:** `apps/marketing/src/app/api/waitlist/route.ts`, lines 57, 74, 80

Three bare `console.error` calls introduced in commit `5d35704` when removing Sentry. None are gated by `process.env.NODE_ENV !== "production"`. This is consistent with the code quality standard applied across all Kin apps in this audit charter.

**Fix:**
```typescript
if (process.env.NODE_ENV !== "production") {
  console.error("Supabase env vars not configured in marketing app");
}
// line 74:
if (process.env.NODE_ENV !== "production") {
  console.error("Waitlist insert error:", error);
}
// line 80:
if (process.env.NODE_ENV !== "production") {
  console.error("Waitlist route unhandled error:", err);
}
```

Not a TestFlight blocker. Marketing app is a separate deployment.

---

## Carry-Forward Issues (Verified This Run)

| Issue | Check | Status |
|-------|-------|--------|
| P2-NEW-BK-2: Auth/onboarding font swaps | P&D verification outstanding | ⚪ OPEN — P&D verification pending |
| P2-7: `morning-briefing-prompt.md` INPUT FORMAT mismatch | No change to that file | 🟡 OPEN — IE to fix |
| P2-NEW-7: conversation history not filtered by `thread_id` | No change | ⚪ OPEN (post-TF) |
| P2-NEW-BM-1: stale context keys in `household-chat-prompt.md` | No change | ⚪ OPEN — IE to fix |
| B2: Austin — RevenueCat iOS app + entitlement | No change | 🔴 OPEN (Austin; see P1-NEW-BN-1 — product IDs also changed) |
| B4: Austin — Google OAuth verification | No change | 🟡 OPEN (Austin) |

---

## What Passed Clean

- ✅ Architecture: 3-tab shell unchanged, InstrumentSerif-Italic registered, no domain nav
- ✅ All 6 hero elements: `InstrumentSerif-Italic` in HEAD
- ✅ §5 output limits: 4-sentence cap, 1-alert queue, 2-checkin max, suppression logic
- ✅ §7 silence rules: `hasContent` gate, `CleanDayState`, no filler
- ✅ §8 tone: no forbidden openers; carry-forward from BM
- ✅ §12 alert state machine: OPEN/ACKNOWLEDGED/RESOLVED visual + state + persistence
- ✅ §16 social tone: carry-forward from BM
- ✅ §23 confidence: carry-forward from BM; Session 15 tightens first-use threshold correctly
- ✅ IE Session 15 prompt additions: Scenarios 4 & 5 (checkin), Scenario 5 (first-use) — spec-compliant
- ✅ §26 drift review (Session 15): all 7 prompts PASS
- ✅ Sentry import removed cleanly from marketing waitlist route
- ✅ Lead Eng BN: verification-only session; 55/55 tests pass; tsc clean; no regressions

---

## Open Issues Table (post-Run BN)

| ID | Priority | Owner | Description | Status |
|----|----------|-------|-------------|--------|
| B2 | 🔴 P0 | **Austin** | RevenueCat iOS app + entitlement not configured — sole TestFlight gate. **Product IDs changed in working tree (see P1-NEW-BN-1)** — must commit + update B2 docs before Austin acts on RC dashboard. | OPEN |
| B4 | 🟡 P1 | **Austin** | Google OAuth verification not submitted — 4–6 week review clock | OPEN |
| P1-NEW-BN-1 | 🟠 P1 | **Lead Eng + Austin** | RevenueCat product IDs changed in working tree (`kin_monthly_39`, `kin_annual_34900`, $349/yr) but SPRINT.md B2 still references old IDs. Risk: Austin creates wrong products in RC dashboard. Fix: commit working tree changes + update B2 blocker table before Austin acts. | NEW |
| P2-NEW-BN-1 | ⚪ P2 | **Lead Eng** | 3 bare `console.error` calls in `apps/marketing/src/app/api/waitlist/route.ts` lines 57, 74, 80 — not NODE_ENV gated. | NEW |
| P2-NEW-BN-2 | ⚪ P2 | **Lead Eng** | Annual plan static label shows `$25/month` but new price is $349/year ($29/month). Update label to `$29/month` before TestFlight. In `PaywallModal.tsx` STATIC_PLANS. | NEW |
| P2-NEW-BK-2 | ⚪ P2 | **P&D + Lead Eng** | Auth/onboarding font swaps (CalendarConnectModal/sign-in/sign-up). P&D to verify spec. | OPEN |
| P2-7 | ⚪ P2 | **IE** | `morning-briefing-prompt.md` INPUT FORMAT: `last_surfaced_insight` schema mismatch. | OPEN |
| P2-NEW-7 | ⚪ P2 | **Lead Eng** | Conversation history not filtered by `thread_id` — post-TestFlight. | OPEN (post-TF) |
| P2-NEW-BM-1 | ⚪ P2 | **IE** | Stale context keys in `household-chat-prompt.md` test scenarios. | OPEN |

---

## What Each Agent Does Next

| Agent | Next action |
|-------|-------------|
| **Lead Eng** | (1) Commit working tree `PaywallModal.tsx` + `revenuecat.ts` + update SPRINT.md B2 to reference new product IDs — then flag Austin. (2) Commit IE Session 15 prompt files. (3) Fix `apps/marketing/src/app/api/waitlist/route.ts` bare console.errors (P2-NEW-BN-1). (4) Update annual `$25/month` label to `$29/month` in `PaywallModal.tsx` (P2-NEW-BN-2). Standby for Austin B2 → S5.1/S5.2 TestFlight. |
| **IE** | Fix `morning-briefing-prompt.md` INPUT FORMAT (P2-7) + `household-chat-prompt.md` stale test scenario context keys (P2-NEW-BM-1). |
| **P&D** | Verify auth/onboarding screen typography (P2-NEW-BK-2). |
| **QA** | Standby for S5.3 TestFlight verification after Austin B2 + S5.2. P1-NEW-BN-1 resolves when Lead Eng commits + SPRINT.md updated. |
| **CoS** | Update SPRINT.md: add P1-NEW-BN-1; add P2-NEW-BN-1/2; confirm B2 product IDs are stale pending Lead Eng commit; add domain-files audit record note. |
| **Austin** | Wait for Lead Eng to commit pricing changes + update B2 table. Then: B2 (RevenueCat — use the NEW product IDs from the updated B2 table). B4 (Google OAuth). |

---

_— QA & Standards Lead, 2026-04-08 (odd-hour :00 run BN)_
