-- ══════════════════════════════════════════════════════════════
-- 074 · Calendar — persist Google account email for multi-account UI
--
-- V6 audit P1-C1: with multi-account (migration 067) two Google connections
-- on one profile render identically in the dashboard because the connect
-- callback never persisted which account they map to. Add a column we can
-- populate from the Google userinfo endpoint after token exchange and
-- surface it in /api/calendar/sync → dashboard/calendars/page.tsx.
--
-- Nullable: old rows have no value, and the column is purely display-only.
-- ══════════════════════════════════════════════════════════════

ALTER TABLE calendar_connections
  ADD COLUMN IF NOT EXISTS google_account_email TEXT;

COMMENT ON COLUMN calendar_connections.google_account_email IS
  'Display-only Google account email (from oauth2/v1/userinfo). Lets the calendars dashboard distinguish multi-account connections.';
