"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import Confetti from "@/components/ui/Confetti";
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
  const [, setLoading] = useState(false);
  const [generatingMeals, setGeneratingMeals] = useState(false);
  const [mealGenFailed, setMealGenFailed] = useState(false);

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
      } else {
        // HTTP error (401, 500, etc.) — surface the amber banner to the user
        setMealGenFailed(true);
      }
    } catch {
      // Network exception — surface the amber banner to the user
      setMealGenFailed(true);
    }

    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id);

    router.push("/dashboard");
  }

  if (generatingMeals) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
        <Confetti trigger={generatingMeals} />

        {/* Ambient glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-primary/8 blur-[150px] pointer-events-none pulse-soft" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center relative z-10"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, type: "spring", bounce: 0.5 }}
            className="w-20 h-20 rounded-3xl bg-primary/20 flex items-center justify-center mx-auto mb-6"
          >
            <span className="text-4xl">🍽️</span>
          </motion.div>

          <h1 className="text-3xl font-medium text-primary mb-3" style={{ letterSpacing: "-0.025em" }}>
            Kin is curating your meal options...
          </h1>
          <p className="text-warm-white/50 text-sm mb-8">
            Picking the best options for the {familyName || "family"} to choose from
          </p>
          <div className="flex justify-center mb-6">
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  className="w-3 h-3 rounded-full bg-primary"
                />
              ))}
            </div>
          </div>
          {mealGenFailed ? (
            <div className="mt-2 px-5 py-3 rounded-2xl bg-amber/10 border border-amber/20 text-amber text-sm text-center">
              We had trouble generating your meal plan — no worries. You can get it from the{" "}
              <span className="font-semibold">Meals</span> tab anytime after setup.
            </div>
          ) : (
            <div className="space-y-3 text-sm text-warm-white/40">
              {[
                "Matching meals to your nutrition goals...",
                "Building options your family will love...",
                ...(hasKids ? ["Adding kid-friendly picks..."] : []),
                "You'll pick your favorites next",
              ].map((text, i) => (
                <motion.p
                  key={text}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + i * 0.6 }}
                >
                  {text}
                </motion.p>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <h1 className="text-3xl font-medium text-primary mb-2" style={{ letterSpacing: "-0.025em" }}>
        Let&apos;s get to know your family
      </h1>
      <p className="text-warm-white/50 text-sm mb-8">
        {/* Single-parent families skip step 3 — show a sequential counter so they
            don't see "4 of 8" as their third question. */}
        {!showPartnerStep && step > 3 ? step - 1 : step} of {showPartnerStep ? TOTAL_STEPS : TOTAL_STEPS - 1} — takes about 3 minutes
      </p>

      <div className="w-full max-w-lg bg-surface rounded-xl p-6 border border-warm-white/10">
        <div className="w-full bg-background rounded-full h-1.5 mb-8">
          <div
            className="bg-primary h-1.5 rounded-full transition-all duration-500"
            style={{
              width: `${((!showPartnerStep && step > 3 ? step - 1 : step) / (showPartnerStep ? TOTAL_STEPS : TOTAL_STEPS - 1)) * 100}%`,
            }}
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
