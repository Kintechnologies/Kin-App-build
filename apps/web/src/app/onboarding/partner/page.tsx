"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ── Dietary options (mirrored from StepDietary.tsx) ───────────────────────────

const DIETARY_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Gluten-free",
  "Dairy-free",
  "Low-carb",
  "Keto",
  "Nut allergy",
  "Shellfish allergy",
  "Halal",
  "Kosher",
  "Pescatarian",
  "No restrictions",
];

// ── Slide animation variants ──────────────────────────────────────────────────

const slideVariants = {
  enter: { opacity: 0, y: 14 },
  center: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" as const } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: "easeIn" as const } },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PartnerOnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [familyName, setFamilyName] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [dietary, setDietary] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Load the household's family name for the welcome headline ──────────────
  useEffect(() => {
    async function loadFamilyName() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Partner's household_id points to the inviter's profile_id
        const { data: profile } = await supabase
          .from("profiles")
          .select("household_id")
          .eq("id", user.id)
          .single();

        if (!profile?.household_id) return;

        const { data: householdProfile } = await supabase
          .from("profiles")
          .select("family_name")
          .eq("id", profile.household_id)
          .single();

        if (householdProfile?.family_name) {
          setFamilyName(householdProfile.family_name);
        }
      } catch {
        // Non-fatal — headline still renders without a family name
      }
    }
    loadFamilyName();
  }, []);

  // ── Step 1 — save name → family_members ───────────────────────────────────
  async function handleNameSubmit() {
    if (!name.trim()) return;
    setLoading(true);
    setSaveError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { error } = await supabase.from("family_members").upsert(
        { profile_id: user.id, name: name.trim(), member_type: "adult" },
        { onConflict: "profile_id,member_type" }
      );

      if (error) throw error;
    } catch {
      // Non-blocking — note the error but still advance to step 2
      setSaveError("Couldn't save your name — you can update this in Settings.");
    } finally {
      setLoading(false);
      setStep(2);
    }
  }

  // ── Step 2 — save dietary prefs → profiles.onboarding_preferences ─────────
  async function handleDietarySubmit() {
    setLoading(true);
    setSaveError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      // Merge dietary_restrictions into existing onboarding_preferences JSONB
      const { data: current } = await supabase
        .from("profiles")
        .select("onboarding_preferences")
        .eq("id", user.id)
        .single();

      const existingPrefs =
        (current?.onboarding_preferences as Record<string, unknown>) ?? {};
      const updatedPrefs = { ...existingPrefs, dietary_restrictions: dietary };

      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_preferences: updatedPrefs })
        .eq("id", user.id);

      if (error) throw error;
    } catch {
      // Non-blocking — note the error but still redirect
      setSaveError("Couldn't save — you can update this in Settings.");
    } finally {
      setLoading(false);
      router.push("/dashboard");
    }
  }

  // ── Dietary pill toggle ────────────────────────────────────────────────────
  function toggleDietary(pref: string) {
    if (pref === "No restrictions") {
      setDietary(dietary.includes(pref) ? [] : ["No restrictions"]);
      return;
    }
    const withoutNone = dietary.filter((s) => s !== "No restrictions");
    if (withoutNone.includes(pref)) {
      setDietary(withoutNone.filter((s) => s !== pref));
    } else {
      setDietary([...withoutNone, pref]);
    }
  }

  const headlineFamilyName = familyName ? `the ${familyName} family` : "your household";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <span className="font-serif italic text-4xl text-primary mb-10">Kin</span>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="w-full max-w-sm"
        >
          {/* Progress indicator */}
          <p className="text-warm-white/30 text-sm text-right mb-4">{step} of 2</p>

          {/* Card */}
          <div className="bg-surface rounded-3xl p-7 border border-warm-white/8">
            {step === 1 ? (
              // ── Step 1: Name ────────────────────────────────────────────────
              <div className="space-y-6">
                <div>
                  <h1 className="font-serif italic text-3xl text-warm-white leading-tight mb-2">
                    Welcome to {headlineFamilyName}.
                  </h1>
                  <p className="text-warm-white/50 text-sm">
                    What should Kin call you?
                  </p>
                </div>

                <input
                  type="text"
                  placeholder="First name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && name.trim() && !loading) {
                      handleNameSubmit();
                    }
                  }}
                  className="w-full px-4 py-3.5 rounded-2xl bg-background border border-warm-white/10 text-warm-white placeholder-warm-white/25 focus:outline-none focus:border-primary/50 transition-colors text-base"
                  autoFocus
                />

                {saveError && (
                  <p className="text-amber/80 text-xs">{saveError}</p>
                )}

                <button
                  onClick={handleNameSubmit}
                  disabled={!name.trim() || loading}
                  className="w-full py-3.5 rounded-2xl bg-primary text-background font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none"
                >
                  {loading ? "Saving…" : (<>Continue <ArrowRight size={16} /></>)}
                </button>
              </div>
            ) : (
              // ── Step 2: Dietary prefs ───────────────────────────────────────
              <div className="space-y-6">
                <div>
                  <h1 className="font-serif italic text-3xl text-warm-white leading-tight mb-2">
                    Any dietary needs?
                  </h1>
                  <p className="text-warm-white/50 text-sm">
                    Your household already has a meal plan set up. Any
                    restrictions we should know about for you?
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {DIETARY_OPTIONS.map((pref) => (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => toggleDietary(pref)}
                      className={`px-3 py-2 rounded-full text-sm font-medium transition-colors border ${
                        dietary.includes(pref)
                          ? "bg-primary/20 border-primary text-primary"
                          : "bg-background border-warm-white/20 text-warm-white/60 hover:border-warm-white/40"
                      }`}
                    >
                      {pref}
                    </button>
                  ))}
                </div>

                {saveError && (
                  <p className="text-amber/80 text-xs">{saveError}</p>
                )}

                <button
                  onClick={handleDietarySubmit}
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl bg-primary text-background font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none"
                >
                  {loading ? "Setting up…" : (<>Start with Kin <ArrowRight size={16} /></>)}
                </button>

                <p className="text-center">
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="text-warm-white/30 text-sm hover:text-warm-white/50 transition-colors"
                  >
                    Skip dietary preferences
                  </button>
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
