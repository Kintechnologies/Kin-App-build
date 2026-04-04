import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Animated,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  Wallet,
  Plus,
  ChevronRight,
  X,
  AlertTriangle,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { api } from "../../lib/api";
import { BUDGET_CATEGORIES, type BudgetBucket } from "@kin/shared";

type BudgetView = "setup" | "dashboard";

// Brand-compliant category colors
const BUCKET_COLORS: Record<BudgetBucket, string> = {
  needs: "#7CB87A",   // primary green
  wants: "#D4A843",   // amber
  savings: "#7AADCE", // blue (existing, brand-neutral)
};

interface BudgetCategory {
  id: string;
  profile_id: string;
  name: string;
  monthly_limit: number;
  color: string;
  active: boolean;
}

interface Transaction {
  id: string;
  category_id: string;
  amount: number;
  description: string | null;
  date: string;
  category_name?: string;
  category_color?: string;
}

// Raw row returned by Supabase join (transactions + budget_categories)
interface RawTransactionRow {
  id: string;
  category_id: string;
  amount: number;
  description: string | null;
  date: string;
  budget_categories?: { name?: string; color?: string } | null;
}

function getMonthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
}

const SUGGESTED_CATEGORIES = [
  { name: "Groceries", monthly_limit: 400, color: "#7CB87A" },
  { name: "Dining Out", monthly_limit: 200, color: "#D4A843" },
  { name: "Entertainment", monthly_limit: 100, color: "#A07EC8" },
  { name: "Household", monthly_limit: 300, color: "#7AADCE" },
  { name: "Subscriptions", monthly_limit: 150, color: "#D4748A" },
  { name: "Other", monthly_limit: 100, color: "rgba(240, 237, 230, 0.2)" },
];

export default function Budget() {
  const [view, setView] = useState<BudgetView>("setup");
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  // Add Transaction sheet
  const [sheetVisible, setSheetVisible] = useState(false);
  const [txAmount, setTxAmount] = useState("");
  const [txCategoryId, setTxCategoryId] = useState<string | null>(null);
  const [txDescription, setTxDescription] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [txSaving, setTxSaving] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    checkCategories();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (sheetVisible) {
      Animated.spring(sheetAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(sheetAnim, {
        toValue: 400,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [sheetVisible]);

  async function checkCategories() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("budget_categories")
      .select("*")
      .eq("profile_id", user.id)
      .eq("active", true)
      .order("name");

    if (data && data.length > 0) {
      setCategories(data);
      setView("dashboard");
      fetchTransactions(user.id);
    }
    setLoading(false);
  }

  const fetchTransactions = useCallback(async (userId: string) => {
    setTransactionsLoading(true);
    try {
      const monthStart = getMonthStart();

      // Recent transactions (last 15 this month) with category join
      const { data: recent } = await supabase
        .from("transactions")
        .select(
          `
          id,
          category_id,
          amount,
          description,
          date,
          budget_categories!category_id (name, color)
          `
        )
        .eq("profile_id", userId)
        .gte("date", monthStart)
        .order("date", { ascending: false })
        .limit(15);

      if (recent) {
        const formatted = (recent as RawTransactionRow[]).map((t) => ({
          id: t.id,
          category_id: t.category_id,
          amount: t.amount,
          description: t.description,
          date: t.date,
          category_name: t.budget_categories?.name,
          category_color: t.budget_categories?.color,
        }));
        setRecentTransactions(formatted);
      }
    } catch (e) {
      if (process.env.NODE_ENV !== "production") console.error("Error fetching transactions:", e);
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  async function initializeCategories() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Insert suggested categories
      const categoriesToInsert = SUGGESTED_CATEGORIES.map((cat) => ({
        profile_id: user.id,
        name: cat.name,
        monthly_limit: cat.monthly_limit,
        color: cat.color,
        active: true,
      }));

      const { error } = await supabase
        .from("budget_categories")
        .insert(categoriesToInsert);

      if (error) throw error;

      await checkCategories();
    } catch (e) {
      if (process.env.NODE_ENV !== "production") console.error("Error initializing categories:", e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  function openAddSheet() {
    setTxAmount("");
    setTxCategoryId(null);
    setTxDescription("");
    setTxDate(new Date().toISOString().split("T")[0]);
    setTxError(null);
    setTxSaving(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSheetVisible(true);
  }

  function closeSheet() {
    Keyboard.dismiss();
    setSheetVisible(false);
  }

  async function saveTransaction() {
    const amount = parseFloat(txAmount.replace(/,/g, ""));
    if (isNaN(amount) || amount <= 0 || !txCategoryId) return;

    setTxSaving(true);
    setTxError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("transactions").insert({
        profile_id: user.id,
        amount,
        category_id: txCategoryId,
        description: txDescription.trim() || null,
        date: txDate,
      });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeSheet();

      // Reload to keep data fresh
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        await fetchTransactions(currentUser.id);
      }

      // C3 — Fire overspend check in background (non-blocking)
      if (txCategoryId) {
        api.checkBudgetOverspend(txCategoryId);
      }
    } catch (e) {
      if (process.env.NODE_ENV !== "production") console.error("Error saving transaction:", e);
      setTxError("Couldn't save — try again");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setTxSaving(false);
    }
  }

  function formatCurrency(amount: number) {
    return "$" + amount.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T12:00:00"); // noon to avoid UTC offset issues
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#7CB87A" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Budget Setup ───────────────────────────────────────────────────────────
  if (view === "setup") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.setupContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.setupCenter, { opacity: fadeAnim }]}>
            <View style={styles.setupIconWrap}>
              <Wallet size={28} color="#D4A843" />
            </View>
            <Text style={styles.setupTitle}>Budget Tracker</Text>
            <Text style={styles.setupSubtitle}>
              Organize spending by category. Set monthly limits and track where your money goes.
            </Text>

            <View style={styles.valueProps}>
              {[
                { emoji: "💰", text: "Create custom spending categories" },
                { emoji: "🔔", text: "Alerts when you approach your limits" },
                { emoji: "🔒", text: "Private spending — your partner sees only summary" },
                { emoji: "📊", text: "Track and analyze your spending patterns" },
              ].map((prop) => (
                <View key={prop.text} style={styles.valuePropRow}>
                  <Text style={{ fontSize: 18 }}>{prop.emoji}</Text>
                  <Text style={styles.valuePropText}>{prop.text}</Text>
                </View>
              ))}
            </View>

            {/* Suggested categories preview */}
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Suggested Categories</Text>
              {SUGGESTED_CATEGORIES.map((cat) => (
                <View key={cat.name} style={styles.previewRow}>
                  <View style={[styles.previewDot, { backgroundColor: cat.color }]} />
                  <Text style={styles.previewLabel}>{cat.name}</Text>
                  <Text style={styles.previewAmount}>${cat.monthly_limit.toLocaleString()}</Text>
                </View>
              ))}
            </View>

            {/* Initialize button */}
            <Pressable
              style={styles.saveButton}
              onPress={initializeCategories}
            >
              <Text style={styles.saveButtonText}>Get Started with Suggested Categories</Text>
              <ChevronRight size={16} color="#0C0F0A" />
            </Pressable>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Dashboard ──────────────────────────────────────────────────────────────
  // Calculate spent per category
  const spentByCategory: Record<string, number> = {};
  const monthStart = getMonthStart();
  recentTransactions.forEach((tx) => {
    if (tx.category_id) {
      spentByCategory[tx.category_id] = (spentByCategory[tx.category_id] || 0) + tx.amount;
    }
  });

  const totalSpent = Object.values(spentByCategory).reduce((a, b) => a + b, 0);
  const totalBudget = categories.reduce((sum, cat) => sum + cat.monthly_limit, 0);

  const txAmountNum = parseFloat(txAmount.replace(/,/g, ""));
  const canSave = !isNaN(txAmountNum) && txAmountNum > 0 && txCategoryId !== null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Budget</Text>

        {/* Overall summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>Spent this month</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totalSpent)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.summaryLabel}>Total budget</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totalBudget)}</Text>
            </View>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%` as `${number}%`,
                  backgroundColor: totalSpent > totalBudget ? "#E57373" : "#D4A843",
                },
              ]}
            />
          </View>
        </View>

        {/* Category Cards */}
        {categories.map((cat) => {
          const spent = spentByCategory[cat.id] || 0;
          const pct = cat.monthly_limit > 0 ? (spent / cat.monthly_limit) * 100 : 0;
          const isOver = pct > 100;
          const isNear = pct >= 85 && !isOver;
          const barColor = isOver ? "#E57373" : isNear ? cat.color : cat.color;

          return (
            <View key={cat.id} style={styles.budgetCard}>
              <View style={styles.budgetCardHeader}>
                <View style={[styles.budgetIconWrap, { backgroundColor: `${cat.color}15` }]}>
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: cat.color,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.budgetCardTitle}>{cat.name}</Text>
                  <Text style={styles.budgetCardPercent}>Monthly limit</Text>
                </View>
                <View style={{ alignItems: "flex-end", flexDirection: "row", gap: 8, alignSelf: "center" }}>
                  {(isOver || isNear) && (
                    <AlertTriangle
                      size={15}
                      color={isOver ? "#E57373" : cat.color}
                    />
                  )}
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.budgetAmount, { color: cat.color }]}>
                      {formatCurrency(cat.monthly_limit)}
                    </Text>
                    <Text style={[styles.budgetSpent, isOver && styles.budgetSpentOver]}>
                      {formatCurrency(spent)} spent
                    </Text>
                  </View>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(pct, 100)}%` as `${number}%`,
                      backgroundColor: barColor,
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
          onPress={openAddSheet}
        >
          <Plus size={18} color="#7CB87A" />
          <Text style={styles.addTransactionText}>Add Transaction</Text>
        </Pressable>

        {/* Recent transactions */}
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>This Month</Text>
          {transactionsLoading ? (
            <ActivityIndicator color="#D4A843" style={{ marginTop: 16 }} />
          ) : recentTransactions.length === 0 ? (
            <View style={styles.emptyTransactions}>
              <Text style={styles.emptyTransactionsText}>
                No transactions yet — tap + to log your first
              </Text>
            </View>
          ) : (
            recentTransactions.map((tx) => {
              const catColor = tx.category_color ?? "#F0EDE6";
              return (
                <View key={tx.id} style={styles.txRow}>
                  <View style={[styles.txDot, { backgroundColor: catColor }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txCategory}>{tx.category_name}</Text>
                    {tx.description ? (
                      <Text style={styles.txDesc}>{tx.description}</Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.txAmount, { color: catColor }]}>
                      -{formatCurrency(tx.amount)}
                    </Text>
                    <Text style={styles.txDate}>{formatDate(tx.date)}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ─── Add Transaction Bottom Sheet ──────────────────────────────────── */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="none"
        onRequestClose={closeSheet}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={closeSheet}>
          <View style={styles.sheetOverlay} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.sheetContainer}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[styles.sheet, { transform: [{ translateY: sheetAnim }] }]}
          >
            {/* Drag handle */}
            <View style={styles.sheetHandle} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Add Transaction</Text>
              <Pressable onPress={closeSheet} style={styles.sheetCloseBtn} hitSlop={12}>
                <X size={18} color="rgba(240,237,230,0.4)" />
              </Pressable>
            </View>

            {/* Amount input */}
            <View style={styles.amountRow}>
              <Text style={styles.amountDollar}>$</Text>
              <TextInput
                style={styles.amountInput}
                value={txAmount}
                onChangeText={setTxAmount}
                placeholder="0"
                placeholderTextColor="rgba(240,237,230,0.15)"
                keyboardType="decimal-pad"
                autoFocus
                selectTextOnFocus
              />
            </View>

            {/* Category picker */}
            <Text style={styles.sheetLabel}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
              contentContainerStyle={styles.categoryScrollContent}
            >
              {categories.map((cat) => {
                const isSelected = txCategoryId === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    style={[
                      styles.categoryPill,
                      isSelected && { backgroundColor: `${cat.color}20`, borderColor: cat.color },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setTxCategoryId(cat.id);
                    }}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        isSelected && { color: cat.color, fontFamily: "Geist-SemiBold" },
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Description (optional) */}
            <Text style={styles.sheetLabel}>Description <Text style={styles.sheetLabelOptional}>(optional)</Text></Text>
            <TextInput
              style={styles.descInput}
              value={txDescription}
              onChangeText={setTxDescription}
              placeholder="e.g. Whole Foods run"
              placeholderTextColor="rgba(240,237,230,0.15)"
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />

            {/* Error */}
            {txError && (
              <Text style={styles.txErrorText}>{txError}</Text>
            )}

            {/* Add button */}
            <Pressable
              style={[styles.addButton, !canSave && styles.addButtonDisabled]}
              onPress={saveTransaction}
              disabled={!canSave || txSaving}
            >
              <Text style={styles.addButtonText}>
                {txSaving ? "Saving..." : "Add Transaction"}
              </Text>
            </Pressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
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
    backgroundColor: "rgba(124, 184, 122, 0.12)",
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
    backgroundColor: "rgba(124, 184, 122, 0.18)",
  },
  toggleOptionText: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "rgba(240, 237, 230, 0.35)",
  },
  toggleOptionTextActive: {
    color: "#7CB87A",
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
    borderColor: "rgba(124, 184, 122, 0.15)",
    width: "100%",
    marginBottom: 8,
  },
  dollarSign: {
    fontFamily: "Geist-SemiBold",
    fontSize: 28,
    color: "rgba(240, 237, 230, 0.3)",
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
    backgroundColor: "#7CB87A",
    borderRadius: 16,
    paddingVertical: 16,
    width: "100%",
    shadowColor: "#7CB87A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
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
    color: "#F0EDE6",
    marginTop: 8,
    marginBottom: 24,
  },

  // Summary card
  summaryCard: {
    backgroundColor: "#141810",
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.04)",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryLabel: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(240, 237, 230, 0.4)",
    marginBottom: 4,
  },
  summaryValue: {
    fontFamily: "Geist-SemiBold",
    fontSize: 20,
    color: "#F0EDE6",
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
  budgetSpentOver: {
    color: "#E57373",
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
    borderColor: "rgba(124, 184, 122, 0.18)",
    borderStyle: "dashed",
  },
  addTransactionText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 14,
    color: "#7CB87A",
  },

  // Recent transactions
  recentSection: {
    marginTop: 28,
  },
  recentTitle: {
    fontFamily: "Geist-SemiBold",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.35)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  emptyTransactions: {
    backgroundColor: "#141810",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  emptyTransactionsText: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.3)",
    textAlign: "center",
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#141810",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.04)",
  },
  txDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  txCategory: {
    fontFamily: "Geist-SemiBold",
    fontSize: 13,
    color: "#F0EDE6",
  },
  txDesc: {
    fontFamily: "Geist",
    fontSize: 11,
    color: "rgba(240, 237, 230, 0.3)",
    marginTop: 1,
  },
  txAmount: {
    fontFamily: "GeistMono-Regular",
    fontSize: 14,
    fontWeight: "600",
  },
  txDate: {
    fontFamily: "Geist",
    fontSize: 11,
    color: "rgba(240, 237, 230, 0.25)",
    marginTop: 1,
  },

  // Bottom sheet
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheetContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    pointerEvents: "box-none",
  },
  sheet: {
    backgroundColor: "#1A1D17",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 24,
  },
  sheetHandle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(240, 237, 230, 0.15)",
    alignSelf: "center",
    marginBottom: 18,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  sheetTitle: {
    fontFamily: "Geist-SemiBold",
    fontSize: 17,
    color: "#F0EDE6",
  },
  sheetCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(240,237,230,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Amount input in sheet
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    backgroundColor: "rgba(240,237,230,0.04)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  amountDollar: {
    fontFamily: "Geist-SemiBold",
    fontSize: 32,
    color: "rgba(240,237,230,0.3)",
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontFamily: "Geist-SemiBold",
    fontSize: 32,
    color: "#F0EDE6",
    paddingVertical: 14,
  },

  // Category picker
  sheetLabel: {
    fontFamily: "Geist-SemiBold",
    fontSize: 12,
    color: "rgba(240,237,230,0.35)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  sheetLabelOptional: {
    fontFamily: "Geist",
    color: "rgba(240,237,230,0.2)",
    textTransform: "none",
    letterSpacing: 0,
    fontSize: 12,
  },
  categoryScroll: {
    marginBottom: 20,
  },
  categoryScrollContent: {
    gap: 16,
    paddingRight: 8,
  },
  bucketGroup: {
    gap: 6,
  },
  bucketGroupLabel: {
    fontFamily: "Geist-SemiBold",
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(240,237,230,0.05)",
    borderWidth: 1,
    borderColor: "rgba(240,237,230,0.08)",
    marginBottom: 6,
  },
  categoryPillText: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(240,237,230,0.5)",
  },

  // Description input
  descInput: {
    backgroundColor: "rgba(240,237,230,0.04)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: "Geist",
    fontSize: 14,
    color: "#F0EDE6",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(240,237,230,0.06)",
  },

  // Error text
  txErrorText: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "#E57373",
    marginBottom: 12,
    textAlign: "center",
  },

  // Add button
  addButton: {
    backgroundColor: "#7CB87A",
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: "center",
    shadowColor: "#7CB87A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  addButtonDisabled: {
    opacity: 0.35,
  },
  addButtonText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 15,
    color: "#0C0F0A",
  },
});
