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

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import * as Sentry from "@sentry/react-native";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  Animated,
  Easing,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import NetInfo from "@react-native-community/netinfo";
import { Sparkles, X, MessageCircle, CheckCircle, WifiOff } from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { api } from "../../lib/api";
import { getGreeting } from "../../lib/utils";
import FloatingOrbs from "../../components/ui/FloatingOrbs";
import { useThemeColors } from "../../lib/theme";
import { type ThemeColors } from "../../constants/colors";

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

interface ScheduleEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  owner_parent_id: string;
  all_day: boolean;
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
  const c = useThemeColors();
  const styles = useMemo(() => createStyles(c), [c]);
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
  const c = useThemeColors();
  const styles = useMemo(() => createStyles(c), [c]);
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
        <CheckCircle size={14} color={c.greenMuted} />
        <Text style={styles.alertResolvedText}>Sorted. I'll flag it if anything changes.</Text>
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
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onAcknowledge(issue.id);
          }}
          style={({ pressed }) => [styles.alertDismissBtn, pressed && { opacity: 0.6 }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={14} color={c.textMuted} />
        </Pressable>
      </View>
      <Text style={styles.alertOpenContent}>{issue.content}</Text>
      <View style={styles.alertOpenFooter}>
        <MessageCircle size={12} color={c.greenMuted} />
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
  const c = useThemeColors();
  const styles = useMemo(() => createStyles(c), [c]);
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
          <Sparkles size={13} color={c.green} />
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
          <X size={13} color={c.textAcknowledged} />
        </Pressable>
      </View>
    </Pressable>
  );
}

/** Clean-day state: Today screen when nothing is worth surfacing */
function CleanDayState() {
  const c = useThemeColors();
  const styles = useMemo(() => createStyles(c), [c]);
  return (
    <View style={styles.cleanDayContainer}>
      <Text style={styles.cleanDayText}>Clean day — nothing to stay ahead of.</Text>
    </View>
  );
}

/**
 * Today's Schedule section — spec §5.
 * Shows today's calendar events sorted ascending by start time.
 * Per-person color: Parent A (#7AADCE), Partner (#D4748A).
 * Empty state: render nothing (no placeholder per spec).
 */
function TodayScheduleSection({
  events,
  profileId,
}: {
  events: ScheduleEvent[];
  profileId: string;
}) {
  const c = useThemeColors();
  const styles = useMemo(() => createStyles(c), [c]);
  if (events.length === 0) return null;

  function formatEventTime(event: ScheduleEvent): string {
    if (event.all_day) return "All day";
    return new Date(event.start_time).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  return (
    <View style={styles.scheduleSection}>
      <Text style={styles.scheduleSectionHeader}>TODAY</Text>
      {events.map((event, index) => {
        const isOwn = event.owner_parent_id === profileId;
        const personColor = isOwn ? c.blue : c.rose;
        const isLast = index === events.length - 1;
        return (
          <View
            key={event.id}
            style={[styles.scheduleEventRow, !isLast && styles.scheduleEventRowBorder]}
          >
            <View style={[styles.schedulePersonDot, { backgroundColor: personColor }]} />
            <Text style={styles.scheduleEventTime}>{formatEventTime(event)}</Text>
            <Text style={styles.scheduleEventTitle} numberOfLines={1}>
              {event.title}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TodayScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

  // Today's schedule (spec §5)
  const [todayEvents, setTodayEvents] = useState<ScheduleEvent[]>([]);

  // First-use flag + dynamic content (S4.2 — wired to /api/first-use)
  const [isFirstOpen, setIsFirstOpen] = useState(false);
  const [firstUseContent, setFirstUseContent] = useState<string | null>(null);

  // Refresh
  const [refreshing, setRefreshing] = useState(false);

  // Load error (B15 — surface retry when loadAll fails)
  const [loadError, setLoadError] = useState(false);

  // Offline detection
  const [isOffline, setIsOffline] = useState(false);

  // Entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  // First-use entrance animation — spec first-use-spec.md §5: 400ms ease-in, deliberate
  const firstUseFadeAnim = useRef(new Animated.Value(0)).current;
  const firstUseSlideAnim = useRef(new Animated.Value(16)).current;

  // Offline detection: subscribe to network state changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    loadAll();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 420, useNativeDriver: true }),
    ]).start();
    // First-use moment: 400ms ease-in per first-use-spec.md §5 ("unhurried, deliberate")
    Animated.parallel([
      Animated.timing(firstUseFadeAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(firstUseSlideAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
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

  // Supabase realtime: subscribe to calendar_events (spec §5 — Today's Schedule)
  useEffect(() => {
    if (!profileId) return;

    const channel = supabase
      .channel(`calendar_events:${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "calendar_events",
        },
        () => {
          loadTodayEvents(profileId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId]);

  async function loadAll() {
    setLoadError(false);
    try {
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
          // S4.2: fetch dynamic first insight from /api/first-use (first-use-prompt.md)
          // Falls back to spec-approved default if AI unavailable or confidence < HIGH
          try {
            const result = await api.getFirstUseInsight();
            if (result.first_insight) {
              setFirstUseContent(result.first_insight);
            }
          } catch {
            // API failure — use spec-approved static fallback (§21, first-use-prompt.md)
            setFirstUseContent(
              "I'm watching your household schedule. The moment something needs your attention, I'll surface it."
            );
          }
        }

        if (profile.household_id) {
          await loadIssues(profile.household_id);
        }
      }

      await loadBriefing(user.id);
      await loadCheckins(user.id);
      await loadTodayEvents(user.id);
    } catch (err) {
      Sentry.captureException(err);
      setLoadError(true);
    }
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
    } catch (err) {
      Sentry.captureException(err);
      setBriefing(null);
    } finally {
      setBriefingLoading(false);
    }
  }

  async function loadIssues(hid: string) {
    try {
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
    } catch (err) {
      Sentry.captureException(err);
      // Supabase error: silently clear alert cards rather than leaving stale data
      setIssues([]);
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

  async function loadTodayEvents(uid: string) {
    // Build today's date window in local time
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date();
    dayEnd.setHours(23, 59, 59, 999);

    try {
      const { data } = await supabase
        .from("calendar_events")
        .select("id, title, start_time, end_time, owner_parent_id, all_day")
        .gte("start_time", dayStart.toISOString())
        .lte("start_time", dayEnd.toISOString())
        .is("deleted_at", null)
        // Show own events + shared events + kid events (mirrors API household view)
        .or(`owner_parent_id.eq.${uid},is_shared.eq.true,is_kid_event.eq.true`)
        .order("start_time", { ascending: true })
        .limit(20);

      if (data) setTodayEvents(data as ScheduleEvent[]);
    } catch {
      // Calendar may not be connected — silently skip
    }
  }

  async function handleAcknowledge(issueId: string) {
    // Capture previous state before optimistic update so we can roll back on error
    let previousIssues: CoordinationIssue[] = [];
    setIssues((prev) => {
      previousIssues = prev;
      return prev.map((i) =>
        i.id === issueId
          ? { ...i, state: "ACKNOWLEDGED", acknowledged_at: new Date().toISOString() }
          : i
      );
    });

    try {
      const { error } = await supabase
        .from("coordination_issues")
        .update({ state: "ACKNOWLEDGED", acknowledged_at: new Date().toISOString() })
        .eq("id", issueId);

      if (error) throw error;
    } catch (err) {
      Sentry.captureException(err);
      // DB write failed — roll back optimistic update so UI stays consistent with DB
      setIssues(previousIssues);
    }
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
    todayEvents.length > 0 ||
    (showCheckins && checkins.filter((c) => !c.dismissed).length > 0);

  // First-use: engineered day-one message shown once, in place of clean-day state.
  // Spec §21: no setup language, must be specific to user's life.
  // S4.2: content sourced from /api/first-use (first-use-prompt.md); set via setFirstUseContent in loadAll.

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
            tintColor={colors.green}
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

        {/* ── OFFLINE BANNER — shown when device has no network connection ── */}
        {isOffline && (
          <View style={styles.offlineBanner}>
            <WifiOff size={13} color={colors.textMuted} />
            <Text style={styles.offlineBannerText}>You&apos;re offline — showing last known data.</Text>
          </View>
        )}

        {/* ── LOAD ERROR STATE (B15) — shown when loadAll() throws ── */}
        {loadError && (
          <Pressable
            style={styles.loadErrorCard}
            onPress={() => {
              setLoadError(false);
              loadAll();
            }}
          >
            <Text style={styles.loadErrorText}>
              Couldn&apos;t load your day. Tap to retry.
            </Text>
          </Pressable>
        )}

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
                <Sparkles size={14} color={colors.green} />
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
        {/* first-use-spec.md §5: dedicated 400ms ease-in animation ("unhurried") */}
        {!briefingBeats && firstUseContent && (
          <Animated.View
            style={[
              styles.briefingCard,
              { opacity: firstUseFadeAnim, transform: [{ translateY: firstUseSlideAnim }] },
            ]}
          >
            <View style={styles.briefingTitleRow}>
              <View style={styles.briefingTitleLeft}>
                <Sparkles size={14} color={colors.green} />
                <Text style={styles.briefingTitle}>Hey</Text>
              </View>
            </View>
            <Text style={styles.briefingHook}>{firstUseContent}</Text>
            <Text style={styles.firstUseClosingLine}>
              I'll flag it if anything changes.
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

        {/* ── TODAY'S SCHEDULE (spec §5) ── */}
        {/* Renders between alert cards and check-in cards. Empty state = nothing rendered. */}
        {profileId && (
          <TodayScheduleSection events={todayEvents} profileId={profileId} />
        )}

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

// ─── Styles factory ───────────────────────────────────────────────────────────
// Spec: docs/specs/light-theme-spec.md §8 (B23 — per-screen token mapping)

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: c.background },
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 120 },

  // Header
  header: { alignItems: "center", marginTop: 16, marginBottom: 28 },
  greeting: {
    fontFamily: "GeistMono-Regular",
    fontSize: 11,
    color: c.textDim,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 6,
  },
  displayName: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 32,
    color: c.textPrimary,
    textAlign: "center",
  },
  dateLine: {
    fontFamily: "Geist",
    fontSize: 13,
    color: c.textMuted,
    marginTop: 4,
  },

  // Briefing card
  briefingCard: {
    backgroundColor: c.surfacePrimary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: c.greenSubtle,
    shadowColor: c.greenShadow,
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
    color: c.green,
  },
  briefingLivePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: c.greenSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  briefingLiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: c.green,
  },
  briefingLiveLabel: {
    fontFamily: "GeistMono-Regular",
    fontSize: 10,
    color: c.greenMuted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  briefingHook: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 18,
    color: c.textPrimary,
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
    backgroundColor: c.greenMuted,
    marginTop: 9,
    flexShrink: 0,
  },
  briefingBeatText: {
    fontFamily: "Geist",
    fontSize: 14,
    color: c.textSecondary,
    lineHeight: 22,
    flex: 1,
  },
  firstUseClosingLine: {
    fontFamily: "Geist",
    fontSize: 13,
    color: c.textMuted,
    marginTop: 10,
    lineHeight: 20,
    fontStyle: "italic",
  },

  // Skeleton
  skeletonTitle: {
    height: 16,
    width: 80,
    borderRadius: 8,
    backgroundColor: c.skeletonBase,
    marginBottom: 14,
  },
  skeletonLine: {
    height: 12,
    width: "100%",
    borderRadius: 6,
    backgroundColor: c.skeletonBase,
    marginBottom: 8,
  },

  // Alert card — OPEN
  alertCardOpen: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: c.amberBorder,
    shadowColor: c.amber,
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
    backgroundColor: c.amber,
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
    color: c.textPrimary,
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
    color: c.greenMuted,
  },

  // Alert card — ACKNOWLEDGED
  alertCardAcknowledged: {
    backgroundColor: c.surfaceMuted,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: c.surfaceSubtle,
  },
  alertAcknowledgedText: {
    fontFamily: "Geist",
    fontSize: 13,
    color: c.textAcknowledged,
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
    color: c.greenDim,
    fontStyle: "italic",
  },

  // Check-in card
  checkinCard: {
    backgroundColor: c.surfacePrimary,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: c.greenSubtle,
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
    backgroundColor: c.greenSubtle,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkinContent: {
    fontFamily: "Geist",
    fontSize: 14,
    color: c.textSecondary,
    lineHeight: 21,
    marginBottom: 3,
  },
  checkinPrompt: {
    fontFamily: "Geist",
    fontSize: 13,
    color: c.greenMuted,
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
    color: c.textFaint,
    textAlign: "center",
    lineHeight: 24,
  },

  // Today's schedule section (spec §5)
  scheduleSection: {
    marginBottom: 16,
  },
  scheduleSectionHeader: {
    fontFamily: "GeistMono-Regular",
    fontSize: 10,
    color: c.textAcknowledged,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  scheduleEventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  scheduleEventRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: c.surfaceSubtle,
  },
  schedulePersonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  scheduleEventTime: {
    fontFamily: "GeistMono-Regular",
    fontSize: 12,
    color: c.textMuted,
    width: 72,
    flexShrink: 0,
  },
  scheduleEventTitle: {
    fontFamily: "Geist",
    fontSize: 14,
    color: c.textSecondary,
    flex: 1,
  },

  // Load error state (B15)
  loadErrorCard: {
    backgroundColor: c.roseSubtle,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: c.rose,
    alignItems: "center",
  },
  loadErrorText: {
    fontFamily: "Geist",
    fontSize: 14,
    color: c.textSecondary,
    textAlign: "center",
  },

  // Offline banner — low-prominence, muted strip above content
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: c.surfaceSubtle,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: c.skeletonBase,
  },
  offlineBannerText: {
    fontFamily: "Geist",
    fontSize: 13,
    color: c.textMuted,
    flex: 1,
  },
  });
}
