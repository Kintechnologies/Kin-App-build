-- ═══════════════════════════════════════════════════════════════
-- 015 · Pet Details — Medications, Vaccinations
-- ═══════════════════════════════════════════════════════════════

-- Pet details
CREATE TABLE pet_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  species TEXT,
  breed TEXT,
  vet_name TEXT,
  vet_phone TEXT,
  vet_next_appointment DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pet_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own pet details" ON pet_details
  FOR ALL USING (profile_id = auth.uid());

-- Pet medications
CREATE TABLE pet_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  time_of_day TIME[],
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  last_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pet_medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own pet medications" ON pet_medications
  FOR ALL USING (profile_id = auth.uid());

CREATE INDEX idx_pet_medications_family_member ON pet_medications(family_member_id);

-- Pet vaccinations
CREATE TABLE pet_vaccinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  given_date DATE,
  next_due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pet_vaccinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own pet vaccinations" ON pet_vaccinations
  FOR ALL USING (profile_id = auth.uid());

CREATE INDEX idx_pet_vaccinations_family_member ON pet_vaccinations(family_member_id);
