-- ─────────────────────────────────────────────────────────────────────────────
-- 047_briefing_audit_cron.sql
--
-- Automated trigger for the briefing-audit edge function — the "by any means
-- necessary" delivery backstop.
--
-- Runs once daily at 14:00 UTC (9am CT). By 9am CT every mainland-US timezone
-- has already passed its 6:00am morning-briefing window, so any user without a
-- briefing today was genuinely missed. The audit function finds those users
-- and force-sends their briefing immediately.
--
-- The briefing-audit function has verify_jwt = false (see config.toml), so the
-- cron POST needs no Authorization header — no secret is committed here.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Idempotent: drop any prior registration before re-creating, so re-running the
-- migration (or a manually-created dashboard job of the same name) is safe.
SELECT cron.unschedule('briefing-audit-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'briefing-audit-daily');

SELECT cron.schedule(
  'briefing-audit-daily',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://coxqdpcffmsncvisfyvj.supabase.co/functions/v1/briefing-audit',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
