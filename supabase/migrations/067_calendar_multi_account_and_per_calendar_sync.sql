-- ══════════════════════════════════════════════════════════════
-- 067 · Calendar — multi-account support + per-calendar sync tokens
--
-- Two fixes from EXPERIENCE_AUDIT_V5:
--
--   P1-E3 — the legacy UNIQUE (profile_id, provider) blocks a parent with both
--   a personal and a work Google account from connecting both: the second
--   connect silently overwrites the first's tokens. We drop the legacy
--   constraint and replace it with a partial UNIQUE on the actual account
--   identity (provider + google_calendar_id for Google, profile_id + provider
--   alone for Apple where one CalDAV account is the assumption).
--
--   P1-C6 — `syncGoogleCalendar` hardcoded "primary", so school district
--   calendars, sports leagues, partner shared calendars, kid's pediatric
--   portal — i.e. precisely the coordination-relevant calendars a Kin parent
--   has — were invisible to the briefing. Adding per-sub-calendar sync tokens
--   lets the sync iterate calendarList.list() and resume each sub-calendar
--   incrementally on the next run.
-- ══════════════════════════════════════════════════════════════

-- ── 1. Multi-account UNIQUE constraint ──────────────────────────────────────
-- Drop the constraint that capped one Google connection per profile. Two
-- partial uniques replace it: one Apple connection per profile, but Google
-- rows now key on (profile_id, provider, google_calendar_id) so a parent can
-- connect their personal Google AND their work Google (each lands as its own
-- connection row keyed on the google_calendar_id of its primary calendar).
ALTER TABLE calendar_connections
  DROP CONSTRAINT IF EXISTS calendar_connections_profile_id_provider_key;

CREATE UNIQUE INDEX IF NOT EXISTS calendar_connections_apple_unique
  ON calendar_connections (profile_id, provider)
  WHERE provider = 'apple';

CREATE UNIQUE INDEX IF NOT EXISTS calendar_connections_google_unique
  ON calendar_connections (profile_id, provider, google_calendar_id)
  WHERE provider = 'google';

-- ── 2. Per-calendar sync tokens ─────────────────────────────────────────────
-- google_sync_token used to track a single sync cursor per connection row.
-- With sub-calendars in scope, we need one cursor per (connection,
-- sub-calendar-id). google_sync_tokens stores them as {calendar_id: token}.
-- The legacy single-column google_sync_token is kept for backwards
-- compatibility with in-flight syncs but is no longer the source of truth.
ALTER TABLE calendar_connections
  ADD COLUMN IF NOT EXISTS google_sync_tokens JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN calendar_connections.google_sync_tokens IS
  'Per-sub-calendar Google sync tokens: {"primary": "...", "abc@group.calendar.google.com": "..."}';
