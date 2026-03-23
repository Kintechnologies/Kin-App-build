-- Referral tracking
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'trial', 'paid', 'rewarded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  converted_at TIMESTAMPTZ
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own referrals" ON referrals
  FOR SELECT USING (referrer_id = auth.uid());

-- Referral rewards
CREATE TABLE IF NOT EXISTS referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('free_month', 'credit')),
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  referral_id UUID REFERENCES referrals(id),
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own rewards" ON referral_rewards
  FOR SELECT USING (profile_id = auth.uid());

-- Add referred_by to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_user_id);
