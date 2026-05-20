-- ═══════════════════════════════════════════════════════════════
-- 059 · Profiles SMS opt-out flag (TCPA / A2P 10DLC, 2026-05-19)
-- ═══════════════════════════════════════════════════════════════
-- Migration 057 added sms_opted_out_at to the waitlist so the
-- phone-first marketing flow honors STOP replies. The same column
-- is missing from profiles, which means a paying / onboarded user
-- who replies STOP gets the inbound webhook's empty TwiML — but
-- the morning briefing, Sunday check-in, engagement nudges, and
-- intra-day pickup alerts have no flag to gate their sends on,
-- and would keep texting that user. That is a TCPA exposure.
--
-- This migration adds sms_opted_out_at to profiles. The inbound
-- STOP handler stamps it, and every SMS sender that targets a
-- profile (briefings, nudges, alerts, check-ins) treats a
-- non-NULL value as a hard suppression: never text this user
-- again from any automated path.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS sms_opted_out_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.sms_opted_out_at IS
  'Set when the user replies STOP/UNSUBSCRIBE to any Kin SMS. Non-NULL = suppressed: never send automated SMS (briefing, nudge, alert, check-in) to this profile.';
