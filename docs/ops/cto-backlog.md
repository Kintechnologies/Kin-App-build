# CTO Backlog — P1 Issues

> Code quality, missing coverage, technical debt. Address in order of listed priority.
> Last updated: 2026-04-06 (Run 3)

---

## BACKLOG-004 · recipe/route.ts: mock data serving in production code path

**File:** `apps/web/src/app/api/recipe/route.ts`
**Status:** RESOLVED (Run 4)

Hardcoded `mockRecipes` object and generic template recipe removed. Endpoint now gates on `ANTHROPIC_API_KEY` — returns `501 Not Implemented` when key is absent so callers can surface a clear "not available" state. Memory leak (module-level object accumulating across warm serverless invocations) eliminated. Sentry error tracking added. `TODO` wiring note retained in file for when full Anthropic call is implemented.

---

## BACKLOG-005 · TypeScript strict-mode failures in test files

**Files:**
- `apps/web/src/__tests__/chat-agentic-loop.test.ts`
- `apps/web/src/__tests__/stripe-webhook.test.ts`
**Status:** RESOLVED (Run 4)

Mock objects updated to satisfy current Anthropic SDK `ContentBlock` and `Usage` interfaces. `TextBlock` now includes `citations: null`; `Message` now includes `container: null`; `Usage` now includes all new SDK fields (`cache_creation`, `inference_geo`, `server_tool_use`, `service_tier`, etc.). `stripe-webhook.test.ts` cast resolved with `null as unknown as string`. `tsc --noEmit --isolatedModules --skipLibCheck` passes clean in sandbox. 44/44 tests pass.

---

## BACKLOG-007 · No rate limiting on AI-calling routes

**Files:**
- `apps/web/src/app/api/chat/route.ts`
- `apps/web/src/app/api/morning-briefing/route.ts`
- `apps/web/src/app/api/first-use/route.ts`
**Status:** OPEN

All three routes call Anthropic without rate limiting. An authenticated user can hammer these endpoints in a tight loop with no throttle, token budget, or sliding window counter. Acceptable at current scale; not acceptable before any growth event.

Recommended: Upstash Redis rate limiter at 10 req/min per user for chat; 1 req/day for morning-briefing; 1 req/lifetime for first-use (client enforces this but not server-side).

---

## RESOLVED BACKLOG ITEMS (audit trail)

| Item | Issue | Resolution |
|---|---|---|
| BACKLOG-001 | vax-reminders cron swallows per-profile errors silently | `Sentry.captureException(err)` added at line ~256 in vax-reminders/route.ts. Resolved prior to Run 2. |
| BACKLOG-002 | Stripe webhook: two `console.error` TODO-Sentry calls | Both calls replaced with `Sentry.captureException` / `Sentry.captureMessage`. Resolved prior to Run 2. |
| BACKLOG-003 | waitlist/route.ts: catch blocks with no Sentry | `import * as Sentry` added; both catch blocks now call `Sentry.captureException`. Resolved prior to Run 2. |
| BACKLOG-006 | `.env.example` missing 4 env vars | `REVENUECAT_WEBHOOK_SECRET`, `GOOGLE_WEBHOOK_SECRET`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` all added to `.env.example`. Resolved prior to Run 2. |
| BACKLOG-008 | OnboardingSurvey.tsx unguarded console.error, no Sentry | `@sentry/react-native` added to mobile; `lib/sentry.ts` init module created; `initSentry()` called in root `_layout.tsx`; `Sentry.captureException(error)` replaces console.error in onboarding catch block. Resolved Run 3. |
| BACKLOG-009 | No tests for DELETE /api/account | Full test suite added in `apps/web/src/__tests__/account-delete.test.ts` covering 401, solo delete, paired primary delete (household_id null), paired invitee delete (accepted_by_profile_id null), and DB failure → 500 + Sentry + no auth deletion. Resolved Run 3. |
| BACKLOG-010 | handleDeleteAccount in settings.tsx: no Sentry on mobile-side failure | `import * as Sentry from "@sentry/react-native"` added; `Sentry.captureException(err)` added to catch block before Alert. Resolved Run 3. |
| BACKLOG-004 | recipe/route.ts: mock data serving in production + memory leak | `mockRecipes` object and generic template recipe removed; endpoint gates on `ANTHROPIC_API_KEY` and returns 501 when absent; Sentry added. Resolved Run 4. |
| BACKLOG-005 | TypeScript strict-mode failures in test files | `TextBlock`, `Message`, and `Usage` mock objects updated to match current Anthropic SDK interface; `tsc --noEmit --isolatedModules --skipLibCheck` passes clean; 44/44 tests pass. Resolved Run 4. |
