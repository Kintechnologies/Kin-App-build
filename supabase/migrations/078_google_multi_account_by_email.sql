-- ══════════════════════════════════════════════════════════════
-- 078 · Calendar — Google multi-account keyed by account email
--
-- V7 P0-1: migration 067 built a partial unique on
-- (profile_id, provider, google_calendar_id) WHERE provider = 'google'.
-- But every Google connection landed with google_calendar_id = 'primary'
-- (the Google API alias for the authenticated user's primary calendar, NOT
-- the resolved calendar id), so two distinct Google accounts on the same
-- profile collapsed to the same key — connecting a second account either
-- threw a unique violation or silently overwrote the first. The connect
-- callback also never populated google_calendar_id at insert time, so the
-- partial unique never matched the upsert's onConflict tuple even in
-- principle.
--
-- The account identity Google actually exposes is the userinfo email —
-- already persisted as google_account_email (migration 074). Rekey the
-- partial unique on that column. The companion change in
-- apps/web/src/app/api/calendar/google/callback/route.ts now resolves the
-- primary calendar id via listGoogleCalendars and populates both
-- google_account_email and google_calendar_id at connect time, using an
-- explicit SELECT-then-UPDATE-or-INSERT (the same pattern Apple's
-- multi-account fix landed at apple/connect/route.ts:87-112).
--
-- Legacy rows without google_account_email are left intact: the partial
-- predicate excludes NULL emails so this migration never errors on existing
-- data, and the connect path going forward always populates the email.
-- ══════════════════════════════════════════════════════════════

DROP INDEX IF EXISTS calendar_connections_google_unique;

CREATE UNIQUE INDEX IF NOT EXISTS calendar_connections_google_unique
  ON calendar_connections (profile_id, provider, google_account_email)
  WHERE provider = 'google' AND google_account_email IS NOT NULL;

COMMENT ON INDEX calendar_connections_google_unique IS
  'V7 P0-1: one Google connection per (profile_id, google_account_email). Partial on google_account_email IS NOT NULL so legacy rows without an email persist; the connect path now always populates it.';
