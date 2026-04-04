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
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  Users,
  Plus,
  X,
  Edit2,
  Trash2,
  Heart,
  Activity,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FamilyMember {
  id: string;
  name: string;
  age?: number;
  member_type: "child" | "pet" | "adult";
}

interface Child extends FamilyMember {
  member_type: "child";
  school_name?: string;
  grade?: string;
  allergies: {
    allergen: string;
    severity: "mild" | "moderate" | "severe";
  }[];
  activities: {
    name: string;
    day_of_week: string[];
    start_time: string;
    end_time: string;
    location?: string;
  }[];
}

interface Pet extends FamilyMember {
  member_type: "pet";
  species: string;
  breed?: string;
  vet_name?: string;
  vet_phone?: string;
  vet_next_appointment?: string;
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    active: boolean;
  }[];
}

type ModalType = "add-child" | "add-pet" | null;

// Raw row shapes returned by Supabase join queries
interface RawChildRow {
  id: string;
  name: string;
  age?: number;
  member_type: "child";
  children_details?: { school_name?: string; grade?: string }[];
  children_allergies?: { allergen: string; severity: "mild" | "moderate" | "severe" }[];
  children_activities?: { name: string; day_of_week: string[]; start_time: string; end_time: string; location?: string }[];
}

interface RawPetRow {
  id: string;
  name: string;
  age?: number;
  member_type: "pet";
  pet_details?: { species?: string; breed?: string; vet_name?: string; vet_phone?: string; vet_next_appointment?: string }[];
  pet_medications?: { name: string; dosage: string; frequency: string; active: boolean }[];
  pet_vaccinations?: { name: string; given_date: string; next_due_date: string }[];
}

const SPECIES_EMOJI: Record<string, string> = {
  dog: "🐕",
  cat: "🐈",
  bird: "🐦",
  rabbit: "🐰",
  hamster: "🐹",
  fish: "🐠",
  snake: "🐍",
  reptile: "🦎",
  other: "🐾",
};

const SEVERITY_COLOR: Record<string, string> = {
  mild: "rgba(212, 168, 67, 0.3)",
  moderate: "rgba(255, 152, 0, 0.3)",
  severe: "rgba(214, 49, 49, 0.3)",
};

const SEVERITY_TEXT_COLOR: Record<string, string> = {
  mild: "#D4A843",
  moderate: "#FF9800",
  severe: "#D63131",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Family() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);

  // Add modal
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Child form state
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [childSchool, setChildSchool] = useState("");
  const [childAllergies, setChildAllergies] = useState<string[]>([]);
  const [childSaving, setChildSaving] = useState(false);

  // Pet form state
  const [petName, setPetName] = useState("");
  const [petSpecies, setPetSpecies] = useState("dog");
  const [petBreed, setPetBreed] = useState("");
  const [petSaving, setPetSaving] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadFamilyMembers();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  async function loadFamilyMembers() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    try {
      // Load children with allergies
      const { data: childData } = await supabase
        .from("family_members")
        .select(
          `
          id,
          name,
          age,
          member_type,
          children_details(school_name, grade),
          children_allergies(allergen, severity),
          children_activities(name, day_of_week, start_time, end_time, location)
          `
        )
        .eq("profile_id", user.id)
        .eq("member_type", "child");

      if (childData) {
        const formattedChildren = (childData as RawChildRow[]).map((c) => ({
          ...c,
          school_name: c.children_details?.[0]?.school_name,
          grade: c.children_details?.[0]?.grade,
          allergies: c.children_allergies || [],
          activities: c.children_activities || [],
        }));
        setChildren(formattedChildren);
      }

      // Load pets with medications
      const { data: petData } = await supabase
        .from("family_members")
        .select(
          `
          id,
          name,
          age,
          member_type,
          pet_details(species, breed, vet_name, vet_phone, vet_next_appointment),
          pet_medications(name, dosage, frequency, active),
          pet_vaccinations(name, given_date, next_due_date)
          `
        )
        .eq("profile_id", user.id)
        .eq("member_type", "pet");

      if (petData) {
        const formattedPets = (petData as RawPetRow[]).map((p) => ({
          ...p,
          species: p.pet_details?.[0]?.species || "other",
          breed: p.pet_details?.[0]?.breed,
          vet_name: p.pet_details?.[0]?.vet_name,
          vet_phone: p.pet_details?.[0]?.vet_phone,
          vet_next_appointment: p.pet_details?.[0]?.vet_next_appointment,
          medications: p.pet_medications || [],
          vaccinations: p.pet_vaccinations || [],
        }));
        setPets(formattedPets);
      }
    } catch (e) {
      if (__DEV__) console.error("Error loading family members:", e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  function openAddChildModal() {
    setEditingId(null);
    setChildName("");
    setChildAge("");
    setChildSchool("");
    setChildAllergies([]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModalType("add-child");
  }

  function openAddPetModal() {
    setEditingId(null);
    setPetName("");
    setPetSpecies("dog");
    setPetBreed("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModalType("add-pet");
  }

  function closeModal() {
    Keyboard.dismiss();
    setModalType(null);
  }

  function toggleAllergy(allergen: string) {
    setChildAllergies((prev) =>
      prev.includes(allergen) ? prev.filter((a) => a !== allergen) : [...prev, allergen]
    );
  }

  async function saveChild() {
    if (!childName.trim()) return;

    setChildSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert or update family_member
      const memberData = {
        profile_id: user.id,
        name: childName.trim(),
        age: childAge ? parseInt(childAge, 10) : null,
        member_type: "child" as const,
      };

      let memberId = editingId;

      if (!editingId) {
        const { data, error } = await supabase
          .from("family_members")
          .insert([memberData])
          .select("id")
          .single();
        if (error) throw error;
        memberId = data?.id;
      } else {
        const { error } = await supabase
          .from("family_members")
          .update(memberData)
          .eq("id", editingId);
        if (error) throw error;
      }

      // Insert/update children_details if school provided
      if (memberId && childSchool.trim()) {
        await supabase.from("children_details").upsert({
          family_member_id: memberId,
          school_name: childSchool.trim(),
          grade: null,
        });
      }

      // Clear and reload
      await loadFamilyMembers();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeModal();
    } catch (e) {
      if (__DEV__) console.error("Error saving child:", e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setChildSaving(false);
    }
  }

  async function savePet() {
    if (!petName.trim()) return;

    setPetSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const memberData = {
        profile_id: user.id,
        name: petName.trim(),
        age: null,
        member_type: "pet" as const,
      };

      let memberId = editingId;

      if (!editingId) {
        const { data, error } = await supabase
          .from("family_members")
          .insert([memberData])
          .select("id")
          .single();
        if (error) throw error;
        memberId = data?.id;
      } else {
        const { error } = await supabase
          .from("family_members")
          .update(memberData)
          .eq("id", editingId);
        if (error) throw error;
      }

      // Insert/update pet_details
      if (memberId) {
        await supabase.from("pet_details").upsert({
          family_member_id: memberId,
          species: petSpecies,
          breed: petBreed.trim() || null,
          vet_name: null,
          vet_phone: null,
          vet_next_appointment: null,
        });
      }

      await loadFamilyMembers();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeModal();
    } catch (e) {
      if (__DEV__) console.error("Error saving pet:", e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setPetSaving(false);
    }
  }

  function deleteChild(childId: string, childName: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      `Remove ${childName}?`,
      "This will delete their profile, allergies, and activities. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await supabase.from("family_members").delete().eq("id", childId);
              setChildren((prev) => prev.filter((c) => c.id !== childId));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) {
              if (__DEV__) console.error("Error deleting child:", e);
            }
          },
        },
      ]
    );
  }

  function deletePet(petId: string, petName: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      `Remove ${petName}?`,
      "This will delete their profile, medications, and vet info. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await supabase.from("family_members").delete().eq("id", petId);
              setPets((prev) => prev.filter((p) => p.id !== petId));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) {
              if (__DEV__) console.error("Error deleting pet:", e);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.green} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.errorText, { color: colors.textMuted }]}>
            Couldn't load your family info. Pull down to retry.
          </Text>
          <Pressable
            onPress={() => {
              setLoadError(false);
              setLoading(true);
              loadFamilyMembers();
            }}
            style={styles.retryButton}
          >
            <Text style={[styles.retryButtonText, { color: colors.green }]}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Your Family</Text>
          <Users size={24} color="#E07B5A" />
        </View>

        {/* Kids Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: "#E07B5A" }]}>Kids</Text>
            <Pressable
              style={styles.addBtn}
              onPress={openAddChildModal}
            >
              <Plus size={16} color="#7CB87A" />
              <Text style={styles.addBtnText}>Add Child</Text>
            </Pressable>
          </View>

          {children.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No kids added yet</Text>
            </View>
          ) : (
            children.map((child) => (
              <View key={child.id} style={styles.memberCard}>
                <View style={styles.memberCardHeader}>
                  <View>
                    <Text style={styles.memberName}>{child.name}</Text>
                    {child.age && (
                      <Text style={styles.memberSubtext}>{child.age} years old</Text>
                    )}
                    {child.school_name && (
                      <Text style={styles.memberSubtext}>{child.school_name}</Text>
                    )}
                  </View>
                  <View style={styles.memberActions}>
                    <Pressable
                      onPress={() => deleteChild(child.id, child.name)}
                      hitSlop={12}
                    >
                      <Trash2 size={16} color="rgba(240, 237, 230, 0.3)" />
                    </Pressable>
                  </View>
                </View>

                {/* Allergies */}
                {child.allergies && child.allergies.length > 0 && (
                  <View style={styles.allergiesRow}>
                    {child.allergies.map((allergy, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.allergyChip,
                          { backgroundColor: SEVERITY_COLOR[allergy.severity] },
                        ]}
                      >
                        <Text
                          style={[
                            styles.allergyText,
                            { color: SEVERITY_TEXT_COLOR[allergy.severity] },
                          ]}
                        >
                          {allergy.allergen}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Activities */}
                {child.activities && child.activities.length > 0 && (
                  <View style={styles.activitiesRow}>
                    {child.activities.slice(0, 2).map((activity, idx) => (
                      <Text key={idx} style={styles.activityBadge}>
                        {activity.name}
                      </Text>
                    ))}
                    {child.activities.length > 2 && (
                      <Text style={styles.activityBadge}>
                        +{child.activities.length - 2} more
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* Pets Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: "#D4748A" }]}>Pets</Text>
            <Pressable
              style={styles.addBtn}
              onPress={openAddPetModal}
            >
              <Plus size={16} color="#7CB87A" />
              <Text style={styles.addBtnText}>Add Pet</Text>
            </Pressable>
          </View>

          {pets.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No pets added yet</Text>
            </View>
          ) : (
            pets.map((pet) => (
              <View key={pet.id} style={styles.memberCard}>
                <View style={styles.memberCardHeader}>
                  <View style={styles.petInfoRow}>
                    <Text style={styles.petEmoji}>
                      {SPECIES_EMOJI[pet.species.toLowerCase()] || "🐾"}
                    </Text>
                    <View>
                      <Text style={styles.memberName}>{pet.name}</Text>
                      {pet.breed && (
                        <Text style={styles.memberSubtext}>{pet.breed}</Text>
                      )}
                      {pet.vet_name && (
                        <Text style={styles.memberSubtext}>Vet: {pet.vet_name}</Text>
                      )}
                    </View>
                  </View>
                  <Pressable
                    onPress={() => deletePet(pet.id, pet.name)}
                    hitSlop={12}
                  >
                    <Trash2 size={16} color="rgba(240, 237, 230, 0.3)" />
                  </Pressable>
                </View>

                {/* Next Vet Appointment */}
                {pet.vet_next_appointment && (
                  <View style={styles.vetRow}>
                    <Activity size={14} color="#7AADCE" />
                    <Text style={styles.vetText}>
                      Vet: {new Date(pet.vet_next_appointment).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                {/* Medications */}
                {pet.medications && pet.medications.length > 0 && (
                  <View style={styles.medicationsRow}>
                    {pet.medications
                      .filter((m) => m.active)
                      .slice(0, 2)
                      .map((med, idx) => (
                        <Text key={idx} style={styles.medicationBadge}>
                          {med.name}
                        </Text>
                      ))}
                    {pet.medications.filter((m) => m.active).length > 2 && (
                      <Text style={styles.medicationBadge}>
                        +{pet.medications.filter((m) => m.active).length - 2}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* ─── Add Child Modal ──────────────────────────────────────────────────── */}
      <Modal
        visible={modalType === "add-child"}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Child</Text>
              <Pressable onPress={closeModal} hitSlop={12}>
                <X size={18} color="rgba(240, 237, 230, 0.4)" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Name */}
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceSubtle }]}
                value={childName}
                onChangeText={setChildName}
                placeholder="e.g. Emma"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />

              {/* Age */}
              <Text style={styles.fieldLabel}>Age</Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceSubtle }]}
                value={childAge}
                onChangeText={setChildAge}
                placeholder="e.g. 7"
                keyboardType="number-pad"
                placeholderTextColor={colors.textMuted}
              />

              {/* School */}
              <Text style={styles.fieldLabel}>School <Text style={styles.fieldOptional}>(optional)</Text></Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceSubtle }]}
                value={childSchool}
                onChangeText={setChildSchool}
                placeholder="e.g. Lincoln Elementary"
                placeholderTextColor={colors.textMuted}
              />

              {/* Allergies */}
              <Text style={styles.fieldLabel}>Allergies <Text style={styles.fieldOptional}>(select any)</Text></Text>
              <View style={styles.allergyGrid}>
                {["Dairy", "Eggs", "Peanuts", "Tree nuts", "Wheat", "Soy"].map((allergen) => {
                  const isSelected = childAllergies.includes(allergen);
                  return (
                    <Pressable
                      key={allergen}
                      style={[
                        styles.allergyButton,
                        isSelected && {
                          backgroundColor: "rgba(224, 123, 90, 0.2)",
                          borderColor: "#E07B5A",
                        },
                      ]}
                      onPress={() => toggleAllergy(allergen)}
                    >
                      <Text
                        style={[
                          styles.allergyButtonText,
                          isSelected && { color: "#E07B5A", fontWeight: "600" },
                        ]}
                      >
                        {allergen}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Save button */}
              <Pressable
                style={styles.saveBtn}
                onPress={saveChild}
                disabled={!childName.trim() || childSaving}
              >
                <Text style={styles.saveBtnText}>
                  {childSaving ? "Saving..." : "Add Child"}
                </Text>
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Add Pet Modal ──────────────────────────────────────────────────── */}
      <Modal
        visible={modalType === "add-pet"}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Pet</Text>
              <Pressable onPress={closeModal} hitSlop={12}>
                <X size={18} color="rgba(240, 237, 230, 0.4)" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Name */}
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceSubtle }]}
                value={petName}
                onChangeText={setPetName}
                placeholder="e.g. Buddy"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />

              {/* Species */}
              <Text style={styles.fieldLabel}>Species</Text>
              <View style={styles.speciesGrid}>
                {Object.keys(SPECIES_EMOJI).map((species) => {
                  const isSelected = petSpecies === species;
                  return (
                    <Pressable
                      key={species}
                      style={[
                        styles.speciesButton,
                        isSelected && {
                          backgroundColor: "rgba(212, 116, 138, 0.2)",
                          borderColor: "#D4748A",
                        },
                      ]}
                      onPress={() => setPetSpecies(species)}
                    >
                      <Text style={styles.speciesEmoji}>{SPECIES_EMOJI[species]}</Text>
                      <Text
                        style={[
                          styles.speciesText,
                          isSelected && { color: "#D4748A", fontWeight: "600" },
                        ]}
                      >
                        {species.charAt(0).toUpperCase() + species.slice(1)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Breed */}
              <Text style={styles.fieldLabel}>Breed <Text style={styles.fieldOptional}>(optional)</Text></Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceSubtle }]}
                value={petBreed}
                onChangeText={setPetBreed}
                placeholder="e.g. Golden Retriever"
                placeholderTextColor={colors.textMuted}
              />

              {/* Save button */}
              <Pressable
                style={styles.saveBtn}
                onPress={savePet}
                disabled={!petName.trim() || petSaving}
              >
                <Text style={styles.saveBtnText}>
                  {petSaving ? "Saving..." : "Add Pet"}
                </Text>
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontFamily: "Geist", fontSize: 14, textAlign: "center", paddingHorizontal: 32, lineHeight: 22, marginBottom: 16 },
  retryButton: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12, backgroundColor: "rgba(240, 237, 230, 0.06)" },
  retryButtonText: { fontFamily: "Geist-SemiBold", fontSize: 14 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  pageTitle: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 32,
    color: "#F0EDE6",
  },

  section: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: "Geist-SemiBold",
    fontSize: 18,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(124, 184, 122, 0.15)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addBtnText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 13,
    color: "#7CB87A",
  },

  emptyState: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyStateText: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.3)",
  },

  memberCard: {
    backgroundColor: "#141810",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.04)",
  },
  memberCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  memberName: {
    fontFamily: "Geist-SemiBold",
    fontSize: 15,
    color: "#F0EDE6",
  },
  memberSubtext: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.4)",
    marginTop: 2,
  },
  memberActions: {
    flexDirection: "row",
    gap: 12,
  },

  petInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
  },
  petEmoji: {
    fontSize: 24,
    marginTop: 2,
  },

  allergiesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
  allergyChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  allergyText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 12,
  },

  activitiesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
  activityBadge: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.5)",
    backgroundColor: "rgba(122, 173, 206, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  vetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  vetText: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(122, 173, 206, 0.8)",
  },

  medicationsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
  medicationBadge: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.5)",
    backgroundColor: "rgba(212, 116, 138, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(240, 237, 230, 0.04)",
  },
  modalTitle: {
    fontFamily: "Geist-SemiBold",
    fontSize: 18,
    color: "#F0EDE6",
  },
  modalContent: {
    flex: 1,
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 40,
  },

  fieldLabel: {
    fontFamily: "Geist-SemiBold",
    fontSize: 13,
    color: "#F0EDE6",
    marginBottom: 8,
    marginTop: 16,
  },
  fieldOptional: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.3)",
    fontWeight: "normal",
  },

  input: {
    backgroundColor: "#0C0F0A",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Geist",
    fontSize: 14,
  },

  allergyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  allergyButton: {
    flex: 0.5,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.1)",
    alignItems: "center",
  },
  allergyButtonText: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.4)",
  },

  speciesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  speciesButton: {
    flex: 0.5,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.1)",
    alignItems: "center",
  },
  speciesEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  speciesText: {
    fontFamily: "Geist",
    fontSize: 11,
    color: "rgba(240, 237, 230, 0.4)",
  },

  saveBtn: {
    marginTop: 32,
    backgroundColor: "#7CB87A",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 15,
    color: "#0C0F0A",
  },
});
