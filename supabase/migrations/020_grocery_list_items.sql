-- Grocery list items — household-shared, Realtime-enabled
-- Replaces the JSONB grocery_items on meal_plans for the active grocery list.
-- Both parents see and can check/uncheck items in real time.

CREATE TABLE grocery_list_items (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The primary parent's profile_id is the household canonical key.
  -- Partner uses their primary parent's id as household_id.
  household_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                 TEXT        NOT NULL,
  quantity             TEXT        NOT NULL DEFAULT '',
  estimated_cost       NUMERIC(8,2) NOT NULL DEFAULT 0,
  store                TEXT        NOT NULL DEFAULT 'Other',
  is_kid_item          BOOLEAN     NOT NULL DEFAULT false,
  checked              BOOLEAN     NOT NULL DEFAULT false,
  checked_by_profile_id UUID       REFERENCES profiles(id),
  checked_at           TIMESTAMPTZ,
  sort_order           INTEGER     NOT NULL DEFAULT 0,  -- original order from meal plan
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_grocery_list_items_household ON grocery_list_items(household_id, checked, sort_order);

-- RLS: both parents in the same household can read/write
ALTER TABLE grocery_list_items ENABLE ROW LEVEL SECURITY;

-- A user can access grocery items for their household:
--   (a) if they are the primary parent (household_id = their own id), OR
--   (b) if household_id = their profiles.household_id (they are the partner linking to that primary)
CREATE POLICY "Household members can view grocery items"
  ON grocery_list_items FOR SELECT
  USING (
    household_id = auth.uid()
    OR household_id = (SELECT household_id FROM profiles WHERE id = auth.uid() AND household_id IS NOT NULL)
  );

CREATE POLICY "Household members can insert grocery items"
  ON grocery_list_items FOR INSERT
  WITH CHECK (
    household_id = auth.uid()
    OR household_id = (SELECT household_id FROM profiles WHERE id = auth.uid() AND household_id IS NOT NULL)
  );

CREATE POLICY "Household members can update grocery items"
  ON grocery_list_items FOR UPDATE
  USING (
    household_id = auth.uid()
    OR household_id = (SELECT household_id FROM profiles WHERE id = auth.uid() AND household_id IS NOT NULL)
  );

CREATE POLICY "Household members can delete grocery items"
  ON grocery_list_items FOR DELETE
  USING (
    household_id = auth.uid()
    OR household_id = (SELECT household_id FROM profiles WHERE id = auth.uid() AND household_id IS NOT NULL)
  );

-- Enable Realtime replication for this table
ALTER PUBLICATION supabase_realtime ADD TABLE grocery_list_items;
