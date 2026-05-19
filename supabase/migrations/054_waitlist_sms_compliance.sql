-- ═══════════════════════════════════════════════════════════════
-- 054 · Waitlist SMS compliance (TCPA / A2P 10DLC, 2026-05-18)
-- ═══════════════════════════════════════════════════════════════
-- The phone-first waitlist texts each signup a confirmation SMS.
-- TCPA and Twilio's A2P 10DLC rules require a provable consent trail
-- and an honored opt-out. Migration 034 already added sms_consent,
-- sms_consent_at, and sms_consent_text (the verbatim opt-in copy).
-- This migration completes the trail:
--
--   sms_consent_source  Where the opt-in happened — e.g.
--                       'website_waitlist_form'. Pairs with the
--                       existing sms_consent_at timestamp.
--   sms_opted_out_at    Set when the number replies STOP/UNSUBSCRIBE.
--                       Non-NULL means: never send this number SMS
--                       again. The marketing API and the inbound
--                       webhook both gate sends on this.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS sms_consent_source TEXT,
  ADD COLUMN IF NOT EXISTS sms_opted_out_at   TIMESTAMPTZ;

COMMENT ON COLUMN waitlist.sms_consent_source IS
  'Where the SMS opt-in was captured — e.g. ''website_waitlist_form''. Pairs with sms_consent_at.';
COMMENT ON COLUMN waitlist.sms_opted_out_at IS
  'Set when the number replies STOP/UNSUBSCRIBE. Non-NULL = suppressed: never send SMS to this number.';
