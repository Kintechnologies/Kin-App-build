-- ─────────────────────────────────────────────────────────────────────────────
-- 066_calendar_sync_status_needs_reconnect.sql
--
-- Audit v5 P0-5: the V3 P1-C1 reconnect-CTA fix has never worked in production
-- because `needs_reconnect` violates the existing CHECK constraint on
-- calendar_connections.sync_status (migration 009 only permits
-- 'idle' | 'syncing' | 'error'). Every revoked-token write throws 23514,
-- the catch block swallows it, and the dashboard's "Reconnect Google" CTA —
-- gated on this exact state — never renders.
--
-- Extending the constraint makes the existing app-side logic at
-- apps/web/src/lib/calendar/sync.ts:80 take effect.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE calendar_connections DROP CONSTRAINT calendar_connections_sync_status_check;
ALTER TABLE calendar_connections ADD CONSTRAINT calendar_connections_sync_status_check
  CHECK (sync_status IN ('idle', 'syncing', 'error', 'needs_reconnect'));
