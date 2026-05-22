# Kin Beta Readiness Audit v3

**Date:** 2026-05-22
**Branch:** main (HEAD `5015329`)
**Auditor:** Claude (Opus 4.7)
**Scope:** Full codebase + product surface — last gate before real families use the system
**Production URL:** kinai.family
**Supabase ref:** coxqdpcffmsncvisfyvj

---

## Overall Grade: **B+ (ship-ready with 5 P0 fixes)**

The system is structurally sound. Auth trigger creates profiles reliably. Signature validation on all three webhooks (Twilio, Stripe, Google) uses constant-time comparison. RLS is enabled on every user-data table. TCPA keyword handlers (STOP/HELP/INFO/START) are correctly wired. The morning briefing has a real fallback path, idempotent dedup, per-timezone delivery, and a live Haiku quality scorer. The ops dashboard is locked to founder phones.

What's holding it back from an A is a small set of **billing/cost leakage and TCPA-footer issues** that have to be patched before paid families start. Three of the five P0s are one-line fixes. Most P1 findings are visible UX polish (calendar reconnect prompts, theme toggle remnants, partner-name fallback strings) rather than architectural problems.

Previous audits closed all prior P0s and 7 P1s (HELP/INFO, plaintext fallback, prompt drift, error boundaries, phone-first signup, CI, Slack alerts). The quality scorer, ops dashboard, and calendar sync timeout fix all landed cleanly.

---

## Top-line summary

| Layer | Grade | P0 | P1 | P2 |
|---|---|---|---|---|
| Code quality (TS, lint) | A− | 0 | 0 | 1 |
| Auth flows | A− | 0 | 2 | 4 |
| SMS pipeline + compliance | B | 2 | 2 | 3 |
| Morning briefing | B | 2 | 4 | 3 |
| Calendar sync | B+ | 0 | 3 | 4 |
| Portal/landing | A | 0 | 3 | 6 |
| Infra/security | A− | 0 | 3 | 4 |
| Edge cases | B | 1 | 4 | 3 |
| **Total** | **B+** | **5** | **21** | **28** |

---

## P0 — Launch Blockers (5)

These will cause revenue leakage, TCPA exposure, or system hangs in production. Must fix before beta.

### P0-1. Briefings send to canceled/past_due subscribers — revenue + TCPA leak
**Files:** `supabase/functions/morning-briefing/index.ts:44`, `supabase/functions/_shared/briefing.ts:1008`

The edge function `SELECT`s `subscription_status` and `billing_exempt` from `profiles` but never filters on them. The only gating today is `onboarding_completed = true`. The 9 AM CT briefing-audit cron has the same gap.

**Impact:** A user whose Stripe subscription lapsed (or never started after trial) still receives a daily SMS — Twilio charges for it, and they never agreed to receive marketing comms post-cancellation. This is a recurring per-day per-user cost leak AND a 10DLC compliance issue ("transactional only for the duration of the relationship").

**Fix:** add to the briefing-eligible query:
```sql
.in("subscription_status", ["trial", "active"]).or("billing_exempt.eq.true")
```
Same change in `briefing-audit/index.ts`. Add a test in `__tests__/morning-briefing-gating.test.ts` for `subscription_status = "canceled"`.

---

### P0-2. Anthropic call in edge function has no timeout — cron hang risk
**File:** `supabase/functions/_shared/briefing.ts:851–893` (`callAnthropicWithRetry`)

The `fetch("https://api.anthropic.com/v1/messages", …)` has no `AbortController`. The retry loop is 3 attempts with `1s, 2s` exponential backoff between them. If the Anthropic socket stalls (not 5xx — actually hangs), each attempt could wait the platform's TCP timeout (~60–120 s). With 3 attempts that's potentially 3+ minutes per user, and the worker runs users in a tight loop.

**Impact:** A single stuck connection chains the morning briefing batch indefinitely; the 6 AM window for downstream users in that hour bucket misses entirely. The 9 AM CT audit backstop covers some of this, but not the primary window.

**Fix:**
```ts
const ctrl = new AbortController();
const timer = setTimeout(() => ctrl.abort(), 15_000);
try {
  const res = await fetch(url, { signal: ctrl.signal, ... });
  ...
} finally { clearTimeout(timer); }
```
15 s per attempt × 3 retries = 45 s bounded worst case.

---

### P0-3. Briefing + payment nudge overflows the 600-char cap
**File:** `supabase/functions/_shared/briefing.ts:947` (concatenation of `PAYMENT_NUDGE`)

The briefing body is `slice(0, 600)` then `PAYMENT_NUDGE` (~157 chars + 4 newlines) is appended unconditionally for trial users — pushing the message to ~760 chars. The header comment says "Cap at 600 chars (~4 SMS segments)." Twilio auto-segments per 160 chars, so this turns a 4-segment send into a 5-segment send.

**Impact:** ~25% over-spend per trial-user briefing. The cap intent is broken for the highest-cost cohort (everyone in their first 14 days).

**Fix:** subtract the nudge length from the cap before slicing the body:
```ts
const bodyCap = 600 - (showNudge ? PAYMENT_NUDGE.length + 2 : 0);
text = text.slice(0, bodyCap);
if (showNudge) text += "\n\n" + PAYMENT_NUDGE;
```

---

### P0-4. Inbound SMS webhook is not idempotent — duplicate Claude calls on Twilio retry
**File:** `apps/web/src/app/api/sms/inbound/route.ts:279–290`

Twilio retries webhook calls on 5xx or network failures (default 3 attempts). The handler logs the inbound row and calls Claude before returning TwiML. There is no dedup on `MessageSid` (Twilio's request UUID).

**Impact:**
- Duplicate `sms_conversations` rows → corrupted conversation history feeding briefings
- Duplicate Claude calls (cost)
- User can receive the same outbound reply twice via TwiML on the retry

**Fix:** add a `twilio_message_sid` column on `sms_conversations`, unique constraint on `(direction, twilio_message_sid)` where not null. On inbound, check existence first; on conflict, return the cached TwiML idempotently. ~30 lines plus a migration.

---

### P0-5. Waitlist SMS missing STOP footer on first/intermediate messages — TCPA gap
**Files:** `apps/web/src/lib/sms-access.ts:22` (`WAITLIST_MESSAGE`), `apps/web/src/lib/waitlist-sms.ts:107` (re-prompt)

The first SMS a prospect receives ("Hey! Kin isn't open to everyone yet…") has **no** "Reply STOP to opt out" footer. Same for the intermediate "almost there, reply with name + email" prompt. Only the final completion message includes it.

**Impact:** 10DLC carrier rules require opt-out language on every promotional/transactional SMS, not just the last in a series. Carriers can rate-limit or block the brand campaign if this is audited.

**Fix:** append `"\nReply STOP to opt out."` to both constants. ~2-line change.

---

## P1 — Should Fix Before Beta (21)

### Auth (2)

**P1-A1.** `apps/web/src/app/api/invite/[code]/accept/route.ts` has no rate limit. Authenticated users can enumerate invite codes. Add Upstash limiter at 5/min/user. _(P1 — actual exploitation requires guessing short codes, but cheap to harden.)_

**P1-A2.** Email magic link UX is not surfaced in copy. Phone-first signup page should mention email as a fallback for users who can't receive SMS. `apps/web/src/app/(auth)/signup/page.tsx:217–223`.

### SMS pipeline (2)

**P1-S1.** Off-script onboarding interrupts (`answerOnboardingQuestion`) bypass the 20/hr rate limit. `apps/web/src/app/api/sms/inbound/route.ts:318–329`. Wrap that path in the same `checkRateLimit` gate. Cost amplification.

**P1-S2.** Lower the inbound rate limit from 20/hr to 10/hr for beta. With ~100 users this caps Claude spend per user-hour at a reasonable ceiling.

### Morning briefing (4)

**P1-B1.** Partner profile lookup failure silently produces a briefing with no partner context. `apps/web/src/lib/sms-briefing.ts:155–172`. Log + Slack-alert on partner-resolve failure for coupled households; never silently drop. (Note: this path is the web-app/test version — verify the edge function `_shared/briefing.ts` is also resilient, which it appears to be.)

**P1-B2.** `formatTime` in `apps/web/src/lib/sms-briefing.ts:78` hardcodes `timeZone: "UTC"`. The edge function (`_shared/briefing.ts:765`) correctly uses the user's timezone. This means `/api/test/morning-briefing` doesn't match production output. Fix by accepting `timezone` parameter and passing through.

**P1-B3.** Quality-scorer failures are silent (`_shared/briefing.ts:1047–1055`). On Haiku timeout or error, `scoreBriefing()` returns null; row gets `quality_score = NULL` with no alert. A sustained Haiku outage degrades the trend dashboard invisibly. Add a Slack "info" alert (not "warning") when scorer fails for >5 briefings in a row.

**P1-B4.** Briefing context only resolves a single partner. Multi-adult households (e.g. two co-parents + grandparent) get just one partner's calendar. Either document this as a known limit or expand `partnerProfileId` to a list. `apps/web/src/lib/sms-briefing.ts:146–172`.

### Calendar sync (3)

**P1-C1.** Revoked OAuth refresh tokens have no UI affordance. `apps/web/src/lib/calendar/sync.ts:100` throws; UI at `apps/web/src/app/(dashboard)/dashboard/calendars/page.tsx:395–397` shows "Sync error" but no reconnect button and no `sync_error` text. Briefing silently falls back to stale calendar data. Add: (1) detect 401/invalid_grant in `refreshGoogleToken`, (2) set `calendar_connections.sync_status = "needs_reconnect"`, (3) render a "Reconnect Google" CTA. ~40 lines.

**P1-C2.** Google all-day events stored as UTC midnight. `apps/web/src/lib/calendar/google.ts:178–180` does `new Date("2026-05-22").toISOString()` which becomes `2026-05-22T00:00:00Z` — wrong day for users west of UTC. Store as user-local date strings or wall-clock TZ. Affects Pacific users every all-day event.

**P1-C3.** Initial sync in OAuth callback is awaited inline with no timeout (`apps/web/src/app/api/calendar/google/callback/route.ts:117`). Hanging Google call leaves the user staring at a frozen redirect. Wrap in 30 s timeout; on timeout, redirect to dashboard with a `sync_status = "syncing"` and let the cron backfill.

### Portal / dashboard (3)

**P1-P1.** Theme toggle still in settings (`apps/web/src/app/(dashboard)/dashboard/settings/page.tsx:332`) — "Light mode is in development" + clickable Light button. Either remove the toggle entirely (you removed it from CI per the brief but the UI control is still here) or hide everything except the Dark indicator.

**P1-P2.** "Custom briefing times coming soon" placeholder text on settings (`page.tsx:312`). Either ship custom times or remove the placeholder.

**P1-P3.** WaitlistForm and BriefingDemo: verify the demo content isn't stale or referencing removed features. The Pricing component should match Stripe price IDs exactly. (Quick spot-check; verified $39/mo + $299/yr matches `lib/stripe.ts`.)

### Infra / security (3)

**P1-I1.** `apps/web/src/app/api/cron/cleanup/route.ts:11` uses inline `Bearer ${CRON_SECRET}` check instead of `isAuthorizedCron()` helper. Consistent auth pattern matters; cleanup is the only route on the divergent style.

**P1-I2.** Sentry breadcrumbs include unredacted timestamps + (potentially) user emails in cleanup deletion logs. `apps/web/src/app/api/cron/cleanup/route.ts:31,63`. Switch to count-only messages: `Sentry.captureMessage("Sent N day-75 reminders", "info")`.

**P1-I3.** No rate limit on `/api/ops/metrics`. Phone-based auth is fine for now but rate-limit the endpoint at 60/min/uid as defense-in-depth.

### Edge cases (4)

**P1-E1.** Sole-parent (single household member) language path: prompts assume "your partner" phrasing. Verify single-parent briefings render naturally — quick prompt-test with a household_members count of 1.

**P1-E2.** Half-onboarded users (phone verified, no household, no calendar) — what does the briefing cron do? Verify they're filtered by `onboarding_completed` (they should be), but log a sample profile in that state to be sure no briefing fires.

**P1-E3.** Long international phone numbers (+44, +91) — Twilio segmenting and 10DLC rules differ outside US. Either restrict signup to US-only at validation, or document expected behavior. Right now signup likely accepts them but downstream SMS will fail or be costlier.

**P1-E4.** Trial expiry transition: when `subscription_status` flips from `trial` → `canceled` at trial end, the user keeps receiving briefings unless P0-1 is fixed. Add an explicit cron path (engagement-nudges already runs daily) to gracefully notify "your trial ended — keep getting briefings? upgrade here" exactly once.

---

## P2 — Polish (28)

### Code quality

- **P2-Q1.** 2 TypeScript errors in `apps/web/src/__tests__/chat-agentic-loop.test.ts:98,129` — `stop_details` not on `Message` type. Fix the test mocks. Not blocking, but TS-strict CI should be green.

### Auth

- **P2-A1.** `apps/web/src/middleware.ts` protected-routes list doesn't include `/onboarding/*`. Add for cleaner UX (currently those pages handle their own auth client-side).
- **P2-A2.** `(auth)/error.tsx` is generic. Surface a server-side error reason. _(Defensive; the trigger reliably creates profiles, so this path is rarely hit.)_
- **P2-A3.** Add `inputMode="numeric"` to phone input on signup (signup/page.tsx:258) for mobile-keyboard correctness.
- **P2-A4.** Tighten profile-existence routing in `signin/page.tsx:182–186`: use strict `=== true` rather than truthy check.

### SMS

- **P2-S1.** Claude timeout fallback message ("I hit a snag — try again in a moment") is generic. Distinguish AI timeout vs delivery error in user-facing copy.
- **P2-S2.** Two divergent briefing implementations (`_shared/briefing.ts` Deno vs `lib/sms-briefing.ts` Node). Drift test exists in CI but a shared constants module would harden it further.
- **P2-S3.** Move SMS system-prompt injection-defense block to the top of the prompt and expand it.

### Briefing

- **P2-B1.** Hardcoded model strings (`claude-sonnet-4-6`, `claude-haiku-4-5-20251001`) in edge function — extract to env vars matching the web pattern.
- **P2-B2.** Quality-score threshold (80) is configured in `briefing-quality.ts:32` but referenced as a hardcoded "(0,100)" range in the judge prompt. Inline the threshold into the prompt template.
- **P2-B3.** Calendar `visibility` column (migration 051) is populated but **not enforced** in the briefing prompt. Private events feed Claude with title/location. Strip these in `buildBriefingContext`.

### Calendar

- **P2-C1.** Disconnect/reconnect on `/dashboard/calendars` should surface email account name, not "Google account". `(dashboard)/dashboard/calendars/page.tsx:386–389`.
- **P2-C2.** Manual sync button shows no per-connection error feedback.
- **P2-C3.** Migration 028 references "Sprint B33" pending-cleanup; tidy or close the loop.
- **P2-C4.** Conflict detection runs on every webhook; add a 5-second debounce.

### Portal / landing

- **P2-P1.** Error pages use inconsistent styling — `error.tsx` uses CSS vars, `global-error.tsx` and `not-found.tsx` use hardcoded hex.
- **P2-P2.** Billing page coupon error feedback ("Could not start checkout") is too generic for invalid coupons.
- **P2-P3.** Family page button hover uses inline mouse handlers; refactor to CSS hover or shared `Button` component.
- **P2-P4.** Ops dashboard could render a "Loading…" state with a guard flash for non-admins instead of brief unauth flash.
- **P2-P5.** Sync status enum `idle | syncing | error` displays as `connected | syncing | error` in UI — rename enum for consistency.
- **P2-P6.** Dashboard loading states use spinner+text; add skeleton placeholders for polish.

### Infra / security

- **P2-I1.** `.env.example:90` hardcodes founder personal email as `ACTIVITY_ALERT_EMAIL`. Change to placeholder.
- **P2-I2.** `ADMIN_PHONES` hardcoded in `api/ops/metrics/route.ts:25`. Works fine; consider `profiles.is_admin` flag for future. Not urgent.
- **P2-I3.** `sms_conversations` and `daily_questions` have RLS enabled with no policies — denies all non-service-role traffic today (correct), but if a user-facing history view ships later, lock-down policies should be added preemptively.
- **P2-I4.** Add Sentry `beforeSend` PII scrubbing for any future logging that includes phone/email.

### Edge cases

- **P2-E1.** Empty briefing — currently sends "Open day" or similar; confirm this is the intended copy.
- **P2-E2.** Multi-word `family_name` parsing (`_shared/briefing.ts:678–693`) assumes Western "First Last" — minor naming edge case.
- **P2-E3.** Travel-time partial failures silently drop legs; add a one-line "travel times unavailable" hedge to the briefing context when ≥50% of legs failed.

---

## What's working well (positives carried forward)

- **Auth trigger reliability.** `handle_new_user()` (migration 054) creates a profiles row on every auth signup with NULL-email tolerance, phone seeding, 14-day trial stamp, and `SECURITY DEFINER + SET search_path = public` hardening. Several agent concerns about "missing profiles" don't actually materialize because of this trigger.
- **All three webhook signatures validated correctly with constant-time compare**: Twilio (`lib/twilio.ts:96–119`), Stripe (`api/stripe/webhook:128–132`), Google (`api/calendar/google/webhook:32–34`).
- **TCPA keyword handlers**: STOP, HELP, INFO, START, UNSTOP all implemented; opt-out stamped on both `profiles.sms_opted_out_at` and `waitlist.sms_opted_out_at`; every outbound path checks the latch.
- **RLS enabled on every user-data table** with household-scoped policies (calendar_events, coordination_issues, chat threads, profiles).
- **Service role isolation maintained** — never exposed to `NEXT_PUBLIC_*`. Cron secret and admin secret are independent.
- **Cron architecture is clean**: Vercel cron for daily (cleanup, engagement-nudges); pg_cron for sub-daily (calendar-renewal, pickup-risk, sunday-checkin, morning-briefing, briefing-audit) — Hobby plan limit respected.
- **Idempotent briefing dedup** on `(profile_id, briefing_date_in_user_local_tz)` prevents double-sends across DST and timezone boundaries.
- **9 AM CT briefing-audit cron** catches users missed by the primary 6 AM run.
- **Plaintext fallback always sends something** if Claude fails — users never get silence.
- **Quality scorer (Haiku) running on every briefing** with two-layer checks (regex + LLM judge), non-blocking.
- **Legal pages are substantive.** Privacy and Terms cover GDPR/CCPA, Google Calendar scopes, SMS consent, AI processing, household data — not stub text.
- **Pricing consistent** across landing, billing page, and Stripe price IDs ($39/mo, $299/yr).
- **Error boundaries on every route group** — branded `error.tsx`, `not-found.tsx`, RouteError component.
- **Lint clean.** Only TS errors are 2 lines in a test mock.
- **Ops dashboard founder-locked** via hardcoded phones + Supabase auth check.

---

## Recommended pre-launch sequence

**Today (P0 sprint, ~3 hours):**
1. P0-1: Subscription gating on briefing query (15 min + test)
2. P0-3: Payment-nudge cap math (10 min)
3. P0-5: STOP footer on waitlist messages (5 min)
4. P0-4: SMS inbound idempotency migration + handler (45 min)
5. P0-2: Anthropic timeout (15 min)

**This week (P1 sprint, ~1.5 days):**
- Calendar reconnect flow (C1 + C3)
- All-day-event timezone fix (C2)
- Theme toggle removal (P1)
- Off-script interrupt rate-limit (S1)
- Cleanup cron auth consistency (I1)

**Post-launch (P2 polish, ongoing):**
- TS test errors
- Sentry PII scrubbing
- Visibility enforcement in briefing prompt
- Loading skeletons + error page styling

---

## Beta-launch readiness verdict

**GO with P0 patches.** The system is meaningfully audited, the architecture is right, and the gaps are narrow and well-scoped. No structural rewrites needed. The four most important fixes (P0-1 subscription gating, P0-3 char-cap math, P0-4 idempotency, P0-5 STOP footer) close direct cost-leakage and compliance exposure. P0-2 (Anthropic timeout) prevents the worst-case 6 AM cron hang.

Once those five land, you have an honest B+ system. Real families will get reliable morning briefings, the SMS pipeline will hold up to Twilio retries and TCPA audits, and trial-to-paid conversion will stop subsidizing churned users.

Ship it.
