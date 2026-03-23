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

// ── Chat ──

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}
