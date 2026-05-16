-- ─────────────────────────────────────────────────────────────────────────────
-- 040_partner_invite_phone_welcome.sql
--
-- Two changes that let the partner invite work over SMS and let the post-
-- onboarding welcome SMS stay idempotent:
--
-- 1. household_invites becomes phone-capable. A partner invited by text has no
--    email on file until they sign up, so invitee_email is now nullable and an
--    invitee_phone column carries the number instead. Every invite row still
--    has a unique invite_code, so the /join/invite/<code> link works the same
--    regardless of which channel delivered it.
--
-- 2. profiles.welcome_sms_sent_at records when the one-time welcome SMS was
--    sent so the onboarding-complete hook never double-texts a user.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE household_invites
  ALTER COLUMN invitee_email DROP NOT NULL;

ALTER TABLE household_invites
  ADD COLUMN IF NOT EXISTS invitee_phone TEXT;

CREATE INDEX IF NOT EXISTS idx_invites_invitee_phone
  ON household_invites (invitee_phone);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS welcome_sms_sent_at TIMESTAMPTZ;
