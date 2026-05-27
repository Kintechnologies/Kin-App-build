-- ─────────────────────────────────────────────────────────────────────────────
-- 081_disable_engagement_nudges_for_beta.sql
--
-- Disable the engagement-nudges pg_cron job for the closed beta.
--
-- The onboarding drip (calendar-not-connected and silent-mid-onboarding
-- nudges, fired hourly from this job) is intentionally turned off while the
-- product is in a 10-family beta where Austin is personally talking to every
-- household. Automated retention SMS feel impersonal at that scale and step
-- on direct outreach he's already doing.
--
-- The daily trial-drip + re-engagement modes (?mode=trial in
-- apps/web/vercel.json) are removed in the same commit for the same reason.
--
-- Re-enable when the user base scales past ~50 families and personal
-- touch stops scaling. To restore: re-run the schedule block in
-- supabase/migrations/072_cron_functions_base_url.sql for this jobname.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT cron.unschedule('engagement-nudges-onboarding-hourly')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'engagement-nudges-onboarding-hourly'
);
