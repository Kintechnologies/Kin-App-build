# Kin Beta Readiness Audit v5

**Date:** 2026-05-22
**Branch:** main (HEAD `78e5bf3`)
**Auditor:** Claude (Opus 4.7) — orchestrated 6-stream parallel audit (code/infra/security · auth · SMS · briefing+cron · calendar+stripe · frontend) + inline verification of every new P0 against source
**Scope:** Full codebase + product surface — V5 fresh sweep after V4's 7 P0 fixes shipped in `78e5bf3` and migration `063`
**Production URL:** kinai.family
**Supabase ref:** coxqdpcffmsncvisfyvj
**Tests:** 38 passing (27 web + 11 shared — shared count regressed from 12 in V4); `next lint` clean; 2 carried TS errors in test mocks

---

## Overall Grade: **B (ship-ready with 8 P0 fixes — same caliber as V3 + V4, but two V4 P0 fixes shipped only partially)**

Commit `78e5bf3` landed all seven V4 P0 items. Five of the seven landed cleanly (P0-1 trial-flip, P0-2 sunday-checkin gate, P0-3 annual pricing removal, P0-6 test-endpoint visibility leak via deleting `sms-briefing.ts`, P0-7 multi-day all-day events). Two landed **partially**:

- **V4 P0-4 (Stripe webhook idempotency).** Spec was a `stripe_events(event_id PK)` table + `ON CONFLICT DO NOTHING` short-circuit. What shipped is a defensive active-status check inside the `customer.subscription.deleted` branch only. Two of the three handled event types (`checkout.session.completed`, `invoice.payment_failed`) remain replay-vulnerable; three other Stripe events that real users hit (`customer.subscription.updated`, `customer.subscription.created`, `invoice.payment_succeeded`) aren't handled at all.
- **V4 P0-5 (cron-dispatch caller auth).** The `cron-dispatch` edge function itself is correctly gated now (constant-time secret compare, fail-closed on missing env). But `morning-briefing` and `briefing-audit` are invoked directly from pg_cron — they don't route through `cron-dispatch` — and neither has any equivalent secret check on the fan-out path. The DoS amplifier surface V4 P0-5 was supposed to close is still wide open on the two most expensive functions in the system.

V5 also surfaces what is, in hindsight, the most consequential single bug in the audit: **the V3 P1-C1 reconnect-CTA fix has never worked in production.** The fix writes `sync_status = 'needs_reconnect'` to a column whose CHECK constraint (migration 009:24) only allows `('idle', 'syncing', 'error')`. Every revoked-token write throws Postgres 23514, the catch block swallows it, and the dashboard's reconnect CTA — gated on that exact state — never renders. The reconnect recovery path the audit thought existed for two cycles is dead code.

Additionally, the carryover work from V4 P1 is unusually heavy this cycle — of ~27 V4 P1 items, fewer than five appear to have landed in source. Most of the unfixed items are 5–15 minute changes (`/ops` in middleware, Jontae's third phone, BriefingDemo greeting, WaitlistForm digit gate, settings timezone copy, etc.) but they didn't get into commit `78e5bf3`'s scope and they will not land on their own.

What's working: V3 P0-1/2/3/4/5 still hold (idempotency, Anthropic timeout, nudge cap, subscription gating in briefing, waitlist STOP footer). V4 P0-1/2/3/6/7 hold. Webhook signature validation across Twilio/Stripe/Google still uses length-guarded constant-time compare. TCPA opt-out latch is honored at send time on every outbound path that's been traced (briefing fan-out, pickup-risk, partner-invite, sunday-checkin, engagement-nudges). Auth trigger reliability, RLS scoping, plaintext fallback, quality scorer, founder-locked `/ops`, error boundaries all hold up to a hard re-look.

Ship after the eight P0 fixes plus the highest-impact P1 cluster (~6 hours of focused work).

---

## Top-line summary

| Layer | Grade | P0 | P1 | P2 |
|---|---|---|---|---|
| Code quality (TS, lint, tests) | A− | 0 | 3 | 4 |
| Auth & Access Control | B+ | 1 | 5 | 6 |
| SMS pipeline + compliance | B | 0 | 7 | 6 |
| Briefing system | B | 1 | 5 | 5 |
| Calendar sync | C+ | 1 | 6 | 4 |
| Portal / Stripe / Billing | C+ | 3 | 3 | 2 |
| Landing page + Legal | B− | 1 | 5 | 4 |
| Infrastructure | B | 1 | 6 | 3 |
| Security | B+ | 0 | 4 | 2 |
| Edge cases | B− | 0 | 3 | 4 |
| **Total** | **B** | **8** | **47** | **40** |

---

## P0 — Launch Blockers (8)

These create revenue leak, regulatory exposure, broken recovery paths, DoS surface, or silent user loss. Must be patched before paying families come in.

### P0-1. Trial-expiry flip skips users who started Stripe checkout but didn't complete payment — V4 P0-1 cost-leak partially returns
**Files:** `apps/web/src/app/api/cron/engagement-nudges/route.ts:367`, `apps/web/src/app/api/stripe/checkout/route.ts:91-101`

The V4 P0-1 fix added a daily `expireUnpaidTrials` job:
```ts
.eq("subscription_status", "trial")
.eq("billing_exempt", false)
.lt("trial_ends_at", new Date().toISOString())
.or("stripe_customer_id.is.null,stripe_customer_id.eq.")
```
But `/api/stripe/checkout` writes `stripe_customer_id` onto the profile **as soon as a Stripe Customer object is created** — well before the user has paid. A user who clicks Subscribe, lands on Stripe Checkout, and abandons the page now has a non-null `stripe_customer_id` AND `subscription_status = 'trial'`. The flip query excludes them. When `trial_ends_at` passes, they stay `trial` forever and the V3 P0-1 fan-out filter `(trial, active)` keeps texting them free briefings.

Same failure mode V4 P0-1 was supposed to close, for a smaller but very real cohort: anyone who reached checkout and bailed. Beta-week conversion friction makes this cohort larger than steady state.

**Fix:** Drop the `stripe_customer_id` predicate entirely. A user who actually paid is `subscription_status = 'active'` by the time their trial expires (the Stripe webhook flips them on `checkout.session.completed`); the customer-id column was never a reliable "did they pay" signal.

---

### P0-2. `morning-briefing` and `briefing-audit` edge functions still publicly invokable — V4 P0-5 closed the front door, left the side door open
**Files:** `supabase/functions/morning-briefing/index.ts:164-186`, `supabase/functions/briefing-audit/index.ts:27-30`, `supabase/migrations/046_morning_briefing_cron.sql:28-32`, `supabase/migrations/047_briefing_audit_cron.sql:28-32`

V4 P0-5 added `x-cron-secret` auth to `cron-dispatch`. But `morning-briefing` and `briefing-audit` are NOT routed through `cron-dispatch` — pg_cron calls them directly via `net.http_post`. The fan-out path on `morning-briefing` only checks the secret when the request includes a `target_phone` JSON body (the test mode V4 P0-6 added); a POST with empty body falls straight through to the production fan-out. `briefing-audit` has NO auth check at all — comment at line 13 explicitly says "the cron POST needs no Authorization header."

**Attack:** `curl -X POST https://coxqdpcffmsncvisfyvj.supabase.co/functions/v1/morning-briefing -H "Content-Type: application/json" -d '{}'` triggers a full profile scan + per-profile timezone math, and for any user whose local hour is currently 6 (and not yet deduped today) generates a Claude briefing + sends a Twilio SMS. The "already sent today" latch caps per-user SMS to one/day, but: (a) every invocation costs a Supabase function invocation + full `profiles` table select + Claude + Twilio; (b) `briefing-audit` will force-send to ANY user whose 6 AM cron missed for any reason — on an outage recovery day that's the entire user base, on-demand.

**Why P0:** Same threat model V4 classified as P0 — public DoS amplifier with Claude + Twilio spend. The fix was scoped to `cron-dispatch` and these two functions were missed.

**Fix:** Mirror the `cron-dispatch` x-cron-secret check at the top of `serve()` in both functions; pass the header from migrations 046/047 via `public.cron_dispatch_headers()` (the helper from migration 063 is directly reusable). ~10 lines per function + a migration that re-registers both jobs.

---

### P0-3. Stripe webhook idempotency is half-shipped — V4 P0-4 only guards `customer.subscription.deleted`
**File:** `apps/web/src/app/api/stripe/webhook/route.ts:148-219`

The V4 P0-4 spec was an `event.id`-keyed dedup table + `ON CONFLICT DO NOTHING` short-circuit. That table was never created (`grep stripe_events supabase/migrations` returns nothing). What shipped is a single active-status defense at lines 208-214 inside the `customer.subscription.deleted` branch.

The other two handled events remain replay-vulnerable to Stripe's documented 3-day retry storm:
- A retried `invoice.payment_failed` arriving after the user re-paid will flip a paying customer `active → past_due` — they keep getting billed (Stripe is fine) but our briefings stop and the trial-ended SMS path fires at them.
- A retried `checkout.session.completed` re-runs `setStatus(supabase, "active")` and re-fires `sendPaymentConfirmation` (internally idempotent via `payment_email_sent_at`, but the email path is best-effort — a Resend outage during the retry window plus a Sentry log line that lies about success).

There is also no `event.created` ordering check; if a `subscription.deleted` arrives followed by an out-of-order older `subscription.deleted` it would defeat the active-status defense.

**Fix:** Migration `stripe_events(event_id text PRIMARY KEY, type text NOT NULL, processed_at timestamptz DEFAULT now())`. At the top of the handler, after signature validation: `INSERT INTO stripe_events VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING event_id` — if no row returned, short-circuit 200 (already processed). The current active-status check stays as belt-and-suspenders. ~30 lines + migration.

---

### P0-4. `customer.subscription.updated` is not handled — Stripe-portal cancels never sync to our DB
**File:** `apps/web/src/app/api/stripe/webhook/route.ts:148`

The webhook handles three event types: `checkout.session.completed`, `invoice.payment_failed`, `customer.subscription.deleted`. The Stripe Customer Portal — which we link from `/dashboard/billing` — sets `cancel_at_period_end = true` on a cancel; the actual `customer.subscription.deleted` only fires when the period ends, which could be up to 30 days later. Between those two events, Stripe emits `customer.subscription.updated`. We ignore it.

Consequences:
1. **User cancels in portal:** our `subscription_status` stays `active` for up to 30 days — they keep getting briefings AND we keep showing them the "Subscribed" banner. Stripe stops billing them at period end; we don't notice. The trial-ended SMS pipeline never fires because the V4 P0-1 flip only catches trial users.
2. **`past_due → active` recovery:** user updates their card in portal → Stripe flips status to `active`, fires `invoice.payment_succeeded` and `customer.subscription.updated`. We handle neither. Our DB stays `past_due` forever; briefings stay paused; user is paying for a product that's silenced.
3. **Trial conversion to paid:** Stripe fires `customer.subscription.updated` when a trial converts. We miss it. We rely on `checkout.session.completed`, which only fires once at the *start* of checkout.

**Fix:** Add a `customer.subscription.updated` case that maps Stripe `status` (`active|past_due|canceled|trialing|unpaid|incomplete|incomplete_expired`) to our 4-state enum and writes the result. Add `invoice.payment_succeeded` to recover `past_due → active` quickly. Track `cancel_at_period_end` separately so the UI can show "Cancels Jun 21" without flipping `subscription_status`. ~30 lines.

---

### P0-5. `sync_status = 'needs_reconnect'` violates the DB CHECK constraint — V3 P1-C1 reconnect-CTA fix has never worked in production
**Files:** `supabase/migrations/009_calendar.sql:24`, `apps/web/src/lib/calendar/sync.ts:80`, `apps/web/src/app/(dashboard)/dashboard/calendars/page.tsx:408-426`

The `calendar_connections` schema:
```sql
sync_status TEXT NOT NULL DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error'))
```

The V3 P1-C1 fix at `sync.ts:80` writes:
```ts
sync_status: isRevoked ? "needs_reconnect" : "error"
```

The UPDATE throws Postgres error 23514 (check_violation) on every revoked-token write. The exception then propagates up through `syncCalendarForConnection`, the calling cron's catch block logs to Sentry, and the connection sits in `'syncing'` forever from the head-of-sync stamp at sync.ts:22. The dashboard's "Reconnect Google" CTA — gated on `sync_status === 'needs_reconnect'` — **never renders.**

Every "Google access revoked, click reconnect" recovery flow described in the V3 and V4 audits is broken. A user whose Google token gets revoked (auth incident, password change, Workspace admin policy) has no in-product affordance to recover; their calendar silently stops syncing and the briefing degrades to stale data.

**Fix:** Migration that extends the constraint:
```sql
ALTER TABLE calendar_connections DROP CONSTRAINT calendar_connections_sync_status_check;
ALTER TABLE calendar_connections ADD CONSTRAINT calendar_connections_sync_status_check
  CHECK (sync_status IN ('idle', 'syncing', 'error', 'needs_reconnect'));
```
Plus a smoke test that exercises the revoked-token path on a fresh test connection so this can't regress silently again.

---

### P0-6. Onboarding completion is fire-and-forget — silent failure puts users back in the onboarding loop AND skips their first briefings
**File:** `apps/web/src/app/onboarding/done/page.tsx:18-25`

```ts
supabase.auth.getUser().then(({ data: { user } }) => {
  if (user) {
    supabase
      .from("profiles")
      .update({ onboarding_step: 5, onboarding_completed: true })
      .eq("id", user.id);   // ← unawaited; no error handling
  }
});
```

If the UPDATE fails (network blip, RLS hiccup, schema drift, brief Supabase blip), the user reads "First briefing tomorrow at 6 AM" while the DB row is unchanged. On their next visit, middleware sees `onboarding_completed = false` and bounces them back to `/onboarding/sms-setup`. They restart from step 1 — including re-entering payment. No telemetry: Sentry never sees this failure mode.

Worse, the briefing crons all filter `onboarding_completed = true` — so until the user re-runs onboarding, they miss day-1, day-2, etc. briefings. Combined with the trial-flip timeline, a worst-case user can lose 3-4 days of product value before the welcome SMS reminds them to restart.

**Fix:** Await the update, capture errors to Sentry, render a "Saving your setup..." pending state, navigate to the success view only on success. Or — better — move the completion flag write to the server-side action that lands the user here (the `/api/account/onboarding-complete` handler should be the source of truth, not a client effect).

---

### P0-7. Privacy + Terms direct users to delete their account at `/dashboard/account` — a 404 URL
**Files:** `apps/web/src/app/privacy/page.tsx:183`, `apps/web/src/app/terms/page.tsx:234`

Both legal documents include a deletion-rights paragraph telling users to visit `/dashboard/account` to delete their account. That route does not exist (the dashboard tree is `billing/`, `calendars/`, `family/`, `settings/`, and a top-level `page.tsx`). Visiting `/dashboard/account` returns a Next.js 404.

The `DELETE /api/account` handler exists and is well-implemented — but it has no UI surface anywhere. Settings page has Phone, Notifications, Sign out, no Delete. A CCPA enforcement letter or GDPR DPA inquiry that follows the published policy will hit a broken link, which is a documented promise the product fails to honor. Regulator-bait for a product about to onboard paying families.

**Fix (today, fastest):** Update both legal docs to read "To delete your account, email hello@kinai.family with subject 'Delete account' from the email on file. We'll delete within 30 days." Two `string` edits.

**Fix (right):** Ship a Delete-account section in `settings/page.tsx` (confirmation modal → POST to `/api/account` → sign out → redirect to landing) and keep the legal-doc references at `/dashboard/settings`. Closes V4 P1-E2 simultaneously. ~50 lines.

---

### P0-8. Test endpoint can send arbitrary briefings to any user with just CRON_SECRET — no admin-phone allowlist
**Files:** `apps/web/src/app/api/test/morning-briefing/route.ts:36-106`, `supabase/functions/morning-briefing/index.ts:68-162`

V4 P0-6 deleted the drifting Node copy of the briefing pipeline and re-routed the test endpoint to proxy the production edge function via `target_phone` + `dry_run` + `x-cron-secret` header. This kills drift permanently (correct) and is gated on CRON_SECRET (correct). But CRON_SECRET is the **single shared bearer** used by:
- Every Vercel cron route (`cleanup`, `engagement-nudges`, `sunday-checkin`, `pickup-risk`, `calendar-renewal`)
- The `cron-dispatch` edge function
- Supabase Vault (migration 063)
- `/api/test/morning-briefing`

If CRON_SECRET leaks through any of those paths, an attacker with the bearer can:
1. **Enumerate which phone numbers have profiles** — `target_phone` lookup returns 404 vs 200.
2. **Read any user's full briefing including private calendar event details** — dry_run=true returns the generated text + context + family_name + timezone + billing status.
3. **Force-send arbitrary SMS at any user, multiple times per day** — dry_run=false bypasses the local-hour and already-sent guards on purpose (explicit comment in edge function).

There is no `ADMIN_PHONES` restriction on `target_phone`, no rate limit, no audit row.

**Why P0:** SMS-spray at arbitrary users + private-calendar-event read are both directly user-harming. CRON_SECRET's blast radius is now "send arbitrary briefings to any user, at any time of day" — vastly larger than its name suggests.

**Fix:** Mirror `ADMIN_PHONES` from `/api/ops/metrics/route.ts:26` into the edge function's `handleTestInvocation`. Require `target_phone` be in the admin set on `send=true`. For `dry_run=true`, restrict response to the briefing text + duration_ms — strip `family_name`, `timezone`, billing status, context. ~20 lines.

---

## P1 — Should Fix Before Beta Week 1 (47)

V4 had 27 P1 items. Most did not land in commit `78e5bf3` — they re-appear here verbatim alongside new V5 findings.

### Code quality (3)

**P1-Q1 (carried from V4 P1-Q1).** Root `npm test` still broken — `package.json:7` invokes `vitest run --workspace`. Vitest 4 dropped that flag. CI works around per-package; local devs hit the wall. Rewrite to `npm run test -w @kin/shared && npm run test -w @kin/web`.

**P1-Q2 (NEW).** **Zero test coverage for any V4 P0 fix.** `expireUnpaidTrials`, the cron-dispatch auth gate, the Stripe webhook regression-guard — all are revenue/compliance paths. Shared test count regressed 12 → 11 in the V4 commit; the drift test was deleted as part of P0-6 (correct) but no replacement tests were added for the new logic. Add unit tests for each: happy path + negative gate (no flip when conditions aren't met).

**P1-Q3 (escalated from V4 P2-Q3).** CI still does not run `next build` (`.github/workflows/ci.yml`). Lint + typecheck + unit tests can all pass while a server-component import or Vercel-specific build issue lands red on the next deploy. Add `npx next build` as a CI step.

### Auth & Access Control (5)

**P1-A1 (carried from V4 P1-A1).** `/ops` is not in middleware `protectedRoutes` — `middleware.ts:8` still lists only `["/dashboard", "/onboarding"]`. Unauthenticated visitors get the rendered shell of the ops dashboard until the client fetch to `/api/ops/metrics` returns 401. Info disclosure of admin-route existence + UX flash. One-line fix.

**P1-A2 (carried from V4 P1-A2).** Third admin phone (`+16266761832`, Jontae's secondary) still missing from `ADMIN_PHONES` in `apps/web/src/app/api/ops/metrics/route.ts:26`. One-line fix.

**P1-A3 (NEW). `/api/stripe/checkout` + `/api/stripe/portal` accept protocol-relative open-redirect via `successPath` / `returnPath`.** Files: `apps/web/src/app/api/stripe/checkout/route.ts:53-58, 131-132`; `apps/web/src/app/api/stripe/portal/route.ts:17, 52`. Both routes concatenate as `${baseUrl}${successPath}`. `successPath = "//evil.com/page"` resolves to `https://evil.com/page` (RFC 3986: `//host` is a protocol-relative URL). After the user pays $39, Stripe redirects them to the attacker page with warm session cookies. **Fix:** validate the path starts with `/` and NOT `//`; or allowlist a fixed set of paths.

**P1-A4 (NEW). `handle_new_user` trigger has no ON CONFLICT on `profiles.phone_number` UNIQUE constraint.** `supabase/migrations/054_trial_14_days.sql:16-32`. Phone-number recycling is real for US mobile (FCC ~37M recycled numbers/year); the trigger raises and leaves auth in inconsistent state. **Fix:** wrap the INSERT with `ON CONFLICT (id) DO NOTHING` + a separate phone-claim UPDATE conditional on the prior row no longer being active.

**P1-A5 (NEW). Account-delete is 10 sequential awaits with no transaction.** `apps/web/src/app/api/account/route.ts:39-148` (escalated from V3 P2-A2). Mid-route Vercel timeout (10s Hobby) leaves orphaned partial state — chat/calendar/conversation rows deleted but profile and auth.users intact, OR profile deleted while household partner FK is silently nullified. GDPR/CCPA promise exposure on partial deletion. **Fix:** move all 10 steps into a Postgres function `delete_user_account(uid uuid)` invoked via `admin.rpc(...)`; call `admin.auth.admin.deleteUser` only on success. ~50 lines.

### SMS pipeline (7)

**P1-S1 (carried from V4 P1-S1).** Inbound webhook's `formatTime` still hardcodes `timeZone: "UTC"` — `apps/web/src/app/api/sms/inbound/route.ts:67-73`. The V3 P1-B2 fix landed in `sms-briefing.ts`, which V4 P0-6 deleted; the inbound webhook copy was never updated. 9 AM PT events render as "16:00" in the SMS Q&A system prompt. Three-line fix: thread `profileRow.timezone` through `formatTime`.

**P1-S2 (carried from V4 P1-S4).** STOP/HELP/INFO/START handlers still run BEFORE the messageSid idempotency lookup at `inbound/route.ts:167-229, 240`. DB ops for STOP are idempotent (gated on `.is(..., null)`), but HELP/START retries re-emit a billed outbound segment. Move the handlers below the sid cache and store the sid with their inbound rows.

**P1-S3 (carried from V4 P1-E4).** `extractPhone` in `sms-onboarding.ts:631-642` still accepts 11–15 digit international numbers and hands them to `dispatchPartnerInvite` → Twilio. The two phone-validation surfaces (`extractPhone` and `normalizePhone`) have diverged twice now — V3 P1-E3 fixed it once, V4 P1-E4 flagged it again, V5 confirms it's still open. **Fix:** reuse `normalizePhone` from `sms-access.ts`. One import + one line.

**P1-S4 (NEW). Admin SMS-approve route does not honor `sms_opted_out_at` — direct TCPA violation.** `apps/web/src/app/api/admin/sms/approve/route.ts:54-70`. A user who joined the waitlist, texted STOP, and is later admin-approved receives `APPROVED_MESSAGE` because the admin client doesn't filter on `waitlist.sms_opted_out_at` or `profiles.sms_opted_out_at`. Textbook TCPA — a user who explicitly opted out gets messaged because admin "approval" bypasses the latch. **Fix:** before `sendSms`, check both opt-out columns; skip the SMS (still mark approved). ~10 lines.

**P1-S5 (NEW). `analyzeConversationForContext` is fire-and-forget — killed by Vercel serverless return.** `inbound/route.ts:612-618`. `void analyzeConversationForContext(...)` runs before `return twimlReply(reply)`. Vercel terminates execution on response return, so the unawaited Claude call is killed ~always. Household context updates silently fail in production. **Fix:** wrap in `next/server`'s `after()` hook so the runtime stays alive past response.

**P1-S6 (NEW). `/api/invite/[code]` GET is public, unauthenticated, and echoes `inviteeEmail` to the caller.** `apps/web/src/app/api/invite/[code]/route.ts:13-105`. 64-bit code entropy isn't brute-forceable, but a leaked SMS log fragment or shoulder-glance exposes the recipient's email to anyone with the code (no auth required). No rate limit either. **Fix:** drop `inviteeEmail` from the public response (return only `valid`, `inviterName`, `familyName`, `expiresAt`); add per-IP rate limit.

**P1-S7 (NEW). Invite-accept has TOCTOU between household-link and accept-marking.** `apps/web/src/app/api/invite/[code]/accept/route.ts:101-125`. Two non-atomic updates (`profiles.household_id`, then `household_invites.accepted`). Two authenticated users racing the same code through the 5/min/user rate-limit window can both pass the `accepted=false` check, both write `household_id`, only one wins the accept update. The loser is silently linked to a household whose invite shows a different `accepted_by_profile_id`. **Fix:** atomic conditional `UPDATE household_invites SET accepted=true ... WHERE invite_code=$1 AND accepted=false RETURNING inviter_profile_id`; only on success update profiles.

### Briefing system (5)

**P1-B1 (carried from V4 P1-B1).** Pickup-risk + coordination_issues never made it into `_shared/briefing.ts`. The deleted `apps/web/src/lib/sms-briefing.ts` was the only path that surfaced live pickup-risk and OPEN coordination_issues in the briefing prompt. The canonical edge function has weather + travel times + calendar staleness; it does not call `detectPickupRisk` or fetch `coordination_issues`. A parent with a RED pickup-risk window today gets a briefing that doesn't even mention it. **Fix:** port both into `buildBriefingContext`. ~80 lines.

**P1-B2 (carried from V4 P1-B3).** Plaintext fallback still opens with `${dateLabel} — here's what your calendar shows:` (`_shared/briefing.ts:929-938`), which violates the SYSTEM_PROMPT's no-greetings rule. `quickQualityCheck` is skipped on the degraded path AND `quality_grade` is left null, so the trend dashboard sees no signal on outage days. **Fix:** either change opening to substance or persist `quality_grade = 'F'` + `quality_score = 0` on the degraded path (the migration 061 check constraint allows 'F').

**P1-B3 (carried from V4 P1-B4).** UTF-8 segment math still character-based at three slice sites in `_shared/briefing.ts` (`buildPlaintextBriefing`, AI path, degraded path). `.slice(0, 600)` counts UTF-16 code units. A single em-dash, curly quote, or accented family-name character flips the message into UCS-2 (70-char segments), turning the assumed 4-segment cap into 9 billed segments. Strip non-GSM-7 before the slice OR compute Twilio segment count and slice to fit 4 segments.

**P1-B4 (carried from V4 P1-B5).** Hour-boundary race in `morning-briefing/index.ts:234-241` unchanged. Fan-out reads `new Date()` live per profile inside the loop. A cron starting at 5:59:55 UTC that takes >5s to reach later profiles sees `getLocalHour === 7` and skips them. Audit backstop catches them at 9 AM CT but the user lost their 6 AM window. **Fix:** capture `processStartUtc = new Date()` once at top and pass through to `getLocalHourAt(tz, at)`. ~15 lines.

**P1-B5 (carried from V4 P1-B6).** No sole-parent guard in `quickQualityCheck` (`briefing-quality.ts:121-182`). A sole parent can get "your partner can cover the 3 PM pickup" referring to nobody. Add a pattern check for `\b(your partner|the other parent|co-parent)\b` when context has no partner section. ~25 lines.

### Calendar sync (6)

**P1-C1 (carried from V4 P1-C1).** Apple Calendar still ignores `CLASS:PRIVATE` / `CLASS:CONFIDENTIAL` — `apple.ts:101-118, 121-144`. `parseICalEvent` doesn't read VEVENT CLASS; `appleEventToKinEvent` never sets `visibility`. Once P0-5 (`needs_reconnect` CHECK) lands and the briefing's private-event-stripping logic can actually fire, Apple-side private events still leak by name. **Fix:** read `vevent.getFirstPropertyValue("class")`, lowercase, set on returned event.

**P1-C2 (carried from V4 P1-C4).** Google disconnect leaves push channels live forever — both halves still open. `DELETE /api/calendar/google` deletes the row but never calls `stopGoogleWebhook`. The webhook returns 404 (not 410) for unknown channels, so Google retries every non-410 indefinitely. After a disconnect, Google pings a 404 until the channel expires (up to 7 days). **Fix:** call `stopGoogleWebhook` before the row delete (try/catch so it doesn't block); change webhook 404 → 410.

**P1-C3 (carried from V4 P1-C3).** OAuth callback persists `undefined` refresh_token when Google omits it on re-consent (`google/callback/route.ts:69-89`). Next sync calls `refreshGoogleToken(undefined)` → throws "No refresh token is set" — error string doesn't match `isRevokedTokenError`, so connection lands in `sync_status: 'error'` with no reconnect CTA. **Fix:** fetch existing connection first; don't overwrite a good refresh_token with undefined; extend `isRevokedTokenError` to match `/no refresh token is set/i`.

**P1-C4 (carried from V4 P1-E3).** Concurrent calendar sync has no locking — webhook + manual sync race in `lib/calendar/sync.ts:16-94`. Two concurrent calls both consume the same `google_sync_token`; the second gets 410, forces full resync, clobbers the first's progress. **Fix:** Postgres advisory lock keyed on connection_id, OR `UPDATE ... WHERE sync_status != 'syncing' RETURNING *` claim pattern.

**P1-C5 (NEW). Apple Calendar event deletions never reconciled — stale events accumulate forever.** `sync.ts:201-247`. Apple events deleted on Apple's side don't appear in the next response; we never sweep missing events. Same problem on Google full-resync. A deleted dentist appointment keeps appearing in the briefing for months. **Fix:** before the upsert loop, query existing events for the connection; build a set of `external_id`s seen this sync; mark pre-existing rows NOT in the set as `deleted_at = now()`.

**P1-C6 (NEW). Google secondary calendars never synced — `syncGoogleCalendar` hardcodes `"primary"`.** `sync.ts:122`, `google.ts:83-138`. School district calendars, sports leagues, partner shared calendars, kid's pediatric portal — none sync. For the exact use case Kin was built for, the most coordination-relevant events are invisible to the briefing. **Fix (beta-grade):** sync every non-hidden calendar from `calendarList.list()` by default. **Fix (post-beta):** picker UI + N rows per profile after dropping the V4 P1-C2 UNIQUE constraint.

### Portal / Stripe / Billing (3)

**P1-P1 (carried from V4 P1-Sec3).** No rate limits on `/api/stripe/checkout`, `/api/stripe/portal`. An authenticated user can hammer either route. Checkout enumerates active promotion codes via `resolveDiscount` — every coupon attempt is a Stripe API call, moderate risk of Stripe rate-limiting our account. **Fix:** `rateLimit("stripe-checkout", userId, { window: "1m", limit: 5 })` at the top of each handler.

**P1-P2 (carried from V4 P1-P2).** `/api/stripe/portal:52` uses `${process.env.NEXT_PUBLIC_APP_URL}${returnPath}` with no fallback. Preview environments or misconfigured deploys hit `undefineddashboard/billing` — Stripe rejects with an opaque "Invalid URL". Mirror checkout's pattern: `process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin`.

**P1-P3 (NEW). Stripe webhook can't resolve profiles missing `stripe_customer_id`.** `webhook/route.ts:45-68`. `setStatus` resolves by `userId` (metadata) or `customerId` (Stripe customer ID). For events where the customer mapping hasn't propagated to our profile (race, manual customer creation, portal-initiated subscription), the webhook silently no-ops via Sentry.captureMessage at line 64. A `past_due` user gets briefings that should have been gated. **Fix:** add email-based resolution as a third fallback (`supabase.from("profiles").select("id").eq("email", customer.email)`); stamp `stripe_customer_id` when found.

### Landing page + Legal (5)

**P1-L1 (carried from V4 P1-L1).** BriefingDemo still opens with "Good morning, Sarah" — `components/BriefingDemo.tsx:23` unchanged. The production SYSTEM_PROMPT forbids "Good morning" openings; `quickQualityCheck` flags it as a critical Slack alert. Demo voice contradicts product voice in the most conversion-critical surface. Rewrite to lead with substance.

**P1-L2 (carried from V4 P1-L2).** WaitlistForm submission gate still at 7 digits (`WaitlistForm.tsx:42`). Server rejects with a generic error. Raise to 10 digits and add inline help.

**P1-L3 (carried from V4 P1-L3).** WaitlistForm error auto-clears after 4s. Slow readers lose context. Clear on next phone-input keystroke, not on timer.

**P1-L4 (NEW). Terms still references "monthly or annual basis"** — `terms/page.tsx:138`. V4 P0-3 removed the annual toggle from Pricing.tsx but left the Terms language. Strip "or annual" or add "Monthly billing only during beta. Annual plans available in the future."

**P1-L5 (NEW). Privacy doc lists Twilio/Stripe/etc but omits Slack webhooks and Resend.** `privacy/page.tsx:156-167`. Both are real third-party data destinations (founder alerts, scorer warnings, transactional email). GDPR Art. 13(1)(e) requires every recipient category. Add Slack + Resend.

### Portal / Dashboard (3)

**P1-D1 (carried from V4 P1-P1).** Settings timezone hint at `dashboard/settings/page.tsx:312` still says "Detected from your device — this sets when 6:00 AM lands." Value is display-only, never PATCHed. Rewrite: "Detected from your device. We use the timezone you set up over text — reply with your city to change it."

**P1-D2 (carried from V4 P1-P3).** No mailto link for phone change (`settings/page.tsx:290`). Hint says "text Kin or reach out to support" with no clickable affordance. Add `mailto:hello@kinai.family?subject=Change%20my%20phone%20number`.

**P1-D3 (NEW). Error pages don't capture to Sentry.** `error.tsx`, `global-error.tsx`, shared `RouteError`. Every boundary's `useEffect(() => { console.error(error); })` only logs to client console — invisible in Sentry. For a beta product where rare frontend crashes will be a high-signal bug-report source, this is a real observability gap. Add `Sentry.captureException(error, { extra: { digest: error.digest } })` in each.

### Infrastructure (6)

**P1-I1 (carried from V4 P1-I3).** Still no security headers in `next.config.mjs` — no CSP, HSTS, X-Frame-Options, Permissions-Policy, X-Content-Type-Options. Family-data product should ship these. Add a `headers()` function with the standard set.

**P1-I2 (carried from V4 P1-I5).** Cleanup cron still claims to send 75-day reminder emails but the loop is a no-op (`cron/cleanup/route.ts:27-43`). `deletion_reminded = true` is flipped and Sentry logs "sent N reminders" — but no `sendEmail` call exists. **Operationally we ship "we'll remind you before deletion" without delivering**, AND once the email path lands, the cron will skip these users (deletion_reminded already true). **Fix (today):** revert the `deletion_reminded = true` flip until email lands. **Fix (right):** wire `sendEmail` from `@/lib/email` (Resend).

**P1-I3 (carried from V4 P1-S5).** Rate-limiter still gracefully degrades to allow-all in production when Upstash env vars missing — `lib/rate-limit.ts:117-119`. A secret rotation that fails to persist silently disables ALL rate limits (SMS, ops, invite, chat). **Fix:** fail-closed when `NODE_ENV === "production"` and env is absent. Surface a `rate_limit_degraded: true` indicator on the ops dashboard.

**P1-I4 (carried from V4 P1-Sec2 + V4 P1-Sec3).** Still no rate limits on `/api/invite` (3/user/day), `/api/account/onboarding-complete` (5/min/user), `/api/stripe/checkout` (5/min/user, also flagged P1-P1), `/api/stripe/portal` (5/min/user). Invite is the worst — an authenticated user can spam partner-invite SMS at arbitrary numbers.

**P1-I5 (carried from V4 P1-Sec1).** Sentry has no `beforeSend` PII scrubbing in `apps/web/sentry.client.config.ts` or `sentry.server.config.ts`. Every `Sentry.captureException` in Stripe-webhook / chat / invite / account-delete / sms-inbound forwards raw error objects that may include phone/email/household_ids. The V3 fix only patched the cleanup-cron breadcrumb. Add a global `beforeSend` hook that scrubs `event.request`, `event.user`, `event.extra`.

**P1-I6 (NEW). Cron-dispatch Vault bootstrap not verified by migration 063.** The migration documents `vault.create_secret(...)` as a one-time bootstrap in a comment. If Austin forgets or the bootstrap state is lost (vault rotation, project restore), `cron_dispatch_headers()` returns an empty header and every sub-daily cron silently 401s. Add a `DO` block at the top of migration 063 that raises if the vault secret is missing. ~10 lines. Also add an ops-dashboard tile pinging cron-dispatch with the secret and reporting last successful run per job.

### Edge cases (3)

**P1-E1 (carried from V4 P1-E1).** Trial-ended nudge has no `canceled_at` time window — `engagement-nudges/route.ts:355-363`. Latched by `nudges_sent->>'trial_ended'`, so first-time correct. But combined with P0-1 fixed, this query immediately texts every existing trial user on their first day of canceled. Add a `canceled_at` timestamp + only fire when `canceled_at > now() - interval '3 days'`. Reset the key on resubscribe.

**P1-E2 (NEW). `/api/account/onboarding-complete` swallows all errors as 200.** `apps/web/src/app/api/account/onboarding-complete/route.ts:116-119`. `catch { return NextResponse.json({ ok: false }); }` returns success-shape for any unexpected error — Sentry never sees it. Add `Sentry.captureException(err)` in the outer catch. Plus add rate limit (P1-I4 above) — the welcome-SMS is latched but the initial run still costs.

**P1-E3 (carried from V4 P1-C2).** `calendar_connections UNIQUE(profile_id, provider)` blocks adding a second Google account, but the UI says "Connect another calendar." A parent with personal + work Google accounts gets their tokens silently overwritten on the second connect. **Fix:** drop the constraint and add `UNIQUE(profile_id, provider, google_calendar_id)`. (Bundled with P1-C6 multi-calendar work.)

---

## P2 — Polish (40)

### Code quality (4)
- **P2-Q1.** Same 2 TS errors in `chat-agentic-loop.test.ts:98,129` (`stop_details` not on `Message` type). Carried since V3.
- **P2-Q2.** `as unknown as Promise<...>` casts at 8 sites in `sms/inbound/route.ts`. Replace with typed `createClient<Database>`.
- **P2-Q3.** Shared test count regressed 12 → 11 in commit `78e5bf3`. Drift test deleted (correct, per P0-6); no replacement added.
- **P2-Q4.** `.env.example:90` still has `ACTIVITY_ALERT_EMAIL=austin.ford1519@gmail.com`. Carried since V3 P2-I1.

### Auth (6)
- **P2-A1.** auth/callback `next` param not validated. `next.startsWith("/") && !next.startsWith("//")` + 200-char cap.
- **P2-A2.** Demo password `KinDemo2026!` hardcoded in client bundle — `(auth)/signin/page.tsx:66`. Ensure demo account is fully siloed.
- **P2-A3.** Constant-time secret compare not used in Node-side admin/cron routes (`cron-auth.ts:23`, `admin/sms/approve/route.ts:31`, `test/morning-briefing/route.ts:40-41`). Edge functions use `timingSafeEqual` correctly; Node side uses `===`. Defense in depth.
- **P2-A4.** `dispatchPartnerInvite` invite codes reused on re-send. Acceptable; flag for an admin "rotate code" endpoint post-beta.
- **P2-A5.** Stripe coupon enumeration via timing on `resolveDiscount`. Negative cache + per-user coupon-attempts rate limit.
- **P2-A6.** Sign-out doesn't `router.refresh()` — in-memory client state persists until full reload.

### SMS pipeline (6)
- **P2-S1 (carried).** STOP regex still `^STOP$/i` — misses "STOP.", "stop please". Twilio catches at carrier; `sms_opted_out_at` never stamped on variants. Trim trailing punctuation or use `\b`.
- **P2-S2.** Idempotency reply pairing race (V4 P2-S3) — two inbound messages within the same second can mis-pair. Add `replied_to_id` FK.
- **P2-S3 (NEW).** No Twilio StatusCallback — outbound delivery is blind. A briefing Twilio queues but never delivers (carrier filter, deactivated number) silently disappears. Needs new `/api/sms/status` route + `message_sid` column. ~2 hours; defer to post-beta.
- **P2-S4 (NEW).** Waitlist signup Twilio retry has no idempotency — bypasses `sms_conversations` because no profile_id exists yet. Needs dedicated dedup-without-profile_id table.
- **P2-S5 (NEW).** Idempotency in-progress race window (V4 P1-S3) — the 12s Claude budget creates a tiny window where Twilio retries don't see the cached reply. Pre-insert sentinel row at top of POST.
- **P2-S6.** Inbound webhook outbound history filter on `direction != "outbound_failed"` doesn't cover delivery-time failures (depends on P2-S3 StatusCallback).

### Briefing (5)
- **P2-B1.** Quality scorer threshold still 80 (`briefing-quality.ts:32`) — drop to 70 for beta weeks 1-2.
- **P2-B2.** Briefing-audit dedup row read before SMS send creates double-send window under retry. Use a "claim" pattern: `INSERT ... ON CONFLICT DO NOTHING RETURNING id` first.
- **P2-B3.** Test endpoint generates briefing without subscription gate (`handleTestInvocation` in edge function) — defense-in-depth.
- **P2-B4.** Hardcoded model strings (`claude-sonnet-4-6`, `claude-haiku-4-5-20251001`) in `_shared/briefing.ts`. Extract to env vars.
- **P2-B5.** Hawaii backstop window — 6 AM HST = 16:00 UTC, after the 14:00 UTC audit fires. Flag for V2 multi-zone audit scheduling.

### Calendar (4)
- **P2-C1.** Token expiry `<= new Date()` race (V4 P2-C2). Change to `<= Date.now() + 60_000`.
- **P2-C2.** Conflict detection's `is_shared` requirement unreachable from synced events (V4 P2-C1). Drop the requirement or set `is_shared: true` on multi-attendee events.
- **P2-C3.** Apple etag fallback when undefined — write amplification or no-update race.
- **P2-C4.** Google attendees / organizer / RRULE not stored — asymmetric vs Apple. Defer.

### Portal / Stripe (2)
- **P2-P1.** Pricing "Early access price — locked in forever" (`Pricing.tsx:259-261`) is a marketing promise with no code mechanism. Stripe price IDs change; no `early_access` flag exists on profiles. Either ship a grandfather flag or rewrite the line.
- **P2-P2.** Billing portal cancellation doesn't surface "we'll miss you" UX — status badge updates via webhook (once P0-4 lands). Defer.

### Landing / Legal (4)
- **P2-L1.** `LAST_UPDATED = "April 1, 2026"` on Privacy + Terms — stale, harmless.
- **P2-L2.** Sitemap missing `/signin`, `/signup`. SEO discoverability gap.
- **P2-L3.** No About / FAQ page. Trust gap; growth opportunity.
- **P2-L4.** Marketing palette `#ECE4D2` vs auth `#F7F3ED` — visible jump on landing → signup. Pick one.

### Infrastructure (3)
- **P2-I1 (carried).** Supabase project URL hardcoded in pg_cron migrations (046, 047, 058, 060, 063). Staging/preview can't apply without edits. Use a Vault secret or `current_setting('app.settings.supabase_url', true)`.
- **P2-I2.** Sentry has no `release` and no `tunnelRoute`. Ad-blockers block Sentry; family-product audience overlaps with privacy-extension users. Add `tunnelRoute: "/monitoring"` + `release: VERCEL_GIT_COMMIT_SHA`.
- **P2-I3.** `Already sent ... skipping` console.log in `morning-briefing/index.ts:255` fires per skipped profile per hour. Drop to debug.

### Security (2)
- **P2-Sec1 (carried).** `dangerouslySetInnerHTML` for static inline `<style>` blocks in `(auth)/signin/page.tsx:819`, `signup/page.tsx:419`. Static strings, not exploitable, but scanners flag. Move to CSS module.
- **P2-Sec2 (carried).** `sms_conversations` and `daily_questions` RLS enabled with no explicit policy. Deny-by-default holds; add explicit `FOR ALL USING (false)` for clarity.

### Edge cases (4)
- **P2-E1.** Trial user on day 14 of trial: race between expire-flip and same-morning briefing. Flip runs at 16:00 UTC; briefing fires at user's local 6 AM (10:00–14:00 UTC for mainland US). No race today, but the relative timing is implicit. Pin the flip to run before 08:00 UTC.
- **P2-E2.** Multi-day all-day events fixed in `_shared/briefing.ts` AND `sms/inbound/route.ts`; verify no other "today's events" queries lurk in `pickup-risk.ts`, `engagement-nudges`, or future code.
- **P2-E3.** SidebarNav `nextBriefCountdown()` uses browser local 6 AM, not user's stored timezone. PT user viewing dashboard from CT business travel sees wrong countdown.
- **P2-E4.** Multi-word `family_name` parsing assumes Western "First Last" (`_shared/briefing.ts:678-693`).

---

## V4 P0 verification table

| V4 P0 | Status | V5 finding |
|---|---|---|
| P0-1 (trial expiry flip) | ◐ Partial | Mechanism right; predicate excludes abandoned-checkout users — see V5 P0-1 |
| P0-2 (Sunday-checkin gate) | ✓ Fixed | Verified `sunday-checkin/route.ts:97-103` |
| P0-3 (annual pricing removed) | ✓ Fixed | `Pricing.tsx` clean; no $299/annual references in lib/stripe |
| P0-4 (Stripe webhook idempotency) | ◐ Partial | Only `subscription.deleted` guarded — see V5 P0-3 + P0-4 |
| P0-5 (cron-dispatch caller auth) | ◐ Partial | `cron-dispatch` correct; `morning-briefing` + `briefing-audit` bypass it — see V5 P0-2 |
| P0-6 (test-endpoint visibility leak) | ✓ Fixed | `sms-briefing.ts` deleted, proxy in place — but new attack surface — see V5 P0-8 |
| P0-7 (multi-day all-day events) | ✓ Fixed | Verified at 4 sites: `_shared/briefing.ts:733-734`, `sms/inbound/route.ts:447-448, 465-466` |

---

## What's working well (carried forward + new)

### V3 + V4 fixes that hold up
- **V3 P0-1 (briefing subscription gating)**: present in both `morning-briefing/index.ts:204` and `briefing-audit/index.ts:47` with `(trial,active)` + `billing_exempt` filter.
- **V3 P0-2 (Anthropic 30s timeout)**: `_shared/briefing.ts:863-922` — 30s AbortController, 3 retries, AbortError retryable, `clearTimeout` in finally. Bounded ~90s worst case.
- **V3 P0-3 (600-char cap math)**: `_shared/briefing.ts:953-955, 969-971` — total cap and nudge separator correctly reserved only when nudge appended.
- **V3 P0-4 (SMS inbound idempotency)**: migration 062 partial unique index intact; pre-insert + 23505 conflict fallback both code paths verified.
- **V3 P0-5 (STOP footer on waitlist)**: `WAITLIST_MESSAGE`, `APPROVED_MESSAGE`, all `waitlist-sms.ts` re-prompts, and `/api/waitlist` `CONFIRMATION_SMS` all carry the footer.
- **V4 P0-2 (Sunday-checkin gating)**, **V4 P0-3 (annual toggle removal)**, **V4 P0-6 (test-endpoint visibility — though attack surface widened, see V5 P0-8)**, **V4 P0-7 (multi-day all-day events)** all landed cleanly.
- **V4 P0-1 + V4 P0-4 + V4 P0-5** landed but are partial — see V5 P0-1, P0-3, P0-4, P0-2.

### Structural strengths (carried forward)
- **Auth trigger reliability** — `handle_new_user()` (migration 054) creates a profiles row on every auth signup with NULL-email tolerance, phone seeding, 14-day trial stamp, `SECURITY DEFINER + SET search_path = public`. (Phone-collision behavior is V5 P1-A4.)
- **All three webhook signatures validated with constant-time compare**: Twilio (HMAC-SHA1 + sorted params + length-guarded `timingSafeEqual` at `lib/twilio.ts:112`), Stripe (`constructEvent` + Slack-critical on signature failure), Google (channel-token HMAC + length-guarded `timingSafeEqual`).
- **TCPA keyword handlers** — STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT, HELP, INFO, START, UNSTOP all implemented. Every automated outbound path filters `sms_opted_out_at` at fan-out AND at send time. (Admin approve route is V5 P1-S4.)
- **RLS enabled on every user-data table** with household-scoped policies. Service-role-only tables (`sms_approved_numbers`, `sms_waitlist`, `morning_briefing_log`) use `FOR ALL USING (false)`.
- **Service role isolation** — never exposed to `NEXT_PUBLIC_*`. Cron secret + admin secret independent.
- **cron-dispatch P0-5 fix is correct in isolation** — constant-time compare, fail-closed on missing env, 401 on missing/wrong header. The implementation pattern is reusable verbatim for V5 P0-2.
- **Idempotent briefing dedup** on `(profile_id, briefing_date_in_user_local_tz)`.
- **9 AM CT briefing-audit backstop** catches users missed by the primary 6 AM run.
- **Plaintext fallback always sends something** — users never get silence even on Anthropic outage.
- **Quality scorer (Haiku) running with two-layer checks** (regex `quickQualityCheck` + LLM judge), non-blocking, with sustained-outage alerting.
- **Lint clean, 38 tests passing** (27 web + 11 shared). Only TS errors are the 2 carried test-mock lines.
- **Ops dashboard founder-locked** (with the missing-phone caveat in V5 P1-A2) and rate-limited.
- **Error boundaries** on every route group: branded `error.tsx`, `not-found.tsx`, `RouteError` component. (Sentry capture is V5 P1-D3.)
- **Pricing consistent** across landing, billing, and Stripe price IDs for the monthly plan. Annual cleanly removed.
- **Legal pages substantive** — Privacy + Terms cover GDPR/CCPA, Google Calendar scopes, SMS consent, AI processing, household data. (Slack/Resend disclosure is V5 P1-L5; deletion URL is V5 P0-7.)
- **No hardcoded secrets** in any source file. `.env.local` gitignored.
- **No raw SQL string interpolation** in app code. All queries through Supabase's parameterized PostgREST.
- **No `body.profileId|user_id|household_id` trusted from request body** anywhere in `apps/web/src/app/api` (grep verified). Every API route resolves the actor's id from `getAuthenticatedUser` or `supabase.auth.getUser`.
- **OAuth scope minimal** — `calendar.readonly` only.

### Cost / scale
- **~$0.06/user/day** in third-party spend (Anthropic Sonnet briefing + Haiku scorer + Twilio + Distance Matrix). Healthy margin against $39/mo.
- At 1000 users, serial fan-out wall time becomes a concern (~33 min/hour at 2s/user). Bound the fan-out with `Promise.allSettled` chunks of 10-20 to keep per-batch wall time under 5 minutes. Pre-1000 users: no concern.
- Travel-time Distance Matrix has no daily quota guard (V4 P2-B2); not a beta-week-1 problem but cap by 10k-user scale.

---

## Recommended pre-launch sequence

### Today (P0 sprint, ~5 hours)
1. **P0-1 Trial-flip predicate fix** — drop `stripe_customer_id` predicate. 3 lines, 5 min. `apps/web/src/app/api/cron/engagement-nudges/route.ts:367`.
2. **P0-5 `needs_reconnect` CHECK migration** — 5 lines + smoke test. 15 min. New migration `064_calendar_sync_status_needs_reconnect.sql`.
3. **P0-7 Privacy/Terms /dashboard/account 404** — fastest is two `string` edits to legal docs pointing to `mailto:hello@kinai.family`. 5 min. Optionally batch with P0-7 alt + P1-D2 + V4 P1-E2 by shipping a settings Delete-account section (~50 min).
4. **P0-6 Onboarding done fire-and-forget** — await + Sentry capture + pending state. 15 min. `apps/web/src/app/onboarding/done/page.tsx:18-25`.
5. **P0-8 Test endpoint admin-phone allowlist** — mirror `ADMIN_PHONES`. 20 min. `supabase/functions/morning-briefing/index.ts:handleTestInvocation`.
6. **P0-2 morning-briefing + briefing-audit x-cron-secret** — 10 lines each + migration to re-register pg_cron jobs with header. 45 min.
7. **P0-3 Stripe webhook idempotency `stripe_events` table** — migration + insert-on-conflict short-circuit. 60 min.
8. **P0-4 `customer.subscription.updated` + `invoice.payment_succeeded` handlers** — ~30 lines. 45 min.

### This week (P1 sprint, ~6 hours)
- **Rate limits**: invite + checkout + portal + onboarding-complete (P1-I4). Rate-limit fail-closed in prod (P1-I3). Ops dashboard "rate_limit_degraded" tile.
- **Auth gates**: `/ops` middleware (P1-A1) + ADMIN_PHONES Jontae phone (P1-A2). 2 minutes total.
- **Stripe path allowlist** for successPath/cancelPath/returnPath (P1-A3).
- **Account-delete pg function** (P1-A5).
- **Calendar fixes**: Apple visibility (P1-C1), Google disconnect + 410 (P1-C2), refresh_token undefined (P1-C3), Apple deletions (P1-C5), Google secondary calendars (P1-C6).
- **SMS pipeline**: formatTime timezone (P1-S1), STOP/HELP/START sid cache (P1-S2), extractPhone +1 (P1-S3), admin approve opt-out check (P1-S4), `analyzeConversationForContext` after() (P1-S5).
- **Invite security**: drop inviteeEmail from public GET + rate limit (P1-S6); atomic accept (P1-S7).
- **Briefing**: pickup-risk + coordination_issues into `_shared/briefing.ts` (P1-B1). Plaintext fallback voice (P1-B2). UTF-8 byte math (P1-B3). Hour-boundary race (P1-B4).
- **Cleanup cron**: revert `deletion_reminded = true` flip until email path lands (P1-I2). Or wire Resend.
- **Sentry**: global `beforeSend` PII scrubbing (P1-I5) + Sentry.captureException in error boundaries (P1-D3).
- **Cron-dispatch Vault bootstrap check** (P1-I6).
- **Frontend polish**: BriefingDemo voice (P1-L1), WaitlistForm 10-digit + interaction-clear (P1-L2/L3), Terms "or annual" (P1-L4), Privacy Slack/Resend (P1-L5), settings timezone copy (P1-D1), phone-change mailto (P1-D2).
- **Trial-ended nudge canceled_at window** (P1-E1) — pair with P0-1 fix.

### Post-launch (P2 polish, ongoing)
- TS test-mock errors (P2-Q1).
- `as unknown as` cast cleanup (P2-Q2).
- CI `next build` step (P1-Q3, can move to P2 if launch-week capacity is tight).
- Sentry release + tunnelRoute (P2-I2).
- Multi-calendar UI (P1-C6 with full picker; beta-grade fix is sync-everything).
- Conflict detection `is_shared` (P2-C2).
- Token expiry race window (P2-C1).
- StatusCallback for Twilio outbound (P2-S3).
- About / FAQ page (P2-L3).
- Dashboard home with content vs. settings-redirect.

---

## Beta-launch readiness verdict

**GO with the eight P0 patches.** The system is meaningfully audited, the architecture is right, and the V3 + V4 fixes that landed cleanly hold up. What V5 surfaces is the layer underneath V4's louder issues — including two V4 P0 fixes that shipped only partially (Stripe webhook idempotency, cron-dispatch auth) and the most consequential single bug across three audits: the V3 P1-C1 reconnect-CTA fix that has never worked in production because it writes to a column whose CHECK constraint rejects the value.

The eight P0 items are tight in scope. The largest one (Stripe webhook full idempotency + missing event handlers) is ~90 minutes. The shortest (trial-flip predicate fix) is 5 minutes. Total P0 sprint is ~5 hours of focused work.

The bigger drag on beta readiness is the V4 P1 carry-over: of the 27 P1 items V4 identified, fewer than five appear to have landed. Most are 5–15 minute fixes (`/ops` middleware, ADMIN_PHONES, BriefingDemo greeting, WaitlistForm digit gate, settings copy). They will not land on their own. Recommend NOT carrying them into a V6 — ship them today.

Once the P0 sprint + the highest-impact P1 cluster lands, **B+ in practice** is well within reach for beta week 1. The system grade today is held back primarily by the partial V4 P0 fixes and the dead-code reconnect path; once those clear, the architecture is solid enough to support a real-paying-customer cohort.

Ship it — after these eight.
