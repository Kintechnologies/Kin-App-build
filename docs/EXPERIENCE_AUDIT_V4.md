# Kin Beta Readiness Audit v4

**Date:** 2026-05-22
**Branch:** main (HEAD `6b97ec3`)
**Auditor:** Claude (Opus 4.7) — orchestrated 4-stream parallel audit + inline verification
**Scope:** Full codebase + product surface — V4 fresh sweep after V3 P0/P1 fixes landed
**Production URL:** kinai.family
**Supabase ref:** coxqdpcffmsncvisfyvj
**Tests:** 39 passing (27 web + 12 shared); next lint clean; 2 TS errors carried from V3 (test mocks)

---

## Overall Grade: **B (ship-ready with 7 P0 fixes — same caliber as V3, but the V3 launch fixes exposed deeper gaps underneath)**

V3's 5 P0 fixes (commit `9a772f2`) and 21 P1 fixes (commit `6b97ec3`) **landed correctly**. Spot-verified: idempotency partial unique index (migration 062), 30s Anthropic timeout, byte-aware nudge cap math, STOP footer on waitlist/approved messages, +1 phone gating, calendar reconnect CTA, all-day-noon-UTC anchor, scorer null-streak alerts, cleanup-cron PII scrubbing, ops rate limit, invite-accept rate limit. All present and correct in the source.

What V4 surfaces is a **second layer** that V3 didn't reach — most of these are pre-existing gaps that were screened by the louder issues V3 fixed. The headline ones:

1. **The V3 trial-gating fix is undermined by a missing trial-expiry transition.** Briefings now skip `canceled` users — but **nothing in the codebase ever flips a trial-only user to `canceled` at day 14**. The Stripe webhook only writes `canceled` when an existing Stripe subscription is deleted; a user who never paid has no Stripe subscription, so `subscription_status` stays `trial` forever. The fan-out filter `(trial, active)` then keeps texting them free briefings indefinitely.
2. **Landing page advertises a `$299/yr` annual plan that doesn't exist in Stripe.** Only `kin_premium_monthly` is wired in `lib/stripe.ts`; checkout creates a monthly subscription regardless of the toggle. A user clicking "lock in this price forever" on the annual tab gets billed $39/mo.
3. **Sunday check-in cron has the V3 P0-1 hole that morning-briefing fixed.** Same gating gap, different cron route — `cron/sunday-checkin` still texts past_due/canceled users.
4. **Stripe webhook is neither idempotent nor order-aware.** A retried `customer.subscription.deleted` event arriving after a fresh `checkout.session.completed` flips a paying user to canceled, killing briefings + firing the trial-ended SMS.
5. **`cron-dispatch` edge function has no caller authentication** — public DoS surface. Anyone on the internet can trigger any sub-daily cron at will.

Architecture is sound. Auth trigger, RLS, webhook signatures, STOP/HELP/START handling, idempotent briefing dedup, plaintext fallback, quality scorer, opt-out latch on every outbound path, error boundaries, founder-locked ops dashboard, isAuthorizedCron unification — all hold up to a hard re-look. The remaining work is a tight set of fixes that close revenue, compliance, and DoS surface before paying families come in.

---

## Top-line summary

| Layer | Grade | P0 | P1 | P2 |
|---|---|---|---|---|
| Code quality (TS, lint, tests) | A− | 0 | 1 | 3 |
| Auth & Access Control | A− | 1 | 2 | 3 |
| SMS pipeline + compliance | B+ | 0 | 5 | 3 |
| Briefing system | B+ | 1 | 6 | 3 |
| Calendar sync | B | 2 | 4 | 3 |
| Portal/Dashboard | B+ | 2 | 3 | 1 |
| Landing page | B | 1 | 4 | 2 |
| Infrastructure | B+ | 1 | 5 | 3 |
| Security | A− | 0 | 3 | 2 |
| Edge cases | B | 1 | 4 | 3 |
| **Total** | **B** | **7** | **27** | **27** |

---

## P0 — Launch Blockers (7)

These directly create revenue leak, false-advertising, compliance exposure, or a DoS surface. Must be patched before paying families come in.

### P0-1. Trial users never expire to `canceled` — neutralizes the V3 P0-1 fix for the common case
**Files:** `apps/web/src/app/api/stripe/webhook/route.ts`, `supabase/functions/morning-briefing/index.ts:54`, `supabase/functions/briefing-audit/index.ts:47`

The Stripe webhook only sets `subscription_status = "canceled"` on `customer.subscription.deleted`. A user who finishes 14 days of trial **without paying** has no Stripe subscription at all — nothing fires the cancel event. Their row stays `subscription_status = "trial"` forever, and the V3 P0-1 fan-out filter `subscription_status.in.(trial,active)` keeps them eligible. Free briefings + Twilio cost + TCPA risk (carrier audit story is "they paid for it") continue indefinitely. The day-12/13 trial nudges keep firing (latched by `nudges_sent`, so only once each) and the trial-ended goodbye nudge — gated on `subscription_status = "canceled"` — never sends.

**Fix:** Add a daily cron (or pg_cron job) that runs:
```sql
UPDATE profiles
SET subscription_status = 'canceled'
WHERE subscription_status = 'trial'
  AND billing_exempt = false
  AND trial_ends_at < NOW()
  AND stripe_customer_id IS NULL;
```
Alternatively, gate both briefing fan-out queries on `(trial_ends_at IS NULL OR trial_ends_at > NOW() OR subscription_status = 'active' OR billing_exempt = true)`. ~10 lines.

---

### P0-2. Sunday check-in cron sends to canceled/past_due subscribers
**File:** `apps/web/src/app/api/cron/sunday-checkin/route.ts:97-103`

Same gating gap that V3 P0-1 closed for morning-briefing, but the Sunday cron was never updated. Filter today is only `onboarding_completed = true`, `phone_number IS NOT NULL`, `sms_opted_out_at IS NULL` — a canceled customer still receives the weekly Sunday-evening "how's the week ahead?" SMS.

**Fix:** Add `.or("subscription_status.in.(trial,active),billing_exempt.eq.true")` to mirror the morning-briefing edge function. One line.

---

### P0-3. Annual $299/yr advertised on landing — backend has no annual price wired
**Files:** `apps/web/src/components/Pricing.tsx:18`, `apps/web/src/lib/stripe.ts:19-49`, `apps/web/src/app/api/stripe/checkout/route.ts:107`

`Pricing.tsx` displays a monthly/annual toggle with `$299/yr` plus "Early access members lock in this price forever." But `lib/stripe.ts` only exports `MONTHLY_LOOKUP_KEY = "kin_premium_monthly"` and `PREMIUM_MONTHLY_PRICE = 39`. The checkout route always calls `resolveMonthlyPriceId(stripe)` — there's no annual path. Grep for `\b299\b` / `kin_premium_annual` / `interval.*year` returns zero hits anywhere in `lib/` or `api/`. A user choosing annual and clicking through gets a $39/mo subscription.

**Impact:** False advertising; lost conversion on yearly buyers; trust loss when receipts arrive monthly.

**Fix (pre-beta safest):** Remove the annual toggle from `Pricing.tsx` (one-line conditional) until the yearly price + checkout interval is plumbed. Post-beta: add `PREMIUM_YEARLY_PRICE = 299`, a `kin_premium_annual` lookup key, and an `interval` param to checkout.

---

### P0-4. Stripe webhook is not idempotent and not order-aware
**File:** `apps/web/src/app/api/stripe/webhook/route.ts:148-183`

No `stripe_events` table; no check on `event.id` or `event.created`. Stripe explicitly documents that webhook events can arrive out of order, can be retried for up to 3 days, and that handlers must be idempotent. If `customer.subscription.deleted` is retried (or arrives late) AFTER a fresh `checkout.session.completed` (user re-subscribed), the late delete will flip a paying user from `active` back to `canceled` — silently killing their briefings AND firing the "trial-ended" goodbye SMS at them.

**Impact:** Paying customer becomes silently lapsed; engagement-nudges then sends a "trial ended, resubscribe" SMS at a paying user. Bad either way; brutal at scale.

**Fix:** Add a `stripe_events(event_id PK, processed_at)` table; insert at the top of the handler with `ON CONFLICT DO NOTHING RETURNING *`; if no row returned, short-circuit 200 (already processed). Separately, before applying a regression (`active → canceled`), check `event.created` against the profile's last subscription-state-change timestamp and ignore older events. ~30 lines plus a migration.

---

### P0-5. `cron-dispatch` edge function has no caller authentication — public DoS surface
**File:** `supabase/functions/cron-dispatch/index.ts`

`verify_jwt = false` (intentional — pg_cron has no JWT) AND no shared-secret check from the caller side. Any unauthenticated internet request to `https://coxqdpcffmsncvisfyvj.supabase.co/functions/v1/cron-dispatch?job=...` will dispatch any sub-daily cron. The function then sends a valid `CRON_SECRET` bearer to the Next.js cron route, so the Vercel side accepts it. An attacker can fire `pickup-risk`, `sunday-checkin`, `engagement-nudges?mode=onboarding`, `calendar-renewal`, and `morning-briefing` thousands of times an hour.

**Impact:** Public-internet DoS amplifier — each tick is a Supabase function invocation + a Vercel function invocation + DB load + (for some jobs) Twilio/Claude spend. The fact that pickup-risk and morning-briefing won't *re-send* SMS (dedup latches catch most of that) limits the worst case, but DB and compute spend is unbounded.

**Fix:** Require an `x-cron-secret` header in `cron-dispatch` matching `Deno.env.get("CRON_SECRET")`; have pg_cron include it via `net.http_post(headers => jsonb_build_object('x-cron-secret', current_setting('app.settings.cron_secret')))`. The web routes already validate the bearer downstream — this is defense in depth at the entry point. Migration + 5-line function edit.

---

### P0-6. Test endpoint `/api/test/morning-briefing` leaks private event titles
**File:** `apps/web/src/lib/sms-briefing.ts:215-220, 237-241`

The production edge function (`_shared/briefing.ts:725-782`) correctly selects `visibility` and substitutes "Private event" + drops location for `visibility = 'private' | 'confidential'`. The web/test path does not — it `SELECT title, start_time, end_time, location` only, sending verbatim into the LLM context. The web `sms-briefing.ts` is currently only the founder/dev test path, but it duplicates enough of the briefing pipeline that drift between paths leaks real semantics, and any future code that imports `generateSmsBriefing` inherits the leak.

**Impact:** A therapy/interview/affair event marked Private in Google Calendar shows up by name in any briefing produced through the test endpoint. Twilio logs retain it forever. Trust collapse if a household ever shares the test SMS.

**Fix:** Two options. (a) Add `visibility` to both queries; mirror the edge-function substitution. (b) Delete `apps/web/src/lib/sms-briefing.ts` and have `/api/test/morning-briefing` HTTP-invoke the edge function directly. (b) is the right answer long-term (kills drift permanently) but (a) is a 10-line patch for beta.

---

### P0-7. Multi-day all-day events disappear from the briefing window mid-event
**Files:** `apps/web/src/lib/calendar/google.ts:214-229`, `supabase/functions/_shared/briefing.ts:723-729`, `apps/web/src/lib/sms-briefing.ts:218-219`, `apps/web/src/app/api/sms/inbound/route.ts:440-459`

The V3 P1-C2 fix correctly anchors all-day events at noon UTC — works for single-day events. But Google reports `end.date` as **exclusive** (a 3-day event spanning Jan 1–3 has `start.date = "2026-01-01"`, `end.date = "2026-01-04"`). The conversion now produces `start_time = Jan 1 12:00Z`, `end_time = Jan 4 12:00Z`. Every briefing query filters by `start_time` within today's range, so on Jan 2 and Jan 3 the event is **invisible** — start_time is Jan 1, outside today's window.

**Impact:** Vacations, school breaks, sick days, custody handoff weeks — multi-day all-day events are common in family calendars — silently absent from the briefing on every day except the first. SMS inbound `/api/sms/inbound` Claude context inherits the same bug, so Kin will deny knowing about an event the user can see in their calendar.

**Fix:** Change every "today's events" query from:
```ts
.gte("start_time", todayStart).lte("start_time", todayEnd)
```
to:
```ts
.lte("start_time", todayEnd).or(`end_time.gt.${todayStart},end_time.is.null`)
```
(or equivalent). Five locations need the same update: `_shared/briefing.ts:723-729`, `sms-briefing.ts:218-219, 240-241`, `apps/web/src/app/api/sms/inbound/route.ts:440-441, 458-459`.

---

## P1 — Should Fix Before Beta Week 1 (27)

### Code quality (1)

**P1-Q1.** `npm test` at repo root is broken — vitest 4 dropped `--workspace`. CI already works around this with per-package `npm run test -w @kin/...` (`.github/workflows/ci.yml`), but the root script silently throws for any contributor who runs it. Remove from root `package.json` or rewrite to `npm run test -w @kin/web && npm run test -w @kin/shared`.

### Auth & Access Control (2)

**P1-A1.** `/ops` is not in middleware `protectedRoutes` — `apps/web/src/middleware.ts:8`. Route lives at `app/(dashboard)/ops/page.tsx`, which renders at URL `/ops` (the `(dashboard)` group is not in the path). Middleware only protects `/dashboard` and `/onboarding`, so an unauthenticated visitor gets the rendered shell of the ops dashboard before the client fetch to `/api/ops/metrics` returns 401. Info disclosure of admin-route existence + UX flash. Add `"/ops"` to `protectedRoutes`.

**P1-A2.** Third admin phone (`+16266761832`, Jontae's secondary) missing from `ADMIN_PHONES` in `apps/web/src/app/api/ops/metrics/route.ts:26`. Set contains only `["+16266762222", "+16266762832"]`. Jontae cannot access `/ops` from one of his configured numbers.

### SMS pipeline (5)

**P1-S1.** Inbound webhook's `formatTime` hardcodes `timeZone: "UTC"` — `apps/web/src/app/api/sms/inbound/route.ts:67-73`. V3 P1-B2 fixed this in `sms-briefing.ts` but the inbound conversation-Claude context still feeds UTC event times into the SMS system prompt. A 9 AM PT event renders as "16:00" in the prompt context. Same fix: take `timezone` from `profileRow.timezone`.

**P1-S2.** Inbound webhook's calendar-event window uses UTC `today` — `route.ts:428, 440-441, 458-459`. `new Date().toISOString().split("T")[0]` is the server's UTC date. For a Pacific user texting at 11 PM local (07:00 UTC next day), the window queries tomorrow. Combine with P0-7 fix.

**P1-S3.** Idempotency race window when retry arrives during first request — `route.ts:240-272, 341-361`. Both retry paths handle "no outbound row yet" by returning `twimlEmpty()`. If the original request is still mid-Claude-call when Twilio retries (12s Claude budget + Twilio's 15s webhook ceiling leaves a ~3s window), the retry sees no cached outbound and returns empty TwiML; the original then sends a real reply. User sees reply once (correct) — but if the original *then* fails after the retry's empty-TwiML response went back, a third attempt also gets empty TwiML. Worst case under retry storm: user gets zero replies even though Claude succeeded. Fix: pre-insert a "in-progress" sentinel row keyed by MessageSid before the Claude call, or run Claude under a row-level advisory lock.

**P1-S4.** STOP/HELP/INFO/START short-circuit BEFORE idempotency check — `route.ts:167-229`. The DB updates are idempotent, but each retry of a STOP message still emits a TwiML response (outbound segment billed) and a HELP/START retry re-sends the carrier-required confirmation. Move these handlers after the MessageSid lookup at line 240, and store the sid with their inbound rows so retries hit the cache.

**P1-S5.** Rate-limiter graceful-degrades to "allow all" when Upstash env vars missing — `apps/web/src/lib/rate-limit.ts:115-119`. Without `UPSTASH_REDIS_REST_URL`/`_TOKEN`, every limiter returns `{allowed: true, remaining: Infinity}` and logs nothing. A secret rotation that fails to persist in prod silently disables ALL rate limits (SMS, ops-metrics, invite, chat, first-use). For an SMS-first product where unlimited inbound = direct Claude+Twilio spend, this is a real cost-runaway landmine. Fail-closed in production (throw if env missing AND `NODE_ENV === 'production'`); at minimum, surface a "rate-limit DEGRADED" indicator on the ops dashboard.

### Briefing system (6)

**P1-B1.** Parallel briefing pipelines drift between Deno edge and Node web — `supabase/functions/_shared/briefing.ts` vs `apps/web/src/lib/sms-briefing.ts`. Edge has: quality scoring, plaintext fallback, byte-aware nudge cap, travel times, weather, calendar-staleness note. Web has: pickup-risk integration, coordination_issues fetch, `getHouseholdContext`, partner calendar. Drift test in `packages/shared` only byte-compares the system PROMPT, not the surrounding pipeline. The founder testing via `/api/test/morning-briefing` sees a *better* briefing than real users get at 6 AM. Fix: pick the edge as canonical, fold pickup-risk + coordination_issues + householdMemory into `_shared/briefing.ts`, and either delete the web copy or have the test route HTTP-invoke the edge function.

**P1-B2.** Quality scorer threshold (80) has no production calibration — `supabase/functions/_shared/briefing-quality.ts:32`. With a strict Haiku judge prompt, an 80-point pass bar will Slack-warn on 30–60% of beta-week-1 briefings. Team will mute the channel and miss real regressions. Drop to 70 (D) for the first two weeks and ratchet up against observed distribution.

**P1-B3.** Plaintext fallback opens with a forbidden greeting — `_shared/briefing.ts:927`. `${c.dateLabel} — here's what your calendar shows:` is exactly the kind of greeting `SYSTEM_PROMPT` forbids (and `quickQualityCheck` is deliberately skipped on the degraded path, line 1063). On a bad Anthropic day every user gets a noticeably-different briefing AND we have no quality signal for it. Either retire "here's what your calendar shows" or set `quality_grade = 'F'` on the degraded path so the trend dashboard sees the cliff.

**P1-B4.** UTF-8 segment math is character-based, not byte-based — `_shared/briefing.ts:970, 979`, `sms-briefing.ts:363`. `text.slice(0, bodyCap)` counts UTF-16 code units. Twilio drops from 160-char GSM-7 segments to 70-char UCS-2 segments the moment a single non-GSM-7 character appears (emoji, em dash —, curly quote ', accented letter). Claude routinely emits em dashes. A 600-char briefing in UCS-2 is 5–9 segments billed, not the assumed 4. Trial users with payment nudge attached can become 5+ segments. Fix: either strip non-GSM-7 chars before the slice, or compute true segment count via Twilio's algorithm and slice to fit 4 segments.

**P1-B5.** Hour-boundary race in morning-briefing fan-out — `supabase/functions/morning-briefing/index.ts:84-95`. The hourly cron fetches all eligible profiles, then loops calling `getLocalHour(tz)` per profile. If the cron starts at 5:59 UTC and processing exceeds 60s, profiles processed in the second minute see `getLocalHour === 7` and skip → user misses 6 AM window → audit backstop recovers at 9 AM CT but it's now 3 hours late. Capture `processStartUtc = new Date()` once at the top and pass into `getLocalHour(tz, processStartUtc)`. Or fan out with bounded `Promise.allSettled` concurrency.

**P1-B6.** Sole-parent prompt rule has no automated guardrail — `_shared/briefing.ts:641`. Prompt instruction "do not invent a partner" exists, but `quickQualityCheck` does not pattern-match for `/\b(your partner|the other parent|co-parent)\b/i` when context omits a partner section. A sole parent gets "your partner will pick up Jaxon" referring to nobody — only catchable by manual review. Add a `quickQualityCheck` rule.

### Calendar sync (4)

**P1-C1.** Apple Calendar ignores `visibility` entirely — `apps/web/src/lib/calendar/apple.ts:107-118, 121-144`. `parseICalEvent` doesn't read VEVENT CLASS (PUBLIC/PRIVATE/CONFIDENTIAL); `appleEventToKinEvent` never sets visibility. DB column defaults to `'default'`. Once P0-6 is fixed, Apple-side private events still leak. Add `vevent.getFirstPropertyValue("class")?.toLowerCase()` mapping.

**P1-C2.** Multi-calendar not supported by schema, but UI says "Connect another" — `supabase/migrations/009_calendar.sql:29`, `dashboard/calendars/page.tsx`. `calendar_connections UNIQUE(profile_id, provider)` means a parent with two Google accounts (personal + work — the exact dual-life calendar problem Kin targets) cannot add the second; upsert silently overwrites tokens. The "Connect another calendar" button promises capability the schema rejects. Drop the constraint and add `UNIQUE(profile_id, provider, google_calendar_id)`, or downgrade the button copy.

**P1-C3.** Refresh-token missing case is not handled in OAuth callback — `apps/web/src/app/api/calendar/google/callback/route.ts:74-89`. Google occasionally omits `refresh_token` on re-consent (Workspace-admin policies). Callback persists `refresh_token: undefined`, next refresh throws "No refresh token is set", which is NOT caught by `isRevokedTokenError`, so the connection lands in `sync_status = "error"` with no Reconnect CTA. Extend `isRevokedTokenError` to match or short-circuit the callback when no refresh_token AND no prior one exists.

**P1-C4.** Webhook returns 404 for unknown channels; should be 410 Gone — `apps/web/src/app/api/calendar/google/webhook/route.ts:43-53`. Google retries 4xx-except-410 indefinitely. After a disconnect/reconnect cycle leaves stale channels (the disconnect route doesn't call `stopGoogleWebhook`), Google keeps pinging us forever. Return 410 for unknown channels; separately, call `stopGoogleWebhook` on disconnect.

### Portal/Dashboard (3)

**P1-P1.** Settings timezone hint is misleading — `apps/web/src/app/(dashboard)/dashboard/settings/page.tsx:174-180, 311`. "Detected from your device — this sets when 6:00 AM lands." Actually pure display — never PATCHes `profiles.timezone`. Briefing uses the stored value, which was set during SMS onboarding. Either ship an "Update" button or change copy to "Detected from your device. We use the timezone you set up over text — reply with your city to change it."

**P1-P2.** `/api/stripe/portal` has no `NEXT_PUBLIC_APP_URL` fallback — silent failure on misconfigured environments. Mirror checkout's `process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin` pattern.

**P1-P3.** Phone number cannot be changed from dashboard or via SMS — `dashboard/settings/page.tsx:286-292`. Hint says "text Kin or reach out to support" but the inbound handler doesn't recognize a "change my number" intent. Phone IS the auth primary key; out-of-scope for beta to ship a flow, but document the manual process and add a `mailto:hello@kinai.family` link.

### Landing page (4)

**P1-L1.** BriefingDemo opens with "Good morning, Sarah" — contradicts the production voice — `apps/web/src/components/BriefingDemo.tsx:21`. `SYSTEM_PROMPT` (`_shared/briefing.ts:619`) explicitly forbids "Good morning" openings; `quickQualityCheck` flags it as a critical Slack alert. Demo and product speak with different voices. Rewrite the demo to open with substance.

**P1-L2.** WaitlistForm allows submission with 7+ digit phone — `apps/web/src/components/WaitlistForm.tsx:42`. Server rejects with a generic "Please enter a valid phone number." Bump client min to 10 digits or add inline help "10-digit US/Canada number".

**P1-L3.** WaitlistForm error auto-clears after 4s — `WaitlistForm.tsx:63`. A user who reads slowly loses error context. Clear on next interaction, not on timer.

**P1-L4.** Landing site has no `/about` or FAQ page; sitemap exposes only `/`, `/privacy`, `/terms`. Trust signal for a category-defining product is thin. Growth opportunity, not a beta blocker.

### Infrastructure (5)

**P1-I1.** Briefing system prompt duplicated across Deno + Node runtimes — `_shared/briefing.ts:619` vs `lib/sms-briefing.ts:102`. Drift test compares prompt strings; doesn't guard the surrounding pipeline. Move the prompt into `packages/shared` (or a cross-platform `.txt` asset).

**P1-I2.** Supabase project URL hardcoded in pg_cron migrations — `supabase/migrations/046_morning_briefing_cron.sql:30`, `058_subdaily_crons.sql:42,57,75`, `060_calendar_renewal_cron.sql:33`, `047_briefing_audit_cron.sql:30`. Staging/preview cannot apply these without SQL edits. Use `current_setting('app.settings.supabase_url', true)` or a Vault secret.

**P1-I3.** No security headers in `next.config.mjs`. No CSP, no HSTS override, no Permissions-Policy, no X-Frame-Options. Family-data product should ship explicit headers. Add a `headers()` function with `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

**P1-I4.** Sentry config has no `release` and no `tunnelRoute` — `apps/web/sentry.client.config.ts`, `next.config.mjs`. Ad-blockers block Sentry; family-product audience overlaps with privacy-extension users. Add `tunnelRoute: "/monitoring"` to `withSentryConfig`, and `release: process.env.VERCEL_GIT_COMMIT_SHA` to Sentry init.

**P1-I5.** Cleanup cron still has TODO: no email reminder before 90-day delete — `apps/web/src/app/api/cron/cleanup/route.ts:29-34`. `deletion_reminded = true` is flipped but the reminder email is unsent. Users get hard-deleted on day 90 with no warning. GDPR/CCPA promise gap. Either send via `@/lib/email` (Resend) or remove the column-flip until you can.

### Security (3)

**P1-Sec1.** Sentry has no PII scrubbing — `apps/web/sentry.client.config.ts`, `sentry.server.config.ts`. V3 P1-I2 stripped one specific leak (cleanup route), but the global config has no `beforeSend` hook. Every `Sentry.captureException(err)` (Stripe webhook, chat, invite, account-delete) forwards raw error objects that may include phone/email/household_ids. Add `beforeSend(event) { ... scrub event.request, event.user, event.extra ... }` to both configs.

**P1-Sec2.** `POST /api/invite` has no rate limit — `apps/web/src/app/api/invite/route.ts`. Authenticated user can spam partner-invite SMS to arbitrary phone numbers. Add a rate-limit route key (3 invites/user/day) and refuse recipients with `sms_opted_out_at` set on `waitlist` or `profiles`.

**P1-Sec3.** `POST /api/account/onboarding-complete`, `/api/stripe/checkout`, `/api/stripe/portal` lack rate limits. `welcome_sms_sent_at` latches the actual SMS but DB writes are unmetered; Stripe customer creation is unmetered. Add 5/min/user limits across all three.

### Edge cases (4)

**P1-E1.** `trial_ended` nudge query has no time window — `apps/web/src/app/api/cron/engagement-nudges/route.ts:355-363`. Query is `WHERE subscription_status = 'canceled' AND billing_exempt = false AND onboarding_completed = true` with no `canceled_at` filter. Latched by `nudges_sent->>'trial_ended'`, so first-time correct — but if the user goes `canceled → resubscribed → canceled` again, the second goodbye is silenced because the key is still set. Bigger issue: combined with P0-1, when trial-expiry-flip lands, this query immediately texts every existing-trial user on their first day of `canceled`. Add a `canceled_at` timestamp written by the Stripe webhook AND by the new trial-expiry job; only fire `trial_ended` for `canceled_at > now() - interval '3 days'`. Reset the nudges_sent key on resubscribe.

**P1-E2.** DELETE `/api/account` is API-only — no UI surface — `apps/web/src/app/api/account/route.ts`. Handler exists and is well-written, but no settings page exposes it and no SMS command (`DELETE ACCOUNT` etc.) triggers it. SMS-only users have no web access. GDPR/CCPA gap — users cannot exercise deletion rights in-product. Add a "Delete account" link in `dashboard/settings/page.tsx` with confirmation modal; for SMS-only users, accept `DELETE ACCOUNT` in the inbound webhook with a 24h confirmation reply.

**P1-E3.** Concurrent webhook + user-triggered sync has no locking — `apps/web/src/lib/calendar/sync.ts`. Google webhook fires while POST `/api/calendar/sync` is running → two `syncCalendarForConnection(conn.id)` paths in parallel; second one gets 410 on `syncToken` (already consumed by first), forces full resync, clobbers newer state. `sync_status` flips back to `idle` while the first is still working. Take an advisory lock on `connection_id` or use `UPDATE ... WHERE sync_status != 'syncing' RETURNING *`.

**P1-E4.** `extractPhone` in onboarding accepts non-+1 numbers — `apps/web/src/lib/sms-onboarding.ts:631-642`. `normalizePhone` in `sms-access.ts` strictly rejects non-US (`^\+1\d{10}$`), but the partner-invite extraction in `extractPhone` accepts 11–15 digit international numbers with a `+` prefix and hands them to `dispatchPartnerInvite` → Twilio. Inconsistent with the V3 P1-E3 +1-only enforcement. Reuse `normalizePhone` here.

---

## P2 — Polish (27)

### Code quality (3)
- **P2-Q1.** Same 2 TypeScript errors in `__tests__/chat-agentic-loop.test.ts:98,129` (`stop_details` not on `Message` type). Carried from V3 P2-Q1. Fix the mocks.
- **P2-Q2.** `as unknown as Promise<...>` casts at 8 sites in `sms/inbound/route.ts` and `sms-briefing.ts`. Replace with a typed `createClient<Database>` client so column renames are caught at build.
- **P2-Q3.** CI doesn't run `next build` — `.github/workflows/ci.yml` only lints + typechecks + tests. A server-component bug can land green. Add a build step.

### Auth & Access Control (3)
- **P2-A1.** Demo password `KinDemo2026!` hardcoded in client bundle — `(auth)/signin/page.tsx:66`. Intended for demo access, but ensure the demo account is fully siloed (no real Stripe customer, no household links, no Twilio sends).
- **P2-A2.** Account-delete order has implicit race — `api/account/route.ts:39-148`. Each delete awaited individually; a mid-route timeout leaves partial state. Wrap in a pg function or add a Sentry breadcrumb at each step.
- **P2-A3.** Email lookups against profiles aren't `.toLowerCase()`'d at all sites — invite-accept normalizes, others don't.

### SMS pipeline (3)
- **P2-S1.** STOP regex only matches exact-keyword body — `apps/web/src/app/api/sms/inbound/route.ts:167`. `^(STOP|...)$` rejects "STOP." or "stop please". Twilio's carrier-level catches some of this but the in-app stamp on `profiles.sms_opted_out_at` is missed. Match `^(STOP|...)\b` and trim trailing punctuation.
- **P2-S2.** Off-script onboarding interrupts amplify ~3× Claude calls per SMS — `sms-onboarding.ts:526-539`. The 10/hr rate limit on inbound SMS allows ~30+ Claude invocations per user per hour because each off-script turn fires multiple model calls. Either tighten the inbound limit during onboarding or count Claude calls (not SMS) toward the budget.
- **P2-S3.** Idempotency cache mis-pairs replies when two inbound messages arrive within the same second — `route.ts:254-263`. Pairing uses `direction='outbound' AND sent_at >= priorInbound.sent_at ORDER BY sent_at LIMIT 1`. Add a `replied_to_id` FK column on outbound rows.

### Briefing system (3)
- **P2-B1.** Hardcoded model strings (`claude-sonnet-4-6`, `claude-haiku-4-5-20251001`) in `_shared/briefing.ts`. Extract to env vars matching the web pattern.
- **P2-B2.** Travel-time Distance Matrix has no global daily quota guard. `MAX_TRAVEL_LEGS = 8` caps per-briefing but no per-day cap. `home_location` is also free-text from onboarding — Google geocodes whatever it's given. Add a per-day call counter in Redis; cap `home_location` length to 200 chars before sending.
- **P2-B3.** Briefing-audit at 14:00 UTC doesn't backstop Hawaii — HST 6 AM = 16:00 UTC, later than the audit. A Hawaii user whose 6 AM send fails has no recovery. Edge case; flag if Hawaii signups happen.

### Calendar sync (3)
- **P2-C1.** Conflict detection requires `is_shared` on both sides — `lib/calendar/conflicts.ts:39-51`. `googleEventToKinEvent` always sets `is_shared: false`. So time_overlap conflicts between two parents will literally never trigger from synced Google events. Only kid_conflict fires. Drop the `is_shared` requirement for parent-vs-parent overlap, or set `is_shared: true` on events with multiple household attendees.
- **P2-C2.** Token expiry comparison uses `<= new Date()` — `sync.ts:103-107`. Tokens expiring in <1s slip through, fail with 401 mid-sync, now flip to `needs_reconnect` even though refresh would have worked. Refresh proactively at `token_expires_at < now + 60s`.
- **P2-C3.** Initial-sync timeout flips status to `syncing` with no recovery UI — `callback/route.ts:131-143`. User stares at "Loading calendars…" for up to 6 hours until calendar-renewal cron picks up the `last_synced_at IS NULL` branch. Surface explicit "Initial sync in progress — refresh in a few minutes" when `sync_status === "syncing" AND last_synced_at === null`.

### Portal/Dashboard (1)
- **P2-P1.** Billing portal cancel doesn't surface in-app confirmation. Status badge updates via webhook eventually; no "we'll miss you" UX. Out of beta scope.

### Landing page (2)
- **P2-L1.** No `<noscript>` fallback / waitlist requires JS. Niche.
- **P2-L2.** `LAST_UPDATED = "April 1, 2026"` in privacy/terms. Fine (today is May 22, 2026); flag for review next time legal is revisited.

### Infrastructure (3)
- **P2-I1.** `.env.example:90` still hardcodes founder personal email as `ACTIVITY_ALERT_EMAIL=austin.ford1519@gmail.com`. Carried from V3 P2-I1. Change to placeholder.
- **P2-I2.** `Already sent to ... today, skipping` `console.log` per-profile-skip in production edge function — `morning-briefing/index.ts:105`. Fills function logs. Drop to debug.
- **P2-I3.** `cron-dispatch` error responses leak job names. Mitigated once P0-5 lands.

### Security (2)
- **P2-Sec1.** `dangerouslySetInnerHTML` for inline `<style>` blocks — `(auth)/signin/page.tsx:819`, `signup/page.tsx:419`. Static strings, not exploitable, but scanners flag. Move to CSS module.
- **P2-Sec2.** RLS denies-all-by-default tables (`sms_conversations`, `daily_questions`, `user_context_notes`) work today but should add lock-down policies preemptively if a user-facing history view ever ships. Defensive only.

### Edge cases (3)
- **P2-E1.** Empty briefing day fallback says "Open day" — confirmed copy intent.
- **P2-E2.** Multi-word `family_name` parsing assumes Western "First Last" — `_shared/briefing.ts:678-693`. Minor.
- **P2-E3.** Travel-time partial failures silently drop legs. Add a "travel times unavailable" hedge when ≥50% of legs failed.

---

## What's working well (positives carried forward, plus new ones)

### V3 fixes verified clean
- **P0-1 (briefing subscription gating)**: Both `morning-briefing/index.ts:54` and `briefing-audit/index.ts:47` now filter `subscription_status.in.(trial,active),billing_exempt.eq.true`. *(But see V4 P0-1 for the trial-expiry follow-on.)*
- **P0-2 (Anthropic timeout)**: 30s AbortController per attempt, 3 retries, 90s bounded worst case. `clearTimeout` in `finally`. AbortError treated as retryable.
- **P0-3 (600-char cap math)**: `TOTAL_SMS_CAP - PAYMENT_NUDGE.length - NUDGE_SEPARATOR.length` reserved only when nudge is appended. Trial nudge gated to days 14+ on trial only.
- **P0-4 (SMS inbound idempotency)**: Migration 062 partial unique index on `(direction='inbound', twilio_message_sid)`. Pre-insert lookup + 23505-conflict fallback. Both paths return cached reply. *(V4 surfaces a residual race window — see P1-S3 — but the base mechanism is sound.)*
- **P0-5 (STOP footer on waitlist)**: `WAITLIST_MESSAGE` and `APPROVED_MESSAGE` both carry "Reply STOP to opt out." Waitlist re-prompts in `waitlist-sms.ts` all carry the footer.
- **All 21 P1s landed correctly** — spot-verified: invite-accept rate limit, calendar reconnect CTA (`dashboard/calendars/page.tsx:401-426`), all-day-noon-UTC anchor, OAuth callback 30s timeout, theme toggle removed, custom-briefing-time placeholder removed, cleanup cron uses `isAuthorizedCron`, Sentry breadcrumb PII stripped from cleanup, ops-metrics rate limit, `+1`-only phone normalization at three entry points, formatTime takes timezone, partner-resolve Slack alerts, scorer null-streak alert, trial-ended one-shot nudge.

### Structural strengths (carried forward)
- **Auth trigger reliability** — `handle_new_user()` (migration 054) creates a profiles row on every auth signup with NULL-email tolerance, phone seeding, 14-day trial stamp, `SECURITY DEFINER + SET search_path = public`.
- **All three webhook signatures validated with constant-time compare**: Twilio (HMAC-SHA1 + sorted params + length-guarded `timingSafeEqual`), Stripe (SDK-native `constructEvent` + Slack-critical on failure), Google (channel-token HMAC + length-guarded `timingSafeEqual`).
- **TCPA keyword handlers** — STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT, HELP, INFO, START, UNSTOP all implemented. Opt-out stamped on both `profiles.sms_opted_out_at` and `waitlist.sms_opted_out_at`. Every automated outbound path filters the latch.
- **RLS enabled on every user-data table** with household-scoped policies. Service-role-only tables (`sms_approved_numbers`, `sms_waitlist`, `user_context_notes`) use `FOR ALL USING (false)`.
- **Service role isolation** — never exposed to `NEXT_PUBLIC_*`. Cron secret + admin secret independent.
- **Cron architecture clean**: Vercel cron for daily (cleanup, engagement-nudges?mode=trial); pg_cron via cron-dispatch for sub-daily. Hobby plan 2-cron limit respected. *(See V4 P0-5 for the cron-dispatch DoS issue.)*
- **Idempotent briefing dedup** on `(profile_id, briefing_date_in_user_local_tz)`.
- **9 AM CT briefing-audit backstop** catches users missed by the primary 6 AM run.
- **Plaintext fallback always sends something** — users never get silence even on Anthropic outage. *(See V4 P1-B3 for the greeting-violation issue.)*
- **Quality scorer (Haiku) running with two-layer checks** (regex `quickQualityCheck` + LLM judge), non-blocking, with sustained-outage alerting.
- **Lint clean**, **39/39 tests passing** (27 web + 12 shared). Only TS errors are the 2 carried test-mock lines.
- **Ops dashboard founder-locked** (with the missing-phone caveat in P1-A2) and now rate-limited.
- **Error boundaries** on every route group: branded `error.tsx`, `not-found.tsx`, RouteError component.
- **Pricing consistent** across landing, billing, and Stripe price IDs for the monthly plan. *(Annual not implemented — see V4 P0-3.)*
- **Legal pages substantive** — Privacy + Terms cover GDPR/CCPA, Google Calendar scopes, SMS consent, AI processing, household data.
- **No hardcoded secrets** in any source file. `.env.local` gitignored.
- **No raw SQL string interpolation** in app code. All queries through Supabase's parameterized PostgREST.

---

## Recommended pre-launch sequence

**Today (P0 sprint, ~4 hours):**
1. **P0-2 Sunday-checkin gate** (5 min — one-line `.or(...)`)
2. **P0-3 Annual pricing** — REMOVE annual toggle from Pricing.tsx (10 min) until backend ships
3. **P0-1 Trial expiry flip** (45 min — write the nightly UPDATE; can be in cron/engagement-nudges or a new pg_cron job)
4. **P0-7 Multi-day all-day events** (60 min — 5 query updates + test for 3-day event covering today)
5. **P0-5 cron-dispatch auth** (45 min — header + migration update for pg_cron callers)
6. **P0-4 Stripe webhook idempotency** (90 min — migration + table + insert-on-conflict + event-order check)
7. **P0-6 Test endpoint visibility leak** (15 min — option (a) quick patch; option (b) post-beta)

**This week (P1 sprint, ~2 days):**
- Rate-limit fail-closed in prod (P1-S5)
- Add `/ops` to middleware (P1-A1)
- Add Jontae's third phone (P1-A2 — 1 line)
- Briefing prompt drift consolidation (P1-B1, P1-I1)
- UTF-8 byte math (P1-B4)
- BriefingDemo voice update (P1-L1)
- Sentry PII scrubbing globally (P1-Sec1)
- Rate limits on invite/checkout/portal/onboarding-complete (P1-Sec2/3)
- Cleanup cron reminder email (P1-I5)
- Apple visibility (P1-C1)
- Multi-calendar schema decision (P1-C2)
- Stripe portal env fallback (P1-P2)
- Settings timezone copy (P1-P1)

**Post-launch (P2 polish, ongoing):**
- TS test-mock errors (P2-Q1)
- `as unknown as` cast cleanup (P2-Q2)
- CI `next build` step (P2-Q3)
- Conflict detection `is_shared` requirement (P2-C1)
- Token expiry race window (P2-C2)
- Travel-time daily quota (P2-B2)
- STOP regex word-boundary (P2-S1)

---

## Beta-launch readiness verdict

**GO with the seven P0 patches.** The system is meaningfully audited, the architecture is right, and the V3 fixes hold up. What V4 surfaces is the layer V3 didn't reach — pre-existing gaps that the louder V3 issues had been screening.

The most consequential one is **P0-1**: the V3 P0-1 fix (don't bill canceled users) is partially neutralized because **nothing transitions a trial-only user to canceled**. A user who never pays stays `trial` forever and keeps receiving briefings. This is a real cost-leak path even though the V3 fix itself is correct — it's the upstream transition that's missing.

The other six are tighter in scope: Sunday-checkin gating mirrors the morning-briefing fix in five lines, annual pricing is a one-line removal (toggle out of Pricing.tsx until backend ships), Stripe idempotency is a small migration + table, cron-dispatch auth is a header + 5 lines, the multi-day event window is 5 query updates, the test-endpoint visibility leak is a 10-line query patch.

Once those land, **B+ in practice** is well within reach for beta week 1; the P1 set then gets you back to A− as the early-paying-customer cohort comes in.

Ship it — after these seven.
