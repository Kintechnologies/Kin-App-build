-- ─────────────────────────────────────────────────────────────────────────────
-- 072_cron_functions_base_url.sql
--
-- Audit v5 P2-I1: the Supabase project URL
-- (https://coxqdpcffmsncvisfyvj.supabase.co) is hardcoded in every pg_cron
-- migration (046, 047, 058, 060, 063, 064). Staging or preview projects can't
-- apply these migrations without an editor pass, and a project rename or
-- multi-env split would leave production crons pointing at the wrong URL.
--
-- Fix: a Vault-backed helper that returns the functions base URL. Migrations
-- 046, 047, 058, 060, 063, 064 are unschedule + re-scheduled here so every
-- cron job dynamically constructs the URL via the helper at run time. The
-- bootstrap step below mirrors `cron_secret` from 063 — pre-apply once per
-- project; missing-secret returns the existing hardcoded URL so production
-- is unaffected by a forgotten bootstrap.
--
-- One-time bootstrap (run BEFORE applying this migration):
--   SELECT vault.create_secret(
--     'https://coxqdpcffmsncvisfyvj.supabase.co/functions/v1',
--     'functions_base_url',
--     'Base URL for Supabase Edge Functions on this project. pg_cron jobs '
--     'concatenate <base>/<function-name> to build their POST URL.'
--   );
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper: returns the functions base URL from Vault, with a production-safe
-- fallback to the legacy hardcoded URL so a missing Vault entry never zeroes
-- the cron fan-out for the prod project.
CREATE OR REPLACE FUNCTION public.functions_base_url()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT COALESCE(
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'functions_base_url' LIMIT 1),
    'https://coxqdpcffmsncvisfyvj.supabase.co/functions/v1'
  );
$$;

REVOKE ALL ON FUNCTION public.functions_base_url() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.functions_base_url() TO postgres;

-- ── Re-register every pg_cron job to source the URL dynamically ──────────────
-- Each re-registration uses the EXACT schedule from its origin migration so the
-- replay is idempotent: applying this migration after the origin migrations
-- replaces the URL string while leaving the schedule and headers untouched.

-- morning-briefing (migration 064)
SELECT cron.unschedule('morning-briefing-hourly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'morning-briefing-hourly');

SELECT cron.schedule(
  'morning-briefing-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url     := public.functions_base_url() || '/morning-briefing',
    headers := public.cron_dispatch_headers(),
    body    := '{}'::jsonb
  );
  $$
);

-- briefing-audit (migration 064)
SELECT cron.unschedule('briefing-audit-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'briefing-audit-daily');

SELECT cron.schedule(
  'briefing-audit-daily',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url     := public.functions_base_url() || '/briefing-audit',
    headers := public.cron_dispatch_headers(),
    body    := '{}'::jsonb
  );
  $$
);

-- pickup-risk-30min (migrations 058, 063)
SELECT cron.unschedule('pickup-risk-30min')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pickup-risk-30min');

SELECT cron.schedule(
  'pickup-risk-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url     := public.functions_base_url() || '/cron-dispatch?job=pickup-risk',
    headers := public.cron_dispatch_headers(),
    body    := '{}'::jsonb
  );
  $$
);

-- sunday-checkin-hourly (migrations 058, 063)
SELECT cron.unschedule('sunday-checkin-hourly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sunday-checkin-hourly');

SELECT cron.schedule(
  'sunday-checkin-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url     := public.functions_base_url() || '/cron-dispatch?job=sunday-checkin',
    headers := public.cron_dispatch_headers(),
    body    := '{}'::jsonb
  );
  $$
);

-- engagement-nudges-onboarding-hourly (migrations 058, 063)
SELECT cron.unschedule('engagement-nudges-onboarding-hourly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'engagement-nudges-onboarding-hourly');

SELECT cron.schedule(
  'engagement-nudges-onboarding-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url     := public.functions_base_url() || '/cron-dispatch?job=engagement-nudges-onboarding',
    headers := public.cron_dispatch_headers(),
    body    := '{}'::jsonb
  );
  $$
);

-- calendar-renewal-6h (migrations 060, 063)
SELECT cron.unschedule('calendar-renewal-6h')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'calendar-renewal-6h');

SELECT cron.schedule(
  'calendar-renewal-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url     := public.functions_base_url() || '/cron-dispatch?job=calendar-renewal',
    headers := public.cron_dispatch_headers(),
    body    := '{}'::jsonb
  );
  $$
);
