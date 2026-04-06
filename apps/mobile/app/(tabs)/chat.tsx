/**
 * Conversations Screen — Kin v0
 *
 * Two persistent pinned threads per user (ARCH-PIVOT-2026-04-03 §Conversations):
 *   "Kin"  — personal thread (is_private: true, only the logged-in user sees)
 *   "Home" — household thread (shared, both parents see; shows invite prompt
 *             if partner hasn't accepted invite yet)
 *
 * Below the pinned threads: recent general threads from legacy / ad-hoc chats.
 *
 * Conversation detail: chat UI backed by `api.chat()` + persisted to
 * the `conversations` table via `chat_threads`.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import * as ImagePicker from "expo-image-picker";
import {
  Send,
  Mic,
  MicOff,
  Sparkles,
  ImagePlus,
  X,
  Volume2,
  ChevronLeft,
  Plus,
  Lock,
  Globe,
  Users,
  UserPlus,
} from "lucide-react-native";
import { api } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import FloatingOrbs from "../../components/ui/FloatingOrbs";
import { useThemeColors } from "../../lib/theme";
import { type ThemeColors } from "../../constants/colors";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: string;
}

type ThreadType = "personal" | "household" | "general";

interface ChatThread {
  id: string;
  title: string | null;
  thread_type: ThreadType;
  is_private: boolean;
  updated_at: string;
  preview?: string;
  household_id?: string | null;
}

type ChatView = "list" | "conversation";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get or create a single persistent thread of a given type for the user. */
async function upsertPinnedThread(
  profileId: string,
  type: "personal" | "household",
  householdId: string | null
): Promise<ChatThread | null> {
  // Look for existing pinned thread
  const query = supabase
    .from("chat_threads")
    .select("id, title, thread_type, is_private, updated_at, household_id")
    .eq("profile_id", profileId)
    .eq("thread_type", type)
    .limit(1);

  const { data: existing, error: fetchErr } = await query.maybeSingle();

  if (fetchErr && fetchErr.code !== "PGRST116") {
    return null;
  }

  if (existing) return existing as ChatThread;

  // Create a new pinned thread
  const { data: created, error: insertErr } = await supabase
    .from("chat_threads")
    .insert({
      profile_id: profileId,
      title: type === "personal" ? "Kin" : "Home",
      thread_type: type,
      is_private: type === "personal",
      household_id: type === "household" ? householdId : null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertErr) return null;
  return created as ChatThread;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingIndicator() {
  const c = useThemeColors();
  const styles = useMemo(() => createChatStyles(c), [c]);
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View style={styles.typingRow}>
      <View style={styles.avatar}>
        <Sparkles size={14} color={c.green} />
      </View>
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.typingDots, { opacity }]}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.dot} />
          ))}
        </Animated.View>
        <Text style={styles.typingText}>Kin is thinking...</Text>
      </View>
    </View>
  );
}

/** Household thread invite prompt — shown when partner hasn't linked yet */
function PartnerInvitePrompt({ onInvite }: { onInvite: () => void }) {
  const c = useThemeColors();
  const styles = useMemo(() => createChatStyles(c), [c]);
  return (
    <View style={styles.inviteContainer}>
      <View style={styles.inviteOrb}>
        <Users size={20} color={c.textMuted} />
      </View>
      <Text style={styles.inviteTitle}>Invite your partner</Text>
      <Text style={styles.inviteBody}>
        The Home thread is shared with your partner. Once they join, you'll both see
        coordination decisions here — schedules, pickups, planning.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.inviteBtn, pressed && { opacity: 0.85 }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onInvite();
        }}
      >
        <UserPlus size={16} color={c.textOnGreen} />
        <Text style={styles.inviteBtnText}>Send partner invite</Text>
      </Pressable>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ConversationsScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => createChatStyles(c), [c]);

  const params = useLocalSearchParams<{ prefill?: string; issue_id?: string }>();
  const router = useRouter();

  const [view, setView] = useState<ChatView>("list");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Thread state
  const [currentThread, setCurrentThread] = useState<ChatThread | null>(null);
  const [generalThreads, setGeneralThreads] = useState<ChatThread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);

  // Pinned threads
  const [personalThread, setPersonalThread] = useState<ChatThread | null>(null);
  const [householdThread, setHouseholdThread] = useState<ChatThread | null>(null);
  const [partnerLinked, setPartnerLinked] = useState(false);

  // User context
  const [profileId, setProfileId] = useState<string | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [familyName, setFamilyName] = useState<string>("");

  const listLoaded = useRef(false);

  useEffect(() => {
    initConversations();
  }, []);

  // Handle prefill from Today screen (alert card tap)
  useEffect(() => {
    if (params.prefill && view === "list" && personalThread) {
      openThread(personalThread, params.prefill);
    }
  }, [params.prefill, personalThread]);

  async function initConversations() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setProfileId(user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("family_name, household_id")
      .eq("id", user.id)
      .single();

    const hid = profile?.household_id ?? null;
    setHouseholdId(hid);
    setFamilyName(profile?.family_name || "Home");

    // Check partner linked status
    if (hid) {
      const { data: partner } = await supabase
        .from("profiles")
        .select("id")
        .eq("household_id", hid)
        .neq("id", user.id)
        .limit(1)
        .maybeSingle();
      setPartnerLinked(partner !== null);
    }

    // Ensure pinned threads exist
    const [personal, household] = await Promise.all([
      upsertPinnedThread(user.id, "personal", null),
      upsertPinnedThread(user.id, "household", hid),
    ]);

    if (personal) {
      const preview = await getThreadPreview(personal.id);
      setPersonalThread({ ...personal, preview });
    }
    if (household) {
      const preview = await getThreadPreview(household.id);
      setHouseholdThread({ ...household, preview });
    }

    await loadGeneralThreads(user.id);
    listLoaded.current = true;
  }

  async function getThreadPreview(threadId: string): Promise<string> {
    const { data } = await supabase
      .from("conversations")
      .select("content, role")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return "";
    const prefix = data.role === "assistant" ? "Kin: " : "You: ";
    return prefix + (data.content?.slice(0, 60) || "");
  }

  async function loadGeneralThreads(uid: string) {
    setThreadsLoading(true);
    try {
      const { data } = await supabase
        .from("chat_threads")
        .select("id, title, thread_type, is_private, updated_at, household_id")
        .eq("profile_id", uid)
        .eq("thread_type", "general")
        .order("updated_at", { ascending: false })
        .limit(20);

      if (!data) return;

      const withPreviews = await Promise.all(
        data.map(async (t) => ({
          ...t,
          preview: await getThreadPreview(t.id),
        }))
      );
      setGeneralThreads(withPreviews as ChatThread[]);
    } finally {
      setThreadsLoading(false);
    }
  }

  async function loadMessages(threadId: string) {
    const { data } = await supabase
      .from("conversations")
      .select("id, role, content")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(60);

    if (data) {
      setMessages(data.map((m) => ({ ...m, role: m.role as "user" | "assistant" })));
    }
  }

  async function openThread(thread: ChatThread, prefillText?: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentThread(thread);
    await loadMessages(thread.id);
    setView("conversation");
    if (prefillText) {
      setInput(prefillText);
    }
  }

  async function createNewThread() {
    if (!profileId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { data: created, error } = await supabase
        .from("chat_threads")
        .insert({
          profile_id: profileId,
          title: "New conversation",
          thread_type: "general",
          is_private: false,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error || !created) return;
      const newThread = created as ChatThread;
      setGeneralThreads((prev) => [newThread, ...prev]);
      await openThread(newThread);
    } catch {
      if (__DEV__) console.error("Error creating new thread");
    }
  }

  function goBackToList() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setView("list");
    setMessages([]);
    setInput("");
    setCurrentThread(null);
    // Refresh pinned thread previews
    if (profileId) {
      if (personalThread) {
        getThreadPreview(personalThread.id).then((preview) =>
          setPersonalThread((t) => (t ? { ...t, preview } : t))
        );
      }
      if (householdThread) {
        getThreadPreview(householdThread.id).then((preview) =>
          setHouseholdThread((t) => (t ? { ...t, preview } : t))
        );
      }
      loadGeneralThreads(profileId);
    }
  }

  async function sendMessage(text?: string) {
    const messageText = text || input.trim();
    if (!messageText && !selectedImage) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Ensure we have a thread
    let thread = currentThread;
    if (!thread && profileId) {
      // Fallback: open personal thread
      const personal = await upsertPinnedThread(profileId, "personal", null);
      if (personal) {
        thread = personal;
        setCurrentThread(personal);
        setPersonalThread(personal);
      }
    }
    if (!thread) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      image: selectedImage ?? undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSelectedImage(null);
    setLoading(true);

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const { response } = await api.chat(messageText, selectedImage ?? undefined, thread.thread_type);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Update thread timestamp
      await supabase
        .from("chat_threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", thread.id);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "I couldn't connect right now. Check your internet and try again.",
        },
      ]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
    }
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }

  function speakResponse(text: string) {
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
    } else {
      setSpeaking(true);
      Speech.speak(text, {
        language: "en-US",
        rate: 0.95,
        onDone: () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
      });
    }
  }

  function handleInvitePartner() {
    router.push("/(tabs)/settings");
  }

  const isHouseholdView =
    currentThread?.thread_type === "household";
  const isPersonalView =
    currentThread?.thread_type === "personal";

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LIST VIEW
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (view === "list") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <FloatingOrbs />
        <FlatList
          data={generalThreads}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              {/* Header */}
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>Conversations</Text>
                <Pressable
                  onPress={createNewThread}
                  style={({ pressed }) => [styles.listHeaderPlusBtn, pressed && { opacity: 0.6 }]}
                  accessibilityLabel="New conversation"
                >
                  <Plus size={22} color="rgba(240, 237, 230, 0.45)" />
                </Pressable>
              </View>

              {/* ── PINNED: Kin (personal) ── */}
              {personalThread && (
                <Pressable
                  style={({ pressed }) => [
                    styles.pinnedCard,
                    styles.pinnedPersonal,
                    pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
                  ]}
                  onPress={() => openThread(personalThread)}
                >
                  <View style={styles.pinnedCardLeft}>
                    <View style={styles.pinnedAvatarKin}>
                      <Sparkles size={18} color={c.green} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.pinnedTitleRow}>
                        <Text style={styles.pinnedThreadName}>Kin</Text>
                        <View style={styles.privatePill}>
                          <Lock size={9} color="rgba(240, 237, 230, 0.3)" />
                          <Text style={styles.privatePillText}>Private</Text>
                        </View>
                      </View>
                      {personalThread.preview ? (
                        <Text style={styles.pinnedPreview} numberOfLines={1}>{personalThread.preview}</Text>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              )}

              {/* ── PINNED: Home (household) ── */}
              {householdThread && (
                <Pressable
                  style={({ pressed }) => [
                    styles.pinnedCard,
                    styles.pinnedHousehold,
                    pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
                  ]}
                  onPress={() => {
                    if (!partnerLinked) {
                      // Show invite prompt inline
                      openThread(householdThread);
                    } else {
                      openThread(householdThread);
                    }
                  }}
                >
                  <View style={styles.pinnedCardLeft}>
                    <View style={styles.pinnedAvatarHome}>
                      <Users size={18} color="rgba(122, 173, 206, 0.8)" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.pinnedTitleRow}>
                        <Text style={styles.pinnedThreadName}>
                          {familyName ? `${familyName} Home` : "Home"}
                        </Text>
                        {partnerLinked && (
                          <View style={styles.sharedPill}>
                            <Globe size={9} color="rgba(122, 173, 206, 0.5)" />
                            <Text style={styles.sharedPillText}>Shared</Text>
                          </View>
                        )}
                        {!partnerLinked && (
                          <View style={styles.invitePill}>
                            <UserPlus size={9} color="rgba(212, 168, 67, 0.6)" />
                            <Text style={styles.invitePillText}>Invite partner</Text>
                          </View>
                        )}
                      </View>
                      {!partnerLinked ? (
                        <Text style={styles.pinnedPreview} numberOfLines={1}>Send an invite to connect your partner</Text>
                      ) : householdThread.preview ? (
                        <Text style={styles.pinnedPreview} numberOfLines={1}>{householdThread.preview}</Text>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              )}

              {/* General threads header */}
              {generalThreads.length > 0 && (
                <Text style={styles.sectionLabel}>RECENT</Text>
              )}
            </>
          }
          renderItem={({ item: thread }) => (
            <Pressable
              style={({ pressed }) => [
                styles.threadCard,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => openThread(thread)}
            >
              <View style={styles.threadIconWrap}>
                {thread.is_private ? (
                  <Lock size={13} color={c.rose} />
                ) : (
                  <Sparkles size={13} color="rgba(240, 237, 230, 0.25)" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.threadTitle} numberOfLines={1}>
                  {thread.title || "Conversation"}
                </Text>
                {thread.preview ? (
                  <Text style={styles.threadPreview} numberOfLines={1}>
                    {thread.preview}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.threadTime}>
                {new Date(thread.updated_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyListState}>
              <Text style={styles.emptyListText}>
                Start a conversation above to build your history.
              </Text>
            </View>
          }
          ListFooterComponent={
            threadsLoading ? (
              <ActivityIndicator
                size="small"
                color="rgba(240, 237, 230, 0.18)"
                style={styles.threadsLoadingIndicator}
              />
            ) : null
          }
        />
      </SafeAreaView>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CONVERSATION DETAIL VIEW
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const isEmpty = messages.length === 0 && !loading;
  const threadDisplayName =
    currentThread?.thread_type === "personal"
      ? "Kin"
      : currentThread?.thread_type === "household"
      ? familyName
        ? `${familyName} Home`
        : "Home"
      : currentThread?.title || "Conversation";

  // Household thread + partner not linked → show invite prompt
  if (isHouseholdView && !partnerLinked) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <FloatingOrbs />
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={goBackToList}
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
          >
            <ChevronLeft size={22} color={c.textPrimary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <View style={styles.headerAvatarHome}>
              <Users size={14} color="rgba(122, 173, 206, 0.8)" />
            </View>
            <Text style={styles.headerTitle}>{threadDisplayName}</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
        <PartnerInvitePrompt onInvite={handleInvitePartner} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <FloatingOrbs />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={goBackToList}
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
          >
            <ChevronLeft size={22} color={c.textPrimary} />
          </Pressable>

          <View style={styles.headerCenter}>
            {isHouseholdView ? (
              <View style={styles.headerAvatarHome}>
                <Users size={14} color="rgba(122, 173, 206, 0.8)" />
              </View>
            ) : (
              <View style={styles.headerAvatarKin}>
                <Sparkles size={14} color={c.green} />
              </View>
            )}
            <View>
              <Text style={styles.headerTitle}>{threadDisplayName}</Text>
              {isPersonalView && (
                <View style={styles.privateBadge}>
                  <Lock size={8} color={c.rose} />
                  <Text style={styles.privateBadgeText}>Private</Text>
                </View>
              )}
              {isHouseholdView && partnerLinked && (
                <View style={styles.sharedBadge}>
                  <Globe size={8} color="rgba(122, 173, 206, 0.6)" />
                  <Text style={styles.sharedBadgeText}>Shared</Text>
                </View>
              )}
            </View>
          </View>

          <View style={{ width: 36 }} />
        </View>

        {/* Messages */}
        {isEmpty ? (
          <View style={styles.emptyState}>
            {isPersonalView ? (
              <>
                <View style={styles.emptyKinOrb}>
                  <Sparkles size={24} color={c.green} />
                </View>
                <Text style={styles.emptyTitle}>Hey, I'm Kin</Text>
                <Text style={styles.emptySubtitle}>
                  Ask me about anything — schedules, what's coming up, what you should
                  be thinking about. This is your private thread.
                </Text>
              </>
            ) : isHouseholdView ? (
              <>
                <View style={styles.emptyHomeOrb}>
                  <Users size={24} color="rgba(122, 173, 206, 0.7)" />
                </View>
                <Text style={styles.emptyTitle}>{threadDisplayName}</Text>
                <Text style={styles.emptySubtitle}>
                  Coordination decisions, schedule conflicts, and shared planning
                  happen here. Both parents can see and respond.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyTitle}>New conversation</Text>
                <Text style={styles.emptySubtitle}>
                  Ask Kin anything about your household.
                </Text>
              </>
            )}
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={({ item }) => {
              const isUser = item.role === "user";
              return (
                <View
                  style={[styles.messageRow, isUser && styles.messageRowUser]}
                >
                  {!isUser && (
                    <View style={isHouseholdView ? styles.avatarHome : styles.avatar}>
                      {isHouseholdView ? (
                        <Users size={13} color="rgba(122, 173, 206, 0.8)" />
                      ) : (
                        <Sparkles size={13} color={c.green} />
                      )}
                    </View>
                  )}
                  <View
                    style={[
                      styles.messageBubble,
                      isUser ? styles.userBubble : styles.assistantBubble,
                    ]}
                  >
                    {item.image && (
                      <Image
                        source={{ uri: item.image }}
                        style={styles.messageImage}
                        resizeMode="cover"
                      />
                    )}
                    <Text
                      style={[
                        styles.messageText,
                        isUser ? styles.userText : styles.assistantText,
                      ]}
                    >
                      {item.content}
                    </Text>
                    {!isUser && (
                      <Pressable
                        onPress={() => speakResponse(item.content)}
                        style={styles.speakButton}
                      >
                        <Volume2
                          size={14}
                          color={speaking ? c.green : "rgba(240, 237, 230, 0.2)"}
                        />
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            }}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={loading ? <TypingIndicator /> : null}
          />
        )}

        {/* Image preview */}
        {selectedImage && (
          <View style={styles.imagePreview}>
            <Image
              source={{ uri: selectedImage }}
              style={styles.previewThumb}
              resizeMode="cover"
            />
            <Pressable
              onPress={() => setSelectedImage(null)}
              style={styles.removeImage}
            >
              <X size={12} color={c.textPrimary} />
            </Pressable>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputContainer}>
          <Pressable
            onPress={pickImage}
            style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}
          >
            <ImagePlus size={18} color={c.textMuted} />
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsListening(!isListening);
            }}
            style={({ pressed }) => [
              styles.iconButton,
              isListening && styles.micActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            {isListening ? (
              <MicOff size={18} color={c.rose} />
            ) : (
              <Mic size={18} color={c.textMuted} />
            )}
          </Pressable>

          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={
              isHouseholdView ? "Message Home..." : "Ask Kin anything..."
            }
            placeholderTextColor={c.inputPlaceholder}
            multiline
            maxLength={2000}
            onSubmitEditing={() => sendMessage()}
          />

          <Pressable
            onPress={() => sendMessage()}
            disabled={(!input.trim() && !selectedImage) || loading}
            style={({ pressed }) => [
              styles.sendButton,
              (input.trim() || selectedImage) && !loading
                ? styles.sendButtonActive
                : {},
              pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
            ]}
          >
            <Send
              size={16}
              color={
                (input.trim() || selectedImage) && !loading
                  ? c.textOnGreen
                  : c.inputPlaceholder
              }
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles factory ───────────────────────────────────────────────────────────
// Spec: docs/specs/light-theme-spec.md §8 — Conversations Screen (B23)

function createChatStyles(c: ThemeColors) {
  return StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: c.background },
  container: { flex: 1 },

  // ── LIST VIEW ──
  listContent: { paddingHorizontal: 20, paddingBottom: 120 },
  listHeader: {
    marginTop: 12,
    marginBottom: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  listHeaderPlusBtn: {
    padding: 4,
  },
  listTitle: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 28,
    color: c.textPrimary,
  },

  // Pinned cards
  pinnedCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  pinnedPersonal: {
    backgroundColor: c.surfacePrimary,
    borderColor: c.greenSubtle,
  },
  pinnedHousehold: {
    backgroundColor: c.surfaceOverlay,
    borderColor: c.blueSubtle,
  },
  pinnedCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pinnedAvatarKin: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: c.greenSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  pinnedAvatarHome: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: c.blueSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  pinnedTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 3,
  },
  pinnedThreadName: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 18,
    color: c.textPrimary,
  },
  pinnedPreview: {
    fontFamily: "Geist",
    fontSize: 13,
    color: c.textMuted,
    lineHeight: 19,
  },

  // Pills
  privatePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: c.roseSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  privatePillText: {
    fontFamily: "GeistMono-Regular",
    fontSize: 9,
    color: c.rose,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  sharedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: c.blueSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sharedPillText: {
    fontFamily: "GeistMono-Regular",
    fontSize: 9,
    color: c.blue,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  invitePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: c.amberSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  invitePillText: {
    fontFamily: "GeistMono-Regular",
    fontSize: 9,
    color: c.amber,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  // Section label
  sectionLabel: {
    fontFamily: "GeistMono-Regular",
    fontSize: 10,
    color: c.textFaint,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: 4,
    marginBottom: 8,
  },

  // General thread cards (P2-9: transparent rows with bottom border only — no card container)
  threadCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "transparent",
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(240,237,230,0.04)",
  },
  threadIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: c.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  threadTitle: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.75)",
    marginBottom: 2,
  },
  threadPreview: {
    fontFamily: "Geist",
    fontSize: 12,
    color: c.textMuted,
  },
  threadTime: {
    fontFamily: "GeistMono-Regular",
    fontSize: 10,
    color: c.textFaint,
  },

  emptyListState: {
    alignItems: "center",
    paddingTop: 16,
  },
  emptyListText: {
    fontFamily: "Geist",
    fontSize: 13,
    color: c.textDim,
    textAlign: "center",
    fontStyle: "italic",
  },

  // ── CONVERSATION VIEW ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.surfaceSubtle,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginLeft: 4,
  },
  headerAvatarKin: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: c.greenSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarHome: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: c.blueSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Geist-SemiBold",
    fontSize: 18,
    color: c.textPrimary,
  },
  privateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 1,
  },
  privateBadgeText: {
    fontFamily: "GeistMono-Regular",
    fontSize: 9,
    color: c.rose,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sharedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 1,
  },
  sharedBadgeText: {
    fontFamily: "GeistMono-Regular",
    fontSize: 9,
    color: c.blue,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Empty states
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyKinOrb: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: c.greenSubtle,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyHomeOrb: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: c.blueSubtle,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: "Geist-SemiBold",
    fontSize: 28,
    color: c.textPrimary,
    textAlign: "center",
    marginBottom: 10,
  },
  emptySubtitle: {
    fontFamily: "Geist",
    fontSize: 14,
    color: c.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },

  // Invite prompt
  inviteContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
  },
  inviteOrb: {
    width: 60,
    height: 60,
    borderRadius: 22,
    backgroundColor: c.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  inviteTitle: {
    fontFamily: "Geist-SemiBold",
    fontSize: 24,
    color: c.textPrimary,
    marginBottom: 12,
    textAlign: "center",
  },
  inviteBody: {
    fontFamily: "Geist",
    fontSize: 14,
    color: c.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  inviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: c.green,
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 14,
  },
  inviteBtnText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 14,
    color: c.textOnGreen,
  },

  // Messages
  messageList: { paddingHorizontal: 16, paddingBottom: 8, paddingTop: 12 },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 14,
  },
  messageRowUser: { justifyContent: "flex-end" },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 12,
    backgroundColor: c.greenSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHome: {
    width: 28,
    height: 28,
    borderRadius: 12,
    backgroundColor: c.blueSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  messageBubble: {
    maxWidth: "78%",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userBubble: {
    backgroundColor: c.userBubble,
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    backgroundColor: c.assistantBubble,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: c.inputBorder,
  },
  messageText: { fontFamily: "Geist", fontSize: 15, lineHeight: 22 },
  userText: { color: c.textOnGreen },
  assistantText: { color: c.assistantText },
  messageImage: { width: 200, height: 150, borderRadius: 12, marginBottom: 8 },
  speakButton: { alignSelf: "flex-end", marginTop: 4, padding: 4 },
  imagePreview: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  previewThumb: { width: 48, height: 48, borderRadius: 12 },
  removeImage: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: c.rose,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
    marginTop: -8,
  },

  // Input
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 90,
    borderTopWidth: 1,
    borderTopColor: c.inputBorder,
    backgroundColor: c.inputBackground,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: c.surfacePrimary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.inputBorder,
  },
  micActive: {
    backgroundColor: c.roseSubtle,
    borderColor: c.rose,
  },
  input: {
    flex: 1,
    fontFamily: "Geist",
    fontSize: 15,
    color: c.textPrimary,
    backgroundColor: c.inputBackground,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: c.inputBorder,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: c.surfacePrimary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.inputBorder,
  },
  sendButtonActive: {
    backgroundColor: c.green,
    borderColor: c.green,
    shadowColor: c.greenShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },

  // Typing
  typingRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 14,
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: c.surfacePrimary,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: c.inputBorder,
  },
  typingDots: { flexDirection: "row", gap: 4 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.greenMuted,
  },
  typingText: {
    fontFamily: "Geist",
    fontSize: 11,
    color: c.textDim,
  },
  threadsLoadingIndicator: {
    paddingVertical: 20,
  },
  });
}
