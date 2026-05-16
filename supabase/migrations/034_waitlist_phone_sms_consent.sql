-- ═══════════════════════════════════════════════════════════════
-- 034 · Waitlist phone + SMS consent (Twilio A2P/10DLC, 2026-05-06)
-- ═══════════════════════════════════════════════════════════════
-- Twilio rejected our 10DLC A2P registration with error 30909 —
-- carriers couldn't verify the Call to Action. The landing-page
-- waitlist form now collects a phone number alongside email, with
-- an explicit SMS opt-in checkbox and the consent copy shown
-- on-screen. We persist all three pieces here so we can prove to
-- carriers (and to ourselves) which user opted in, when, and to
-- exactly what wording.
--
-- Columns:
--   phone             E.164-normalized mobile number (nullable for
--                     historical rows that pre-date this change).
--   sms_consent       Boolean — true means the user ticked the
--                     opt-in checkbox.
--   sms_consent_at    Timestamp of the consent click (server-side).
--   sms_consent_text  The exact copy shown on the page when they
--                     consented. Snapshotted so we can replay the
--                     prompt verbatim during a carrier audit.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS phone            TEXT,
  ADD COLUMN IF NOT EXISTS sms_consent      BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_consent_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sms_consent_text TEXT;

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

COMMENT ON COLUMN waitlist.phone            IS 'E.164-normalized mobile number (e.g. +14155550117). Required by the form going forward; nullable for legacy rows.';
COMMENT ON COLUMN waitlist.sms_consent      IS 'True when the user ticked the SMS opt-in checkbox at signup.';
COMMENT ON COLUMN waitlist.sms_consent_at   IS 'Server-side timestamp of the SMS opt-in click.';
COMMENT ON COLUMN waitlist.sms_consent_text IS 'Exact opt-in copy shown to the user when they consented (A2P/10DLC audit trail).';
