-- Persisted meal plans for FVM recovery
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meal_options JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  week_start DATE
);

ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own meal plans" ON meal_plans
  FOR ALL USING (profile_id = auth.uid());

CREATE INDEX idx_meal_plans_profile ON meal_plans(profile_id, generated_at DESC);
