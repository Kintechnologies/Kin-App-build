-- ─────────────────────────────────────────────────────────────────────────────
-- 041_sms_onboarding.sql
--
-- SMS-first onboarding. Onboarding now happens entirely over text: a new texter
-- gets a profile created on first inbound message (their phone number IS the
-- auth) and is walked through a conversational state machine.
--
-- profiles.onboarding_step is reused as that state machine — the linear range
-- widens from the old 0-5 (4 questions) to 0-9:
--   0 = new (profile just created, no question asked yet)
--   1 = awaiting first name
--   2 = awaiting kids' names + ages
--   3 = awaiting school / daycare
--   4 = awaiting wake time
--   5 = awaiting home location
--   6 = awaiting partner phone (or skip)
--   7 = awaiting recurring commitments
--   8 = calendar-connect link sent, awaiting any reply
--   9 = complete
--
-- calendar_connect_token backs the kinai.family/connect/<token> link sent at
-- step 8. An SMS texter has no web session, so the token is what maps the
-- Google OAuth callback back to their profile. It is one-time: cleared once a
-- calendar connection is successfully attached.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS calendar_connect_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_calendar_connect_token_key
  ON profiles (calendar_connect_token)
  WHERE calendar_connect_token IS NOT NULL;
