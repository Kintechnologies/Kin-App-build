-- ═══════════════════════════════════════════════════════════════
-- 014 · Children Details — Allergies, Activities
-- ═══════════════════════════════════════════════════════════════

-- Children details (school, grade, schedule notes)
CREATE TABLE children_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  school_name TEXT,
  grade TEXT,
  schedule_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE children_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own children details" ON children_details
  FOR ALL USING (profile_id = auth.uid());

-- Children allergies
CREATE TABLE children_allergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  allergen TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE children_allergies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own child allergies" ON children_allergies
  FOR ALL USING (profile_id = auth.uid());

CREATE INDEX idx_children_allergies_family_member ON children_allergies(family_member_id);

-- Children activities
CREATE TABLE children_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  day_of_week TEXT[],
  start_time TIME,
  end_time TIME,
  location TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE children_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own child activities" ON children_activities
  FOR ALL USING (profile_id = auth.uid());

CREATE INDEX idx_children_activities_family_member ON children_activities(family_member_id);
