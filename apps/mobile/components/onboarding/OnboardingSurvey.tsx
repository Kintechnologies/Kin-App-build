import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  X,
  Sparkles,
} from "lucide-react-native";

interface Child {
  name: string;
  age: string;
  allergies: string[];
}

interface Pet {
  name: string;
  species: "dog" | "cat" | "other";
}

interface OnboardingData {
  familyName: string;
  homeLocation: string;
  householdType: "two-parent" | "single-parent";
  weekDescription: string;
  children: Child[];
  pets: Pet[];
  monthlyGroceryBudget: string;
}

interface OnboardingSurveyProps {
  onComplete: (data: OnboardingData) => void;
  onSkip?: () => void;
}

type Step = "family" | "week" | "family_members" | "budget" | "preview";

const STEPS: Step[] = ["family", "week", "family_members", "budget", "preview"];
const COMMON_ALLERGENS = ["dairy", "eggs", "peanuts", "tree nuts", "wheat", "soy"];

const ALLERGEN_COLORS: Record<string, string> = {
  dairy: "#D4748A",
  eggs: "#E07B5A",
  peanuts: "#D4A843",
  "tree nuts": "#C4956A",
  wheat: "#7AADCE",
  soy: "#7CB87A",
};

export default function OnboardingSurvey({
  onComplete,
  onSkip,
}: OnboardingSurveyProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Form data
  const [familyName, setFamilyName] = useState("");
  const [homeLocation, setHomeLocation] = useState("");
  const [householdType, setHouseholdType] = useState<"two-parent" | "single-parent">("two-parent");
  const [weekDescription, setWeekDescription] = useState("");
  const [children, setChildren] = useState<Child[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [monthlyGroceryBudget, setMonthlyGroceryBudget] = useState("");
  const [previewBriefing, setPreviewBriefing] = useState<string | null>(null);

  // Temporary state for adding children/pets
  const [newChildName, setNewChildName] = useState("");
  const [newChildAge, setNewChildAge] = useState("");
  const [newChildAllergies, setNewChildAllergies] = useState<string[]>([]);
  const [newPetName, setNewPetName] = useState("");
  const [newPetSpecies, setNewPetSpecies] = useState<"dog" | "cat" | "other">("dog");
  const [showAddChild, setShowAddChild] = useState(false);
  const [showAddPet, setShowAddPet] = useState(false);

  useEffect(() => {
    // Animate transition when step changes
    animateTransition();
  }, [currentStep]);

  function animateTransition() {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
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
      setCurrentStep((s) => s + 1);
    } else {
      // On preview, this becomes "Start Your Free Trial"
      handleComplete();
    }
  }

  function prevStep() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }

  function addChild() {
    if (newChildName.trim()) {
      setChildren([
        ...children,
        {
          name: newChildName,
          age: newChildAge,
          allergies: newChildAllergies,
        },
      ]);
      setNewChildName("");
      setNewChildAge("");
      setNewChildAllergies([]);
      setShowAddChild(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  function removeChild(index: number) {
    setChildren(children.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function toggleAllergen(allergen: string) {
    setNewChildAllergies((prev) =>
      prev.includes(allergen)
        ? prev.filter((a) => a !== allergen)
        : [...prev, allergen]
    );
  }

  function addPet() {
    if (newPetName.trim()) {
      setPets([...pets, { name: newPetName, species: newPetSpecies }]);
      setNewPetName("");
      setNewPetSpecies("dog");
      setShowAddPet(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  function removePet(index: number) {
    setPets(pets.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function generatePreviewBriefing() {
    setLoadingBriefing(true);
    // Simulate 3-second loading
    setTimeout(() => {
      const allergiesList =
        children
          .flatMap((c) => c.allergies)
          .filter((a, idx, arr) => arr.indexOf(a) === idx)
          .join(", ") || "none";

      const preview = `${familyName}'s Morning.

Wake based on your schedule. Kids' allergies: ${allergiesList}. Budget: $${monthlyGroceryBudget || "TBD"}/month for groceries.

Tap to connect your calendar for the full picture.`;

      setPreviewBriefing(preview);
      setLoadingBriefing(false);
    }, 3000);
  }

  async function handleComplete() {
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const data: OnboardingData = {
      familyName,
      homeLocation,
      householdType,
      weekDescription,
      children,
      pets,
      monthlyGroceryBudget,
    };

    try {
      onComplete(data);
    } catch (error) {
      console.error("Onboarding error:", error);
      setSaving(false);
    }
  }

  const step = STEPS[currentStep];
  const isStepValid = (): boolean => {
    switch (step) {
      case "family":
        return familyName.trim().length > 0 && homeLocation.trim().length > 0;
      case "week":
        return weekDescription.trim().length > 10;
      case "family_members":
        return true; // Can skip
      case "budget":
        return true; // Can skip
      case "preview":
        return true;
      default:
        return false;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
          {/* STEP: Family Setup */}
          {step === "family" && (
            <>
              <Text style={styles.stepTitle}>Let's get to know your family</Text>
              <Text style={styles.stepSubtitle}>
                This helps Kin personalize everything for you
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Family name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., The Smiths"
                  placeholderTextColor="rgba(240, 237, 230, 0.15)"
                  value={familyName}
                  onChangeText={setFamilyName}
                  autoFocus
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Home neighborhood</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., East Nashville"
                  placeholderTextColor="rgba(240, 237, 230, 0.15)"
                  value={homeLocation}
                  onChangeText={setHomeLocation}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Household type</Text>
                <View style={styles.optionsList}>
                  {(
                    [
                      { value: "two-parent" as const, label: "Two parents" },
                      { value: "single-parent" as const, label: "Single parent" },
                    ] as const
                  ).map((option) => (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.optionCard,
                        householdType === option.value &&
                          styles.optionCardSelected,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setHouseholdType(option.value);
                      }}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          householdType === option.value &&
                            styles.optionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {householdType === option.value && (
                        <Check size={16} color="#7CB87A" />
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* STEP: Your Week */}
          {step === "week" && (
            <>
              <Text style={styles.stepTitle}>Tell me about a typical weekday</Text>
              <Text style={styles.stepSubtitle}>
                Kin learns your rhythm so your briefing is actually useful
              </Text>

              <View style={styles.inputGroup}>
                <TextInput
                  style={[styles.textInput, styles.largeTextInput]}
                  placeholder="I usually wake up around 6, head to the gym before work, start at 9:30. My wife picks the kids up most days but I handle Tuesday/Thursday..."
                  placeholderTextColor="rgba(240, 237, 230, 0.15)"
                  value={weekDescription}
                  onChangeText={setWeekDescription}
                  multiline
                  numberOfLines={6}
                  autoFocus
                  textAlignVertical="top"
                />
              </View>
            </>
          )}

          {/* STEP: Family Members */}
          {step === "family_members" && (
            <>
              <Text style={styles.stepTitle}>Who's in your household?</Text>
              <Text style={styles.stepSubtitle}>
                Skip if it's just you and your partner
              </Text>

              {/* Children List */}
              {children.length > 0 && (
                <View style={styles.membersSection}>
                  <Text style={styles.membersSectionTitle}>Kids</Text>
                  {children.map((child, idx) => (
                    <View key={idx} style={styles.memberCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberName}>{child.name}</Text>
                        {child.age && (
                          <Text style={styles.memberDetail}>Age {child.age}</Text>
                        )}
                        {child.allergies.length > 0 && (
                          <View style={styles.allergyChips}>
                            {child.allergies.map((allergy) => (
                              <View
                                key={allergy}
                                style={[
                                  styles.allergyChip,
                                  {
                                    backgroundColor:
                                      ALLERGEN_COLORS[allergy] || "#7CB87A",
                                  },
                                ]}
                              >
                                <Text style={styles.allergyChipText}>
                                  {allergy}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                      <Pressable onPress={() => removeChild(idx)}>
                        <X size={18} color="rgba(240, 237, 230, 0.3)" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              {/* Add Child Form */}
              {showAddChild ? (
                <View style={styles.addForm}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Child's name</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Name"
                      placeholderTextColor="rgba(240, 237, 230, 0.15)"
                      value={newChildName}
                      onChangeText={setNewChildName}
                      autoFocus
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Age</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Age"
                      placeholderTextColor="rgba(240, 237, 230, 0.15)"
                      value={newChildAge}
                      onChangeText={setNewChildAge}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Allergies (select all)</Text>
                    <View style={styles.allergenGrid}>
                      {COMMON_ALLERGENS.map((allergen) => {
                        const isSelected = newChildAllergies.includes(allergen);
                        return (
                          <Pressable
                            key={allergen}
                            style={[
                              styles.allergenChip,
                              isSelected && {
                                backgroundColor:
                                  ALLERGEN_COLORS[allergen] || "#7CB87A",
                              },
                            ]}
                            onPress={() => toggleAllergen(allergen)}
                          >
                            {isSelected && (
                              <Check size={12} color="#0C0F0A" />
                            )}
                            <Text
                              style={[
                                styles.allergenChipText,
                                isSelected && styles.allergenChipTextSelected,
                              ]}
                            >
                              {allergen}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.formButtonsRow}>
                    <Pressable
                      style={styles.cancelBtn}
                      onPress={() => {
                        setShowAddChild(false);
                        setNewChildName("");
                        setNewChildAge("");
                        setNewChildAllergies([]);
                      }}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.addBtn,
                        !newChildName.trim() && styles.addBtnDisabled,
                      ]}
                      onPress={addChild}
                      disabled={!newChildName.trim()}
                    >
                      <Text style={styles.addBtnText}>Add child</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  style={styles.addMemberBtn}
                  onPress={() => setShowAddChild(true)}
                >
                  <Plus size={16} color="#7CB87A" />
                  <Text style={styles.addMemberBtnText}>Add child</Text>
                </Pressable>
              )}

              {/* Pets List */}
              {pets.length > 0 && (
                <View style={styles.membersSection}>
                  <Text style={styles.membersSectionTitle}>Pets</Text>
                  {pets.map((pet, idx) => (
                    <View key={idx} style={styles.memberCard}>
                      <View>
                        <Text style={styles.memberName}>{pet.name}</Text>
                        <Text style={styles.memberDetail}>
                          {pet.species.charAt(0).toUpperCase() +
                            pet.species.slice(1)}
                        </Text>
                      </View>
                      <Pressable onPress={() => removePet(idx)}>
                        <X size={18} color="rgba(240, 237, 230, 0.3)" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              {/* Add Pet Form */}
              {showAddPet ? (
                <View style={styles.addForm}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Pet's name</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Name"
                      placeholderTextColor="rgba(240, 237, 230, 0.15)"
                      value={newPetName}
                      onChangeText={setNewPetName}
                      autoFocus
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Species</Text>
                    <View style={styles.optionsList}>
                      {(
                        [
                          { value: "dog" as const, label: "Dog" },
                          { value: "cat" as const, label: "Cat" },
                          { value: "other" as const, label: "Other" },
                        ] as const
                      ).map((option) => (
                        <Pressable
                          key={option.value}
                          style={[
                            styles.optionCard,
                            newPetSpecies === option.value &&
                              styles.optionCardSelected,
                          ]}
                          onPress={() => setNewPetSpecies(option.value)}
                        >
                          <Text
                            style={[
                              styles.optionText,
                              newPetSpecies === option.value &&
                                styles.optionTextSelected,
                            ]}
                          >
                            {option.label}
                          </Text>
                          {newPetSpecies === option.value && (
                            <Check size={16} color="#7CB87A" />
                          )}
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View style={styles.formButtonsRow}>
                    <Pressable
                      style={styles.cancelBtn}
                      onPress={() => {
                        setShowAddPet(false);
                        setNewPetName("");
                        setNewPetSpecies("dog");
                      }}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.addBtn,
                        !newPetName.trim() && styles.addBtnDisabled,
                      ]}
                      onPress={addPet}
                      disabled={!newPetName.trim()}
                    >
                      <Text style={styles.addBtnText}>Add pet</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  style={styles.addMemberBtn}
                  onPress={() => setShowAddPet(true)}
                >
                  <Plus size={16} color="#7CB87A" />
                  <Text style={styles.addMemberBtnText}>Add pet</Text>
                </Pressable>
              )}
            </>
          )}

          {/* STEP: Budget */}
          {step === "budget" && (
            <>
              <Text style={styles.stepTitle}>What's your monthly grocery budget?</Text>
              <Text style={styles.stepSubtitle}>
                Kin uses this to suggest meals you can actually afford
              </Text>

              <View style={styles.budgetInputWrap}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  style={styles.budgetInput}
                  placeholder="500"
                  placeholderTextColor="rgba(240, 237, 230, 0.15)"
                  value={monthlyGroceryBudget}
                  onChangeText={setMonthlyGroceryBudget}
                  keyboardType="numeric"
                  autoFocus
                />
                <Text style={styles.perMonth}>/month</Text>
              </View>

              <Pressable
                style={styles.skipBtn}
                onPress={() => nextStep()}
              >
                <Text style={styles.skipBtnText}>Skip for now</Text>
              </Pressable>
            </>
          )}

          {/* STEP: FVM Preview */}
          {step === "preview" && (
            <>
              <Text style={styles.stepTitle}>Your first briefing</Text>
              <Text style={styles.stepSubtitle}>
                This is what Kin will show you every morning
              </Text>

              {!previewBriefing && !loadingBriefing && (
                <Pressable
                  style={styles.generateBtn}
                  onPress={generatePreviewBriefing}
                >
                  <Text style={styles.generateBtnText}>Generate preview</Text>
                </Pressable>
              )}

              {loadingBriefing && (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Generating your first briefing</Text>
                  <View style={styles.loadingDots}>
                    <Text style={styles.loadingDot}>.</Text>
                    <Text style={styles.loadingDot}>.</Text>
                    <Text style={styles.loadingDot}>.</Text>
                  </View>
                </View>
              )}

              {previewBriefing && (
                <>
                  <View style={styles.briefingCard}>
                    <Text style={styles.briefingText}>{previewBriefing}</Text>
                  </View>

                  <Text style={styles.trialText}>
                    7-day free trial, then $39/month. Cancel anytime.
                  </Text>

                  <Text style={styles.authNote}>Apple Sign In / Email Sign Up</Text>
                </>
              )}
            </>
          )}
        </Animated.View>

        {/* Navigation */}
        <View style={styles.navRow}>
          {currentStep > 0 && !showAddChild && !showAddPet ? (
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
            disabled={saving || !isStepValid() || (step === "preview" && !previewBriefing)}
            style={({ pressed }) => [
              styles.nextBtn,
              (!isStepValid() || (step === "preview" && !previewBriefing)) &&
                styles.nextBtnDisabled,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#0C0F0A" />
            ) : (
              <>
                <Text style={styles.nextBtnText}>
                  {step === "preview"
                    ? "Start Your Free Trial"
                    : "Next"}
                </Text>
                {step !== "preview" && (
                  <ChevronRight size={16} color="#0C0F0A" />
                )}
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>

      {currentStep === 0 && onSkip && (
        <Pressable style={styles.dismissBtn} onPress={onSkip}>
          <X size={18} color="rgba(240, 237, 230, 0.4)" />
        </Pressable>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0C0F0A",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },

  // Progress
  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginBottom: 32,
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
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 28,
    color: "#F0EDE6",
    marginBottom: 8,
  },
  stepSubtitle: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.5)",
    marginBottom: 24,
    lineHeight: 20,
  },

  // Inputs
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: "Geist-SemiBold",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.4)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  textInput: {
    fontFamily: "Geist",
    fontSize: 16,
    color: "#F0EDE6",
    backgroundColor: "rgba(240, 237, 230, 0.03)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.08)",
  },
  largeTextInput: {
    minHeight: 120,
    paddingTop: 12,
  },

  // Budget input
  budgetInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(240, 237, 230, 0.03)",
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(212, 168, 67, 0.2)",
    marginBottom: 20,
  },
  dollarSign: {
    fontFamily: "Geist-SemiBold",
    fontSize: 24,
    color: "#D4A843",
    marginRight: 4,
  },
  budgetInput: {
    flex: 1,
    fontFamily: "Geist-SemiBold",
    fontSize: 24,
    color: "#F0EDE6",
    paddingVertical: 16,
  },
  perMonth: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.25)",
  },

  // Options list
  optionsList: {
    gap: 10,
  },
  optionCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(240, 237, 230, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.08)",
  },
  optionCardSelected: {
    backgroundColor: "rgba(124, 184, 122, 0.1)",
    borderColor: "rgba(124, 184, 122, 0.25)",
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

  // Family members
  membersSection: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(240, 237, 230, 0.06)",
  },
  membersSectionTitle: {
    fontFamily: "Geist-SemiBold",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.4)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  memberCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: "rgba(124, 184, 122, 0.06)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(124, 184, 122, 0.1)",
  },
  memberName: {
    fontFamily: "Geist-SemiBold",
    fontSize: 15,
    color: "#F0EDE6",
    marginBottom: 4,
  },
  memberDetail: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.4)",
  },
  allergyChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  allergyChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  allergyChipText: {
    fontFamily: "Geist",
    fontSize: 11,
    color: "#0C0F0A",
    textTransform: "capitalize",
  },

  // Add member button
  addMemberBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(124, 184, 122, 0.2)",
    backgroundColor: "rgba(124, 184, 122, 0.05)",
    marginBottom: 20,
    gap: 8,
  },
  addMemberBtnText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 14,
    color: "#7CB87A",
  },

  // Add form
  addForm: {
    backgroundColor: "rgba(124, 184, 122, 0.05)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(124, 184, 122, 0.1)",
  },

  // Allergen grid
  allergenGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  allergenChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(240, 237, 230, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.08)",
  },
  allergenChipText: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.5)",
    textTransform: "capitalize",
  },
  allergenChipTextSelected: {
    color: "#0C0F0A",
    fontFamily: "Geist-SemiBold",
  },

  // Form buttons
  formButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(240, 237, 230, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.1)",
  },
  cancelBtnText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.5)",
    textAlign: "center",
  },
  addBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#7CB87A",
  },
  addBtnDisabled: {
    backgroundColor: "rgba(124, 184, 122, 0.4)",
  },
  addBtnText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 14,
    color: "#0C0F0A",
    textAlign: "center",
  },

  // Skip button
  skipBtn: {
    paddingVertical: 12,
    marginTop: 16,
  },
  skipBtnText: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.4)",
    textAlign: "center",
  },

  // Briefing preview
  generateBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#7CB87A",
    marginBottom: 20,
  },
  generateBtnText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 14,
    color: "#0C0F0A",
    textAlign: "center",
  },

  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
    marginBottom: 20,
  },
  loadingText: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.5)",
    marginBottom: 12,
  },
  loadingDots: {
    flexDirection: "row",
    gap: 4,
  },
  loadingDot: {
    fontFamily: "Geist-Bold",
    fontSize: 20,
    color: "#7CB87A",
  },

  briefingCard: {
    backgroundColor: "#141810",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(124, 184, 122, 0.15)",
    marginBottom: 20,
  },
  briefingText: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "#F0EDE6",
    lineHeight: 22,
  },

  trialText: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.4)",
    textAlign: "center",
    marginBottom: 12,
  },

  authNote: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.25)",
    textAlign: "center",
  },

  // Navigation
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(240, 237, 230, 0.06)",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  backBtnText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.4)",
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#7CB87A",
  },
  nextBtnDisabled: {
    backgroundColor: "rgba(124, 184, 122, 0.4)",
  },
  nextBtnText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 14,
    color: "#0C0F0A",
  },

  // Dismiss button
  dismissBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(240, 237, 230, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
});
