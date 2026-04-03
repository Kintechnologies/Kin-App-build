/**
 * Today Screen — Kin v0 coordination intelligence surface.
 *
 * Three layers per ARCH-PIVOT-2026-04-03 + intelligence engine spec:
 *   1. Morning Briefing Card  — fetched from morning_briefings table; max 4 sentences
 *   2. Alert Cards            — coordination_issues with OPEN/ACKNOWLEDGED/RESOLVED state
 *   3. Check-in Cards         — max 2/day, suppressed when High-priority alert is OPEN
 *
 * Silence rule (§7): when no content is worth surfacing, show clean-day state.
 * First-use moment (§21): engineered first insight on first Today screen render.
 */

import { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Sparkles, X, MessageCircle, CheckCircle } from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { getGreeting } from "../../lib/utils";
import FloatingOrbs from "../../components/ui/FloatingOrbs";

// ─── Types ────────────────────────────────────────────────────────────────────

type IssueState = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

interface CoordinationIssue {
  id: string;
  trigger_type: string;
  state: IssueState;
  content: string;
  surfaced_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
}

interface CheckInCard {
  id: string;
  content: string;
  prompt?: string;
  dismissed: boolean;
  conversation_id?: string;
}

interface MorningBriefing {
  content: string;
  briefing_date: string;
  delivery_status: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns today's date as YYYY-MM-DD */
function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Parses briefing content into max-4-sentence beats.
 * Returns null if content is empty.
 */
function parseBriefingBeats(content: string): string[] | null {
  const raw = content.trim();
  if (!raw) return null;
  const sentences = raw
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4); // spec §5: max 4 sentences
  return sentences.length > 0 ? sentences : null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Skeleton placeholder while briefing is loading */
function BriefingSkeletonCard() {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.9, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View style={[styles.briefingCard, { opacity: pulse }]}>
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonLine} />
      <View style={[styles.skeletonLine, { width: "75%" }]} />
      <View style={[styles.skeletonLine, { width: "55%" }]} />
    </Animated.View>
  );
}

/** OPEN/ACKNOWLEDGED/RESOLVED alert card */
function AlertCard({
  issue,
  onAcknowledge,
  onTapToChat,
}: {
  issue: CoordinationIssue;
  onAcknowledge: (id: string) => void;
  onTapToChat: (id: string, content: string) => void;
}) {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (issue.state === "RESOLVED") {
      // Show closure line, then fade out
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }).start();
      }, 1400);
      return () => clearTimeout(timer);
    }
  }, [issue.state]);

  if (issue.state === "RESOLVED") {
    return (
      <Animated.View style={[styles.alertCardResolved, { opacity: fadeAnim }]}>
        <CheckCircle size={14} color="rgba(124, 184, 122, 0.5)" />
        <Text style={styles.alertResolvedText}>Sorted. I'll let you know if anything changes.</Text>
      </Animated.View>
    );
  }

  if (issue.state === "ACKNOWLEDGED") {
    return (
      <View style={styles.alertCardAcknowledged}>
        <Text style={styles.alertAcknowledgedText} numberOfLines={2}>
          {issue.content}
        </Text>
      </View>
    );
  }

  // OPEN — bold, prominent, with action affordances
  return (
    <Pressable
      style={({ pressed }) => [
        styles.alertCardOpen,
        pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onTapToChat(issue.id, issue.content);
      }}
    >
      <View style={styles.alertOpenHeader}>
        <View style={styles.alertOpenDot} />
        <Text style={styles.alertOpenLabel}>Heads up</Text>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onAcknowledge(issue.id);
          }}
          style={({ pressed }) => [styles.alertDismissBtn, pressed && { opacity: 0.6 }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={14} color="rgba(240, 237, 230, 0.4)" />
        </Pressable>
      </View>
      <Text style={styles.alertOpenContent}>{issue.content}</Text>
      <View style={styles.alertOpenFooter}>
        <MessageCircle size={12} color="rgba(124, 184, 122, 0.6)" />
        <Text style={styles.alertOpenCta}>Tap to talk to Kin about this</Text>
      </View>
    </Pressable>
  );
}

/** Proactive check-in card — max 2/day, dismissible */
function CheckInCard({
  card,
  onDismiss,
  onTapToChat,
}: {
  card: CheckInCard;
  onDismiss: (id: string) => void;
  onTapToChat: (content: string) => void;
}) {
  if (card.dismissed) return null;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.checkinCard,
        pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onTapToChat(card.content + (card.prompt ? ` ${card.prompt}` : ""));
      }}
    >
      <View style={styles.checkinRow}>
        <View style={styles.checkinKinOrb}>
          <Sparkles size={13} color="#7CB87A" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.checkinContent}>{card.content}</Text>
          {card.prompt && <Text style={styles.checkinPrompt}>{card.prompt}</Text>}
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onDismiss(card.id);
          }}
          style={({ pressed }) => [styles.checkinDismissBtn, pressed && { opacity: 0.5 }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={13} color="rgba(240, 237, 230, 0.25)" />
        </Pressable>
      </View>
    </Pressable>
  );
}

/** Clean-day state: Today screen when nothing is worth surfacing */
function CleanDayState() {
  return (
    <View style={styles.cleanDayContainer}>
      <Text style={styles.cleanDayText}>Clean day — nothing to stay ahead of.</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TodayScreen() {
  const router = useRouter();

  // Profile
  const [firstName, setFirstName] = useState<string>("");
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Briefing
  const [briefing, setBriefing] = useState<MorningBriefing | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(true);

  // Alerts
  const [issues, setIssues] = useState<CoordinationIssue[]>([]);

  // Check-ins (static seed for now — replaced by real data in Layer 2)
  const [checkins, setCheckins] = useState<CheckInCard[]>([]);

  // First-use flag
  const [isFirstOpen, setIsFirstOpen] = useState(false);

  // Refresh
  const [refreshing, setRefreshing] = useState(false);

  // Entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    loadAll();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 420, useNativeDriver: true }),
    ]).start();
  }, []);

  // Supabase realtime: subscribe to coordination_issues for this household
  useEffect(() => {
    if (!householdId) return;

    const channel = supabase
      .channel(`coordination_issues:${householdId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "coordination_issues",
          filter: `household_id=eq.${householdId}`,
        },
        () => {
          // Re-fetch issues whenever anything changes
          loadIssues(householdId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId]);

  async function loadAll() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setProfileId(user.id);

    // Load profile + household
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, household_id, today_screen_first_opened")
      .eq("id", user.id)
      .single();

    if (profile) {
      setFirstName(profile.first_name || "");
      setHouseholdId(profile.household_id || null);

      // First-use detection: if today_screen_first_opened is null, this is the first open
      if (!profile.today_screen_first_opened) {
        setIsFirstOpen(true);
        // Mark it so it never fires again
        await supabase
          .from("profiles")
          .update({ today_screen_first_opened: new Date().toISOString() })
          .eq("id", user.id);
      }

      if (profile.household_id) {
        await loadIssues(profile.household_id);
      }
    }

    await loadBriefing(user.id);
    await loadCheckins(user.id);
  }

  async function loadBriefing(uid: string) {
    setBriefingLoading(true);
    try {
      const { data } = await supabase
        .from("morning_briefings")
        .select("content, briefing_date, delivery_status")
        .eq("profile_id", uid)
        .eq("briefing_date", todayISO())
        .single();

      setBriefing(data ?? null);
    } catch {
      setBriefing(null);
    } finally {
      setBriefingLoading(false);
    }
  }

  async function loadIssues(hid: string) {
    const { data } = await supabase
      .from("coordination_issues")
      .select(
        "id, trigger_type, state, content, surfaced_at, acknowledged_at, resolved_at"
      )
      .eq("household_id", hid)
      // Show OPEN + ACKNOWLEDGED + recently-resolved (for closure line)
      .in("state", ["OPEN", "ACKNOWLEDGED", "RESOLVED"])
      .order("surfaced_at", { ascending: false })
      .limit(10);

    if (data) {
      // Filter out RESOLVED issues older than 30 seconds (already faded out)
      const thirtySecondsAgo = new Date(Date.now() - 30_000).toISOString();
      const visible = data.filter(
        (i) =>
          i.state !== "RESOLVED" ||
          (i.resolved_at && i.resolved_at > thirtySecondsAgo)
      );
      setIssues(visible as CoordinationIssue[]);
    }
  }

  async function loadCheckins(uid: string) {
    // Spec §10: max 2 check-ins per day.
    // Check-ins come from kin_check_ins table when that is wired up.
    // For now, load today's check-ins from the table if it exists; otherwise empty.
    try {
      const { data } = await supabase
        .from("kin_check_ins")
        .select("id, content, prompt, dismissed")
        .eq("profile_id", uid)
        .eq("check_in_date", todayISO())
        .eq("dismissed", false)
        .order("created_at", { ascending: true })
        .limit(2);

      if (data) {
        setCheckins(data as CheckInCard[]);
      }
    } catch {
      // Table may not exist yet — silently skip
      setCheckins([]);
    }
  }

  async function handleAcknowledge(issueId: string) {
    setIssues((prev) =>
      prev.map((i) =>
        i.id === issueId
          ? { ...i, state: "ACKNOWLEDGED", acknowledged_at: new Date().toISOString() }
          : i
      )
    );

    await supabase
      .from("coordination_issues")
      .update({ state: "ACKNOWLEDGED", acknowledged_at: new Date().toISOString() })
      .eq("id", issueId);
  }

  function handleTapToChat(issueId: string, content: string) {
    // Navigate to Conversations tab with the issue content pre-loaded
    router.push({
      pathname: "/(tabs)/chat",
      params: { prefill: content, issue_id: issueId },
    });
  }

  function handleCheckinTapToChat(content: string) {
    router.push({
      pathname: "/(tabs)/chat",
      params: { prefill: content },
    });
  }

  async function handleCheckinDismiss(cardId: string) {
    setCheckins((prev) => prev.map((c) => (c.id === cardId ? { ...c, dismissed: true } : c)));

    try {
      await supabase
        .from("kin_check_ins")
        .update({ dismissed: true })
        .eq("id", cardId);
    } catch {
      // Silently ignore if table not yet migrated
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadAll();
    setRefreshing(false);
  }

  // ── Derived state ──────────────────────────────────────────────────────────

  const greeting = getGreeting();
  const displayName = firstName || "there";

  // Only show the top queued OPEN alert — the rest stay queued (spec §5)
  const openIssues = issues.filter((i) => i.state === "OPEN");
  const acknowledgedIssues = issues.filter((i) => i.state === "ACKNOWLEDGED");
  const resolvedIssues = issues.filter((i) => i.state === "RESOLVED");

  // Active visible alert: exactly 1 OPEN at a time
  const activeOpenAlert = openIssues[0] ?? null;

  // Suppress check-ins when a High-priority (OPEN) alert is active (spec §5)
  const showCheckins = activeOpenAlert === null;

  const briefingBeats = briefing ? parseBriefingBeats(briefing.content) : null;

  // Compute whether Today screen has any content at all
  const hasContent =
    briefingLoading ||
    briefingBeats !== null ||
    activeOpenAlert !== null ||
    acknowledgedIssues.length > 0 ||
    resolvedIssues.length > 0 ||
    (showCheckins && checkins.filter((c) => !c.dismissed).length > 0);

  // First-use: engineered day-one message shown once, in place of clean-day state
  const firstUseContent = isFirstOpen
    ? "Good to meet you. I've connected to your calendar and I'm getting oriented. I'll flag anything that needs your attention and stay quiet when things look clear."
    : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <FloatingOrbs />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7CB87A"
          />
        }
      >
        {/* ── HEADER ── */}
        <Animated.View
          style={[
            styles.header,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.dateLine}>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </Animated.View>

        {/* ── LAYER 1: MORNING BRIEFING ── */}
        {briefingLoading ? (
          <BriefingSkeletonCard />
        ) : briefingBeats ? (
          <Animated.View
            style={[
              styles.briefingCard,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.briefingTitleRow}>
              <View style={styles.briefingTitleLeft}>
                <Sparkles size={14} color="#7CB87A" />
                <Text style={styles.briefingTitle}>Morning</Text>
              </View>
              <View style={styles.briefingLivePill}>
                <View style={styles.briefingLiveDot} />
                <Text style={styles.briefingLiveLabel}>Today</Text>
              </View>
            </View>

            {/* Hook sentence — italic serif */}
            <Text style={styles.briefingHook}>{briefingBeats[0]}</Text>

            {/* Supporting beats — max 3 more sentences per spec §5 */}
            {briefingBeats.slice(1).map((beat, i) => (
              <View key={i} style={styles.briefingBeatRow}>
                <View style={styles.briefingBeatDot} />
                <Text style={styles.briefingBeatText}>{beat}</Text>
              </View>
            ))}
          </Animated.View>
        ) : null /* spec §7: render nothing when empty */}

        {/* ── FIRST-USE MOMENT (§21) — shown once, on first open ── */}
        {!briefingBeats && firstUseContent && (
          <Animated.View
            style={[
              styles.briefingCard,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.briefingTitleRow}>
              <View style={styles.briefingTitleLeft}>
                <Sparkles size={14} color="#7CB87A" />
                <Text style={styles.briefingTitle}>Hey</Text>
              </View>
            </View>
            <Text style={styles.briefingHook}>{firstUseContent}</Text>
            <Text style={styles.firstUseClosingLine}>
              I'll keep an eye on it and flag anything that changes.
            </Text>
          </Animated.View>
        )}

        {/* ── LAYER 2: ALERT CARDS ── */}
        {/* Active OPEN alert — exactly 1 visible (spec §5) */}
        {activeOpenAlert && (
          <AlertCard
            key={activeOpenAlert.id}
            issue={activeOpenAlert}
            onAcknowledge={handleAcknowledge}
            onTapToChat={handleTapToChat}
          />
        )}

        {/* Acknowledged alerts — muted, no repeated prompt */}
        {acknowledgedIssues.map((issue) => (
          <AlertCard
            key={issue.id}
            issue={issue}
            onAcknowledge={handleAcknowledge}
            onTapToChat={handleTapToChat}
          />
        ))}

        {/* Resolved alerts — closure line, then fade */}
        {resolvedIssues.map((issue) => (
          <AlertCard
            key={issue.id}
            issue={issue}
            onAcknowledge={handleAcknowledge}
            onTapToChat={handleTapToChat}
          />
        ))}

        {/* ── LAYER 3: CHECK-IN CARDS ── */}
        {/* Suppressed when any High-priority (OPEN) alert exists (spec §5) */}
        {showCheckins &&
          checkins
            .filter((c) => !c.dismissed)
            .slice(0, 2)
            .map((card) => (
              <CheckInCard
                key={card.id}
                card={card}
                onDismiss={handleCheckinDismiss}
                onTapToChat={handleCheckinTapToChat}
              />
            ))}

        {/* ── CLEAN DAY STATE (§7) ── */}
        {/* Show when loading is done and there is genuinely nothing to surface */}
        {!briefingLoading && !hasContent && !firstUseContent && (
          <CleanDayState />
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

  // Header
  header: { alignItems: "center", marginTop: 16, marginBottom: 28 },
  greeting: {
    fontFamily: "GeistMono-Regular",
    fontSize: 11,
    color: "rgba(240, 237, 230, 0.28)",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 6,
  },
  displayName: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 32,
    color: "#F0EDE6",
    textAlign: "center",
  },
  dateLine: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.3)",
    marginTop: 4,
  },

  // Briefing card
  briefingCard: {
    backgroundColor: "#141810",
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
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
  briefingTitleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  briefingTitle: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 18,
    color: "#7CB87A",
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
  briefingHook: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 18,
    color: "#F0EDE6",
    lineHeight: 26,
    marginBottom: 10,
  },
  briefingBeatRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 6,
    alignItems: "flex-start",
  },
  briefingBeatDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(124, 184, 122, 0.45)",
    marginTop: 9,
    flexShrink: 0,
  },
  briefingBeatText: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.8)",
    lineHeight: 22,
    flex: 1,
  },
  firstUseClosingLine: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.4)",
    marginTop: 10,
    lineHeight: 20,
    fontStyle: "italic",
  },

  // Skeleton
  skeletonTitle: {
    height: 16,
    width: 80,
    borderRadius: 8,
    backgroundColor: "rgba(240, 237, 230, 0.07)",
    marginBottom: 14,
  },
  skeletonLine: {
    height: 12,
    width: "100%",
    borderRadius: 6,
    backgroundColor: "rgba(240, 237, 230, 0.05)",
    marginBottom: 8,
  },

  // Alert card — OPEN
  alertCardOpen: {
    backgroundColor: "#161C14",
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(212, 168, 67, 0.25)",
    shadowColor: "#D4A843",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  alertOpenHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  alertOpenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#D4A843",
  },
  alertOpenLabel: {
    fontFamily: "GeistMono-Regular",
    fontSize: 10,
    color: "rgba(212, 168, 67, 0.8)",
    textTransform: "uppercase",
    letterSpacing: 1,
    flex: 1,
  },
  alertDismissBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  alertOpenContent: {
    fontFamily: "Geist-SemiBold",
    fontSize: 15,
    color: "#F0EDE6",
    lineHeight: 22,
    marginBottom: 12,
  },
  alertOpenFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  alertOpenCta: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(124, 184, 122, 0.5)",
  },

  // Alert card — ACKNOWLEDGED
  alertCardAcknowledged: {
    backgroundColor: "#111410",
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.04)",
  },
  alertAcknowledgedText: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.25)",
    lineHeight: 20,
  },

  // Alert card — RESOLVED
  alertCardResolved: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  alertResolvedText: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(124, 184, 122, 0.4)",
    fontStyle: "italic",
  },

  // Check-in card
  checkinCard: {
    backgroundColor: "#141810",
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(124, 184, 122, 0.08)",
  },
  checkinRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  checkinKinOrb: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "rgba(124, 184, 122, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkinContent: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.72)",
    lineHeight: 21,
    marginBottom: 3,
  },
  checkinPrompt: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(124, 184, 122, 0.55)",
    lineHeight: 18,
  },
  checkinDismissBtn: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },

  // Clean-day state
  cleanDayContainer: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 40,
  },
  cleanDayText: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 17,
    color: "rgba(240, 237, 230, 0.22)",
    textAlign: "center",
    lineHeight: 24,
  },
});
