/**
 * B6 — Calendar Connect Prompt
 * Shown as a modal after onboarding completes.
 * "Connect Google Calendar" → opens Google OAuth flow in device browser.
 * "Connect Apple Calendar" → shows app-specific password instructions.
 */

import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  Animated,
  Linking,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Calendar, X, ChevronRight, Apple, Globe } from "lucide-react-native";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://kinai.family";

interface CalendarConnectModalProps {
  visible: boolean;
  onDismiss: () => void;
}

type ModalView = "main" | "apple_instructions";

export default function CalendarConnectModal({
  visible,
  onDismiss,
}: CalendarConnectModalProps) {
  const [currentView, setCurrentView] = useState<ModalView>("main");
  const [googleConnecting, setGoogleConnecting] = useState(false);

  const slideAnim = useRef(new Animated.Value(600)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setCurrentView("main");
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 600,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  async function handleGoogleConnect() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGoogleConnecting(true);

    try {
      // Opens the Google Calendar OAuth flow in the device browser.
      // On return, the web app stores the OAuth tokens in Supabase.
      const oauthUrl = `${API_URL}/api/calendar/google/auth`;
      const canOpen = await Linking.canOpenURL(oauthUrl);
      if (canOpen) {
        await Linking.openURL(oauthUrl);
      }
    } catch {
      // Silently fail — user can retry from Settings
    } finally {
      setGoogleConnecting(false);
    }
  }

  function handleAppleConnect() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentView("apple_instructions");
  }

  function handleDismiss() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  }

  function handleBack() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentView("main");
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropAnim }]}
        pointerEvents={visible ? "auto" : "none"}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
      </Animated.View>

      {/* Bottom sheet */}
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
      >
        {/* Handle */}
        <View style={styles.handleRow}>
          <View style={styles.handle} />
        </View>

        {currentView === "main" ? (
          <MainView
            onGoogle={handleGoogleConnect}
            onApple={handleAppleConnect}
            onDismiss={handleDismiss}
            googleConnecting={googleConnecting}
          />
        ) : (
          <AppleInstructionsView onBack={handleBack} onDismiss={handleDismiss} />
        )}
      </Animated.View>
    </Modal>
  );
}

// ── Main view ──────────────────────────────────────────────────────────────

interface MainViewProps {
  onGoogle: () => void;
  onApple: () => void;
  onDismiss: () => void;
  googleConnecting: boolean;
}

function MainView({ onGoogle, onApple, onDismiss, googleConnecting }: MainViewProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Dismiss */}
      <Pressable style={styles.dismissBtn} onPress={onDismiss} hitSlop={12}>
        <X size={18} color="rgba(240, 237, 230, 0.4)" />
      </Pressable>

      {/* Icon */}
      <View style={styles.iconCircle}>
        <Calendar size={28} color="#A07EC8" />
      </View>

      {/* Headline */}
      <Text style={styles.headline}>Connect your calendar</Text>
      <Text style={styles.subheadline}>
        Without your calendar, Kin is guessing. Connect once and your morning
        briefing will reflect your actual day — commutes, pickups, meetings, all of it.
      </Text>
      <Text style={styles.privacyNote}>Read-only · Kin sees your events, not your emails</Text>

      {/* Google */}
      <Pressable
        style={({ pressed }) => [
          styles.option,
          pressed && { opacity: 0.85 },
          googleConnecting && { opacity: 0.6 },
        ]}
        onPress={onGoogle}
        disabled={googleConnecting}
      >
        <View style={[styles.optionIcon, { backgroundColor: "rgba(66, 133, 244, 0.12)" }]}>
          <Globe size={22} color="#4285F4" />
        </View>
        <View style={styles.optionText}>
          <Text style={styles.optionTitle}>
            {googleConnecting ? "Opening…" : "Connect Google Calendar"}
          </Text>
          <Text style={styles.optionDesc}>Personal calendar • 2-way sync</Text>
        </View>
        <ChevronRight size={16} color="rgba(240, 237, 230, 0.2)" />
      </Pressable>

      {/* Apple */}
      <Pressable
        style={({ pressed }) => [styles.option, pressed && { opacity: 0.85 }]}
        onPress={onApple}
      >
        <View style={[styles.optionIcon, { backgroundColor: "rgba(240, 237, 230, 0.06)" }]}>
          <Apple size={22} color="#F0EDE6" />
        </View>
        <View style={styles.optionText}>
          <Text style={styles.optionTitle}>Connect Apple Calendar</Text>
          <Text style={styles.optionDesc}>iCloud CalDAV • 15-min sync</Text>
        </View>
        <ChevronRight size={16} color="rgba(240, 237, 230, 0.2)" />
      </Pressable>

      {/* Skip */}
      <Pressable style={styles.skipBtn} onPress={onDismiss}>
        <Text style={styles.skipText}>Skip for now</Text>
      </Pressable>
    </ScrollView>
  );
}

// ── Apple instructions view ────────────────────────────────────────────────

interface AppleViewProps {
  onBack: () => void;
  onDismiss: () => void;
}

function AppleInstructionsView({ onBack, onDismiss }: AppleViewProps) {
  const steps = [
    {
      num: "1",
      title: "Open Settings on your iPhone",
      desc: 'Go to Settings → tap your name → iCloud → toggle "Calendars" on.',
    },
    {
      num: "2",
      title: "Generate an App-Specific Password",
      desc: "Go to appleid.apple.com → Sign In → App-Specific Passwords → Generate. Name it 'Kin'.",
    },
    {
      num: "3",
      title: "Enter your iCloud email + password in Kin",
      desc: "Go to Settings → Calendar → Connect Apple Calendar. Enter your Apple ID email and the app-specific password.",
    },
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Back + dismiss */}
      <View style={styles.appleHeader}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Pressable onPress={onDismiss} style={styles.dismissBtn} hitSlop={12}>
          <X size={18} color="rgba(240, 237, 230, 0.4)" />
        </Pressable>
      </View>

      <View style={styles.iconCircle}>
        <Apple size={28} color="#F0EDE6" />
      </View>

      <Text style={styles.headline}>Connect Apple Calendar</Text>
      <Text style={styles.subheadline}>
        Apple Calendar uses iCloud CalDAV with an app-specific password. Takes
        about 2 minutes.
      </Text>

      {steps.map((step) => (
        <View key={step.num} style={styles.stepRow}>
          <View style={styles.stepNumCircle}>
            <Text style={styles.stepNum}>{step.num}</Text>
          </View>
          <View style={styles.stepText}>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepDesc}>{step.desc}</Text>
          </View>
        </View>
      ))}

      <Pressable
        style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
        onPress={() => Linking.openURL("https://appleid.apple.com")}
      >
        <Text style={styles.primaryBtnText}>Open Apple ID →</Text>
      </Pressable>

      <Pressable style={styles.skipBtn} onPress={onDismiss}>
        <Text style={styles.skipText}>I'll do this later in Settings</Text>
      </Pressable>
    </ScrollView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },

  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#141810",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: "rgba(160, 126, 200, 0.15)",
    maxHeight: "90%",
  },

  handleRow: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(240, 237, 230, 0.12)",
  },

  content: {
    padding: 24,
    paddingBottom: 48,
  },

  dismissBtn: {
    alignSelf: "flex-end",
    padding: 4,
    marginBottom: 4,
  },

  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "rgba(160, 126, 200, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(160, 126, 200, 0.18)",
  },

  headline: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 24,
    color: "#F0EDE6",
    textAlign: "center",
    marginBottom: 10,
  },
  subheadline: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.45)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  privacyNote: {
    fontFamily: "GeistMono-Regular",
    fontSize: 11,
    color: "rgba(240, 237, 230, 0.22)",
    textAlign: "center",
    letterSpacing: 0.3,
    marginBottom: 24,
  },

  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(240, 237, 230, 0.04)",
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.06)",
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: { flex: 1 },
  optionTitle: {
    fontFamily: "Geist-SemiBold",
    fontSize: 15,
    color: "#F0EDE6",
    marginBottom: 2,
  },
  optionDesc: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.35)",
  },

  skipBtn: {
    marginTop: 18,
    alignItems: "center",
  },
  skipText: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.2)",
    textAlign: "center",
    lineHeight: 18,
  },

  // Apple instructions
  appleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  backBtn: { padding: 4 },
  backText: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.45)",
  },

  stepRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 20,
  },
  stepNumCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(160, 126, 200, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  stepNum: {
    fontFamily: "Geist-Bold",
    fontSize: 13,
    color: "#A07EC8",
  },
  stepText: { flex: 1 },
  stepTitle: {
    fontFamily: "Geist-SemiBold",
    fontSize: 14,
    color: "#F0EDE6",
    marginBottom: 4,
    lineHeight: 20,
  },
  stepDesc: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.45)",
    lineHeight: 19,
  },

  primaryBtn: {
    backgroundColor: "#7CB87A",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 15,
    color: "#0C0F0A",
  },
});
