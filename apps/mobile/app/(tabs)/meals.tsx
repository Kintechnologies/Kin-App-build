import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Animated,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  UtensilsCrossed,
  ChevronRight,
  Check,
  RefreshCw,
  X,
  ShoppingCart,
  Clock,
  Star,
  Sparkles,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { api } from "../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MealOption {
  id: string;
  name: string;
  prep_time_minutes: number;
  meal_type: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  kid_friendly: boolean;
  description: string;
}

interface GroceryItem {
  name: string;
  quantity: string;
  estimated_cost: number;
  recommended_store: string;
  savings_tip?: string;
}

interface MealOptions {
  breakfast_options: MealOption[];
  lunch_options: MealOption[];
  dinner_options: MealOption[];
  snack_options: MealOption[];
  grocery_items: GroceryItem[];
  kid_grocery_items: GroceryItem[];
  nutrition_summary?: {
    avg_daily_calories: number;
    protein_focus: boolean;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

type SetupStep = "welcome" | "dietary" | "nutrition" | "preferences" | "stores" | "generating" | "done";

const GEN_MESSAGES = [
  "Thinking about your family...",
  "Picking the best options...",
  "Checking nutrition goals...",
  "Building your grocery list...",
  "Almost ready...",
];

const CATEGORY_META = {
  breakfast: { label: "Breakfast", emoji: "🌅", color: "#D4A843", bg: "rgba(212, 168, 67, 0.12)" },
  lunch:     { label: "Lunch",     emoji: "🥗", color: "#7AADCE", bg: "rgba(122, 173, 206, 0.12)" },
  dinner:    { label: "Dinner",    emoji: "🍽️",  color: "#7CB87A", bg: "rgba(124, 184, 122, 0.12)" },
  snack:     { label: "Snacks",    emoji: "☁️",  color: "#D4748A", bg: "rgba(212, 116, 138, 0.12)" },
} as const;

const DIETARY_OPTIONS = [
  "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free",
  "Low-Carb", "Keto", "Paleo", "Nut Allergy", "Halal", "Kosher",
];

const NUTRITION_GOALS = [
  { label: "Lose weight",   icon: "scale"   },
  { label: "Gain muscle",   icon: "muscle"  },
  { label: "Maintain",      icon: "balance" },
  { label: "Heart healthy", icon: "heart"   },
  { label: "High protein",  icon: "protein" },
  { label: "Low sugar",     icon: "sugar"   },
];

const STORES = [
  "Costco", "Walmart", "Trader Joe's", "Whole Foods",
  "Kroger", "Aldi", "Target", "Sam's Club", "Publix", "H-E-B",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Meals() {
  const [setupStep, setSetupStep] = useState<SetupStep>("welcome");
  const [hasPrefs, setHasPrefs] = useState(false);
  const [loading, setLoading] = useState(true);

  // Setup data (populated from DB on load or from user input during setup)
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [nutritionGoal, setNutritionGoal] = useState("");
  const [trackCalories, setTrackCalories] = useState(false);
  const [dailyCalories, setDailyCalories] = useState("");
  const [separateKidsMeals, setSeparateKidsMeals] = useState(false);
  const [foodLoves, setFoodLoves] = useState("");
  const [foodDislikes, setFoodDislikes] = useState("");
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [weeklyBudget, setWeeklyBudget] = useState(200);

  // Meal plan state
  const [mealPlan, setMealPlan] = useState<MealOptions | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [generationError, setGenerationError] = useState(false);
  const [showGrocery, setShowGrocery] = useState(false);

  // Generating animation
  const [genMsgIdx, setGenMsgIdx] = useState(0);
  const genMsgTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fade animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkPreferences();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Cycle generating messages while API call is in-flight
  useEffect(() => {
    if (setupStep === "generating") {
      setGenMsgIdx(0);
      genMsgTimer.current = setInterval(() => {
        setGenMsgIdx((prev) => (prev + 1) % GEN_MESSAGES.length);
      }, 2200);
    } else {
      if (genMsgTimer.current) {
        clearInterval(genMsgTimer.current);
        genMsgTimer.current = null;
      }
    }
    return () => {
      if (genMsgTimer.current) clearInterval(genMsgTimer.current);
    };
  }, [setupStep]);

  async function checkPreferences() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: prefs } = await supabase
      .from("onboarding_preferences")
      .select("*")
      .eq("profile_id", user.id)
      .single();

    if (prefs?.dietary_preferences?.length > 0) {
      setHasPrefs(true);

      // Populate local state from DB so the goals card is always accurate
      setSelectedDietary(prefs.dietary_preferences ?? []);
      setNutritionGoal(prefs.nutrition_goal ?? "");
      setTrackCalories(prefs.track_calories ?? false);
      setDailyCalories(prefs.daily_calorie_target?.toString() ?? "");
      setSeparateKidsMeals(prefs.separate_kids_meals ?? false);
      setFoodLoves(Array.isArray(prefs.food_loves) ? prefs.food_loves.join(", ") : "");
      setFoodDislikes(Array.isArray(prefs.food_dislikes) ? prefs.food_dislikes.join(", ") : "");
      setSelectedStores(prefs.preferred_stores ?? []);
      if (prefs.weekly_grocery_budget) setWeeklyBudget(prefs.weekly_grocery_budget);

      setSetupStep("done");

      // Load persisted meal plan
      setPlanLoading(true);
      const { data: plan } = await supabase
        .from("meal_plans")
        .select("meal_options")
        .eq("profile_id", user.id)
        .order("generated_at", { ascending: false })
        .limit(1)
        .single();

      if (plan?.meal_options) {
        setMealPlan(plan.meal_options as MealOptions);
      }
      setPlanLoading(false);
    }

    setLoading(false);
  }

  function toggleDietary(item: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDietary((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  }

  function toggleStore(store: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedStores((prev) =>
      prev.includes(store) ? prev.filter((s) => s !== store) : [...prev, store]
    );
  }

  /** Build API request body from current state + DB context, then call /api/meals */
  async function callMealsApi(userId: string): Promise<MealOptions> {
    const [{ data: profile }, { data: members }] = await Promise.all([
      supabase.from("profiles").select("family_name").eq("id", userId).single(),
      supabase.from("family_members").select("name, age, member_type").eq("profile_id", userId),
    ]);

    const result = await api.generateMealPlan({
      familyName: profile?.family_name ?? "Your family",
      members: (members ?? []).map((m: { name: string; age?: number; member_type: string }) => ({
        name: m.name,
        age: m.age,
        type: m.member_type === "adult" ? "adult" : "child",
      })),
      budget: weeklyBudget,
      dietaryPrefs: selectedDietary,
      foodLoves: foodLoves.split(",").map((f) => f.trim()).filter(Boolean),
      foodDislikes: foodDislikes.split(",").map((f) => f.trim()).filter(Boolean),
      nutritionGoals: nutritionGoal ? [nutritionGoal] : [],
      calorieTarget: dailyCalories ? parseInt(dailyCalories, 10) : undefined,
      separateKidGroceries: separateKidsMeals,
      hasKids: (members ?? []).some((m: { member_type: string }) => m.member_type === "child"),
      selectedStores: selectedStores.map((s) =>
        s.toLowerCase().replace(/[\s']/g, "-")
      ),
    }) as { mealOptions: MealOptions };

    return result.mealOptions;
  }

  /** Called from the Stores setup step — saves prefs then generates */
  async function saveAndGenerate() {
    setSetupStep("generating");
    setGenerationError(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSetupStep("done"); return; }

    // Persist preferences
    await supabase.from("onboarding_preferences").upsert({
      profile_id: user.id,
      dietary_preferences: selectedDietary,
      nutrition_goal: nutritionGoal,
      track_calories: trackCalories,
      daily_calorie_target: dailyCalories ? parseInt(dailyCalories, 10) : null,
      separate_kids_meals: separateKidsMeals,
      food_loves: foodLoves.split(",").map((f) => f.trim()).filter(Boolean),
      food_dislikes: foodDislikes.split(",").map((f) => f.trim()).filter(Boolean),
      preferred_stores: selectedStores,
    });

    try {
      const options = await callMealsApi(user.id);

      await supabase.from("meal_plans").insert({
        profile_id: user.id,
        meal_options: options,
        week_start: new Date().toISOString().split("T")[0],
      });

      setMealPlan(options);
      setHasPrefs(true);
    } catch {
      setGenerationError(true);
    } finally {
      setSetupStep("done");
    }
  }

  /** Re-generate plan from the "done" state (existing user taps refresh) */
  async function regenerate() {
    setGenerationError(false);
    setSetupStep("generating");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSetupStep("done"); return; }

    try {
      const options = await callMealsApi(user.id);

      await supabase.from("meal_plans").insert({
        profile_id: user.id,
        meal_options: options,
        week_start: new Date().toISOString().split("T")[0],
      });

      setMealPlan(options);
    } catch {
      setGenerationError(true);
    } finally {
      setSetupStep("done");
    }
  }

  function getStepNumber() {
    const steps: SetupStep[] = ["welcome", "dietary", "nutrition", "preferences", "stores"];
    return steps.indexOf(setupStep);
  }

  // ── Grocery list helpers ────────────────────────────────────────────────────

  function getGroceryTotal(): number {
    return (
      (mealPlan?.grocery_items ?? []).reduce((sum, i) => sum + i.estimated_cost, 0) +
      (mealPlan?.kid_grocery_items ?? []).reduce((sum, i) => sum + i.estimated_cost, 0)
    );
  }

  function getGroceryByStore(): Record<string, GroceryItem[]> {
    const all = [
      ...(mealPlan?.grocery_items ?? []),
      ...(mealPlan?.kid_grocery_items ?? []),
    ];
    return all.reduce<Record<string, GroceryItem[]>>((acc, item) => {
      const store = item.recommended_store || "Other";
      if (!acc[store]) acc[store] = [];
      acc[store].push(item);
      return acc;
    }, {});
  }

  // ── Renders ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#7CB87A" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // ── Generating screen ──────────────────────────────────────────────────────
  if (setupStep === "generating") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.generatingContainer}>
          <Animated.View style={[styles.generatingIcon, { opacity: fadeAnim }]}>
            <Sparkles size={32} color="#7CB87A" />
          </Animated.View>
          <Text style={styles.generatingTitle}>Building your meal plan</Text>
          <Text style={styles.generatingMessage}>{GEN_MESSAGES[genMsgIdx]}</Text>
          <ActivityIndicator color="#7CB87A" style={{ marginTop: 28 }} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Done state — meal plan view ────────────────────────────────────────────
  if (setupStep === "done") {
    const groceryTotal = getGroceryTotal();
    const groceryCount = (mealPlan?.grocery_items?.length ?? 0) + (mealPlan?.kid_grocery_items?.length ?? 0);
    const groceryByStore = getGroceryByStore();

    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.mealPlanHeader}>
            <Text style={styles.pageTitle}>Nutrition & Meals</Text>
            {mealPlan && (
              <Pressable
                onPress={regenerate}
                style={({ pressed }) => [styles.regenerateBtn, pressed && { opacity: 0.7 }]}
              >
                <RefreshCw size={14} color="#7CB87A" />
                <Text style={styles.regenerateBtnText}>New plan</Text>
              </Pressable>
            )}
          </View>

          {/* Goals summary card */}
          <View style={styles.goalsSummaryCard}>
            <View style={styles.goalsSummaryHeader}>
              <View style={styles.setupIconWrap}>
                <UtensilsCrossed size={22} color="#D4A843" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.goalsSummaryTitle}>Your Goals</Text>
                <Text style={styles.goalsSummarySubtitle}>
                  {nutritionGoal || "No specific goal set"}
                  {trackCalories && dailyCalories ? ` · ${dailyCalories} kcal/day` : ""}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSetupStep("dietary");
                  setHasPrefs(false);
                }}
                style={styles.editButton}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </Pressable>
            </View>

            {selectedDietary.length > 0 && (
              <View style={styles.tagRow}>
                {selectedDietary.map((d) => (
                  <View key={d} style={styles.tag}>
                    <Text style={styles.tagText}>{d}</Text>
                  </View>
                ))}
              </View>
            )}

            {separateKidsMeals && (
              <View style={styles.kidsNote}>
                <Text style={styles.kidsNoteText}>Kids get separate meal options</Text>
              </View>
            )}
          </View>

          {/* Plan loading */}
          {planLoading && (
            <View style={styles.planLoadingContainer}>
              <ActivityIndicator color="#7CB87A" />
              <Text style={styles.planLoadingText}>Loading your meal plan...</Text>
            </View>
          )}

          {/* Error state */}
          {!planLoading && generationError && (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>⚠️ Couldn't generate your plan</Text>
              <Text style={styles.errorSubtitle}>
                Check your connection and try again.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.8 }]}
                onPress={regenerate}
              >
                <RefreshCw size={14} color="#0C0F0A" />
                <Text style={styles.retryBtnText}>Try again</Text>
              </Pressable>
            </View>
          )}

          {/* No plan yet — generate CTA */}
          {!planLoading && !generationError && !mealPlan && (
            <View style={styles.noPlanCard}>
              <View style={styles.noPlanIcon}>
                <Sparkles size={28} color="#7CB87A" />
              </View>
              <Text style={styles.noPlanTitle}>Your meal plan is waiting</Text>
              <Text style={styles.noPlanSubtitle}>
                Kin will build a week of personalized meals and a grocery list for your family.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.generateCTA, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
                onPress={regenerate}
              >
                <Sparkles size={16} color="#0C0F0A" />
                <Text style={styles.generateCTAText}>Generate this week's plan</Text>
              </Pressable>
              <Text style={styles.noPlanHint}>Takes about 10 seconds</Text>
            </View>
          )}

          {/* Meal plan — category cards */}
          {!planLoading && !generationError && mealPlan && (
            <>
              {(
                [
                  { key: "breakfast", options: mealPlan.breakfast_options },
                  { key: "lunch",     options: mealPlan.lunch_options     },
                  { key: "dinner",    options: mealPlan.dinner_options    },
                  { key: "snack",     options: mealPlan.snack_options     },
                ] as const
              ).map(({ key, options }) => {
                if (!options?.length) return null;
                const meta = CATEGORY_META[key];
                const primary = options[0];
                const extraCount = options.length - 1;

                return (
                  <View key={key} style={styles.categorySection}>
                    {/* Category header */}
                    <View style={styles.categoryHeader}>
                      <View style={[styles.categoryDot, { backgroundColor: meta.color }]} />
                      <Text style={[styles.categoryLabel, { color: meta.color }]}>
                        {meta.emoji} {meta.label.toUpperCase()}
                      </Text>
                    </View>

                    {/* Primary meal card */}
                    <View style={[styles.mealCard, { borderLeftColor: meta.color }]}>
                      <Text style={styles.mealCardName}>{primary.name}</Text>
                      <View style={styles.mealCardMeta}>
                        <Text style={styles.mealCardStat}>
                          <Text style={styles.mealCardStatNum}>{primary.prep_time_minutes}</Text>m
                        </Text>
                        <Text style={styles.mealCardStatDot}>·</Text>
                        <Text style={styles.mealCardStat}>
                          <Text style={styles.mealCardStatNum}>{primary.calories}</Text> kcal
                        </Text>
                        <Text style={styles.mealCardStatDot}>·</Text>
                        <Text style={styles.mealCardStat}>
                          <Text style={styles.mealCardStatNum}>{primary.protein}g</Text> protein
                        </Text>
                      </View>
                      {primary.description ? (
                        <Text style={styles.mealCardDesc} numberOfLines={2}>
                          {primary.description}
                        </Text>
                      ) : null}
                      {extraCount > 0 && (
                        <View style={[styles.extraBadge, { backgroundColor: meta.bg }]}>
                          <Text style={[styles.extraBadgeText, { color: meta.color }]}>
                            +{extraCount} more option{extraCount > 1 ? "s" : ""}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}

              {/* Grocery list CTA */}
              <Pressable
                style={({ pressed }) => [
                  styles.groceryCTA,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowGrocery(true);
                }}
              >
                <View style={[styles.actionCardIcon, { backgroundColor: "rgba(212, 168, 67, 0.12)" }]}>
                  <ShoppingCart size={20} color="#D4A843" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionCardTitle}>View Grocery List</Text>
                  <Text style={styles.actionCardSubtitle}>
                    {groceryCount > 0
                      ? `$${groceryTotal.toFixed(0)} est. · ${groceryCount} items`
                      : "Auto-generated from your meal plan"}
                  </Text>
                </View>
                <ChevronRight size={16} color="rgba(240, 237, 230, 0.15)" />
              </Pressable>
            </>
          )}
        </ScrollView>

        {/* ── Grocery List Modal ───────────────────────────────────────────── */}
        <Modal
          visible={showGrocery}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowGrocery(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Grocery List</Text>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowGrocery(false);
                }}
                style={styles.modalClose}
              >
                <X size={20} color="rgba(240, 237, 230, 0.5)" />
              </Pressable>
            </View>

            {groceryCount === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>No grocery items yet.</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalContent}
                showsVerticalScrollIndicator={false}
              >
                {Object.entries(groceryByStore).map(([store, items]) => (
                  <View key={store} style={styles.storeSection}>
                    <Text style={styles.storeLabel}>{store.toUpperCase()}</Text>
                    {items.map((item, idx) => (
                      <View key={`${item.name}-${idx}`} style={styles.groceryItem}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.groceryItemName}>{item.name}</Text>
                          <Text style={styles.groceryItemQty}>{item.quantity}</Text>
                        </View>
                        <Text style={styles.groceryItemCost}>
                          ${item.estimated_cost.toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}

                {/* Kids items section */}
                {(mealPlan?.kid_grocery_items?.length ?? 0) > 0 && (
                  <View style={styles.kidsGroceryNote}>
                    <Text style={styles.kidsGroceryNoteText}>
                      🧒 Kids' items included above
                    </Text>
                  </View>
                )}

                {/* Total */}
                <View style={styles.groceryTotal}>
                  <Text style={styles.groceryTotalLabel}>Estimated total</Text>
                  <Text style={styles.groceryTotalAmount}>${groceryTotal.toFixed(2)}</Text>
                </View>
              </ScrollView>
            )}
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ── Welcome / value prop screen ────────────────────────────────────────────
  if (setupStep === "welcome") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.content, { justifyContent: "center", flexGrow: 1 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: "center" }}>
            <View style={styles.setupIconWrap}>
              <UtensilsCrossed size={28} color="#D4A843" />
            </View>
            <Text style={styles.pageTitle}>Meal Planning</Text>
            <Text style={[styles.pageSubtitle, { textAlign: "center", marginBottom: 28 }]}>
              Kin builds personalized meal plans, generates grocery lists by store, and learns what your family loves over time.
            </Text>

            {[
              { emoji: "🍽️", text: "Breakfast, lunch, and dinner options tailored to you" },
              { emoji: "🛒", text: "Grocery lists sorted by your favorite stores" },
              { emoji: "💪", text: "Nutrition goals — calories, macros, and kids' needs" },
              { emoji: "⭐", text: "Rate meals so Kin gets smarter every week" },
              { emoji: "💰", text: "Stay within your grocery budget automatically" },
            ].map((prop) => (
              <View key={prop.text} style={styles.valuePropRow}>
                <Text style={{ fontSize: 20 }}>{prop.emoji}</Text>
                <Text style={styles.valuePropText}>{prop.text}</Text>
              </View>
            ))}

            <Pressable
              style={({ pressed }) => [
                styles.nextButton,
                { marginTop: 28, width: "100%" },
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setSetupStep("dietary");
              }}
            >
              <Sparkles size={16} color="#0C0F0A" />
              <Text style={styles.nextButtonText}>Set Up My Meal Plan</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Inline setup flow ──────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress */}
        <View style={styles.progressBar}>
          {[1, 2, 3, 4].map((step) => (
            <View
              key={step}
              style={[
                styles.progressDot,
                step <= getStepNumber() && styles.progressDotActive,
                step === getStepNumber() && styles.progressDotCurrent,
              ]}
            />
          ))}
        </View>

        <View style={styles.setupHeader}>
          <View style={styles.setupIconWrap}>
            <UtensilsCrossed size={24} color="#D4A843" />
          </View>
          <Text style={styles.pageTitle}>Meal Planning</Text>
          <Text style={styles.setupSubtitle}>
            {setupStep === "dietary"     && "What dietary needs should Kin know about?"}
            {setupStep === "nutrition"   && "What are your nutrition goals?"}
            {setupStep === "preferences" && "What does your family love (and hate)?"}
            {setupStep === "stores"      && "Where do you like to shop?"}
          </Text>
        </View>

        {/* Step 1: Dietary */}
        {setupStep === "dietary" && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.chipGrid}>
              {DIETARY_OPTIONS.map((item) => {
                const selected = selectedDietary.includes(item);
                return (
                  <Pressable
                    key={item}
                    onPress={() => toggleDietary(item)}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    {selected && <Check size={14} color="#0C0F0A" />}
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.chipHint}>Select all that apply, or skip if none</Text>
            <Pressable
              style={styles.nextButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSetupStep("nutrition");
              }}
            >
              <Text style={styles.nextButtonText}>
                {selectedDietary.length > 0 ? "Continue" : "Skip"}
              </Text>
              <ChevronRight size={16} color="#0C0F0A" />
            </Pressable>
          </Animated.View>
        )}

        {/* Step 2: Nutrition Goals */}
        {setupStep === "nutrition" && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.goalGrid}>
              {NUTRITION_GOALS.map((goal) => {
                const selected = nutritionGoal === goal.label;
                return (
                  <Pressable
                    key={goal.label}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setNutritionGoal(goal.label);
                    }}
                    style={[styles.goalCard, selected && styles.goalCardSelected]}
                  >
                    <Text style={[styles.goalLabel, selected && styles.goalLabelSelected]}>
                      {goal.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Calories toggle */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Track calories?</Text>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTrackCalories(!trackCalories);
                }}
                style={[styles.toggle, trackCalories && styles.toggleActive]}
              >
                <View style={[styles.toggleThumb, trackCalories && styles.toggleThumbActive]} />
              </Pressable>
            </View>

            {trackCalories && (
              <View style={styles.calorieInput}>
                <Text style={styles.inputLabel}>Daily target (kcal)</Text>
                <TextInput
                  style={styles.textInput}
                  value={dailyCalories}
                  onChangeText={setDailyCalories}
                  placeholder="2000"
                  placeholderTextColor="rgba(240, 237, 230, 0.2)"
                  keyboardType="numeric"
                />
              </View>
            )}

            {/* Separate kids meals */}
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Separate kids' meals?</Text>
                <Text style={styles.toggleHint}>Kids get different options from your diet plan</Text>
              </View>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSeparateKidsMeals(!separateKidsMeals);
                }}
                style={[styles.toggle, separateKidsMeals && styles.toggleActive]}
              >
                <View style={[styles.toggleThumb, separateKidsMeals && styles.toggleThumbActive]} />
              </Pressable>
            </View>

            <Pressable
              style={styles.nextButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSetupStep("preferences");
              }}
            >
              <Text style={styles.nextButtonText}>Continue</Text>
              <ChevronRight size={16} color="#0C0F0A" />
            </Pressable>
          </Animated.View>
        )}

        {/* Step 3: Food Preferences */}
        {setupStep === "preferences" && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Foods your family loves</Text>
              <TextInput
                style={styles.textInput}
                value={foodLoves}
                onChangeText={setFoodLoves}
                placeholder="e.g., tacos, pasta, grilled chicken"
                placeholderTextColor="rgba(240, 237, 230, 0.2)"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Foods to avoid</Text>
              <TextInput
                style={styles.textInput}
                value={foodDislikes}
                onChangeText={setFoodDislikes}
                placeholder="e.g., mushrooms, olives"
                placeholderTextColor="rgba(240, 237, 230, 0.2)"
              />
            </View>

            <Pressable
              style={styles.nextButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSetupStep("stores");
              }}
            >
              <Text style={styles.nextButtonText}>Continue</Text>
              <ChevronRight size={16} color="#0C0F0A" />
            </Pressable>
          </Animated.View>
        )}

        {/* Step 4: Stores */}
        {setupStep === "stores" && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.chipGrid}>
              {STORES.map((store) => {
                const selected = selectedStores.includes(store);
                return (
                  <Pressable
                    key={store}
                    onPress={() => toggleStore(store)}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    {selected && <Check size={14} color="#0C0F0A" />}
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {store}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.chipHint}>
              We'll organize your grocery list by store and flag membership-only items
            </Text>

            <Pressable
              style={[styles.nextButton, styles.generateButton]}
              onPress={saveAndGenerate}
            >
              <Sparkles size={16} color="#0C0F0A" />
              <Text style={styles.nextButtonText}>Generate My Meal Plan</Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0C0F0A" },
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 120 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Progress
  progressBar: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    marginBottom: 24,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(240, 237, 230, 0.08)",
  },
  progressDotActive: {
    backgroundColor: "rgba(212, 168, 67, 0.3)",
  },
  progressDotCurrent: {
    backgroundColor: "#D4A843",
    width: 24,
    shadowColor: "#D4A843",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },

  // Setup header
  setupHeader: { alignItems: "center", marginBottom: 28 },
  setupIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: "rgba(212, 168, 67, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  pageTitle: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 28,
    color: "#F0EDE6",
    marginBottom: 8,
  },
  pageSubtitle: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.35)",
  },
  setupSubtitle: {
    fontFamily: "Geist",
    fontSize: 15,
    color: "rgba(240, 237, 230, 0.4)",
    textAlign: "center",
    lineHeight: 22,
  },

  // Chips
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#141810",
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.06)",
  },
  chipSelected: {
    backgroundColor: "#D4A843",
    borderColor: "#D4A843",
  },
  chipText: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.5)",
  },
  chipTextSelected: {
    color: "#0C0F0A",
    fontFamily: "Geist-SemiBold",
  },
  chipHint: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.2)",
    textAlign: "center",
    marginBottom: 24,
  },

  // Goals grid
  goalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  goalCard: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#141810",
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.06)",
  },
  goalCardSelected: {
    backgroundColor: "rgba(212, 168, 67, 0.15)",
    borderColor: "#D4A843",
  },
  goalLabel: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.5)",
  },
  goalLabelSelected: {
    color: "#D4A843",
    fontFamily: "Geist-SemiBold",
  },

  // Toggle
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#141810",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.04)",
  },
  toggleLabel: {
    fontFamily: "Geist-SemiBold",
    fontSize: 14,
    color: "#F0EDE6",
  },
  toggleHint: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.25)",
    marginTop: 2,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(240, 237, 230, 0.08)",
    padding: 2,
    justifyContent: "center",
  },
  toggleActive: {
    backgroundColor: "#7CB87A",
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(240, 237, 230, 0.5)",
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
    backgroundColor: "#fff",
  },

  // Inputs
  inputGroup: { marginBottom: 16 },
  inputLabel: {
    fontFamily: "Geist-SemiBold",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.4)",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  textInput: {
    fontFamily: "Geist",
    fontSize: 15,
    color: "#F0EDE6",
    backgroundColor: "#141810",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.06)",
  },
  calorieInput: { marginTop: 8, marginBottom: 12 },

  // Buttons
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#D4A843",
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
    shadowColor: "#D4A843",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  generateButton: {
    backgroundColor: "#7CB87A",
    shadowColor: "#7CB87A",
  },
  nextButtonText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 15,
    color: "#0C0F0A",
  },

  // Generating screen
  generatingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  generatingIcon: {
    width: 72,
    height: 72,
    borderRadius: 28,
    backgroundColor: "rgba(124, 184, 122, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  generatingTitle: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 26,
    color: "#F0EDE6",
    textAlign: "center",
    marginBottom: 12,
  },
  generatingMessage: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.4)",
    textAlign: "center",
    lineHeight: 21,
    minHeight: 21,
  },

  // Value props
  valuePropRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    width: "100%",
  },
  valuePropText: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.5)",
    flex: 1,
    lineHeight: 20,
  },

  // Meal plan header
  mealPlanHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    marginTop: 4,
  },
  regenerateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "rgba(124, 184, 122, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(124, 184, 122, 0.15)",
  },
  regenerateBtnText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 12,
    color: "#7CB87A",
  },

  // Goals summary card
  goalsSummaryCard: {
    backgroundColor: "#141810",
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(212, 168, 67, 0.1)",
  },
  goalsSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  goalsSummaryTitle: {
    fontFamily: "Geist-SemiBold",
    fontSize: 16,
    color: "#F0EDE6",
  },
  goalsSummarySubtitle: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.35)",
    marginTop: 2,
  },
  editButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "rgba(212, 168, 67, 0.12)",
  },
  editButtonText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 12,
    color: "#D4A843",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 14,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "rgba(212, 168, 67, 0.08)",
  },
  tagText: {
    fontFamily: "GeistMono-Regular",
    fontSize: 11,
    color: "#D4A843",
  },
  kidsNote: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(122, 173, 206, 0.08)",
  },
  kidsNoteText: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "#7AADCE",
  },

  // Plan loading
  planLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 20,
    justifyContent: "center",
  },
  planLoadingText: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.3)",
  },

  // Error card
  errorCard: {
    backgroundColor: "#1A1210",
    borderRadius: 18,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(212, 100, 80, 0.15)",
    alignItems: "center",
    gap: 8,
  },
  errorTitle: {
    fontFamily: "Geist-SemiBold",
    fontSize: 15,
    color: "#F0EDE6",
  },
  errorSubtitle: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.35)",
    textAlign: "center",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#7CB87A",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  retryBtnText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 14,
    color: "#0C0F0A",
  },

  // No plan state
  noPlanCard: {
    backgroundColor: "#141810",
    borderRadius: 22,
    padding: 28,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(124, 184, 122, 0.1)",
    alignItems: "center",
  },
  noPlanIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: "rgba(124, 184, 122, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  noPlanTitle: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 22,
    color: "#F0EDE6",
    marginBottom: 8,
    textAlign: "center",
  },
  noPlanSubtitle: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.35)",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 20,
  },
  generateCTA: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#7CB87A",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 28,
    shadowColor: "#7CB87A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  generateCTAText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 15,
    color: "#0C0F0A",
  },
  noPlanHint: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.2)",
    marginTop: 10,
  },

  // Meal category sections
  categorySection: {
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryLabel: {
    fontFamily: "Geist-SemiBold",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  mealCard: {
    backgroundColor: "#141810",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.04)",
    borderLeftWidth: 3,
  },
  mealCardName: {
    fontFamily: "Geist-SemiBold",
    fontSize: 16,
    color: "#F0EDE6",
    marginBottom: 8,
  },
  mealCardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  mealCardStat: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.4)",
  },
  mealCardStatNum: {
    fontFamily: "GeistMono-Regular",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.7)",
  },
  mealCardStatDot: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.2)",
    marginHorizontal: 2,
  },
  mealCardDesc: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.3)",
    lineHeight: 18,
  },
  extraBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 10,
  },
  extraBadgeText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 11,
  },

  // Grocery CTA
  groceryCTA: {
    backgroundColor: "#141810",
    borderRadius: 18,
    padding: 16,
    marginTop: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.04)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  actionCardTitle: {
    fontFamily: "Geist-SemiBold",
    fontSize: 15,
    color: "#F0EDE6",
    marginBottom: 2,
  },
  actionCardSubtitle: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.3)",
  },

  // Grocery Modal
  modalContainer: {
    flex: 1,
    backgroundColor: "#0C0F0A",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(240, 237, 230, 0.05)",
  },
  modalTitle: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 26,
    color: "#F0EDE6",
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(240, 237, 230, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalScroll: { flex: 1 },
  modalContent: { paddingHorizontal: 20, paddingBottom: 60, paddingTop: 8 },
  modalEmpty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalEmptyText: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.3)",
  },

  // Grocery list
  storeSection: {
    marginTop: 20,
  },
  storeLabel: {
    fontFamily: "Geist-SemiBold",
    fontSize: 11,
    color: "#D4A843",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  groceryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(240, 237, 230, 0.04)",
  },
  groceryItemName: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "#F0EDE6",
  },
  groceryItemQty: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.3)",
    marginTop: 2,
  },
  groceryItemCost: {
    fontFamily: "GeistMono-Regular",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.5)",
  },
  kidsGroceryNote: {
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(122, 173, 206, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(122, 173, 206, 0.1)",
  },
  kidsGroceryNoteText: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "#7AADCE",
  },
  groceryTotal: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(240, 237, 230, 0.08)",
  },
  groceryTotalLabel: {
    fontFamily: "Geist-SemiBold",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.5)",
  },
  groceryTotalAmount: {
    fontFamily: "GeistMono-Regular",
    fontSize: 20,
    color: "#F0EDE6",
  },
});
