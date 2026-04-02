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
  MessageCircle,
  UtensilsCrossed,
  Wallet,
  Calendar,
  Sparkles,
  ChevronRight,
  TrendingUp,
  CloudSun,
  Sun,
  Cloud,
  CloudRain,
  ShoppingCart,
  CheckCircle2,
  Circle,
  ArrowRight,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { formatFamilyName, getGreeting } from "../../lib/utils";
import FloatingOrbs from "../../components/ui/FloatingOrbs";
import OnboardingSurvey from "../../components/onboarding/OnboardingSurvey";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
  });
  const [refreshing, setRefreshing] = useState(false);

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

    const [
      { data: profile },
      { data: prefs },
      { data: lastChat },
      { data: income },
    ] = await Promise.all([
      supabase.from("profiles").select("family_name, parent_role").eq("id", user.id).single(),
      supabase.from("onboarding_preferences").select("*").eq("profile_id", user.id).single(),
      supabase.from("conversations").select("content").eq("profile_id", user.id).eq("role", "user").order("created_at", { ascending: false }).limit(1).single(),
      supabase.from("household_income").select("monthly_income").eq("profile_id", user.id).single(),
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

    setDailyData({
      lastChatTopic: lastChat?.content?.slice(0, 60) || null,
      todaysMeals: [],
      groceryReminder: false,
      budgetSpent: 0,
      budgetTotal: income?.monthly_income || 0,
      calendarEvents: [],
    });
  }

  async function onRefresh() {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadAll();
    setRefreshing(false);
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

        {/* ── KIN AI CARD ── */}
        {animatedCard(
          0,
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
          1,
          <Pressable
            style={({ pressed }) => [styles.summaryCard, pressed && { opacity: 0.9 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/settings");
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
                    No events today. Connect your calendar in Settings.
                  </Text>
                )}
              </View>
              <ChevronRight size={16} color="rgba(240, 237, 230, 0.12)" />
            </View>
          </Pressable>
        )}

        {/* Meals */}
        {animatedCard(
          2,
          <Pressable
            style={({ pressed }) => [styles.summaryCard, pressed && { opacity: 0.9 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/meals");
            }}
          >
            <View style={styles.summaryRow}>
              <View style={[styles.summaryIcon, { backgroundColor: "rgba(212, 168, 67, 0.12)" }]}>
                <UtensilsCrossed size={18} color="#D4A843" />
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
          3,
          <Pressable
            style={({ pressed }) => [styles.summaryCard, pressed && { opacity: 0.9 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/budget");
            }}
          >
            <View style={styles.summaryRow}>
              <View style={[styles.summaryIcon, { backgroundColor: "rgba(160, 126, 200, 0.12)" }]}>
                <Wallet size={18} color="#A07EC8" />
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
              4,
              <OnboardingSurvey
                onComplete={() => loadAll()}
                onProgress={(pct) => {
                  // Survey progress is handled by the component
                }}
              />
            )}
          </>
        )}

        {/* ── QUICK ACTIONS ── */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.actionsRow}>
          {[
            { icon: MessageCircle, label: "Chat", color: "#7CB87A", route: "/(tabs)/chat" as const },
            { icon: UtensilsCrossed, label: "Meals", color: "#D4A843", route: "/(tabs)/meals" as const },
            { icon: Wallet, label: "Budget", color: "#A07EC8", route: "/(tabs)/budget" as const },
            { icon: Calendar, label: "Calendar", color: "#7AADCE", route: "/(tabs)/settings" as const },
          ].map((action, i) =>
            animatedCard(
              5 + i,
              <Pressable
                style={({ pressed }) => [
                  styles.quickAction,
                  pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(action.route);
                }}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}18` }]}>
                  <action.icon size={20} color={action.color} />
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </Pressable>,
              action.label
            )
          )}
        </View>
      </ScrollView>
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

  // Quick actions
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 20,
  },
  quickAction: {
    alignItems: "center",
    flex: 1,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  quickActionLabel: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.35)",
  },
});
