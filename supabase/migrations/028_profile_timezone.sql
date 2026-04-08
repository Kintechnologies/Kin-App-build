-- 028_profile_timezone.sql
-- Add user timezone to profiles.
-- Used when pushing Kin-native events to Google Calendar so the
-- event renders in the correct local time on the user's calendar.
-- Defaults to 'UTC'; users set this during onboarding or in Settings.
-- NOTE: Originally created without session attribution as 027_profile_timezone.sql
-- (undocumented). Renamed to 028_ by Lead Eng run AK to resolve B33 duplicate-prefix
-- conflict with 027_coordination_issues_severity.sql. Austin must NOT run supabase
-- db push until this rename is committed and the original 027_profile_timezone.sql
-- is deleted. See SPRINT.md B33.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';
