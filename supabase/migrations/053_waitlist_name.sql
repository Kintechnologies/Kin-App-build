-- ═══════════════════════════════════════════════════════════════
-- 053 · Waitlist name (phone-first SMS capture, 2026-05-18)
-- ═══════════════════════════════════════════════════════════════
-- Migration 050 made the kinai.family waitlist phone-first: a visitor
-- submits only a mobile number. We now text a confirmation SMS asking
-- for their name + email, and parse the reply on the inbound webhook.
--
-- This adds `name` — the full name captured from that free-text SMS
-- reply. first_name / last_name predate the SMS flow and stay for the
-- legacy web form; the SMS reply is free-text, so we store it whole.
--
-- The API route uses the service role key and bypasses RLS; the table
-- still denies all direct (anon / authenticated) access.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS name TEXT;

COMMENT ON COLUMN waitlist.name IS
  'Full name captured from the phone-first SMS reply (free-text). Distinct from first_name/last_name, which came from the legacy web form.';
