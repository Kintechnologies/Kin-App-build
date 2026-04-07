# CTO Backlog — P1 Issues

> Code quality, missing coverage, technical debt. Address in order of listed priority.
> Last updated: 2026-04-06 (Run 3)

---

## BACKLOG-004 · recipe/route.ts: mock data serving in production code path

**File:** `apps/web/src/app/api/recipe/route.ts`, lines 3–31 and 54
**Status:** OPEN

The `/api/recipe` endpoint **always returns a hardcoded generic template recipe**. The `// TODO: When Anthropic API key is set, generate real recipes` comment at line 54 is still present — meaning the real Anthropic call was never wired. The code ignores `ANTHROPIC_API_KEY` entirely and never branches on it. Every user gets a generic "2 lbs protein" recipe regardless of the meal they selected.

Additionally, `mockRecipes` is a module-level object that accumulates entries across warm serverless invocations — it's a memory leak.

**Fix:** Wire the Anthropic call (pattern is already in `chat/route.ts` and `morning-briefing/route.ts`), or add an explicit gate that documents this endpoint is stub-only without the key.

---

## BACKLOG-005 · TypeScript strict-mode failures in test files

**Files:**
- `apps/web/src/__tests__/chat-agentic-loop.test.ts`, lines 88, 92, 112
- `apps/web/src/__tests__/stripe-webhook.test.ts`, line 331
**Status:** OPEN (could not verify — `tsc --noEmit` times out in sandbox; reported by Lead Eng as pre-existing)

Mock objects don't fully satisfy the Anthropic SDK's `ContentBlock` and `Usage` interfaces (SDK updated types; mocks weren't updated). Tests pass via vitest (no strict TS), but these block adding `tsc --noEmit` to CI.

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
