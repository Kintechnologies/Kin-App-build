# Kin AI — Sprint Board

**Current Phase:** Phase 0 → Phase 1 Transition
**Sprint:** Week of April 1, 2026
**Last Updated:** 2026-04-02 (Lead Engineer run)

---

## Phase 0 Exit Checklist

| # | Task | Status | Owner | Notes |
|---|------|--------|-------|-------|
| 1 | Daily briefing running | ✅ Done | CoS | First briefing delivered 2026-04-01 |
| 2 | Sprint backlog for Phase 1 defined | ✅ Done | CoS + Lead Eng | See Sprint Backlog below |
| 3 | Waitlist collecting signups | ⬜ Not started | Brand & Growth | kinai.family needs Vercel deploy + DNS |
| 4 | All accounts and infrastructure configured | 🟡 Partial | Business Ops | Supabase ✅, Stripe ⬜ (waiting Mercury), Vercel ⬜, Apple Dev ✅, Google Play ✅ |
| 5 | Git repo current on GitHub | 🟡 Committed locally — push pending | Lead Eng | 3 commits ready: a97d9a3, 2934fd8, 00f7bd8. Austin must `git push origin main` to unblock Vercel deploy. |
| 6 | Operational artifacts created | ✅ Done | CoS | Sprint board, kill list, briefing template |

---

## Phase 1 Sprint Backlog — Core App MVP

**Goal:** A real family can sign up, complete onboarding, get a personalized meal plan, view grocery list, enter budget data, and invite a partner. Stripe checkout + 7-day trial working.

**Priority order** (sequenced by dependency + user impact):

### P0 — Ship Blockers

| # | Task | Status | Owner | Est. | Notes |
|---|------|--------|-------|------|-------|
| 1 | Deploy web app to Vercel | ⬜ | Lead Eng | 1h | Next.js monorepo config, env vars |
| 2 | Connect kinai.family domain (Namecheap → Vercel) | ⬜ | Lead Eng + Austin | 30m | DNS propagation may take hours |
| 3 | Fix web app build errors (monorepo paths) | ✅ Done | Lead Eng | 2h | `npx tsc --noEmit` passes 0 errors. Fixed: Stripe API version (basil→clover), invoice.subscription→parent.subscription_details.subscription, Anthropic ToolUseBlock type, framer-motion ease literal, Set spread, SpeechRecognition decls. Commit a97d9a3. |
| 4 | Stripe Connect to Mercury bank | ⬜ | Austin (HUMAN) | 15m | Waiting on Mercury routing/account numbers |
| 5 | Test Stripe checkout end-to-end (test mode) | ⬜ | Lead Eng | 1h | Pricing page → checkout → webhook → subscription active |

### P1 — Core Experience

| # | Task | Status | Owner | Est. | Notes |
|---|------|--------|-------|------|-------|
| 6 | Verify onboarding → meal plan flow works e2e on web | ⬜ | Lead Eng + QA | 2h | The First Value Moment — must be flawless |
| 7 | Verify chat works e2e on web (AI responses, persistence) | ⬜ | Lead Eng + QA | 1h | Anthropic API key configured in Vercel env |
| 8 | Verify budget flow works e2e on web | ⬜ | Lead Eng + QA | 1h | |
| 9 | Test partner invite flow on web | ⬜ | Lead Eng + QA | 1h | Join link, dual profile creation |
| 10 | Mobile app: wire API calls to web backend | ⬜ | Lead Eng | 4h | Replace any mocked data with real Supabase calls |
| 11 | Mobile app: test on physical device via Expo Go | ⬜ | Lead Eng + Austin | 1h | Verify all 5 tabs, auth, theme |
| 17 | **[QA BUG]** Remove artificial 2s delay in /api/meals POST | ✅ Done | Lead Eng | 15m | Removed setTimeout(2000). Committed in 2934fd8. |
| 18 | **[QA BUG]** Add auth guard to /api/meals and /api/recipe | ✅ Done | Lead Eng | 30m | Auth guard added to both POST endpoints. Committed in 2934fd8. |
| 19 | **[QA BUG]** Mobile budget: fetch real transaction data (spent ≠ 0) | ✅ Done | Lead Eng | 2h | Fetches real bucket totals for current month from `transactions` table. Recent transactions list added below cards. Commit 00f7bd8. |
| 20 | **[QA BUG]** Mobile budget: implement Add Transaction flow | ✅ Done | Lead Eng | 3h | Bottom sheet with amount input, grouped category picker (from shared), optional description, optimistic UI update, haptic success. Commit 00f7bd8. |
| 21 | **[QA BUG]** Fix p1_name in chat system prompt | ✅ Done | Lead Eng | 30m | Now resolves from family_members (member_type='adult'), falls back to 'Parent'. Committed in 2934fd8. |
| 25 | **[PRODUCT] [BRAND]** Mobile budget: replace #A07EC8 (purple) with brand tokens | ✅ Done | Lead Eng | 30m | All `#A07EC8` removed from budget.tsx. CTAs/active states → `#7CB87A` (primary green). Wants accent → `#D4A843` (amber). Zero purple remains. Commit 00f7bd8. |
| 26 | **[PRODUCT] [FVM]** Meal plan lost on page refresh (sessionStorage only) | ✅ Done | Lead Eng | 3h | Meal plan now persisted to Supabase on generation (new `meal_plans` table, migration 011). Meals page falls back to DB when sessionStorage is empty, shows loading state, then renders plan. Empty state CTA now links to /onboarding. Commit 00f7bd8. |
| 27 | **[PRODUCT]** Fix silent failure in onboarding meal generation | ✅ Done | Lead Eng | 30m | If `/api/meals` fails during onboarding, an amber inline banner now tells the user "We had trouble — get your meal plan from the Meals tab anytime." User still proceeds. Commit 00f7bd8. |
| 28 | **[PRODUCT]** Dashboard: personalize greeting with user/family name + time-of-day | ✅ Done | Lead Eng | 30m | Dashboard is now a client component. Greeting resolves to "Good morning/afternoon/evening, [First Name]" — name fetched from `family_members` (adult), fallback to `profiles.display_name`. Commit 00f7bd8. |

### P2 — Polish & Quality

| # | Task | Status | Owner | Est. | Notes |
|---|------|--------|-------|------|-------|
| 12 | BottomNav rendering in dashboard layout (known bug) | ✅ Done | Lead Eng | 30m | Added null guard on pathname, env(safe-area-inset-bottom) for iPhone home bar, Suspense wrapper in layout, viewport-fit=cover meta. Commit a97d9a3. |
| 13 | Post-onboarding redirect → /dashboard (not /meals) | ✅ Done | Lead Eng | 0m | Already redirecting to /dashboard (line 132 onboarding/page.tsx). No change needed. |
| 14 | Brand audit — all screens match brand guide | 🟡 Partial | Product & Design | 2h | Web: ✅ clean. Mobile budget: ❌ uses #A07EC8 (purple) — NOT a brand token. See #25. |
| 15 | Error handling audit — all API routes | ⬜ | QA | 2h | Graceful failures, user-facing messages |
| 16 | Accessibility pass — color contrast, touch targets | ⬜ | QA | 1h | |
| 22 | **[QA BUG]** Fix misleading "This Week" card on web dashboard | ✅ Done | Lead Eng | 15m | href changed from `/settings` → `/calendar`. Commit 00f7bd8. |
| 23 | **[QA BUG]** Make recommended_store assignment deterministic in /api/meals | ✅ Done | Lead Eng | 15m | Replaced `Math.random()` with `storeIndexForItem()` — a simple djb2-style hash of the item name. Store assignments are now consistent across all calls. Commit 00f7bd8. |
| 24 | **[QA NOTE]** Google webhook: consider adding channel token verification | ⬜ | Lead Eng | 30m | `apps/web/src/app/api/calendar/google/webhook/route.ts` — No secret token verified on incoming push notifications. Current channelId+resourceId DB lookup provides partial protection, but Google's recommended token header check is missing. |

### P3 — Deferred (Not This Sprint)

| # | Task | Notes |
|---|------|-------|
| — | Calendar sync (Google + Apple) | API routes exist, needs OAuth setup + testing |
| — | RevenueCat mobile billing | After web Stripe is proven |
| — | Push notifications | After mobile TestFlight |
| — | Voice input | After core chat is solid |
| — | Referral program activation | After 50 paying families |

---

## Velocity Notes

_First sprint — no historical velocity data. Will calibrate after Week 1._

---

## ⚠️ Austin Action Required — Push to GitHub

**Commit `a97d9a3`** (build fixes + BottomNav) ✅ committed
**Commit `2934fd8`** (P1 QA bugs: delay, auth guards, p1_name) ✅ committed
**Commit `00f7bd8`** (P1: meal persistence, mobile budget, dashboard personalization) ✅ committed

**All 3 commits are local only.** The sandbox cannot `git push`. Vercel deploy (Task #1) is blocked until GitHub is current.

**Run from your terminal:**
```bash
cd ~/Projects/kin
git push origin main
```

This is the single most critical unblock right now. Everything in Phase 1 flows from the Vercel deploy.

> ⚠️ Also run the new Supabase migration **after** pushing: `supabase db push` or apply `011_meal_plans.sql` in the Supabase dashboard before testing the meal persistence flow.

---

## QA Audit Log

### 2026-04-01 — QA & Standards Lead

**Commits reviewed:** 3 (0b069bc, 9378ca0, 2a7588f)
**Files audited:** ~30 key source files across web API routes, mobile screens, shared packages, and DB migrations

**P0 issues:** None. No security leaks of real user data, no broken core auth flows, no hardcoded secrets.

**P1 issues filed (5):** Tasks #17–21

- **#17** — Hardcoded 2-second delay in `/api/meals` POST (`route.ts:165`). Left from development. Blocks every meal plan generation unnecessarily. Remove immediately.
- **#18** — `/api/meals` and `/api/recipe` POST endpoints lack authentication. No user data at risk (both are stateless generators), but open to abuse/scraping. Add `getAuthenticatedUser` guard.
- **#19** — Mobile budget dashboard: `spent` is hardcoded to `0` for all three 50/30/20 categories. Budget feature exists visually but is non-functional — no transaction data is ever fetched or displayed.
- **#20** — Mobile "Add Transaction" button is a no-op (haptics only, no form/modal/DB write). The primary user action for the budget feature doesn't work.
- **#21** — Chat system prompt uses `user.email.split("@")[0]` as the parent's name. Produces raw email prefixes (e.g. `austin.ford1519`). Kin's personalization quality depends on getting this right — should resolve from `profiles` table.

**P2 issues filed (3):** Tasks #22–24

- **#22** — Web dashboard "This Week" card routes to `/settings` — likely a placeholder copy/paste error.
- **#23** — `recommended_store` per grocery item assigned via `Math.random()`, so results are non-deterministic across calls. Inconsistent UX.
- **#24** — Google Calendar webhook endpoint lacks channel token verification (Google best practice). Current channelId+resourceId lookup in DB provides basic validation; full token verification would close the gap.

**What shipped cleanly:**
- ✅ crypto/UUID import fix (9378ca0) — correct, clean
- ✅ All new calendar API routes have auth guards
- ✅ Supabase migrations (009, 010) are well-structured with proper RLS policies and indexes
- ✅ Shared `@kin/shared` types package is clean, properly typed, no `any`
- ✅ Brand colors correct on all new mobile screens (`#0C0F0A` bg, `#F0EDE6` text, `#7CB87A` primary)
- ✅ No hardcoded API keys or secrets anywhere
- ✅ `.env` files correctly gitignored
- ✅ No console.log in production mobile source files
- ✅ Operational docs (SPRINT.md, KILL-LIST.md, PHASE-TRACKER.md, BRIEFING-TEMPLATE.md) are well-structured

**Deploy readiness:** NOT YET. Beyond the existing P0 blockers (Vercel deploy, domain, Stripe), the meal plan delay (#17) and budget non-functionality (#19, #20) would give a poor first impression to beta users. Fix #17, #19, #20, #21 before any live user sees the product.

_— QA & Standards Lead, automated run 2026-04-01_

---

## CoS Coordination Log

### 2026-04-01 — CoS Coordination

- **Reviewed:** Lead Engineer commit `2934fd8` (P1 QA bugs: #17 delay removal, #18 auth guards, #21 p1_name fix); QA audit filing 8 issues (5 P1, 3 P2); Product & Design has not yet produced output this cycle (brand audit #14 still pending).
- **Reprioritized:**
  - Tasks #17, #18, #21 notes updated — marked fully committed in 2934fd8 (were showing "staged — needs commit"). Status confirmed ✅ Done.
  - Phase 0 exit item #5 updated to reflect both pending commits (a97d9a3, 2934fd8) need push.
  - Austin Action Required section updated: lock cleanup is resolved, push remains the blocker.
  - Task #1 (Vercel deploy) remains P0 top priority but is BLOCKED on Austin's `git push origin main`.
  - Tasks #19 and #20 (mobile budget) elevated as the Lead Engineer's productive next focus while Vercel deploy is blocked on Austin.
- **Next cycle focus:** Lead Engineer should tackle #19 (mobile budget: wire real transaction data, currently hardcoded `spent: 0`) → #20 (Add Transaction modal/form/DB write) in sequence. Both are unblocked and directly impact the First Value Moment readiness. Tasks #22 and #23 (15m fixes each) can be batched at the end of the cycle.
- **Escalations:**
  - ⚠️ **DECISION NEEDED (Austin):** `git push origin main` — 2 commits ready locally (a97d9a3, 2934fd8). Critical path: GitHub current → Vercel deploy (#1) → domain live (#2) → e2e testing (#6–9). Phase 0 exit deadline is April 7. 6 days remaining.
  - 📊 **FYI:** Velocity is healthy. Lead Eng resolved 3 QA bugs in one commit, all TypeScript errors cleared, QA found no P0 security issues. First cycle in good shape.

---

## Product & Design Audit Log

### 2026-04-01 — Product & Design Lead

**Screens audited:** All changed .tsx files from today's commits (dashboard, meals, chat, budget — web + mobile)
**Specs written:** 2 (docs/specs/)

---

#### Brand Audit Results

**Web app — PASS ✅**
- Background `#0C0F0A` used correctly on all screens
- `text-warm-white` / `text-warm-white/X` used throughout (no pure white violations in source)
- `font-serif italic` (Instrument Serif) used correctly on all display headlines
- Geist used for functional text, GeistMono for data/numbers ✅
- Primary green `#7CB87A` on CTAs — correctly scoped, not overused ✅
- Amber `#D4A843` for highlights and warnings only ✅
- Modal overlays use `bg-black/60` — acceptable for overlays but could use `bg-background/80` for tighter brand consistency (minor, not filed)

**Mobile app — FAIL ❌ (Issue #25)**
- `apps/mobile/app/(tabs)/budget.tsx` uses `#A07EC8` (purple) pervasively as its accent color
- This color does NOT appear in the Kin design system (no purple token exists)
- Affects: setup icon, CTA button, dollar sign prefix, toggle active state, save button — entire budget screen
- Fix: replace with primary green `#7CB87A` for buttons/CTAs; amber `#D4A843` for the Wants bucket accent

---

#### Critical UX Finding: FVM at Risk (Issue #26)

The meal plan page — the First Value Moment — stores data in `sessionStorage` only. A page refresh destroys it. The user sees:

> "No meal options yet. Complete onboarding to get your personalized picks."

…even if they completed onboarding 5 minutes ago. There is no CTA to recover. This is unacceptable for a P0 screen. Filed as #26 with full spec at `docs/specs/meal-plan-data-persistence.md`.

**Severity: P1** — not P0 only because the data persists within a session. But any beta user who refreshes during their first experience will think the product is broken.

---

#### Additional Issues Filed

- **#27** — Onboarding: silent failure if meal generation API errors. User is sent to /dashboard with no meal plan and no explanation. Low-friction fix: add user-facing toast.
- **#28** — Dashboard: "Good morning" is static, no name. Now that p1_name (#21) is fixed, we can personalize this greeting in ~30 minutes. High perceived quality improvement for minimal effort.

---

#### Spec Index

| Spec | Task(s) | Status |
|------|---------|--------|
| [docs/specs/mobile-budget-transactions.md](../specs/mobile-budget-transactions.md) | #19, #20 | Ready for Lead Eng |
| [docs/specs/meal-plan-data-persistence.md](../specs/meal-plan-data-persistence.md) | #26 | Ready for Lead Eng |

---

#### Priority Recommendation for Lead Eng

Given current sprint state, recommended sequencing after Vercel deploy (#1–2):

1. **#26** — Meal plan persistence (3h) — FVM protection, most important fix before any beta user sees the product
2. **#19 + #20** — Mobile budget real data + Add Transaction (5h combined) — specs are written, unblocked
3. **#27** — Onboarding silent failure (30m) — quick win, pairs with #26 work
4. **#28** — Dashboard greeting personalization (30m) — quick win, high perceived quality
5. **#25** — Mobile budget purple color fix (30m) — brand hygiene, low risk

_— Product & Design Lead, automated run 2026-04-01_

---

## Lead Engineer Build Log

### 2026-04-02 — Lead Engineer

**Commit:** `00f7bd8`
**Files changed:** 8 source files + 1 new migration

**Completed this cycle:**

- **#26 (FVM CRITICAL)** — Meal plan persistence. `/api/meals` now saves to a new `meal_plans` table after generation. `meals/page.tsx` falls back to a Supabase query when sessionStorage is empty. Three states: loading (pulse dots + "Fetching your meal plan…"), no-plan (CTA → /onboarding), DB error (retry message). `sessionStorage` re-hydrated on DB hit for fast subsequent navigations. Migration: `011_meal_plans.sql`.
- **#27** — Onboarding silent failure. Amber inline banner shown if `/api/meals` errors during onboarding. User is still redirected — not blocked — but told they can get their plan from the Meals tab.
- **#28** — Dashboard personalized greeting. Converted to client component. Greeting resolves to "Good morning/afternoon/evening, [First Name]" — name from `family_members` (adult member), fallback to `profiles.display_name`. Degrades gracefully to time-only if no name found.
- **#22** — Dashboard "This Week" card: href `/settings` → `/calendar`.
- **#23** — Deterministic store assignment. Replaced `Math.random()` with `storeIndexForItem()` — a hash of the item name. Grocery store assignments are now stable across calls.
- **#19 + #20** — Mobile budget: fully functional. Fetches real bucket spend totals and last-10 transactions for the current month. Add Transaction bottom sheet: amount input (auto-focus), grouped category picker (Needs/Wants/Savings), optional description, date. Optimistic UI update on save + haptic success. Error toast if Supabase write fails. Over-budget (>100%) turns bar rose + shows alert icon; near-budget (≥85%) turns amber.
- **#25** — Mobile budget brand fix. All `#A07EC8` purple eliminated. CTAs → `#7CB87A` (primary green). Wants accent → `#D4A843` (amber). Page title now `#F0EDE6` (warm white) not purple.
- **Shared** — `BUDGET_CATEGORIES` extracted to `packages/shared/src/budget.ts`. Both web and mobile now import from the same source of truth.

**TypeScript:** `tsc --noEmit` passes 0 errors on both web and mobile.

**Blockers for Austin:**
- `git push origin main` — 3 commits (a97d9a3, 2934fd8, 00f7bd8) still local. Vercel deploy (#1) can't proceed until GitHub is current.
- `supabase db push` (or apply `011_meal_plans.sql` in dashboard) — new `meal_plans` table must exist before the meal persistence flow is testable.

**Remaining unblocked work:**
- Task #24 — Google webhook channel token verification (30m, P2, low risk)
- Tasks #6–9 — Core e2e verification (blocked: needs Vercel deploy first)
- Task #10 — Mobile API wiring (can start locally; full test needs Vercel)

_— Lead Engineer, automated run 2026-04-02_
