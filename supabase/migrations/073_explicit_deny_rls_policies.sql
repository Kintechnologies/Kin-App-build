-- ─────────────────────────────────────────────────────────────────────────────
-- 073_explicit_deny_rls_policies.sql
--
-- Audit v5 P2-Sec2: sms_conversations and daily_questions both have RLS
-- enabled (migration 030) without any explicit policy. Postgres' deny-by-
-- default behavior already blocks anon + authenticated reads, but the
-- intent isn't captured in the schema — a future migration that adds a
-- permissive policy by accident would silently expose every row.
--
-- This migration adds explicit deny policies that document the contract:
-- service-role only, no end-user access. Service role bypasses RLS, so
-- briefing fan-out and admin paths continue to work unchanged.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "sms_conversations service-role only" ON sms_conversations;
CREATE POLICY "sms_conversations service-role only"
  ON sms_conversations
  FOR ALL
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "daily_questions service-role only" ON daily_questions;
CREATE POLICY "daily_questions service-role only"
  ON daily_questions
  FOR ALL
  USING (false)
  WITH CHECK (false);
