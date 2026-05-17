-- ─────────────────────────────────────────────────────────────────────────────
-- 046_morning_briefing_cron.sql
--
-- Automated trigger for the morning-briefing edge function.
--
-- The function runs hourly (0 * * * *) and fans out internally to users whose
-- local time falls in the 6am hour of their timezone. Previously the schedule
-- existed only as a manual setting in the Supabase dashboard, so it could
-- silently stop firing and leave morning briefings unsent. This migration moves
-- the trigger into version-controlled schema as a pg_cron job.
--
-- The morning-briefing function has verify_jwt = false (see config.toml), so
-- the cron POST needs no Authorization header — no secret is committed here.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Idempotent: drop any prior registration before re-creating, so re-running the
-- migration (or a manually-created dashboard job of the same name) is safe.
SELECT cron.unschedule('morning-briefing-hourly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'morning-briefing-hourly');

SELECT cron.schedule(
  'morning-briefing-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://coxqdpcffmsncvisfyvj.supabase.co/functions/v1/morning-briefing',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
