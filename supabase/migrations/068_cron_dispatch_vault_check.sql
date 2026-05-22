-- ─────────────────────────────────────────────────────────────────────────────
-- 068_cron_dispatch_vault_check.sql
--
-- Audit V5 P1-I6: assert that the cron_secret Vault entry exists.
--
-- Migration 063 documents the one-time `vault.create_secret(...)` bootstrap
-- in a comment. If the bootstrap is missed (fresh project restore, vault
-- rotation, accidentally dropped secret), `public.cron_dispatch_headers()`
-- silently returns an empty `x-cron-secret` header — every cron-dispatch
-- invocation 401s and every sub-daily cron stops. The failure is loud in the
-- job logs but quiet in any first-glance health check.
--
-- This migration raises during apply if the secret is missing, so a fresh
-- environment can't reach a state where the crons silently no-op. Operators
-- bootstrap first, then re-apply.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  secret_value text;
BEGIN
  -- vault.decrypted_secrets exists once the vault extension is enabled; if the
  -- extension is missing in a non-prod environment we silently skip the check
  -- (local sqlite/test runs don't have the extension and shouldn't fail apply).
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'supabase_vault'
  ) THEN
    RAISE NOTICE
      'supabase_vault extension not installed — skipping cron_secret check';
    RETURN;
  END IF;

  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE name = 'cron_secret'
  LIMIT 1;

  IF secret_value IS NULL OR length(secret_value) < 16 THEN
    RAISE EXCEPTION
      'vault.cron_secret is missing or too short. Bootstrap with: '
      'SELECT vault.create_secret(''<paste CRON_SECRET>'', ''cron_secret'', '
      '''Shared secret for cron-dispatch.''); '
      'Then re-apply this migration.';
  END IF;
END $$;
