import { supabase } from "../../lib/supabase";

interface Child {
  name: string;
  age: string;
  allergies: string[];
}

interface Pet {
  name: string;
  species: "dog" | "cat" | "other";
}

export interface OnboardingData {
  familyName: string;
  homeLocation: string;
  householdType: "two-parent" | "single-parent";
  weekDescription: string;
  children: Child[];
  pets: Pet[];
  monthlyGroceryBudget: string;
}

export interface SaveOnboardingResult {
  success: boolean;
  error?: string;
}

export async function saveOnboardingData(
  profileId: string,
  data: OnboardingData
): Promise<SaveOnboardingResult> {
  try {
    // 1. Update profiles: family_name, household_type
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        family_name: data.familyName,
        household_type: data.householdType,
        onboarding_completed: true,
      })
      .eq("id", profileId);

    if (profileError) {
      return {
        success: false,
        error: `Failed to update profile: ${profileError.message}`,
      };
    }

    // 2. Upsert parent_schedules: raw_description, home_location
    const { error: scheduleError } = await supabase
      .from("parent_schedules")
      .upsert(
        {
          profile_id: profileId,
          raw_description: data.weekDescription,
          home_location: data.homeLocation,
        },
        { onConflict: "profile_id" }
      );

    if (scheduleError) {
      return {
        success: false,
        error: `Failed to save schedule: ${scheduleError.message}`,
      };
    }

    // 3. Upsert onboarding_preferences: monthly_grocery_budget
    const monthlyBudget = data.monthlyGroceryBudget
      ? parseInt(data.monthlyGroceryBudget, 10)
      : null;

    const { error: prefsError } = await supabase
      .from("onboarding_preferences")
      .upsert(
        {
          profile_id: profileId,
          weekly_grocery_budget: monthlyBudget ? Math.round(monthlyBudget / 4.33) : null,
        },
        { onConflict: "profile_id" }
      );

    if (prefsError) {
      return {
        success: false,
        error: `Failed to save preferences: ${prefsError.message}`,
      };
    }

    // 4 & 5. Insert family_members for each child and their allergies
    for (const child of data.children) {
      const { data: childData, error: childError } = await supabase
        .from("family_members")
        .insert({
          profile_id: profileId,
          name: child.name,
          age: child.age ? parseInt(child.age, 10) : null,
          member_type: "child",
        })
        .select("id")
        .single();

      if (childError) {
        return {
          success: false,
          error: `Failed to add child ${child.name}: ${childError.message}`,
        };
      }

      if (childData && child.allergies.length > 0) {
        const allergies = child.allergies.map((allergen) => ({
          family_member_id: childData.id,
          profile_id: profileId,
          allergen,
          severity: "mild" as const,
        }));

        const { error: allergyError } = await supabase
          .from("children_allergies")
          .insert(allergies);

        if (allergyError) {
          return {
            success: false,
            error: `Failed to add allergies for ${child.name}: ${allergyError.message}`,
          };
        }
      }
    }

    // 6. Insert family_members for each pet
    for (const pet of data.pets) {
      const { data: petData, error: petError } = await supabase
        .from("family_members")
        .insert({
          profile_id: profileId,
          name: pet.name,
          member_type: "pet",
        })
        .select("id")
        .single();

      if (petError) {
        return {
          success: false,
          error: `Failed to add pet ${pet.name}: ${petError.message}`,
        };
      }

      if (petData) {
        const { error: petDetailsError } = await supabase
          .from("pet_details")
          .insert({
            family_member_id: petData.id,
            profile_id: profileId,
            species: pet.species,
          });

        if (petDetailsError) {
          return {
            success: false,
            error: `Failed to save details for ${pet.name}: ${petDetailsError.message}`,
          };
        }
      }
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: `Unexpected error: ${message}`,
    };
  }
}
