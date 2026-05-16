-- ─────────────────────────────────────────────────────────────────────────────
-- 042_profiles_welcome_sms_sent_at.sql
--
-- Repair: profiles.welcome_sms_sent_at was introduced by migration 040, but the
-- column never landed on the remote database — 040 is recorded in the migration
-- history as applied while the ALTER TABLE profiles statement never took effect
-- there. The merged SMS onboarding flow (lib/sms-onboarding.ts, step 8) and the
-- web welcome hook (api/account/onboarding-complete) both read and write this
-- column, so onboarding completion fails without it.
--
-- ADD COLUMN IF NOT EXISTS is a safe no-op on any database where 040 did land.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS welcome_sms_sent_at TIMESTAMPTZ;
