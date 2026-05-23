# Kin Beta Readiness Audit v7

**Date:** 2026-05-22
**Branch:** main (HEAD `889c5c3`, with migration `077` applied via `fcd3dff`)
**Auditor:** Claude (Opus 4.7, 1M context) — orchestrated 10-stream parallel audit
**Scope:** Post-V6 verification sweep — all V6 P0 (`ad3a361`) + P1 (`889c5c3`) + P2 (`f6197de`) fixes deployed; migration 077 just landed (invitee_phone repair + 075/076 fold-in)
**Production URL:** kinai.family
**Supabase ref:** `coxqdpcffmsncvisfyvj`
**Stack:** SMS + web (no mobile app). 77 migrations, all deployed. Vercel. 6 active pg_cron jobs.

---

**Tests:** 57 passing (44 web + 13 shared) · `tsc --noEmit` clean (apps/web + packages/shared) · `next lint` clean · CI runs lint + tsc + tests + `next build` end-to-end. New since V6: `apps/web/src/__tests__/stripe-webhook-replay.test.ts` (5 cases, pins the 23505 idempotency short-circuit).

---

## Overall Grade: **B+** (5 P0 fixes needed; the V6 sweep mostly held, but two of last cycle's P0 fixes were incomplete and now regress as new P0s)

V6 cleared 5 P0 + 28 P1 + 35 P2 items across three commit clusters (`ad3a361` → `889c5c3` → `f6197de`). Verifying each individually, the landed rate is high — every billing fix, every SMS fix, every onboarding fix, every dashboard fix, and every infra fix is verifiable in source with audit-trail comments. But two of V6's headline P0 fixes are incomplete in ways that defeat their original purpose:

1. **V6 P0-1 fixed Apple multi-account onConflict, but missed the same bug on the Google side.** Migration 067 built partial unique indices for both providers. The Apple connect/disconnect routes were refactored; the Google OAuth callback was not. The single Google `onConflict: "profile_id,provider"` matcher still doesn't align with the partial index `WHERE provider = 'google'`, AND `google_calendar_id` is never populated at connect time — so even when the index could match, every Google row collapses to the same key. **Multi-account Google never actually worked.**

2. **V6 P0-5 redacted `family_name` from Slack alerts in `briefing-audit/index.ts` and three call sites in `briefing.ts` (lines 1325, 1361, 1438), but missed `briefing.ts:1228`** — the AI-generation-failed Slack notification still interpolates `${familyName ?? profileId}`. The exact PII-enumeration vector V6 P0-5 was meant to close is still open on the most frequently-fired failure path. A `console.log` at `briefing.ts:1416` also still emits `family_name` into Supabase edge-function logs.

The three other P0s are new findings the V6 sweep didn't surface:

3. **Sole-parent quality guard is structurally broken.** `briefing-quality.ts:192-193` `PARTNER_SECTION_PATTERN` requires the literal phrase `"partner's calendar" | "spouse's events" | "co-parent's schedule"` to appear in the briefing context. `buildBriefingContext` never emits any such section — it lists family members as `Jontae (partner, age 38)`. The regex doesn't match, the phantom-partner guard never fires for households that DO have a partner, and any single-parent briefing that uses the word "partner" trips the false-positive — opposite of the intended V5 P1-B5 behavior.

4. **Web on-demand briefing uses bare model alias.** `apps/web/src/lib/anthropic.ts:3` still exports `ANTHROPIC_MODEL = "claude-sonnet-4-6"` (no date suffix), consumed by `/api/morning-briefing`. Same deprecation hazard V6 P1-M1 flagged for the SMS path — the SMS edge function was pinned to `claude-sonnet-4-6-20250930`, the web on-demand path was not.

5. **`/api/account` DELETE has no CSRF same-origin check and no rate limit.** The highest-impact destructive endpoint in the app (irreversible hard-delete of profile + household data) is the only state-changing route missing `isSameOrigin`. SameSite=Lax on the Supabase auth cookie blocks the classic cross-site form POST, but defense-in-depth was the entire point of the V6 P2-A1 rollout — and this is the route where a forged request hurts the most.

Beyond these, **30 new P1s and ~32 new P2s** surfaced — biggest clusters are: partner calendar events are invisible to the household conflict detector (`is_shared=false` hardcoded on synced events makes RLS partner-visibility unreachable), three first-touch SMS paths missing the "Reply STOP" footer (partner-invite, welcome-SMS, engagement nudges — A2P 10DLC compliance exposure), `sms_conversations` orphaned (not deleted) on account deletion (GDPR right-to-erasure violation), CSP still report-only with no flip schedule, Next.js 14.2.35 carries 4 high-severity advisories (cache poisoning, SSRF, middleware), and the docs at `docs/MORNING_BRIEFING_SYSTEM.md` are 2+ product pivots out of date (describes Expo push, parent_schedules, allergy data — none of which exist).

Ship after the five P0 fixes plus the highest-impact P1 cluster (~3-4 hours of focused work — similar volume to the V6 sweep).

---

## Top-line summary

| Layer | Grade | P0 | P1 | P2 |
|---|---|---|---|---|
| 1. Authentication & Security | B+ | 0 | 5 | 8 |
| 2. Billing & Subscriptions | A- | 0 | 2 | 6 |
| 3. Calendar Integration | B | 1 | 6 | 6 |
| 4. SMS & Messaging | A- | 0 | 3 | 7 |
| 5. Briefing Engine | B | 3 | 3 | 5 |
| 6. Dashboard & UI | A- | 0 | 2 | 11 |
| 7. Landing & Marketing | A | 0 | 3 | 5 |
| 8. Infra & DevOps | A- | 0 | 2 | 6 |
| 9. Engagement & Retention | A- | 0 | 1 | 6 |
| 10. Data Integrity & Privacy | B | 1 | 5 | 6 |
| **Total** | **B+** | **5** | **32** | **66** |

(P0/P1/P2 columns count net-new V7 findings only — V6 carryover verifications are in the per-category sections below. Some findings span categories and are double-counted; the unique total is closer to ~85 distinct items.)

---

## P0 — Launch Blockers (5)

### P0-1. Google OAuth callback never aligned with migration 067's partial unique index — Google multi-account never worked
**File:** `apps/web/src/app/api/calendar/google/callback/route.ts:123-142`

V6 P0-1 documented that the Apple connect route's `onConflict: "profile_id,provider"` didn't match migration 067's partial unique index `WHERE provider = 'apple'`. The Apple side got refactored to an explicit SELECT-then-UPDATE-or-INSERT pattern at `apple/connect/route.ts:87-112`. The Google side has the same bug:

1. Upsert payload uses `onConflict: "profile_id,provider"`, but migration 067 dropped that constraint in favor of `calendar_connections_google_unique` on `(profile_id, provider, google_calendar_id) WHERE provider = 'google'`. PostgreSQL won't infer the partial index from a 2-tuple `ON CONFLICT` without the matching `WHERE provider = 'google'` predicate.
2. **`google_calendar_id` is never set when inserting the connection** — the upsert payload (lines 127-138) doesn't include the column. Migration 009 defaults it to `'primary'`. So even if the partial index did match, every Google row collapses back to `(profile_id, 'google', 'primary')` — connecting a second Google account either throws a unique violation (caught as `auth_failed`) or silently overwrites the first account, exactly the V6 P0-1 symptom.

The feature shipped (migration 067 + V6 P1-C1 `google_account_email` persistence + dashboard email column in `calendars/page.tsx:404-409`), but the connect path was never updated to honor it. The Apple-side disconnect handler at `apple/connect/route.ts:148-156` was correctly updated; Google's `/api/calendar/google/route.ts:34-105` was too. The OAuth callback is the lone holdout.

**Fix:** Mirror Apple's explicit SELECT-then-UPDATE-or-INSERT pattern, keying lookup on `(profile_id, provider, google_account_email)`. Populate `google_calendar_id` from the primary calendar discovered by `listGoogleCalendars`. Drop/recreate the partial unique index to key on `(profile_id, provider, google_account_email)` so two distinct Google accounts can both land without collision. ~30 lines + 1 migration.

---

### P0-2. Slack PII leak persists at `briefing.ts:1228` — V6 P0-5 fix incomplete
**Files:** `supabase/functions/_shared/briefing.ts:1228`, `:1416`

V6 P0-5 redacted family names from four Slack call sites (audit-index:184, briefing.ts:1325, 1361, 1438) plus added a contract comment at briefing.ts:1322-1324. One site was missed:

```ts
// briefing.ts:1227-1230 (still leaking)
await notifySlack(
  `AI briefing generation failed for ${familyName ?? profileId} (${profileId}) after retries — sent plaintext fallback. ${msg}`,
  "warning"
);
```

Fires on every retry-exhausted Anthropic failure, which is the most frequent Slack-alerted failure path in steady state. Same paying-family enumeration vector V6 closed for the other three paths.

Additionally, `briefing.ts:1416` still uses `console.log` to emit `${profile.family_name} (${profile.id})` to Supabase edge function logs. Project-viewer access on Supabase Studio exposes these to anyone with the role — broader than the Slack channel surface.

**Fix:** Replace `${familyName ?? profileId}` at line 1228 with `${profileId}` only (UUID is already in the message). Replace `profile.family_name` at line 1416 with `profile.id`. 2 string edits.

---

### P0-3. Sole-parent quality guard regex never matches — phantom-partner alerts are inverted
**File:** `supabase/functions/_shared/briefing-quality.ts:192-193`

```ts
const PARTNER_SECTION_PATTERN =
  /\b(partner|co[- ]?parent|spouse|other parent)['']?s?\s+(calendar|events|schedule|day|side)/i;
```

The regex requires the literal phrase `"partner's calendar"` / `"spouse's events"` / `"co-parent's schedule"` to appear in the briefing context. But `buildBriefingContext` never emits any such section — the context only lists family members via `family_members` rows as `Jontae (partner, age 38)`. The regex needs `\s+(calendar|events|schedule|day|side)` after the relationship noun; `(partner, age 38)` does not match because the comma intercedes.

Result: every household — partnered or single — fails the partner-section check. Combined with the LLM occasionally using the word "partner" in briefings for partnered households (which is correct behavior!), this regex is now an inverted noise-generator that Slack-criticals on legitimate output. This was V5 P1-B5, and it shipped broken.

**Fix:** Encode partner-presence semantically. Pass an `hasPartner: boolean` flag into `quickQualityCheck()` derived from `family_members` data directly. Drop the regex; check `if (!hasPartner && /\bpartner\b/i.test(body)) return { issue: "phantom_partner", ... }`. ~10 lines change in two files.

---

### P0-4. Web `/api/morning-briefing` uses bare model alias — same deprecation hazard V6 P1-M1 fixed for SMS
**File:** `apps/web/src/lib/anthropic.ts:3`

```ts
export const ANTHROPIC_MODEL = "claude-sonnet-4-6";  // no date suffix
```

V6 P1-M1 documented that bare aliases break silently when Anthropic deprecates them. The SMS-edge-function writer was pinned to `claude-sonnet-4-6-20250930` (briefing.ts:1053). The web on-demand path was not. When the alias rotates, the dashboard "preview my briefing" button (and the `/api/test/morning-briefing` test endpoint, which calls through to this constant) breaks silently — and is one of the surfaces a beta tester is most likely to exercise during onboarding.

**Fix:** Change line 3 to `export const ANTHROPIC_MODEL = "claude-sonnet-4-6-20250930"`. 1 line.

---

### P0-5. `/api/account` DELETE has no CSRF same-origin check and no rate limit
**File:** `apps/web/src/app/api/account/route.ts:19-53`

The Settings page calls `fetch("/api/account", { method: "DELETE" })` to trigger account deletion (settings/page.tsx:245). The route is the highest-impact mutating endpoint in the app — calls the SECURITY DEFINER `delete_user_account()` RPC (migration 070) which hard-deletes profile + household_invites + calendar_connections + calendar_events + briefings + household_context + auth.users. It does NOT call `isSameOrigin(request)` the way `/api/stripe/checkout`, `/api/stripe/portal`, `/api/invite`, and `/api/account/onboarding-complete` do (per V6 P2-A1). And there's no rate limiter.

SameSite=Lax on the Supabase auth cookie blocks the classic cross-site form POST, but a logged-in user visiting a malicious page can be silently force-deleted via a `DELETE` from a same-site context (subdomain takeover, malicious extension, XSS via a third-party script that ever gets added). Defense-in-depth was the V6 P2-A1 contract — this is the one route where breaking that contract is catastrophic.

**Fix:**
1. Add `if (!isSameOrigin(request)) return NextResponse.json({error: "Bad origin"}, {status: 403});` at the top of DELETE — copy from the 4 other state-changing routes (3 lines).
2. Add `await checkRateLimit(user.id, "account-delete", { points: 3, perMinutes: 60 })` (2 lines).

---

## P1 — Should Fix Before Beta Week 1 (32)

### Authentication & Security (5)

**P1-A1.** Demo credentials shipped in client-side JS. `apps/web/src/app/(auth)/signin/page.tsx:72-73` embeds `demo@kinai.family / KinDemo2026!` into the React bundle whenever `?demo=true`. The V6 P2-L3 audit-trail comment promised removal "before opening signup to the public" — that gate has now arrived. Move the prefill to a server-side cookie set by a dedicated `/api/demo-login` route that signs in via service-role and rotates the password on every prefill.

**P1-A2.** Invite-accept POST missing `isSameOrigin` check. `apps/web/src/app/api/invite/[code]/accept/route.ts:16-22`. Accepting an invite irreversibly links the caller's profile into another household — a CSRF would silently move a victim into a stranger's household. 3-line fix.

**P1-A3.** Calendar-events PUT allows mass-assignment of `is_shared`, `is_kid_event`, `visibility`. `apps/web/src/app/api/calendar/events/route.ts:107-142` uses `const { id, ...updates } = body; .update({...updates})`. RLS gates row ownership, but within their own row a user can flip `is_shared=true` on a private event — leaking it into the household briefing, undermining migration 051's `visibility='private'` PII protection. Allowlist `["title", "description", "location", "start_time", "end_time", "all_day", "color", "recurrence_rule", "assigned_member"]` before the DB write. ~10 lines.

**P1-A4.** `/api/briefing/health` is unauthenticated and triggers Slack alerts. `apps/web/src/app/api/briefing/health/route.ts:112-141`. Any unauthenticated GET hits Twilio + Supabase + the edge function, then `notifySlack(..., "critical")` on failure. Attacker spam → billed Slack ops noise + billed SMS via `lib/notify.ts:36-44` ADMIN_PHONE fallback + Supabase admin client cost. Add `isAuthorizedCron(request)` or a `MONITORING_SECRET` Bearer.

**P1-A5.** Sign-in / sign-up `<label>` elements unlinked to inputs. `(auth)/signin/page.tsx:317-510, signup/page.tsx:248-313`. WCAG 1.3.1 / 4.1.2 failure — same class of bug V6 P1-D1 fixed on `family/page.tsx`, just never applied to auth pages. ~10 lines across two files.

### Billing & Subscriptions (2)

**P1-B1.** `customer.subscription.deleted` handler leaves `cancel_at_period_end=true` and stale `subscription_current_period_end` after the cancellation cuts over. `apps/web/src/app/api/stripe/webhook/route.ts:340-386` calls `setStatus(supabase, "canceled", {...})` but `setStatus` only writes `subscription_status`. Future code (analytics, "win-back" SMS keyed on `cancel_at_period_end`) treats stale flags as live signal. Fix: write `cancel_at_period_end: false, subscription_current_period_end: null` in the deleted-handler patch; also stamp them on resubscribe in `checkout.session.completed`.

**P1-B2.** Missing webhook handlers: `customer.subscription.created`, `charge.refunded`, `charge.dispute.created`. The dispute case is the highest-impact — a chargeback should at minimum `notifySlack(..., "critical")` so the team can intervene before the funds are pulled. A full-refund issued from the Stripe dashboard leaves the user `active` with no in-product signal. Add a `charge.dispute.created` case (Slack alert) and explicitly ignore/handle `charge.refunded`.

### Calendar (6 + 1 P0 above)

**P1-C1.** `calendarStalenessNote()` doesn't surface `needs_reconnect` connections. `supabase/functions/_shared/briefing.ts:684-718` branches on `c.sync_status === "error"` only. A connection in state `needs_reconnect` (revoked refresh_token, expired channel) falls through — and if it last synced within the staleness threshold before revocation, the briefing is built from a structurally-stale calendar with no warning to the user. Migration 066 added `needs_reconnect`, `sync.ts:92-100` flips correctly, the briefing just doesn't read it. Treat `needs_reconnect` identically to `error` with provider-specific text.

**P1-C2.** Apple disconnect soft-deletes ALL Apple events even when `connection_id` is specified. `apps/web/src/app/api/calendar/apple/connect/route.ts:158-162`. The events-cleanup query at line 159-162 doesn't scope by connection, so disconnecting one Apple calendar nukes events from all Apple calendars on the profile. Google's parallel disconnect at `route.ts:97-103` skips the event sweep entirely when `connection_id` is provided; Apple should do the same OR scope by `external_calendar_id = caldav_url`.

**P1-C3.** Partner calendar events never visible to household conflict detector. `apps/web/src/lib/calendar/sync.ts:355-365` queries `.or(owner_parent_id.eq.${profileId},is_shared.eq.true,is_kid_event.eq.true)` — but `googleEventToKinEvent` (google.ts:311-312) and `appleEventToKinEvent` (apple.ts:191-193) hardcode `is_shared: false, is_kid_event: false` AND never set `household_id`. The "differentOwners" branch at `conflicts.ts:39-54` (V5 P2-C2's claimed fix) is unreachable in practice. Cross-parent conflict detection structurally doesn't work today.

**P1-C4.** OAuth refresh tokens and Apple app-specific passwords stored as plaintext TEXT. `supabase/migrations/009_calendar.sql:10-13` comment claims "encrypted at rest by Supabase" — true at the disk level, false at the column level. Service-role bypass OR a single RLS regression exposes these in cleartext. Move to Supabase Vault, or pgcrypto-encrypt with a per-row IV.

**P1-C5.** `calendar-renewal` scheduled both via Vercel cron (daily 09:00 UTC) AND via pg_cron every 6h. `apps/web/vercel.json:11-14` + `supabase/migrations/060_calendar_renewal_cron.sql`. The claim-pattern at `sync.ts:27-39` prevents data corruption from concurrent runs, but webhook channel renewal at `calendar-renewal/route.ts:89-130` is NOT behind the claim — two simultaneous runs both register fresh channels (orphaning one), or stop the channel the other just registered. Drop the Vercel cron entry (pg_cron is the source of truth per the route's own comment), OR wrap renewal in the same claim.

**P1-C6.** Apple all-day event timezone handling diverges from Google's noon-UTC anchor. `apple.ts:101-130` calls `event.startDate.toJSDate().toISOString()` directly; Google's `google.ts:289-291` anchors all-day events to noon UTC (V3 P1-C2 fix). In Vercel's UTC runtime Apple all-day events land correctly *most* of the time, but early-morning timezones (HST, AKST) can off-by-one. Mirror the Google anchor.

### SMS & Messaging (3)

**P1-S1.** Partner-invite SMS lacks "Reply STOP" footer. `apps/web/src/lib/partner-invite.ts:156` body is the first outbound Kin sends to the partner's number — often without their prior consent (the inviter typed the number during onboarding). CTIA/A2P 10DLC guidance requires the first message on a campaign to identify the sender and carry opt-out instructions. Every other first-touch SMS in the codebase carries `"Reply STOP to opt out"` (waitlist confirmation, sms-access waitlist, sms-access approved) except this one. A carrier audit ding here suspends the 10DLC campaign — existential outage. Append ` Reply STOP to opt out.`

**P1-S2.** Welcome SMS lacks "Reply STOP" footer. `apps/web/src/app/api/account/onboarding-complete/route.ts:75-78`. First outbound Kin sends to a *web*-onboarded user. SMS-onboarding's parallel first-touch (sms-onboarding.ts:67-71) correctly includes opt-out language; the web path doesn't. Same A2P 10DLC exposure. Append the footer.

**P1-S3.** Engagement nudges have no enforced STOP language. `apps/web/src/app/api/cron/engagement-nudges/route.ts:237-250` + trial-drip block (line 469+). LLM-generated nudge bodies don't get told to include opt-out language; fallback templates don't include it. These are unsolicited outbound texts — exactly the case 10DLC auditors check. Either append `" Reply STOP to opt out."` to every nudge body after the LLM output, or hardcode in the system prompt + every fallback template.

### Briefing Engine (3 + 3 P0 above)

**P1-M1.** Docs at `docs/MORNING_BRIEFING_SYSTEM.md` are 2+ product pivots out of date. Describes Expo push notifications (mobile is gitignored), `parent_schedules` (deleted), `children_allergies`/`pet_details`/`fitness_profiles`/`budget_categories` (none exist), a 6am UTC daily job (actually hourly, fans out per-user-local-6am), and a SYSTEM_PROMPT that explicitly forbids "Morning." as an opener (the doc instructs the opposite). A future contributor reading this thinks Kin has features it doesn't. Rewrite or delete entirely.

**P1-M2.** `reportQuotaExhaustion()` Sentry comment lies. `briefing.ts:547-549` documents "Best-effort Sentry capture from inside the Deno briefing edge function. Imports the SDK dynamically so a missing module never breaks briefings." The function below (550-571) only calls `notifySlack` — no Sentry import, no dynamic load. Either implement (the comment correctly identifies Sentry as the "trend log" companion to Slack's durable alerting) or strip the misleading comment.

**P1-M3.** Quality-fail Slack alerts include 200-char briefing body. `briefing.ts:1325-1330, 1361-1367`. The body contains kid names, school names, partner names, calendar event titles, locations — the most sensitive surface of paying-family lives. A `SLACK_BRIEFING_WEBHOOK_URL` leak exposes the briefing corpus. Mitigations: move body dumps into the `quality_issues` JSONB column (RLS-protected); Slack carries only `profile_id + grade + score + issue count`; ops pastes the profile ID into a debug tool to fetch the body.

### Dashboard & UI (2)

(Both already counted in Auth & Security as P1-A5 and Auth P1-A2 / new finding — landlord-bug here is the auth-page label gap, covered above.)

**P1-D1.** Onboarding `sms-setup` and `done` pages use the old V0 dark theme. `apps/web/src/app/onboarding/sms-setup/page.tsx:122-172` uses `text-warm-white`, `bg-surface`, `bg-white/5` — dark mode tokens — while the rest of the app is the warm cream/oat ALD palette. User signing up (`/signup` cream) jumps to `/onboarding/sms-setup` (dark) and back to `/dashboard` (cream). Theme switch feels like a separate product. Unify on the ALD palette.

**P1-D2.** Onboarding `done` page may render "Your first briefing lands tomorrow morning at 6am" even when the welcome-SMS API call threw a network error. `apps/web/src/app/onboarding/done/page.tsx:51-66`. V6 P2-A3 caught the explicit-failure case (`welcomeSmsFailed: true`) but not the network-error case — `catch` Sentry-logs but `saveState` still flips to `"success"`. Default to `welcomeSmsFailed = true` on network error, or surface a third "we'll text you shortly" copy variant.

### Landing & Marketing (3)

**P1-L1.** Missing schema.org JSON-LD. No `<script type="application/ld+json">` anywhere in the codebase. For an AI-first product, this is the table where Perplexity / ChatGPT search / Google AI Overviews pick up Organization name + logo + sameAs. Missing structured data costs branded SERP knowledge-card eligibility. Add `Organization` JSON-LD in `app/layout.tsx` and `Product` + `FAQPage` in `app/page.tsx`. ~40 lines.

**P1-L2.** `ThemeProvider` is dead code that runs on every page. `apps/web/src/components/ThemeProvider.tsx:1-79`. `globals.css:10` resolves `:root`, `.dark`, `.light` to the same tokens (V6 commit `fe9555f` removed the toggle); the provider still wires `useState`, `localStorage`, `matchMedia` listeners, and class toggles for every visitor. Costs JS bundle + paint frame + `localStorage.getItem`. Delete the file + remove the wrapper from `app/layout.tsx`. ~20 lines deleted.

**P1-L3.** `robots.ts` disallow list missing `/auth`, `/signin`, `/signup`. `apps/web/src/app/robots.ts:6-9` allows them; `sitemap.ts:9-10` includes `/signin` and `/signup`. Combined with the demo-creds-on-`?demo=true` (P1-A1), an indexer crawling `/signin` is noise. Auth pages don't need crawl budget — drop from sitemap.

### Infra & DevOps (2)

**P1-I1.** Next.js 14.2.35 carries 4 high-severity advisories. `npm audit --omit=dev` reports cache poisoning (GHSA-vfv6-92ff-j949, GHSA-wfc6-r584-vfw7), SSRF in WebSocket upgrades (GHSA-c4j6-fc7j-m34r), middleware-cache poisoning (GHSA-3g8h-86w9-wvmq), CSP-nonce XSS (GHSA-ffhc-5mcf-pf4q). Also `@anthropic-ai/sdk` ≤0.91.0 has two moderate sandbox-escape advisories (in use at apps/web/package.json:14 and root package.json:21). Patch-bump `next` to latest 14.2.x (NOT 16.x — breaking) and bump `@anthropic-ai/sdk` to ≥0.98.0.

**P1-I2.** CSP still report-only with no flip schedule. `apps/web/next.config.mjs:50` ships `Content-Security-Policy-Report-Only`. The comment promises a flip "once production logs are clean for a week" — there is no `report-uri`/`report-to`, so violations land only in browser devtools and can't be aggregated. Without a report sink, "clean for a week" is unverifiable. Either add `report-to` pointing to a Sentry CSP-report endpoint with a calendar reminder, or accept the policy as-is and flip enforcement now.

### Engagement & Retention (1)

**P1-E1.** No re-engagement nudge for paid users who go silent. Codebase ships `onboarding_calendar`, `onboarding_silent`, `trial_day3/7/12/13`, and `trial_ended` — but nothing for a paid user who hasn't texted in 30/60 days. Sunday check-in is the only ongoing touchpoint with no escalation when ignored. Retention math is more sensitive than acquisition: a recovered $39/mo subscriber > a marginal trial conversion. Add `runReEngagementNudges()` reusing the same `sendNudge`/`nudges_sent`/`sentInLastDay`/`isDaytime` plumbing. ~40 lines.

### Data Integrity & Privacy (5 + 1 P0 above; some overlap with other categories)

**P1-P1.** `sms_conversations` orphaned (not deleted) on account deletion — GDPR right-to-erasure violation. `supabase/migrations/030_sms_sprint.sql:17` sets `ON DELETE SET NULL`; migration 070's `delete_user_account()` has no explicit `DELETE FROM sms_conversations`. The body content (kid names, locations, partner phone, schedule details) plus `from_number`/`to_number` (PII) remain in the DB indefinitely. Privacy policy promises 30-day full erasure. Add `DELETE FROM public.sms_conversations WHERE profile_id = uid;` to migration 070's function.

**P1-P2.** Sentry scrub misses Kin-specific PII keys. `apps/web/src/lib/sentry-scrub.ts:23-25` covers `phone|phone_number|email|household_id|profile_id|user_id|to|from|to_number|from_number|partner_phone|partner_email|invitee_email` — but not `family_name`, `last_name`, `kid_names`, `partner_name`, `invitee_phone`, `assigned_member`, `caldav_url`, `access_token`, `refresh_token`, `body`, `context_notes`. A `captureException` containing a profile object leaks `family_name: "Sarah Ford"` to Sentry. Extend the allowlist; add a unit test for `family_name`/`last_name` redaction.

**P1-P3.** Account-delete is immediate hard-delete — contradicts privacy-policy 30-day SLA and bypasses the 75-day reminder cron. `apps/web/src/app/api/account/route.ts` vs `privacy/page.tsx:179` ("we will delete your personal data within 30 days") and `cron/cleanup/route.ts` (which supports a `data_deletion_at`/`deletion_reminded` grace window). UX safety issue too — a misclick is unrecoverable. Two-step: settings button schedules deletion (`data_deletion_at = now() + 30 days`), confirmation email allows undo, cleanup cron purges.

**P1-P4.** `partner_phone` stored in `sessionStorage` during onboarding. `apps/web/src/app/onboarding/done/page.tsx:80-83` reads `sessionStorage.getItem("kin_partner_phone")`. Readable by any script on the origin. If a third-party JS is ever added (Sentry already loaded; Stripe.js loaded), XSS during onboarding extracts partner phone. Pass via server-side cookie or a one-shot `pending_partner_phone_token` exchanged at the API.

**P1-P5.** `lib/notify.ts` reads singular `ADMIN_PHONE`, not the V6-renamed `ADMIN_PHONES`. `apps/web/src/lib/notify.ts:5,36` — V6 P1-I2 renamed the ops dashboard env to `ADMIN_PHONES` (plural, comma-separated) but the Slack-fallback SMS still reads singular. Two env vars where one is intended — misconfig in Vercel and Slack alerts silently lose their SMS fallback. Migration: read `process.env.ADMIN_PHONES?.split(",")[0]` and fall back to `ADMIN_PHONE` for one deploy cycle, then drop the singular.

---

## P2 — Polish (66)

### Authentication & Security (8)

- **P2-A1.** Waitlist enumeration via differential responses. `/api/waitlist/route.ts:128-132` returns `{success: true, message: "Already on the list"}` vs `{success: true}`. Behind 3/hr IP rate limit so slow, but attacker behind multiple IPs can enumerate. Make responses identical.
- **P2-A2.** Calendar disconnect DELETE missing `isSameOrigin`. `/api/calendar/google/route.ts:34-106`, `/api/calendar/apple/connect/route.ts:139-165`. Drive-by could disconnect a victim's calendar.
- **P2-A3.** `/api/account/signup-notify` missing `isSameOrigin`. Minor email-bomb vector during the race between auth setup and first activity_log insert.
- **P2-A4.** `/api/invite/[code]` GET lacks input validation on `code` — multi-megabyte codes pass the rate limit by size. Add `/^[A-Za-z0-9_-]{8,64}$/` regex.
- **P2-A5.** `/connect/[token]/page.tsx:114, 129` passes raw token to OAuth state. SMS_TOKEN_RE is checked only downstream in the callback. Validate upstream for defense-in-depth.
- **P2-A6.** Calendar conflicts route inherits body without validation. `/api/calendar/conflicts/route.ts:35` — no zod, no length cap on `resolution_note`. `resolution_note` lands in the briefing prompt — oversized one balloons token cost.
- **P2-A7.** Sentry scrubber doesn't strip OAuth tokens from error bodies. `lib/sentry-scrub.ts:18-24` `SENSITIVE_KEY_RE` missing `access_token|refresh_token|app_password|caldav`. Low-frequency leak risk.
- **P2-A8.** No skip-to-content link anywhere in the app. WCAG 2.4.1 (Bypass Blocks). Trivial sr-only anchor with `:focus` visibility on `(dashboard)/layout.tsx`.

### Billing & Subscriptions (6)

- **P2-B1.** Webhook race: profile may not exist yet on first checkout. `setStatus()` `.update()` affects zero rows silently when the auth.users → profiles trigger lags. Change to `.upsert()` with onConflict on id, or check rowCount.
- **P2-B2.** Stripe API version pinned in two places (`lib/stripe.ts:11` + `webhook/route.ts:40`). Will drift. Export `STRIPE_API_VERSION` constant.
- **P2-B3.** `mapStripeSubscriptionStatus` returns null for `paused` and `incomplete_expired` with no Sentry breadcrumb. Add `level: "info"` breadcrumb tagged with `event_type` + `subscription_status` before the null return.
- **P2-B4.** Rate-limit graceful-degrade allows unlimited Stripe API spend in dev. Add startup assertion: if `STRIPE_SECRET_KEY` set but `UPSTASH_REDIS_REST_URL` not, log a critical Slack ping.
- **P2-B5.** Cancel-then-resubscribe UX has no first-class "Keep my subscription" CTA. Both "Manage subscription" and "Update card or cancel" route to Stripe portal. Add a labeled "Keep my subscription" button when `cancel_at_period_end === true`.
- **P2-B6.** Trial-expiry cron query and unit test query are duplicated, not shared. Extract `expireUnpaidTrials` to `lib/billing/expire-trials.ts` and import from both.

### Calendar (6)

- **P2-C1.** `conflicts.ts:26-74` `detectConflicts` is O(n²) with no upper bound. Early break is fine in practice but hot reconnect with 200+ events adds latency to the 30s-bounded OAuth callback. Bound the window to 7 days.
- **P2-C2.** `is_shared` always false on synced events; "Users read own and shared events" RLS path never engages. Combined with P1-C3, cross-parent coordination structurally never works even though schema implies it should.
- **P2-C3.** Initial Google sync window is 6 months back; calendar-renewal fallback sync re-pulls full history when sync token is empty. Persist per-calendar token incrementally inside the for-loop.
- **P2-C4.** Calendar event creation always sets `household_id = user.id`. Partner accounts create events whose `household_id` points at partner.id, not the household primary. Mirror the `resolveHousehold` pattern from `pickup-risk.ts:105-108`.
- **P2-C5.** Disconnect channel-stop failure leaves Google webhook live for ~7d. Already 410-handled in `webhook/route.ts:51-56`, but billed egress + log noise in the interim. Retry stop on failure.
- **P2-C6.** Recurring-event exceptions still documented but not solved (`sync.ts:193-207`). Acceptable beta tradeoff.

### SMS & Messaging (7)

- **P2-S1.** Twilio signature validation doesn't pre-check length before `timingSafeEqual`. Catches the throw, but the catch is observably different in CPU time. Add `if (signature.length !== expected.length) return false;` defensive guard.
- **P2-S2.** No Slack alert on Twilio outbound failure rate spikes. `lib/twilio.ts:71-89` callers catch and log to Sentry, but 50 nudges failing in a row (Twilio brownout, A2P re-registration) only surfaces if someone reads logs. Add per-cron-run failure-ratio Slack at 25%+.
- **P2-S3.** Outbound message length not capped before send. No upstream guard against bodies exceeding the 1600-char / 10-segment ceiling. Pathological `family_name` interpolation could push past. Add `if (body.length > 1500) body = body.slice(0, 1497) + "..."` in `sendSms`.
- **P2-S4.** `findPendingWaitlistReply` reads waitlist by phone without `normalizePhone`. Works today (writers normalize), but defensive read-site normalization prevents a class of bugs.
- **P2-S5.** Welcome SMS race between SMS-onboarding and web-onboarding completion paths. Both gate on `welcome_sms_sent_at` and stamp on success, but check-then-act sequence. Use conditional UPDATE: `UPDATE profiles SET welcome_sms_sent_at = now() WHERE id = $1 AND welcome_sms_sent_at IS NULL RETURNING id`.
- **P2-S6.** `validateTwilioRequest` doesn't reject empty/missing signature header. Functional but wastes CPU on probe traffic. Early 403.
- **P2-S7.** Phone identity drift: `auth.users.phone` stored digits-only, `profiles.phone_number` stored E.164. Document the convention in a code comment block at `sms-onboarding.ts:131-150`.

### Briefing Engine (5)

- **P2-M1.** Coordination-issues query orders `surfaced_at ASC` (oldest first). LLM recency bias means newer findings get less attention. Switch to `DESC`.
- **P2-M2.** Distance Matrix quota dedup is per-cold-start (`quotaAlertSent` module-level let). Long warm cycles silence the alert for hours during sustained outages. Use per-hour re-arm (`lastAlertAt: number | null` with 1h window).
- **P2-M3.** `morning_briefings.content` retention is unbounded. Briefings accumulate ~1/day forever — for an active user 1825 rows over 5 years, plus quality_issues JSONB. Briefing prose contains kid names, schools. Add 90-day TTL: NULL the `content` column after 90 days, keep quality/grade/sent_at for analytics.
- **P2-M4.** Briefing query is today-only — pre-dawn next-day events (5am flights) fall outside the local-day window. Acceptable for v1.
- **P2-M5.** Web `/api/morning-briefing` SDK call lacks 30s timeout. `anthropic.messages.create` SDK default timeout is 600s. Either pass `{ timeout: 30_000 }` or wrap in `AbortSignal.timeout`.

### Dashboard & UI (11)

- **P2-D1.** SidebarNav active route highlight loses contrast vs hover. `var(--sage)` on `var(--sage-12)` is less prominent than `var(--warm)` on `var(--warm-06)` hover. Deepen active background to `--sage-20`.
- **P2-D2.** Family-invite phone input has no `formatPhone` masking — onboarding/sms-setup does. Inconsistent.
- **P2-D3.** SidebarNav sign-out has no loading state. Settings page sign-out gets it right; sidebar variant does not. Add local `signingOut` state.
- **P2-D4.** Billing "Update card or cancel" shares `action === "portal"` with "Manage subscription". Both spinners fire simultaneously.
- **P2-D5.** Dashboard home redirects to `/dashboard/settings`. SidebarNav order is Household → Calendars → Payments → Settings. Default should match (Household).
- **P2-D6.** `formatPhone` discrepancy — `family/page.tsx:41-45` and `settings/page.tsx:165-170` reimplement near-identical helpers. Lift to `lib/format.ts`.
- **P2-D7.** Coupon input on billing has no submit affordance after blur. User types code, tabs away, clicks button, wonders if code was applied. Add explicit "Apply" or fineprint copy.
- **P2-D8.** Calendars page sync error doesn't expose `conn.sync_error` per-row. Tooltip or expandable detail would help self-service.
- **P2-D9.** Dashboard layout untested on real mobile devices. `layout.tsx:38-52` self-documents the gap. Real iPhone SE / Pixel 7 pass needed.
- **P2-D10.** Calendars disconnect uses inline confirm rather than `<dialog>` — acknowledged limitation in comment.
- **P2-D11.** Touch targets borderline at ~40px in Hero CTA + Pricing CTA. WCAG 2.5.5 wants 44px.

### Landing & Marketing (5)

- **P2-L1.** Layout title and page title disagree. `app/layout.tsx:31` "Kin — The AI that runs your household" vs `page.tsx:27` "Stop keeping your family schedule in your head." Use `template: "%s — Kin"` in layout metadata.
- **P2-L2.** No `alternates.canonical` set on landing. Add to landing, privacy, terms.
- **P2-L3.** Pricing card lacks "what does $39/mo cover?" fineprint. Add "Includes both parents and unlimited kids on one household."
- **P2-L4.** Vercel not listed in privacy-policy processors. Sub-processor for hosting; list for GDPR completeness.
- **P2-L5.** CTA labels inconsistent: "Join the Waitlist" (Hero), "Get Early Access" (Nav + Demo), "Claim your spot" (Pricing). Unify on "Get Early Access."

### Infra & DevOps (6)

- **P2-I1.** Cookie security flags not asserted in source. Relies on `@supabase/ssr` defaults. Add smoke test on `/api/auth/callback` asserting `Secure; HttpOnly; SameSite=Lax`.
- **P2-I2.** No `engines` field or `.nvmrc`. CI pins Node 20 in `.github/workflows/ci.yml:26`; local contributor gets whatever. Add `"engines": {"node": ">=20"}`.
- **P2-I3.** `briefing-audit-daily` pg_cron at `0 14 * * *` UTC = 9am CT in winter, 10am CDT in summer — no DST tracking. Either update comment or split schedules.
- **P2-I4.** `briefing-audit` may lack Slack-on-failure. Verify separately — Sunday-checkin, engagement-nudges, calendar-renewal all have it.
- **P2-I5.** `pickup-risk` cron returns 200 even on partial failure. cron-dispatch + Vercel cron retry on 5xx. Mirror engagement-nudges pattern.
- **P2-I6.** Hardcoded supabase URL in earlier migrations (058, 060, 063, 064) — mitigated by 072's `unschedule`+`schedule` via `functions_base_url()` vault helper. README note about the Vault bootstrap sequence.

### Engagement & Retention (6)

- **P2-E1.** Sunday check-in tz fallback regression — still defaults to `"America/Los_Angeles"` while engagement-nudges (V6 P2-E3) was fixed to `"UTC"`. Inconsistent.
- **P2-E2.** Sunday check-in returns 200 on partial failure. Mirror engagement-nudges 500-on-failure.
- **P2-E3.** Pickup-risk cron never alerts on aggregate failure. Calendar-renewal got V6 P1-E3's 50%-rate alert; pickup-risk did not. Add same threshold.
- **P2-E4.** Pickup-risk loop has no `Sentry.captureException`. Errors push to `errors[]` and continue; Sentry never sees them.
- **P2-E5.** `sentInLastDay` treats `trial_ended` as a generic nudge. Benign today (mutually exclusive), but blocks re-engagement nudges (P1-E1) when those land.
- **P2-E6.** `trial_day12`/`trial_day13` exact-day match is fragile. Twilio-wide failure on day-12 skips message entirely on day-13. Allow backfill: `days === 12 || (days === 13 && !alreadySent(p, "trial_day12"))`.

### Data Integrity & Privacy (6)

- **P2-P1.** Privacy policy missing TCPA / STOP / HELP language. SMS bot correctly handles keywords; policy never mentions them. CTIA requires disclosure: opt-out mechanism, message frequency, carrier fees disclaimer.
- **P2-P2.** `delete_user_account()` misses household-scoped tables for partner deletion (`family_members`, `family_routines`, `family_preferences`, `household_context`, `activity_log`, `user_context_notes`). Cascade fires only when primary is deleted; partner's PII in these tables survives.
- **P2-P3.** `household_invites` retains `invitee_email`/`invitee_phone` after expiration. Expired/rejected invites stay forever — PII of someone who didn't consent. Add `cleanup_expired_invites()` step to cleanup cron.
- **P2-P4.** Privacy policy "encryption at rest" not named (algorithm/scope). Either name "AES-256 at rest via Supabase Postgres" explicitly, or add pgcrypto column-level encryption for SMS bodies + OAuth tokens.
- **P2-P5.** No Data Processing Agreement evidence in repo. Privacy policy §5 names 8 processors. Capture signed DPAs in `docs/compliance/`.
- **P2-P6.** Anthropic workspace logging — verify production API key has logging disabled. Document in `docs/compliance/anthropic.md`.

---

## V6 Carryover Status — Full Landed/Not-Landed Table

All 5 P0 + 28 P1 + 35 P2 items from V6 verified individually below. **Bold** = NOT FIXED or PARTIAL.

### V6 P0 — Launch Blockers

- **P0-1 (V6) Apple multi-account onConflict** — LANDED for Apple (apple/connect/route.ts:87-112 explicit SELECT-then-UPDATE-or-INSERT). **NOT LANDED for Google** — re-opened as **V7 P0-1**.
- **P0-2 (V6) Concurrent sync locking** — LANDED. `sync.ts:27-39` atomic `.update({sync_status:'syncing'}).neq('sync_status','syncing')` claim.
- **P0-3 (V6) Pickup-risk TCPA opt-out** — LANDED. Defense in depth at `pickup-risk.ts:362-368` AND `pickup-windows.ts:386`.
- **P0-4 (V6) Billing `cancel_at_period_end` UI** — LANDED. `billing/page.tsx:219, 330, 332` reads, branches, displays.
- **P0-5 (V6) Slack family_name PII** — **PARTIALLY LANDED**. 4 of 5 sites fixed; briefing.ts:1228 missed. Re-opened as V7 P0-2.

### V6 P1 — Should Fix (28)

**Authentication & Account (4):**
- P1-A1 account-deletion UI — LANDED (settings/page.tsx:450-609 with type-DELETE-to-confirm modal).
- P1-A2 email enumeration on invite/accept — LANDED (route.ts:79-84 generic 404).
- P1-A3 calendar-connect-token TOCTOU — LANDED (atomic conditional UPDATE + per-token rate limit).
- P1-A4 open-redirect in Google OAuth callback — LANDED (SMS_TOKEN_RE regex).

**Billing & Subscription (1):**
- P1-B1 setStatus email fallback for invoice.payment_failed — LANDED (webhook/route.ts:104-118).

**Calendar (3):**
- P1-C1 google_account_email persistence — LANDED for Apple, **LANDED only halfway for Google** because the multi-account upsert never fires (V7 P0-1).
- P1-C2 Distance Matrix quota errors — LANDED via Slack (briefing.ts:492-516); Sentry path still documented-only (V7 P1-M2).
- P1-C3 empty sync-token guard — LANDED (sync.ts:246-251 + apple.ts:187-190).
- P1-C4 Apple disconnect onConflict — LANDED (apple/connect/route.ts:148-156).

**SMS Pipeline (2):**
- P1-S1 partner-invite race — LANDED (migrations 075 + 077 partial unique index).
- P1-S2 partner-invite phone normalization before opt-out — LANDED (partner-invite.ts:168).

**Morning Briefing (3):**
- P1-M1 writer model date pin — LANDED for SMS edge function (`claude-sonnet-4-6-20250930`); **NOT LANDED for web `/api/morning-briefing`** — re-opened as V7 P0-4.
- P1-M2 scorer AbortController — LANDED (briefing-quality.ts:263-326).
- P1-M3 coordination-issues limit — LANDED (briefing.ts:891 raised to 20 + Slack warn at threshold).

**Dashboard & Settings (1):**
- P1-D1 family-page phone input label — LANDED (family/page.tsx:442-457 visually-hidden label + id + aria-label).

**Landing & Marketing (3):**
- P1-L1 OG image meta — LANDED via dynamic Edge route (`apps/web/src/app/opengraph-image.tsx`).
- P1-L2 phone-input error color — LANDED (WaitlistForm.tsx:139-156 with red border + tint + glow + aria-invalid).
- P1-L3 BriefingDemo "Example" label — LANDED (BriefingDemo.tsx:23-26).

**Infrastructure & Security (5):**
- P1-I1 CSP — **PARTIAL** (report-only, no flip schedule, no report sink). Re-opened as V7 P1-I2.
- P1-I2 ADMIN_PHONES env — LANDED in ops/metrics and morning-briefing/index.ts; **lib/notify.ts still uses singular ADMIN_PHONE** (V7 P1-P5).
- P1-I3 TEST_SECRET split — LANDED (test/morning-briefing/route.ts:45-63).
- P1-I4 Sentry sampling — LANDED (`tracesSampleRate: 0.1` in all three configs).
- P1-I5 engagement-nudges return 500 on failure — LANDED (route.ts:586).

**Engagement & Nudges (6):**
- P1-E1 cross-type nudge frequency cap — LANDED (engagement-nudges/route.ts:122-139, 24h window).
- P1-E2 atomic delete via RPC — LANDED (cron/cleanup/route.ts:92).
- P1-E3 calendar-renewal failure-rate Slack — LANDED (calendar-renewal/route.ts:218-241, 50% threshold).
- P1-E4 pickup-risk stale-calendar skip — LANDED (pickup-risk.ts:118-140, 6h threshold).
- P1-E5 calendar-renewal in vercel.json — LANDED (daily 9 UTC) — but introduces **V7 P1-C5** double-scheduling race.
- P1-E6 sunday-checkin isDaytime guard — LANDED (sunday-checkin/route.ts:130).

### V6 P2 — Polish (35)

All 35 verified individually. Status snapshot:
- Auth (4) — all landed
- Billing (3) — all landed (replay test, idempotency key, timing-oracle rate limit)
- Calendar (4) — all landed (renewal needs_reconnect flip, CalDAV URL pilot, recurring exceptions documented, staleness note provider naming)
- SMS (4) — all landed
- Briefing (3) — all landed
- Dashboard (6) — all landed
- Landing (4) — all landed
- Infrastructure (2) — all landed
- Engagement (5) — all landed

Net V6 carryover: 5 P0 + 28 P1 + 35 P2 = 68 items. **65 landed clean, 2 partial (V6 P0-1 Apple-only / V6 P0-5 missed one site), 1 incomplete (V6 P1-I1 CSP report-only)**. ~96% land rate, two regressions promoted to V7 P0.

---

## Comparison to V6

### Improved
- Tests: 52 → **57** (5 new tests including `stripe-webhook-replay.test.ts` with 5 cases pinning the idempotency short-circuit).
- New env vars correctly split (`ADMIN_PHONES`, `TEST_SECRET`).
- Migration recovery handled gracefully (077 idempotently re-asserted 040's column + 075's index + 076's column).
- All 6 pg_cron jobs running through vault-backed `functions_base_url()` helper.
- Dashboard UX maturity: every async action has a loading state, every route group has an error boundary, every form mostly has labels, billing surface displays cancel-at-period-end + scrolls error into view.
- Sentry sampling configured uniformly across server/client/edge.

### Regressed (V6 P0 fixes that need V7 follow-through)
- V6 P0-1 fixed Apple multi-account, missed Google — **V7 P0-1**.
- V6 P0-5 fixed 4 of 5 Slack PII sites — **V7 P0-2**.

### New since V6
- Migration 077 (renewal recovery + invitee_phone repair) landed cleanly.
- `@anthropic-ai/sdk` 0.91 published with 2 moderate sandbox-escape advisories — **V7 P1-I1**.
- Next.js 14.2.x advisory backlog accumulated (cache poisoning + SSRF + middleware + CSP-nonce) — **V7 P1-I1**.

### What V5 cleared that V6 also kept clean
- Trial-flip query still pinned by regression test.
- Stripe webhook idempotency still works (5 cases now passing the replay test).
- Onboarding completion still properly awaited with retry UI.
- All admin phones still in allowlist.
- `/ops` still in middleware.
- All five security headers still shipping.
- Rate limiter still fails closed in prod.
- All 14 rate-limit route keys still defined and invoked.

---

## Recommended ship order

### Phase 1 — P0 fixes (90 minutes)

1. **V7 P0-2 (briefing.ts:1228 + briefing.ts:1416)** — 2 string edits, ~5 min. Slack/log PII leak; finishes V6 P0-5.
2. **V7 P0-4 (lib/anthropic.ts:3 date pin)** — 1 line, ~3 min. Closes deprecation hazard on web on-demand briefing.
3. **V7 P0-5 (account-delete CSRF + rate limit)** — 5 lines, ~10 min. Hardens highest-impact destructive endpoint.
4. **V7 P0-3 (sole-parent guard refactor)** — ~10 lines across briefing-quality.ts + briefing.ts call site, ~20 min. Removes inverted phantom-partner noise.
5. **V7 P0-1 (Google OAuth callback multi-account)** — ~30 lines + 1 migration, ~45 min. Make multi-account Google actually work. Deserves a smoke test against a second Google account.

### Phase 2 — P1 cluster (4-5 hours)

- **Cluster A (compliance & legal):** P1-S1, P1-S2, P1-S3 (STOP footers — A2P 10DLC), P1-P1 (sms_conversations purge), P1-P3 (deletion grace alignment), P1-P4 (sessionStorage), P1-P5 (ADMIN_PHONE), P2-P1 (privacy policy SMS section).
- **Cluster B (calendar reliability):** P1-C1 (needs_reconnect staleness), P1-C2 (Apple disconnect scope), P1-C5 (cron double-scheduling), P1-C6 (Apple all-day anchor).
- **Cluster C (cross-parent coordination):** P1-C3 (synced events partner-visibility) — this is the structural fix that makes the household-coordinator pitch actually work; deserves its own PR with tests.
- **Cluster D (infrastructure):** P1-I1 (npm audit fixes — patch-bump Next + Anthropic SDK), P1-I2 (CSP enforcement flip + report sink), P1-A4 (briefing/health auth).
- **Cluster E (security hardening):** P1-A1 (demo creds), P1-A2 (invite-accept CSRF), P1-A3 (calendar-events mass-assignment), P1-A5 (auth-page labels), P1-P2 (Sentry scrub keys).
- **Cluster F (briefing polish):** P1-M1 (docs rewrite), P1-M2 (Sentry comment), P1-M3 (quality-fail Slack body).
- **Cluster G (UI consistency):** P1-D1 (onboarding theme), P1-D2 (welcome-SMS network error), P1-L1 (schema.org JSON-LD), P1-L2 (ThemeProvider dead code), P1-L3 (robots.txt).
- **Cluster H (billing):** P1-B1 (subscription.deleted cleanup), P1-B2 (charge.dispute handler).
- **Cluster I (retention):** P1-E1 (re-engagement nudge).

Total Phase 2 fix-time estimate: 32 P1 fixes in ~4-5 hours of focused work.

### Phase 3 — P2 polish (deferred to beta week 2-3)

66 items; group by category and ship as 3-4 follow-up PRs. Highest-ROI: Sentry scrub key extension (P1-P2 — already in P1), pgcrypto for OAuth tokens (P2-P4), pickup-risk Sentry+Slack (P2-E3+E4), and the docs rewrite (P1-M1 — already in P1).

---

## Closing summary

V6 was the heaviest landing the codebase has seen — 68 items across 3 commits — and 96% of it landed clean. The two regressions are tractable: a missed file on a multi-site fix, and an Apple-only application of a both-Google-and-Apple bug. Both are 1-2 hour fixes.

The five new V7 P0s sum to ~90 minutes of focused work. The 32 P1s sum to ~4-5 hours. After Phase 1 + Phase 2, the codebase is genuinely ready for closed beta — every TCPA opt-out path is gated, every Stripe failure mode is observable, every destructive endpoint is CSRF-guarded, every PII surface is either scrubbed or documented, and every household-coordination feature actually works across both parents.

Phase 3 (P2 polish) can ship over beta weeks 2-3 without urgency. The remaining ~30 items are real but second-order — Sentry observability, cron retry parity, UI consistency, documentation hygiene. The base is solid.

---

**Audit metadata:** 10 parallel research agents (general-purpose subagents) executed against the full source tree, each producing 1500-2500 words of category-specific findings with file:line references. Total agent runtime: ~12 minutes wall-clock, ~1.2M tokens consumed. This report synthesized from those streams plus direct verification of headline regressions (V6 P0-1 Google callback, V6 P0-5 briefing.ts:1228).
