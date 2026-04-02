import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Animated,
  ScrollView,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  User,
  Users,
  Baby,
  ShoppingCart,
  Heart,
  Sparkles,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";

interface OnboardingSurveyProps {
  onComplete: () => void;
  onProgress: (percent: number) => void;
}

type Step =
  | "parent_role"
  | "household"
  | "kids"
  | "grocery_budget"
  | "dietary"
  | "complete";

const STEPS: Step[] = [
  "parent_role",
  "household",
  "kids",
  "grocery_budget",
  "dietary",
];

const DIETARY_OPTIONS = [
  "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free",
  "Low-Carb", "Keto", "Paleo", "Nut Allergy", "Halal", "Kosher",
];

export default function OnboardingSurvey({ onComplete, onProgress }: OnboardingSurveyProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Form data
  const [parentRole, setParentRole] = useState<"mom" | "dad" | "parent" | null>(null);
  const [householdType, setHouseholdType] = useState("");
  const [kidsCount, setKidsCount] = useState("");
  const [kidNames, setKidNames] = useState("");
  const [groceryBudget, setGroceryBudget] = useState("");
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);

  useEffect(() => {
    onProgress(Math.round((currentStep / STEPS.length) * 100));
  }, [currentStep]);

  function animateTransition(forward: boolean, callback: () => void) {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      callback();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }

  function nextStep() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep < STEPS.length - 1) {
      animateTransition(true, () => setCurrentStep((s) => s + 1));
    } else {
      saveAndComplete();
    }
  }

  function prevStep() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep > 0) {
      animateTransition(false, () => setCurrentStep((s) => s - 1));
    }
  }

  function toggleDietary(item: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDietary((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  }

  async function saveAndComplete() {
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    // Save parent role to profile
    if (parentRole) {
      await supabase.from("profiles").update({
        parent_role: parentRole,
        household_type: householdType || undefined,
      }).eq("id", user.id);
    }

    // Save preferences
    await supabase.from("onboarding_preferences").upsert({
      profile_id: user.id,
      weekly_grocery_budget: groceryBudget ? parseInt(groceryBudget) : null,
      dietary_preferences: selectedDietary,
      kids_names: kidNames.split(",").map((n) => n.trim()).filter(Boolean),
      kids_count: kidsCount ? parseInt(kidsCount) : null,
    });

    setSaving(false);
    onComplete();
  }

  const step = STEPS[currentStep];

  return (
    <View style={styles.container}>
      {/* Progress dots */}
      <View style={styles.progressRow}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              i <= currentStep && styles.progressDotFilled,
              i === currentStep && styles.progressDotCurrent,
            ]}
          />
        ))}
      </View>

      {/* Step content */}
      <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>

        {/* STEP: Parent Role */}
        {step === "parent_role" && (
          <>
            <Text style={styles.stepTitle}>Who's setting up Kin?</Text>
            <Text style={styles.stepSubtitle}>
              This helps Kin personalize recommendations for you
            </Text>
            <View style={styles.optionsRow}>
              {([
                { value: "mom" as const, label: "Mom", icon: "👩" },
                { value: "dad" as const, label: "Dad", icon: "👨" },
                { value: "parent" as const, label: "Parent", icon: "🧑" },
              ]).map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.roleCard,
                    parentRole === option.value && styles.roleCardSelected,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setParentRole(option.value);
                  }}
                >
                  <Text style={styles.roleEmoji}>{option.icon}</Text>
                  <Text style={[
                    styles.roleLabel,
                    parentRole === option.value && styles.roleLabelSelected,
                  ]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* STEP: Household */}
        {step === "household" && (
          <>
            <Text style={styles.stepTitle}>Household type</Text>
            <Text style={styles.stepSubtitle}>
              Helps Kin understand your family structure
            </Text>
            <View style={styles.optionsList}>
              {["Two parents", "Single parent", "Multi-generational", "Other"].map((type) => (
                <Pressable
                  key={type}
                  style={[
                    styles.optionCard,
                    householdType === type && styles.optionCardSelected,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setHouseholdType(type);
                  }}
                >
                  <Text style={[
                    styles.optionText,
                    householdType === type && styles.optionTextSelected,
                  ]}>
                    {type}
                  </Text>
                  {householdType === type && <Check size={16} color="#7CB87A" />}
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* STEP: Kids */}
        {step === "kids" && (
          <>
            <Text style={styles.stepTitle}>Tell us about your kids</Text>
            <Text style={styles.stepSubtitle}>
              Skip if no kids — Kin works great for couples too
            </Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>How many kids?</Text>
              <TextInput
                style={styles.textInput}
                value={kidsCount}
                onChangeText={setKidsCount}
                placeholder="0"
                placeholderTextColor="rgba(240, 237, 230, 0.15)"
                keyboardType="numeric"
              />
            </View>
            {kidsCount && parseInt(kidsCount) > 0 && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Names and ages</Text>
                <TextInput
                  style={styles.textInput}
                  value={kidNames}
                  onChangeText={setKidNames}
                  placeholder="e.g., Jaxon (8), Mia (5)"
                  placeholderTextColor="rgba(240, 237, 230, 0.15)"
                />
              </View>
            )}
          </>
        )}

        {/* STEP: Grocery Budget */}
        {step === "grocery_budget" && (
          <>
            <Text style={styles.stepTitle}>Weekly grocery budget</Text>
            <Text style={styles.stepSubtitle}>
              Kin uses this to build meal plans within your budget
            </Text>
            <View style={styles.budgetInputWrap}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.budgetInput}
                value={groceryBudget}
                onChangeText={setGroceryBudget}
                placeholder="200"
                placeholderTextColor="rgba(240, 237, 230, 0.15)"
                keyboardType="numeric"
                autoFocus
              />
              <Text style={styles.perWeek}>/week</Text>
            </View>
          </>
        )}

        {/* STEP: Dietary */}
        {step === "dietary" && (
          <>
            <Text style={styles.stepTitle}>Dietary preferences</Text>
            <Text style={styles.stepSubtitle}>
              Select all that apply, or skip
            </Text>
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
          </>
        )}
      </Animated.View>

      {/* Navigation */}
      <View style={styles.navRow}>
        {currentStep > 0 ? (
          <Pressable
            onPress={prevStep}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <ChevronLeft size={18} color="rgba(240, 237, 230, 0.4)" />
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
        ) : (
          <View />
        )}

        <Pressable
          onPress={nextStep}
          disabled={saving}
          style={({ pressed }) => [
            styles.nextBtn,
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Text style={styles.nextBtnText}>
            {currentStep === STEPS.length - 1
              ? saving ? "Saving..." : "Finish"
              : "Next"}
          </Text>
          <ChevronRight size={16} color="#0C0F0A" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#141810",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(124, 184, 122, 0.1)",
  },

  // Progress
  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginBottom: 20,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(240, 237, 230, 0.06)",
  },
  progressDotFilled: {
    backgroundColor: "rgba(124, 184, 122, 0.25)",
  },
  progressDotCurrent: {
    backgroundColor: "#7CB87A",
    width: 20,
    shadowColor: "#7CB87A",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },

  // Step content
  stepContent: { minHeight: 200 },
  stepTitle: {
    fontFamily: "Geist-SemiBold",
    fontSize: 18,
    color: "#F0EDE6",
    marginBottom: 4,
  },
  stepSubtitle: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.3)",
    marginBottom: 20,
    lineHeight: 19,
  },

  // Parent role cards
  optionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  roleCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 20,
    borderRadius: 16,
    backgroundColor: "rgba(240, 237, 230, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.04)",
  },
  roleCardSelected: {
    backgroundColor: "rgba(124, 184, 122, 0.08)",
    borderColor: "rgba(124, 184, 122, 0.2)",
  },
  roleEmoji: { fontSize: 28, marginBottom: 8 },
  roleLabel: {
    fontFamily: "Geist-SemiBold",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.4)",
  },
  roleLabelSelected: { color: "#7CB87A" },

  // Option list
  optionsList: { gap: 8 },
  optionCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(240, 237, 230, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.04)",
  },
  optionCardSelected: {
    backgroundColor: "rgba(124, 184, 122, 0.08)",
    borderColor: "rgba(124, 184, 122, 0.2)",
  },
  optionText: {
    fontFamily: "Geist",
    fontSize: 15,
    color: "rgba(240, 237, 230, 0.5)",
  },
  optionTextSelected: {
    color: "#7CB87A",
    fontFamily: "Geist-SemiBold",
  },

  // Inputs
  inputGroup: { marginBottom: 14 },
  inputLabel: {
    fontFamily: "Geist-SemiBold",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.3)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  textInput: {
    fontFamily: "Geist",
    fontSize: 15,
    color: "#F0EDE6",
    backgroundColor: "rgba(240, 237, 230, 0.03)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.06)",
  },

  // Budget input
  budgetInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(240, 237, 230, 0.03)",
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(124, 184, 122, 0.12)",
  },
  dollarSign: {
    fontFamily: "Geist-SemiBold",
    fontSize: 24,
    color: "#7CB87A",
    marginRight: 4,
  },
  budgetInput: {
    flex: 1,
    fontFamily: "Geist-SemiBold",
    fontSize: 24,
    color: "#F0EDE6",
    paddingVertical: 16,
  },
  perWeek: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.25)",
  },

  // Chips
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(240, 237, 230, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.06)",
  },
  chipSelected: {
    backgroundColor: "#7CB87A",
    borderColor: "#7CB87A",
  },
  chipText: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.45)",
  },
  chipTextSelected: {
    color: "#0C0F0A",
    fontFamily: "Geist-SemiBold",
  },

  // Navigation
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 8,
  },
  backBtnText: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.4)",
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#7CB87A",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: "#7CB87A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  nextBtnText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 14,
    color: "#0C0F0A",
  },
});
