import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  UtensilsCrossed,
  Wallet,
  Calendar,
  Sparkles,
  ChevronRight,
  ArrowRight,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { formatFamilyName, getGreeting } from "../../lib/utils";
import FloatingOrbs from "../../components/ui/FloatingOrbs";
import OnboardingSurvey from "../../components/onboarding/OnboardingSurvey";
import CalendarConnectModal from "../../components/onboarding/CalendarConnectModal";
import { saveOnboardingData, type OnboardingData } from "../../components/onboarding/save-onboarding";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Returns the ISO date string for the first day of the current calendar month
function getMonthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
}

interface StoredMealOptions {
  breakfast_options?: { name: string }[];
  lunch_options?: { name: string }[];
  dinner_options?: { name: string }[];
}

// Onboarding questions for progressive profile building
const ONBOARDING_QUESTIONS = [
  { id: "family_name", label: "What's your family name?", done: false },
  { id: "parent_role", label: "Are you mom or dad?", done: false },
  { id: "household_type", label: "Household type?", done: false },
  { id: "kids", label: "Tell us about your kids", done: false },
  { id: "grocery_budget", label: "Weekly grocery budget?", done: false },
  { id: "dietary", label: "Any dietary preferences?", done: false },
  { id: "nutrition_goals", label: "Nutrition goals?", done: false },
  { id: "food_loves", label: "Foods your family loves?", done: false },
  { id: "food_dislikes", label: "Foods to avoid?", done: false },
  { id: "stores", label: "Where do you shop?", done: false },
  { id: "calendar", label: "Connect your calendar", done: false },
  { id: "partner", label: "Invite your partner", done: false },
  { id: "pets", label: "Any pets?", done: false },
  { id: "date_night", label: "Date night preferences?", done: false },
  { id: "morning_routine", label: "Morning routine?", done: false },
  { id: "bedtime", label: "Kids' bedtimes?", done: false },
  { id: "allergies", label: "Any allergies?", done: false },
  { id: "meal_prep", label: "Meal prep day?", done: false },
  { id: "budget_goals", label: "Savings goals?", done: false },
  { id: "communication", label: "How should Kin check in?", done: false },
  { id: "priorities", label: "Top 3 family priorities?", done: false },
];

interface ProfileData {
  familyName: string;
  onboardingComplete: number; // percentage
  questionsAnswered: string[];
}

interface DailyData {
  lastChatTopic: string | null;
  todaysMeals: string[];
  groceryReminder: boolean;
  budgetSpent: number;
  budgetTotal: number;
  calendarEvents: { title: string; time: string }[];
  morningBriefingContent: string | null;
  morningBriefingStatus: "generated" | "sent" | "failed" | "none";
}

export default function Dashboard() {
  const router = useRouter();
  const [profileData, setProfileData] = useState<ProfileData>({
    familyName: "",
    onboardingComplete: 0,
    questionsAnswered: [],
  });
  const [dailyData, setDailyData] = useState<DailyData>({
    lastChatTopic: null,
    todaysMeals: [],
    groceryReminder: false,
    budgetSpent: 0,
    budgetTotal: 0,
    calendarEvents: [],
    morningBriefingContent: null,
    morningBriefingStatus: "none",
  });
  const [refreshing, setRefreshing] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const cardAnims = useRef(
    Array.from({ length: 8 }, () => new Animated.Value(0))
  ).current;
  const cardSlides = useRef(
    Array.from({ length: 8 }, () => new Animated.Value(30))
  ).current;

  useEffect(() => {
    loadAll();
    startAnimations();
  }, []);

  function startAnimations() {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse sparkle
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Stagger cards
    cardAnims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: 200 + i * 80,
        useNativeDriver: true,
      }).start();
    });
    cardSlides.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: 0,
        duration: 400,
        delay: 200 + i * 80,
        useNativeDriver: true,
      }).start();
    });
  }

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const monthStart = getMonthStart();

    const todayDate = new Date().toISOString().split("T")[0];

    const [
      { data: profile },
      { data: prefs },
      { data: lastChat },
      { data: income },
      { data: txData },
      { data: mealPlan },
      { data: todayBriefing },
    ] = await Promise.all([
      supabase.from("profiles").select("family_name, parent_role").eq("id", user.id).single(),
      supabase.from("onboarding_preferences").select("*").eq("profile_id", user.id).single(),
      supabase.from("conversations").select("content").eq("profile_id", user.id).eq("role", "user").order("created_at", { ascending: false }).limit(1).single(),
      supabase.from("household_income").select("monthly_income").eq("profile_id", user.id).single(),
      // Sum all transaction amounts for the current calendar month (#65)
      supabase.from("transactions").select("amount").eq("profile_id", user.id).gte("date", monthStart),
      // Latest persisted meal plan to surface today's meals (#10)
      supabase.from("meal_plans").select("meal_options").eq("profile_id", user.id).order("generated_at", { ascending: false }).limit(1).single(),
      // Today's morning briefing
      supabase.from("morning_briefings").select("content, delivery_status").eq("profile_id", user.id).eq("briefing_date", todayDate).single(),
    ]);

    // Calculate onboarding progress
    const answered: string[] = [];
    if (profile?.family_name) answered.push("family_name");
    if (profile?.parent_role) answered.push("parent_role");
    if (prefs?.dietary_preferences?.length > 0) answered.push("dietary");
    if (prefs?.food_loves?.length > 0) answered.push("food_loves");
    if (prefs?.food_dislikes?.length > 0) answered.push("food_dislikes");
    if (prefs?.preferred_stores?.length > 0) answered.push("stores");
    if (prefs?.nutrition_goal) answered.push("nutrition_goals");
    if (prefs?.weekly_grocery_budget > 0) answered.push("grocery_budget");

    setProfileData({
      familyName: profile?.family_name || "",
      onboardingComplete: Math.round((answered.length / ONBOARDING_QUESTIONS.length) * 100),
      questionsAnswered: answered,
    });

    // Sum this month's transactions for real budgetSpent (#65)
    const budgetSpent = txData
      ? txData.reduce((sum, t) => sum + Number(t.amount), 0)
      : 0;

    // Extract today's meals from the latest stored meal plan (#10)
    // Show one representative meal per category (breakfast / lunch / dinner)
    const todaysMeals: string[] = [];
    if (mealPlan?.meal_options) {
      const opts = mealPlan.meal_options as StoredMealOptions;
      if (opts.breakfast_options?.[0]?.name) todaysMeals.push(`Breakfast: ${opts.breakfast_options[0].name}`);
      if (opts.lunch_options?.[0]?.name)     todaysMeals.push(`Lunch: ${opts.lunch_options[0].name}`);
      if (opts.dinner_options?.[0]?.name)    todaysMeals.push(`Dinner: ${opts.dinner_options[0].name}`);
    }

    setDailyData({
      lastChatTopic: lastChat?.content?.slice(0, 60) || null,
      todaysMeals,
      groceryReminder: false,
      budgetSpent,
      budgetTotal: income?.monthly_income || 0,
      calendarEvents: [],
      morningBriefingContent: todayBriefing?.content || null,
      morningBriefingStatus: todayBriefing?.delivery_status || "none",
    });
  }

  async function onRefresh() {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadAll();
    setRefreshing(false);
  }

  async function handleOnboardingComplete(data: OnboardingData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const result = await saveOnboardingData(user.id, data);
    if (result.success) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      loadAll();
      // B6: Show calendar connect prompt after successful onboarding
      setShowCalendarModal(true);
    } else {
      console.error("Onboarding save error:", result.error);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }

  const greeting = getGreeting();
  const displayName = formatFamilyName(profileData.familyName);
  const nextQuestion = ONBOARDING_QUESTIONS.find(
    (q) => !profileData.questionsAnswered.includes(q.id)
  );

  function animatedCard(index: number, children: React.ReactNode, key?: string) {
    return (
      <Animated.View
        key={key}
        style={{
          opacity: cardAnims[Math.min(index, cardAnims.length - 1)],
          transform: [{ translateY: cardSlides[Math.min(index, cardSlides.length - 1)] }],
        }}
      >
        {children}
      </Animated.View>
    );
  }

  /**
   * Renders morning briefing content as structured beats.
   * Splits on sentence boundaries so each thought gets its own line with a
   * green accent dot — first sentence uses Instrument Serif italic as the hook.
   */
  function renderBriefingBeats(content: string) {
    const raw = content.trim();
    const sentences = raw.split(/\.\s+/).map((s) => s.trim()).filter(Boolean);
    if (sentences.length <= 1) {
      return <Text style={styles.briefingText}>{raw}</Text>;
    }
    const [hook, ...beats] = sentences;
    return (
      <>
        <Text style={styles.briefingHookText}>{hook}.</Text>
        {beats.map((beat, i) => (
          <View key={i} style={styles.briefingBeatRow}>
            <View style={styles.briefingBeatDot} />
            <Text style={styles.briefingBeatText}>
              {beat}{beat.endsWith("?") || beat.endsWith("!") ? "" : "."}
            </Text>
          </View>
        ))}
      </>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FloatingOrbs />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7CB87A" />
        }
      >
        {/* ── HEADER ── */}
        <Animated.View
          style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <Animated.View style={[styles.sparkleOrb, { transform: [{ scale: pulseAnim }] }]}>
            <Sparkles size={20} color="#7CB87A" />
          </Animated.View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.familyName}>{displayName}</Text>
        </Animated.View>

        {/* ── MORNING BRIEFING CARD ── */}
        {animatedCard(
          0,
          <View style={styles.briefingCard}>
            {dailyData.morningBriefingContent ? (
              <>
                {/* Title row: "Morning" + live pill */}
                <View style={styles.briefingTitleRow}>
                  <Text style={styles.briefingTitle}>Morning</Text>
                  <View style={styles.briefingLivePill}>
                    <View style={styles.briefingLiveDot} />
                    <Text style={styles.briefingLiveLabel}>Today</Text>
                  </View>
                </View>
                {renderBriefingBeats(dailyData.morningBriefingContent)}
              </>
            ) : (
              <>
                <Text style={styles.briefingTitle}>Morning Briefing</Text>
                {/* Dimmed preview so users know exactly what they're unlocking */}
                <View style={styles.briefingPreviewContainer}>
                  <Text style={styles.briefingPreviewText} numberOfLines={3}>
                    "Leave by 5:55 — traffic on 315. Your 9:30 sync is in 3 hours. You're $23 under grocery budget. Chipotle?"
                  </Text>
                </View>
                <Text style={styles.briefingPromptText}>
                  Arrives at 6am, built from your calendar and life context.
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.connectCalendarBtn, pressed && { opacity: 0.85 }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push("/(tabs)/settings");
                  }}
                >
                  <Calendar size={16} color="#0C0F0A" />
                  <Text style={styles.connectCalendarBtnText}>Connect Calendar</Text>
                </Pressable>
              </>
            )}
          </View>
        )}

        {/* ── KIN AI CARD ── */}
        {animatedCard(
          1,
          <Pressable
            style={({ pressed }) => [styles.kinCard, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/chat");
            }}
          >
            <View style={styles.kinRow}>
              <View style={styles.kinAvatar}>
                <Sparkles size={18} color="#7CB87A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.kinTitle}>Chat with Kin</Text>
                <Text style={styles.kinMessage}>
                  {dailyData.lastChatTopic
                    ? `Last: "${dailyData.lastChatTopic}..."`
                    : "Ask about meals, budget, scheduling, or anything"}
                </Text>
              </View>
              <ArrowRight size={18} color="#7CB87A" />
            </View>
          </Pressable>
        )}

        {/* ── TODAY'S OVERVIEW ── */}
        <Text style={styles.sectionTitle}>Today</Text>

        {/* Calendar / Schedule */}
        {animatedCard(
          2,
          <Pressable
            style={({ pressed }) => [styles.summaryCard, pressed && { opacity: 0.9 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // If no events loaded, open calendar connect flow directly — not Settings
              if (dailyData.calendarEvents.length === 0) {
                setShowCalendarModal(true);
              } else {
                router.push("/(tabs)/settings");
              }
            }}
          >
            <View style={styles.summaryRow}>
              <View style={[styles.summaryIcon, { backgroundColor: "rgba(122, 173, 206, 0.12)" }]}>
                <Calendar size={18} color="#7AADCE" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryLabel}>Schedule</Text>
                {dailyData.calendarEvents.length > 0 ? (
                  dailyData.calendarEvents.map((event, i) => (
                    <Text key={i} style={styles.summaryValue}>
                      {event.time} - {event.title}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.summaryValueMuted}>
                    Tap to connect your calendar
                  </Text>
                )}
              </View>
              <ChevronRight size={16} color="rgba(240, 237, 230, 0.12)" />
            </View>
          </Pressable>
        )}

        {/* Meals */}
        {animatedCard(
          3,
          <Pressable
            style={({ pressed }) => [styles.summaryCard, pressed && { opacity: 0.9 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/meals");
            }}
          >
            <View style={styles.summaryRow}>
              <View style={[styles.summaryIcon, { backgroundColor: "rgba(124, 184, 122, 0.12)" }]}>
                <UtensilsCrossed size={18} color="#7CB87A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryLabel}>Meals</Text>
                {dailyData.todaysMeals.length > 0 ? (
                  dailyData.todaysMeals.map((meal, i) => (
                    <Text key={i} style={styles.summaryValue}>{meal}</Text>
                  ))
                ) : (
                  <Text style={styles.summaryValueMuted}>
                    Set up your meal plan to see today's meals
                  </Text>
                )}
              </View>
              <ChevronRight size={16} color="rgba(240, 237, 230, 0.12)" />
            </View>
          </Pressable>
        )}

        {/* Budget */}
        {animatedCard(
          4,
          <Pressable
            style={({ pressed }) => [styles.summaryCard, pressed && { opacity: 0.9 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/budget");
            }}
          >
            <View style={styles.summaryRow}>
              <View style={[styles.summaryIcon, { backgroundColor: "rgba(212, 168, 67, 0.12)" }]}>
                <Wallet size={18} color="#D4A843" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryLabel}>Budget</Text>
                {dailyData.budgetTotal > 0 ? (
                  <Text style={styles.summaryValue}>
                    ${dailyData.budgetSpent.toLocaleString()} of ${dailyData.budgetTotal.toLocaleString()}/mo
                  </Text>
                ) : (
                  <Text style={styles.summaryValueMuted}>
                    Set up your income to start tracking
                  </Text>
                )}
              </View>
              <ChevronRight size={16} color="rgba(240, 237, 230, 0.12)" />
            </View>
          </Pressable>
        )}

        {/* ── GETTING TO KNOW YOU ── */}
        {profileData.onboardingComplete < 100 && (
          <>
            <Text style={styles.sectionTitle}>Getting to know you</Text>
            {animatedCard(
              5,
              <OnboardingSurvey
                onComplete={handleOnboardingComplete}
              />
            )}
          </>
        )}

        {/* Quick Actions removed — all domains are one tap away in the tab bar */}
      </ScrollView>

      {/* B6 — Calendar connect prompt shown after onboarding */}
      <CalendarConnectModal
        visible={showCalendarModal}
        onDismiss={() => setShowCalendarModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0C0F0A" },
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 120 },

  // Header
  header: { alignItems: "center", marginTop: 12, marginBottom: 24 },
  sparkleOrb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(124, 184, 122, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#7CB87A",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  greeting: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.3)",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  familyName: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 30,
    color: "#F0EDE6",
    textAlign: "center",
  },

  // Morning Briefing Card
  briefingCard: {
    backgroundColor: "#141810",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(124, 184, 122, 0.18)",
    shadowColor: "#7CB87A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  briefingTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  briefingTitle: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 20,
    color: "#7CB87A",
    marginBottom: 12,
  },
  briefingLivePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(124, 184, 122, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  briefingLiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#7CB87A",
  },
  briefingLiveLabel: {
    fontFamily: "GeistMono-Regular",
    fontSize: 10,
    color: "rgba(124, 184, 122, 0.8)",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  briefingHookText: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 18,
    color: "#F0EDE6",
    lineHeight: 26,
    marginBottom: 10,
  },
  briefingBeatRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 7,
    alignItems: "flex-start",
  },
  briefingBeatDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(124, 184, 122, 0.5)",
    marginTop: 9,
    flexShrink: 0,
  },
  briefingBeatText: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.82)",
    lineHeight: 22,
    flex: 1,
  },
  briefingText: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "#F0EDE6",
    lineHeight: 22,
  },
  briefingPreviewContainer: {
    backgroundColor: "rgba(240, 237, 230, 0.03)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.06)",
  },
  briefingPreviewText: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.22)",
    lineHeight: 22,
  },
  briefingPromptText: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.38)",
    lineHeight: 18,
    marginBottom: 14,
  },
  connectCalendarBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#7CB87A",
  },
  connectCalendarBtnText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 13,
    color: "#0C0F0A",
  },

  // Kin Card
  kinCard: {
    backgroundColor: "#141810",
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(124, 184, 122, 0.1)",
  },
  kinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  kinAvatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(124, 184, 122, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  kinTitle: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 18,
    color: "#7CB87A",
    marginBottom: 2,
  },
  kinMessage: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.35)",
    lineHeight: 18,
  },

  // Section
  sectionTitle: {
    fontFamily: "GeistMono-Regular",
    fontSize: 11,
    color: "rgba(240, 237, 230, 0.2)",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 10,
    marginTop: 4,
  },

  // Summary cards
  summaryCard: {
    backgroundColor: "#141810",
    borderRadius: 18,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.04)",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryLabel: {
    fontFamily: "Geist-SemiBold",
    fontSize: 14,
    color: "#F0EDE6",
    marginBottom: 2,
  },
  summaryValue: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.5)",
    lineHeight: 18,
  },
  summaryValueMuted: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.2)",
    lineHeight: 18,
    fontStyle: "italic",
  },

  // Onboarding
  onboardingCard: {
    backgroundColor: "#141810",
    borderRadius: 22,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(124, 184, 122, 0.08)",
  },
  onboardingHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginBottom: 10,
  },
  onboardingPercent: {
    fontFamily: "Geist-SemiBold",
    fontSize: 28,
    color: "#7CB87A",
  },
  onboardingLabel: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.3)",
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(240, 237, 230, 0.06)",
    marginBottom: 16,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: "#7CB87A",
  },

  // Next question
  nextQuestionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(124, 184, 122, 0.08)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(124, 184, 122, 0.12)",
  },
  nextQuestionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  nextQuestionText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 14,
    color: "#7CB87A",
  },

  // Question list
  questionList: { gap: 8 },
  questionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  questionLabel: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.2)",
  },
  questionLabelDone: {
    color: "rgba(240, 237, 230, 0.4)",
    textDecorationLine: "line-through",
  },
  moreQuestions: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.15)",
    marginTop: 4,
    fontStyle: "italic",
  },

});
