-- ─────────────────────────────────────────────────────────────────────────────
-- 050_profiles_last_name.sql
--
-- Adds last_name to profiles. SMS onboarding only ever captured a first name
-- (profiles.family_name), so the morning briefing had no surname to work with
-- and addressed households as "the Austin family" — the parent's first name.
-- Onboarding now asks for the family's last name as its own step, and the
-- briefing uses it to say "the Ford family" when a surname is on file.
--
-- The new step is inserted right after the first-name question, so every SMS
-- onboarding step from the kids question onward shifts up by one (old 2→3,
-- 3→4, … 10→11). In-flight profiles are bumped to match: anyone past the
-- first-name step but not yet finished moves up one step so their next answer
-- is interpreted against the correct question. Profiles still on step 0 or 1
-- reach the new question naturally; completed profiles are gated by
-- onboarding_completed, not the step number, so they are left untouched.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_name TEXT;

COMMENT ON COLUMN profiles.last_name IS
  'Family/household surname, collected as a dedicated SMS onboarding step. Nullable — profiles created before this migration, and texters who skipped the question, have NULL.';

-- Shift in-flight SMS onboarding profiles to absorb the new step 2 (last name).
UPDATE profiles
  SET onboarding_step = onboarding_step + 1
  WHERE onboarding_step >= 2
    AND onboarding_completed = false;
