-- ═══════════════════════════════════════════════════════════════
-- 032 · Waitlist profile fields (YC pre-submission, 2026-05-03)
-- ═══════════════════════════════════════════════════════════════
-- The kinai.family landing page now collects first_name, last_name,
-- and situation after the email step. This migration:
--
--   1. Creates the `waitlist` table if missing. (Migration 023
--      defined it, but at the time this migration was written the
--      remote DB had 023 in its tracker without the table actually
--      existing — likely from a manual drop. CREATE IF NOT EXISTS
--      keeps both states valid.)
--   2. Adds the three new profile columns as nullable text — old
--      rows pre-date the expanded form and remain NULL.
--   3. Constrains `situation` to the four values surfaced in the UI.
--
-- The API route uses the service role key and bypasses RLS; the
-- table denies all direct (anon / authenticated) access.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS waitlist (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT        NOT NULL,
  source       TEXT        NOT NULL DEFAULT 'landing_page',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT waitlist_email_unique UNIQUE (email),
  CONSTRAINT waitlist_email_format CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name  TEXT,
  ADD COLUMN IF NOT EXISTS situation  TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'waitlist_situation_valid'
  ) THEN
    ALTER TABLE waitlist
      ADD CONSTRAINT waitlist_situation_valid
      CHECK (situation IS NULL OR situation IN ('co-parent', 'dual-parent', 'caregiver', 'other'));
  END IF;
END $$;

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'waitlist' AND policyname = 'no_direct_access'
  ) THEN
    CREATE POLICY "no_direct_access"
      ON waitlist
      FOR ALL
      USING (false);
  END IF;
END $$;

COMMENT ON TABLE waitlist IS
  'Email + profile addresses captured on the kinai.family public marketing site.';

COMMENT ON COLUMN waitlist.source     IS 'Where the signup came from — ''landing_page'', ''referral'', etc.';
COMMENT ON COLUMN waitlist.first_name IS 'First name collected from the expanded landing-page form.';
COMMENT ON COLUMN waitlist.last_name  IS 'Last name collected from the expanded landing-page form.';
COMMENT ON COLUMN waitlist.situation  IS 'Self-reported family situation: co-parent | dual-parent | caregiver | other.';
