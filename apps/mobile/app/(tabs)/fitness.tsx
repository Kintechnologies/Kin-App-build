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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  Dumbbell,
  Plus,
  X,
  Lock,
  TrendingUp,
  Calendar,
  Check,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FitnessProfile {
  profile_id: string;
  goal: string;
  current_weight_lbs?: number;
  target_weight_lbs?: number;
}

interface WorkoutSession {
  id: string;
  workout_date: string;
  exercises: Array<{
    name: string;
    sets?: number;
    reps?: number;
    weight?: number;
  }>;
  duration_minutes?: number;
  notes?: string;
}

type ModalType = "setup" | "log-workout" | null;

const COMMON_EXERCISES = [
  "Bench Press",
  "Squat",
  "Deadlift",
  "Barbell Row",
  "Pull-ups",
  "Dips",
  "Overhead Press",
  "Leg Press",
  "Bicep Curl",
  "Tricep Dips",
  "Lat Pulldown",
  "Chest Fly",
  "Shoulder Press",
  "Leg Curl",
  "Leg Extension",
  "Ab Wheel",
  "Planks",
  "Running",
  "Cycling",
  "Swimming",
];

const GOALS = [
  { label: "Gain Muscle", color: "#E07B5A" },
  { label: "Lose Weight", color: "#D4A843" },
  { label: "Build Strength", color: "#7CB87A" },
  { label: "Improve Endurance", color: "#7AADCE" },
  { label: "General Fitness", color: "#D4748A" },
];

// ─── Component ────────────────────────────────────────────────────────────────

// ─── Progressive Overload Types ───────────────────────────────────────────────

interface OverloadSuggestion {
  exercise: string;
  currentWeight: number;
  suggestedWeight: number;
  currentReps: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Fitness() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [fitnessProfile, setFitnessProfile] = useState<FitnessProfile | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);

  // Progressive overload suggestions — cleared when dismissed
  const [overloadSuggestions, setOverloadSuggestions] = useState<OverloadSuggestion[]>([]);

  // Modal
  const [modalType, setModalType] = useState<ModalType>(null);

  // Setup form
  const [setupGoal, setSetupGoal] = useState("");
  const [setupCurrentWeight, setSetupCurrentWeight] = useState("");
  const [setupTargetWeight, setSetupTargetWeight] = useState("");
  const [setupSaving, setSetupSaving] = useState(false);

  // Workout log form
  const [logExercise, setLogExercise] = useState("");
  const [logSets, setLogSets] = useState("");
  const [logReps, setLogReps] = useState("");
  const [logWeight, setLogWeight] = useState("");
  const [logDuration, setLogDuration] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [logExercises, setLogExercises] = useState<
    Array<{ name: string; sets?: number; reps?: number; weight?: number }>
  >([]);
  const [logSaving, setLogSaving] = useState(false);
  // Quick-log UI: toggles inline custom-exercise input
  const [showCustomInput, setShowCustomInput] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadFitnessData();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  async function loadFitnessData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    try {
      // Load fitness profile
      const { data: profile } = await supabase
        .from("fitness_profiles")
        .select("*")
        .eq("profile_id", user.id)
        .single();

      if (profile) {
        setFitnessProfile(profile);
      }

      // Load recent workouts (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const startDate = sevenDaysAgo.toISOString().split("T")[0];

      const { data: sessions } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("profile_id", user.id)
        .gte("workout_date", startDate)
        .order("workout_date", { ascending: false });

      if (sessions) {
        setWorkouts(sessions);
      }
    } catch (e) {
      if (__DEV__) console.error("Error loading fitness data:", e);
    } finally {
      setLoading(false);
    }
  }

  function openSetupModal() {
    setSetupGoal("");
    setSetupCurrentWeight("");
    setSetupTargetWeight("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModalType("setup");
  }

  function openLogModal() {
    setLogExercise("");
    setLogSets("");
    setLogReps("");
    setLogWeight("");
    setLogDuration("");
    setLogNotes("");
    setLogExercises([]);
    setShowCustomInput(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModalType("log-workout");
  }

  function closeModal() {
    Keyboard.dismiss();
    setModalType(null);
  }

  function addExercise() {
    if (!logExercise.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLogExercises((prev) => [
      ...prev,
      {
        name: logExercise.trim(),
        sets: logSets ? parseInt(logSets, 10) : undefined,
        reps: logReps ? parseInt(logReps, 10) : undefined,
        weight: logWeight ? parseInt(logWeight, 10) : undefined,
      },
    ]);

    setLogExercise("");
    setLogSets("");
    setLogReps("");
    setLogWeight("");
  }

  function removeExercise(index: number) {
    setLogExercises((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveSetup() {
    if (!setupGoal) return;

    setSetupSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await supabase.from("fitness_profiles").upsert({
        profile_id: user.id,
        goal: setupGoal,
        current_weight_lbs: setupCurrentWeight ? parseInt(setupCurrentWeight, 10) : null,
        target_weight_lbs: setupTargetWeight ? parseInt(setupTargetWeight, 10) : null,
      });

      await loadFitnessData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeModal();
    } catch (e) {
      if (__DEV__) console.error("Error saving fitness profile:", e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSetupSaving(false);
    }
  }

  async function saveWorkout() {
    if (logExercises.length === 0) return;

    setLogSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("workout_sessions").insert({
        profile_id: user.id,
        workout_date: new Date().toISOString().split("T")[0],
        exercises: logExercises,
        duration_minutes: logDuration ? parseInt(logDuration, 10) : null,
        notes: logNotes.trim() || null,
      });

      if (error) throw error;

      // Check for progressive overload suggestions after saving
      const suggestions = await checkProgressiveOverload(
        user.id,
        logExercises
      );
      if (suggestions.length > 0) {
        setOverloadSuggestions(suggestions);
      }

      await loadFitnessData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeModal();
    } catch (e) {
      if (__DEV__) console.error("Error saving workout:", e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLogSaving(false);
    }
  }

  /**
   * C5.3 — Progressive Overload Tracker
   *
   * After each workout save, for every weighted exercise logged today, fetches
   * the last 2 prior sessions containing that exercise and checks whether the
   * user hit their rep count both times without increasing weight. If so,
   * suggests a 5–10 lb weight increase.
   *
   * Logic: if the previous 2 sessions for an exercise both had:
   *   - the same weight as today, AND
   *   - reps >= today's reps (i.e., they hit target twice)
   * → prompt to increase weight.
   */
  async function checkProgressiveOverload(
    userId: string,
    exercisesLogged: Array<{ name: string; sets?: number; reps?: number; weight?: number }>
  ): Promise<OverloadSuggestion[]> {
    const suggestions: OverloadSuggestion[] = [];
    const todayStr = new Date().toISOString().split("T")[0];

    // Only check exercises with weight and reps logged
    const weightedExercises = exercisesLogged.filter(
      (ex) => ex.weight && ex.weight > 0 && ex.reps && ex.reps > 0
    );

    if (weightedExercises.length === 0) return suggestions;

    try {
      // Fetch the last 20 sessions (enough history to find 2 sessions per exercise)
      const { data: sessions } = await supabase
        .from("workout_sessions")
        .select("workout_date, exercises")
        .eq("profile_id", userId)
        .lt("workout_date", todayStr)
        .order("workout_date", { ascending: false })
        .limit(20);

      if (!sessions || sessions.length < 2) return suggestions;

      for (const todayEx of weightedExercises) {
        const exName = todayEx.name.toLowerCase();

        // Find all prior sessions containing this exercise (by name, case-insensitive)
        type ExerciseEntry = { name: string; sets?: number; reps?: number; weight?: number };
        const priorSessions: Array<ExerciseEntry> = [];

        for (const session of sessions as WorkoutSession[]) {
          const match = session.exercises.find(
            (ex) => ex.name.toLowerCase() === exName
          );
          if (match) {
            priorSessions.push(match);
          }
          if (priorSessions.length >= 2) break;
        }

        // Need exactly 2 prior sessions with this exercise
        if (priorSessions.length < 2) continue;

        const [prev1, prev2] = priorSessions; // prev1 = most recent, prev2 = second most recent

        // Check if both prior sessions had same weight as today and >= today's reps
        const todayWeight = todayEx.weight!;
        const todayReps = todayEx.reps!;

        const bothSameWeight =
          prev1.weight === todayWeight && prev2.weight === todayWeight;
        const bothHitReps =
          (prev1.reps ?? 0) >= todayReps && (prev2.reps ?? 0) >= todayReps;

        if (bothSameWeight && bothHitReps) {
          // Suggest 5 lb increase for <100 lbs, 10 lbs for ≥100 lbs
          const increment = todayWeight < 100 ? 5 : 10;
          suggestions.push({
            exercise: todayEx.name,
            currentWeight: todayWeight,
            suggestedWeight: todayWeight + increment,
            currentReps: todayReps,
          });
        }
      }
    } catch (e) {
      // Non-fatal — overload check should never block the workout save
      if (__DEV__) console.error("Progressive overload check failed:", e);
    }

    return suggestions;
  }

  function getWorkoutsThisWeek(): number {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return workouts.filter((w) => new Date(w.workout_date) >= sevenDaysAgo).length;
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T12:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(d);
    checkDate.setHours(0, 0, 0, 0);

    if (checkDate.getTime() === today.getTime()) {
      return "Today";
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

  // ─── No Setup Yet ─────────────────────────────────────────────────────────
  if (!fitnessProfile) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.setupContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.setupCenter, { opacity: fadeAnim }]}>
            <View style={styles.setupIconWrap}>
              <Dumbbell size={28} color="#7AADCE" />
            </View>
            <Text style={styles.setupTitle}>Your Fitness</Text>
            <Text style={styles.setupSubtitle}>
              Track your workouts privately. Your fitness goals and data are personal — never shared with your partner.
            </Text>

            <View style={styles.setupGoalsWrap}>
              {GOALS.map((goal) => (
                <Pressable
                  key={goal.label}
                  style={[
                    styles.goalButton,
                    setupGoal === goal.label && {
                      backgroundColor: `${goal.color}20`,
                      borderColor: goal.color,
                    },
                  ]}
                  onPress={() => setSetupGoal(goal.label)}
                >
                  <Text
                    style={[
                      styles.goalButtonText,
                      setupGoal === goal.label && {
                        color: goal.color,
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {goal.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Optional weight fields */}
            {setupGoal && (
              <View style={styles.optionalFieldsWrap}>
                <Text style={styles.optionalFieldsLabel}>Optional: Track your weight</Text>

                <Text style={styles.fieldLabel}>Current weight (lbs)</Text>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceSubtle }]}
                  value={setupCurrentWeight}
                  onChangeText={setSetupCurrentWeight}
                  placeholder="e.g. 180"
                  keyboardType="number-pad"
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={styles.fieldLabel}>Target weight (lbs)</Text>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceSubtle }]}
                  value={setupTargetWeight}
                  onChangeText={setSetupTargetWeight}
                  placeholder="e.g. 170"
                  keyboardType="number-pad"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            )}

            {/* Save button */}
            <Pressable
              style={[styles.setupButton, !setupGoal && styles.setupButtonDisabled]}
              onPress={saveSetup}
              disabled={!setupGoal || setupSaving}
            >
              <Text style={styles.setupButtonText}>
                {setupSaving ? "Saving..." : "Get Started"}
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with privacy badge */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>Your Fitness</Text>
            <View style={styles.privateBadge}>
              <Lock size={12} color="#7AADCE" />
              <Text style={styles.privateBadgeText}>Private — not shared</Text>
            </View>
          </View>
          <Dumbbell size={24} color="#7AADCE" />
        </View>

        {/* Goal & Weight Progress */}
        <View style={styles.goalCard}>
          <View style={styles.goalCardHeader}>
            <Text style={styles.goalCardTitle}>{fitnessProfile.goal}</Text>
            <TrendingUp size={18} color="#7AADCE" />
          </View>

          {fitnessProfile.current_weight_lbs && fitnessProfile.target_weight_lbs && (
            <View style={styles.weightProgress}>
              <View style={styles.weightRow}>
                <View>
                  <Text style={styles.weightLabel}>Current</Text>
                  <Text style={styles.weightValue}>
                    {fitnessProfile.current_weight_lbs} lbs
                  </Text>
                </View>
                <View style={styles.weightArrow}>
                  <Text style={styles.weightArrowText}>→</Text>
                </View>
                <View>
                  <Text style={styles.weightLabel}>Target</Text>
                  <Text style={styles.weightValue}>
                    {fitnessProfile.target_weight_lbs} lbs
                  </Text>
                </View>
              </View>

              {/* Simple progress indicator */}
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${
                        Math.min(
                          ((fitnessProfile.current_weight_lbs -
                            fitnessProfile.target_weight_lbs) /
                            (fitnessProfile.current_weight_lbs -
                              fitnessProfile.target_weight_lbs)) *
                            100,
                          100
                        )
                      }%` as `${number}%`,
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Calendar size={18} color="#7AADCE" />
            <Text style={styles.statValue}>{getWorkoutsThisWeek()}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{workouts.length}</Text>
            <Text style={styles.statLabel}>Last 7 Days</Text>
          </View>
        </View>

        {/* Log Today's Workout */}
        <Pressable
          style={({ pressed }) => [
            styles.logButton,
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
          onPress={openLogModal}
        >
          <Plus size={18} color="#0C0F0A" />
          <Text style={styles.logButtonText}>Log Today's Workout</Text>
        </Pressable>

        {/* Progressive Overload Suggestions */}
        {overloadSuggestions.length > 0 && (
          <View style={styles.overloadCard}>
            <View style={styles.overloadHeader}>
              <TrendingUp size={16} color="#7CB87A" />
              <Text style={styles.overloadTitle}>Ready to level up</Text>
              <Pressable
                onPress={() => setOverloadSuggestions([])}
                hitSlop={12}
              >
                <X size={14} color="rgba(240, 237, 230, 0.4)" />
              </Pressable>
            </View>
            {overloadSuggestions.map((s, idx) => (
              <Text key={idx} style={styles.overloadLine}>
                <Text style={styles.overloadExercise}>{s.exercise}</Text>
                {" — you've hit "}
                <Text style={styles.overloadExercise}>
                  {s.currentReps} reps @ {s.currentWeight}lbs
                </Text>
                {" twice. Try "}
                <Text style={styles.overloadHighlight}>
                  {s.suggestedWeight}lbs
                </Text>
                {" next session."}
              </Text>
            ))}
          </View>
        )}

        {/* Recent Workouts */}
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Recent Workouts</Text>

          {workouts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No workouts logged yet — tap above to start
              </Text>
            </View>
          ) : (
            workouts.map((workout) => (
              <View key={workout.id} style={styles.workoutCard}>
                <View style={styles.workoutHeader}>
                  <Text style={styles.workoutDate}>{formatDate(workout.workout_date)}</Text>
                  {workout.duration_minutes && (
                    <Text style={styles.workoutDuration}>
                      {workout.duration_minutes} min
                    </Text>
                  )}
                </View>

                {/* Exercises */}
                <View style={styles.exercisesWrap}>
                  {workout.exercises.map((ex, idx) => (
                    <View key={idx} style={styles.exerciseRow}>
                      <Text style={styles.exerciseName}>{ex.name}</Text>
                      {(ex.sets || ex.reps || ex.weight) && (
                        <Text style={styles.exerciseMeta}>
                          {ex.sets && `${ex.sets}×${ex.reps || "?"}`}
                          {ex.weight && ` @ ${ex.weight}lbs`}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>

                {workout.notes && (
                  <Text style={styles.workoutNotes}>{workout.notes}</Text>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* ─── Setup/Edit Modal ──────────────────────────────────────────────── */}
      <Modal
        visible={modalType === "setup"}
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
              <Text style={styles.modalTitle}>Update Fitness Goal</Text>
              <Pressable onPress={closeModal} hitSlop={12}>
                <X size={18} color="rgba(240, 237, 230, 0.4)" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.fieldLabel}>Your Goal</Text>
              <View style={styles.goalsGrid}>
                {GOALS.map((goal) => (
                  <Pressable
                    key={goal.label}
                    style={[
                      styles.goalPill,
                      setupGoal === goal.label && {
                        backgroundColor: `${goal.color}20`,
                        borderColor: goal.color,
                      },
                    ]}
                    onPress={() => setSetupGoal(goal.label)}
                  >
                    <Text
                      style={[
                        styles.goalPillText,
                        setupGoal === goal.label && {
                          color: goal.color,
                          fontWeight: "600",
                        },
                      ]}
                    >
                      {goal.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {setupGoal && (
                <View style={styles.optionalFieldsWrap}>
                  <Text style={styles.optionalFieldsLabel}>Optional: Weight tracking</Text>

                  <Text style={styles.fieldLabel}>Current weight (lbs)</Text>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceSubtle }]}
                    value={setupCurrentWeight}
                    onChangeText={setSetupCurrentWeight}
                    placeholder="e.g. 180"
                    keyboardType="number-pad"
                    placeholderTextColor={colors.textMuted}
                  />

                  <Text style={styles.fieldLabel}>Target weight (lbs)</Text>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceSubtle }]}
                    value={setupTargetWeight}
                    onChangeText={setSetupTargetWeight}
                    placeholder="e.g. 170"
                    keyboardType="number-pad"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              )}

              <Pressable
                style={styles.saveBtn}
                onPress={saveSetup}
                disabled={!setupGoal || setupSaving}
              >
                <Text style={styles.saveBtnText}>
                  {setupSaving ? "Saving..." : "Save Goal"}
                </Text>
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Log Workout Modal ────────────────────────────────────────────── */}
      {/*
       * QUICK-LOG REDESIGN (Product & Design — Apr 2026)
       * Old flow: type name → type sets → type reps → type weight → tap "Add" → repeat. Min 5 taps/exercise.
       * New flow: tap chip → exercise added instantly with defaults → enter weight inline → tap Save.
       * Min 2 interactions per exercise (tap chip + weight). Common exercises = 1 tap + weight.
       */}
      <Modal
        visible={modalType === "log-workout"}
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
              <Text style={styles.modalTitle}>Log Workout</Text>
              <Pressable onPress={closeModal} hitSlop={12}>
                <X size={18} color="rgba(240, 237, 230, 0.4)" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* ── Session so far ── */}
              {logExercises.length > 0 && (
                <View style={styles.sessionList}>
                  <Text style={styles.sessionListTitle}>
                    TODAY · {logExercises.length} EXERCISE{logExercises.length !== 1 ? "S" : ""}
                  </Text>
                  {logExercises.map((ex, idx) => (
                    <View key={idx} style={styles.sessionExRow}>
                      <View style={styles.sessionExLeft}>
                        <Text style={styles.sessionExName}>{ex.name}</Text>
                        <Text style={styles.sessionExMeta}>
                          {ex.sets ?? 3}×{ex.reps ?? 8}
                          {ex.weight ? `  ·  ${ex.weight} lbs` : ""}
                        </Text>
                      </View>
                      <View style={styles.sessionExRight}>
                        {/* Inline weight — one field, instant edit */}
                        <TextInput
                          style={styles.inlineWeightInput}
                          value={ex.weight ? String(ex.weight) : ""}
                          onChangeText={(val) => {
                            const w = parseInt(val, 10);
                            setLogExercises((prev) =>
                              prev.map((e, i) =>
                                i === idx ? { ...e, weight: isNaN(w) ? undefined : w } : e
                              )
                            );
                          }}
                          placeholder="lbs"
                          keyboardType="number-pad"
                          placeholderTextColor="rgba(240, 237, 230, 0.2)"
                          maxLength={4}
                        />
                        <Pressable onPress={() => removeExercise(idx)} hitSlop={12}>
                          <X size={14} color="rgba(240, 237, 230, 0.2)" />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                  <View style={styles.sessionDivider} />
                </View>
              )}

              {/* ── Quick-add chips ── */}
              <Text style={styles.quickAddLabel}>
                {logExercises.length === 0 ? "What did you do?" : "Add more"}
              </Text>
              <View style={styles.chipGrid}>
                {COMMON_EXERCISES.slice(0, 16).map((name) => {
                  const added = logExercises.some((e) => e.name === name);
                  return (
                    <Pressable
                      key={name}
                      style={({ pressed }) => [
                        styles.exerciseChip,
                        added && styles.exerciseChipAdded,
                        pressed && !added && { opacity: 0.75 },
                      ]}
                      onPress={() => {
                        if (added) return;
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setLogExercises((prev) => [
                          ...prev,
                          { name, sets: 3, reps: 8, weight: undefined },
                        ]);
                      }}
                    >
                      {added && (
                        <Check
                          size={11}
                          color="#7CB87A"
                          style={{ marginRight: 3 }}
                        />
                      )}
                      <Text
                        style={[
                          styles.exerciseChipText,
                          added && styles.exerciseChipTextAdded,
                        ]}
                      >
                        {name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* ── Custom exercise ── */}
              {showCustomInput ? (
                <View style={styles.customInputRow}>
                  <TextInput
                    style={[styles.customInput, { color: colors.textPrimary }]}
                    value={logExercise}
                    onChangeText={setLogExercise}
                    placeholder="Exercise name..."
                    placeholderTextColor="rgba(240, 237, 230, 0.25)"
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      if (!logExercise.trim()) {
                        setShowCustomInput(false);
                        return;
                      }
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setLogExercises((prev) => [
                        ...prev,
                        { name: logExercise.trim(), sets: 3, reps: 8, weight: undefined },
                      ]);
                      setLogExercise("");
                      setShowCustomInput(false);
                    }}
                  />
                  <Pressable
                    onPress={() => {
                      if (!logExercise.trim()) {
                        setShowCustomInput(false);
                        return;
                      }
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setLogExercises((prev) => [
                        ...prev,
                        { name: logExercise.trim(), sets: 3, reps: 8, weight: undefined },
                      ]);
                      setLogExercise("");
                      setShowCustomInput(false);
                    }}
                    style={styles.customInputAdd}
                    hitSlop={8}
                  >
                    <Plus size={16} color="#7CB87A" />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={styles.customExerciseBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowCustomInput(true);
                  }}
                >
                  <Plus size={14} color="rgba(240, 237, 230, 0.3)" />
                  <Text style={styles.customExerciseBtnText}>Custom exercise</Text>
                </Pressable>
              )}

              {/* ── Duration (optional) ── */}
              <Text style={[styles.fieldLabel, { marginTop: 28 }]}>
                Duration{" "}
                <Text style={styles.fieldOptional}>(minutes, optional)</Text>
              </Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.surfaceSubtle }]}
                value={logDuration}
                onChangeText={setLogDuration}
                placeholder="45"
                keyboardType="number-pad"
                placeholderTextColor={colors.textMuted}
              />

              {/* ── Save ── */}
              <Pressable
                style={[
                  styles.saveBtn,
                  logExercises.length === 0 && styles.saveBtnDisabled,
                  { marginTop: 28 },
                ]}
                onPress={saveWorkout}
                disabled={logExercises.length === 0 || logSaving}
              >
                <Text style={styles.saveBtnText}>
                  {logSaving
                    ? "Saving..."
                    : logExercises.length === 0
                    ? "Add at least one exercise"
                    : `Save ${logExercises.length} exercise${logExercises.length !== 1 ? "s" : ""}`}
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
  setupContent: { paddingHorizontal: 20, paddingBottom: 120, flexGrow: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Setup view
  setupCenter: { flex: 1, justifyContent: "center", alignItems: "center" },
  setupIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: "rgba(122, 173, 206, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  setupTitle: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 30,
    color: "#F0EDE6",
    marginBottom: 8,
  },
  setupSubtitle: {
    fontFamily: "Geist",
    fontSize: 15,
    color: "rgba(240, 237, 230, 0.4)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  setupGoalsWrap: {
    width: "100%",
    gap: 10,
    marginBottom: 24,
  },
  goalButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.1)",
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  goalButtonText: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.4)",
  },
  optionalFieldsWrap: {
    width: "100%",
    marginBottom: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(240, 237, 230, 0.04)",
  },
  optionalFieldsLabel: {
    fontFamily: "Geist-SemiBold",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.3)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  setupButton: {
    width: "100%",
    backgroundColor: "#7AADCE",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  setupButtonDisabled: {
    opacity: 0.5,
  },
  setupButtonText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 15,
    color: "#0C0F0A",
  },

  // Dashboard
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  pageTitle: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 32,
    color: "#F0EDE6",
  },
  privateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  privateBadgeText: {
    fontFamily: "Geist",
    fontSize: 11,
    color: "rgba(122, 173, 206, 0.6)",
  },

  goalCard: {
    backgroundColor: "#141810",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.04)",
  },
  goalCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  goalCardTitle: {
    fontFamily: "Geist-SemiBold",
    fontSize: 16,
    color: "#7AADCE",
  },

  weightProgress: {
    gap: 12,
  },
  weightRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  weightLabel: {
    fontFamily: "Geist",
    fontSize: 11,
    color: "rgba(240, 237, 230, 0.3)",
    marginBottom: 2,
  },
  weightValue: {
    fontFamily: "Geist-SemiBold",
    fontSize: 14,
    color: "#F0EDE6",
  },
  weightArrow: {
    paddingHorizontal: 12,
  },
  weightArrowText: {
    fontSize: 18,
    color: "rgba(240, 237, 230, 0.2)",
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "rgba(240, 237, 230, 0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#7AADCE",
  },

  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#141810",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.04)",
  },
  statValue: {
    fontFamily: "Geist-SemiBold",
    fontSize: 24,
    color: "#7AADCE",
    marginVertical: 4,
  },
  statLabel: {
    fontFamily: "Geist",
    fontSize: 11,
    color: "rgba(240, 237, 230, 0.4)",
  },

  logButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#7AADCE",
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 28,
  },
  logButtonText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 15,
    color: "#0C0F0A",
  },

  // ─── Progressive Overload Card ─────────────────────────────────────────────
  overloadCard: {
    backgroundColor: "rgba(124, 184, 122, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(124, 184, 122, 0.25)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  overloadHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  overloadTitle: {
    fontFamily: "Geist-SemiBold",
    fontSize: 13,
    color: "#7CB87A",
    flex: 1,
  },
  overloadLine: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.7)",
    lineHeight: 20,
    marginBottom: 4,
  },
  overloadExercise: {
    fontFamily: "Geist-SemiBold",
    color: "rgba(240, 237, 230, 0.9)",
  },
  overloadHighlight: {
    fontFamily: "Geist-SemiBold",
    color: "#7CB87A",
  },

  recentSection: {
    marginBottom: 40,
  },
  recentTitle: {
    fontFamily: "Geist-SemiBold",
    fontSize: 16,
    color: "#F0EDE6",
    marginBottom: 12,
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

  workoutCard: {
    backgroundColor: "#141810",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.04)",
  },
  workoutHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  workoutDate: {
    fontFamily: "Geist-SemiBold",
    fontSize: 13,
    color: "#F0EDE6",
  },
  workoutDuration: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.4)",
  },

  exercisesWrap: {
    gap: 6,
    marginBottom: 10,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  exerciseName: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.6)",
  },
  exerciseMeta: {
    fontFamily: "Geist-SemiBold",
    fontSize: 12,
    color: "#7AADCE",
  },

  workoutNotes: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.3)",
    fontStyle: "italic",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(240, 237, 230, 0.04)",
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
    borderColor: "rgba(240, 237, 230, 0.04)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Geist",
    fontSize: 14,
    color: "#F0EDE6",
  },

  metaRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },

  addExerciseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(124, 184, 122, 0.2)",
    backgroundColor: "rgba(124, 184, 122, 0.08)",
  },
  addExerciseBtnDisabled: {
    opacity: 0.5,
  },
  addExerciseBtnText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 13,
    color: "#7CB87A",
  },

  exerciseListWrap: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(240, 237, 230, 0.04)",
  },
  exerciseListTitle: {
    fontFamily: "Geist-SemiBold",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.3)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  exerciseListItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(240, 237, 230, 0.02)",
  },
  exerciseListName: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "#F0EDE6",
  },
  exerciseListMeta: {
    fontFamily: "Geist-SemiBold",
    fontSize: 11,
    color: "rgba(122, 173, 206, 0.7)",
    marginTop: 2,
  },

  // ── Quick-log UI ─────────────────────────────────────────────────────────────

  // Session list (exercises added so far, shown at top of modal)
  sessionList: {
    marginBottom: 20,
  },
  sessionListTitle: {
    fontFamily: "GeistMono-Regular",
    fontSize: 10,
    color: "rgba(240, 237, 230, 0.25)",
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  sessionExRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(240, 237, 230, 0.03)",
  },
  sessionExLeft: {
    flex: 1,
  },
  sessionExName: {
    fontFamily: "Geist-SemiBold",
    fontSize: 14,
    color: "#F0EDE6",
    marginBottom: 2,
  },
  sessionExMeta: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(122, 173, 206, 0.7)",
  },
  sessionExRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  // Inline weight input — compact, single field next to each exercise
  inlineWeightInput: {
    width: 52,
    backgroundColor: "rgba(240, 237, 230, 0.04)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontFamily: "Geist-SemiBold",
    fontSize: 13,
    color: "#F0EDE6",
    textAlign: "center",
  },
  sessionDivider: {
    height: 1,
    backgroundColor: "rgba(240, 237, 230, 0.04)",
    marginTop: 8,
  },

  // Quick-add section
  quickAddLabel: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 18,
    color: "#F0EDE6",
    marginBottom: 14,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  exerciseChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.1)",
    backgroundColor: "rgba(240, 237, 230, 0.04)",
  },
  exerciseChipAdded: {
    borderColor: "rgba(124, 184, 122, 0.35)",
    backgroundColor: "rgba(124, 184, 122, 0.08)",
  },
  exerciseChipText: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.55)",
  },
  exerciseChipTextAdded: {
    color: "#7CB87A",
  },

  // Custom exercise input row
  customExerciseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  customExerciseBtnText: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.3)",
  },
  customInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  customInput: {
    flex: 1,
    backgroundColor: "rgba(240, 237, 230, 0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(124, 184, 122, 0.25)",
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: "Geist",
    fontSize: 14,
  },
  customInputAdd: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(124, 184, 122, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(124, 184, 122, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  goalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  goalPill: {
    flex: 0.48,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.1)",
    alignItems: "center",
  },
  goalPillText: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.4)",
  },

  saveBtn: {
    marginTop: 24,
    backgroundColor: "#7AADCE",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 15,
    color: "#0C0F0A",
  },
});
