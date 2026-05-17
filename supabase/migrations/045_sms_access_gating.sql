-- ─────────────────────────────────────────────────────────────────────────────
-- 045_sms_access_gating.sql
--
-- SMS beta is now invite-only. The inbound webhook (/api/sms/inbound) gates a
-- brand-new number on the approved-numbers allowlist:
--   - approved   → full SMS onboarding flow (a profile is minted)
--   - unapproved → a warm waitlist reply, and the number is saved to sms_waitlist
--
-- An admin promotes a number with /api/admin/sms/approve, which inserts it into
-- sms_approved_numbers; the texter can then come back and onboard.
--
-- Tables:
--   sms_approved_numbers — the allowlist. Membership = "let this number in".
--   sms_waitlist         — unapproved numbers that texted Kin, one row per
--                          number, message_count bumped on repeat texts.
--
-- Both tables are service-role only — the inbound webhook and the admin route
-- use the service key. Direct anon/authenticated access is denied via RLS.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sms_approved_numbers (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number  TEXT        NOT NULL,
  approved_by   TEXT,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT sms_approved_numbers_phone_unique UNIQUE (phone_number),
  CONSTRAINT sms_approved_numbers_phone_format CHECK (phone_number ~ '^\+[1-9]\d{7,14}$')
);

CREATE TABLE IF NOT EXISTS sms_waitlist (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number   TEXT        NOT NULL,
  first_message  TEXT,
  message_count  INTEGER     NOT NULL DEFAULT 1,
  approved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_texted_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT sms_waitlist_phone_unique UNIQUE (phone_number),
  CONSTRAINT sms_waitlist_phone_format CHECK (phone_number ~ '^\+[1-9]\d{7,14}$')
);

-- Backfill: every number that already has a profile was already let in, so it
-- is implicitly approved. Without this, existing beta users would be bounced to
-- the waitlist the next time they text. (The inbound handler only gates numbers
-- with NO profile, so this is belt-and-suspenders — but it keeps the allowlist
-- the single source of truth for "who is in".)
INSERT INTO sms_approved_numbers (phone_number, approved_by, note)
SELECT DISTINCT phone_number, 'migration_045', 'backfilled from existing profiles'
FROM profiles
WHERE phone_number IS NOT NULL
  AND phone_number ~ '^\+[1-9]\d{7,14}$'
ON CONFLICT (phone_number) DO NOTHING;

ALTER TABLE sms_approved_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_waitlist         ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sms_approved_numbers'
      AND policyname = 'no_direct_access'
  ) THEN
    CREATE POLICY "no_direct_access" ON sms_approved_numbers FOR ALL USING (false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sms_waitlist'
      AND policyname = 'no_direct_access'
  ) THEN
    CREATE POLICY "no_direct_access" ON sms_waitlist FOR ALL USING (false);
  END IF;
END $$;

COMMENT ON TABLE sms_approved_numbers IS
  'Invite-only allowlist for the SMS beta. A number here gets the full onboarding flow when it texts Kin.';
COMMENT ON COLUMN sms_approved_numbers.approved_by IS 'Who approved it — ''migration_045'', ''admin_api'', etc.';
COMMENT ON COLUMN sms_approved_numbers.note        IS 'Optional free-text note recorded at approval time.';

COMMENT ON TABLE sms_waitlist IS
  'Numbers that texted Kin before being approved. One row per number; message_count bumps on repeat texts.';
COMMENT ON COLUMN sms_waitlist.first_message  IS 'The body of the first text the number sent Kin.';
COMMENT ON COLUMN sms_waitlist.message_count  IS 'How many times this number has texted while still unapproved.';
COMMENT ON COLUMN sms_waitlist.approved_at    IS 'Set when an admin promotes the number; NULL = still waiting.';
COMMENT ON COLUMN sms_waitlist.last_texted_at IS 'Timestamp of the most recent text from this number.';
