-- Kin AI Supabase Schema Migration 001
-- Complete schema for household family OS
-- Author: Lead Engineer, Kin AI
-- Date: 2026-04-02

-- Create enum types
CREATE TYPE memory_type AS ENUM ('preference', 'fact', 'rating', 'goal', 'decision');
CREATE TYPE sync_status AS ENUM ('synced', 'pending', 'error');
CREATE TYPE calendar_provider AS ENUM ('google', 'apple', 'work_google', 'work_outlook');

-- ============================================================================
-- HOUSEHOLDS & FAMILY CORE
-- ============================================================================

CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INT,
  email TEXT NOT NULL,
  is_partner_1 BOOLEAN DEFAULT true,
  home_location TEXT,
  work_location TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  briefing_time TIME DEFAULT '06:00:00',
  onboarding_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INT,
  school_name TEXT,
  school_location TEXT,
  grade TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE children_allergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  allergen TEXT NOT NULL,
  severity TEXT DEFAULT 'avoid' CHECK (severity IN ('avoid', 'severe')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE children_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  activity_name TEXT NOT NULL,
  days_of_week TEXT[],
  start_time TIME,
  end_time TIME,
  location TEXT,
  season_end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PETS & VETERINARY
-- ============================================================================

CREATE TABLE pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  species TEXT,
  breed TEXT,
  age_years NUMERIC(4,1),
  vet_name TEXT,
  vet_phone TEXT,
  vet_location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pet_vaccinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  vaccine_name TEXT NOT NULL,
  last_given DATE,
  next_due DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pet_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  drug_name TEXT NOT NULL,
  dose TEXT,
  schedule TEXT,
  next_due TIMESTAMPTZ,
  refill_date DATE,
  last_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CALENDAR & EVENTS
-- ============================================================================

CREATE TABLE calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'apple', 'work_google', 'work_outlook')),
  access_token TEXT,
  refresh_token TEXT,
  calendar_id TEXT,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('synced', 'pending', 'error')),
  is_read_only BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  is_all_day BOOLEAN DEFAULT false,
  location TEXT,
  is_shared BOOLEAN DEFAULT false,
  is_work_event BOOLEAN DEFAULT false,
  external_id TEXT,
  external_source TEXT CHECK (external_source IN ('google', 'apple', 'kin')),
  external_calendar_id TEXT,
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'error')),
  needs_prep BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TODOS
-- ============================================================================

CREATE TABLE household_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_complete BOOLEAN DEFAULT false,
  assigned_to_parent_id UUID REFERENCES parents(id),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE parent_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_complete BOOLEAN DEFAULT false,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MEALS & NUTRITION
-- ============================================================================

CREATE TABLE meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  meals JSONB NOT NULL,
  grocery_list JSONB,
  estimated_weekly_cost NUMERIC(8,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE meal_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  meal_name TEXT NOT NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  notes TEXT,
  rated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- BUDGET & FINANCES
-- ============================================================================

CREATE TABLE budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  monthly_limit NUMERIC(10,2) NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  category_id UUID REFERENCES budget_categories(id),
  description TEXT,
  transaction_date DATE DEFAULT CURRENT_DATE,
  is_shared BOOLEAN DEFAULT true,
  plaid_transaction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- HOME MANAGEMENT
-- ============================================================================

CREATE TABLE home_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  monthly_cost NUMERIC(8,2),
  renewal_date DATE,
  last_flagged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE home_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  cadence_days INT,
  last_done DATE,
  next_due DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FITNESS & WELLNESS (PRIVATE)
-- ============================================================================

CREATE TABLE fitness_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  goals TEXT CHECK (goals IN ('weight_loss', 'muscle_gain', 'endurance', 'general')),
  current_weight_lbs NUMERIC(5,1),
  target_weight_lbs NUMERIC(5,1),
  target_date DATE,
  training_days_per_week INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  session_date DATE DEFAULT CURRENT_DATE,
  exercises JSONB NOT NULL,
  notes TEXT,
  duration_minutes INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- RELATIONSHIP & SHARED MOMENTS
-- ============================================================================

CREATE TABLE date_nights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  activity TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AI MEMORY & CONTEXT
-- ============================================================================

CREATE TABLE kin_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES parents(id),
  household_id UUID REFERENCES households(id),
  memory_type TEXT NOT NULL CHECK (memory_type IN ('preference', 'fact', 'rating', 'goal', 'decision')),
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- NOTIFICATIONS & DEVICES
-- ============================================================================

CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  device_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AUTH & INVITATIONS
-- ============================================================================

CREATE TABLE partner_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  invited_by_parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  invite_token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
  invited_email TEXT,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trial_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  trial_started_at TIMESTAMPTZ DEFAULT NOW(),
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  is_subscribed BOOLEAN DEFAULT false,
  revenuecat_customer_id TEXT,
  subscription_plan TEXT CHECK (subscription_plan IN ('monthly', 'annual')),
  subscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_parents_household ON parents(household_id);
CREATE INDEX idx_parents_user ON parents(user_id);
CREATE INDEX idx_children_household ON children(household_id);
CREATE INDEX idx_children_allergies_child ON children_allergies(child_id);
CREATE INDEX idx_children_allergies_household ON children_allergies(household_id);
CREATE INDEX idx_children_activities_child ON children_activities(child_id);
CREATE INDEX idx_calendar_connections_parent ON calendar_connections(parent_id);
CREATE INDEX idx_calendar_events_parent ON calendar_events(parent_id);
CREATE INDEX idx_calendar_events_household ON calendar_events(household_id);
CREATE INDEX idx_calendar_events_start ON calendar_events(start_at);
CREATE INDEX idx_transactions_household ON transactions(household_id);
CREATE INDEX idx_transactions_parent ON transactions(parent_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_budget_categories_household ON budget_categories(household_id);
CREATE INDEX idx_fitness_profiles_parent ON fitness_profiles(parent_id);
CREATE INDEX idx_workout_sessions_parent ON workout_sessions(parent_id);
CREATE INDEX idx_workout_sessions_date ON workout_sessions(session_date);
CREATE INDEX idx_kin_memory_parent ON kin_memory(parent_id);
CREATE INDEX idx_kin_memory_household ON kin_memory(household_id);
CREATE INDEX idx_push_tokens_parent ON push_tokens(parent_id);
CREATE INDEX idx_partner_invites_household ON partner_invites(household_id);
CREATE INDEX idx_trial_state_parent ON trial_state(parent_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_my_household_id()
RETURNS UUID AS $$
  SELECT household_id FROM parents WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_my_parent_id()
RETURNS UUID AS $$
  SELECT id FROM parents WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_partner_in_household(household_id UUID)
RETURNS UUID AS $$
  SELECT id FROM parents
  WHERE parents.household_id = $1 AND user_id IS NOT NULL
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;
