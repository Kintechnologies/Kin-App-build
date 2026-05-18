-- ─────────────────────────────────────────────────────────────────────────────
-- 049_billing_exempt.sql
--
-- Adds billing_exempt to profiles. When true, the profile is never shown the
-- trial payment nudge and is not subject to billing-driven gating — used for
-- the team, comped accounts, and partners. Defaults to false.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS billing_exempt boolean NOT NULL DEFAULT false;
