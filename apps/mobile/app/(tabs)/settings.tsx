import { useState, useEffect, useMemo } from "react";
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
import { useTheme, useThemeColors, ThemeMode } from "../../lib/theme";
import { type ThemeColors } from "../../constants/colors";
import { useSettings } from "../../lib/settings";
import { initRevenueCat } from "../../lib/revenuecat";
import PaywallModal from "../../components/paywall/PaywallModal";

export default function Settings() {
  const { user, signOut } = useAuth();
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const c = useThemeColors();
  const styles = useMemo(() => createSettingsStyles(c), [c]);
  const { settings, updateSetting } = useSettings();
  const [profile, setProfile] = useState<{
    family_name: string;
    subscription_tier: string;
    trial_ends_at: string;
    referral_code: string;
  } | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

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
    // Initialise RevenueCat with the authenticated user ID so RC can link
    // purchases to the Supabase account. Safe to call multiple times.
    initRevenueCat(user.id);
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
    tier === "family" ? c.amber : tier === "starter" ? c.green : c.textSecondary;
  const tierBg =
    tier === "family" ? c.amberSubtle : tier === "starter" ? c.greenSubtle : c.surfaceSubtle;
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
              <User size={20} color={c.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>
                {formatFamilyName(profile?.family_name)}
              </Text>
              <Text style={styles.cardSubtitle}>{user?.email}</Text>
            </View>
            <ChevronRight size={16} color={c.textFaint} />
          </View>
        </Pressable>

        {/* Subscription */}
        <Pressable
          style={styles.card}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowPaywall(true);
          }}
        >
          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: tierBg }]}>
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
                  days left in trial — tap to upgrade
                </Text>
              )}
              {tier === "free" && !profile?.trial_ends_at && (
                <Text style={styles.cardSubtitle}>Start your 7-day free trial</Text>
              )}
              {tier !== "free" && (
                <Text style={styles.cardSubtitle}>Manage subscription</Text>
              )}
            </View>
            <ChevronRight size={16} color={tier === "free" ? c.textFaint : tierColor} />
          </View>
        </Pressable>

        {/* Paywall modal */}
        <PaywallModal
          visible={showPaywall}
          onClose={() => setShowPaywall(false)}
          onSuccess={() => {
            // Re-fetch profile to refresh the subscription tier shown in settings
            if (user) {
              supabase
                .from("profiles")
                .select("family_name, subscription_tier, trial_ends_at, referral_code")
                .eq("id", user.id)
                .single()
                .then(({ data }) => {
                  if (data) setProfile(data);
                });
            }
          }}
        />

        {/* Family Members */}
        <Pressable style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: c.roseSubtle }]}>
              <Users size={20} color={c.rose} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Family Members</Text>
              <Text style={styles.cardSubtitle}>Manage profiles and invite partner</Text>
            </View>
            <ChevronRight size={16} color={c.textFaint} />
          </View>
        </Pressable>

        {/* ── INTEGRATIONS ── */}
        <Text style={styles.sectionLabel}>Integrations</Text>

        {/* Calendar */}
        <Pressable style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: c.blueSubtle }]}>
              <Calendar size={20} color={c.blue} />
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
            <View style={[styles.iconWrap, { backgroundColor: c.blueSubtle }]}>
              {themeMode === "dark" ? (
                <Moon size={20} color={c.blue} />
              ) : themeMode === "light" ? (
                <Sun size={20} color={c.blue} />
              ) : (
                <Monitor size={20} color={c.blue} />
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
            <View style={[styles.iconWrap, { backgroundColor: c.amberSubtle }]}>
              {settings.notifications ? (
                <Bell size={20} color={c.amber} />
              ) : (
                <BellOff size={20} color={c.amber} />
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
              trackColor={{ false: c.skeletonBase, true: c.greenDim }}
              thumbColor={settings.notifications ? c.green : c.textMuted}
            />
          </View>
        </View>

        {/* Meal Reminders */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: c.amberSubtle }]}>
              <Sparkles size={20} color={c.amber} />
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
              trackColor={{ false: c.skeletonBase, true: c.greenDim }}
              thumbColor={settings.mealReminders ? c.green : c.textMuted}
            />
          </View>
        </View>

        {/* Budget Alerts */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: c.amberSubtle }]}>
              <CreditCard size={20} color={c.amber} />
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
              trackColor={{ false: c.skeletonBase, true: c.greenDim }}
              thumbColor={settings.budgetAlerts ? c.green : c.textMuted}
            />
          </View>
        </View>

        {/* Voice */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: c.greenSubtle }]}>
              <Volume2 size={20} color={c.green} />
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
              trackColor={{ false: c.skeletonBase, true: c.greenDim }}
              thumbColor={settings.voiceEnabled ? c.green : c.textMuted}
            />
          </View>
        </View>

        {/* Haptics */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: c.blueSubtle }]}>
              <Smartphone size={20} color={c.blue} />
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
              trackColor={{ false: c.skeletonBase, true: c.greenDim }}
              thumbColor={settings.haptics ? c.green : c.textMuted}
            />
          </View>
        </View>

        {/* ── REFERRAL ── */}
        <Text style={styles.sectionLabel}>Earn</Text>

        <Pressable style={[styles.card, styles.referralCard]}>
          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: c.amberSubtle }]}>
              <Gift size={20} color={c.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: c.amber }]}>Refer a Family</Text>
              <Text style={styles.cardSubtitle}>Share Kin, earn free months</Text>
            </View>
            <ChevronRight size={16} color={c.amber} />
          </View>
        </Pressable>

        {/* ── ABOUT ── */}
        <Text style={styles.sectionLabel}>About</Text>

        <Pressable style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: c.surfaceSubtle }]}>
              <Shield size={20} color={c.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Privacy Policy</Text>
            </View>
            <ChevronRight size={16} color={c.textFaint} />
          </View>
        </Pressable>

        <Pressable style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: c.surfaceSubtle }]}>
              <FileText size={20} color={c.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Terms of Service</Text>
            </View>
            <ChevronRight size={16} color={c.textFaint} />
          </View>
        </Pressable>

        <Pressable style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: c.surfaceSubtle }]}>
              <HelpCircle size={20} color={c.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Help & Support</Text>
            </View>
            <ChevronRight size={16} color={c.textFaint} />
          </View>
        </Pressable>

        <Pressable style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: c.surfaceSubtle }]}>
              <Mail size={20} color={c.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Contact Us</Text>
              <Text style={styles.cardSubtitle}>hello@kinai.family</Text>
            </View>
            <ChevronRight size={16} color={c.textFaint} />
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
          <LogOut size={16} color={c.textMuted} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        {/* Version */}
        <Text style={styles.versionText}>Kin v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles factory ───────────────────────────────────────────────────────────
// Spec: docs/specs/light-theme-spec.md §8 — Settings Screen (B23)

function createSettingsStyles(c: ThemeColors) {
  return StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: c.background },
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 120 },

  pageTitle: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 28,
    color: c.green,
    marginTop: 8,
    marginBottom: 24,
  },

  sectionLabel: {
    fontFamily: "GeistMono-Regular",
    fontSize: 11,
    color: c.textDim,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginTop: 20,
    marginBottom: 10,
    marginLeft: 4,
  },

  card: {
    backgroundColor: c.surfacePrimary,
    borderRadius: 18,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: c.surfaceSubtle,
  },
  referralCard: {
    borderColor: c.amberBorder,
    backgroundColor: c.amberSubtle,
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
    backgroundColor: c.greenSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontFamily: "Geist-SemiBold",
    fontSize: 15,
    color: c.textPrimary,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontFamily: "Geist",
    fontSize: 13,
    color: c.textMuted,
  },

  // Badge
  badge: {
    backgroundColor: c.roseSubtle,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: "GeistMono-Regular",
    fontSize: 10,
    color: c.rose,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Theme chips
  themeChips: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: c.surfaceSubtle,
    borderRadius: 10,
    padding: 3,
  },
  themeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  themeChipActive: {
    backgroundColor: c.blueSubtle,
  },
  themeChipText: {
    fontFamily: "Geist",
    fontSize: 11,
    color: c.textAcknowledged,
  },
  themeChipTextActive: {
    color: c.blue,
    fontFamily: "Geist-SemiBold",
  },

  // Sign out
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: c.surfacePrimary,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: c.surfaceSubtle,
  },
  signOutText: {
    fontFamily: "Geist",
    fontSize: 15,
    color: c.textMuted,
  },

  // Version
  versionText: {
    fontFamily: "GeistMono-Regular",
    fontSize: 11,
    color: c.textFaint,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  });
}
