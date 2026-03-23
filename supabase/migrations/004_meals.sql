-- Saved meal selections
CREATE TABLE IF NOT EXISTS saved_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meal_name TEXT NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  prep_time_minutes INTEGER,
  calories INTEGER,
  protein INTEGER,
  carbs INTEGER,
  fat INTEGER,
  kid_friendly BOOLEAN DEFAULT FALSE,
  description TEXT,
  recipe TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE saved_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own saved meals" ON saved_meals
  FOR ALL USING (profile_id = auth.uid());

-- Meal ratings
CREATE TABLE IF NOT EXISTS meal_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meal_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE meal_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own meal ratings" ON meal_ratings
  FOR ALL USING (profile_id = auth.uid());

CREATE INDEX idx_meal_ratings_profile ON meal_ratings(profile_id, meal_name);
