-- Partner invite system
-- Creates the household_invites table and adds household linkage to profiles.

-- ── Household invites ──────────────────────────────────────────────────────

CREATE TABLE household_invites (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_profile_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_email           TEXT        NOT NULL,
  invite_code             TEXT        NOT NULL UNIQUE,
  accepted                BOOLEAN     NOT NULL DEFAULT false,
  accepted_by_profile_id  UUID        REFERENCES profiles(id),
  accepted_at             TIMESTAMPTZ,
  expires_at              TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invites_code    ON household_invites(invite_code);
CREATE INDEX idx_invites_inviter ON household_invites(inviter_profile_id);

-- RLS: inviter can read/manage their own invites
ALTER TABLE household_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inviter can view own invites" ON household_invites
  FOR SELECT USING (inviter_profile_id = auth.uid());

CREATE POLICY "Inviter can insert invites" ON household_invites
  FOR INSERT WITH CHECK (inviter_profile_id = auth.uid());

CREATE POLICY "Inviter can update own invites" ON household_invites
  FOR UPDATE USING (inviter_profile_id = auth.uid());

-- ── Household linkage on profiles ─────────────────────────────────────────
-- household_id = NULL  → primary (or only) parent
-- household_id = <other profile id>  → partner linked to that primary profile

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES profiles(id);

CREATE INDEX idx_profiles_household ON profiles(household_id);
