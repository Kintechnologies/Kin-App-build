# Kin Beta Readiness Audit — Product Surfaces

**Date:** 2026-05-26
**Branch:** `main` (HEAD `a26faf4`, "clear all 3 P0 launch blockers from audit v8")
**Auditor:** Claude (Opus 4.7, 1M context) — orchestrated 3-stream parallel code audit covering 7 product surfaces
**Scope:** End-to-end PRODUCT audit of all surfaces a real beta family would touch: SMS, web portal, onboarding, calendar, briefing pipeline, activity capture, weekly suggestions
**Stack:** Next.js on Vercel (`apps/web`) + Supabase Edge Functions (`supabase/functions`) + 80 migrations · 60 tests passing · SMS-first (no mobile app) · Production at **kinai.family**, Supabase ref `coxqdpcffmsncvisfyvj`
**Methodology:** Source-level read of every cron job (6), every web route (16), every onboarding step (SMS state machine + OAuth-fallback wizard), and every data source feeding the briefing engine. No live database queries — pure code analysis.

---

## Overall Grade: **A−** · **CONDITIONAL GO** (2 product-surface blockers + 3 P1 polish items)

The infrastructure is materially complete. Every one of the 6 pg_cron jobs is wired to a real endpoint with real auth, every web route renders real content with the warm-oat ALD palette consistently applied, the calendar pipeline encrypts tokens at rest with AES-256-GCM and auto-renews channels every 6 hours, and the briefing data pipeline pulls from 6 distinct context sources (calendar events, household members, profile context notes, coordination issues, user context notes, calendar staleness signals) before handing to a model-pinned Claude prompt with a strict 1600-char SMS ceiling. The recent V7→V8 closeout (commits `85207a1` through `a26faf4`) cleared 5 P0s, 32 P1s, 66 P2s, and the V8 STOP-footer compliance trio in three weeks — the codebase is the strongest it has ever been on the security, compliance, and reliability axes that V3 through V8 stressed.

What the V8 audit did **not** cover, and what this PRODUCT audit surfaces, is the texture of the beta experience itself — not "is each surface secure and instrumented" but "does the product, in the order a real family touches it, hold together as a product." On that question the answer is mostly yes, with two product-level gaps and three polish-tier items.

**The two product blockers are not bugs in any one surface — they are surface-level features the spec promises that the code does not yet implement:**

1. **No recurring-task / routine system.** Migration 033 added `activity_log` but it is a founder-only growth-metric audit table (RLS denies all auth/anon access — see migration `033_activity_log.sql:18–24`). There is no "Maya has soccer every Tuesday" storage, no "log this activity" SMS verb, no user-facing activity feed, and the briefing pipeline does not read `activity_log` (only `coordination_issues` + `user_context_notes`). The "Family OS" framing in the landing page promises this; the code does not yet deliver it. Beta launchable, but a beta tester asking "where do I see what we did this week?" or "can Kin remember Maya's recurring schedule?" will get no answer.

2. **Weekly suggestions are reactive capture, not analysis.** The Sunday check-in cron (`apps/web/src/app/api/cron/sunday-checkin/route.ts:91–218`) sends a great open-ended SMS ("anything big coming up this week?") and captures the reply into `user_context_notes` (TTL 8 days) which is then folded into Monday's briefing. That loop works. But there is no analysis of last week's events, no "you had 3 pickup conflicts; let's plan ahead", no pattern detection across weeks, and the briefing model is known (per `docs/MESSAGE_QUALITY.md:167–170`) to sometimes prioritize today's logistics over the week-ahead notes. The "Weekly Suggestions" surface from the spec is one-third built: capture, yes; fold, partially; analyze + suggest, no.

Neither of these is a *compliance* blocker or a *crash* blocker. They are *product-surface* blockers — beta testers will ask about them, and a real go-no-go conversation has to decide whether to ship the smaller product and frame expectations or build the missing pieces first. The recommendation below is to **ship as "Phase 1: the briefing engine" with the activity-log and weekly-suggestions surfaces explicitly framed as Phase 2** — but that is a positioning call, not an engineering one.

**The three P1 polish items** are: (a) `calendar-renewal` always returns 200 even on 100% failure, robbing pg_cron of any retry signal; (b) `DEFAULT_TIMEZONE` in `briefing.ts:83` still falls back to `America/Los_Angeles` while other recurring jobs (sunday-checkin, engagement-nudges) correctly fall back to UTC per the V6/V7 deprecation; (c) Sunday-checkin's reply latch (`sunday_checkin_reply_at`) only captures the **first** reply in a 24h window, so a parent who texts "Tuesday is solo duty" and then ten minutes later "oh, and Friday I'm taking a half day" loses the second item. None of these are launch blockers; all three are within a 30-minute coding window.

**Ship readiness for the beta cohort** (≤10 families): yes, with framing. The infrastructure, security, compliance, and core briefing loop all work. The two product gaps are recognized and ship-ready to communicate. The polish items are first-weekend cleanup.

---

## Top-line summary

| # | Surface | Status | P0 | P1 | Beta Blocker |
|---|---|---|---|---|---|
| 1 | Product Wiring (cron → endpoint → SMS → DB) | **WORKING** | 0 | 1 | No |
| 2 | Portal UX (16 web routes, ALD palette) | **WORKING** | 0 | 0 | No |
| 3 | Onboarding Experience (SMS state machine + OAuth fallback) | **WORKING** | 0 | 1 | No |
| 4 | Calendar Integration (Google OAuth, AES-256-GCM, 6h renewal) | **WORKING** | 0 | 1 | No |
| 5 | Data Capture for Briefings (6 context sources → Claude → SMS) | **WORKING** | 0 | 0 | No |
| 6 | Recurring Tasks / Activity Logging | **NOT BUILT** (user-facing) | **1** | 0 | **Yes** (product gap) |
| 7 | Weekly Suggestions | **PARTIAL** (capture works, analysis doesn't) | **1** | 0 | **Yes** (product gap) |
| | **Total** | | **2** | **3** | |

---

## Surface 1 — Product Wiring: cron → edge function → SMS → database

### Status: **WORKING**

The pg_cron → endpoint → SMS chain is the single most load-bearing part of the system (the recent 4-day outage was a CRON_SECRET mismatch on this exact path) and it is now fully wired, audit-trailed, and instrumented. All 6 cron jobs reach real endpoints with Vault-sourced authentication; all SMS-emitting jobs (5 of 6) write to `sms_conversations` after every send; the one job that does not emit SMS (`calendar-renewal-6h`) instead writes refreshed channel state into `calendar_connections`.

### The 6 pg_cron jobs

Auth pattern is uniform: pg_cron POSTs with `x-cron-secret: <CRON_SECRET>` header sourced from the Vault entry `cron_secret` via `public.cron_dispatch_headers()` (migration `063_cron_dispatch_auth.sql:35–48`). Migration `068_cron_dispatch_vault_check.sql:18–45` **raises an exception** if the secret is missing or under 16 chars, which prevents silent re-introduction of the 4-day outage.

| Job | Schedule | Path | Routing | Endpoint |
|---|---|---|---|---|
| `morning-briefing-hourly` | `0 * * * *` (hourly, fans out at user-local 6am) | `/functions/v1/morning-briefing` | **Direct** to edge function | [`supabase/functions/morning-briefing/index.ts`](supabase/functions/morning-briefing/index.ts) → [`supabase/functions/_shared/briefing.ts`](supabase/functions/_shared/briefing.ts) |
| `briefing-audit-daily` | `0 14 * * *` (2pm UTC / 9am CT — catches misses from 6am) | `/functions/v1/briefing-audit` | **Direct** to edge function | [`supabase/functions/briefing-audit/index.ts`](supabase/functions/briefing-audit/index.ts) |
| `pickup-risk-30min` | `*/30 * * * *` | `/api/cron/pickup-risk` | Via `cron-dispatch` hub | [`apps/web/src/app/api/cron/pickup-risk/route.ts:32-101`](apps/web/src/app/api/cron/pickup-risk/route.ts) |
| `sunday-checkin-hourly` | `0 * * * *` (fans out at user-local Sun 2pm) | `/api/cron/sunday-checkin` | Via `cron-dispatch` hub | [`apps/web/src/app/api/cron/sunday-checkin/route.ts:91-218`](apps/web/src/app/api/cron/sunday-checkin/route.ts) |
| `engagement-nudges-onboarding-hourly` | `0 * * * *` | `/api/cron/engagement-nudges?mode=onboarding` | Via `cron-dispatch` hub | [`apps/web/src/app/api/cron/engagement-nudges/route.ts:636-706`](apps/web/src/app/api/cron/engagement-nudges/route.ts) |
| `calendar-renewal-6h` | `0 */6 * * *` | `/api/cron/calendar-renewal` | Via `cron-dispatch` hub | [`apps/web/src/app/api/cron/calendar-renewal/route.ts:143-264`](apps/web/src/app/api/cron/calendar-renewal/route.ts) |

### What exists

- **`cron-dispatch` hub** ([`supabase/functions/cron-dispatch/index.ts:51-92`](supabase/functions/cron-dispatch/index.ts)) — validates `x-cron-secret` with timing-safe compare (lines 42–49), forwards to Vercel-hosted Next.js routes as `Authorization: Bearer <secret>` (lines 79–82). Single-hop fan-out means one Vault secret protects 4 of 6 jobs.
- **Bearer validation in Next.js** ([`apps/web/src/lib/cron-auth.ts:22-30`](apps/web/src/lib/cron-auth.ts)) — `isAuthorizedCron(request)` is the gate on every cron route; timing-safe compare at lines 32–37.
- **Vault-sourced base URL** (`migration 072_cron_functions_base_url.sql:32-42`) — `public.functions_base_url()` reads from Vault at runtime with hardcoded production fallback, so a renamed Supabase project doesn't break crons.
- **SMS retry layer** ([`supabase/functions/_shared/briefing.ts:209-223`](supabase/functions/_shared/briefing.ts)) — `sendSmsWithRetry`: 3 attempts, exponential backoff (1s, 2s), retryable on 429/5xx, fail-fast on 21211 (invalid number).
- **SMS logging** (`logSms`, `briefing.ts:225-238`) — every outbound write goes to `sms_conversations` with direction `outbound` or `outbound_failed`; reads in `sunday-checkin:159-165`, `engagement-nudges:162-168`.
- **STOP footer compliance** (per commit `a26faf4`, V8 P0 fix) — `ensureStopFooter` now applied at the briefing send site, the sunday-checkin send site (line 154), and the pickup-risk alert send site. Carrier A2P 10DLC audit-safe.
- **Slack failure alerting** — pickup-risk (50%+ threshold, line 81–84), sunday-checkin (any failure, critical severity, line 200–203), engagement-nudges (50%+, line 684–687), calendar-renewal (50%+, line 245–251). All routed via `notifySlack` helper.

### What's missing or broken

- **P1: `calendar-renewal` always returns 200** ([`route.ts:254-264`](apps/web/src/app/api/cron/calendar-renewal/route.ts)) — even on 100% failure across every household, the endpoint reports success. pg_cron treats this as "fine, don't retry." A Google API quota outage or rotated key would silently leave every user's calendar stale for 6 hours before the next attempt. The other 3 cron endpoints (pickup-risk, sunday-checkin, engagement-nudges) correctly return 500 on failure. **Fix:** mirror the pickup-risk pattern (3 lines). ~5 min.

### Beta blocker?

**No.** The chain works end-to-end; the calendar-renewal P1 is a quality-of-recovery issue, not a launch blocker.

---

## Surface 2 — Portal UX (apps/web/src/app)

### Status: **WORKING**

Sixteen routes, every one of which renders real content with the warm-oat ALD palette consistently applied. No placeholder pages, no dead links, no TBD destinations. The palette tokens in [`apps/web/src/app/globals.css`](apps/web/src/app/globals.css) and [`apps/web/tailwind.config.ts`](apps/web/tailwind.config.ts) — `--bg #F7F3ED`, `--ink #2B261E`, `--green #3C4A33`, `--clay #AC6A45`, plus the dashboard's `--warm`, `--primary`, `--surface-raised`, `--glow-primary` tokens — are applied via two patterns: marketing/auth pages scope under `.marketing` (page-level class), dashboard pages reference `var(--bg)` / `var(--warm)` / `var(--primary)` inline. Both patterns agree on the same hex values; the cream→dark→cream pivot that V8 noted on onboarding pages was fixed in the V8 P1 closeout.

Font pairing is Playfair Display (serif headlines) + Inter (sans body), declared in [`apps/web/src/app/layout.tsx`](apps/web/src/app/layout.tsx) and applied consistently.

### What exists

**Public / marketing routes:**

- [`/` — landing](apps/web/src/app/page.tsx) (10 sections: Nav, Hero, Relatability, OutcomeCards, HouseholdMemory, WhyDifferent, BriefingDemo, Capabilities, Pricing, WaitlistSection, Footer)
- [`/privacy`](apps/web/src/app/privacy/page.tsx) (full policy, dated 2026-05-22)
- [`/terms`](apps/web/src/app/terms/page.tsx) (full ToS, dated 2026-05-22)
- [`/join/invite/[code]`](apps/web/src/app/join/invite/[code]/page.tsx) (partner-invite acceptance, 4 states: loading, invalid, valid, success)
- [`/connect/[token]`](apps/web/src/app/connect/[token]/page.tsx) (SMS-onboarded calendar landing, 4 states)

**Auth routes:**

- [`/(auth)/signin`](apps/web/src/app/(auth)/signin/page.tsx) (phone-OTP + email magic link + Google OAuth + demo mode)
- [`/(auth)/signup`](apps/web/src/app/(auth)/signup/page.tsx) (same three methods, phone-first per migration 038)

**Dashboard routes** (under `(dashboard)/layout.tsx`, all auth-gated by middleware):

- `/dashboard` → redirects to `/dashboard/family` ([`page.tsx:1-9`](apps/web/src/app/(dashboard)/dashboard/page.tsx))
- [`/dashboard/family`](apps/web/src/app/(dashboard)/dashboard/family/page.tsx) (household members by type — adults, children, pets)
- [`/dashboard/calendars`](apps/web/src/app/(dashboard)/dashboard/calendars/page.tsx) (Google + Apple connections, sync status, reconnect CTA when `sync_status='needs_reconnect'`)
- [`/dashboard/settings`](apps/web/src/app/(dashboard)/dashboard/settings/page.tsx) (profile, timezone, sign-out, delete-account)
- [`/dashboard/billing`](apps/web/src/app/(dashboard)/dashboard/billing/page.tsx) (subscription status, trial countdown, cancel-at-period-end flag)
- [`/dashboard/ops`](apps/web/src/app/(dashboard)/ops/page.tsx) (founder-only operations dashboard with system health, metrics feed, alerts)

**Onboarding routes** (OAuth fallback path — see Surface 3 for the SMS-first path):

- [`/onboarding/sms-setup`](apps/web/src/app/onboarding/sms-setup/page.tsx) (3-step wizard: phone → trial → calendar, with Framer Motion + skip-to-calendar)
- [`/onboarding/partner`](apps/web/src/app/onboarding/partner/page.tsx) (abbreviated 1-step for invited partners)
- [`/onboarding/done`](apps/web/src/app/onboarding/done/page.tsx) (completion + welcome-SMS dispatch + 3 copy variants for SMS outcome)

**Shell components:**

- [`SidebarNav`](apps/web/src/components/layout/SidebarNav.tsx) — persistent sidebar, 4 nav items (Household, Calendars, Payments, Settings), timezone-aware countdown to next briefing, sign-out
- [`(dashboard)/layout.tsx`](apps/web/src/app/(dashboard)/layout.tsx) — skip-to-content link for WCAG 2.4.1, 900px responsive breakpoint
- [`Nav`](apps/web/src/components/Nav.tsx) — marketing nav with scroll detection
- [`WaitlistForm`](apps/web/src/components/WaitlistForm.tsx) — phone-first signup with TCPA consent copy

### What's missing or broken

- Mobile QA caveat (V8 P2 carryover): the dashboard's 900px breakpoint collapses correctly per CSS audit, but P2-D9 flagged that the `/dashboard/family`, `/dashboard/calendars`, and `/dashboard/billing` views have **not been QA'd on real iPhone SE or Pixel hardware** — only Chrome DevTools emulation. Likely fine; not verified.

### Beta blocker?

**No.** Every route renders real content, every nav link goes somewhere real, ALD palette is consistent throughout.

---

## Surface 3 — Onboarding Experience

### Status: **WORKING**

The onboarding flow is intentionally **SMS-first**: the primary path never touches the web wizard. A new family puts their phone number on the landing page, gets a confirmation SMS, replies with their name + email, and proceeds through a 10-step SMS conversation state machine. The web `/onboarding/sms-setup` wizard exists as a **fallback for OAuth (Google) signups** — users who arrive via Google OAuth don't have a verified phone yet, so they need a web form to enter one. Both paths converge on `onboarding_completed=true`.

This is a deliberate, well-architected dual-track design. It is not "missing a gate" — the landing CTA explicitly routes phone-first signups into SMS, not the web.

### The two paths

**Path A — SMS-first (primary, phone-first per migration 038):**

1. User enters phone on landing ([`WaitlistForm.tsx`](apps/web/src/components/WaitlistForm.tsx)) → POST `/api/waitlist`
2. [`/api/waitlist/route.ts`](apps/web/src/app/api/waitlist/route.ts) saves to `waitlist` table with TCPA consent snapshot (`SMS_CONSENT_TEXT`, line 12) + sends `CONFIRMATION_SMS` (line 23–26): *"Hey! This is Kin — thanks for joining our waitlist! 🤙 What's your name and email so we can keep you in the loop? Just reply here. Reply STOP to opt out."* (CTPA + A2P 10DLC compliant, opt-out included.)
3. User replies → [`/api/sms/inbound/route.ts:439`](apps/web/src/app/api/sms/inbound/route.ts) detects "phone-first kinai.family waitlist reply" → parses name + email → creates profile via `createOnboardingProfile` ([`sms-onboarding.ts:127–164`](apps/web/src/lib/sms-onboarding.ts)) with `onboarding_step=0`
4. SMS state machine drives onboarding via 10 conversational steps ([`sms-onboarding.ts:182–401`](apps/web/src/lib/sms-onboarding.ts)):
   - Step 0: first half of step-0 reply (family name kickoff)
   - Steps 1–4: freeform name + relationship questions
   - Step 5: wake time (structured — clock time or time-of-day word, validation at line 446)
   - Step 6–7: structured partner info
   - Step 7 specifically: partner phone or explicit skip (line 451)
   - Step 8–9: freeform + email or skip (line 453)
   - Step 10: calendar control word — sends `/connect/[token]` link and waits for completion (lines 339–367)
   - Step 11: complete. Briefing cron begins picking them up.
5. Off-script questions are handled gracefully — `isOffScriptQuestion(step, msg)` (line 469) detects a question instead of an answer, the LLM responds, then re-prompts the same step (`repromptForStep`, line 204). The state machine doesn't lose position.

**Path B — OAuth fallback (Google signups):**

1. User clicks "Sign in with Google" on `/signup` → Google OAuth → `/auth/callback`
2. [`/auth/callback/route.ts`](apps/web/src/app/auth/callback/route.ts) exchanges code, creates session
3. With invite → `/onboarding/partner` (abbreviated 1-step); without invite → `/dashboard`
4. The OAuth user has no phone yet, so the `/onboarding/sms-setup` web wizard is the recovery path. (Note: this route is currently not auto-triggered by middleware — an OAuth user who closes the tab and reopens lands on `/dashboard/family` and would have to find sms-setup themselves. Low-priority: the OAuth path is not the primary acquisition channel.)

**Convergence:**

- [`/onboarding/done`](apps/web/src/app/onboarding/done/page.tsx) marks `onboarding_step=5, onboarding_completed=true` (line 46–50) and POSTs `/api/account/onboarding-complete` which sends the welcome SMS + partner invite. Three copy variants for SMS outcome (welcomeSmsFailed / welcomeSmsConfirmed / default — lines 220–235). Partner phone never leaked from sessionStorage (V7 P1-P4 fix, line 78).
- `profiles.welcome_sms_sent_at` (migration 042) latches the welcome-SMS dispatch; morning-briefing cron picks up the user on the next 6am hourly fan-out tick.

### What exists

- SMS state machine: complete, 11 steps including resume-after-question logic
- Waitlist → SMS handoff: complete and TCPA/A2P-compliant
- OAuth fallback wizard: complete (3 steps, Framer Motion polish, skip-to-calendar)
- Partner invite: complete and idempotent (migration 075 unique-pending constraint, migration 077 phone + renewal recovery)
- Welcome SMS dispatch: complete with 3-way outcome copy
- Completion → briefing eligibility: complete (cron reads `onboarding_completed=true` profiles)

### What's missing or broken

- **P1: OAuth-path users who abandon mid-wizard have no auto-redirect back.** If a Google-OAuth user closes the tab after auth-callback but before completing `/onboarding/sms-setup`, they next see `/dashboard/family` with no phone, no calendar, no trial. The dashboard does not check `onboarding_completed` and bounce. The SMS-first path doesn't have this problem (no web session to abandon), but the OAuth path is a real fallback. **Fix:** add a one-line check in the dashboard layout: if `!profile.onboarding_completed && !profile.phone_number`, redirect to `/onboarding/sms-setup`. ~5 min.
- Sunday check-in only captures the **first** reply within 24h ([`/api/sms/inbound/route.ts:521-540`](apps/web/src/app/api/sms/inbound/route.ts), `sunday_checkin_reply_at` latch). A parent who texts "Tuesday is solo duty" then 10 minutes later "and Friday I'm out half-day" loses the second note. Low-impact but real. Polish item.

### Beta blocker?

**No.** The SMS-first primary path is complete and TCPA-compliant. The OAuth fallback abandon-and-return case is a small UX gap, not a blocker.

---

## Surface 4 — Calendar Integration

### Status: **WORKING**

Google Calendar OAuth, AES-256-GCM token encryption at rest, multi-account support (per-email partial uniqueness), per-calendar sync toggles, webhook channel auto-renewal every 6 hours, and a `needs_reconnect` UI state for tokens that can't be refreshed. The pipeline is the most heavily reworked surface in V6 → V7 → V8 and shows it.

### What exists

**OAuth initiation (two entry points):**

- SMS-onboarded: [`/connect/[token]/page.tsx:54-100`](apps/web/src/app/connect/[token]/page.tsx) — validates one-time `calendar_connect_token` (regex `^[a-zA-Z0-9_-]{8,128}$`, line 30), bounces to Google with `state="sms:<token>"`.
- Web-session: [`/api/calendar/google/route.ts:13-28`](apps/web/src/app/api/calendar/google/route.ts) — `getGoogleAuthUrl(user.id)` returns OAuth URL with `state=<user.id>`.

**OAuth callback** ([`/api/calendar/google/callback/route.ts:30-209`](apps/web/src/app/api/calendar/google/callback/route.ts)):

- State regex shape validation (line 21) — defense against path-traversal in error redirect (V6 P1-A4 fix)
- Atomic token claim (lines 81–85) — conditional UPDATE that nulls `calendar_connect_token` in the same statement; loser of the race sees nothing and bails with 401. Replay-attack safe.
- Token exchange + account-email fetch (lines 98–127) — `exchangeGoogleCode(code)` returns access + refresh + expiry; account email fetched for multi-account scoping.
- Multi-account scoping (lines 129–154) — query by `(profile_id, provider, google_account_email)`; nulls scope to nulls (line 147–148) so a transient userinfo failure doesn't accidentally collide accounts.
- Calendar list + primary alias resolution (lines 109–127) — `listGoogleCalendars()` resolves the "primary" alias to a real calendar ID (e.g. `user@example.com`), falls back to "primary" if lookup fails.
- Encrypted upsert (lines 163–208) — both `access_token` and `refresh_token` go through `encryptToken()` ([`lib/calendar/token-crypto.ts:54-69`](apps/web/src/lib/calendar/token-crypto.ts)) before write. Format: `enc:v1:<base64-iv>:<base64-ciphertext+tag>`. Legacy plaintext recognized and re-encrypted on next write.

**Token encryption** ([`lib/calendar/token-crypto.ts:34-92`](apps/web/src/lib/calendar/token-crypto.ts)):

- AES-256-GCM with random IV per encrypt
- Production: **throws** if `CALENDAR_TOKEN_ENCRYPTION_KEY` env var is missing (lines 37–41) — fail-loud, not silent
- Development: silent passthrough (line 59) for local testing without key
- Backward-compat path for the legacy plaintext rows that exist from before V6

**Channel renewal cron** ([`/api/cron/calendar-renewal/route.ts:143-264`](apps/web/src/app/api/cron/calendar-renewal/route.ts), 6h schedule):

- Job 1 (lines 153–205): selects Google connections with `google_channel_expiry < now + 24h`; per connection, `renewOne()` decrypts refresh token, calls `refreshGoogleToken()`, registers a fresh webhook channel, persists new channel ID + resource ID + expiry, best-effort stops the old channel.
- Failure handling: missing refresh_token OR already-expired channel → flip `sync_status` to `needs_reconnect` (lines 189–203). V7 P2-C1 closeout.
- Job 2 (lines 207–227): catches missed webhooks by re-syncing any enabled connection with `last_synced_at` older than 6h.
- Dashboard reads `sync_status='needs_reconnect'` and renders the "Reconnect Google Calendar" CTA in [`/dashboard/calendars`](apps/web/src/app/(dashboard)/dashboard/calendars/page.tsx).

**Multi-account support** (migrations [067](supabase/migrations/067_calendar_multi_account_and_per_calendar_sync.sql), [074](supabase/migrations/074_calendar_account_email.sql), [078](supabase/migrations/078_google_multi_account_by_email.sql)):

- Dropped legacy `UNIQUE(profile_id, provider)` constraint (067:27)
- Apple: one connection per profile (partial unique, 067:30–32)
- Google: per-calendar uniqueness `(profile_id, provider, google_calendar_id)` (067:34–36)
- 078: per-account-email uniqueness for the multi-Google case
- `google_sync_tokens` JSONB for per-sub-calendar incremental sync state (067:44–45)

**Calendar event visibility** (migration 051): `private` and `confidential` event titles are hidden in briefing output ([`briefing.ts:607-609`](supabase/functions/_shared/briefing.ts)).

### What's missing or broken

- **P1: `calendar-renewal` always returns 200 even on full failure** (same item as Surface 1) — robs pg_cron of retry signal. ~5 min fix.
- Recurring-event exceptions are documented (V8 P2 carryover) but not solved end-to-end — a Google event series with an exception (e.g. "this week's soccer is moved to Wednesday") may render with the series default. Edge case; not seen in V7 beta.

### Beta blocker?

**No.** Production-ready for the SMS-onboarded + OAuth-onboarded primary cases. The renewal-failure retry signal is a polish item.

---

## Surface 5 — Data Capture for Briefings

### Status: **WORKING**

The briefing engine pulls from 6 distinct data sources, weaves them into a structured context, hands the context to a model-pinned Claude prompt, and ships the output via the SMS retry layer to `sms_conversations` + `morning_briefings` with a non-blocking quality score. Every step has a real implementation; nothing is a stub.

### Data sources feeding the briefing

All queries live in `buildBriefingContext` ([`supabase/functions/_shared/briefing.ts:838-949`](supabase/functions/_shared/briefing.ts)):

| Source | Table | Query | Lines |
|---|---|---|---|
| **Today's calendar events** | `calendar_events` | overlap with user-local-day in UTC; multi-day events included; private/confidential titles hidden | 873–879, 607–609, 867–872 |
| **Household members** | `family_members` | scoped by `profile_id OR household_id`; covers both SMS-onboarded and conversation-learned members | 883–886 |
| **Profile + onboarding notes** | `profiles.context_notes` | home location, school, daycare, work location, commute — captured during SMS onboarding | 852–858 |
| **Coordination issues** | `coordination_issues` | OPEN + ACKNOWLEDGED, touching today, newest first, limit 20 (raised from 8 in V6 P1-M3); Slack-warns at limit | 906–925, 932–936 |
| **Sunday check-in week-ahead notes** | `user_context_notes` | profile_id, non-expired (8-day TTL), newest first | 893–899 |
| **Calendar staleness signal** | `calendar_connections` | last_synced_at + sync_status + provider; emits "last synced Xh ago" or "Google needs reconnect" warning in briefing | 887–890, 698–743 |

**Optional enrichments:**

- Weather: `fetchWeather` (lines 296–375) — OpenWeather API, gated by home location from context_notes
- Travel times: `fetchTravelTimes` (lines 595–649) — Google Distance Matrix, home → event chain

### Generation pipeline

- **Timezone resolution** ([`briefing.ts:57-104`](supabase/functions/_shared/briefing.ts)) — `getLocalHour()`, `getLocalDate()`, `resolveTimezone()` with IANA validation. (See P1 note below on the LA fallback.)
- **Calendar day window** (lines 140–152) — `localDayRangeUtc()` returns `[startUtc, endUtc)` in UTC for the user's local calendar day, avoiding the UTC-date-straddle bug.
- **System prompt** (lines 745–777) — 32 lines of grounding instruction: output format, what to say, no manufactured urgency, weather only when impact is real, routines, event times, travel times, humility, "deliver and stop, do NOT ask a question" on normal days.
- **Model pinning** — Anthropic Claude API with explicit model ID per V7 P0 fix
- **SMS ceiling** — 1600 chars enforced
- **STOP footer** — appended per V8 P0-1 fix (commit `a26faf4`)
- **Quality scoring** (migration [061](supabase/migrations/061_briefing_quality_score.sql), columns `quality_score`, `quality_grade`, `quality_issues`) — `scoreBriefing` from `_shared/briefing-quality.ts`; non-blocking (briefing ships even if scoring fails).
- **Audit/recovery cron** (migration [047](supabase/migrations/047_briefing_audit_cron.sql)) — `briefing-audit-daily` at 2pm UTC = 9am CT catches any user who didn't get a briefing at 6am.

### Tables NOT yet read by the briefing engine

These exist in migrations but the briefing context-builder does not query them — they are either deprecated, parked for Phase 2, or covered by another table:

- `children_details` (014), `pet_details` (015) — covered by `family_members`
- `fitness` (016), `date_nights` (019), `grocery_list_items` (020), `commute_departure_tracking` (021), `med_vax_notification_tracking` (022) — Phase 2 surfaces, not yet in briefing context
- `kin_check_ins` (026) — schema exists, no UI/generation logic (see Surface 6)
- `activity_log` (033) — founder-only, RLS-denied to users (see Surface 6)

### What exists

- All 6 listed data sources are real, queried, and woven into the briefing prompt
- Quality scoring is shipped and logged per briefing
- Audit cron catches misses
- STOP footer + model pinning + SMS ceiling all in place

### What's missing or broken

- **P1 (cross-listed with Surface 1):** `DEFAULT_TIMEZONE` in [`briefing.ts:83`](supabase/functions/_shared/briefing.ts) is still `America/Los_Angeles`. V6 + V7 deprecated this for the other recurring jobs (sunday-checkin and engagement-nudges fall back to UTC); briefing.ts didn't get the memo. Impact: a profile with a corrupt or unset timezone would generate a briefing on LA time. Low probability (timezone is captured during SMS onboarding step 0), but worth a 1-line fix.

### Beta blocker?

**No.** The data pipeline is complete for the surfaces that matter to the briefing. The unused tables are Phase 2 surface area, not gaps in today's briefing.

---

## Surface 6 — Recurring Tasks / Activity Logging

### Status: **NOT BUILT** (as a user-facing product surface)

This is the largest delta between the spec ("Family OS") and the implementation. The `activity_log` table exists but it is a **founder-only growth-metrics audit table** — its RLS policy denies all `authn`/`anon` access, and the only writes come from server code logging signup events. There is no user-facing activity feed, no SMS verb to log an activity ("Maya had soccer practice today"), no recurring-task storage ("every Tuesday at 4pm"), and the briefing pipeline does not read from `activity_log`.

### What exists

- **`activity_log`** ([migration 033_activity_log.sql:14-31](supabase/migrations/033_activity_log.sql)) — `(id, event_type, email, profile_id, metadata, created_at)`. Service-role-only writes. Used by [`/api/auth/callback/route.ts:427`](apps/web/src/app/auth/callback/route.ts) and `/api/account/signup-notify` to log waitlist signups, account creations, subscriptions. Purpose: founder dashboard for growth signals. Not user-facing.
- **`coordination_issues`** ([migration 024_coordination_issues.sql:5-70](supabase/migrations/024_coordination_issues.sql)) — pickup conflicts, schedule compression, late changes. Has a state machine (OPEN → ACKNOWLEDGED → RESOLVED). Read by briefing (lines 906–925) and by the pickup-risk cron. This is the closest thing to "activity tracking" the user actually sees — but only as alerts, not as a log.
- **`user_context_notes`** ([migration 052_sunday_checkin.sql:29-36](supabase/migrations/052_sunday_checkin.sql)) — captures the Sunday check-in reply as freeform text with 8-day TTL. Folded into Monday's briefing. Not structured.
- **`kin_check_ins`** ([migration 026_kin_check_ins.sql:5-39](supabase/migrations/026_kin_check_ins.sql)) — table schema exists; **no generation logic, no UI, no cron**. Pure schema, parked for Phase 2.
- **Household memory in profile** ([`briefing.ts:158-169`](supabase/functions/_shared/briefing.ts)) — newline-delimited text in `profiles.household_context`. Lightweight, but it's the closest thing to "remembered routines."

### What's missing or broken

- **No user-facing activity log UI** — a parent can't see what the family did this week. The "Family OS" surface area isn't there.
- **No recurring-task / routine storage** — "Maya has soccer every Tuesday" must come from the parent's Google Calendar. There is no Kin-native way to store, edit, or alert on a recurring routine that isn't on the calendar.
- **No SMS "log activity" conversation flow** — Kin doesn't recognize "Maya had soccer practice today" as a loggable event. The Sunday check-in captures freeform week-ahead notes; nothing captures retroactive activity.
- **No activity → briefing pipeline** — the briefing engine never reads `activity_log`; it has no view into "what we did last week."
- **`kin_check_ins` is dead schema** — the spec calls for "max 2 per day on Today screen" but there is no Today screen and no generator. Cleanup or build.

### Beta blocker?

**Yes (product gap, not infrastructure gap).** A beta tester asking "where do I see what we did this week?" or "can Kin remember Maya's regular schedule?" gets no answer. This is the single largest spec-to-implementation gap in the codebase. The recommendation is **not to silently ship and hope** — the recommendation is to ship with explicit positioning ("Phase 1 = the briefing engine; recurring tasks + activity feed = Phase 2") OR to build a v0.1 activity-log surface (SMS verb + briefing fold) before launch. The latter is ~1–2 days of work; the former is a marketing decision.

---

## Surface 7 — Weekly Suggestions

### Status: **PARTIAL** (capture works, "analysis" doesn't exist yet)

The Sunday check-in loop is the only weekly mechanism in the codebase, and it is a **capture-and-fold** loop, not an analysis-and-suggest loop. The product surface implied by the spec ("here's what we noticed about your week; here's what to think about for next week") is not built. What exists is a great open-ended SMS that captures parent intent + a Monday briefing that weaves that intent into context.

### What exists

**The Sunday check-in cron** ([`/api/cron/sunday-checkin/route.ts:91-218`](apps/web/src/app/api/cron/sunday-checkin/route.ts)):

- Hourly schedule, fans out to users whose local time is Sunday 2pm (line 126 fallback to UTC if timezone unset)
- LLM-generated casual SMS (intent at lines 67–89), fallback template: *"anything big coming up this week? Reminders, deadlines, things I should know about? Reply here and I'll fold it into Monday's briefing."*
- Billing gate: trial + active only (line 110)
- TCPA: respects `sms_opted_out_at` (line 109), `ensureStopFooter` at line 154
- Dedup: 3-day window via `sunday_checkin_sent_at` latch (line 45, 141–147)
- Slack alert on critical failure (line 200–203)

**The reply capture** ([`/api/sms/inbound/route.ts:521-540`](apps/web/src/app/api/sms/inbound/route.ts)):

- Captures **first** reply within 24h of send
- Writes to `user_context_notes` with `source='sunday_checkin'` and `expires_at = now + 8 days`
- Sets `sunday_checkin_reply_at` latch to prevent double-capture

**The Monday fold** ([`briefing.ts:894-899`](supabase/functions/_shared/briefing.ts)):

- Briefing context-builder queries `user_context_notes` (non-expired, newest first, limit 5)
- Notes passed into the briefing prompt as week-ahead context
- Known limitation ([`docs/MESSAGE_QUALITY.md:167-170`](docs/MESSAGE_QUALITY.md)): *"Live notes from the Sunday check-in are surfaced, but the model sometimes prioritizes today's logistics over a bigger week-ahead item (e.g. Wednesday solo-duty). Acceptable today; could be tuned with a `LIVE NOTES PRIORITY` rule if it ever feels like a miss."*

**Coordination issues as a passive "weekly view"** ([migration 024](supabase/migrations/024_coordination_issues.sql)):

- Detects pickup-risk, schedule compression, late changes
- Surfaces via briefing + as standalone SMS alerts
- **Reactive, not predictive** — fires when a conflict is detected, not "here's what to watch this week"
- Never aggregated into a weekly "you had 3 conflicts this week" report

**Engagement nudges** (NOT weekly suggestions, despite the naming overlap — [`/api/cron/engagement-nudges/route.ts:636-706`](apps/web/src/app/api/cron/engagement-nudges/route.ts)):

- Trial drip (day 3, 7, 12, 13) + re-engagement (30d + 60d silence)
- These are *retention* messages, not week-ahead suggestions

### What's missing or broken

- **No past-week analysis** — Sunday check-in asks about the upcoming week but doesn't surface "here's what we handled last week."
- **No week-ahead suggestion engine** — no "Wednesday looks tight — consider shifting the dinner reservation"; no "Maya usually has soccer on Tuesday; do we have pickup coverage?"; no "you've solo-parented 4 nights this month; next week looks similar."
- **No pattern detection across weeks** — `coordination_issues` are surfaced one at a time, never aggregated into trends.
- **No structuring of the captured reply** — the parent texts "Wednesday is solo duty" and the system stores the raw string. No parsing into a structured "Wednesday is solo duty for Austin" entity that downstream code can act on.
- **No "insights" surface** — the briefing is tactical (today's implications), not strategic (weekly planning view).

### Beta blocker?

**Yes (product gap).** Same shape as Surface 6: the capture-and-fold mechanism works, but the "Weekly Suggestions" surface that the spec implies is two-thirds unbuilt. Beta testers will respond to the Sunday SMS, see their reply reflected in Monday's briefing (sometimes — see the MESSAGE_QUALITY caveat), and ask "is that it? Where are the suggestions?" Same recommendation as Surface 6: ship with explicit Phase 1 positioning, OR build a v0.1 weekly digest (1-day work: simple SMS each Sunday morning summarizing last week's events + coordination issues from `morning_briefings` + `coordination_issues`) before launch.

---

## Summary scorecard

| # | Surface | Status | What works | What's missing | P0 | P1 |
|---|---|---|---|---|---|---|
| 1 | Product Wiring | WORKING | 6 cron jobs, Vault auth, SMS retry, Slack alerts, STOP footer | calendar-renewal returns 200 on full failure | 0 | 1 |
| 2 | Portal UX | WORKING | 16 routes, ALD palette, no dead links | iPhone QA caveat | 0 | 0 |
| 3 | Onboarding | WORKING | SMS-first state machine (steps 0–10), OAuth fallback wizard, partner invite | OAuth-path abandon-return no auto-redirect | 0 | 1 |
| 4 | Calendar | WORKING | OAuth, AES-256-GCM, multi-account, 6h channel renewal, needs_reconnect UI | (P1 shared with #1) | 0 | 0 |
| 5 | Briefing Data | WORKING | 6 context sources, model-pinned, quality-scored, audit cron | DEFAULT_TIMEZONE still LA, not UTC | 0 | 1 |
| 6 | Activity Logging | **NOT BUILT** (user-facing) | activity_log table exists, but founder-only | No UI, no SMS verb, no recurring tasks, no briefing fold | **1** | 0 |
| 7 | Weekly Suggestions | PARTIAL | Sunday capture, Monday fold | No past-week analysis, no predictions, no pattern detection | **1** | 0 |
| | **Total** | | | | **2** | **3** |

---

## Blockers and estimated fix time

### P0 — Product-surface blockers (2)

These are not crashes or compliance failures — they are spec-promised surfaces the code does not yet implement. Recommendation: choose **ship-with-positioning** OR **build v0.1**.

| # | Item | Recommendation | If "build v0.1" | If "ship with positioning" |
|---|---|---|---|---|
| 1 | Activity logging / recurring tasks | Either ship as Phase 2 or build minimum v0.1 (SMS verb: "log: Maya soccer Tuesday 4pm" → `activity_log` insert → fold into Monday briefing) | **1–2 days** | **30 min** (landing page + beta welcome SMS messaging) |
| 2 | Weekly suggestions | Either ship as Phase 2 or build minimum v0.1 (Sunday morning digest: "last week: 3 events, 1 pickup conflict" — derive from existing `morning_briefings` + `coordination_issues`) | **1 day** | **30 min** (same as above) |

### P1 — Polish (3)

All three are < 30 min total. Recommend bundling into a single first-weekend commit.

| # | Item | File | Fix | Time |
|---|---|---|---|---|
| 1 | `calendar-renewal` returns 200 on full failure | [`apps/web/src/app/api/cron/calendar-renewal/route.ts:254-264`](apps/web/src/app/api/cron/calendar-renewal/route.ts) | Return 500 when failure ratio >50% (mirror pickup-risk pattern) | 5 min |
| 2 | `DEFAULT_TIMEZONE` still falls back to LA | [`supabase/functions/_shared/briefing.ts:83`](supabase/functions/_shared/briefing.ts) | Change to `"UTC"` | 1 min |
| 3 | OAuth-path onboarding abandon has no return path | [`apps/web/src/app/(dashboard)/layout.tsx`](apps/web/src/app/(dashboard)/layout.tsx) | If `!onboarding_completed && !phone_number`, redirect to `/onboarding/sms-setup` | 10 min |

**Bonus polish (not counted in blockers):**

- Sunday check-in capture should accept multiple replies within 24h (today it latches on first). [`/api/sms/inbound/route.ts:521-540`](apps/web/src/app/api/sms/inbound/route.ts). Drop the latch, dedupe by content hash. ~15 min.
- `kin_check_ins` table is dead schema (no generator, no UI). Either build the generator or drop the table. ~30 min decision; ~1h either path.

---

## GO / NO-GO / CONDITIONAL-GO verdict

### **CONDITIONAL GO** — ship to ≤10 beta families with explicit positioning, OR build the two v0.1 surfaces (2–3 days)

**The infrastructure is ready.** Every chain works end-to-end. Every cron job is wired with the right auth, every web route renders, every onboarding step has a path, every calendar token is encrypted, every briefing has the right data, every SMS gets a STOP footer. The recent V8 closeout cleared the last compliance-tier P0s. This is genuinely the strongest the codebase has been.

**The product is two-thirds-built.** The briefing engine — which is the spine of Kin — is fully shipped and working. The two surfaces that the "Family OS" framing implies (activity log + weekly suggestions) are either schema-only or capture-only. Beta testers will ask about them.

**The path forward, in priority order:**

1. **Decide the positioning question this week.** Either commit to "Phase 1 = the briefing engine" framing in the beta welcome SMS + landing page (~30 min copy work), or commit to building v0.1 of activity log + weekly suggestions before launch (~2–3 days). Both are valid. Pick.
2. **Bundle the 3 P1 polish items into one commit before launch.** ~30 min total. Strict win.
3. **Monitor `calendar-renewal` failures manually for the first week** (because it returns 200 on failure), until the P1 retry-signal fix lands.
4. **Plan the activity-log + weekly-suggestions v0.1 work for week 2 of beta** if shipping with positioning — these are the next two features the beta cohort will ask about.

The beta is launchable. The decision is product positioning, not engineering readiness.

---

*Generated 2026-05-26 from source-level read of branch `main` at HEAD `a26faf4`. 3 parallel research streams, all findings cross-referenced against source files. No live DB or production queries used.*
