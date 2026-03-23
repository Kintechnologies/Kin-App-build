"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StepFamilyName from "@/components/onboarding/StepFamilyName";
import StepFamilyMembers from "@/components/onboarding/StepFamilyMembers";
import StepPartnerInvite from "@/components/onboarding/StepPartnerInvite";
import StepBudget from "@/components/onboarding/StepBudget";
import StepDietary from "@/components/onboarding/StepDietary";
import StepNutritionGoals from "@/components/onboarding/StepNutritionGoals";
import StepFoodPrefs from "@/components/onboarding/StepFoodPrefs";
import StepStorePrefs from "@/components/onboarding/StepStorePrefs";
import type { HouseholdType, FamilyMember } from "@/types";
import type { NutritionGoal } from "@/components/onboarding/StepNutritionGoals";

const TOTAL_STEPS = 8;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generatingMeals, setGeneratingMeals] = useState(false);

  // Step 1
  const [familyName, setFamilyName] = useState("");
  const [householdType, setHouseholdType] = useState<HouseholdType | "">("");

  // Step 2
  const [members, setMembers] = useState<FamilyMember[]>([]);

  // Step 3
  const [partnerEmail, setPartnerEmail] = useState("");

  // Step 4
  const [budget, setBudget] = useState(0);

  // Step 5
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);

  // Step 6
  const [nutritionData, setNutritionData] = useState({
    goals: [] as NutritionGoal[],
    calorieTarget: 0,
    proteinPriority: false,
    healthyFats: false,
    lowSugar: false,
  });

  // Step 7
  const [foodLoves, setFoodLoves] = useState<string[]>([]);
  const [foodDislikes, setFoodDislikes] = useState<string[]>([]);

  // Step 8
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [separateKidGroceries, setSeparateKidGroceries] = useState<boolean | null>(null);

  const hasKids = members.some((m) => m.type === "child");
  const hasDiet = nutritionData.goals.length > 0 || dietaryPrefs.length > 0;
  const showPartnerStep = householdType === "two-parent" || householdType === "blended";

  async function handleSubmit() {
    setLoading(true);
    setGeneratingMeals(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({ family_name: familyName, household_type: householdType })
      .eq("id", user.id);

    if (members.length > 0) {
      await supabase.from("family_members").insert(
        members.map((m) => ({
          profile_id: user.id,
          name: m.name,
          age: m.age,
          member_type: m.type,
        }))
      );
    }

    await supabase.from("onboarding_preferences").upsert({
      profile_id: user.id,
      weekly_grocery_budget: budget,
      dietary_preferences: dietaryPrefs,
      food_loves: foodLoves,
      food_dislikes: foodDislikes,
    });

    try {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyName,
          householdType,
          members,
          budget,
          dietaryPrefs,
          foodLoves,
          foodDislikes,
          nutritionGoals: nutritionData.goals,
          calorieTarget: nutritionData.calorieTarget,
          proteinPriority: nutritionData.proteinPriority,
          healthyFats: nutritionData.healthyFats,
          lowSugar: nutritionData.lowSugar,
          selectedStores,
          separateKidGroceries: hasKids && hasDiet ? separateKidGroceries : false,
          hasKids,
        }),
      });

      if (response.ok) {
        const { mealOptions } = await response.json();
        sessionStorage.setItem("mealOptions", JSON.stringify(mealOptions));
      }
    } catch (err) {
      console.error("Failed to generate meal options:", err);
    }

    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id);

    router.push("/meals");
  }

  if (generatingMeals) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="text-center">
          <h1 className="font-serif italic text-3xl text-primary mb-3">
            Kin is curating your meal options...
          </h1>
          <p className="text-warm-white/50 text-sm mb-8">
            Picking the best options for the {familyName || "family"} to choose from
          </p>
          <div className="flex justify-center mb-6">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"
                  style={{ animationDelay: `${i * 0.3}s` }}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2 text-sm text-warm-white/40">
            <p>Matching meals to your nutrition goals...</p>
            <p>Building options your family will love...</p>
            {hasKids && <p>Adding kid-friendly picks...</p>}
            <p>You&apos;ll pick your favorites next</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <h1 className="font-serif italic text-3xl text-primary mb-2">
        Let&apos;s get to know your family
      </h1>
      <p className="text-warm-white/50 text-sm mb-8">
        {step} of {TOTAL_STEPS} — takes about 3 minutes
      </p>

      <div className="w-full max-w-lg bg-surface rounded-xl p-6 border border-warm-white/10">
        <div className="w-full bg-background rounded-full h-1.5 mb-8">
          <div
            className="bg-primary h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        {step === 1 && (
          <StepFamilyName
            familyName={familyName}
            householdType={householdType}
            onUpdate={({ familyName: fn, householdType: ht }) => {
              if (fn !== undefined) setFamilyName(fn);
              if (ht !== undefined) setHouseholdType(ht);
            }}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <StepFamilyMembers
            members={members}
            onUpdate={setMembers}
            onNext={() => setStep(showPartnerStep ? 3 : 4)}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <StepPartnerInvite
            partnerEmail={partnerEmail}
            onUpdate={setPartnerEmail}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && (
          <StepBudget
            budget={budget}
            onUpdate={setBudget}
            onNext={() => setStep(5)}
            onBack={() => setStep(showPartnerStep ? 3 : 2)}
          />
        )}

        {step === 5 && (
          <StepDietary
            selected={dietaryPrefs}
            onUpdate={setDietaryPrefs}
            onNext={() => setStep(6)}
            onBack={() => setStep(4)}
          />
        )}

        {step === 6 && (
          <StepNutritionGoals
            data={nutritionData}
            onUpdate={(updates) => setNutritionData((prev) => ({ ...prev, ...updates }))}
            onNext={() => setStep(7)}
            onBack={() => setStep(5)}
          />
        )}

        {step === 7 && (
          <StepFoodPrefs
            loves={foodLoves}
            dislikes={foodDislikes}
            onUpdate={({ loves, dislikes }) => {
              if (loves !== undefined) setFoodLoves(loves);
              if (dislikes !== undefined) setFoodDislikes(dislikes);
            }}
            onSubmit={() => setStep(8)}
            onBack={() => setStep(6)}
            loading={false}
          />
        )}

        {step === 8 && (
          <StepStorePrefs
            selectedStores={selectedStores}
            separateKidGroceries={separateKidGroceries}
            hasKids={hasKids}
            hasDiet={hasDiet}
            onUpdateStores={setSelectedStores}
            onUpdateSeparateKids={setSeparateKidGroceries}
            onNext={handleSubmit}
            onBack={() => setStep(7)}
          />
        )}
      </div>
    </main>
  );
}
