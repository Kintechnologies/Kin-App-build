-- ─────────────────────────────────────────────────────────────────────────────
-- 064_briefing_cron_auth.sql
--
-- Audit v5 P0-2: close the side door on the morning-briefing + briefing-audit
-- edge functions.
--
-- Migration 063 (audit v4 P0-5) gated cron-dispatch with an x-cron-secret
-- header but missed these two functions because pg_cron calls them directly via
-- net.http_post (they aren't routed through cron-dispatch). Both functions now
-- require the same x-cron-secret header that matches CRON_SECRET. This
-- migration re-registers their pg_cron jobs (originally from migrations 046 and
-- 047) so the header is supplied via the SECURITY DEFINER helper added in 063.
--
-- The cron_secret Vault entry must exist (already created during 063 bootstrap).
-- If the Vault entry is missing the http_post payload sends an empty header and
-- both functions return 401 — visible in the job logs.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── Re-register morning-briefing (from 046) with the cron secret header ─────

SELECT cron.unschedule('morning-briefing-hourly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'morning-briefing-hourly');

SELECT cron.schedule(
  'morning-briefing-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://coxqdpcffmsncvisfyvj.supabase.co/functions/v1/morning-briefing',
    headers := public.cron_dispatch_headers(),
    body    := '{}'::jsonb
  );
  $$
);

-- ── Re-register briefing-audit (from 047) with the cron secret header ───────

SELECT cron.unschedule('briefing-audit-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'briefing-audit-daily');

SELECT cron.schedule(
  'briefing-audit-daily',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://coxqdpcffmsncvisfyvj.supabase.co/functions/v1/briefing-audit',
    headers := public.cron_dispatch_headers(),
    body    := '{}'::jsonb
  );
  $$
);
