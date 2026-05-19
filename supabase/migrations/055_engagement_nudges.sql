-- ─────────────────────────────────────────────────────────────────────────────
-- 055_engagement_nudges.sql
--
-- Tracks which engagement/trial nudge SMS have been sent to a profile, so the
-- /api/cron/engagement-nudges job never texts the same nudge twice.
--
-- nudges_sent is a jsonb map of nudge key → ISO timestamp, e.g.
--   { "onboarding_calendar": "2026-05-18T16:00:00Z", "trial_day3": "..." }
--
-- Keys in use:
--   onboarding_calendar — completed onboarding but no calendar connected (24h+)
--   onboarding_silent   — started onboarding but went silent before finishing
--   trial_day3 / trial_day7 / trial_day12 / trial_day13 — the trial drip
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS nudges_sent jsonb NOT NULL DEFAULT '{}'::jsonb;
