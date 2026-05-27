# Kin Go-Live Checklist — Beta Launch (10 Families)

**Date:** 2026-05-26
**Branch:** `main` at HEAD `ff8b720` (local) · `origin/main` at `67f325d` (deployed)
**Stack:** kinai.family on Vercel Hobby (`apps/web`) + Supabase edge functions (`coxqdpcffmsncvisfyvj`) + Twilio A2P 10DLC + Stripe $39/mo + 14-day app-level trial
**Scope:** What literally needs to be true before 10 real families can sign up at kinai.family today.
**Methodology:** Code analysis + git state + file reads. No DB queries, no live API checks.

---

## TL;DR

**Status: NOT YET — 6 blocking items, ~30 min of work + 4 manual console steps.**

The code is ready. The deploy isn't. The two most recent commits — including the A2P 10DLC STOP-footer compliance fixes (V8 P0-1/P0-2) that the carrier audit blockers required — are **sitting on the local main and have never been pushed**. Until you `git push`, Vercel is still serving the V7-era build that's missing those footers, the morning-briefing edge function is still missing the monthly STOP helper, and migration 081 (disable engagement nudges) hasn't been applied to the remote Supabase.

Past that: the local `.env.local` is a tiny stub (10 keys) compared to what the app actually needs (~30 keys), but that only affects local dev — what matters is **whether those vars are set in Vercel and as Supabase edge function secrets**, which this audit can't verify from disk. You need to spot-check the Vercel and Supabase dashboards.

Walk the punch list at the bottom in order. Realistic time to live: ~45 min of your time, mostly waiting on Vercel and Supabase deploys.

---

## 1. Deploy state — git/Vercel

### Status: **NOT DONE**

- **`main` is 2 commits AHEAD of `origin/main`.** Local HEAD is `ff8b720`; origin/main is `67f325d`.
  - `a26faf4` — V8 P0 STOP-footer compliance fixes (briefing + sunday-checkin + A2P 10DLC carrier audit risk closure)
  - `ff8b720` — STOP footer scaling to monthly + disable engagement-nudges pg_cron for beta (includes migration 081)
- **Vercel is deploying from `origin/main`** (project `kin-web`, prod target, root dir `apps/web`, see `apps/web/.vercel/project.json`). So **what's live at kinai.family is missing both commits**.
- **Uncommitted changes in working tree:**
  - `supabase/.temp/cli-latest` (modified, tooling cache file — ignorable but should `git checkout` or add to `.gitignore`)
  - `apps/mobile/` (untracked, **471 MB**, contains `@kin-tech__kin-family-ai.jks` keystore + node_modules). **This shouldn't exist** — the spec is SMS + web only, no mobile app. Confirm it isn't holding production secrets, then either delete or gitignore it. Do NOT push it.
  - `docs/BETA_READINESS_AUDIT.md`, `docs/EXPERIENCE_AUDIT_V8.md`, `docs/MONITORING_PLAN.md` (untracked but harmless to commit)
- **Action needed:** `git push origin main` after deciding what to do with `apps/mobile/` and the docs.

---

## 2. Edge function deploy state — Supabase

### Status: **NOT DONE**

Edge functions in this repo: `morning-briefing`, `briefing-audit`, `cron-dispatch`, `_shared/`.

The two unpushed commits both modify `supabase/functions/_shared/briefing.ts` and add `supabase/functions/_shared/sms-utils.ts`. Edge functions are deployed to Supabase via `supabase functions deploy <name>` — and **`morning-briefing` and `briefing-audit` both import from `_shared/`**, so they need redeployment to pick up:

- The V8 P0-1 STOP footer on every briefing send (`a26faf4`)
- The monthly footer dedupe via `ensureStopFooterMonthly` (`ff8b720`)
- The new shared helper `supabase/functions/_shared/sms-utils.ts`

If you don't redeploy, the Supabase-side briefing engine will still send compliant SMS only via the V7-era inline append — but the new monthly-dedupe and the matching helper between web + edge will be inconsistent, and the briefing send site will fall back to the pre-V8 path.

- **Action needed:**
  ```
  supabase functions deploy morning-briefing
  supabase functions deploy briefing-audit
  supabase functions deploy cron-dispatch   # only if changed; safe to redeploy
  ```
  These need `SUPABASE_ACCESS_TOKEN` + the project ref `coxqdpcffmsncvisfyvj`.

---

## 3. Migration state

### Status: **NOT DONE** (1 unapplied: 081)

- Local `supabase/migrations/` has **81 migrations**, latest `081_disable_engagement_nudges_for_beta.sql`.
- 081 calls `cron.unschedule('engagement-nudges-onboarding-hourly')` — guarded by `EXISTS` so it's idempotent and safe to re-run.
- **Migration 081 has not been applied to remote** — it was added in the local-only commit `ff8b720`.
- Migrations 1–80 are presumed-applied (V7/V8 audit work was tracked against a remote that was current through 080; the BETA_READINESS_AUDIT explicitly notes "80 migrations, all deployed" at HEAD `67f325d`).
- **Action needed:** `supabase db push` from project root.
- **Side effect of applying 081:** Beta cohort will NOT get the calendar-not-connected nudge or the silent-mid-onboarding nudge. Per migration commentary, that's the intent: 10-family beta where Austin is talking to every household directly. The daily trial-drip cron entry was also removed from `apps/web/vercel.json` in the same commit (file shows only the `/api/cron/cleanup` schedule now), so trial-drip messaging is OFF for beta.

---

## 4. Env var sync — what's in `.env.local` vs what the app needs

### Status: **PARTIAL** — `.env.local` is local-dev-only; Vercel/Supabase secrets are what actually matter

**`.env.local` (10 keys present):**
```
ANTHROPIC_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL,
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, TAVILY_API_KEY
```

**`.env.example` declares 37 keys.** Diffing those against `.env.local`, the 27 missing locally are listed below. **The question this audit can't answer from disk** is whether each is set in Vercel (for the Next.js app) and as a Supabase edge function secret (for the briefing pipeline). Manually verify each:

### Required for the SMS path to work end-to-end (Vercel + Supabase secrets)

| Var | Where used | Notes |
|---|---|---|
| **`CRON_SECRET`** | Both | You said this was just rotated + synced across Vault/Vercel/edge functions. Sanity-check: Vercel `CRON_SECRET` env var === Supabase Vault entry `cron_secret` === edge function secret `CRON_SECRET`. Migration `068_cron_dispatch_vault_check.sql` will RAISE if Vault entry is <16 chars. |
| **`SUPABASE_SERVICE_ROLE_KEY`** | Vercel | Needed by every server route that uses `createAdminClient()` — including the waitlist, onboarding-complete, SMS inbound webhook, Stripe webhook, billing, partner-invite |
| **`TWILIO_ACCOUNT_SID`** | Both | |
| **`TWILIO_AUTH_TOKEN`** | Both | |
| **`TWILIO_MESSAGING_SERVICE_SID`** | Both | **REQUIRED**, not optional — `apps/web/src/lib/twilio.ts:14` throws if missing. SMS goes via Messaging Service (10DLC), not a bare From number. |
| **`TWILIO_PHONE_NUMBER`** | Both | Used as `from_number` in `sms_conversations` audit log; also flagged in welcome SMS path |
| **`TWILIO_VERIFY_SERVICE_SID`** | Vercel | Phone-OTP signin |
| **`CALENDAR_TOKEN_ENCRYPTION_KEY`** | Vercel | **REQUIRED in production** — `apps/web/src/lib/calendar/token-crypto.ts:37–41` throws when `NODE_ENV=production` and key is missing. 32 raw bytes, base64-encoded. **NOT IN `.env.example`** — easy to miss. |
| **`GOOGLE_WEBHOOK_SECRET`** | Vercel | Google calendar push webhook validation |
| **`OPENWEATHER_API_KEY`** | Both | Weather enrichment in briefing — degrades silently if absent, so optional |
| **`GOOGLE_MAPS_API_KEY`** | Both | Distance Matrix travel-times — also degrades silently |
| **`UPSTASH_REDIS_REST_URL`** | Vercel | Rate limiting on Stripe/waitlist/auth/onboarding routes. Without it, those routes graceful-degrade to "allow all" — and `apps/web/src/lib/stripe.ts:24–40` Slack-alerts on every Vercel cold start in that state. |
| **`UPSTASH_REDIS_REST_TOKEN`** | Vercel | (pair with above) |
| **`RESEND_API_KEY`** | Vercel | Partner-invite email channel. Without it, invites fall back to SMS-only — not a blocker. |
| **`RESEND_FROM`** | Vercel | (pair with above) |
| **`SLACK_ALERTS_WEBHOOK_URL`** | Vercel | Critical alerts to your Slack — without this, the watchdog/error alerts go nowhere |
| **`SLACK_BRIEFING_WEBHOOK_URL`** | Supabase | Reliability alerts from the morning-briefing edge function |
| **`SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`** | Vercel | Error tracking. The `apps/web` codebase imports `@sentry/nextjs` heavily; absence is graceful but noisy. |
| **`SENTRY_AUTH_TOKEN`** | Vercel build | Sourcemap upload on deploy |
| **`STRIPE_PRICE_ID`** | Vercel | **Optional** — `apps/web/src/lib/stripe.ts:61–80` auto-resolves by lookup-key `kin_premium_monthly` and creates the product+price on first run if neither exists. Setting it is faster and more deterministic. |
| **`ADMIN_PHONES`** | Both | Comma-separated allowlist for test-mode invocations of the briefing edge function. Falls back hardcoded to `+16266762222,+16266762832,+16266761832` in `supabase/functions/morning-briefing/index.ts:67` — **so both of Jontae's phone numbers (1832 and 2832) are pre-allowlisted regardless**. |
| **`ADMIN_PHONE`** | Vercel | Critical-alert SMS recipient (single number) |
| **`ADMIN_SECRET`** | Vercel | Gates `/api/admin/*` routes (number approval, etc.) |
| **`ACTIVITY_ALERT_EMAIL` / `ACTIVITY_ALERT_FROM`** | Vercel | Signup-activity email digests; optional |
| **`TEST_SECRET`** | Vercel | Gates `/api/test/*` routes; optional in prod |

### Action needed
- Open Vercel → Project `kin-web` → Settings → Environment Variables → Production. Confirm all "Required for SMS path" rows are set.
- Open Supabase → Project `coxqdpcffmsncvisfyvj` → Edge Functions → Secrets. Confirm `CRON_SECRET`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID`, `TWILIO_PHONE_NUMBER`, `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` are set. (The morning-briefing index file declares these as required in the header comment.)
- Verify Vercel's `CRON_SECRET` and Supabase's `CRON_SECRET` are byte-identical. The recent rotation was the underlying cause of the 4-day outage cited in `docs/MONITORING_PLAN.md` — any drift here breaks every cron silently.

---

## 5. A2P 10DLC / Twilio registration

### Status: **UNKNOWN — must be verified in the Twilio console manually**

The codebase explicitly assumes A2P 10DLC is registered:

- `apps/web/src/lib/twilio.ts:44` sends via `MessagingServiceSid: messagingServiceSid` (the 10DLC path), not a bare From number.
- `apps/web/src/app/api/waitlist/route.ts:46` comment: *"Restricted to US/Canada (+1) for the beta — the 10DLC campaign and per-segment cost math both assume +1."*
- `apps/web/src/lib/sms-onboarding.ts:30` comment: *"Every outbound SMS goes through twilio.ts, which sends via the A2P 10DLC Messaging Service rather than a bare From."*

There is **zero indication in the codebase of campaign registration status**, brand verification status, or carrier vetting score. These don't live in code — they live in your Twilio console under Messaging → Regulatory Compliance → A2P 10DLC.

### What you need to verify in the Twilio console

1. **Brand registration** is complete and **approved** (not pending, not failed). Brand is a one-time thing tied to your EIN.
2. **Campaign registration** for the Messaging Service (`TWILIO_MESSAGING_SERVICE_SID`) is complete, **approved**, and the campaign use case is one of: `LOW_VOLUME` (preferred for 10-family beta), `ACCOUNT_NOTIFICATION`, or `CUSTOMER_CARE`.
3. **The phone number(s)** in `TWILIO_PHONE_NUMBER` are **attached to that Messaging Service**.
4. **Sample messages** in the campaign filing match the actual SMS the app sends (welcome, briefing, sunday check-in, partner invite). The V7/V8 compliance work added STOP footers to every send site; the campaign filing should reflect that. If the filing predates V7, the recurring-message samples may be out of date.

### What happens if you launch without campaign registration

- **Carrier-flagged traffic.** Verizon/T-Mobile/AT&T sample outbound traffic and score the sender. Unregistered 10DLC traffic gets throttled or outright blocked, with no error to your code. Twilio surfaces this as a delivery-failed status in their dashboard but your app sees "send successful." Beta users start receiving "is Kin broken?" messages or, more commonly, just no message at all.
- **Short-code suspension risk.** If a carrier audit catches it, suspension is the standard remediation — and 10DLC re-registration is 2–4 weeks.
- For a 10-family beta the cost exposure is tiny, but the brand exposure is total.

### Action needed
- **Log into Twilio console NOW** and confirm brand + campaign both show **Approved**. If anything is pending or rejected, **hold beta launch until it's approved**. The V8 audit (`docs/EXPERIENCE_AUDIT_V8.md`) characterizes this as "the existential-outage shape of carrier non-compliance" — that is the right frame.

---

## 6. DNS / domain — kinai.family

### Status: **PRESUMED DONE** — verify in browser, can't confirm from disk

Evidence the app expects kinai.family to be the canonical production domain:

- `apps/web/src/app/sitemap.ts:3` → `BASE_URL = "https://kinai.family"`
- `apps/web/src/app/robots.ts:24-25` → `host` and `sitemap` both `https://kinai.family`
- `apps/web/src/app/opengraph-image.tsx:12` → fallback to `https://kinai.family`
- `.vercel/.env.fresh` (snapshot pulled `2026-05-19`) → `NEXT_PUBLIC_APP_URL="https://kinai.family"`
- `apps/web/src/lib/partner-invite.ts:23` → invite link defaults to `https://kinai.family/join/invite/<code>`

### Action needed
- Open kinai.family in a browser. Confirm:
  - DNS resolves to Vercel
  - HTTPS cert is valid (Vercel-managed Let's Encrypt — should be automatic, but check)
  - Both apex `kinai.family` and `www.kinai.family` work (or one redirects to the other consistently — whichever Vercel is configured for)
- Check Vercel → Project → Settings → Domains for any "needs configuration" warnings.

---

## 7. Stripe billing — $39/mo, 14-day trial

### Status: **CODE READY** — needs dashboard config + a real test

- **Product/price config:** `apps/web/src/lib/stripe.ts:61–80` auto-creates a `kin_premium_monthly` product + $39/mo price on first checkout call if `STRIPE_PRICE_ID` is unset and lookup-key doesn't resolve. So **technically nothing must be done in the dashboard** — but it's cleaner to pre-create the product in the Stripe dashboard, copy the price ID to `STRIPE_PRICE_ID` in Vercel, and skip the runtime side-effect.
- **Trial:** 14 days, tracked at app level via `profiles.trial_ends_at` — **not a Stripe-side trial**. The Stripe subscription bills immediately at signup; the app's trial gate is `subscription_status='trial'` on the profile. Migration `076_subscription_current_period_end.sql` + the Stripe webhook handler manage state transitions.
- **Webhook:** `/api/stripe/webhook` exists, idempotent, handles `customer.subscription.{created,updated,deleted}`, `invoice.payment_succeeded`, `charge.refunded`, `charge.dispute.created`. Needs `STRIPE_WEBHOOK_SECRET` in Vercel.
- **Rate limit safety:** `apps/web/src/lib/stripe.ts:24–40` Slack-alerts on cold start if Upstash isn't configured — without rate limits the checkout/coupon endpoints are an unbounded API-spend vector. Confirm `UPSTASH_REDIS_REST_*` are set.

### Action needed
- In Stripe dashboard, confirm:
  - You're using the **live** keys (not test) in `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in Vercel production.
  - Webhook endpoint `https://kinai.family/api/stripe/webhook` is registered and active. `STRIPE_WEBHOOK_SECRET` in Vercel matches the signing secret shown for that endpoint.
- **End-to-end test before launch:** sign up with a real number, complete trial → use Stripe test card or your own card → verify webhook fires → verify `subscription_status` flips to `active` in the DB. (You can't fully validate this without making an actual transaction.)

---

## 8. Waitlist → onboarding flow — what actually happens when a family enters their phone

### Status: **WORKING (code-verified end-to-end)**

This is invite-only — but the phone-first kinai.family path **auto-approves itself**, so families coming through the landing page don't hit a manual-approval gate. Here's the literal code path:

1. **Family enters phone on landing.** `apps/web/src/components/WaitlistForm.tsx` → POST `/api/waitlist`.
2. **`/api/waitlist/route.ts`** normalizes phone to E.164, validates as `+1` only (US/Canada), inserts into `waitlist` table with TCPA snapshot (`sms_consent`, `sms_consent_at`, `sms_consent_text`, `sms_consent_source`). Sends `CONFIRMATION_SMS`: *"Hey! This is Kin — thanks for joining our waitlist! 🤙 What's your name and email so we can keep you in the loop? Just reply here. Reply STOP to opt out."*
3. **Family replies with their name + email.** `/api/sms/inbound/route.ts:438–447` runs `findPendingWaitlistReply(supabase, fromNumber)` BEFORE the SMS-beta allowlist check — meaning a waitlist signup is treated as pre-approved.
4. **`handleWaitlistReply` (in `apps/web/src/lib/waitlist-sms.ts:102`)** parses name + email, writes them back onto the `waitlist` row, and routes into the SMS onboarding state machine via `createOnboardingProfile`.
5. **SMS state machine (`apps/web/src/lib/sms-onboarding.ts`)** drives 11 conversational steps: family name → wake time → partner name/phone → calendar control word → `/connect/<token>` link → onboarding complete.
6. **`profile.onboarding_completed=true`** marks them as eligible for the morning-briefing cron.

### What's NOT a gate
- The "SMS beta invite-only" allowlist (`isNumberApproved`, `apps/web/src/app/api/sms/inbound/route.ts:449`) is **bypassed** for phone-first kinai.family signups via the `findPendingWaitlistReply` check. So a real family entering their phone on the landing page does NOT need you to manually approve them.
- The allowlist still gates **cold inbound SMS** from numbers that didn't go through kinai.family first. Anyone who somehow gets your Twilio number from another channel and texts in cold lands on `sms_waitlist` for admin approval. This is correct beta behavior.

### Edge cases that COULD silently kill the flow
- **Duplicate phone in waitlist** (`error.code === 23505`) → `/api/waitlist/route.ts` returns success but **doesn't re-send the confirmation SMS**. If the user submitted once 2 weeks ago, never replied, and tries again now expecting a fresh SMS, they get nothing. Low probability for 10-family beta but worth knowing.
- **Confirmation SMS send failure** → logged to Sentry, **not surfaced to the user**. The waitlist row is saved, the user thinks they signed up, and you have to manually trigger the re-send. Monitor Sentry for `waitlist` events the first week.

### Action needed
- None for the code. End-to-end test: text your own number through the funnel once before sending the beta cohort.

---

## 9. First briefing delivery timing

### Status: **WORKING** — but understand the timing

After `onboarding_completed=true`:

- **Welcome SMS (sent immediately on completion):** *"Hey [name]! This is Kin. I'll be sending you a morning briefing to help coordinate your family's day. **Your first one arrives tomorrow at 6am.** If you ever need anything, just text me back. Reply STOP to opt out."* — `apps/web/src/app/api/account/onboarding-complete/route.ts:87`
- **Briefing cron schedule:** `pg_cron` job `morning-briefing-hourly` runs every hour at `:00`. The edge function fans out to profiles whose **user-local hour is 6:xx**. (`supabase/functions/morning-briefing/index.ts:276–282`.) Filters: `phone_number IS NOT NULL`, `sms_opted_out_at IS NULL`, `onboarding_completed=true`, `subscription_status IN ('trial','active') OR billing_exempt=true`.
- **Audit/recovery cron:** `briefing-audit-daily` runs at 14:00 UTC (= 9am CT summer / 8am CT winter, per `supabase/functions/briefing-audit/index.ts:5–13`) and force-sends to any eligible profile that didn't get a briefing earlier today. **This is the backstop** — a family who finishes onboarding at, say, 4am CT will get a 6am CT briefing same day; one who finishes at 7am CT misses the 6am window but gets caught by the 9am CT audit backstop and gets their first briefing ~2 hours later.

### Worst case
- User completes onboarding at, e.g., 9:01 AM in their local timezone (just missed both the 6am hourly fan-out AND the 9am audit pickup): they wait until 6am tomorrow. That's ~21 hours.
- The welcome SMS sets the right expectation ("first one arrives tomorrow at 6am") so users aren't confused.
- **Special case to watch:** if a user completes onboarding minutes before the audit cron runs at 14:00 UTC, the audit cron's race window matters — the briefing-audit query is one-shot at the top of its run, not per-user, so any user whose `onboarding_completed` flipped during the previous hour gets picked up next-cycle (i.e., next 6am their local).

### Action needed
- None. The flow is solid. Just understand that "first briefing latency" is variably 0–24h depending on signup time.

---

## 10. Partner invite flow

### Status: **WORKING (idempotent, dual-channel)**

`apps/web/src/lib/partner-invite.ts` — `dispatchPartnerInvite` is the single source of truth, called from 3 places (web invite form, SMS onboarding step 7, web onboarding-complete).

- **Invite code:** 8 random bytes hex (16 chars). Inserted into `household_invites` with a partial unique constraint on `(inviter_profile_id, invitee_phone) WHERE accepted=false` (migration 075). Collisions are caught (Postgres `23505`) and the existing row's code is reused, so a re-triggered invite never mints a fresh link.
- **SMS channel (primary):** sent to `partner_phone` if present.
- **Email channel (backup):** sent via Resend if `partner_email` is present and `RESEND_API_KEY` is configured. Skips gracefully if not.
- **Acceptance:** Partner clicks `https://kinai.family/join/invite/<code>` → `apps/web/src/app/join/invite/[code]/page.tsx` (4-state UI: loading, invalid, valid, success) → POST `/api/invite/[code]/accept` → joins household → routes to `/onboarding/partner` (1-step abbreviated wizard).
- **Calendar connection for partner:** Same `/connect/<token>` flow as the inviter, just via the partner-onboarding wizard.

### What could go wrong for beta
- **Resend not configured** → email channel silent-fails (correct behavior, but you don't get fallback if SMS fails). Set `RESEND_API_KEY` in Vercel if you want belt-and-suspenders.
- **Partner phone validation:** Same `+1`-only rule as waitlist (US/Canada). A partner with an international number won't get the SMS.
- **Stale invite link:** `expires_at` is 30 days from issue (per migration 077). For beta, this is plenty.

### Action needed
- None for code.
- End-to-end test: complete onboarding with a partner phone, confirm the partner gets the SMS, click the link, confirm they're routed to `/onboarding/partner`, connect a calendar.

---

## 11. Known data gotchas

### Status: **2 known**

### Jontae's phone number (1832 vs 2832)
You flagged that the DB has `+16266761832` but you previously said `+16266762832`. Two relevant places in code:

- `supabase/functions/morning-briefing/index.ts:67` → `ADMIN_PHONES_FALLBACK = ["+16266762222", "+16266762832", "+16266761832"]` — **both numbers are in the fallback allowlist**, so the test-mode invocation gate isn't a problem either way.
- **What matters is `profiles.phone_number` for Jontae's actual profile (`0da19b72-fe0f-44cf-a55c-b4bf219f2f44` is YOUR profile, not hers — Jontae's profile ID isn't given here).** If her profile has `+16266761832` and she actually uses `+16266762832`, she won't get her morning briefing because Twilio will send to the wrong number.

#### Action needed
Manually verify in the Supabase dashboard (Tables → profiles → filter by family_name or phone_number) that Jontae's `phone_number` matches the number she actually carries. If it's wrong, UPDATE it from the SQL editor. The .env.local audit can't tell which number is hers — you have to confirm.

### No other obvious data hazards
- No hardcoded test profiles or "fake families" found in production code paths.
- The `apps/mobile/` directory at the repo root has a `@kin-tech__kin-family-ai.jks` Java keystore — **check whether this contains production signing credentials** that shouldn't be in a directory marked untracked-but-on-disk. If it's legit, move it to a 1Password vault. If it's test material, delete `apps/mobile/`.

---

## 12. Manual / console steps Austin must do (in order)

These are the things code can't do for you. Each one is a separate browser tab.

1. **Twilio console** — confirm A2P 10DLC brand + campaign both **Approved** for `TWILIO_MESSAGING_SERVICE_SID`. (Item #5 above.) **HARD STOP if any is pending.**
2. **Vercel dashboard** (`kin-web` project, Production env) — verify ALL of: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `TWILIO_*` (5 keys), `CALENDAR_TOKEN_ENCRYPTION_KEY`, `GOOGLE_WEBHOOK_SECRET`, `UPSTASH_REDIS_REST_URL`/`_TOKEN`, `STRIPE_SECRET_KEY`/`_WEBHOOK_SECRET`, `SENTRY_*`, `ADMIN_PHONE`/`_PHONES`/`_SECRET`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`. (Item #4 above.)
3. **Supabase dashboard** → Project `coxqdpcffmsncvisfyvj` → Edge Functions → Secrets — verify `CRON_SECRET`, `TWILIO_*` (4 keys), `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, optionally `OPENWEATHER_API_KEY`, `GOOGLE_MAPS_API_KEY`, `SLACK_BRIEFING_WEBHOOK_URL`, `ADMIN_PHONES`.
4. **Confirm `CRON_SECRET` byte-identical** in Vercel env, Supabase Vault entry `cron_secret`, AND Supabase edge function secret `CRON_SECRET`. This is the bug that caused the 4-day outage; the only defense is the visual diff.
5. **Stripe dashboard** — confirm LIVE keys in Vercel (not test), confirm webhook endpoint `https://kinai.family/api/stripe/webhook` exists with the correct `STRIPE_WEBHOOK_SECRET`. (Item #7 above.)
6. **DNS** — open `https://kinai.family` in a fresh browser tab, confirm cert is valid, page renders. Check `https://kinai.family/sitemap.xml` works too. (Item #6 above.)
7. **Verify Jontae's profile** in the Supabase Tables editor — `profiles.phone_number` matches what she actually carries (1832 vs 2832). (Item #11 above.)
8. **Decide on `apps/mobile/`** — keystore content review, then delete or gitignore. **Do not push it.**

---

## Prioritized punch list — exact steps to go live, in order

| # | Step | Type | Time | Blocker? |
|---|---|---|---|---|
| 1 | Triage `apps/mobile/` directory (move keystore safely, then delete or gitignore) | Manual | 5 min | Stops you from a bad `git push -A` |
| 2 | `git push origin main` (after #1) | Code | 30 sec | YES — Vercel autodeploys briefing/STOP-footer fixes |
| 3 | Wait for Vercel deploy to finish (~2 min). Watch deploy log for build errors. | Manual | 2 min | YES |
| 4 | `supabase functions deploy morning-briefing && supabase functions deploy briefing-audit` | Code | 1 min | YES — picks up V8 STOP footer + monthly helper |
| 5 | `supabase db push` to apply migration 081 | Code | 30 sec | YES |
| 6 | **Twilio console:** verify brand + campaign **Approved**. Hard stop if pending. | Manual | 5 min | YES |
| 7 | **Vercel env vars:** sweep against checklist #4. Especially `CRON_SECRET`, `CALENDAR_TOKEN_ENCRYPTION_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TWILIO_*`. | Manual | 5 min | YES |
| 8 | **Supabase edge function secrets:** sweep `CRON_SECRET`, `TWILIO_*`, `ANTHROPIC_API_KEY`. | Manual | 3 min | YES |
| 9 | Spot-check `CRON_SECRET` is byte-identical Vercel ↔ Supabase Vault `cron_secret` ↔ Edge function secret | Manual | 2 min | YES |
| 10 | Open `https://kinai.family` — confirm DNS + HTTPS + page renders | Manual | 30 sec | YES |
| 11 | **Verify Jontae's `profiles.phone_number` in Supabase** matches what she actually carries (1832 vs 2832 question) | Manual | 1 min | YES (or her briefing goes to wrong number) |
| 12 | End-to-end smoke: text your own number through the kinai.family waitlist → reply with name+email → walk SMS onboarding → confirm `/connect/<token>` → confirm welcome SMS arrives → confirm first briefing fires next 6am (or audit-cron at ~9am CT next day) | Manual | 30 min (incl. wait) | YES — last gate |
| 13 | Confirm Stripe webhook fires when you complete checkout in the smoke test | Manual | 5 min | YES |
| 14 | (Optional) Send the beta cohort their kinai.family link | Manual | 1 min | The actual launch |

**Total: ~30 min of work + ~30 min for the end-to-end smoke test = ~1 hour from "click go" to "first family signing up."**

---

## What's explicitly DEFERRED for after beta launch

These are real but not blockers. They will not stop 10 families from successfully signing up and getting briefings:

- The 2 product-surface gaps from `docs/BETA_READINESS_AUDIT.md`: no user-facing activity log; weekly suggestions is "capture + fold" only, no past-week analysis. Mitigated by Austin personally talking to every household (per migration 081's rationale).
- The 3 P1 polish items from BETA_READINESS_AUDIT: `calendar-renewal` returns 200 on failure, `DEFAULT_TIMEZONE` LA fallback, OAuth abandon-return path. ~30 min total, do during first beta weekend.
- Monitoring per `docs/MONITORING_PLAN.md`: Sentry Crons, Better Stack, watchdog cron. Build in first 1–2 weeks of beta.
- iPhone QA on `/dashboard/family` / `/calendars` / `/billing` (V8 P2 carryover — Chrome DevTools emulation only so far).
- `apps/web/vercel.json` only schedules `/api/cron/cleanup` now (trial-drip cron was removed in `ff8b720`). Verify after Vercel redeploys.

---

*Generated 2026-05-26 from source-level read of branch `main` at HEAD `ff8b720`. No live DB or production console queries — every "VERIFY" item in the manual list is a separate browser tab Austin needs to open.*
