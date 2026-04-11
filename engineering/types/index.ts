// Kin AI — Complete TypeScript Type Definitions
// Mirrors Supabase schema exactly
// Author: Lead Engineer
// Date: 2026-04-02

// ============================================================================
// HOUSEHOLD & FAMILY CORE
// ============================================================================

export interface Household {
  id: string
  family_name: string
  created_at: string
}

export interface Parent {
  id: string
  household_id: string
  user_id: string | null
  name: string
  age: number | null
  email: string
  is_partner_1: boolean
  home_location: string | null
  work_location: string | null
  timezone: string
  briefing_time: string
  onboarding_complete: boolean
  created_at: string
}

export interface Child {
  id: string
  household_id: string
  name: string
  age: number | null
  school_name: string | null
  school_location: string | null
  grade: string | null
  created_at: string
}

export interface ChildAllergy {
  id: string
  child_id: string
  household_id: string
  allergen: string
  severity: 'avoid' | 'severe'
  notes: string | null
  created_at: string
}

export interface ChildActivity {
  id: string
  child_id: string
  household_id: string
  activity_name: string
  days_of_week: string[] | null
  start_time: string | null
  end_time: string | null
  location: string | null
  season_end_date: string | null
  created_at: string
}

// ============================================================================
// PETS & VETERINARY
// ============================================================================

export interface Pet {
  id: string
  household_id: string
  name: string
  species: string | null
  breed: string | null
  age_years: number | null
  vet_name: string | null
  vet_phone: string | null
  vet_location: string | null
  created_at: string
}

export interface PetVaccination {
  id: string
  pet_id: string
  household_id: string
  vaccine_name: string
  last_given: string | null
  next_due: string | null
  created_at: string
}

export interface PetMedication {
  id: string
  pet_id: string
  household_id: string
  drug_name: string
  dose: string | null
  schedule: string | null
  next_due: string | null
  refill_date: string | null
  last_confirmed_at: string | null
  created_at: string
}

// ============================================================================
// CALENDAR & EVENTS
// ============================================================================

export interface CalendarConnection {
  id: string
  parent_id: string
  provider: 'google' | 'apple' | 'work_google' | 'work_outlook'
  access_token: string | null
  refresh_token: string | null
  calendar_id: string | null
  last_synced_at: string | null
  sync_status: 'synced' | 'pending' | 'error'
  is_read_only: boolean
  created_at: string
}

export interface CalendarEvent {
  id: string
  parent_id: string
  household_id: string
  title: string
  start_at: string
  end_at: string
  is_all_day: boolean
  location: string | null
  is_shared: boolean
  is_work_event: boolean
  external_id: string | null
  external_source: 'google' | 'apple' | 'kin' | null
  external_calendar_id: string | null
  sync_status: 'synced' | 'pending' | 'error'
  needs_prep: boolean
  created_at: string
  updated_at: string
}

// ============================================================================
// TODOS
// ============================================================================

export interface HouseholdTodo {
  id: string
  household_id: string
  title: string
  is_complete: boolean
  assigned_to_parent_id: string | null
  due_date: string | null
  completed_at: string | null
  created_at: string
}

export interface ParentTodo {
  id: string
  parent_id: string
  title: string
  is_complete: boolean
  due_at: string | null
  completed_at: string | null
  created_at: string
}

// ============================================================================
// MEALS & NUTRITION
// ============================================================================

export interface MealPlan {
  id: string
  household_id: string
  week_start_date: string
  meals: MealPlanMeal[]
  grocery_list: GroceryItem[] | null
  estimated_weekly_cost: number | null
  created_at: string
}

export interface MealPlanMeal {
  day: string
  meal_name: string
  prep_minutes: number
  est_cost: number
  recipe_url?: string
}

export interface GroceryItem {
  item: string
  quantity: string
  estimated_price: number
  store_suggestion?: string
}

export interface MealRating {
  id: string
  household_id: string
  meal_name: string
  rating: number
  notes: string | null
  rated_at: string
  created_at: string
}

// ============================================================================
// BUDGET & FINANCES
// ============================================================================

export interface BudgetCategory {
  id: string
  household_id: string
  name: string
  monthly_limit: number
  color: string | null
  created_at: string
}

export interface Transaction {
  id: string
  parent_id: string
  household_id: string
  amount: number
  category_id: string | null
  description: string | null
  transaction_date: string
  is_shared: boolean
  plaid_transaction_id: string | null
  created_at: string
}

export interface BudgetSummary {
  household_id: string
  category_id: string
  category_name: string
  monthly_limit: number
  color: string | null
  month: string
  total_spent: number
  remaining: number
  pct_used: number
}

export interface BudgetProgressCurrentMonth extends BudgetSummary {}

// ============================================================================
// HOME MANAGEMENT
// ============================================================================

export interface HomeSubscription {
  id: string
  household_id: string
  service_name: string
  monthly_cost: number | null
  renewal_date: string | null
  last_flagged_at: string | null
  created_at: string
}

export interface HomeMaintenance {
  id: string
  household_id: string
  task_name: string
  cadence_days: number | null
  last_done: string | null
  next_due: string | null
  created_at: string
}

// ============================================================================
// FITNESS & WELLNESS (PRIVATE)
// ============================================================================

export interface FitnessProfile {
  id: string
  parent_id: string
  goals: 'weight_loss' | 'muscle_gain' | 'endurance' | 'general' | null
  current_weight_lbs: number | null
  target_weight_lbs: number | null
  target_date: string | null
  training_days_per_week: number
  created_at: string
  updated_at: string
}

export interface WorkoutSession {
  id: string
  parent_id: string
  session_date: string
  exercises: WorkoutExercise[]
  notes: string | null
  duration_minutes: number | null
  created_at: string
}

export interface WorkoutExercise {
  exercise_name: string
  sets: WorkoutSet[]
}

export interface WorkoutSet {
  weight_lbs?: number
  reps?: number
  completed: boolean
}

// ============================================================================
// RELATIONSHIP & SHARED MOMENTS
// ============================================================================

export interface DateNight {
  id: string
  household_id: string
  date: string
  activity: string | null
  logged_at: string
  created_at: string
}

export interface DateNightStatus {
  household_id: string
  last_date_night: string
  days_since: number
  activity: string | null
  status: 'recent' | 'soon' | 'overdue'
}

// ============================================================================
// AI MEMORY & CONTEXT
// ============================================================================

export type MemoryType = 'preference' | 'fact' | 'rating' | 'goal' | 'decision'

export interface KinMemory {
  id: string
  parent_id: string | null
  household_id: string | null
  memory_type: MemoryType
  content: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ============================================================================
// NOTIFICATIONS & DEVICES
// ============================================================================

export interface PushToken {
  id: string
  parent_id: string
  expo_push_token: string
  device_id: string | null
  created_at: string
  updated_at: string
}

// ============================================================================
// AUTH & INVITATIONS
// ============================================================================

export interface PartnerInvite {
  id: string
  household_id: string
  invited_by_parent_id: string
  invite_token: string
  invited_email: string | null
  accepted_at: string | null
  expires_at: string
  created_at: string
}

export interface TrialState {
  id: string
  parent_id: string
  trial_started_at: string
  trial_ends_at: string
  is_subscribed: boolean
  revenuecat_customer_id: string | null
  subscription_plan: 'monthly' | 'annual' | null
  subscribed_at: string | null
  created_at: string
}

// ============================================================================
// VIEW TYPES
// ============================================================================

export interface CalendarSummaryToday {
  parent_id: string
  household_id: string
  title: string
  start_at: string
  end_at: string
  location: string | null
  is_work_event: boolean
  needs_prep: boolean
  hour_of_day: number
  minute_of_hour: number
}

export interface MealScheduleToday {
  household_id: string
  date: string
  day_of_week: string | null
  meal_name: string | null
  prep_minutes: string | null
  est_cost: string | null
  recipe_url: string | null
  household_allergies: string | null
}

export interface ChildActivitiesThisWeek {
  household_id: string
  child_id: string
  child_name: string
  activity_name: string
  days_of_week: string[] | null
  start_time: string | null
  end_time: string | null
  location: string | null
  season_end_date: string | null
  is_active: boolean
}

export interface HealthReminder {
  reminder_type: 'pet_vaccination' | 'pet_medication' | 'home_maintenance'
  household_id: string
  parent_id: string | null
  reminder_text: string
  due_date: string
  urgency: 'unknown' | 'overdue' | 'upcoming' | 'future'
}

export interface CommuteIntelligenceToday {
  parent_id: string
  household_id: string
  first_event_title: string | null
  first_event_time: string | null
  event_location: string | null
  needs_prep: boolean
  home_location: string | null
  work_location: string | null
  timezone: string
  event_hour_local: number | null
  event_minute_local: number | null
}

export interface AllergySummaryByHousehold {
  household_id: string
  allergen_list: string
  affected_children_count: number
  details: string
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface AuthSession {
  user: {
    id: string
    email?: string
    user_metadata?: Record<string, unknown>
  }
  session: {
    access_token: string
    refresh_token: string | null
    expires_in: number
    expires_at: number
  }
}

export interface SignUpResponse {
  parent: Parent
  household: Household
  trial: TrialState
}

export interface SignInResponse {
  session: AuthSession
  parent: Parent
}

export interface FamilyContext {
  familyName: string
  parent: {
    id: string
    name: string
    age: number | null
    timezone: string
    wellnessGoals?: string
    calendarSummary?: string
  }
  children: Array<{
    name: string
    age: number | null
    allergies: string[]
    activitiesToday: string[]
  }>
  pets: Array<{
    name: string
    species: string | null
    medicationsDueToday: string[]
    upcomingVetDays: number | null
  }>
  householdState: {
    budgetSummary: string
    tonightsMeal?: string
    groceryStatus?: string
    lastDateNight?: string
    daysSinceLastDateNight?: number
    upcomingEvents?: string
  }
  commute?: {
    firstEventTime?: string
    firstEventTitle?: string
    estimatedCommuteMins?: number
    recommendedLeaveTime?: string
  }
  workContext?: {
    meetingCount: number
    firstMeetingTime?: string
    hasBackToBack: boolean
    needsPrepMeeting?: string
  }
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type Nullable<T> = T | null
export type Optional<T> = T | undefined

export interface PaginationParams {
  limit?: number
  offset?: number
}

export interface SortParams {
  column: string
  ascending?: boolean
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}
