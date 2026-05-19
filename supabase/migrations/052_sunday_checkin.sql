-- ─────────────────────────────────────────────────────────────────────────────
-- 052_sunday_checkin.sql
--
-- Weekly Sunday check-in feature.
--
-- Every Sunday ~2pm in the user's local timezone, Kin texts each active user
-- asking what's coming up that week. The /api/cron/sunday-checkin route fans
-- out hourly and sends only to users whose local time is currently the 2pm
-- hour on a Sunday. The user's reply is captured by the inbound SMS webhook and
-- folded into Monday's morning briefing.
--
-- Two pieces of schema:
--   1. profiles.sunday_checkin_sent_at / _reply_at — dedup + reply tracking, so
--      the cron never double-sends and the inbound SMS route knows whether an
--      incoming message is the awaited check-in reply.
--   2. user_context_notes — free-form notes the briefing pipeline folds into the
--      morning briefing. expires_at gives each note a TTL so it only colors the
--      briefing for the week it was given.
--
-- user_context_notes is service-role only — the inbound webhook writes it and
-- the briefing edge function reads it, both with the service key. Direct
-- anon/authenticated access is denied via RLS.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS sunday_checkin_sent_at  timestamptz,
  ADD COLUMN IF NOT EXISTS sunday_checkin_reply_at timestamptz;

CREATE TABLE IF NOT EXISTS user_context_notes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source      text        NOT NULL DEFAULT 'sunday_checkin',
  content     text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '8 days')
);

-- The briefing generator looks up live notes for one profile: filter by
-- profile_id, drop expired rows, newest first.
CREATE INDEX IF NOT EXISTS idx_user_context_notes_profile_live
  ON user_context_notes (profile_id, expires_at DESC);

ALTER TABLE user_context_notes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_context_notes'
      AND policyname = 'no_direct_access'
  ) THEN
    CREATE POLICY "no_direct_access" ON user_context_notes FOR ALL USING (false);
  END IF;
END $$;

COMMENT ON TABLE user_context_notes IS
  'Free-form context notes folded into the morning briefing. Populated by the inbound SMS webhook (Sunday check-in replies); read by the briefing edge function. expires_at is a TTL.';
COMMENT ON COLUMN user_context_notes.source     IS 'Where the note came from — ''sunday_checkin'', etc.';
COMMENT ON COLUMN user_context_notes.expires_at IS 'After this timestamp the note is ignored by the briefing pipeline.';

COMMENT ON COLUMN profiles.sunday_checkin_sent_at  IS 'When the most recent weekly Sunday check-in text was sent. Dedup guard for /api/cron/sunday-checkin.';
COMMENT ON COLUMN profiles.sunday_checkin_reply_at IS 'When the user replied to their most recent Sunday check-in. NULL = awaiting a reply.';
