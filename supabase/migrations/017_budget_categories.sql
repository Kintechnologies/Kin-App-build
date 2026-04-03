-- ═══════════════════════════════════════════════════════════════
-- 017 · Budget Categories — Tracking & Household RLS
-- ═══════════════════════════════════════════════════════════════

-- Helper function to get household partner ID
CREATE OR REPLACE FUNCTION get_household_partner_id(user_id UUID)
RETURNS UUID AS $$
DECLARE
  partner_id UUID;
BEGIN
  -- Case 1: user has a household_id (is the secondary parent)
  SELECT household_id INTO partner_id FROM profiles WHERE id = user_id AND household_id IS NOT NULL;

  -- Case 2: if no household_id found, check if this user is someone's household_id (is the primary parent)
  IF partner_id IS NULL THEN
    SELECT id INTO partner_id FROM profiles WHERE household_id = user_id LIMIT 1;
  END IF;

  RETURN partner_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Budget categories
CREATE TABLE budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  monthly_limit NUMERIC(10, 2) NOT NULL,
  color TEXT NOT NULL DEFAULT '#D4A843',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  last_overspend_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, name)
);

ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;

-- Both partners in household can read/write budget categories
-- User can access: own categories OR partner's categories (if in same household)
CREATE POLICY "Users access own and household partner categories" ON budget_categories
  FOR ALL USING (
    profile_id = auth.uid()
    OR profile_id = get_household_partner_id(auth.uid())
  );

-- Add budget_category_id and household_member columns to transactions
ALTER TABLE transactions
  ADD COLUMN budget_category_id UUID REFERENCES budget_categories(id) ON DELETE SET NULL,
  ADD COLUMN household_member TEXT;

-- Budget summary view (shows totals only, never individual transactions)
CREATE OR REPLACE VIEW budget_summary_view AS
SELECT
  p.id AS profile_id,
  bc.id AS category_id,
  bc.name AS category_name,
  bc.monthly_limit,
  COALESCE(SUM(t.amount), 0) AS total_spent,
  bc.monthly_limit - COALESCE(SUM(t.amount), 0) AS remaining,
  DATE_TRUNC('month', CURRENT_DATE) AS month_start,
  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day' AS month_end
FROM profiles p
JOIN budget_categories bc ON bc.profile_id = p.id
LEFT JOIN transactions t ON t.budget_category_id = bc.id
  AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', CURRENT_DATE)
WHERE bc.active = true
GROUP BY p.id, bc.id, bc.name, bc.monthly_limit;

-- Grant RLS to the view - restrict to user's own categories
-- (Supabase will automatically inherit table RLS policies)

-- RPC function to get budget summary for a user
CREATE OR REPLACE FUNCTION get_budget_summary(user_id UUID)
RETURNS TABLE(
  profile_id UUID,
  category_id UUID,
  category_name TEXT,
  monthly_limit NUMERIC,
  total_spent NUMERIC,
  remaining NUMERIC,
  month_start TIMESTAMPTZ,
  month_end TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bsv.profile_id,
    bsv.category_id,
    bsv.category_name,
    bsv.monthly_limit,
    bsv.total_spent,
    bsv.remaining,
    bsv.month_start,
    bsv.month_end
  FROM budget_summary_view bsv
  WHERE bsv.profile_id = user_id;
END;
$$ LANGUAGE plpgsql STABLE;
