-- ═══════════════════════════════════════════════════════════════
-- 035 · Drop stale tables, views, and functions (Pass 2)
-- ═══════════════════════════════════════════════════════════════
-- Post-pivot cleanup. Drops the remaining surface area from the
-- pre-pivot meal-planning / budget / fitness / referral product.
-- All code references were removed before this migration was applied.
--
-- Order matters where there are foreign keys:
--   - budget_summary_view depends on transactions + budget_categories
--   - get_budget_summary() depends on transactions + budget_categories
--   - referral_rewards has an FK to referrals
-- ═══════════════════════════════════════════════════════════════

-- ── Views and functions first (they reference the tables below) ──
DROP VIEW IF EXISTS budget_summary_view CASCADE;
DROP FUNCTION IF EXISTS get_budget_summary(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_household_partner_id(uuid) CASCADE;

-- ── Meal planning surface ──
DROP TABLE IF EXISTS meal_ratings CASCADE;
DROP TABLE IF EXISTS saved_meals CASCADE;
DROP TABLE IF EXISTS meal_plans CASCADE;

-- ── Fitness surface ──
DROP TABLE IF EXISTS fitness_profiles CASCADE;

-- ── Child / pet detail tables (superseded by family_members) ──
DROP TABLE IF EXISTS children_allergies CASCADE;
DROP TABLE IF EXISTS pet_details CASCADE;

-- ── Budget surface ──
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS household_income CASCADE;
DROP TABLE IF EXISTS budget_categories CASCADE;

-- ── Relationship features (deprecated) ──
DROP TABLE IF EXISTS date_nights CASCADE;

-- ── Referrals (drop referral_rewards first due to FK) ──
DROP TABLE IF EXISTS referral_rewards CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;

-- ── Pet care reminders (deprecated cron features) ──
DROP TABLE IF EXISTS pet_medications CASCADE;
DROP TABLE IF EXISTS pet_vaccinations CASCADE;

-- ── Schedule / activities (replaced by calendar_events + coordination_issues) ──
DROP TABLE IF EXISTS parent_schedules CASCADE;
DROP TABLE IF EXISTS children_activities CASCADE;
