-- ═══════════════════════════════════════════════════════════════
-- 050 · Waitlist phone-first signup (landing page revamp, 2026-05-18)
-- ═══════════════════════════════════════════════════════════════
-- The kinai.family landing page is now SMS-first: the waitlist form
-- collects a phone number, not an email. This migration:
--
--   1. Makes `email` nullable — phone-only signups have no email.
--   2. Ensures the `phone` column exists (added in 034; re-stated
--      here with IF NOT EXISTS so a fresh DB that skipped 034 is
--      still valid).
--   3. Adds a UNIQUE constraint on `phone` so repeat signups dedupe
--      the same way email does — the API treats 23505 as success.
--      Postgres allows multiple NULLs in a UNIQUE column, so legacy
--      email-only rows (phone NULL) are unaffected.
--   4. Requires at least one contact method per row.
--
-- The API route uses the service role key and bypasses RLS.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE waitlist ALTER COLUMN email DROP NOT NULL;

ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS phone TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'waitlist_phone_format'
  ) THEN
    ALTER TABLE waitlist
      ADD CONSTRAINT waitlist_phone_format
      CHECK (phone IS NULL OR phone ~ '^\+[1-9]\d{7,14}$');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'waitlist_phone_unique'
  ) THEN
    ALTER TABLE waitlist
      ADD CONSTRAINT waitlist_phone_unique UNIQUE (phone);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'waitlist_contact_present'
  ) THEN
    ALTER TABLE waitlist
      ADD CONSTRAINT waitlist_contact_present
      CHECK (email IS NOT NULL OR phone IS NOT NULL);
  END IF;
END $$;

COMMENT ON COLUMN waitlist.email IS 'Optional — nullable since the SMS-first form (050) collects phone instead.';
COMMENT ON COLUMN waitlist.phone IS 'E.164-normalized mobile number (e.g. +14155550117). Primary contact for SMS-first signups; unique.';
