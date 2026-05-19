-- ─────────────────────────────────────────────────────────────────────────────
-- 058_subdaily_crons.sql
--
-- Moves the three sub-daily cron jobs off Vercel Cron and onto pg_cron.
--
-- The Vercel Hobby plan only allows daily cron schedules, so any sub-daily
-- entry in vercel.json blocks every deploy. These three jobs now run as
-- pg_cron schedules that POST to the `cron-dispatch` edge function, which
-- forwards each call to the matching Vercel-hosted Next.js route:
--
--   pickup-risk-30min                  */30 * * * *  -> /api/cron/pickup-risk
--   sunday-checkin-hourly              0 * * * *     -> /api/cron/sunday-checkin
--   engagement-nudges-onboarding       0 * * * *     -> /api/cron/engagement-nudges?mode=onboarding
--
-- The daily jobs (cleanup, engagement-nudges?mode=trial) stay in vercel.json.
--
-- Why the edge-function hop: the Next.js cron routes require a Bearer token.
-- cron-dispatch authenticates to them with the project's service-role key,
-- which Supabase auto-injects into the function — so no secret is committed
-- here. cron-dispatch has verify_jwt = false (see config.toml), so the
-- pg_cron POST below needs no Authorization header itself.
--
-- This mirrors the morning-briefing pattern (046_morning_briefing_cron.sql).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Idempotent: drop any prior registration before re-creating, so re-running
-- the migration (or a manually-created dashboard job of the same name) is safe.

-- pickup-risk — intra-day pickup-conflict detection, every 30 minutes.
SELECT cron.unschedule('pickup-risk-30min')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pickup-risk-30min');

SELECT cron.schedule(
  'pickup-risk-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://coxqdpcffmsncvisfyvj.supabase.co/functions/v1/cron-dispatch?job=pickup-risk',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- sunday-checkin — weekly check-in, fired hourly; the route fans out to users
-- whose local time is Sunday 2pm.
SELECT cron.unschedule('sunday-checkin-hourly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sunday-checkin-hourly');

SELECT cron.schedule(
  'sunday-checkin-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://coxqdpcffmsncvisfyvj.supabase.co/functions/v1/cron-dispatch?job=sunday-checkin',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- engagement-nudges (onboarding mode) — onboarding nudge SMS, fired hourly so
-- a nudge lands the moment the recipient wakes into their local daytime.
SELECT cron.unschedule('engagement-nudges-onboarding-hourly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'engagement-nudges-onboarding-hourly');

SELECT cron.schedule(
  'engagement-nudges-onboarding-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://coxqdpcffmsncvisfyvj.supabase.co/functions/v1/cron-dispatch?job=engagement-nudges-onboarding',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
