-- Date nights tracker
-- Shared between household partners. Tracks when the couple last had a date night
-- so the engine can trigger a suggestion after 14+ days.

CREATE TABLE date_nights (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date         DATE        NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_date_nights_profile_date ON date_nights(profile_id, date DESC);

-- RLS: both the owner AND their household partner can read/write date_nights.
-- household_id on profiles points to the primary partner's profile_id.
-- A user belongs to a household if:
--   a) they are the primary profile (household_id IS NULL and someone links to them), OR
--   b) their household_id matches the row's owner's household or vice versa.
--
-- Simplified RLS: a user can access date_nights if they created it,
-- OR if the creator's household_id = auth.uid() (they are the primary and this is the partner's entry),
-- OR if their own household_id = the creator's id (they are the partner).

ALTER TABLE date_nights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view date nights"
  ON date_nights FOR SELECT
  USING (
    profile_id = auth.uid()
    OR profile_id IN (
      -- entries from my household partner (they link to me or we share the same household_id)
      SELECT id FROM profiles
      WHERE household_id = auth.uid()
         OR (
           household_id IS NOT NULL
           AND household_id = (SELECT household_id FROM profiles WHERE id = auth.uid())
         )
    )
  );

CREATE POLICY "Users can insert own date nights"
  ON date_nights FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update own date nights"
  ON date_nights FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "Users can delete own date nights"
  ON date_nights FOR DELETE
  USING (profile_id = auth.uid());
