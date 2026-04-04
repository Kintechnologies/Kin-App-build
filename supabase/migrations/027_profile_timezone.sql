-- 027_profile_timezone.sql
-- Add user timezone to profiles.
-- Used when pushing Kin-native events to Google Calendar so the
-- event renders in the correct local time on the user's calendar.
-- Defaults to 'UTC'; users set this during onboarding or in Settings.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';
