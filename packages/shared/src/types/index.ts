// ── User & Profile ──

export type HouseholdType = "two-parent" | "single-parent" | "blended" | "other";
export type SubscriptionTier = "free" | "starter" | "family";

export interface Profile {
  id: string;
  email: string;
  family_name: string;
  household_type: HouseholdType;
  subscription_tier: SubscriptionTier;
  trial_ends_at: string;
  subscription_charge_count: number;
  referral_code: string;
  created_at: string;
}

// ── Onboarding ──

export interface FamilyMember {
  name: string;
  age?: number;
  type: "adult" | "child" | "pet";
}

export interface OnboardingData {
  family_name: string;
  household_type: HouseholdType;
  members: FamilyMember[];
  weekly_grocery_budget: number;
  dietary_preferences: string[];
  food_loves: string[];
  food_dislikes: string[];
}

// ── Meals ──

export interface Meal {
  id: string;
  name: string;
  prep_time_minutes: number;
  estimated_cost: number;
  recipe: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  rating?: number;
}

export interface MealPlan {
  id: string;
  week_start: string;
  days: {
    date: string;
    meals: Meal[];
  }[];
}

export interface GroceryItem {
  name: string;
  quantity: string;
  estimated_cost: number;
  recommended_store: string;
  savings_tip?: string;
}

// ── Budget ──

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  parent_id: string;
}

// ── Calendar ──

export type CalendarProvider = "google" | "apple";
export type CalendarEventSource = "google" | "apple" | "kin";
export type SyncStatus = "synced" | "pending_push" | "pending_pull" | "error" | "conflict";
export type ConflictType = "time_overlap" | "kid_conflict" | "meal_conflict";

export interface CalendarConnection {
  id: string;
  profile_id: string;
  provider: CalendarProvider;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  caldav_url?: string;
  google_calendar_id?: string;
  google_sync_token?: string;
  google_channel_id?: string;
  google_channel_expiry?: string;
  google_resource_id?: string;
  last_synced_at?: string;
  sync_status: "idle" | "syncing" | "error";
  sync_error?: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  profile_id: string;
  household_id?: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  recurrence_rule?: string;
  color?: string;
  external_id?: string;
  external_source: CalendarEventSource;
  external_calendar_id?: string;
  external_etag?: string;
  last_synced_at?: string;
  sync_status: SyncStatus;
  owner_parent_id: string;
  is_shared: boolean;
  is_kid_event: boolean;
  assigned_member?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface CalendarConflict {
  id: string;
  household_id: string;
  event_a_id: string;
  event_b_id: string;
  event_a?: CalendarEvent;
  event_b?: CalendarEvent;
  conflict_type: ConflictType;
  description?: string;
  resolved: boolean;
  resolved_at?: string;
  resolution_note?: string;
  created_at: string;
}

// ── Chat ──

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}
