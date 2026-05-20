-- ─────────────────────────────────────────────────────────────────────────────
-- 059_calendar_renewal_cron.sql
--
-- Schedules /api/cron/calendar-renewal on a 6-hour cadence via pg_cron, same
-- pattern as 058_subdaily_crons.sql. Two jobs in one route:
--
--   1. Renew Google Calendar push channels within 24h of expiry. Channels live
--      ~7 days max; without this the briefing silently loses sight of new
--      events the moment Google drops the channel.
--   2. Re-sync any enabled connection whose last_synced_at is older than 6h,
--      catching anything a missed webhook would have delivered.
--
-- vercel.json cannot hold a 6-hour schedule on the Hobby plan, so this lives
-- in pg_cron and reaches the Vercel route via the cron-dispatch edge function
-- (see supabase/functions/cron-dispatch/index.ts). Authentication: the edge
-- function injects the project's service-role key as the Bearer token, which
-- the Next.js route accepts via lib/cron-auth.ts. pg_cron itself needs no
-- auth — cron-dispatch has verify_jwt = false.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Idempotent: drop any prior registration before re-creating, so re-running
-- the migration (or a manually-created dashboard job of the same name) is safe.
SELECT cron.unschedule('calendar-renewal-6h')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'calendar-renewal-6h');

SELECT cron.schedule(
  'calendar-renewal-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://coxqdpcffmsncvisfyvj.supabase.co/functions/v1/cron-dispatch?job=calendar-renewal',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
