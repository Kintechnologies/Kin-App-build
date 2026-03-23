-- Family members table
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  member_type TEXT NOT NULL CHECK (member_type IN ('adult', 'child', 'pet')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own family members" ON family_members
  FOR ALL USING (profile_id = auth.uid());

-- Onboarding preferences table
CREATE TABLE IF NOT EXISTS onboarding_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  weekly_grocery_budget INTEGER,
  dietary_preferences TEXT[] DEFAULT '{}',
  food_loves TEXT[] DEFAULT '{}',
  food_dislikes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE onboarding_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences" ON onboarding_preferences
  FOR ALL USING (profile_id = auth.uid());
