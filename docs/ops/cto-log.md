# CTO Review Log

---

## 2026-04-07 — Run 6

**Reviewer:** CTO automated review (kin-cto scheduled task)
**Commits reviewed since last run:** `9da4d92`, `6d0e1c8`, `68c270e`, `5e46ad3`, `379321a`, `62a512a`, `07cea50`, `137cd06` (HEAD)
**Prior HEAD:** `4a5c76c`

### Commits in this cycle

- `9da4d92` — fix: clear all CTO P0 flags and P1 Sentry/TS backlog items
- `6d0e1c8` — fix(account): FLAG-004 — resolve FK violations on account deletion
- `68c270e` — fix: font registration and Geist-SemiBold wiring
- `5e46ad3` — feat: add morning_briefing_log table for insight repeat-suppression
- `379321a` — Create marketing app with legal pages and homepage prototype
- `62a512a` — chore(run-3): wire Sentry to mobile, close FLAG-004 + BACKLOG-008/009/010
- `07cea50` — Rebuild marketing site with warm dark design system
- `137cd06` — chore(ops): mark BACKLOG-004 and BACKLOG-005 resolved in CTO backlog

### Prior P0 resolved ✅

All four prior flags (FLAG-001 through FLAG-004) confirmed resolved. No open flags carried into this cycle.

### Prior P1 backlog resolved ✅

All prior open backlog items resolved (BACKLOG-001 through BACKLOG-010, including BACKLOG-004, 005, 007 which were resolved in runs 4–5). Backlog was clean at start of this cycle.

### New P0 filed

**FLAG-005:** `apps/marketing/src/app/api/waitlist/route.ts` uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` to insert into the `waitlist` table, but `023_waitlist.sql` enforces a deny-all RLS policy (`USING (false)`) that blocks anon-key clients. Every marketing site waitlist submission returns 500 "Failed to join waitlist." Zero emails have been collected via the marketing site since launch. Fix: use `SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_` prefix) identical to the pattern in `apps/web/src/app/api/waitlist/route.ts`. Full detail in `cto-flags.md`.

### New P1 backlog items filed

- **BACKLOG-011:** Marketing waitlist no Sentry — `console.error` in 3 places, no `@sentry/nextjs` dep
- **BACKLOG-012:** Marketing waitlist no rate limiting — public endpoint, trivially spammable post-fix
- **BACKLOG-013:** No `apps/marketing/.env.example` — env vars undocumented
- **BACKLOG-014:** `apps/mobile/app/_layout.tsx:63` — untracked TODO for Geist-Light font

### Tests / Build / Migrations

- **Tests:** 55/55 passing across 5 test files ✅ (up from 44 — new `account-delete.test.ts` coverage)
- **TypeScript:** `tsc --noEmit --skipLibCheck` clean, zero errors ✅
- **Build:** Next.js build timeout in sandbox (pre-existing infra limitation; tsc substitute confirms no type errors)
- **Migrations:** 001–029 sequential, no duplicates ✅
- **Mobile console calls:** All `console.error` / `console.log` in `apps/mobile/` guarded with `if (__DEV__)` ✅

### Positive signals

Major cleanup sprint delivered: all prior flags and backlog items resolved. Mobile Sentry initialization is clean (`lib/sentry.ts` + `initSentry()` at app root before first render). Account deletion now handles the paired-household FK case correctly with tests. Rate limiting is wired on all AI-calling routes with graceful degrade in dev. The marketing site itself is well-structured — FLAG-005 is a single-line fix (wrong key) rather than a design flaw.

**Grade this cycle: B+ (FLAG-005 is a one-line fix but it's actively breaking top-of-funnel. Once patched + BACKLOG-011 Sentry added: A-)**

---

## 2026-04-06 — First Run (Initial Review)

**Reviewer:** CTO automated review (kin-cto scheduled task)
**Commits reviewed:** All commits through `15f2f02` (HEAD)
**Focus sprint:** iOS-first pivot, B30 chat rewrite, Sentry integration, RevenueCat webhook, test coverage merge

### Summary

This review covered the last 4 merged commits:
- `15f2f02` — fix: update tests and code to match post-merge state
- `b838ac4` — merge: test coverage (claude/nervous-nash)
- `56472d6` — merge: P1 fixes (claude/mystifying-hugle)
- `9be92ef` — merge: P0 fixes (claude/vigorous-villani)

**Tests:** 439/439 passing across 35 test files. ✅

**Build:** Next.js build could not be verified — SWC binary missing in sandbox environment (`@next/swc-linux-x64-gnu` not installed). TypeScript check via `tsc --noEmit` run instead. Found 4 type errors in test files (see BACKLOG-005). These are test-only issues; no production runtime impact.

**Migration numbering:** FAIL — duplicate prefix `027_` exists. See FLAG-001.

**Console calls in apps/mobile/:** 1 unguarded `console.error` found in `OnboardingSurvey.tsx:215`. See BACKLOG-008.

---

### P0 Flags Filed (3)

| ID | Issue | File |
|---|---|---|
| FLAG-001 | Duplicate migration 027 — deployment blocker | `supabase/migrations/027_profile_timezone.sql` |
| FLAG-002 | RevenueCat webhook no Sentry — silent revenue errors | `apps/web/src/app/api/webhooks/revenuecat/route.ts:129` |
| FLAG-003 | pickup-risk cron auth bypassed when CRON_SECRET unset | `apps/web/src/app/api/cron/pickup-risk/route.ts:26` |

See `docs/ops/cto-flags.md` for detail and fixes.

---

### P1 Backlog Items Filed (8)

| ID | Issue |
|---|---|
| BACKLOG-001 | vax-reminders cron: silent per-profile error swallowing |
| BACKLOG-002 | Stripe webhook: 2 TODO-Sentry console.error calls outstanding |
| BACKLOG-003 | waitlist/route.ts: catch blocks with no Sentry |
| BACKLOG-004 | recipe/route.ts: mock data in production, memory leak |
| BACKLOG-005 | 4 TypeScript strict-mode errors in test files |
| BACKLOG-006 | .env.example missing 4 env vars (REVENUECAT_WEBHOOK_SECRET, GOOGLE_WEBHOOK_SECRET, CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY) |
| BACKLOG-007 | No rate limiting on AI-calling routes (chat, morning-briefing, first-use) |
| BACKLOG-008 | OnboardingSurvey.tsx unguarded console.error, no Sentry |

See `docs/ops/cto-backlog.md` for detail.

---

### Positive Signals

The P0 fixes branch did real work — Sentry is properly wired across the main API routes (chat, invites, calendar, meals, stripe). Auth guards are in place on all user-facing routes. The RevenueCat webhook auth is correct (Bearer token check, fails closed). The Google webhook uses the `channelToken` verification pattern. The invite accept route has the right invitee-email match guard (no leaked-code abuse). The test suite is substantial (439 tests, 4 files covering chat, invites, Stripe, and shared system prompt logic).

The issues above are real but fixable in a single sprint cycle. The codebase is in reasonable shape for this stage.

**Grade this cycle: B+ (FLAG-001, FLAG-002, FLAG-003 pending)**

---

## 2026-04-06 — Run 2

**Reviewer:** CTO automated review (kin-cto scheduled task)
**Commits reviewed since last run:** `3f63d1e`, `4a5c76c` (HEAD)
**Prior HEAD:** `15f2f02`

### Commits in this cycle

- `3f63d1e` — Lead Eng run BD: eas.json, dead tab cleanup, offline banner, account deletion, console guards
- `4a5c76c` — ops: Lead Eng run BD status note

### Prior P0s resolved ✅

All three prior flags are closed:
- **FLAG-001 (duplicate migration 027_):** `027_profile_timezone.sql` stub is gone. `027_coordination_issues_severity.sql` is a legitimate migration adding the `severity` column to `coordination_issues` (required by alert-prompt.md spec).
- **FLAG-002 (RevenueCat webhook no Sentry):** `Sentry.captureException(error)` now in outer catch. Sentry import confirmed at line 3.
- **FLAG-003 (pickup-risk cron auth bypass):** Auth guard now uses tight pattern, consistent with all other cron routes.

### Prior P1s resolved ✅

- **BACKLOG-001** (vax-reminders silent errors): `Sentry.captureException(err)` added at line ~256.
- **BACKLOG-002** (Stripe webhook TODO-Sentry): Both calls replaced with `Sentry.captureException` / `Sentry.captureMessage`.
- **BACKLOG-003** (waitlist no Sentry): Sentry imported and called in both catch blocks.
- **BACKLOG-006** (.env.example missing 4 vars): `REVENUECAT_WEBHOOK_SECRET`, `GOOGLE_WEBHOOK_SECRET`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` all documented.

### New P0 filed

**FLAG-004:** `DELETE /api/account` (introduced in `3f63d1e`) is broken for all paired household users due to missing FK CASCADE/SET NULL on:
- `profiles.household_id REFERENCES profiles(id)` — blocks deletion of primary parent's profile when partner's row still references it
- `household_invites.accepted_by_profile_id REFERENCES profiles(id)` — blocks deletion of invitee's profile

Also: the explicit invite cleanup step in the endpoint uses column name `invited_by` which doesn't exist in the schema (actual column: `inviter_profile_id`) — this step silently deletes nothing.

Combined impact: account deletion fails with a 500 for any user with a household partner — the core v0 use case. GDPR right-to-erasure compliance failure. Fix and full detail in `cto-flags.md`.

### New P1s filed

- **BACKLOG-009:** No tests for `DELETE /api/account` — irreversible destructive operation with zero test coverage.
- **BACKLOG-010:** `handleDeleteAccount` in `settings.tsx` has no `Sentry.captureException` in its catch block — mobile-side deletion failures will be invisible in production.

### Ongoing P1s (unchanged)

- **BACKLOG-004:** recipe/route.ts still serves mock data in production.
- **BACKLOG-005:** 4 TypeScript strict-mode failures in test files.
- **BACKLOG-007:** No rate limiting on AI-calling routes.
- **BACKLOG-008:** `OnboardingSurvey.tsx:215` — unguarded `console.error`, no Sentry.

### Build / Tests

- `npm run build` in `apps/web`: timeout in sandbox (pre-existing infrastructure limitation).
- `npx vitest run`: timeout in sandbox (same). Lead Eng reported 11/11 shared tests passing in their own environment during `3f63d1e`.
- Migration numbering: sequential, no duplicates. ✅
- Unguarded console calls in `apps/mobile/`: 1 remaining — `OnboardingSurvey.tsx:215` (BACKLOG-008, unchanged).
- New TODO comments: no new untracked TODOs; `recipe/route.ts` TODO is pre-existing (BACKLOG-004).

**Grade this cycle: B (three prior P0s closed = real progress; new FLAG-004 on a brand-new endpoint keeps the grade from improving. Once FLAG-004 is patched and BACKLOG-009 tests are added: A-.)**
