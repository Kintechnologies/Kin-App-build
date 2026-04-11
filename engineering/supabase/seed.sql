-- Kin AI Seed Data
-- Test household: Austin Ford + Partner + 1 child (dairy/egg allergic) + 1 dog
-- Author: Lead Engineer
-- Date: 2026-04-02

-- ============================================================================
-- HOUSEHOLD SETUP
-- ============================================================================

INSERT INTO households (id, family_name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Ford');

-- ============================================================================
-- PARENTS
-- ============================================================================
-- Note: user_id will be populated after Supabase Auth users are created
-- For development, use NULL and update after auth setup

INSERT INTO parents (
  id,
  household_id,
  user_id,
  name,
  age,
  email,
  is_partner_1,
  home_location,
  work_location,
  timezone,
  briefing_time,
  onboarding_complete
) VALUES
  (
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0000-000000000001',
    NULL,
    'Austin',
    32,
    'austin@kinai.family',
    true,
    'Columbus, OH 43214',
    'Columbus, OH (Downtown)',
    'America/New_York',
    '06:00:00',
    false
  ),
  (
    '00000000-0000-0000-0001-000000000002',
    '00000000-0000-0000-0000-000000000001',
    NULL,
    'Partner',
    31,
    'partner@kinai.family',
    false,
    'Columbus, OH 43214',
    'Columbus, OH (Polaris)',
    'America/New_York',
    '06:30:00',
    false
  );

-- ============================================================================
-- CHILDREN
-- ============================================================================

INSERT INTO children (
  id,
  household_id,
  name,
  age,
  school_name,
  school_location,
  grade
) VALUES
  (
    '00000000-0000-0000-0002-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Mia',
    7,
    'Lincoln Elementary School',
    'Columbus, OH',
    '2nd'
  );

-- ============================================================================
-- CHILDREN ALLERGIES (CRITICAL SAFETY DATA)
-- ============================================================================

INSERT INTO children_allergies (
  id,
  child_id,
  household_id,
  allergen,
  severity,
  notes
) VALUES
  (
    '00000000-0000-0000-0003-000000000001',
    '00000000-0000-0000-0002-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'dairy',
    'avoid',
    'Lactose intolerant - stomach issues within 2 hours'
  ),
  (
    '00000000-0000-0000-0003-000000000002',
    '00000000-0000-0000-0002-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'egg',
    'avoid',
    'Mild reaction - hives within 30 minutes'
  );

-- ============================================================================
-- CHILDREN ACTIVITIES
-- ============================================================================

INSERT INTO children_activities (
  id,
  child_id,
  household_id,
  activity_name,
  days_of_week,
  start_time,
  end_time,
  location,
  season_end_date
) VALUES
  (
    '00000000-0000-0000-0004-000000000001',
    '00000000-0000-0000-0002-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Soccer',
    ARRAY['Tuesday', 'Thursday'],
    '16:30:00',
    '18:00:00',
    'Columbus Recreation Center, East Side',
    '2026-06-30'
  ),
  (
    '00000000-0000-0000-0004-000000000002',
    '00000000-0000-0000-0002-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Piano Lessons',
    ARRAY['Wednesday'],
    '15:30:00',
    '16:15:00',
    'Northside Music Academy',
    NULL
  );

-- ============================================================================
-- PETS
-- ============================================================================

INSERT INTO pets (
  id,
  household_id,
  name,
  species,
  breed,
  age_years,
  vet_name,
  vet_phone,
  vet_location
) VALUES
  (
    '00000000-0000-0000-0005-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Buddy',
    'dog',
    'Labrador Retriever',
    5.5,
    'Clintonville Vet Clinic',
    '(614) 555-0123',
    'Columbus, OH 43202'
  );

-- ============================================================================
-- PET VACCINATIONS
-- ============================================================================

INSERT INTO pet_vaccinations (
  id,
  pet_id,
  household_id,
  vaccine_name,
  last_given,
  next_due
) VALUES
  (
    '00000000-0000-0000-0006-000000000001',
    '00000000-0000-0000-0005-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Rabies',
    '2024-03-15',
    '2025-03-15'
  ),
  (
    '00000000-0000-0000-0006-000000000002',
    '00000000-0000-0000-0005-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'DHPP',
    '2024-03-15',
    '2025-03-15'
  );

-- ============================================================================
-- PET MEDICATIONS
-- ============================================================================

INSERT INTO pet_medications (
  id,
  pet_id,
  household_id,
  drug_name,
  dose,
  schedule,
  next_due,
  refill_date,
  last_confirmed_at
) VALUES
  (
    '00000000-0000-0000-0007-000000000001',
    '00000000-0000-0000-0005-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Glucosamine for joint health',
    '1000mg',
    'daily',
    NOW() + INTERVAL '1 day',
    CURRENT_DATE + INTERVAL '30 days',
    NOW()
  );

-- ============================================================================
-- BUDGET CATEGORIES
-- ============================================================================

INSERT INTO budget_categories (
  id,
  household_id,
  name,
  monthly_limit,
  color
) VALUES
  (
    '00000000-0000-0000-0008-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Groceries',
    720.00,
    '#7CB87A'
  ),
  (
    '00000000-0000-0000-0008-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Dining Out',
    200.00,
    '#D4A843'
  ),
  (
    '00000000-0000-0000-0008-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'Entertainment',
    100.00,
    '#A07EC8'
  ),
  (
    '00000000-0000-0000-0008-000000000004',
    '00000000-0000-0000-0000-000000000001',
    'Household',
    300.00,
    '#7AADCE'
  ),
  (
    '00000000-0000-0000-0008-000000000005',
    '00000000-0000-0000-0000-000000000001',
    'Subscriptions',
    150.00,
    '#D4748A'
  ),
  (
    '00000000-0000-0000-0008-000000000006',
    '00000000-0000-0000-0000-000000000001',
    'Pets',
    100.00,
    '#F09A4B'
  );

-- ============================================================================
-- SAMPLE TRANSACTIONS (This month)
-- ============================================================================

INSERT INTO transactions (
  id,
  parent_id,
  household_id,
  amount,
  category_id,
  description,
  transaction_date,
  is_shared
) VALUES
  (
    '00000000-0000-0000-0009-000000000001',
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0000-000000000001',
    156.32,
    '00000000-0000-0000-0008-000000000001',
    'Kroger groceries',
    CURRENT_DATE - INTERVAL '3 days',
    true
  ),
  (
    '00000000-0000-0000-0009-000000000002',
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0000-000000000001',
    45.50,
    '00000000-0000-0000-0008-000000000002',
    'Chipotle family dinner',
    CURRENT_DATE - INTERVAL '2 days',
    true
  ),
  (
    '00000000-0000-0000-0009-000000000003',
    '00000000-0000-0000-0001-000000000002',
    '00000000-0000-0000-0000-000000000001',
    89.99,
    '00000000-0000-0000-0008-000000000001',
    'Whole Foods organic',
    CURRENT_DATE - INTERVAL '1 day',
    true
  ),
  (
    '00000000-0000-0000-0009-000000000004',
    '00000000-0000-0000-0001-000000000002',
    '00000000-0000-0000-0000-000000000001',
    22.47,
    '00000000-0000-0000-0008-000000000006',
    'Buddy dog food (Chewy)',
    CURRENT_DATE - INTERVAL '5 days',
    true
  ),
  (
    '00000000-0000-0000-0009-000000000005',
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0000-000000000001',
    14.99,
    '00000000-0000-0000-0008-000000000005',
    'Spotify subscription',
    CURRENT_DATE,
    true
  );

-- ============================================================================
-- HOME MAINTENANCE TASKS
-- ============================================================================

INSERT INTO home_maintenance (
  id,
  household_id,
  task_name,
  cadence_days,
  last_done,
  next_due
) VALUES
  (
    '00000000-0000-0000-000a-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Change HVAC filter',
    90,
    '2026-01-15',
    '2026-04-15'
  ),
  (
    '00000000-0000-0000-000a-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Deep clean kitchen',
    30,
    CURRENT_DATE - INTERVAL '15 days',
    CURRENT_DATE + INTERVAL '15 days'
  ),
  (
    '00000000-0000-0000-000a-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'Mow lawn',
    14,
    CURRENT_DATE - INTERVAL '10 days',
    CURRENT_DATE + INTERVAL '4 days'
  );

-- ============================================================================
-- HOME SUBSCRIPTIONS
-- ============================================================================

INSERT INTO home_subscriptions (
  id,
  household_id,
  service_name,
  monthly_cost,
  renewal_date
) VALUES
  (
    '00000000-0000-0000-000b-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Netflix',
    15.99,
    '2026-04-15'
  ),
  (
    '00000000-0000-0000-000b-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Apple Music Family',
    16.99,
    '2026-04-08'
  ),
  (
    '00000000-0000-0000-000b-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'Whole Foods+ (Prime)',
    139.00,
    '2026-05-02'
  );

-- ============================================================================
-- DATE NIGHT HISTORY
-- ============================================================================

INSERT INTO date_nights (
  id,
  household_id,
  date,
  activity
) VALUES
  (
    '00000000-0000-0000-000c-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '2026-03-22',
    'Dinner at Seventeen'
  ),
  (
    '00000000-0000-0000-000c-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '2026-02-28',
    'Movie night at home + wine'
  );

-- ============================================================================
-- MEAL RATINGS
-- ============================================================================

INSERT INTO meal_ratings (
  household_id,
  meal_name,
  rating,
  notes
) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Dairy-free Tacos',
    5,
    'Mia loved it, easy cleanup'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Chicken Stir Fry',
    4,
    'Good, but too much garlic for Mia'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Spaghetti with Marinara',
    3,
    'Mia had dairy-free version, rest of family enjoyed'
  );

-- ============================================================================
-- KIN MEMORY (Household facts & preferences)
-- ============================================================================

INSERT INTO kin_memory (
  id,
  parent_id,
  household_id,
  memory_type,
  content
) VALUES
  (
    '00000000-0000-0000-000d-000000000001',
    NULL,
    '00000000-0000-0000-0000-000000000001',
    'preference',
    '{"key": "family_activity_days", "value": "Saturday mornings - farmers market, Sunday family hike"}'
  ),
  (
    '00000000-0000-0000-000d-000000000002',
    NULL,
    '00000000-0000-0000-0000-000000000001',
    'fact',
    '{"key": "vet_contact", "value": "Clintonville Vet: (614) 555-0123, prefers Tuesday appointments"}'
  ),
  (
    '00000000-0000-0000-000d-000000000003',
    NULL,
    '00000000-0000-0000-0000-000000000001',
    'goal',
    '{"key": "financial_goal", "value": "Stay under $1500/month for groceries + dining. Current pace: $341.29"}'
  ),
  (
    '00000000-0000-0000-000d-000000000004',
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'goal',
    '{"key": "fitness_goal", "value": "Run 3x per week, 5K pace, marathon training starts May 1"}'
  ),
  (
    '00000000-0000-0000-000d-000000000005',
    '00000000-0000-0000-0001-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'preference',
    '{"key": "work_schedule", "value": "Monday-Thursday 8am-5pm, Fridays flexible remote"}'
  );

-- ============================================================================
-- TRIAL STATE (Test both parents with 7-day free trial)
-- ============================================================================

INSERT INTO trial_state (
  id,
  parent_id,
  trial_started_at,
  trial_ends_at,
  is_subscribed
) VALUES
  (
    '00000000-0000-0000-000e-000000000001',
    '00000000-0000-0000-0001-000000000001',
    NOW(),
    NOW() + INTERVAL '7 days',
    false
  ),
  (
    '00000000-0000-0000-000e-000000000002',
    '00000000-0000-0000-0001-000000000002',
    NOW(),
    NOW() + INTERVAL '7 days',
    false
  );
