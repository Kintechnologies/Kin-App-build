-- Kin AI Supabase Views Migration 003
-- Safe aggregated views for budget reporting
-- Author: Lead Engineer, Kin AI
-- Date: 2026-04-02

-- ============================================================================
-- BUDGET SUMMARY VIEW
-- Both parents see combined category totals by month (never individual rows)
-- ============================================================================

CREATE OR REPLACE VIEW budget_summary AS
SELECT
  t.household_id,
  t.category_id,
  bc.name AS category_name,
  bc.monthly_limit,
  bc.color,
  DATE_TRUNC('month', t.transaction_date) AS month,
  COALESCE(SUM(t.amount), 0) AS total_spent,
  COALESCE(bc.monthly_limit - SUM(t.amount), bc.monthly_limit) AS remaining,
  CASE
    WHEN bc.monthly_limit > 0 THEN ROUND((COALESCE(SUM(t.amount), 0) / bc.monthly_limit) * 100, 1)
    ELSE 0
  END AS pct_used
FROM budget_categories bc
LEFT JOIN transactions t ON t.category_id = bc.id
  AND DATE_TRUNC('month', t.transaction_date) = DATE_TRUNC('month', CURRENT_DATE)
  AND t.is_shared = true
GROUP BY t.household_id, t.category_id, bc.id, bc.name, bc.monthly_limit, bc.color, DATE_TRUNC('month', t.transaction_date)
ORDER BY bc.name;

-- Grant selective access via RLS at application layer
-- Never expose individual transaction rows in this view

-- ============================================================================
-- CALENDAR SUMMARY VIEW
-- Shows today's events for a parent (useful for briefing generation)
-- ============================================================================

CREATE OR REPLACE VIEW calendar_summary_today AS
SELECT
  ce.parent_id,
  ce.household_id,
  ce.title,
  ce.start_at,
  ce.end_at,
  ce.location,
  ce.is_work_event,
  ce.needs_prep,
  EXTRACT(HOUR FROM ce.start_at) AS hour_of_day,
  EXTRACT(MINUTE FROM ce.start_at) AS minute_of_hour
FROM calendar_events ce
WHERE DATE(ce.start_at AT TIME ZONE (
  SELECT timezone FROM parents WHERE id = ce.parent_id
)) = CURRENT_DATE
  AND ce.start_at IS NOT NULL
ORDER BY ce.start_at;

-- ============================================================================
-- FAMILY MEAL SCHEDULE VIEW
-- Shows today's meal plan with allergy context
-- ============================================================================

CREATE OR REPLACE VIEW meal_schedule_today AS
SELECT
  mp.household_id,
  CURRENT_DATE AS date,
  mp.meals->>'day' AS day_of_week,
  mp.meals->>'meal_name' AS meal_name,
  mp.meals->>'prep_minutes' AS prep_minutes,
  mp.meals->>'est_cost' AS est_cost,
  mp.meals->>'recipe_url' AS recipe_url,
  (
    SELECT STRING_AGG(DISTINCT allergen, ', ')
    FROM children_allergies
    WHERE household_id = mp.household_id
  ) AS household_allergies
FROM meal_plans mp
WHERE mp.week_start_date = (
  SELECT DATE_TRUNC('week', CURRENT_DATE)::DATE
);

-- ============================================================================
-- CHILD ACTIVITY SCHEDULE VIEW
-- Shows children's activities for the week
-- ============================================================================

CREATE OR REPLACE VIEW child_activities_this_week AS
SELECT
  ca.household_id,
  c.id AS child_id,
  c.name AS child_name,
  ca.activity_name,
  ca.days_of_week,
  ca.start_time,
  ca.end_time,
  ca.location,
  ca.season_end_date,
  CASE
    WHEN ca.season_end_date IS NULL THEN true
    WHEN ca.season_end_date >= CURRENT_DATE THEN true
    ELSE false
  END AS is_active
FROM children_activities ca
JOIN children c ON ca.child_id = c.id
ORDER BY c.name, ca.activity_name;

-- ============================================================================
-- HEALTH REMINDERS VIEW
-- Aggregates upcoming pet and child health tasks
-- ============================================================================

CREATE OR REPLACE VIEW health_reminders AS
SELECT
  'pet_vaccination' AS reminder_type,
  pt.household_id,
  NULL::UUID AS parent_id,
  p.name || '''s ' || pv.vaccine_name AS reminder_text,
  pv.next_due::TIMESTAMPTZ AS due_date,
  CASE
    WHEN pv.next_due IS NULL THEN 'unknown'
    WHEN pv.next_due <= CURRENT_DATE THEN 'overdue'
    WHEN pv.next_due <= CURRENT_DATE + INTERVAL '30 days' THEN 'upcoming'
    ELSE 'future'
  END AS urgency
FROM pet_vaccinations pv
JOIN pets p ON pv.pet_id = p.id
JOIN households pt ON pv.household_id = pt.id

UNION ALL

SELECT
  'pet_medication' AS reminder_type,
  pm.household_id,
  NULL::UUID AS parent_id,
  p.name || ' - ' || pm.drug_name || ' refill' AS reminder_text,
  pm.refill_date::TIMESTAMPTZ AS due_date,
  CASE
    WHEN pm.refill_date IS NULL THEN 'unknown'
    WHEN pm.refill_date <= CURRENT_DATE THEN 'overdue'
    WHEN pm.refill_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'upcoming'
    ELSE 'future'
  END AS urgency
FROM pet_medications pm
JOIN pets p ON pm.pet_id = p.id

UNION ALL

SELECT
  'home_maintenance' AS reminder_type,
  hm.household_id,
  NULL::UUID AS parent_id,
  hm.task_name AS reminder_text,
  hm.next_due::TIMESTAMPTZ AS due_date,
  CASE
    WHEN hm.next_due IS NULL THEN 'unknown'
    WHEN hm.next_due <= CURRENT_DATE THEN 'overdue'
    WHEN hm.next_due <= CURRENT_DATE + INTERVAL '14 days' THEN 'upcoming'
    ELSE 'future'
  END AS urgency
FROM home_maintenance hm;

-- ============================================================================
-- BUDGET PROGRESS VIEW
-- Shows current month spending vs limits by category
-- ============================================================================

CREATE OR REPLACE VIEW budget_progress_current_month AS
SELECT
  t.household_id,
  bc.id AS category_id,
  bc.name AS category_name,
  bc.monthly_limit,
  bc.color,
  COALESCE(SUM(CASE WHEN t.is_shared = true THEN t.amount ELSE 0 END), 0) AS total_spent,
  bc.monthly_limit - COALESCE(SUM(CASE WHEN t.is_shared = true THEN t.amount ELSE 0 END), 0) AS remaining,
  CASE
    WHEN bc.monthly_limit > 0 THEN ROUND(
      (COALESCE(SUM(CASE WHEN t.is_shared = true THEN t.amount ELSE 0 END), 0) / bc.monthly_limit) * 100, 1
    )
    ELSE 0
  END AS pct_used
FROM budget_categories bc
LEFT JOIN transactions t ON t.category_id = bc.id
  AND DATE_TRUNC('month', t.transaction_date) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY t.household_id, bc.id, bc.name, bc.monthly_limit, bc.color
ORDER BY bc.name;

-- ============================================================================
-- COMMUTE INTELLIGENCE VIEW
-- Extracts first event and commute context for a parent today
-- ============================================================================

CREATE OR REPLACE VIEW commute_intelligence_today AS
SELECT
  ce.parent_id,
  ce.household_id,
  ce.title AS first_event_title,
  ce.start_at AS first_event_time,
  ce.location AS event_location,
  ce.needs_prep,
  p.home_location,
  p.work_location,
  p.timezone,
  EXTRACT(HOUR FROM ce.start_at AT TIME ZONE p.timezone) AS event_hour_local,
  EXTRACT(MINUTE FROM ce.start_at AT TIME ZONE p.timezone) AS event_minute_local
FROM calendar_events ce
JOIN parents p ON ce.parent_id = p.id
WHERE DATE(ce.start_at AT TIME ZONE p.timezone) = CURRENT_DATE
  AND ce.start_at IS NOT NULL
  AND ce.is_work_event = false
QUALIFY ROW_NUMBER() OVER (PARTITION BY ce.parent_id ORDER BY ce.start_at) = 1;

-- ============================================================================
-- ALLERGY SUMMARY VIEW
-- Fast lookup of all allergies by household (for meal planning)
-- ============================================================================

CREATE OR REPLACE VIEW allergy_summary_by_household AS
SELECT
  ca.household_id,
  STRING_AGG(DISTINCT ca.allergen, ', ' ORDER BY ca.allergen) AS allergen_list,
  COUNT(DISTINCT ca.child_id) AS affected_children_count,
  STRING_AGG(DISTINCT c.name || ' (' || ca.allergen || ')', ', ' ORDER BY c.name) AS details
FROM children_allergies ca
JOIN children c ON ca.child_id = c.id
GROUP BY ca.household_id;

-- ============================================================================
-- DATE NIGHT TRACKING VIEW
-- Shows days since last date night for relationship context
-- ============================================================================

CREATE OR REPLACE VIEW date_night_status AS
SELECT
  dn.household_id,
  dn.date AS last_date_night,
  CURRENT_DATE - dn.date AS days_since,
  dn.activity,
  CASE
    WHEN CURRENT_DATE - dn.date > 30 THEN 'overdue'
    WHEN CURRENT_DATE - dn.date > 14 THEN 'soon'
    ELSE 'recent'
  END AS status
FROM date_nights dn
WHERE dn.date = (SELECT MAX(date) FROM date_nights WHERE household_id = dn.household_id);
