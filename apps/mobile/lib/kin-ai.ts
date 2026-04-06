import { supabase } from "./supabase";
import { api } from "./api";

// ─── Local row shapes (from Supabase joins) ──────────────────────────────────

interface AllergyRow {
  allergen: string;
  severity: string;
  notes?: string | null;
  family_member?: { name: string } | null;
}

interface ActivityRow {
  name: string;
  day_of_week?: string[] | null;
  start_time?: string | null;
  family_member?: { name: string } | null;
}

interface PetMedRow {
  name: string;
  frequency: string;
  time_of_day?: string[] | null;
  family_member?: { name: string } | null;
}

interface BudgetSummaryRow {
  category_name: string;
  total_spent: number;
  monthly_limit: number;
  remaining: number;
}

/**
 * Assembles comprehensive family context for Claude
 * Queries Supabase for all family data needed for personalized AI responses
 * CRITICAL: Always includes allergy context - this is a non-negotiable safety requirement
 */
export async function assembleFamilyContext(profileId: string): Promise<string> {
  try {
    const [
      { data: profile },
      { data: members },
      { data: prefs },
      { data: schedule },
      { data: children },
      { data: allergies },
      { data: activities },
      { data: pets },
      { data: petMeds },
      { data: budgetCategories },
      { data: budgetSummary },
      { data: mealPlan },
      { data: fitnessProfile },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", profileId).single(),
      supabase.from("family_members").select("*").eq("profile_id", profileId),
      supabase
        .from("onboarding_preferences")
        .select("*")
        .eq("profile_id", profileId)
        .single(),
      supabase
        .from("parent_schedules")
        .select("*")
        .eq("profile_id", profileId)
        .single(),
      supabase
        .from("family_members")
        .select("*")
        .eq("profile_id", profileId)
        .eq("member_type", "child"),
      supabase
        .from("children_allergies")
        .select("*, family_member:family_members(name)")
        .eq("profile_id", profileId),
      supabase
        .from("children_activities")
        .select("*, family_member:family_members(name)")
        .eq("profile_id", profileId),
      supabase
        .from("family_members")
        .select("*")
        .eq("profile_id", profileId)
        .eq("member_type", "pet"),
      supabase
        .from("pet_medications")
        .select("*, family_member:family_members(name)")
        .eq("profile_id", profileId)
        .eq("active", true),
      supabase
        .from("budget_categories")
        .select("*")
        .eq("profile_id", profileId)
        .eq("active", true),
      supabase.rpc("get_budget_summary", { user_id: profileId }),
      supabase
        .from("meal_plans")
        .select("*")
        .eq("profile_id", profileId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from("fitness_profiles")
        .select("*")
        .eq("profile_id", profileId)
        .single(),
    ]);

    const adults = (members || []).filter((m) => m.member_type === "adult");
    const childrenMembers = (members || []).filter(
      (m) => m.member_type === "child"
    );
    const petMembers = (members || []).filter((m) => m.member_type === "pet");

    // Build allergy context - MUST ALWAYS INCLUDE
    const allergyContext =
      allergies && allergies.length > 0
        ? (allergies as AllergyRow[])
            .map(
              (a) =>
                `${a.family_member?.name || "Child"}: ${a.allergen} (${a.severity}${a.notes ? ` - ${a.notes}` : ""})`
            )
            .join("\n  ")
        : "No known allergies";

    // Build activities context
    const activitiesContext =
      activities && activities.length > 0
        ? (activities as ActivityRow[])
            .map(
              (a) =>
                `${a.family_member?.name}: ${a.name} - ${(a.day_of_week || []).join(", ")} ${a.start_time ? `@ ${a.start_time}` : ""}`
            )
            .join("\n  ")
        : "No activities scheduled";

    // Build pet medications context
    const petMedsContext =
      petMeds && petMeds.length > 0
        ? (petMeds as PetMedRow[])
            .map(
              (pm) =>
                `${pm.family_member?.name}: ${pm.name} - ${pm.frequency}${pm.time_of_day ? ` at ${pm.time_of_day.join(", ")}` : ""}`
            )
            .join("\n  ")
        : "No active pet medications";

    // Build budget summary
    const budgetSummaryText =
      budgetSummary && budgetSummary.length > 0
        ? (budgetSummary as BudgetSummaryRow[])
            .map(
              (b) =>
                `${b.category_name}: $${b.total_spent}/$${b.monthly_limit} (${b.remaining >= 0 ? `$${b.remaining}` : `$${Math.abs(b.remaining)} over`} remaining)`
            )
            .join("\n  ")
        : "No budget data yet";

    // Build schedule context
    const scheduleText = schedule
      ? `
  Home location: ${schedule.home_location || "Not set"}
  Work location: ${schedule.work_location || "Not set"}
  Commute mode: ${schedule.commute_mode || "Not specified"}
  Schedule notes: ${schedule.raw_description || "Not specified"}`
      : "No schedule information";

    // Fitness info - only include for the requesting user, never share with partner
    const fitnessContext =
      fitnessProfile && fitnessProfile.goal
        ? `
  Goal: ${fitnessProfile.goal}
  Current weight: ${fitnessProfile.current_weight_lbs || "Not set"} lbs
  Target: ${fitnessProfile.target_weight_lbs || "Not set"} lbs by ${fitnessProfile.target_date || "No target date"}`
        : "No fitness profile";

    return `
═══════════════════════════════════════════════════════════════
 FAMILY CONTEXT FOR CLAUDE
═══════════════════════════════════════════════════════════════

PROFILE
  Name: ${profile?.family_name || "Unknown"}
  Household type: ${profile?.household_type || "Unknown"}
  Active user: ${adults[0]?.name || "Parent"}

CHILDREN & ALLERGIES (NON-NEGOTIABLE SAFETY)
  Allergies:
  ${allergyContext}

  Activities:
  ${activitiesContext}

PETS & CARE
  Medications:
  ${petMedsContext}

SCHEDULE & LOGISTICS
  ${scheduleText}

FITNESS (PRIVATE - THIS PARENT ONLY)
  ${fitnessContext}

BUDGET STATUS
  ${budgetSummaryText}

CURRENT MEAL PLAN
  ${mealPlan ? JSON.stringify(mealPlan.meal_options) : "No meal plan generated yet"}

DIETARY PREFERENCES
  Loves: ${prefs?.food_loves?.join(", ") || "Not specified"}
  Dislikes: ${prefs?.food_dislikes?.join(", ") || "Not specified"}
  Preferences: ${prefs?.dietary_preferences?.join(", ") || "Not specified"}

═══════════════════════════════════════════════════════════════
`;
  } catch (error) {
    if (__DEV__) console.error("Error assembling family context:", error);
    throw error;
  }
}

/**
 * Sends a message to Claude with full family context in the system prompt
 * Maintains conversation history and personal privacy between household partners
 */
export async function kinChat(
  profileId: string,
  message: string,
  threadId?: string
): Promise<string> {
  try {
    // Note: familyContext is assembled server-side in /api/chat route
    // This ensures allergies and private data are never exposed to the client
    const response = await api.chat(message);

    return response.response;
  } catch (error) {
    if (__DEV__) console.error("Error in kinChat:", error);
    throw error;
  }
}

/**
 * Generates the daily morning briefing for a parent
 * Synthesizes calendar, schedule, family commitments, and logistics
 * PRIVACY: Fitness data (PRIVATE - only for that parent)
 * PRIVACY: Budget - only shows own spending breakdown
 */
export async function generateMorningBriefing(
  profileId: string
): Promise<string> {
  try {
    const briefing = await api.getMorningBriefing();
    return briefing.content;
  } catch (error) {
    if (__DEV__) console.error("Error generating morning briefing:", error);
    throw error;
  }
}
