# CTO Backlog — P1 Issues

> Code quality, missing coverage, technical debt. Address in order of listed priority.
> Last updated: 2026-04-07 (Run 6)

---

## BACKLOG-011 · Marketing waitlist route: no Sentry, no error visibility

**File:** `apps/marketing/src/app/api/waitlist/route.ts`
**Status:** RESOLVED (Run 6)

`@sentry/nextjs` added to `apps/marketing/package.json`. All three `console.error` calls replaced with `Sentry.captureException` / `Sentry.captureMessage`. Env-missing path now calls `Sentry.captureMessage`. `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` added to `apps/marketing/.env.example`.

---

## BACKLOG-012 · Marketing waitlist route: no rate limiting

**File:** `apps/marketing/src/app/api/waitlist/route.ts`
**Status:** RESOLVED (Run 6)

`@upstash/ratelimit` + `@upstash/redis` added to `apps/marketing/package.json`. IP-based sliding-window limiter added: 3 submissions per IP per hour, prefix `rl:waitlist`. Graceful degrade when `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` absent (dev/CI unaffected). 429 response includes `Retry-After` header. `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` added to `apps/marketing/.env.example`. **Requires `npm install` in `apps/marketing/` to activate.**

---

## BACKLOG-013 · No `.env.example` in apps/marketing/

**File:** `apps/marketing/` (missing)
**Status:** RESOLVED (Run 6 hotfix)

`apps/marketing/.env.example` created documenting all required vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`. Comments explain purpose of each.

---

## BACKLOG-014 · Untracked TODO in apps/mobile/app/_layout.tsx

**File:** `apps/mobile/app/_layout.tsx:63`, `apps/mobile/constants/brand.ts:36`
**Status:** RESOLVED (Run 6)

`Geist-Light` is defined in `brand.ts` as `Typography.families.sansLight` but is not referenced in any component. Font file does not exist in assets. Removed `sansLight: 'Geist-Light'` from `brand.ts` and removed the TODO comment + commented-out require from `_layout.tsx`. If Light weight is needed in future, add the font asset and re-introduce the constant at that time.

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
**Status:** RESOLVED (Run 5)

`@upstash/ratelimit` + `@upstash/redis` installed. Shared utility `apps/web/src/lib/rate-limit.ts` created with per-route sliding-window limiters: chat → 10 req/min, morning-briefing → 1 req/day (GET + POST), first-use → 5 req/365 days. Graceful degrade when `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are absent (dev/CI unaffected). 429 responses include `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers. `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` added to `.env.example`. 44/44 tests pass; tsc clean.

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
| BACKLOG-007 | No rate limiting on AI-calling routes | Upstash sliding-window rate limiter added to chat (10/min), morning-briefing (1/day), first-use (5/365d). Graceful degrade when env vars absent. `.env.example` updated. Resolved Run 5. |
