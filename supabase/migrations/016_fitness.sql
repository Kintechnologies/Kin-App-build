-- ═══════════════════════════════════════════════════════════════
-- 016 · Fitness — Profiles, Workout Sessions
-- ═══════════════════════════════════════════════════════════════

-- Fitness profiles (private per user, not shared with household partner)
CREATE TABLE fitness_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  goal TEXT NOT NULL CHECK (goal IN ('lose_weight', 'gain_muscle', 'maintain', 'endurance', 'general_fitness')),
  current_weight_lbs NUMERIC(5, 1),
  target_weight_lbs NUMERIC(5, 1),
  target_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE fitness_profiles ENABLE ROW LEVEL SECURITY;

-- Fitness profiles are strictly private - only the owning profile can access
CREATE POLICY "Users access own fitness profile only" ON fitness_profiles
  FOR ALL USING (auth.uid() = profile_id);

-- Workout sessions (private per user)
CREATE TABLE workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workout_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INTEGER,
  notes TEXT,
  exercises JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

-- Workout sessions are strictly private per profile
CREATE POLICY "Users access own workout sessions" ON workout_sessions
  FOR ALL USING (auth.uid() = profile_id);

CREATE INDEX idx_workout_sessions_profile_date ON workout_sessions(profile_id, workout_date);
