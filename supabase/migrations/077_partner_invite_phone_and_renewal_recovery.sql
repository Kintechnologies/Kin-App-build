-- ══════════════════════════════════════════════════════════════
-- 077 · Recovery migration: partner invite phone + renewal date
--
-- Recovery for failed push of 075/076. Migration 040 (which adds
-- household_invites.invitee_phone) is marked applied on the remote
-- migrations table, but the column itself never made it onto the
-- live schema — most likely a partial-apply during an earlier push.
-- The 075 push then exploded on the partial UNIQUE INDEX because
-- the column it references doesn't exist.
--
-- This migration is fully idempotent (every step is guarded with
-- IF NOT EXISTS / DROP NOT NULL on a column that may already be
-- nullable). It re-asserts the expected post-040 schema and then
-- folds in the 075 unique index and the 076 renewal-date column.
--
-- Migrations 075 and 076 are repaired to `reverted` in the remote
-- migrations table before this is pushed.
-- ══════════════════════════════════════════════════════════════

-- ── Re-assert 040: phone-capable household_invites ──────────────

ALTER TABLE household_invites
  ADD COLUMN IF NOT EXISTS invitee_email TEXT;

ALTER TABLE household_invites
  ALTER COLUMN invitee_email DROP NOT NULL;

ALTER TABLE household_invites
  ADD COLUMN IF NOT EXISTS invitee_phone TEXT;

CREATE INDEX IF NOT EXISTS idx_invites_invitee_phone
  ON household_invites (invitee_phone);

-- ── Re-assert 075: unique pending invite per (inviter, phone) ───

CREATE UNIQUE INDEX IF NOT EXISTS household_invites_unique_pending_phone
  ON household_invites (inviter_profile_id, invitee_phone)
  WHERE accepted = false AND invitee_phone IS NOT NULL;

COMMENT ON INDEX household_invites_unique_pending_phone IS
  'V6 P1-S1: prevents racing invite-creation paths from minting two codes for the same (inviter, partner_phone) pair while the first is still pending.';

-- ── Re-assert 076: surface renewal date on profiles ─────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;
