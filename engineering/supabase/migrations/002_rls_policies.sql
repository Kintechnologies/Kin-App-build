-- Kin AI Supabase RLS Policies Migration 002
-- Complete row-level security for privacy & safety
-- Author: Lead Engineer, Kin AI
-- Date: 2026-04-02

-- ============================================================================
-- PRIVATE TABLES: Parent sees only their own data
-- ============================================================================

-- PARENTS TABLE (private to self)
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parents_select_self" ON parents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "parents_insert_self" ON parents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "parents_update_self" ON parents
  FOR UPDATE USING (auth.uid() = user_id);

-- PARENT_TODOS TABLE (strictly private)
ALTER TABLE parent_todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parent_todos_select" ON parent_todos
  FOR SELECT USING (
    parent_id = get_my_parent_id()
  );

CREATE POLICY "parent_todos_insert" ON parent_todos
  FOR INSERT WITH CHECK (
    parent_id = get_my_parent_id()
  );

CREATE POLICY "parent_todos_update" ON parent_todos
  FOR UPDATE USING (
    parent_id = get_my_parent_id()
  );

CREATE POLICY "parent_todos_delete" ON parent_todos
  FOR DELETE USING (
    parent_id = get_my_parent_id()
  );

-- FITNESS_PROFILES TABLE (strictly private per parent)
ALTER TABLE fitness_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fitness_profiles_select" ON fitness_profiles
  FOR SELECT USING (
    parent_id = get_my_parent_id()
  );

CREATE POLICY "fitness_profiles_insert" ON fitness_profiles
  FOR INSERT WITH CHECK (
    parent_id = get_my_parent_id()
  );

CREATE POLICY "fitness_profiles_update" ON fitness_profiles
  FOR UPDATE USING (
    parent_id = get_my_parent_id()
  );

CREATE POLICY "fitness_profiles_delete" ON fitness_profiles
  FOR DELETE USING (
    parent_id = get_my_parent_id()
  );

-- WORKOUT_SESSIONS TABLE (strictly private per parent)
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workout_sessions_select" ON workout_sessions
  FOR SELECT USING (
    parent_id = get_my_parent_id()
  );

CREATE POLICY "workout_sessions_insert" ON workout_sessions
  FOR INSERT WITH CHECK (
    parent_id = get_my_parent_id()
  );

CREATE POLICY "workout_sessions_update" ON workout_sessions
  FOR UPDATE USING (
    parent_id = get_my_parent_id()
  );

CREATE POLICY "workout_sessions_delete" ON workout_sessions
  FOR DELETE USING (
    parent_id = get_my_parent_id()
  );

-- PUSH_TOKENS TABLE (strictly private)
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_tokens_select" ON push_tokens
  FOR SELECT USING (
    parent_id = get_my_parent_id()
  );

CREATE POLICY "push_tokens_insert" ON push_tokens
  FOR INSERT WITH CHECK (
    parent_id = get_my_parent_id()
  );

CREATE POLICY "push_tokens_update" ON push_tokens
  FOR UPDATE USING (
    parent_id = get_my_parent_id()
  );

CREATE POLICY "push_tokens_delete" ON push_tokens
  FOR DELETE USING (
    parent_id = get_my_parent_id()
  );

-- TRIAL_STATE TABLE (strictly private)
ALTER TABLE trial_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trial_state_select" ON trial_state
  FOR SELECT USING (
    parent_id = get_my_parent_id()
  );

CREATE POLICY "trial_state_insert" ON trial_state
  FOR INSERT WITH CHECK (
    parent_id = get_my_parent_id()
  );

CREATE POLICY "trial_state_update" ON trial_state
  FOR UPDATE USING (
    parent_id = get_my_parent_id()
  );

-- CALENDAR_CONNECTIONS TABLE (strictly private)
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_connections_select" ON calendar_connections
  FOR SELECT USING (
    parent_id = get_my_parent_id()
  );

CREATE POLICY "calendar_connections_insert" ON calendar_connections
  FOR INSERT WITH CHECK (
    parent_id = get_my_parent_id()
  );

CREATE POLICY "calendar_connections_update" ON calendar_connections
  FOR UPDATE USING (
    parent_id = get_my_parent_id()
  );

CREATE POLICY "calendar_connections_delete" ON calendar_connections
  FOR DELETE USING (
    parent_id = get_my_parent_id()
  );

-- ============================================================================
-- HOUSEHOLDS TABLE (both parents can see)
-- ============================================================================

ALTER TABLE households ENABLE ROW LEVEL SECURITY;

CREATE POLICY "households_select" ON households
  FOR SELECT USING (
    id = get_my_household_id()
  );

CREATE POLICY "households_update" ON households
  FOR UPDATE USING (
    id = get_my_household_id()
  );

-- ============================================================================
-- CALENDAR_EVENTS TABLE (custom logic)
-- Parent sees: their own events + shared events where is_work_event = false
-- ============================================================================

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_events_select" ON calendar_events
  FOR SELECT USING (
    (parent_id = get_my_parent_id())
    OR
    (household_id = get_my_household_id() AND is_shared = true AND is_work_event = false)
  );

CREATE POLICY "calendar_events_insert" ON calendar_events
  FOR INSERT WITH CHECK (
    parent_id = get_my_parent_id() AND household_id = get_my_household_id()
  );

CREATE POLICY "calendar_events_update" ON calendar_events
  FOR UPDATE USING (
    parent_id = get_my_parent_id()
  );

CREATE POLICY "calendar_events_delete" ON calendar_events
  FOR DELETE USING (
    parent_id = get_my_parent_id()
  );

-- ============================================================================
-- HOUSEHOLD SHARED TABLES: Both parents see all
-- ============================================================================

-- CHILDREN TABLE
ALTER TABLE children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "children_select" ON children
  FOR SELECT USING (
    household_id = get_my_household_id()
  );

CREATE POLICY "children_insert" ON children
  FOR INSERT WITH CHECK (
    household_id = get_my_household_id()
  );

CREATE POLICY "children_update" ON children
  FOR UPDATE USING (
    household_id = get_my_household_id()
  );

CREATE POLICY "children_delete" ON children
  FOR DELETE USING (
    household_id = get_my_household_id()
  );

-- CHILDREN_ALLERGIES TABLE (critical for meal safety)
ALTER TABLE children_allergies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "children_allergies_select" ON children_allergies
  FOR SELECT USING (
    household_id = get_my_household_id()
  );

CREATE POLICY "children_allergies_insert" ON children_allergies
  FOR INSERT WITH CHECK (
    household_id = get_my_household_id()
  );

CREATE POLICY "children_allergies_update" ON children_allergies
  FOR UPDATE USING (
    household_id = get_my_household_id()
  );

CREATE POLICY "children_allergies_delete" ON children_allergies
  FOR DELETE USING (
    household_id = get_my_household_id()
  );

-- CHILDREN_ACTIVITIES TABLE
ALTER TABLE children_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "children_activities_select" ON children_activities
  FOR SELECT USING (
    household_id = get_my_household_id()
  );

CREATE POLICY "children_activities_insert" ON children_activities
  FOR INSERT WITH CHECK (
    household_id = get_my_household_id()
  );

CREATE POLICY "children_activities_update" ON children_activities
  FOR UPDATE USING (
    household_id = get_my_household_id()
  );

CREATE POLICY "children_activities_delete" ON children_activities
  FOR DELETE USING (
    household_id = get_my_household_id()
  );

-- PETS TABLE
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pets_select" ON pets
  FOR SELECT USING (
    household_id = get_my_household_id()
  );

CREATE POLICY "pets_insert" ON pets
  FOR INSERT WITH CHECK (
    household_id = get_my_household_id()
  );

CREATE POLICY "pets_update" ON pets
  FOR UPDATE USING (
    household_id = get_my_household_id()
  );

CREATE POLICY "pets_delete" ON pets
  FOR DELETE USING (
    household_id = get_my_household_id()
  );

-- PET_VACCINATIONS TABLE
ALTER TABLE pet_vaccinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pet_vaccinations_select" ON pet_vaccinations
  FOR SELECT USING (
    household_id = get_my_household_id()
  );

CREATE POLICY "pet_vaccinations_insert" ON pet_vaccinations
  FOR INSERT WITH CHECK (
    household_id = get_my_household_id()
  );

CREATE POLICY "pet_vaccinations_update" ON pet_vaccinations
  FOR UPDATE USING (
    household_id = get_my_household_id()
  );

CREATE POLICY "pet_vaccinations_delete" ON pet_vaccinations
  FOR DELETE USING (
    household_id = get_my_household_id()
  );

-- PET_MEDICATIONS TABLE
ALTER TABLE pet_medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pet_medications_select" ON pet_medications
  FOR SELECT USING (
    household_id = get_my_household_id()
  );

CREATE POLICY "pet_medications_insert" ON pet_medications
  FOR INSERT WITH CHECK (
    household_id = get_my_household_id()
  );

CREATE POLICY "pet_medications_update" ON pet_medications
  FOR UPDATE USING (
    household_id = get_my_household_id()
  );

CREATE POLICY "pet_medications_delete" ON pet_medications
  FOR DELETE USING (
    household_id = get_my_household_id()
  );

-- HOUSEHOLD_TODOS TABLE
ALTER TABLE household_todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household_todos_select" ON household_todos
  FOR SELECT USING (
    household_id = get_my_household_id()
  );

CREATE POLICY "household_todos_insert" ON household_todos
  FOR INSERT WITH CHECK (
    household_id = get_my_household_id()
  );

CREATE POLICY "household_todos_update" ON household_todos
  FOR UPDATE USING (
    household_id = get_my_household_id()
  );

CREATE POLICY "household_todos_delete" ON household_todos
  FOR DELETE USING (
    household_id = get_my_household_id()
  );

-- MEAL_PLANS TABLE
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meal_plans_select" ON meal_plans
  FOR SELECT USING (
    household_id = get_my_household_id()
  );

CREATE POLICY "meal_plans_insert" ON meal_plans
  FOR INSERT WITH CHECK (
    household_id = get_my_household_id()
  );

CREATE POLICY "meal_plans_update" ON meal_plans
  FOR UPDATE USING (
    household_id = get_my_household_id()
  );

CREATE POLICY "meal_plans_delete" ON meal_plans
  FOR DELETE USING (
    household_id = get_my_household_id()
  );

-- MEAL_RATINGS TABLE
ALTER TABLE meal_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meal_ratings_select" ON meal_ratings
  FOR SELECT USING (
    household_id = get_my_household_id()
  );

CREATE POLICY "meal_ratings_insert" ON meal_ratings
  FOR INSERT WITH CHECK (
    household_id = get_my_household_id()
  );

CREATE POLICY "meal_ratings_update" ON meal_ratings
  FOR UPDATE USING (
    household_id = get_my_household_id()
  );

CREATE POLICY "meal_ratings_delete" ON meal_ratings
  FOR DELETE USING (
    household_id = get_my_household_id()
  );

-- BUDGET_CATEGORIES TABLE
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budget_categories_select" ON budget_categories
  FOR SELECT USING (
    household_id = get_my_household_id()
  );

CREATE POLICY "budget_categories_insert" ON budget_categories
  FOR INSERT WITH CHECK (
    household_id = get_my_household_id()
  );

CREATE POLICY "budget_categories_update" ON budget_categories
  FOR UPDATE USING (
    household_id = get_my_household_id()
  );

CREATE POLICY "budget_categories_delete" ON budget_categories
  FOR DELETE USING (
    household_id = get_my_household_id()
  );

-- TRANSACTIONS TABLE (rows never exposed directly, only via budget_summary view)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_select" ON transactions
  FOR SELECT USING (
    parent_id = get_my_parent_id()
  );

CREATE POLICY "transactions_insert" ON transactions
  FOR INSERT WITH CHECK (
    parent_id = get_my_parent_id() AND household_id = get_my_household_id()
  );

CREATE POLICY "transactions_update" ON transactions
  FOR UPDATE USING (
    parent_id = get_my_parent_id()
  );

CREATE POLICY "transactions_delete" ON transactions
  FOR DELETE USING (
    parent_id = get_my_parent_id()
  );

-- HOME_SUBSCRIPTIONS TABLE
ALTER TABLE home_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "home_subscriptions_select" ON home_subscriptions
  FOR SELECT USING (
    household_id = get_my_household_id()
  );

CREATE POLICY "home_subscriptions_insert" ON home_subscriptions
  FOR INSERT WITH CHECK (
    household_id = get_my_household_id()
  );

CREATE POLICY "home_subscriptions_update" ON home_subscriptions
  FOR UPDATE USING (
    household_id = get_my_household_id()
  );

CREATE POLICY "home_subscriptions_delete" ON home_subscriptions
  FOR DELETE USING (
    household_id = get_my_household_id()
  );

-- HOME_MAINTENANCE TABLE
ALTER TABLE home_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "home_maintenance_select" ON home_maintenance
  FOR SELECT USING (
    household_id = get_my_household_id()
  );

CREATE POLICY "home_maintenance_insert" ON home_maintenance
  FOR INSERT WITH CHECK (
    household_id = get_my_household_id()
  );

CREATE POLICY "home_maintenance_update" ON home_maintenance
  FOR UPDATE USING (
    household_id = get_my_household_id()
  );

CREATE POLICY "home_maintenance_delete" ON home_maintenance
  FOR DELETE USING (
    household_id = get_my_household_id()
  );

-- DATE_NIGHTS TABLE
ALTER TABLE date_nights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "date_nights_select" ON date_nights
  FOR SELECT USING (
    household_id = get_my_household_id()
  );

CREATE POLICY "date_nights_insert" ON date_nights
  FOR INSERT WITH CHECK (
    household_id = get_my_household_id()
  );

CREATE POLICY "date_nights_update" ON date_nights
  FOR UPDATE USING (
    household_id = get_my_household_id()
  );

CREATE POLICY "date_nights_delete" ON date_nights
  FOR DELETE USING (
    household_id = get_my_household_id()
  );

-- ============================================================================
-- KIN_MEMORY TABLE (hybrid: private + shared)
-- Parent sees: their own memories + household memories (parent_id IS NULL)
-- ============================================================================

ALTER TABLE kin_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kin_memory_select" ON kin_memory
  FOR SELECT USING (
    (parent_id = get_my_parent_id())
    OR
    (household_id = get_my_household_id() AND parent_id IS NULL)
  );

CREATE POLICY "kin_memory_insert" ON kin_memory
  FOR INSERT WITH CHECK (
    (parent_id = get_my_parent_id() AND household_id = get_my_household_id())
    OR
    (parent_id IS NULL AND household_id = get_my_household_id())
  );

CREATE POLICY "kin_memory_update" ON kin_memory
  FOR UPDATE USING (
    (parent_id = get_my_parent_id())
    OR
    (household_id = get_my_household_id() AND parent_id IS NULL)
  );

CREATE POLICY "kin_memory_delete" ON kin_memory
  FOR DELETE USING (
    (parent_id = get_my_parent_id())
    OR
    (household_id = get_my_household_id() AND parent_id IS NULL)
  );

-- ============================================================================
-- PARTNER_INVITES TABLE
-- Only the inviting parent can view/manage their own invites
-- ============================================================================

ALTER TABLE partner_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_invites_select" ON partner_invites
  FOR SELECT USING (
    invited_by_parent_id = get_my_parent_id() OR household_id = get_my_household_id()
  );

CREATE POLICY "partner_invites_insert" ON partner_invites
  FOR INSERT WITH CHECK (
    invited_by_parent_id = get_my_parent_id() AND household_id = get_my_household_id()
  );

CREATE POLICY "partner_invites_update" ON partner_invites
  FOR UPDATE USING (
    invited_by_parent_id = get_my_parent_id()
  );

CREATE POLICY "partner_invites_delete" ON partner_invites
  FOR DELETE USING (
    invited_by_parent_id = get_my_parent_id()
  );
