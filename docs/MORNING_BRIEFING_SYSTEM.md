# Kin Morning Briefing System

> **P1-M1 rewrite (audit v7).** The prior version of this doc described
> Expo push notifications, `parent_schedules` / `children_allergies` /
> `pet_details` / `fitness_profiles` / `budget_categories`, a 6am UTC
> daily job, and a SYSTEM_PROMPT that explicitly required opening with
> "Morning." None of those are accurate any longer — Kin is SMS + web
> only (no mobile app in this monorepo), the relevant tables don't
> exist, and the system prompt now explicitly forbids "Morning." as an
> opener. This file is the lightweight, current source of truth. The
> code is authoritative; treat anything below that diverges from the
> code as a doc bug worth fixing.

## Overview

A daily 6 AM SMS that synthesizes the family's day into ~480 chars (≤600
when ending with a question). The reader is a parent looking at their
phone before the day starts — they want the one thing that requires
action or awareness, in plain text, in under ten seconds.

Delivery: outbound SMS via Twilio. Channel: per-recipient mobile phone.
No mobile app, no push notifications.

## Schedule

The briefing fan-out runs **hourly**, not once at 6 AM UTC. Each tick
selects every household whose **local** time is 6 AM right now. A
profile in PT receives at 6 AM PT; a profile in ET receives at 6 AM ET.
The hourly fan-out is scheduled in pg_cron and reaches the Supabase
edge function via the cron-dispatch shim
(`supabase/migrations/058_subdaily_crons.sql`).

## Pipeline

1. **`supabase/functions/morning-briefing/`** — edge function entrypoint
   invoked by the cron dispatcher. Iterates the eligible profiles and
   calls into the shared briefing builder per profile.
2. **`supabase/functions/_shared/briefing.ts`** — shared between the
   morning-briefing fan-out, the per-event briefing audit, and the web
   on-demand path (`/api/morning-briefing`). Pulls calendar events,
   family members, routines, household context, and recent
   coordination issues into a single prompt; calls Anthropic; runs the
   output through `briefing-quality.ts`; writes
   `morning_briefings.content`; dispatches via Twilio.
3. **`supabase/functions/_shared/briefing-quality.ts`** — guards the
   output before send. Catches sole-parent phantom-partner mentions
   (P0-3 audit v7 reworked this from regex to semantic), catches
   ungrounded events, and posts to Slack on quality failure. Returns a
   grade + issue list that gets persisted on the briefing row for
   trend analysis.
4. **Web on-demand** — `/api/morning-briefing` exposes the same builder
   for the dashboard "preview my briefing" button. Wraps the LLM call
   in a 30s `AbortSignal.timeout` (P2-M5 audit v7) and pins the model
   to `claude-sonnet-4-6-20250930` (P0-4 audit v7).

## Model & prompt

- Model: `claude-sonnet-4-6-20250930` (pinned date suffix at both the
  SMS edge function and the web on-demand path).
- System prompt: in `briefing.ts`. The directives that matter:
  - **No greeting.** Do not open with "Good morning", "Morning.", "Hey",
    or any greeting. Start with the substance.
  - **No markdown, no newlines.** One run of sentences. Under 480
    chars, or under 600 only when ending with a contextual question.
  - **No calendar recap.** Surface implication, not inventory.
  - **Grounding.** Every fact must trace to the context — never invent
    an errand, deadline, departure time, or task. When the context is
    thin, a shorter briefing is the correct briefing.

## Data the briefing reads

- `profiles` — primary parent + partner, household linkage, timezone.
- `family_members` — kids, partners, pets; relationship + age. Single
  source of truth for "does this household have a partner" (the
  phantom-partner guard reads this directly, not the prompt).
- `family_routines` — recurring patterns Kin has learned (school
  drop-off times, sports nights, regular pickups).
- `family_preferences` — confirmed prefs (preferred restaurants, etc.).
- `household_context` — facts Kin has accumulated from chat + SMS.
- `calendar_events` — Google + Apple synced events visible to the
  household. P1-C3 audit v7 made cross-parent visibility work by
  stamping `household_id` + `is_shared=true` on synced events
  (private/confidential events stay owner-only).
- `coordination_issues` — short-window cross-parent surfaces (conflict
  detection, late schedule changes).

## Privacy posture

- Briefing prose contains kid names, school names, partner names,
  calendar event titles, and locations. It is the most sensitive
  surface of paying-family life.
- `morning_briefings.content` is RLS-scoped by `profile_id`. Plans for
  90-day TTL on `content` (NULL the column, retain grade + quality
  signals for analytics) are tracked as P2-M3.
- Slack alerts include `profile_id` + grade + score + issue count
  only — never the body. Body dumps in alerts were a V6 leak vector
  (P0-2 audit v7 closed the last sites).

## Failure modes & alerts

- **Anthropic API failure after retries** — fallback plaintext briefing
  is sent; Slack `warning` fires with profile id only.
- **Distance Matrix quota exhausted** — Slack `warning`, dedupe per
  cold-start (P2-M2 still open — switch to per-hour re-arm).
- **Quality grade ≤ C** — Slack `warning` with profile id + grade +
  issue count. The body never appears in the alert.
- **Per-event briefing audit failure** — Slack `warning`; never blocks
  the next briefing.

## Test endpoints

- `/api/test/morning-briefing` — manual trigger for the on-demand
  path. Gated by `TEST_SECRET` (V6 P1-I3 split it from `CRON_SECRET`).
- `/api/briefing/health` — reliability checker hit by external monitor.
  Gated by `CRON_SECRET` (P1-A4 audit v7); unauthenticated GET no
  longer spams Twilio + Slack.

## Cron jobs that touch this pipeline

- `morning-briefing-hourly` — pg_cron, hourly, fans out per-user-local
  6am.
- `briefing-audit-daily` — pg_cron, daily.
- `calendar-renewal` — pg_cron every 6h. Vercel Cron is no longer in
  the mix (P1-C5 audit v7 dropped it — pg_cron is the single source of
  truth so the renewal claim race can't happen).

## Out of scope

- Mobile app, Expo, push notifications.
- Allergy / pet / budget / fitness contexts.
- The "6 AM UTC daily" job — never existed in the current pipeline.

For anything older than this doc, check the per-file header comments
in `supabase/functions/_shared/briefing.ts` — those are kept current as
fixes land.
