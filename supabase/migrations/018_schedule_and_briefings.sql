-- ═══════════════════════════════════════════════════════════════
-- 018 · Parent Schedules & Morning Briefings
-- ═══════════════════════════════════════════════════════════════

-- Parent schedules (private per parent)
CREATE TABLE parent_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  raw_description TEXT,
  structured_data JSONB,
  home_location TEXT,
  work_location TEXT,
  commute_mode TEXT CHECK (commute_mode IN ('drive', 'transit', 'walk', 'bike', 'remote')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE parent_schedules ENABLE ROW LEVEL SECURITY;

-- Parent schedules are private per profile only
CREATE POLICY "Users access own parent schedule" ON parent_schedules
  FOR ALL USING (auth.uid() = profile_id);

-- Morning briefings (private per parent)
CREATE TABLE morning_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  briefing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'generated' CHECK (delivery_status IN ('generated', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, briefing_date)
);

ALTER TABLE morning_briefings ENABLE ROW LEVEL SECURITY;

-- Morning briefings are private per profile only
CREATE POLICY "Users access own morning briefings" ON morning_briefings
  FOR ALL USING (auth.uid() = profile_id);

CREATE INDEX idx_morning_briefings_profile_date ON morning_briefings(profile_id, briefing_date DESC);
