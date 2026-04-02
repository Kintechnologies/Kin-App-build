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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  Wallet,
  DollarSign,
  TrendingUp,
  PiggyBank,
  ShoppingBag,
  Home,
  Plus,
  ChevronRight,
  Check,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";

type BudgetView = "setup" | "dashboard";

const CATEGORIES = {
  needs: { label: "Needs", percent: 50, color: "#7CB87A", icon: Home },
  wants: { label: "Wants", percent: 30, color: "#D4A843", icon: ShoppingBag },
  savings: { label: "Savings", percent: 20, color: "#7AADCE", icon: PiggyBank },
};

export default function Budget() {
  const [view, setView] = useState<BudgetView>("setup");
  const [loading, setLoading] = useState(true);
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [incomeType, setIncomeType] = useState<"monthly" | "annual">("monthly");
  const [savedIncome, setSavedIncome] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkIncome();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  async function checkIncome() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("household_income")
      .select("monthly_income")
      .eq("profile_id", user.id)
      .single();

    if (data && data.monthly_income > 0) {
      setSavedIncome(data.monthly_income);
      setView("dashboard");
    }
    setLoading(false);
  }

  async function saveIncome() {
    const raw = parseFloat(monthlyIncome.replace(/,/g, ""));
    if (isNaN(raw) || raw <= 0) return;

    const monthly = incomeType === "annual" ? raw / 12 : raw;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("household_income").upsert({
      profile_id: user.id,
      monthly_income: monthly,
    });

    setSavedIncome(monthly);
    setView("dashboard");
  }

  function formatCurrency(amount: number) {
    return "$" + amount.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#A07EC8" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // Income setup
  if (view === "setup") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container} contentContainerStyle={styles.setupContent} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.setupCenter, { opacity: fadeAnim }]}>
            <View style={styles.setupIconWrap}>
              <Wallet size={28} color="#A07EC8" />
            </View>
            <Text style={styles.setupTitle}>Budget Tracker</Text>
            <Text style={styles.setupSubtitle}>
              The 50/30/20 rule made simple. Kin tracks your spending across needs, wants, and savings — and alerts you before you go over.
            </Text>

            {/* Value props */}
            <View style={styles.valueProps}>
              {[
                { emoji: "📊", text: "Automatic 50/30/20 budget breakdown" },
                { emoji: "🔔", text: "Alerts when you hit 90% of a category" },
                { emoji: "🔒", text: "Private spending — your partner only sees combined totals" },
                { emoji: "📈", text: "Monthly trends and insights from Kin" },
              ].map((prop) => (
                <View key={prop.text} style={styles.valuePropRow}>
                  <Text style={{ fontSize: 18 }}>{prop.emoji}</Text>
                  <Text style={styles.valuePropText}>{prop.text}</Text>
                </View>
              ))}
            </View>

            {/* Income type toggle */}
            <View style={styles.incomeToggle}>
              <Pressable
                style={[styles.toggleOption, incomeType === "monthly" && styles.toggleOptionActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIncomeType("monthly");
                }}
              >
                <Text style={[styles.toggleOptionText, incomeType === "monthly" && styles.toggleOptionTextActive]}>
                  Monthly
                </Text>
              </Pressable>
              <Pressable
                style={[styles.toggleOption, incomeType === "annual" && styles.toggleOptionActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIncomeType("annual");
                }}
              >
                <Text style={[styles.toggleOptionText, incomeType === "annual" && styles.toggleOptionTextActive]}>
                  Annual
                </Text>
              </Pressable>
            </View>

            {/* Income input */}
            <View style={styles.incomeInputWrap}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.incomeInput}
                value={monthlyIncome}
                onChangeText={setMonthlyIncome}
                placeholder={incomeType === "monthly" ? "8,000" : "96,000"}
                placeholderTextColor="rgba(240, 237, 230, 0.15)"
                keyboardType="numeric"
                autoFocus
              />
            </View>
            <Text style={styles.incomeHint}>
              {incomeType === "annual" ? "We'll divide by 12 for monthly budgets" : "Combined household take-home pay"}
            </Text>

            {/* Preview breakdown */}
            {monthlyIncome && parseFloat(monthlyIncome.replace(/,/g, "")) > 0 && (
              <View style={styles.previewCard}>
                <Text style={styles.previewTitle}>Your 50/30/20 Breakdown</Text>
                {Object.entries(CATEGORIES).map(([key, cat]) => {
                  const raw = parseFloat(monthlyIncome.replace(/,/g, ""));
                  const monthly = incomeType === "annual" ? raw / 12 : raw;
                  const amount = (monthly * cat.percent) / 100;
                  return (
                    <View key={key} style={styles.previewRow}>
                      <View style={[styles.previewDot, { backgroundColor: cat.color }]} />
                      <Text style={styles.previewLabel}>{cat.label} ({cat.percent}%)</Text>
                      <Text style={[styles.previewAmount, { color: cat.color }]}>
                        {formatCurrency(amount)}/mo
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            <Pressable
              style={[
                styles.saveButton,
                (!monthlyIncome || parseFloat(monthlyIncome.replace(/,/g, "")) <= 0) && styles.saveButtonDisabled,
              ]}
              onPress={saveIncome}
              disabled={!monthlyIncome || parseFloat(monthlyIncome.replace(/,/g, "")) <= 0}
            >
              <Text style={styles.saveButtonText}>Set Up My Budget</Text>
              <ChevronRight size={16} color="#0C0F0A" />
            </Pressable>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Dashboard view
  const needs = (savedIncome * 50) / 100;
  const wants = (savedIncome * 30) / 100;
  const savings = (savedIncome * 20) / 100;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Budget</Text>
        <Text style={styles.incomeLabel}>
          Monthly income: {formatCurrency(savedIncome)}
        </Text>

        {/* 50/30/20 Cards */}
        {[
          { ...CATEGORIES.needs, budget: needs, spent: 0 },
          { ...CATEGORIES.wants, budget: wants, spent: 0 },
          { ...CATEGORIES.savings, budget: savings, spent: 0 },
        ].map((cat) => {
          const pct = cat.budget > 0 ? (cat.spent / cat.budget) * 100 : 0;
          return (
            <View key={cat.label} style={styles.budgetCard}>
              <View style={styles.budgetCardHeader}>
                <View style={[styles.budgetIconWrap, { backgroundColor: `${cat.color}15` }]}>
                  <cat.icon size={18} color={cat.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.budgetCardTitle}>{cat.label}</Text>
                  <Text style={styles.budgetCardPercent}>{cat.percent}% of income</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.budgetAmount, { color: cat.color }]}>
                    {formatCurrency(cat.budget)}
                  </Text>
                  <Text style={styles.budgetSpent}>
                    {formatCurrency(cat.spent)} spent
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(pct, 100)}%`,
                      backgroundColor: cat.color,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}

        {/* Add transaction CTA */}
        <Pressable
          style={({ pressed }) => [
            styles.addTransactionButton,
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        >
          <Plus size={18} color="#A07EC8" />
          <Text style={styles.addTransactionText}>Add Transaction</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0C0F0A" },
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 120 },
  setupContent: { paddingHorizontal: 20, paddingBottom: 120, flexGrow: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Setup
  setupCenter: { flex: 1, justifyContent: "center", alignItems: "center" },
  setupIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: "rgba(160, 126, 200, 0.1)",
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

  // Value props
  valueProps: {
    width: "100%",
    marginBottom: 24,
  },
  valuePropRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  valuePropText: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.45)",
    flex: 1,
    lineHeight: 19,
  },

  // Income toggle
  incomeToggle: {
    flexDirection: "row",
    backgroundColor: "#141810",
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.04)",
  },
  toggleOption: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  toggleOptionActive: {
    backgroundColor: "rgba(160, 126, 200, 0.2)",
  },
  toggleOptionText: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.35)",
  },
  toggleOptionTextActive: {
    color: "#A07EC8",
    fontFamily: "Geist-SemiBold",
  },

  // Income input
  incomeInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141810",
    borderRadius: 20,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(160, 126, 200, 0.15)",
    width: "100%",
    marginBottom: 8,
  },
  dollarSign: {
    fontFamily: "Geist-SemiBold",
    fontSize: 28,
    color: "#A07EC8",
    marginRight: 4,
  },
  incomeInput: {
    flex: 1,
    fontFamily: "Geist-SemiBold",
    fontSize: 28,
    color: "#F0EDE6",
    paddingVertical: 18,
  },
  incomeHint: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.2)",
    marginBottom: 24,
  },

  // Preview
  previewCard: {
    backgroundColor: "#141810",
    borderRadius: 20,
    padding: 18,
    width: "100%",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.04)",
  },
  previewTitle: {
    fontFamily: "Geist-SemiBold",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.35)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 14,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  previewDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  previewLabel: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.5)",
    flex: 1,
  },
  previewAmount: {
    fontFamily: "Geist-SemiBold",
    fontSize: 15,
  },

  // Save button
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#A07EC8",
    borderRadius: 16,
    paddingVertical: 16,
    width: "100%",
    shadowColor: "#A07EC8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 15,
    color: "#0C0F0A",
  },

  // Dashboard
  pageTitle: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 28,
    color: "#A07EC8",
    marginTop: 8,
    marginBottom: 4,
  },
  incomeLabel: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.3)",
    marginBottom: 24,
  },

  // Budget cards
  budgetCard: {
    backgroundColor: "#141810",
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.04)",
  },
  budgetCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  budgetIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  budgetCardTitle: {
    fontFamily: "Geist-SemiBold",
    fontSize: 15,
    color: "#F0EDE6",
  },
  budgetCardPercent: {
    fontFamily: "GeistMono-Regular",
    fontSize: 11,
    color: "rgba(240, 237, 230, 0.2)",
    marginTop: 1,
  },
  budgetAmount: {
    fontFamily: "Geist-SemiBold",
    fontSize: 17,
  },
  budgetSpent: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.25)",
    marginTop: 1,
  },

  // Progress bar
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(240, 237, 230, 0.06)",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },

  // Add transaction
  addTransactionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#141810",
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(160, 126, 200, 0.12)",
    borderStyle: "dashed",
  },
  addTransactionText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 14,
    color: "#A07EC8",
  },
});
