-- ─────────────────────────────────────────────────────────────────────────────
-- 044_lifecycle_emails.sql
--
-- Tracking columns for the Resend lifecycle email system (lib/email.ts).
-- Each timestamp records when a one-time email was sent so the cron jobs and
-- webhook handlers never double-send. NULL = not yet sent.
--
--   welcome_email_sent_at      — sent once after onboarding completes
--   trial_day2_email_sent_at   — drip: "Getting the most out of Kin"
--   trial_day4_email_sent_at   — drip: "What Kin learns over time"
--   trial_day6_email_sent_at   — drip: "Your trial wraps up tomorrow"
--   trial_expiry_email_sent_at — day 7: "Your Kin trial is complete"
--   payment_email_sent_at      — sent once on first successful payment
--   weekly_recap_sent_at       — last weekly recap (re-sent every Sunday)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_day2_email_sent_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_day4_email_sent_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_day6_email_sent_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_expiry_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_email_sent_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS weekly_recap_sent_at       TIMESTAMPTZ;
