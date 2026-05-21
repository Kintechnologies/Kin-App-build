-- ─────────────────────────────────────────────────────────────────────────────
-- 062_ops_monitoring.sql
--
-- Founder-facing ops dashboard infrastructure.
--
--   profiles.is_admin  — flags Austin + Jontae so /ops gates by DB
--                        instead of a hard-coded phone list.
--   alerts_log         — persisted copy of every notifySlack() call so the
--                        dashboard can show recent alerts even when Slack
--                        itself is hard to scroll.
--
-- morning_briefings.quality_score was added in 061 and is read here as-is.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_is_admin
  ON profiles (is_admin) WHERE is_admin = TRUE;

-- Seed Austin and Jontae as admins by their known phone numbers. Idempotent.
UPDATE profiles SET is_admin = TRUE
  WHERE phone_number IN ('+16266762222', '+16266762832')
    AND is_admin = FALSE;

CREATE TABLE IF NOT EXISTS alerts_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  severity    TEXT        NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  category    TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  metadata    JSONB,
  delivered   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_log_created_at
  ON alerts_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_log_severity_created_at
  ON alerts_log (severity, created_at DESC);

ALTER TABLE alerts_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read alerts; service role bypasses RLS for writes.
CREATE POLICY "Admins read alerts" ON alerts_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
       WHERE id = auth.uid() AND is_admin = TRUE
    )
  );
