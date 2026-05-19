-- ─────────────────────────────────────────────────────────────────────────────
-- 051_calendar_event_visibility.sql
--
-- Adds visibility to calendar_events, mirroring Google Calendar's event
-- visibility ('default' | 'public' | 'private' | 'confidential'). Private and
-- confidential events have their details (title, description, location)
-- stripped before they reach the morning briefing prompt — the briefing shows
-- the time slot is blocked but never the subject. Trust/safety: therapy
-- appointments, interviews, etc. must not surface in a shared family briefing.
-- Defaults to 'default' so existing rows and Kin-native events are unaffected.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'default'
  CHECK (visibility IN ('default', 'public', 'private', 'confidential'));
