-- 030_sms_sprint.sql
-- Adds SMS delivery infrastructure for the YC sprint.
-- phone_number: E.164 format, used to identify sender on inbound Twilio webhook
-- onboarding_step: linear state machine (0=not started, 1-4=question, 5=complete)
-- sms_conversations: audit log for every inbound/outbound/outbound_failed SMS

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_step INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_number_key
  ON profiles (phone_number)
  WHERE phone_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS sms_conversations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  direction    TEXT        NOT NULL CHECK (direction IN ('inbound', 'outbound', 'outbound_failed')),
  body         TEXT        NOT NULL,
  from_number  TEXT,
  to_number    TEXT,
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_conversations_profile_id
  ON sms_conversations (profile_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_sms_conversations_from_number
  ON sms_conversations (from_number, sent_at DESC);

ALTER TABLE sms_conversations ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS; no user-facing policies needed for Phase 1.
-- Add SELECT policy if a user-facing SMS history view is built later.

-- daily_questions: forward-compatible scaffold, no application code yet
CREATE TABLE IF NOT EXISTS daily_questions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID        REFERENCES profiles(id) ON DELETE CASCADE,
  question_text TEXT        NOT NULL,
  asked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answered_at   TIMESTAMPTZ,
  answer_text   TEXT
);

ALTER TABLE daily_questions ENABLE ROW LEVEL SECURITY;
