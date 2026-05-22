-- ══════════════════════════════════════════════════════════════
-- 075 · Partner invite — unique pending invite per (inviter, phone)
--
-- V6 audit P1-S1: dispatchPartnerInvite reads "latest pending invite for this
-- inviter", and two near-simultaneous calls (onboarding step + family page
-- re-trigger) both see no pending row and both mint a fresh invite code. The
-- partner then receives two SMS with two different /join/invite/<code> links;
-- only one accept ever works. Cosmetic in steady state (the atomic accept
-- prevents cross-contamination from V5 P1-S7) but a confusing user-facing
-- failure mode worth eliminating.
--
-- Fix: a partial UNIQUE INDEX serializes invite creation on
-- (inviter_profile_id, invitee_phone) while accepted = false. The second
-- creator gets a 23505 from Postgres; the application catches that and reads
-- the row the winner inserted.
--
-- Partial because once an invite is accepted, the row should not block a new
-- one for the same partner — that's the legitimate "resend after acceptance"
-- workflow (e.g. household reset after profile rebuild).
-- ══════════════════════════════════════════════════════════════

CREATE UNIQUE INDEX IF NOT EXISTS household_invites_unique_pending_phone
  ON household_invites (inviter_profile_id, invitee_phone)
  WHERE accepted = false AND invitee_phone IS NOT NULL;

COMMENT ON INDEX household_invites_unique_pending_phone IS
  'V6 P1-S1: prevents racing invite-creation paths from minting two codes for the same (inviter, partner_phone) pair while the first is still pending.';
