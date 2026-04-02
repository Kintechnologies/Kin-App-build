import { useState, useRef, useEffect } from "react";
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
} from "react-native";
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
  MessageCircle,
  Lock,
  Globe,
  Lightbulb,
  Heart,
  Calendar,
  ShoppingCart,
  TrendingUp,
  Baby,
  Dog,
} from "lucide-react-native";
import { api } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import FloatingOrbs from "../../components/ui/FloatingOrbs";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: string;
}

interface ChatThread {
  id: string;
  title: string | null;
  is_private: boolean;
  updated_at: string;
  preview?: string;
}

const CONVERSATION_IDEAS = [
  { label: "Plan this week's meals", emoji: "🍽️", color: "#D4A843" },
  { label: "Budget check-in", emoji: "💰", color: "#7CB87A" },
  { label: "Date night ideas", emoji: "💕", color: "#D4748A" },
  { label: "What should the kids eat today?", emoji: "👶", color: "#7AADCE" },
  { label: "Help me find a summer camp", emoji: "🏕️", color: "#7CB87A" },
  { label: "Sunday family briefing", emoji: "📋", color: "#D4A843" },
  { label: "Suggest a quick weeknight dinner", emoji: "⚡", color: "#7CB87A" },
  { label: "What's coming up on the calendar?", emoji: "📅", color: "#7AADCE" },
  { label: "High-protein snack ideas", emoji: "💪", color: "#D4A843" },
  { label: "Help me grocery shop smarter", emoji: "🛒", color: "#D4A843" },
  { label: "Find a family-friendly activity nearby", emoji: "🎯", color: "#D4748A" },
  { label: "How can we save more this month?", emoji: "🐷", color: "#7CB87A" },
];

type ChatView = "list" | "conversation";

export default function Chat() {
  const [view, setView] = useState<ChatView>("list");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Thread state
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [subscriptionTier, setSubscriptionTier] = useState("free");

  useEffect(() => {
    loadThreads();
    checkSubscription();
  }, []);

  async function checkSubscription() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();
    if (data) setSubscriptionTier(data.subscription_tier || "free");
  }

  async function loadThreads() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("chat_threads")
      .select("id, title, is_private, updated_at")
      .eq("profile_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(20);

    if (data && data.length > 0) {
      const threadsWithPreviews = await Promise.all(
        data.map(async (thread) => {
          const { data: lastMsg } = await supabase
            .from("conversations")
            .select("content")
            .eq("thread_id", thread.id)
            .eq("role", "user")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          return {
            ...thread,
            preview: lastMsg?.content?.slice(0, 60) || "New conversation",
          };
        })
      );
      setThreads(threadsWithPreviews);
    }
  }

  async function loadMessages(threadId: string) {
    const { data } = await supabase
      .from("conversations")
      .select("id, role, content")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (data) {
      setMessages(data.map((m) => ({ ...m, role: m.role as "user" | "assistant" })));
    }
  }

  async function openThread(thread: ChatThread) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentThreadId(thread.id);
    setIsPrivate(thread.is_private);
    await loadMessages(thread.id);
    setView("conversation");
  }

  async function startNewChat(initialMessage?: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentThreadId(null);
    setMessages([]);
    setIsPrivate(false);
    setView("conversation");
    if (initialMessage) {
      // Small delay to let view switch happen
      setTimeout(() => sendMessage(initialMessage), 100);
    }
  }

  function goBackToList() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadThreads(); // Refresh list
    setView("list");
  }

  async function togglePrivacy() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newPrivate = !isPrivate;
    setIsPrivate(newPrivate);
    if (currentThreadId) {
      await supabase
        .from("chat_threads")
        .update({ is_private: newPrivate })
        .eq("id", currentThreadId);
    }
  }

  async function sendMessage(text?: string) {
    const messageText = text || input.trim();
    if (!messageText && !selectedImage) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    let threadId = currentThreadId;
    if (!threadId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("chat_threads")
        .insert({
          profile_id: user.id,
          title: messageText.slice(0, 60),
          is_private: isPrivate,
        })
        .select()
        .single();
      if (data) {
        threadId = data.id;
        setCurrentThreadId(data.id);
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      image: selectedImage || undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSelectedImage(null);
    setLoading(true);

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const { response } = await api.chat(messageText, selectedImage || undefined);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (threadId) {
        await supabase
          .from("chat_threads")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", threadId);
      }
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

  const isFamily = subscriptionTier === "family";

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CONVERSATION LIST VIEW
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (view === "list") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <FloatingOrbs />
        <FlatList
          data={[]}
          renderItem={() => null}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              {/* Header */}
              <View style={styles.listHeader}>
                <View style={styles.listHeaderLeft}>
                  <View style={styles.kinOrbSmall}>
                    <Sparkles size={16} color="#7CB87A" />
                  </View>
                  <Text style={styles.listTitle}>Kin</Text>
                </View>
              </View>

              {/* New chat CTA */}
              <Pressable
                style={({ pressed }) => [
                  styles.newChatCta,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                ]}
                onPress={() => startNewChat()}
              >
                <Plus size={20} color="#7CB87A" />
                <Text style={styles.newChatCtaText}>New conversation</Text>
              </Pressable>

              {/* Conversation ideas */}
              <Text style={styles.sectionLabel}>Try asking Kin</Text>
              <View style={styles.ideasGrid}>
                {CONVERSATION_IDEAS.map((idea) => (
                  <Pressable
                    key={idea.label}
                    style={({ pressed }) => [
                      styles.ideaCard,
                      pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] },
                    ]}
                    onPress={() => startNewChat(idea.label)}
                  >
                    <Text style={styles.ideaEmoji}>{idea.emoji}</Text>
                    <Text style={styles.ideaText}>{idea.label}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Past conversations */}
              {threads.length > 0 && (
                <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
                  Recent conversations
                </Text>
              )}
            </>
          }
          ListFooterComponent={
            <View>
              {threads.map((thread) => (
                <Pressable
                  key={thread.id}
                  style={({ pressed }) => [
                    styles.threadCard,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => openThread(thread)}
                >
                  <View style={styles.threadIconWrap}>
                    {thread.is_private ? (
                      <Lock size={14} color="#D4748A" />
                    ) : (
                      <MessageCircle size={14} color="rgba(240, 237, 230, 0.3)" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.threadTitle} numberOfLines={1}>
                      {thread.title || "Untitled"}
                    </Text>
                    <Text style={styles.threadPreview} numberOfLines={1}>
                      {thread.preview}
                    </Text>
                  </View>
                  <Text style={styles.threadTime}>
                    {new Date(thread.updated_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </Pressable>
              ))}
            </View>
          }
        />
      </SafeAreaView>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ACTIVE CONVERSATION VIEW
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const isEmpty = messages.length === 0 && !loading;

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
            <ChevronLeft size={22} color="#F0EDE6" />
          </Pressable>

          <View style={styles.headerCenter}>
            <View style={styles.headerAvatar}>
              <Sparkles size={14} color="#7CB87A" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Kin</Text>
              {isPrivate && (
                <View style={styles.privateBadge}>
                  <Lock size={8} color="#D4748A" />
                  <Text style={styles.privateBadgeText}>Private</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.headerActions}>
            {isFamily && (
              <Pressable
                onPress={togglePrivacy}
                style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.6 }]}
              >
                {isPrivate ? (
                  <Lock size={18} color="#D4748A" />
                ) : (
                  <Globe size={18} color="rgba(240, 237, 230, 0.35)" />
                )}
              </Pressable>
            )}
            <Pressable
              onPress={() => startNewChat()}
              style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.6 }]}
            >
              <Plus size={18} color="rgba(240, 237, 230, 0.35)" />
            </Pressable>
          </View>
        </View>

        {/* Messages */}
        {isEmpty ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Hey, I'm Kin</Text>
            <Text style={styles.emptySubtitle}>
              Your family's AI chief of staff. Ask me about meals, budget,
              scheduling — or just say hi.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={({ item }) => {
              const isUser = item.role === "user";
              return (
                <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
                  {!isUser && (
                    <View style={styles.avatar}>
                      <Sparkles size={14} color="#7CB87A" />
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
                          color={speaking ? "#7CB87A" : "rgba(240, 237, 230, 0.25)"}
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
            <Pressable onPress={() => setSelectedImage(null)} style={styles.removeImage}>
              <X size={12} color="#F0EDE6" />
            </Pressable>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputContainer}>
          <Pressable
            onPress={pickImage}
            style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}
          >
            <ImagePlus size={18} color="rgba(240, 237, 230, 0.35)" />
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
              <MicOff size={18} color="#D4748A" />
            ) : (
              <Mic size={18} color="rgba(240, 237, 230, 0.35)" />
            )}
          </Pressable>

          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask Kin anything..."
            placeholderTextColor="rgba(240, 237, 230, 0.2)"
            multiline
            maxLength={2000}
          />

          <Pressable
            onPress={() => sendMessage()}
            disabled={(!input.trim() && !selectedImage) || loading}
            style={({ pressed }) => [
              styles.sendButton,
              (input.trim() || selectedImage) && !loading ? styles.sendButtonActive : {},
              pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
            ]}
          >
            <Send
              size={16}
              color={
                (input.trim() || selectedImage) && !loading
                  ? "#0C0F0A"
                  : "rgba(240, 237, 230, 0.2)"
              }
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TypingIndicator() {
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
        <Sparkles size={14} color="#7CB87A" />
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0C0F0A" },
  container: { flex: 1 },

  // ── LIST VIEW ──
  listContent: { paddingHorizontal: 20, paddingBottom: 120 },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  listHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  kinOrbSmall: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "rgba(124, 184, 122, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  listTitle: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 26,
    color: "#7CB87A",
  },

  // New chat CTA
  newChatCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(124, 184, 122, 0.08)",
    borderRadius: 18,
    paddingVertical: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "rgba(124, 184, 122, 0.15)",
  },
  newChatCtaText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 15,
    color: "#7CB87A",
  },

  // Section labels
  sectionLabel: {
    fontFamily: "GeistMono-Regular",
    fontSize: 11,
    color: "rgba(240, 237, 230, 0.2)",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 12,
  },

  // Ideas grid
  ideasGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  ideaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#141810",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.04)",
  },
  ideaEmoji: { fontSize: 16 },
  ideaText: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.45)",
    flexShrink: 1,
  },

  // Thread cards
  threadCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#141810",
    borderRadius: 16,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.03)",
  },
  threadIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "rgba(240, 237, 230, 0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  threadTitle: {
    fontFamily: "Geist-SemiBold",
    fontSize: 14,
    color: "#F0EDE6",
    marginBottom: 2,
  },
  threadPreview: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.25)",
  },
  threadTime: {
    fontFamily: "GeistMono-Regular",
    fontSize: 10,
    color: "rgba(240, 237, 230, 0.15)",
  },

  // ── CONVERSATION VIEW ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(240, 237, 230, 0.04)",
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
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "rgba(124, 184, 122, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 18,
    color: "#7CB87A",
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
    color: "#D4748A",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: "row",
    gap: 4,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 32,
    color: "#F0EDE6",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: "Geist",
    fontSize: 15,
    color: "rgba(240, 237, 230, 0.4)",
    textAlign: "center",
    lineHeight: 22,
  },

  // Messages
  messageList: { paddingHorizontal: 16, paddingBottom: 8, paddingTop: 12 },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 16,
  },
  messageRowUser: { justifyContent: "flex-end" },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 12,
    backgroundColor: "rgba(124, 184, 122, 0.15)",
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
    backgroundColor: "#7CB87A",
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    backgroundColor: "#141810",
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.04)",
  },
  messageText: { fontFamily: "Geist", fontSize: 15, lineHeight: 22 },
  userText: { color: "#0C0F0A" },
  assistantText: { color: "rgba(240, 237, 230, 0.85)" },
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
    backgroundColor: "rgba(212, 116, 138, 0.8)",
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
    borderTopColor: "rgba(240, 237, 230, 0.04)",
    backgroundColor: "rgba(12, 15, 10, 0.9)",
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#141810",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.06)",
  },
  micActive: {
    backgroundColor: "rgba(212, 116, 138, 0.15)",
    borderColor: "rgba(212, 116, 138, 0.3)",
  },
  input: {
    flex: 1,
    fontFamily: "Geist",
    fontSize: 15,
    color: "#F0EDE6",
    backgroundColor: "#141810",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.06)",
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#141810",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.06)",
  },
  sendButtonActive: {
    backgroundColor: "#7CB87A",
    borderColor: "#7CB87A",
    shadowColor: "#7CB87A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },

  // Typing
  typingRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 16,
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#141810",
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.04)",
  },
  typingDots: { flexDirection: "row", gap: 4 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(124, 184, 122, 0.5)",
  },
  typingText: {
    fontFamily: "Geist",
    fontSize: 11,
    color: "rgba(240, 237, 230, 0.2)",
  },
});
