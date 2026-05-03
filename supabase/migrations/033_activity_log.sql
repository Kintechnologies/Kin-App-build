-- ─────────────────────────────────────────────────────────────────────────────
-- 032_activity_log.sql
--
-- Founder-facing activity log. Lightweight append-only table for capturing
-- noteworthy events (waitlist signups, real account creations, …) so the
-- founder can audit growth signal without standing up an analytics pipeline.
--
-- This is a server-side table: only the service-role key writes to it. RLS is
-- enabled and no SELECT/INSERT policies exist, so anon/auth users cannot read
-- or write it from the browser. The admin client used by API routes uses the
-- service role and bypasses RLS by design.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS activity_log (
  id           BIGSERIAL PRIMARY KEY,
  event_type   TEXT NOT NULL,
  email        TEXT,
  profile_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_created
  ON activity_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_event_type
  ON activity_log (event_type, created_at DESC);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
-- No policies = no row visibility for anon/authed roles.
-- Only the service-role client can read/write.
