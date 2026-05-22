-- ─────────────────────────────────────────────────────────────────────────────
-- 063_cron_dispatch_auth.sql
--
-- Audit v4 P0-5: harden cron-dispatch entry against public-internet abuse.
-- Without caller authentication, anyone on the internet could POST to
-- https://<project>.supabase.co/functions/v1/cron-dispatch?job=... and trigger
-- any sub-daily cron at will — a DoS amplifier (Vercel + Supabase + DB +
-- Twilio/Claude spend per request). cron-dispatch (and the calendar-renewal +
-- subdaily crons it fronts) now requires an `x-cron-secret` header matching
-- CRON_SECRET.
--
-- This migration re-registers every pg_cron job that POSTs to cron-dispatch so
-- the header is included. The secret value is read from Supabase Vault at job
-- run time — committing it to a migration would leak it in git.
--
-- One-time bootstrap (run BEFORE applying this migration):
--   SELECT vault.create_secret(
--     '<paste the CRON_SECRET value here>',
--     'cron_secret',
--     'Shared secret for the cron-dispatch edge function. Must match the value '
--     'set in Vercel and in the Supabase edge-function secrets.'
--   );
--
-- If the Vault entry is missing the http_post payload sends an empty header
-- and cron-dispatch returns 401 — visible immediately in the job logs, so the
-- failure mode is loud rather than silent.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper: build the headers JSON object with the cron secret read from Vault.
-- Wrapped in a SECURITY DEFINER function so the pg_cron job (running as the
-- supabase-cron user) does not need direct SELECT on vault.decrypted_secrets.
CREATE OR REPLACE FUNCTION public.cron_dispatch_headers()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT jsonb_build_object(
    'Content-Type', 'application/json',
    'x-cron-secret', COALESCE(
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1),
      ''
    )
  );
$$;

REVOKE ALL ON FUNCTION public.cron_dispatch_headers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cron_dispatch_headers() TO postgres;

-- ── Re-register sub-daily jobs from 058 with the new header ──────────────────

SELECT cron.unschedule('pickup-risk-30min')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pickup-risk-30min');

SELECT cron.schedule(
  'pickup-risk-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://coxqdpcffmsncvisfyvj.supabase.co/functions/v1/cron-dispatch?job=pickup-risk',
    headers := public.cron_dispatch_headers(),
    body    := '{}'::jsonb
  );
  $$
);

SELECT cron.unschedule('sunday-checkin-hourly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sunday-checkin-hourly');

SELECT cron.schedule(
  'sunday-checkin-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://coxqdpcffmsncvisfyvj.supabase.co/functions/v1/cron-dispatch?job=sunday-checkin',
    headers := public.cron_dispatch_headers(),
    body    := '{}'::jsonb
  );
  $$
);

SELECT cron.unschedule('engagement-nudges-onboarding-hourly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'engagement-nudges-onboarding-hourly');

SELECT cron.schedule(
  'engagement-nudges-onboarding-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://coxqdpcffmsncvisfyvj.supabase.co/functions/v1/cron-dispatch?job=engagement-nudges-onboarding',
    headers := public.cron_dispatch_headers(),
    body    := '{}'::jsonb
  );
  $$
);

-- ── Re-register calendar-renewal from 060 with the new header ────────────────

SELECT cron.unschedule('calendar-renewal-6h')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'calendar-renewal-6h');

SELECT cron.schedule(
  'calendar-renewal-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://coxqdpcffmsncvisfyvj.supabase.co/functions/v1/cron-dispatch?job=calendar-renewal',
    headers := public.cron_dispatch_headers(),
    body    := '{}'::jsonb
  );
  $$
);
