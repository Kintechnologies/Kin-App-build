# Kin Beta Readiness Audit v6

**Date:** 2026-05-22
**Branch:** main (HEAD `fcd3dff`)
**Auditor:** Claude (Opus 4.7, 1M context) — orchestrated 10-stream parallel audit
**Scope:** Full codebase + product surface — V6 fresh sweep after V5's 8 P0 + 47 P1 + 34 P2 fixes shipped in commits `6f3e146` → `fcd3dff`
**Production URL:** kinai.family
**Supabase ref:** `coxqdpcffmsncvisfyvj`
**Stack:** SMS + web (no mobile app; `apps/mobile/`, RevenueCat ignored). 73 migrations, all deployed. Vercel.

---

**Tests:** 52 passing (39 web + 13 shared) · `tsc --noEmit` clean (apps/web + packages/shared) · `next lint` clean · single `as unknown as Request` test-mock cast, no other unsafe coercions. CI runs lint + tsc + tests + `next build` end-to-end (`.github/workflows/ci.yml:50-57`).

---

## Overall Grade: **B+** (5 P0 fixes needed; substantial V5 follow-through; one TCPA P0 regression)

V5's three big commit clusters (`6f3e146` → `fcd3dff`) cleared the entire V5 P0+P1+P2 backlog in source — confirmed by independent verification across every carryover item below. Most of V5's improvements stuck cleanly: trial-flip query has a regression test pinning the query shape (`apps/web/src/__tests__/expire-unpaid-trials.test.ts`), Stripe webhook idempotency via `stripe_events(event_id PK)` short-circuits with the 23505 unique-violation check, `customer.subscription.updated` + `invoice.payment_succeeded` both handled, `needs_reconnect` CHECK constraint extended via migration 066 with the dashboard CTA actually rendering, onboarding completion properly awaited with retry UI, account-delete is now an atomic Postgres function (migration 070), all three admin phones are in the allowlist, `/ops` is in middleware, security headers (HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy) all shipped in `next.config.mjs`, rate limiter fail-closes in production, cleanup cron only stamps `deletion_reminded` after the email actually sends, all three webhook signatures (Stripe, Twilio, Google) use timing-safe compare, all 14 rate-limit route keys defined and invoked.

What needs to be fixed before beta launch — five P0 items:

1. **Apple multi-account silently overwrites** — migration 067 added a partial unique index for multi-account, but the Apple connect route still uses the old `onConflict: "profile_id,provider"` matcher, so the second account on a profile silently replaces the first. The product surface ships a feature the route handler doesn't honor.
2. **Concurrent calendar sync has no locking** — V5 P1-C4 was claimed addressed but `sync.ts:213-226` still writes per-calendar sync tokens in `google_sync_tokens` JSONB with no advisory lock or claim pattern. Webhook + cron syncs racing on the same connection clobber each other's cursors, forcing full re-fetches and losing events.
3. **Pickup-risk SMS bypasses TCPA opt-out** — `pickup-risk.ts:317-360` `dispatchAlerts()` calls `sendAlertSms()` without checking `sms_opted_out_at`. A user who texted STOP still receives proactive pickup-risk alerts. Direct TCPA violation on an outbound SMS path the V5 audit didn't enumerate.
4. **Billing page never queries `cancel_at_period_end`** — column exists (migration 065), webhook writes it (`webhook/route.ts:271`), but `dashboard/billing/page.tsx:201` `.select()` doesn't fetch it and `statusLine()` (lines 283-298) doesn't check it. A user who cancels in the Stripe portal sees "Active · billed monthly" for up to 30 days. Generates support tickets and shipping risk on a paying-customer surface.
5. **Slack alerts leak `family_name` PII** — `briefing.ts:1200, 1237, 1313`, `briefing-audit/index.ts:189` log family names directly into Slack alert messages. If the Slack webhook URL leaks or the channel is broader than intended, an attacker can enumerate paying families plus their failure modes. Replace family-name strings with `profile.id` UUIDs in Slack payloads; keep names only in Supabase console logs.

Beyond these, **31 new P1s and ~30 new P2s** surfaced — biggest clusters are the nudge-frequency cap missing across SMS types (a trial user on day 7 starting onboarding late can receive 2-3 SMS the same day), missing account-deletion UI in settings (legal docs route to email, but the GDPR/CCPA self-serve gap remains), missing OG image (social-card preview is blank), open-redirect on the Google OAuth callback's SMS path, and missing email persistence on the Google OAuth callback (multi-account dashboard rows are indistinguishable).

Ship after the five P0 fixes plus the highest-impact P1 cluster (~3-4 hours of focused work).

---

## Top-line summary

| Layer | Grade | P0 | P1 | P2 |
|---|---|---|---|---|
| Authentication & Account | B+ | 0 | 4 | 4 |
| Billing & Subscription | A | 0 | 1 | 3 |
| Calendar | B− | 2 | 3 | 4 |
| SMS Pipeline | A− | 0 | 2 | 4 |
| Morning Briefing | B | 1 | 3 | 3 |
| Dashboard & Settings | B+ | 1 | 1 | 6 |
| Landing & Marketing | A | 0 | 3 | 4 |
| Infrastructure & Security | A− | 0 | 5 | 2 |
| Engagement & Nudges | B+ | 1 | 6 | 5 |
| Code Quality (TS, lint, tests) | A | 0 | 0 | 0 |
| **Total** | **B+** | **5** | **28** | **35** |

---

## P0 — Launch Blockers (5)

### P0-1. Apple multi-account silently overwrites — migration 067's multi-account index bypassed
**File:** `apps/web/src/app/api/calendar/apple/connect/route.ts:53`

Migration 067 added partial unique indices for Apple (`WHERE provider = 'apple'`) and Google (`WHERE provider = 'google'`, keyed on `google_calendar_id`) explicitly to support multiple connections per profile. The Apple connect route still uses the legacy `onConflict: "profile_id,provider"` matcher. Result: a parent with personal + work Apple Calendar accounts gets the second connect call silently overwrite the first — no error, no warning, second account simply replaces first in the row.

Feature advertised, migration shipped, route handler never updated. Apple-side disconnect route has the same matcher (P1-CAL-4 below).

**Fix:** Replace `onConflict: "profile_id,provider"` with a matcher that targets migration 067's partial unique index, or remove `onConflict` and let the index enforce uniqueness with explicit conflict-handling. ~5 lines.

---

### P0-2. Concurrent calendar sync has no locking — per-calendar sync tokens race-overwritten
**Files:** `apps/web/src/lib/calendar/sync.ts:213-226, 283`

V5 P1-C4 was supposed to address this; migration 067 made it worse by moving Google sync tokens into a `google_sync_tokens` JSONB column (one token per secondary calendar). Writes happen as plain UPDATEs with no advisory lock or transaction boundary. A Google push-webhook arrival + a cron-renewal sync running on the same connection concurrently interleave: webhook reads token A, sync starts; cron reads token A, sync starts; whichever finishes second writes its `nextSyncToken` over the first's, and the next sync starts from a stale cursor — missing events OR forced full resync. With multi-calendar JSONB, a partial write loses tokens for multiple calendars at once.

**Fix:** Wrap the per-connection token-update path in `pg_advisory_xact_lock(connection_id_hash)`, OR the claim pattern `UPDATE calendar_connections SET sync_status='syncing' WHERE id=$1 AND sync_status != 'syncing' RETURNING *` — only the row claimer proceeds to consume the cursor; concurrent caller sees no claim and bails. ~20 lines.

---

### P0-3. Pickup-risk SMS bypasses TCPA opt-out latch
**File:** `apps/web/src/lib/pickup-risk.ts:317-360`

`dispatchAlerts()` calls `sendAlertSms(supabase, parent, body)` (line 358) with no check for `sms_opted_out_at` on the parent profile. Every other outbound SMS path (briefing fan-out, sunday-checkin, engagement-nudges, partner-invite, welcome) gates on the opt-out latch — pickup-risk is the lone holdout.

A user who texts STOP on their profile, opts out of all marketing communications, can still receive a proactive pickup-risk alert at 3:47 PM. Textbook TCPA violation — the regulator's first question on any complaint is "did the carrier ignore an opt-out?" and on this path the answer is yes.

**Fix:** Before `sendAlertSms`, query `profiles.sms_opted_out_at` for the parent; skip the SMS if non-null (still update the in-product feed). ~10 lines.

---

### P0-4. Billing page never displays `cancel_at_period_end` — portal cancellations invisible
**File:** `apps/web/src/app/(dashboard)/dashboard/billing/page.tsx:18-23, 201, 283-298`

Migration 065 added `cancel_at_period_end BOOLEAN NOT NULL DEFAULT false` to `profiles`. The Stripe webhook handler writes it on `customer.subscription.updated` (`apps/web/src/app/api/stripe/webhook/route.ts:271`). The billing page never reads it: the `Profile` interface (lines 18-23) doesn't declare it, the `.select()` (line 201) doesn't fetch it, `statusLine()` (lines 283-298) doesn't check it.

A user who cancels in the Stripe portal sees `Active · billed monthly` until the period ends (up to 30 days), with no in-product indication their cancellation is queued. Drives support tickets, undermines trust ("I cancelled and Kin is still charging me / still texting me"), and creates a clean "feature claim vs reality" gap on a paying-customer surface that beta families will look at first thing after onboarding.

**Fix:**
1. Add `cancel_at_period_end?: boolean | null` to the Profile interface.
2. Include it in `.select()`.
3. In `statusLine()`, when `subscription_status === "active" && cancel_at_period_end`, return `"Active · cancels on <formatted date> · billed until then"` (date from `subscription_current_period_end` if present, or from a Stripe-derived field).

~10 lines total.

---

### P0-5. Slack alerts leak `family_name` PII — paying-family enumeration on webhook leak
**Files:** `supabase/functions/_shared/briefing.ts:1200, 1237, 1313`, `supabase/functions/briefing-audit/index.ts:168, 189`

Every quality-failure and retry-exhausted Slack alert in the briefing pipeline includes the full `family_name` directly in the message body:
- briefing.ts:1200 — `Briefing failed quick quality guard for ${profile.family_name}...`
- briefing.ts:1237 — `Briefing scored ${score.grade} for ${profile.family_name}...`
- briefing.ts:1313 — `Briefing failed all retries for ${profile.family_name}...`
- briefing-audit/index.ts:189 — `${missedNames.join(", ")}` over an array of family names.

Slack webhooks are routinely leaked via: forked Slack channels with broader membership than intended, third-party Slack integrations that scrape channel history, accidental public-channel posts, screenshots in support tickets, and webhook-URL exfiltration via env var dumps. Anyone who sees these alerts can enumerate paying families plus their failure modes — that's PII tied to subscription status, exactly the joinable pair the regulator cares about.

**Fix:** Replace `${profile.family_name}` with `profile.id` (or `profile.id.slice(0, 8)`) in every Slack payload from these files. Keep family names in Supabase function console logs (internal-only). ~10 string edits + a unit test that greps the alert bodies for any non-UUID-shaped substring.

---

## P1 — Should Fix Before Beta Week 1 (28)

### Authentication & Account (4)

**P1-A1. No account-deletion UI in settings.** `apps/web/src/app/(dashboard)/dashboard/settings/page.tsx` exposes phone, briefing time, timezone, sign-out — but no delete-account button. The `/api/account` route handler exists and migration 070's `delete_user_account(uid)` does atomic deletion correctly. V5 P0-7 updated legal docs to point at `mailto:hello@kinai.family?subject=Delete%20my%20account` with a 30-day SLA, so we're not legally exposed, but the in-product GDPR/CCPA "right to deletion" promise is gated behind email round-trips. **Fix:** add a Danger Zone section to settings (confirmation modal → POST `/api/account` → sign-out → redirect to landing). ~50 lines.

**P1-A2. Email enumeration on invite accept.** `apps/web/src/app/api/invite/[code]/accept/route.ts:74` returns `"This invite was not sent to your email address"` when `user.email?.toLowerCase() !== invite.invitee_email.toLowerCase()`. An attacker with a known invite code can sign in as any email and probe which one the invite was originally sent to. **Fix:** return generic `"Invite not found"` or `"You cannot accept this invite"` regardless of reason.

**P1-A3. Calendar-connect-token TOCTOU in SMS flow.** `apps/web/src/app/api/calendar/google/callback/route.ts:48-58` reads the profile by `calendar_connect_token` and deletes the token at line 168 — between those two, a second request with the same token races through and creates duplicate `calendar_connections` rows under different OAuth sessions. The lookup also has no rate limit. **Fix:** atomic `UPDATE profiles SET calendar_connect_token = NULL WHERE calendar_connect_token = $1 RETURNING id` (claim pattern), and add per-token rate limit.

**P1-A4. Open redirect in Google OAuth callback (SMS path).** `apps/web/src/app/api/calendar/google/callback/route.ts:31-33` builds `errorRedirect` from an `smsToken` read out of OAuth `state`. An attacker crafting `state="sms:../../evil.com"` ends up at `${appUrl}/connect/../../evil.com?error=...` — the path is not validated for traversal. **Fix:** validate `smsToken` matches `^[a-zA-Z0-9_-]+$` and reject anything containing `..` or `/`.

### Billing & Subscription (1)

**P1-B1. `setStatus()` has no email-based fallback for `invoice.payment_failed` events missing customer ID.** `apps/web/src/app/api/stripe/webhook/route.ts:75-98` resolves by `userId` then `customerId`, then Sentry-logs and no-ops. Rare in practice but a `payment_failed` event lacking both leaves a paying customer marked `trial`. **Fix:** third email-based fallback (fetch invoice → `invoice.customer_email` → `profiles.email` lookup); stamp `stripe_customer_id` when found. (P0-4 above covers the UI side of the missing `cancel_at_period_end` display.)

### Calendar (3 P1 + 2 P0 above)

**P1-C1. Multi-account dashboard rows indistinguishable — no email persisted on Google OAuth callback.** `apps/web/src/app/api/calendar/sync/route.ts:49-54` GET returns sync_status but no account email; `apps/web/src/app/(dashboard)/dashboard/calendars/page.tsx:392` renders `conn.email ?? fallback` against an always-null field. Two Google accounts on the same profile look identical — accidentally disconnecting the wrong one is likely. **Fix:** in the Google OAuth callback, after token exchange call `https://www.googleapis.com/oauth2/v1/userinfo` to fetch the account email; persist as `google_account_email`; include in `/api/calendar/sync` response.

**P1-C2. Distance Matrix quota errors silently degrade.** `supabase/functions/_shared/briefing.ts:461-500` returns `null` on any error from the travel-time fetch — quota exhaustion (HTTP 403/429) is treated identically to a 5s timeout. Users expecting drive times see none; founders see no Sentry alert. **Fix:** distinguish 403/429 from network timeouts; Sentry-capture quota exhaustion specifically; degrade silently only on transient network errors.

**P1-C3. Sync-token persistence accepts empty values.** `apps/web/src/lib/calendar/sync.ts:217-226` (Google) and `sync.ts:283` (Apple) blindly write whatever the API returned for `nextSyncToken`/`etag`. An empty/missing token silently overwrites the prior good one → next sync starts from scratch (full re-fetch, potential duplicate events). **Fix:** guard `if (result.nextSyncToken)` before update.

**P1-C4. Apple disconnect uses the same legacy `onConflict` matcher as the P0-1 connect path.** Same fix; one-line.

### SMS Pipeline (2)

**P1-S1. Partner-invite creation has a benign race that mints two codes.** `apps/web/src/lib/partner-invite.ts:50-86` checks for existing pending invites via `.order("created_at", { ascending: false }).limit(1)`; two simultaneous onboarding steps both see no pending row and both insert fresh codes. The user receives two conflicting SMS, only one works (first accept wins). Cosmetic — the atomic accept (V5 P1-S7) prevents cross-contamination — but still confusing. **Fix:** unique index on `(inviter_profile_id, invitee_phone) WHERE accepted = false` to serialize on phone-plus-pending status.

**P1-S2. Partner-invite SMS doesn't normalize phone before opt-out check.** `apps/web/src/lib/partner-invite.ts:124-133` checks `sms_opted_out_at` against the raw `partnerPhone` from input. If caller passes `(123) 456-7890` and DB has `+11234567890`, the lookup misses the opt-out and we text someone who opted out. **Fix:** `normalizePhone(partnerPhone)` before the opt-out lookup. (Note: V5 P1-S3 fixed `extractPhone` to use `normalizePhone`, but this lookup path was missed.)

### Morning Briefing (3 P1 + 1 P0 above)

**P1-M1. Anthropic model pins lack version date suffix on the writer.** `_shared/briefing.ts:931` uses `"claude-sonnet-4-6"` with no date; `_shared/briefing-quality.ts:30` uses `"claude-haiku-4-5-20251001"` correctly. Inconsistent — when Anthropic deprecates a base alias, the writer breaks silently. **Fix:** pin both with explicit date suffixes.

**P1-M2. Quality scorer has no timeout — can stall briefing pipeline.** `_shared/briefing-quality.ts:260-314` `callJudge()` `fetch()` has no `AbortController`. The writer (`briefing.ts:933`) has an explicit 30s abort; scorer doesn't. A stalled Anthropic connection on the scorer path delays SMS delivery (scoring is parallel to send, but a hang can block other work). **Fix:** mirror the 30s `AbortController` from the writer; 15-20s is fine for the scorer since it's a faster model.

**P1-M3. Coordination-issues limit of 8 may silently truncate real conflicts.** `_shared/briefing.ts:783` `.limit(8)` — a household with 9+ open issues touching today loses the 9th from the LLM context. Unlikely steady-state but possible on a chaotic week. **Fix:** raise to 20 or log a Sentry warning when the limit is hit.

### Dashboard & Settings (1)

**P1-D1. Family page phone input missing `<label>`.** `apps/web/src/app/(dashboard)/dashboard/family/page.tsx:442-462` has `placeholder="(555) 123-4567"` but no `<label htmlFor>` — placeholder isn't a label substitute (WCAG 2.1 failure). **Fix:** `<label htmlFor="phone-invite">Phone number</label>` + `id="phone-invite"` on the input. ~3 lines.

### Landing & Marketing (3)

**P1-L1. Missing OG image meta tag — social shares preview blank.** `apps/web/src/app/page.tsx:18-32` metadata declares `openGraph` and `twitter` but no `image` field. Shares on Slack/Twitter/LinkedIn render without a branded card. **Fix:** add `image: { url: "https://kinai.family/og-image.png", width: 1200, height: 630 }` to openGraph; create the asset. The sitemap was just added (commit `706f040`) — OG image is the matching pair.

**P1-L2. Phone-input error color (`var(--clay)` = #AC6A45) hard to spot on warm bg.** `apps/web/src/components/WaitlistForm.tsx:200-211`. Small 12.5px text, no icon, no border highlight on the input itself. **Fix:** add a red left border or background tint to the phone input when `state === "error"` for immediate visual feedback.

**P1-L3. BriefingDemo shows "Today 7:03 AM" without a "Demo" label.** `apps/web/src/components/BriefingDemo.tsx:26-27`. Users scanning fast may assume Kin is already sending them briefings, or that this is a real user's inbox screenshot. **Fix:** add an "(Example)" label to the section eyebrow or phone header.

### Infrastructure & Security (5)

**P1-I1. Missing Content-Security-Policy header.** `apps/web/next.config.mjs:7-20` ships HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, X-Content-Type-Options — but no CSP. No protection against inline-script XSS, external script injection, or third-party iframe exploit. **Fix:** add CSP with `default-src 'self'` + allowlist for the Sentry tunnel (`/monitoring`), Supabase, Stripe, Anthropic, Twilio (if direct browser calls), Vercel Analytics. Start with `report-only` for a week, then enforce.

**P1-I2. `ADMIN_PHONES` hardcoded in two places.** `supabase/functions/morning-briefing/index.ts:56` and `apps/web/src/app/api/ops/metrics/route.ts:26` both inline the three founder phone numbers. Adding/rotating an admin requires a code deploy. **Fix:** move to env var (`ADMIN_PHONES="+1...,+1...,+1..."`) and parse at startup; document in `.env.example`.

**P1-I3. `CRON_SECRET` is shared across three trust boundaries.** `.env.example:60-64` documents one secret for Vercel cron routes, `cron-dispatch` edge function, AND `/api/test/*` developer test endpoints. Commit `6330150` rightly split `ADMIN_SECRET` out; `CRON_SECRET` still pools three roles. A leak from any path compromises all three. **Fix:** introduce `TEST_SECRET` for `/api/test/*` to limit blast radius (it's the lowest-privileged of the three).

**P1-I4. Sentry has no `tracesSampleRate` or explicit error budget — high-volume days drop silently.** `apps/web/next.config.mjs:35-46`. On a Twilio or Anthropic outage day, error volume can spike 100x. Beyond the Sentry quota, events are dropped without alert. **Fix:** set `tracesSampleRate: 0.1` (or lower) for performance traces; configure Sentry's quota-alert email; add a Slack alert when daily event count exceeds a threshold.

**P1-I5. Engagement-nudges cron returns HTTP 200 even when sends fail — Vercel Cron never retries.** `apps/web/src/app/api/cron/engagement-nudges/route.ts:515-530`. Slack-notifies on failure but the HTTP response is `{ ok: true }` 200. Vercel Cron treats 200 as success and doesn't retry. A 30-minute Twilio outage at 8 AM CT loses every onboarding nudge for that window with no retry. **Fix:** return 500 when `results.failed > 0`, or implement exponential backoff inside the route.

### Engagement & Nudges (6, including 1 P0 escalated above)

**P1-E1. No max-per-day frequency cap across nudge types.** `apps/web/src/app/api/cron/engagement-nudges/route.ts` uses per-key idempotency (`nudges_sent[key]`) but no cross-type cap. A trial user on day 7 who starts onboarding late can receive: `onboarding_calendar` + `onboarding_silent` + `trial_day7` in the same day. Three engagement SMS in 12 hours feels like spam and quietly raises STOP-rate. **Fix:** add `nudges_sent_today_at` timestamp or rolling-24h counter; cap at 1 nudge/24h across all types (preserving the existing per-key idempotency for re-send prevention).

**P1-E2. Cleanup cron can orphan `auth.users` on profile-delete failure.** `apps/web/src/app/api/cron/cleanup/route.ts:76-95` deletes from `profiles` then calls `supabase.auth.admin.deleteUser(user.id)`. If the profile DELETE fails (RLS, FK constraint, transient), the auth user is still deleted → user has no recovery path. **Fix:** verify profile DELETE succeeded before deleting auth user, OR invoke the migration 070 `delete_user_account()` Postgres function (which is already atomic and handles both halves). ~10 lines.

**P1-E3. Calendar-renewal cron has no failure-rate alerting.** `apps/web/src/app/api/cron/calendar-renewal/route.ts:167-187` logs to Sentry per connection but doesn't aggregate. If all connections fail (API key revoked, network outage), cron returns 200 with zeros in success fields and no alert. **Fix:** Slack-alert when `resynced == 0 && attempted > 0` or when the failure rate exceeds 50%.

**P1-E4. Pickup-risk lead window vs. cron cadence has staleness assumption.** `apps/web/src/lib/pickup-risk.ts:208-221` SMS fires when `minutesUntil` is between 15-45 min; cron runs every 30 min. If calendar data is 6+ hours stale (the fallback sync threshold), the detection runs on outdated event times. **Fix:** when staleness exceeds a threshold, skip pickup-risk for that connection; surface a calendar-sync warning instead.

**P1-E5. Calendar-renewal cron not registered in `vercel.json` — single point of failure on pg_cron.** `apps/web/vercel.json` lists `cleanup` and `engagement-nudges?mode=trial` but not `calendar-renewal`. The renewal runs via pg_cron in migration 059 only. If pg_cron migration fails on a new environment (or someone disables the job from Supabase Studio), Google calendar push channels expire after 7 days → briefing silently degrades to stale data. **Fix:** add `calendar-renewal` to `vercel.json` as a daily safety net, OR add an ops dashboard check that the pg_cron job exists and is enabled.

**P1-E6. Sunday check-in has no explicit daytime guard.** `apps/web/src/app/api/cron/sunday-checkin/route.ts:123` checks `hour !== 14` in user timezone — fine since 2 PM is always reasonable — but missing the `isDaytime()` defense that other crons have. **Fix:** add for consistency, OR document why it's not needed.

---

## P2 — Polish (35)

### Authentication & Account (4)

- **P2-A1.** No CSRF tokens on POST endpoints — `/api/invite`, `/api/stripe/*`, `/api/account/onboarding-complete` rely on SameSite=Lax cookies. Add an origin-match check defensively.
- **P2-A2.** Stripe `resolveDiscount()` coupon-validity timing oracle — Stripe `promotionCodes.list()` vs `coupons.retrieve()` have different latency profiles. Rate-limited (3/min/user) so blast radius is small.
- **P2-A3.** `/api/account/onboarding-complete` is fire-and-forget on welcome-SMS dispatch failure. Surface a "welcome SMS failed" message on `/onboarding/done` rather than always rendering "All set."
- **P2-A4.** Document `sms_conversations` as service-role-only in a code comment so a future engineer doesn't add a permissive policy alongside migration 073's explicit deny.

### Billing & Subscription (3)

- **P2-B1.** Same timing oracle (`resolveDiscount`) — duplicate of P2-A2.
- **P2-B2.** No idempotency key on `stripe.customers.create()` at `apps/web/src/app/api/stripe/checkout/route.ts:107`. Add `{ idempotencyKey: \`customer_${user.id}\` }` to prevent duplicate-customer creation on crash-retry.
- **P2-B3.** No integration test for `stripe_events` replay short-circuit. Add a test that posts the same event_id twice and asserts the side-effect fired exactly once.

### Calendar (4)

- **P2-C1.** Calendar-renewal cron retries expiring channels indefinitely without flipping `sync_status` to `needs_reconnect` on persistent failure. `apps/web/src/app/api/cron/calendar-renewal/route.ts:156-165`.
- **P2-C2.** Apple CalDAV URL not validated at connect time — bad URLs only surface during first sync.
- **P2-C3.** Recurring-event exceptions not handled — `singleEvents=true` flattening + upsert on `external_id` clobbers modified instances.
- **P2-C4.** `calendarStalenessNote()` (`_shared/briefing.ts:603-622`) doesn't name which connection failed — user sees "A connected calendar is failing" without knowing if it's Google or Apple.

### SMS Pipeline (4)

- **P2-S1.** Partner-invite email backfill (`apps/web/src/lib/partner-invite.ts:77-80`) accepts any string without re-parsing. Low risk — SMS is primary.
- **P2-S2.** HELP/INFO reply fires before the rate-limit check. Carrier rules require HELP to always reply; Twilio absorbs the cost.
- **P2-S3.** Conversation history limit `SMS_HISTORY_LIMIT = 20` (`inbound/route.ts:64`) may truncate multi-day threads. Long-term knowledge persists in `household_context`.
- **P2-S4.** `formatTime()` falls back to en-US locale when timezone missing (`inbound/route.ts:68-74`). 12h format for international users.

### Morning Briefing (3)

- **P2-M1.** `notifySlack` truncates to 600 chars without an ellipsis marker (`_shared/briefing.ts:272`) — alerts can cut mid-sentence.
- **P2-M2.** `resolveFamilyNaming()` (`_shared/briefing.ts:700-702`) only splits 2-token names; 3+ token family_name without `last_name` falls back to "you and the kids" without a comment explaining why.
- **P2-M3.** Briefing-audit force-send path could double-defend on subscription_status (currently gated at query, which is sufficient — leaving as a nice-to-have).

### Dashboard & Settings (6)

- **P2-D1.** Billing `statusLine()` copies lack cancel-date context until P0-4 lands; once it does, surface renewal dates too.
- **P2-D2.** Dashboard layout untested on phone — `@media (max-width: 900px)` is there but no responsive QA done.
- **P2-D3.** Family page invite form: error message doesn't auto-dismiss; form doesn't disable input during save (button is disabled).
- **P2-D4.** Calendars disconnect uses inline confirm rather than a `<dialog>`. Acceptable but `<dialog>` is more accessible.
- **P2-D5.** Billing-page checkout-error display doesn't scroll into view if the user is off-viewport.
- **P2-D6.** Settings missing semantic landmark on the main `<section>` elements (page-level `<main>` exists in layout).

### Landing & Marketing (4)

- **P2-L1.** Privacy/Terms governing-law state unspecified — Terms says "the laws of the state where {COMPANY} is registered" without naming. Specify Delaware (or actual state of incorporation).
- **P2-L2.** Hero radial-gradient ambient wash uses fixed `760px × 520px` (`Hero.tsx:19-30`); on phones it renders off-screen. Use `clamp(300px, 100vw, 760px)`.
- **P2-L3.** Auth pages hardcode demo credentials (`signin/page.tsx:65-66`). Intentional but unusual; flag for awareness.
- **P2-L4.** Pricing CTA uses `<a href="#waitlist">` (`Pricing.tsx:208-238`) — replace with `<button onClick={scrollTo}>` for snappier mobile UX.

### Infrastructure & Security (2)

- **P2-I1.** Chat `/api/route.ts` wires Claude `web_search` tool — system prompt scopes responses to family coordination, but audit whether `web_search` results ever render as HTML in chat UI.
- **P2-I2.** `cron-dispatch` URL hardcoded in pg_cron migrations (`058_subdaily_crons.sql:40-44, 58-62, 74-78`) — if Supabase project gets relinked, pg_cron POSTs to a dead URL silently. Use a vault reference or env-substituted value.

### Engagement & Nudges (5)

- **P2-E1.** Engagement-nudges `?mode=xyz` not strictly validated — unknown mode silently falls back to "all". Add strict enum.
- **P2-E2.** Sunday-checkin `parseInt(hourStr, 10) % 24` is always 0-23 (redundant modulo).
- **P2-E3.** Engagement-nudges timezone fallback `"America/Los_Angeles"` for unknown zones — India users get 8 AM PT instead of local time. Default to UTC or require timezone on profile.
- **P2-E4.** Cron-dispatch hardcoded Supabase URL (also flagged as P2-I2).
- **P2-E5.** Cleanup cron Sentry breadcrumbs log send count without per-user IDs — fine for privacy, hard to debug a stuck user.

---

## V5 Carryover Status — full landed/not-landed table

All items from V5 audit verified individually below. **Bold** = NOT FIXED or PARTIAL.

### Auth & Access Control
- P0-5 (`needs_reconnect` CHECK) — LANDED via migration 066; CTA renders at `calendars/page.tsx:408-426`.
- P0-6 (onboarding completion fire-and-forget) — LANDED. `onboarding/done/page.tsx:24-49` awaits and shows retry UI.
- P0-7 (`/dashboard/account` 404 in legal docs) — LANDED for docs; **account-deletion UI in settings remains missing** (now P1-A1).
- P0-8 (test endpoint admin-phone allowlist) — LANDED. `morning-briefing/index.ts:50-65, 98-113, 185-201`.
- P1-A1 (`/ops` in middleware) — LANDED. `middleware.ts:8`.
- P1-A2 (third admin phone) — LANDED. `/api/ops/metrics/route.ts:26`.
- P1-A3 (Stripe path open-redirect) — LANDED. Checkout:65, portal:23 reject `//`.
- P1-A4 (handle_new_user phone collision) — LANDED via migration 069.
- P1-A5 (atomic account-delete) — LANDED via migration 070 + RPC at `account/route.ts:29`.

### Billing
- P0-1 (trial-flip query) — LANDED + pinned by `expire-unpaid-trials.test.ts`.
- P0-3 (Stripe idempotency) — LANDED via migration 065 + 23505 short-circuit at `webhook/route.ts:181-201`.
- P0-4 (`subscription.updated` + `invoice.payment_succeeded`) — LANDED at `webhook/route.ts:228-289`.
- P1-P1 (rate limit on Stripe routes) — LANDED. `rate-limit.ts:32-37` defines `stripe-checkout` (5/min), `stripe-portal` (5/min).
- P1-P2 (portal URL fallback) — LANDED.
- P1-P3 (email-based setStatus fallback) — **NOT FIXED**. Carried as P1-B1.

### Calendar
- P1-C1 (Apple CLASS:PRIVATE) — LANDED. `apple.ts:112-119`, briefing strip at `briefing.ts:804-814`.
- P1-C2 (Google disconnect + webhook 410) — LANDED. `google/route.ts:59-66`, `webhook/route.ts:55`.
- P1-C3 (OAuth callback refresh_token) — LANDED. `callback/route.ts:83-84`, `google.ts:60-65`.
- **P1-C4 (concurrent sync locking) — NOT FIXED**, re-opened as **P0-2**.
- P1-C5 (Apple deletion sweep) — LANDED. `sync.ts:285-309`.
- P1-C6 (Google secondary calendars) — LANDED. `sync.ts:134`.

### SMS Pipeline
- P1-S1 (formatTime threads timezone) — LANDED. `inbound/route.ts:68-74, 650`.
- P1-S2 (STOP/HELP/INFO/START after MessageSid) — LANDED. `inbound/route.ts:186-235, 239-364, 376-397`.
- P1-S3 (extractPhone uses normalizePhone) — LANDED. `sms-onboarding.ts:39, 282`.
- P1-S4 (admin SMS-approve honors opt-out) — LANDED. `admin/sms/approve/route.ts:74-89`.
- P1-S5 (analyzeConversationForContext in waitUntil) — LANDED. `inbound/route.ts:757-765`.
- P1-S6 (invite GET no PII echo + rate limit) — LANDED. `invite/[code]/route.ts:31-36, 113-118`.
- P1-S7 (invite-accept atomic) — LANDED. `invite/[code]/accept/route.ts:107-126`.

### Briefing
- P0-2 (x-cron-secret on edge functions) — LANDED. `morning-briefing/index.ts:227-245`, `briefing-audit/index.ts:44-57`, migration 064.
- P1-B1 (pickup-risk + coordination_issues in briefing) — LANDED. `_shared/briefing.ts:768-783, 882-904`.
- P1-B2 (plaintext opener + quality_grade) — LANDED. `briefing.ts:999-1008, 1213-1214, 1252`.
- P1-B3 (UTF-8 segment math) — LANDED. `toGsm7Safe()` at `briefing.ts:1041-1075`.
- P1-B4 (hour-boundary race) — LANDED. `processStartUtc` pinned at `morning-briefing/index.ts:312-327`.
- P1-B5 (sole-parent guard) — LANDED. `briefing-quality.ts:185-205`.

### Dashboard
- P1-D1 (timezone hint copy) — LANDED. `settings/page.tsx:328`.
- P1-D2 (phone-change mailto) — LANDED. `settings/page.tsx:294-303`.
- P1-D3 (Sentry capture in error boundaries) — LANDED. `RouteError.tsx:22-24`, `global-error.tsx:13-16`.

### Landing & Legal
- P1-L1 (BriefingDemo opener) — LANDED. `BriefingDemo.tsx:23` opens with substance.
- P1-L2 (waitlist 10-digit gate) — LANDED. `WaitlistForm.tsx:42`.
- P1-L3 (error clear on keystroke) — LANDED. `WaitlistForm.tsx:68-71`.
- P1-L4 (Terms "monthly or annual") — LANDED. Terms now says "monthly only during beta".
- P1-L5 (Privacy lists Slack + Resend) — LANDED. `privacy/page.tsx:158-167` lists all 8 processors.

### Infrastructure
- P1-I1 (security headers) — LANDED for HSTS/X-Frame/Permissions/Referrer/X-Content-Type; **CSP still missing** (now P1-I1 new).
- P1-I2 (cleanup cron deletion_reminded) — LANDED. Two-phase: email first at `cleanup/route.ts:40-46`, then flip at lines 50-54.
- P1-I3 (rate limiter fail-closed in prod) — LANDED. `rate-limit.ts:175-188`.
- P1-I4 (rate limits on invite/onboarding/Stripe routes) — LANDED. All 14 keys defined at `rate-limit.ts:32-37`.
- P1-Q3 (CI `next build`) — LANDED. `.github/workflows/ci.yml:50-57`.

### Code Quality
- P1-Q1 (root `npm test` workflow) — LANDED. `package.json:12` uses `npm run test -w @kin/shared && npm run test -w @kin/web`.
- P1-Q2 (regression tests for V4 P0 fixes) — LANDED. `expire-unpaid-trials.test.ts`, `chat-agentic-loop.test.ts`, `account-delete.test.ts`, `invite-accept.test.ts`, `sentry-scrub.test.ts`, `plans.test.ts`, `system-prompt.test.ts`.
- P1-Q3 (CI runs `next build`) — LANDED. `.github/workflows/ci.yml:50-57`.

Code-quality stream surfaced **zero new findings**. Codebase exhibits clean discipline: zero TS errors across both packages, zero lint violations, 100% test pass rate (52/52), clean package boundaries (`@kin/shared` only imported by `types/index.ts` and `lib/system-prompt.ts`), verified mobile-app removal (commit `ab874cc` cleaned all `apps/mobile/`, `ios/`, `android/` residue from active source), no remaining `TODO`/`FIXME`/`HACK`, no `it.skip`/`it.only`, briefing logic single-sourced at `supabase/functions/_shared/briefing.ts`. Migrations 001-073 ordered sequentially. `npm ci --dry-run` succeeds clean.

---

## Recommended ship order

1. **P0-3** (pickup-risk TCPA opt-out) — 10 lines, ~10 min, regulatory exposure.
2. **P0-5** (Slack PII leakage) — 10 string edits, ~15 min.
3. **P0-4** (billing `cancel_at_period_end` display) — 10 lines, ~20 min.
4. **P0-1** (Apple multi-account `onConflict`) — 5 lines, ~15 min + Apple-side disconnect (P1-C4).
5. **P0-2** (calendar sync advisory lock / claim pattern) — 20 lines, ~30 min, deserves a smoke test.

Then triage P1 by cluster:
- **Cluster A (regulatory & legal):** P1-A1 (account-delete UI), P1-A2 (email enum), P1-A4 (open redirect).
- **Cluster B (calendar reliability):** P1-C1 (email persistence), P1-C2 (quota), P1-C3 (empty-token guard).
- **Cluster C (SMS hygiene):** P1-S2 (normalize before opt-out), P1-E1 (nudge frequency cap), P1-E2 (orphan auth.users).
- **Cluster D (ops):** P1-I1 (CSP), P1-I3 (TEST_SECRET split), P1-I5 (engagement-nudges 500 on failure).
- **Cluster E (marketing):** P1-L1 (OG image), P1-L2 (form error color), P1-L3 (demo label).

Total fix-time estimate: 5 P0 fixes in ~90 min, 28 P1 fixes in ~6 hours of focused work.
