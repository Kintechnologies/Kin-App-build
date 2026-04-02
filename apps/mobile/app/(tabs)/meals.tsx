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

type SetupStep = "welcome" | "dietary" | "nutrition" | "preferences" | "stores" | "generating" | "done";

const DIETARY_OPTIONS = [
  "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free",
  "Low-Carb", "Keto", "Paleo", "Nut Allergy", "Halal", "Kosher",
];

const NUTRITION_GOALS = [
  { label: "Lose weight", icon: "scale" },
  { label: "Gain muscle", icon: "muscle" },
  { label: "Maintain", icon: "balance" },
  { label: "Heart healthy", icon: "heart" },
  { label: "High protein", icon: "protein" },
  { label: "Low sugar", icon: "sugar" },
];

const STORES = [
  "Costco", "Walmart", "Trader Joe's", "Whole Foods",
  "Kroger", "Aldi", "Target", "Sam's Club", "Publix", "H-E-B",
];

export default function Meals() {
  const [setupStep, setSetupStep] = useState<SetupStep>("welcome");
  const [hasPrefs, setHasPrefs] = useState(false);
  const [loading, setLoading] = useState(true);

  // Setup data
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [nutritionGoal, setNutritionGoal] = useState("");
  const [trackCalories, setTrackCalories] = useState(false);
  const [dailyCalories, setDailyCalories] = useState("");
  const [separateKidsMeals, setSeparateKidsMeals] = useState(false);
  const [foodLoves, setFoodLoves] = useState("");
  const [foodDislikes, setFoodDislikes] = useState("");
  const [selectedStores, setSelectedStores] = useState<string[]>([]);

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkPreferences();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  async function checkPreferences() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("onboarding_preferences")
      .select("*")
      .eq("profile_id", user.id)
      .single();

    if (data?.dietary_preferences?.length > 0) {
      setHasPrefs(true);
      setSetupStep("done");
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

  async function saveAndGenerate() {
    setSetupStep("generating");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Save preferences
    await supabase.from("onboarding_preferences").upsert({
      profile_id: user.id,
      dietary_preferences: selectedDietary,
      nutrition_goal: nutritionGoal,
      track_calories: trackCalories,
      daily_calorie_target: dailyCalories ? parseInt(dailyCalories) : null,
      separate_kids_meals: separateKidsMeals,
      food_loves: foodLoves.split(",").map((f) => f.trim()).filter(Boolean),
      food_dislikes: foodDislikes.split(",").map((f) => f.trim()).filter(Boolean),
      preferred_stores: selectedStores,
    });

    // Simulate generation time
    setTimeout(() => {
      setSetupStep("done");
      setHasPrefs(true);
    }, 3000);
  }

  function getStepNumber() {
    const steps: SetupStep[] = ["welcome", "dietary", "nutrition", "preferences", "stores"];
    return steps.indexOf(setupStep);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#7CB87A" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // Goals summary + navigation (after setup)
  if (setupStep === "done") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.pageTitle}>Nutrition & Meals</Text>

          {/* Goals summary */}
          <View style={styles.goalsSummaryCard}>
            <View style={styles.goalsSummaryHeader}>
              <View style={styles.setupIconWrap}>
                <UtensilsCrossed size={22} color="#D4A843" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.goalsSummaryTitle}>Your Goals</Text>
                <Text style={styles.goalsSummarySubtitle}>
                  {nutritionGoal || "No specific goal set"}
                  {trackCalories && dailyCalories ? ` \u00B7 ${dailyCalories} kcal/day` : ""}
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

            {/* Tags */}
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

          {/* Action cards */}
          <Pressable
            style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // TODO: Navigate to meal plan generator
            }}
          >
            <View style={[styles.actionCardIcon, { backgroundColor: "rgba(124, 184, 122, 0.12)" }]}>
              <Sparkles size={20} color="#7CB87A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionCardTitle}>Weekly Meal Plan</Text>
              <Text style={styles.actionCardSubtitle}>Generate personalized meal options</Text>
            </View>
            <ChevronRight size={16} color="rgba(240, 237, 230, 0.15)" />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // TODO: Navigate to recipe browser
            }}
          >
            <View style={[styles.actionCardIcon, { backgroundColor: "rgba(212, 168, 67, 0.12)" }]}>
              <Clock size={20} color="#D4A843" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionCardTitle}>Recipes</Text>
              <Text style={styles.actionCardSubtitle}>Browse and save family favorites</Text>
            </View>
            <ChevronRight size={16} color="rgba(240, 237, 230, 0.15)" />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // TODO: Navigate to grocery list
            }}
          >
            <View style={[styles.actionCardIcon, { backgroundColor: "rgba(160, 126, 200, 0.12)" }]}>
              <ShoppingCart size={20} color="#A07EC8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionCardTitle}>Grocery List</Text>
              <Text style={styles.actionCardSubtitle}>
                {selectedStores.length > 0
                  ? `Organized by ${selectedStores.slice(0, 2).join(", ")}${selectedStores.length > 2 ? ` +${selectedStores.length - 2}` : ""}`
                  : "Auto-generated from your meal plan"}
              </Text>
            </View>
            <ChevronRight size={16} color="rgba(240, 237, 230, 0.15)" />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // TODO: Navigate to snack suggestions
            }}
          >
            <View style={[styles.actionCardIcon, { backgroundColor: "rgba(212, 116, 138, 0.12)" }]}>
              <Star size={20} color="#D4748A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionCardTitle}>Snack Ideas</Text>
              <Text style={styles.actionCardSubtitle}>
                {nutritionGoal === "Gain muscle" || nutritionGoal === "High protein"
                  ? "High-protein snacks for your goals"
                  : nutritionGoal === "Lose weight"
                  ? "Low-cal snacks that keep you full"
                  : "Healthy snacks for the whole family"}
              </Text>
            </View>
            <ChevronRight size={16} color="rgba(240, 237, 230, 0.15)" />
          </Pressable>

          {/* Meal ratings history */}
          <View style={styles.ratingsCard}>
            <Text style={styles.ratingsTitle}>Meal Ratings</Text>
            <Text style={styles.ratingsSubtitle}>
              Rate your meals after cooking to help Kin learn your family's tastes
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Generating screen
  if (setupStep === "generating") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.generatingContainer}>
          <Animated.View style={[styles.generatingIcon, { opacity: fadeAnim }]}>
            <Sparkles size={32} color="#7CB87A" />
          </Animated.View>
          <Text style={styles.generatingTitle}>Building your meal plan...</Text>
          <Text style={styles.generatingSubtitle}>
            Kin is creating personalized options based on your preferences.
          </Text>
          <ActivityIndicator color="#7CB87A" style={{ marginTop: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  // Welcome / value prop screen
  if (setupStep === "welcome") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container} contentContainerStyle={[styles.content, { justifyContent: "center", flexGrow: 1 }]} showsVerticalScrollIndicator={false}>
          <View style={{ alignItems: "center" }}>
            <View style={styles.setupIconWrap}>
              <UtensilsCrossed size={28} color="#D4A843" />
            </View>
            <Text style={styles.pageTitle}>Meal Planning</Text>
            <Text style={[styles.pageSubtitle, { textAlign: "center", marginBottom: 28 }]}>
              Kin builds personalized meal plans, generates grocery lists by store, and learns what your family loves over time.
            </Text>

            {/* Value props */}
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

  // Inline setup flow
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
            {setupStep === "dietary" && "What dietary needs should Kin know about?"}
            {setupStep === "nutrition" && "What are your nutrition goals?"}
            {setupStep === "preferences" && "What does your family love (and hate)?"}
            {setupStep === "stores" && "Where do you like to shop?"}
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
                    style={[
                      styles.chip,
                      selected && styles.chipSelected,
                    ]}
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

  // Goals
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

  // Generating
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
    fontSize: 24,
    color: "#F0EDE6",
    textAlign: "center",
    marginBottom: 8,
  },
  generatingSubtitle: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.35)",
    textAlign: "center",
    lineHeight: 21,
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

  // Goals summary
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

  // Action cards
  actionCard: {
    backgroundColor: "#141810",
    borderRadius: 18,
    padding: 16,
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

  // Ratings
  ratingsCard: {
    backgroundColor: "#141810",
    borderRadius: 18,
    padding: 18,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.04)",
    alignItems: "center",
  },
  ratingsTitle: {
    fontFamily: "Geist-SemiBold",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.5)",
    marginBottom: 4,
  },
  ratingsSubtitle: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.2)",
    textAlign: "center",
    lineHeight: 18,
  },

  // Meal plan view
  dayCard: {
    backgroundColor: "#141810",
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.04)",
  },
  dayLabel: {
    fontFamily: "Geist-SemiBold",
    fontSize: 14,
    color: "#D4A843",
    marginBottom: 14,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(240, 237, 230, 0.03)",
  },
  mealDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#7CB87A",
  },
  mealType: {
    fontFamily: "GeistMono-Regular",
    fontSize: 10,
    color: "rgba(240, 237, 230, 0.25)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  mealName: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.6)",
    marginTop: 2,
  },
});
