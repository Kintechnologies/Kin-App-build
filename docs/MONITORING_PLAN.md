# Kin Monitoring & Alerting Plan

*Written 2026-05-26. Reference incident: CRON_SECRET rotation broke morning briefings for 4 days with zero alerting.*

---

## The Problem

Austin discovered a 4-day briefing outage by accident. The root cause was a CRON_SECRET mismatch after a Vercel environment variable change — pg_cron jobs fired on schedule, hit the edge functions, got 401'd, and nobody knew. The existing health check (`/api/briefing/health`) exists but nothing calls it automatically. Slack alerts exist but only fire on *successful execution that encounters an error*, not on *jobs that never execute at all*.

**The gap:** Kin monitors errors-during-execution but not absence-of-execution. The CRON_SECRET outage was a silent failure — the jobs ran, the auth failed, and nothing downstream (no briefing row, no error in app code) ever triggered an alert.

---

## Design Principles

1. **Monitor outcomes, not just processes.** "Did users get their briefing?" matters more than "did the cron fire?"
2. **Absence detection over error detection.** The CRON_SECRET bug produced no errors in Kin's code — it produced *nothing*. Monitors must detect missing expected events.
3. **Two-person team reality.** No on-call rotation. Austin is the only responder. Alerts must be low-volume and high-signal or they'll get ignored.
4. **Budget: ~$0/month now, ~$30/month at beta.** Use free tiers aggressively. Build in-house where it's a few hours of work. Pay for things that are hard to build (uptime checks, SMS paging).
5. **Defense in depth.** Every critical path gets at least two independent monitors. If Slack is down, SMS fires. If the app is down, an external service notices.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    EXTERNAL (paid)                       │
│  Better Stack Free: uptime pings + status page          │
│  Sentry Free: error tracking + 1 cron monitor           │
└──────────┬──────────────────────────┬───────────────────┘
           │                          │
┌──────────▼──────────────────────────▼───────────────────┐
│                 INTERNAL (built in-house)                │
│                                                         │
│  watchdog cron (pg_cron, every 30 min)                  │
│    → queries morning_briefings, sms_conversations,      │
│      calendar_connections, cron.job_run_details          │
│    → alerts Slack (critical → SMS fallback)              │
│                                                         │
│  /api/briefing/health (already exists, needs caller)    │
│  /api/ops/metrics (already exists, needs alerting logic)│
│                                                         │
│  Sentry Crons check-ins from edge functions             │
└─────────────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────┐
│                  ALERTING CHANNELS                       │
│  Slack #kin-alerts  ← all alerts (already wired)        │
│  SMS to Austin      ← critical only (already wired)     │
│  Better Stack       ← uptime pages (new)                │
└─────────────────────────────────────────────────────────┘
```

---

## Tool Decisions

### Datadog: No.

Datadog's minimum useful plan runs $50-100+/month and is designed for teams with dedicated SRE. The per-host pricing model punishes even small infrastructure footprints. At Kin's scale, Datadog would cost more than the entire Supabase bill and provide capabilities that a 2-person team can't act on. Revisit only if Kin reaches 10+ microservices or hires an ops person.

### Sentry: Keep and extend.

Already integrated with PII scrubbing, release tracking, and tunnel endpoint. The free tier includes 1 cron monitor — use it for the single most important job (morning-briefing). Sentry's cron monitoring detects *missed* check-ins (absence detection), which is exactly what the CRON_SECRET outage needed. Additional monitors cost $0.78/month each — add more as needed.

### Better Stack (formerly Better Uptime): Add on free tier.

Free tier: 10 monitors, 10 heartbeats, 1 status page, Slack/email alerts. Use for external uptime checks (is kinai.family responding?) and as a heartbeat receiver for cron jobs. This provides the external-to-your-infrastructure vantage point that catches "Vercel is down" or "DNS is broken" — things internal monitors can't see. The free status page is a bonus for communicating with early beta users.

### Cronitor: Skip for now.

Overlaps with Sentry Crons + Better Stack heartbeats. The free tier (5 monitors) is more limited than Better Stack's (10 heartbeats). If Sentry + Better Stack prove insufficient, Cronitor is the first upgrade.

### In-house watchdog: Build it.

A pg_cron job that queries outcome tables and alerts on absence. This is the highest-value monitor and takes ~3 hours to build. It runs inside Supabase (no additional service), uses existing Slack/SMS alerting, and catches the exact class of failure that caused the 4-day outage.

---

## What To Monitor

### 1. Morning Briefing Delivery (CRITICAL)

**What:** Did every eligible user get their briefing today?

**Why this is #1:** This is the core product. A silent failure here means users think Kin is broken (or worse, forget it exists).

**How the CRON_SECRET outage would have been caught:**

| Monitor | Detection time | How |
|---------|---------------|-----|
| Sentry Cron check-in | ~1 hour | morning-briefing edge function never sends `ok` check-in; Sentry alerts on missed schedule |
| Watchdog cron | ~30 min after 7am CT | Queries `morning_briefings` table, finds 0 rows for today after expected delivery window |
| Better Stack heartbeat | ~1 hour | Edge function never pings heartbeat URL on success |
| `/api/briefing/health` | ~25 hours | `checkCron()` finds last briefing >25h old (too slow alone, but catches multi-day outages) |

**Implementation:**

**a) Sentry Cron Monitor (external, ~15 min to set up)**

Add check-in calls to the morning-briefing edge function:

```typescript
// In supabase/functions/morning-briefing/index.ts
// At function start:
const checkInId = crypto.randomUUID();
await fetch(
  `${SENTRY_CRONS_URL}?check_in_id=${checkInId}&status=in_progress`,
  { method: "POST" }
);

// On success:
await fetch(
  `${SENTRY_CRONS_URL}?check_in_id=${checkInId}&status=ok`,
  { method: "POST" }
);

// On failure (in catch block):
await fetch(
  `${SENTRY_CRONS_URL}?check_in_id=${checkInId}&status=error`,
  { method: "POST" }
);
```

Configure the Sentry monitor: schedule `0 * * * *`, checkin margin 5 min, max runtime 10 min. Alert on missed + error.

**b) Watchdog cron — briefing absence check (internal, ~2 hours to build)**

New pg_cron job: `system-watchdog-30min` running `*/30 * * * *`.

```sql
-- Pseudo-logic for the watchdog edge function:
-- 1. Current UTC hour → which timezones are past their 7am delivery window?
-- 2. For each such timezone, count profiles with phone numbers
-- 3. Count morning_briefings rows for today with delivery_status = 'sent'
-- 4. If sent < expected and it's been >2 hours past the delivery window:
--    → Slack critical alert: "X users missing briefings for today"
```

The key insight: don't just check "did the cron fire?" — check "did the *outcome* happen?" This catches CRON_SECRET failures, edge function crashes, Twilio outages, and any other failure mode.

**c) Better Stack heartbeat (external, ~10 min)**

Add a heartbeat ping at the end of the morning-briefing edge function's success path:

```typescript
// After successful delivery batch:
if (BETTER_STACK_HEARTBEAT_URL) {
  await fetch(BETTER_STACK_HEARTBEAT_URL).catch(() => {});
}
```

Configure in Better Stack: expected every 60 min, alert after 2 missed.

---

### 2. Cron Job Health (HIGH)

**What:** Are all 6 pg_cron jobs firing successfully?

**Why:** pg_cron failures are silent. Jobs can be disabled, the scheduler can stall, or (as happened) auth can break. Supabase logs pg_cron results to `cron.job_run_details` but nobody checks it.

**Implementation:**

**a) Watchdog cron — job_run_details check**

The watchdog queries `cron.job_run_details` for each job name and alerts if:
- A job has no successful run in the last `2 * interval` (e.g., no `morning-briefing-hourly` success in 2 hours)
- A job has consecutive failures (status != 'succeeded')
- A job has no runs at all in the last 24 hours (job may be disabled/deleted)

```sql
-- Check for failed or missing runs in the last window
SELECT jobname, status, return_message, start_time
FROM cron.job_run_details
WHERE start_time > now() - interval '2 hours'
ORDER BY start_time DESC;
```

**b) Per-job expected cadence table**

Create a reference table so the watchdog knows what to expect:

| Job name | Expected interval | Alert after missing |
|----------|------------------|-------------------|
| morning-briefing-hourly | 1 hour | 2 hours |
| briefing-audit-daily | 24 hours | 25 hours |
| pickup-risk-30min | 30 min | 1 hour |
| sunday-checkin-hourly | 1 hour (Sundays) | 2 hours (Sundays) |
| engagement-nudges-onboarding-hourly | 1 hour | 2 hours |
| calendar-renewal-6h | 6 hours | 7 hours |

---

### 3. Edge Function Errors & Timeouts (HIGH)

**What:** Are edge functions returning errors or timing out?

**Current state:** Edge functions catch errors and post to Slack, but only when the function *runs*. If the function doesn't deploy or Supabase Edge Functions has an outage, there's no alert.

**Implementation:**

**a) Sentry error alerts (already exists, needs tuning)**

Sentry is configured in the Next.js app but not in Supabase edge functions (Deno runtime). For edge functions, use Sentry's HTTP API or the cron check-in approach above. The check-in covers the most critical case (function didn't run at all).

**b) Supabase dashboard log tailing (manual, free)**

Supabase logs edge function invocations. Set a weekly calendar reminder to scan Edge Function logs in the dashboard for unexpected error rates. Low-tech but catches drift.

**c) Watchdog cron — edge function reachability**

The existing `/api/briefing/health` checkEdgeFunction() sends a GET to the edge function URL and checks for *any* HTTP response (even 405). The watchdog can call this health endpoint periodically. But this checks reachability, not correctness — it's a complement, not a replacement.

---

### 4. SMS Delivery Failures (HIGH)

**What:** Are SMS messages actually being delivered?

**Current state:** `sms_conversations` logs sends with direction `outbound` vs `outbound_failed`. The ops metrics endpoint calculates a delivery rate. But nothing alerts when the rate drops.

**Implementation:**

**a) Watchdog cron — SMS failure rate**

```sql
-- In the last 6 hours, what's the failure rate?
SELECT
  COUNT(*) FILTER (WHERE direction = 'outbound') AS sent,
  COUNT(*) FILTER (WHERE direction = 'outbound_failed') AS failed
FROM sms_conversations
WHERE sent_at > now() - interval '6 hours';
```

Alert rules:
- `failed > 0 AND failed / (sent + failed) > 0.1` → warning (>10% failure rate)
- `failed >= 3 AND failed / (sent + failed) > 0.25` → critical (>25% failure rate or 3+ failures)
- `sent = 0 AND expected > 0` (morning hours, users exist) → critical (total SMS outage)

**b) Twilio status callback (future enhancement)**

Twilio can POST delivery status updates (delivered, undelivered, failed) to a webhook. This gives per-message delivery confirmation rather than just send-success. Add as a beta milestone — requires a new webhook endpoint and status tracking column.

---

### 5. Calendar Sync Health (MEDIUM)

**What:** Are calendar tokens valid and is sync running?

**Current state:** The ops metrics endpoint checks for stale syncs (>6h) and error status. Calendar renewal runs every 6 hours. But nothing alerts when sync degrades.

**Implementation:**

**a) Watchdog cron — stale calendar check**

```sql
SELECT COUNT(*) AS stale_connections
FROM calendar_connections
WHERE enabled = true
  AND (last_synced_at IS NULL OR last_synced_at < now() - interval '12 hours');
```

Alert if stale > 0 — means the 6-hour renewal cron isn't working or tokens are failing to refresh.

**b) Token expiry pre-alert**

The calendar-renewal cron already refreshes tokens, but if it fails silently (e.g., Google revoked access), users lose calendar data in their briefings. The watchdog should flag connections where `sync_status = 'error'` and the error has persisted for >12 hours.

---

### 6. Web App Errors (MEDIUM)

**What:** Is the Next.js app throwing unhandled errors?

**Current state:** Sentry is fully configured with PII scrubbing, release tagging, and ad-blocker tunneling. This is the most mature monitoring in the stack.

**Implementation:**

**a) Sentry alert rules (5 min to configure)**

In Sentry's alert settings, create:
- **"New issue" alert** → Slack #kin-alerts. Fires on first occurrence of any new error type. This is the default but confirm it's enabled.
- **"Spike" alert** → Slack #kin-alerts. Fires when error volume exceeds 10x the weekly average in a 1-hour window.
- **"Regression" alert** → Slack #kin-alerts. Fires when a previously resolved issue recurs. Essential for catching deploy regressions.

**b) Sentry Vercel Cron integration**

For the 2 Vercel cron jobs (`/api/cron/cleanup`, `/api/cron/engagement-nudges`), enable `automaticVercelMonitors: true` in `next.config.js` Sentry settings. This auto-creates Sentry cron monitors for Vercel-triggered crons with zero code changes. Free for the 2 jobs (1 included, 1 at $0.78/month).

---

### 7. Vercel Deployment Health (LOW)

**What:** Did the latest deploy succeed? Is the site up?

**Current state:** Vercel sends deploy notifications (probably to email). No uptime monitoring.

**Implementation:**

**a) Better Stack uptime monitor (free, 5 min to set up)**

Create a monitor for `https://kinai.family` with 3-min check interval. Alert on HTTP status != 200. This catches full outages (deploy broke the site, DNS expired, Vercel incident). Set alert to Slack + email.

**b) Better Stack keyword monitor (optional)**

Monitor a known element on the homepage (e.g., check that the response body contains "Kin"). Catches partial failures where the page loads but the app is broken (SSR error, blank React render).

---

## Alerting Rules

### What pages Austin (SMS) vs. what waits for Slack

**SMS (wake-up-at-3am worthy):**
- Morning briefings not delivered for >2 hours past expected window
- All 3 critical SMS failures in a row (Twilio is down)
- Site is down (Better Stack uptime failure)
- Sentry cron monitor: morning-briefing missed

**Slack only (check in the morning):**
- Individual SMS delivery failure
- Calendar sync stale >12h
- New Sentry error (non-spike)
- Edge function error rate elevated
- Any single cron job failure (non-repeated)

**Daily digest (Slack, 9am CT):**
- Yesterday's briefing delivery rate (X/Y sent, Z% success)
- SMS delivery stats
- Calendar sync status
- Cron job success/failure counts
- Any open Sentry issues

### Alert fatigue prevention

1. **Dedup window:** The watchdog should not re-alert on the same condition within 4 hours. Track last-alert timestamps in a `monitoring_alerts` table.
2. **Escalation:** If a Slack alert gets no acknowledgment (no reaction emoji) within 2 hours, escalate to SMS. (Phase 2 — start with manual escalation.)
3. **Mute during deploys:** Not needed yet. At this scale, deploys are manual and Austin knows when they're happening.

---

## Implementation Plan

### This Week (Days 1-3) — Build with existing tools

**Day 1: Sentry cron monitor + Better Stack uptime (~2 hours)**

1. Create a Sentry cron monitor called `morning-briefing` with schedule `0 * * * *`, margin 5 min, max runtime 10 min
2. Add HTTP check-in calls to `supabase/functions/morning-briefing/index.ts` (in_progress at start, ok/error at end)
3. Sign up for Better Stack free tier
4. Create uptime monitor for `https://kinai.family` (3-min interval, Slack + email alert)
5. Create heartbeat monitor for morning-briefing (expected every 60 min)
6. Add heartbeat ping to morning-briefing edge function success path
7. Configure Sentry alert rules: new issue → Slack, regression → Slack, spike → Slack

**Day 2: Watchdog cron (~4 hours)**

1. Create `system-watchdog` Supabase edge function
2. Checks to implement:
   - `morning_briefings` absence detection (the CRON_SECRET check)
   - `cron.job_run_details` failure/absence detection for all 6 jobs
   - `sms_conversations` failure rate
   - `calendar_connections` stale sync count
3. Create `monitoring_alerts` table for dedup tracking
4. Wire to existing `notifySlack()` pattern with SMS escalation for critical
5. Add pg_cron job: `system-watchdog-30min` at `*/30 * * * *`

**Day 3: Daily digest + health check automation (~2 hours)**

1. Create `daily-digest` edge function (or add to watchdog with a daily schedule)
2. Compiles: briefing stats, SMS stats, calendar status, cron job health, open Sentry issues count
3. Posts to Slack at 9am CT (2pm UTC — same as briefing-audit)
4. Add pg_cron job to call `/api/briefing/health` every 6 hours (external validation)

### Beta Week 1 — Harden

5. Enable `automaticVercelMonitors` in Sentry for Vercel cron jobs
6. Add Better Stack heartbeats for briefing-audit-daily and calendar-renewal-6h
7. Create Better Stack status page (kinai.family/status or status.kinai.family)
8. Add Twilio delivery status callbacks (webhook endpoint + status tracking)

### When You Have Paying Users — Invest

9. Add Better Stack on-call schedule (Team plan, $29/month) for phone call alerts
10. Add Sentry cron monitors for all 6 pg_cron jobs (~$4/month)
11. Consider Checkly for synthetic monitoring (simulate a full briefing flow end-to-end)
12. Evaluate if log aggregation is needed (Better Stack Logs or Supabase Log Explorer is probably enough)

---

## Watchdog Edge Function — Detailed Design

This is the highest-value deliverable. Here's the schema and logic:

### monitoring_alerts table

```sql
CREATE TABLE IF NOT EXISTS public.monitoring_alerts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_key     text NOT NULL,          -- e.g., 'briefing_absence', 'cron_failure:morning-briefing-hourly'
  severity      text NOT NULL,          -- 'warning' | 'critical'
  message       text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at   timestamptz,
  last_notified_at timestamptz NOT NULL DEFAULT now()
);

-- Dedup: only re-alert if last notification was >4 hours ago
CREATE INDEX idx_monitoring_alerts_key_active
  ON public.monitoring_alerts (alert_key)
  WHERE resolved_at IS NULL;
```

### Watchdog checks (pseudocode)

```
function runWatchdog():
  alerts = []

  // 1. Briefing absence
  for each timezone where local time is between 8am-10pm:
    expected = count profiles with phone, in this tz, not opted out
    sent = count morning_briefings for today with status='sent' for these profiles
    if sent < expected AND hours_since_delivery_window > 2:
      alerts.push(critical: "{expected - sent} users missing briefings")

  // 2. Cron job health
  for each job in [morning-briefing-hourly, briefing-audit-daily, ...]:
    last_success = max(start_time) from cron.job_run_details
                   where jobname = job AND status = 'succeeded'
    if now() - last_success > 2 * expected_interval:
      alerts.push(warning: "cron {job} hasn't succeeded in {age}")
    recent_failures = count from cron.job_run_details
                      where jobname = job AND status != 'succeeded'
                      AND start_time > now() - expected_interval * 3
    if recent_failures >= 3:
      alerts.push(critical: "cron {job} has {n} consecutive failures")

  // 3. SMS failure rate
  sent, failed = count from sms_conversations last 6 hours
  if failed > 0 AND failed/(sent+failed) > 0.25:
    alerts.push(critical: "SMS failure rate {rate}% ({failed}/{sent+failed})")
  elif failed > 0:
    alerts.push(warning: "SMS failures detected: {failed} in last 6h")

  // 4. Calendar staleness
  stale = count calendar_connections where enabled
          AND last_synced_at < now() - 12 hours
  if stale > 0:
    alerts.push(warning: "{stale} calendar connections stale >12h")

  // 5. Dedup and send
  for each alert:
    existing = select from monitoring_alerts
               where alert_key = alert.key AND resolved_at IS NULL
    if existing AND existing.last_notified_at > now() - 4 hours:
      skip  // already alerted recently
    else:
      upsert monitoring_alerts
      send to Slack (and SMS if critical)

  // 6. Auto-resolve
  for each open alert not in current alerts list:
    update resolved_at = now()
    send Slack: "Resolved: {message}"
```

---

## Cost Summary

| Tool | Tier | Monthly Cost | What it covers |
|------|------|-------------|----------------|
| Sentry | Free (Developer) | $0 | Error tracking + 1 cron monitor |
| Better Stack | Free | $0 | 10 uptime monitors + 10 heartbeats + status page |
| Watchdog cron | Built in-house | $0 (runs on Supabase) | Outcome-based absence detection |
| Daily digest | Built in-house | $0 (runs on Supabase) | Morning summary to Slack |
| **Total now** | | **$0/month** | |
| Sentry extra crons (beta) | Pay-as-you-go | ~$4/month | 5 additional cron monitors |
| Better Stack Team (paying users) | Team | $29/month | Phone call alerts, on-call |
| **Total at scale** | | **~$33/month** | |

---

## CRON_SECRET Retrospective — Coverage Matrix

How each proposed monitor would have detected the 4-day briefing outage:

| Monitor | Would it have caught it? | When? | How? |
|---------|------------------------|-------|------|
| Sentry cron check-in | Yes | Within 1 hour | morning-briefing function never sends check-in → "missed" alert |
| Better Stack heartbeat | Yes | Within 2 hours | No heartbeat ping received → alert |
| Watchdog: briefing absence | Yes | Within 2.5 hours | 0 rows in morning_briefings for today → critical alert |
| Watchdog: cron.job_run_details | Yes | Within 2 hours | morning-briefing-hourly showing failures (401 responses) |
| `/api/briefing/health` cron check | Yes | Within 25 hours | Last briefing >25h old (slow but catches it) |
| Sentry error tracking | No | Never | No error thrown in Kin's code — the 401 happened in Supabase's edge runtime |
| Better Stack uptime | No | Never | The website was fine; only the cron pipeline was broken |

**Key takeaway:** No single monitor catches everything. The Sentry cron check-in and the watchdog briefing-absence check are the two highest-value additions because they detect the *absence* of expected outcomes — the exact failure mode that went unnoticed for 4 days.
