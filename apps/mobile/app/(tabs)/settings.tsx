import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  User,
  Crown,
  Sparkles,
  LogOut,
  Calendar,
  Gift,
  Moon,
  Sun,
  Monitor,
  Bell,
  BellOff,
  Shield,
  HelpCircle,
  FileText,
  ChevronRight,
  Mail,
  Users,
  CreditCard,
  Palette,
  Globe,
  Lock,
  Heart,
  Smartphone,
  Volume2,
} from "lucide-react-native";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { formatFamilyName } from "../../lib/utils";
import { useTheme, ThemeMode } from "../../lib/theme";
import { useSettings } from "../../lib/settings";

export default function Settings() {
  const { user, signOut } = useAuth();
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const { settings, updateSetting } = useSettings();
  const [profile, setProfile] = useState<{
    family_name: string;
    subscription_tier: string;
    trial_ends_at: string;
    referral_code: string;
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("family_name, subscription_tier, trial_ends_at, referral_code")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data);
      });
  }, [user]);

  function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          signOut();
        },
      },
    ]);
  }

  function setThemeTo(mode: ThemeMode) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setThemeMode(mode);
  }

  const tier = profile?.subscription_tier || "free";
  const tierLabel =
    tier === "family" ? "Family Plan" : tier === "starter" ? "Starter Plan" : "Free Trial";
  const tierColor =
    tier === "family" ? "#D4A843" : tier === "starter" ? "#7CB87A" : "rgba(240, 237, 230, 0.6)";
  const tierIcon = tier === "family" ? Crown : Sparkles;
  const TierIcon = tierIcon;

  const themeIcon = themeMode === "dark" ? Moon : themeMode === "light" ? Sun : Monitor;
  const themeLabel = themeMode === "dark" ? "Dark" : themeMode === "light" ? "Light" : "System";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Settings</Text>

        {/* ── ACCOUNT ── */}
        <Text style={styles.sectionLabel}>Account</Text>

        {/* Profile */}
        <Pressable style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.iconWrap}>
              <User size={20} color="#7CB87A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>
                {formatFamilyName(profile?.family_name)}
              </Text>
              <Text style={styles.cardSubtitle}>{user?.email}</Text>
            </View>
            <ChevronRight size={16} color="rgba(240, 237, 230, 0.15)" />
          </View>
        </Pressable>

        {/* Subscription */}
        <Pressable style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: `${tierColor}15` }]}>
              <TierIcon size={20} color={tierColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: tierColor }]}>{tierLabel}</Text>
              {tier === "free" && profile?.trial_ends_at && (
                <Text style={styles.cardSubtitle}>
                  {Math.max(
                    0,
                    Math.ceil(
                      (new Date(profile.trial_ends_at).getTime() - Date.now()) / 86400000
                    )
                  )}{" "}
                  days left in trial
                </Text>
              )}
              {tier !== "free" && (
                <Text style={styles.cardSubtitle}>Manage subscription</Text>
              )}
            </View>
            <ChevronRight size={16} color="rgba(240, 237, 230, 0.15)" />
          </View>
        </Pressable>

        {/* Family Members */}
        <Pressable style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: "rgba(212, 116, 138, 0.15)" }]}>
              <Users size={20} color="#D4748A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Family Members</Text>
              <Text style={styles.cardSubtitle}>Manage profiles and invite partner</Text>
            </View>
            <ChevronRight size={16} color="rgba(240, 237, 230, 0.15)" />
          </View>
        </Pressable>

        {/* ── INTEGRATIONS ── */}
        <Text style={styles.sectionLabel}>Integrations</Text>

        {/* Calendar */}
        <Pressable style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: "rgba(122, 173, 206, 0.15)" }]}>
              <Calendar size={20} color="#7AADCE" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Calendar Sync</Text>
              <Text style={styles.cardSubtitle}>Connect Google or Apple Calendar</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Not connected</Text>
            </View>
          </View>
        </Pressable>

        {/* ── PREFERENCES ── */}
        <Text style={styles.sectionLabel}>Preferences</Text>

        {/* Theme */}
        <Pressable style={styles.card} onPress={() => setThemeTo(themeMode === "dark" ? "light" : themeMode === "light" ? "system" : "dark")}>
          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: "rgba(122, 173, 206, 0.15)" }]}>
              {themeMode === "dark" ? (
                <Moon size={20} color="#7AADCE" />
              ) : themeMode === "light" ? (
                <Sun size={20} color="#7AADCE" />
              ) : (
                <Monitor size={20} color="#7AADCE" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Appearance</Text>
              <Text style={styles.cardSubtitle}>{themeLabel}</Text>
            </View>
            <View style={styles.themeChips}>
              {(["system", "light", "dark"] as ThemeMode[]).map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => setThemeTo(mode)}
                  style={[
                    styles.themeChip,
                    themeMode === mode && styles.themeChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.themeChipText,
                      themeMode === mode && styles.themeChipTextActive,
                    ]}
                  >
                    {mode === "system" ? "Auto" : mode === "light" ? "Light" : "Dark"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>

        {/* Notifications */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: "rgba(212, 168, 67, 0.15)" }]}>
              {settings.notifications ? (
                <Bell size={20} color="#D4A843" />
              ) : (
                <BellOff size={20} color="#D4A843" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Notifications</Text>
              <Text style={styles.cardSubtitle}>Push notifications</Text>
            </View>
            <Switch
              value={settings.notifications}
              onValueChange={(v) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateSetting("notifications", v);
              }}
              trackColor={{ false: "rgba(240, 237, 230, 0.08)", true: "rgba(124, 184, 122, 0.3)" }}
              thumbColor={settings.notifications ? "#7CB87A" : "rgba(240, 237, 230, 0.4)"}
            />
          </View>
        </View>

        {/* Meal Reminders */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: "rgba(212, 168, 67, 0.12)" }]}>
              <Sparkles size={20} color="#D4A843" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Meal Reminders</Text>
              <Text style={styles.cardSubtitle}>Daily meal prep nudges</Text>
            </View>
            <Switch
              value={settings.mealReminders}
              onValueChange={(v) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateSetting("mealReminders", v);
              }}
              trackColor={{ false: "rgba(240, 237, 230, 0.08)", true: "rgba(124, 184, 122, 0.3)" }}
              thumbColor={settings.mealReminders ? "#7CB87A" : "rgba(240, 237, 230, 0.4)"}
            />
          </View>
        </View>

        {/* Budget Alerts */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: "rgba(212, 168, 67, 0.12)" }]}>
              <CreditCard size={20} color="#D4A843" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Budget Alerts</Text>
              <Text style={styles.cardSubtitle}>Notify at 90% of budget</Text>
            </View>
            <Switch
              value={settings.budgetAlerts}
              onValueChange={(v) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateSetting("budgetAlerts", v);
              }}
              trackColor={{ false: "rgba(240, 237, 230, 0.08)", true: "rgba(124, 184, 122, 0.3)" }}
              thumbColor={settings.budgetAlerts ? "#7CB87A" : "rgba(240, 237, 230, 0.4)"}
            />
          </View>
        </View>

        {/* Voice */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: "rgba(124, 184, 122, 0.12)" }]}>
              <Volume2 size={20} color="#7CB87A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Voice Responses</Text>
              <Text style={styles.cardSubtitle}>Read Kin's responses aloud</Text>
            </View>
            <Switch
              value={settings.voiceEnabled}
              onValueChange={(v) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateSetting("voiceEnabled", v);
              }}
              trackColor={{ false: "rgba(240, 237, 230, 0.08)", true: "rgba(124, 184, 122, 0.3)" }}
              thumbColor={settings.voiceEnabled ? "#7CB87A" : "rgba(240, 237, 230, 0.4)"}
            />
          </View>
        </View>

        {/* Haptics */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: "rgba(122, 173, 206, 0.12)" }]}>
              <Smartphone size={20} color="#7AADCE" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Haptic Feedback</Text>
              <Text style={styles.cardSubtitle}>Vibration on interactions</Text>
            </View>
            <Switch
              value={settings.haptics}
              onValueChange={(v) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateSetting("haptics", v);
              }}
              trackColor={{ false: "rgba(240, 237, 230, 0.08)", true: "rgba(124, 184, 122, 0.3)" }}
              thumbColor={settings.haptics ? "#7CB87A" : "rgba(240, 237, 230, 0.4)"}
            />
          </View>
        </View>

        {/* ── REFERRAL ── */}
        <Text style={styles.sectionLabel}>Earn</Text>

        <Pressable style={[styles.card, styles.referralCard]}>
          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: "rgba(212, 168, 67, 0.2)" }]}>
              <Gift size={20} color="#D4A843" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: "#D4A843" }]}>Refer a Family</Text>
              <Text style={styles.cardSubtitle}>Share Kin, earn free months</Text>
            </View>
            <ChevronRight size={16} color="#D4A843" />
          </View>
        </Pressable>

        {/* ── ABOUT ── */}
        <Text style={styles.sectionLabel}>About</Text>

        <Pressable style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: "rgba(240, 237, 230, 0.05)" }]}>
              <Shield size={20} color="rgba(240, 237, 230, 0.4)" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Privacy Policy</Text>
            </View>
            <ChevronRight size={16} color="rgba(240, 237, 230, 0.15)" />
          </View>
        </Pressable>

        <Pressable style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: "rgba(240, 237, 230, 0.05)" }]}>
              <FileText size={20} color="rgba(240, 237, 230, 0.4)" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Terms of Service</Text>
            </View>
            <ChevronRight size={16} color="rgba(240, 237, 230, 0.15)" />
          </View>
        </Pressable>

        <Pressable style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: "rgba(240, 237, 230, 0.05)" }]}>
              <HelpCircle size={20} color="rgba(240, 237, 230, 0.4)" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Help & Support</Text>
            </View>
            <ChevronRight size={16} color="rgba(240, 237, 230, 0.15)" />
          </View>
        </Pressable>

        <Pressable style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: "rgba(240, 237, 230, 0.05)" }]}>
              <Mail size={20} color="rgba(240, 237, 230, 0.4)" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Contact Us</Text>
              <Text style={styles.cardSubtitle}>hello@kinai.family</Text>
            </View>
            <ChevronRight size={16} color="rgba(240, 237, 230, 0.15)" />
          </View>
        </Pressable>

        {/* Sign Out */}
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.signOutButton,
            pressed && { opacity: 0.7 },
          ]}
        >
          <LogOut size={16} color="rgba(240, 237, 230, 0.4)" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        {/* Version */}
        <Text style={styles.versionText}>Kin v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0C0F0A" },
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 120 },

  pageTitle: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 28,
    color: "#7CB87A",
    marginTop: 8,
    marginBottom: 24,
  },

  sectionLabel: {
    fontFamily: "GeistMono-Regular",
    fontSize: 11,
    color: "rgba(240, 237, 230, 0.2)",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginTop: 20,
    marginBottom: 10,
    marginLeft: 4,
  },

  card: {
    backgroundColor: "#141810",
    borderRadius: 18,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.04)",
  },
  referralCard: {
    borderColor: "rgba(212, 168, 67, 0.12)",
    backgroundColor: "rgba(212, 168, 67, 0.04)",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(124, 184, 122, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontFamily: "Geist-SemiBold",
    fontSize: 15,
    color: "#F0EDE6",
    marginBottom: 2,
  },
  cardSubtitle: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.3)",
  },

  // Badge
  badge: {
    backgroundColor: "rgba(212, 116, 138, 0.12)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: "GeistMono-Regular",
    fontSize: 10,
    color: "#D4748A",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Theme chips
  themeChips: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: "rgba(240, 237, 230, 0.03)",
    borderRadius: 10,
    padding: 3,
  },
  themeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  themeChipActive: {
    backgroundColor: "rgba(160, 126, 200, 0.2)",
  },
  themeChipText: {
    fontFamily: "Geist",
    fontSize: 11,
    color: "rgba(240, 237, 230, 0.25)",
  },
  themeChipTextActive: {
    color: "#7AADCE",
    fontFamily: "Geist-SemiBold",
  },

  // Sign out
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#141810",
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.04)",
  },
  signOutText: {
    fontFamily: "Geist",
    fontSize: 15,
    color: "rgba(240, 237, 230, 0.4)",
  },

  // Version
  versionText: {
    fontFamily: "GeistMono-Regular",
    fontSize: 11,
    color: "rgba(240, 237, 230, 0.1)",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
  },
});
