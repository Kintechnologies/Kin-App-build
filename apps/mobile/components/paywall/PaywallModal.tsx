/**
 * PaywallModal — RevenueCat-backed subscription paywall for Kin.
 *
 * Shows two plans (Monthly / Annual) with a 7-day free trial arc.
 * Falls back to static pricing UI when RC is not yet configured
 * (placeholder API key), so the screen renders correctly in local dev.
 *
 * Usage:
 *   <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
 */

import { useState, useEffect, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  X,
  Check,
  Crown,
  Sparkles,
  Shield,
  Star,
  Zap,
  MessageCircle,
  CalendarDays,
  Wallet,
} from "lucide-react-native";
import type { PurchasesPackage } from "react-native-purchases";
import {
  getOffering,
  purchasePackage,
  restorePurchases,
  REVENUECAT_CONFIGURED,
} from "../../lib/revenuecat";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─── Static fallback prices (shown when RC not yet configured) ───────────────

const STATIC_PLANS = [
  {
    id: "monthly",
    label: "Monthly",
    price: "$39",
    period: "/ month",
    priceDetail: "$39.00 billed monthly",
    badge: null as string | null,
    highlight: false,
  },
  {
    id: "annual",
    label: "Annual",
    price: "$25",
    period: "/ month",
    priceDetail: "$299.00 billed annually",
    badge: "Best Value",
    highlight: true,
    savings: "Save $169 vs monthly",
  },
] as const;

const FEATURES = [
  { icon: Sparkles, label: "Personalized morning briefings", color: "#D4A843" },
  { icon: MessageCircle, label: "Unlimited Kin AI chat", color: "#7CB87A" },
  { icon: CalendarDays, label: "Smart family calendar sync", color: "#7AADCE" },
  { icon: Wallet, label: "Household budget tracking", color: "#D4A843" },
  { icon: Zap, label: "Real-time coordination alerts", color: "#7CB87A" },
  { icon: Star, label: "Family meal planning", color: "#D4A843" },
  { icon: Shield, label: "Private & encrypted", color: "#7AADCE" },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  /** Called with true when a purchase or restore succeeds. */
  onSuccess?: () => void;
}

type PlanId = "monthly" | "annual";

// ─── Component ────────────────────────────────────────────────────────────────

export default function PaywallModal({
  visible,
  onClose,
  onSuccess,
}: PaywallModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("annual");
  const [monthlyPkg, setMonthlyPkg] = useState<PurchasesPackage | null>(null);
  const [annualPkg, setAnnualPkg] = useState<PurchasesPackage | null>(null);
  const [offeringLoaded, setOfferingLoaded] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [purchased, setPurchased] = useState(false);

  // Load RC offering when the modal opens
  useEffect(() => {
    if (!visible || !REVENUECAT_CONFIGURED) {
      setOfferingLoaded(true);
      return;
    }
    let cancelled = false;
    getOffering().then((offering) => {
      if (cancelled || !offering) {
        setOfferingLoaded(true);
        return;
      }
      for (const pkg of offering.availablePackages) {
        const pid = pkg.product.identifier;
        if (pid === "kin_monthly_3999") setMonthlyPkg(pkg);
        if (pid === "kin_annual_29900") setAnnualPkg(pkg);
      }
      setOfferingLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const handleSelectPlan = useCallback((plan: PlanId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlan(plan);
    setErrorMsg(null);
  }, []);

  const handlePurchase = useCallback(async () => {
    setErrorMsg(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!REVENUECAT_CONFIGURED) {
      setErrorMsg(
        "RevenueCat not yet configured. Add EXPO_PUBLIC_REVENUECAT_API_KEY to apps/mobile/.env."
      );
      return;
    }

    const pkg = selectedPlan === "annual" ? annualPkg : monthlyPkg;
    if (!pkg) {
      setErrorMsg("This plan isn't available right now. Please try again.");
      return;
    }

    setPurchasing(true);
    const result = await purchasePackage(pkg);
    setPurchasing(false);

    if (result.cancelled) {
      // User dismissed the App Store sheet — no error shown
      return;
    }
    if (result.success) {
      setPurchased(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess?.();
      setTimeout(onClose, 1800);
    } else {
      setErrorMsg(result.error ?? "Purchase failed. Please try again.");
    }
  }, [selectedPlan, annualPkg, monthlyPkg, onSuccess, onClose]);

  const handleRestore = useCallback(async () => {
    setErrorMsg(null);
    if (!REVENUECAT_CONFIGURED) {
      setErrorMsg("RevenueCat not yet configured.");
      return;
    }
    setRestoring(true);
    const result = await restorePurchases();
    setRestoring(false);

    if (result.success) {
      setPurchased(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess?.();
      setTimeout(onClose, 1800);
    } else {
      setErrorMsg("No previous purchase found for this Apple ID.");
    }
  }, [onSuccess, onClose]);

  // Derive display prices from RC packages when available
  const getMonthlyPrice = () =>
    monthlyPkg?.product.priceString ?? STATIC_PLANS[0].price;
  const getAnnualMonthlyPrice = () =>
    annualPkg
      ? `$${(annualPkg.product.price / 12).toFixed(0)}`
      : STATIC_PLANS[1].price;
  const getAnnualTotalPrice = () =>
    annualPkg?.product.priceString ?? STATIC_PLANS[1].priceDetail;

  // ── Purchased success state ──────────────────────────────────────────────
  if (purchased) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Check size={40} color="#7CB87A" strokeWidth={3} />
          </View>
          <Text style={styles.successTitle}>Welcome to Kin Family Plan</Text>
          <Text style={styles.successSubtitle}>
            Your 7-day free trial has started. Enjoy the full Kin experience.
          </Text>
        </View>
      </Modal>
    );
  }

  // ── Main paywall ─────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        {/* Close button */}
        <Pressable style={styles.closeButton} onPress={onClose} hitSlop={12}>
          <X size={20} color="rgba(240, 237, 230, 0.4)" />
        </Pressable>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.crownRow}>
              <Crown size={28} color="#D4A843" />
            </View>
            <Text style={styles.heading}>Kin Family Plan</Text>
            <View style={styles.trialBadge}>
              <Sparkles size={12} color="#D4A843" />
              <Text style={styles.trialBadgeText}>7 days free, then choose your plan</Text>
            </View>
          </View>

          {/* Plan cards */}
          <View style={styles.plansRow}>
            {/* Monthly */}
            <Pressable
              style={[
                styles.planCard,
                selectedPlan === "monthly" && styles.planCardSelected,
              ]}
              onPress={() => handleSelectPlan("monthly")}
            >
              <Text style={styles.planLabel}>Monthly</Text>
              <View style={styles.planPriceRow}>
                <Text style={styles.planPrice}>{getMonthlyPrice()}</Text>
                <Text style={styles.planPeriod}>/mo</Text>
              </View>
              <Text style={styles.planDetail}>Billed monthly</Text>
              {selectedPlan === "monthly" && (
                <View style={styles.planCheckmark}>
                  <Check size={12} color="#7CB87A" strokeWidth={3} />
                </View>
              )}
            </Pressable>

            {/* Annual (highlighted) */}
            <Pressable
              style={[
                styles.planCard,
                styles.planCardAnnual,
                selectedPlan === "annual" && styles.planCardSelected,
                selectedPlan === "annual" && styles.planCardAnnualSelected,
              ]}
              onPress={() => handleSelectPlan("annual")}
            >
              <View style={styles.bestValueBadge}>
                <Text style={styles.bestValueText}>BEST VALUE</Text>
              </View>
              <Text style={[styles.planLabel, { color: "#F0EDE6" }]}>Annual</Text>
              <View style={styles.planPriceRow}>
                <Text style={[styles.planPrice, { color: "#D4A843" }]}>
                  {getAnnualMonthlyPrice()}
                </Text>
                <Text style={styles.planPeriod}>/mo</Text>
              </View>
              <Text style={styles.planDetail}>{getAnnualTotalPrice()}</Text>
              <Text style={styles.planSavings}>Save $169 vs monthly</Text>
              {selectedPlan === "annual" && (
                <View style={[styles.planCheckmark, { backgroundColor: "rgba(212, 168, 67, 0.15)" }]}>
                  <Check size={12} color="#D4A843" strokeWidth={3} />
                </View>
              )}
            </Pressable>
          </View>

          {/* Features */}
          <View style={styles.features}>
            <Text style={styles.featuresHeading}>Everything included</Text>
            {FEATURES.map(({ icon: Icon, label, color }) => (
              <View key={label} style={styles.featureRow}>
                <View style={[styles.featureIconWrap, { backgroundColor: `${color}18` }]}>
                  <Icon size={15} color={color} />
                </View>
                <Text style={styles.featureLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Error message */}
          {errorMsg && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* CTA */}
          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              pressed && { opacity: 0.85 },
              purchasing && styles.ctaButtonDisabled,
            ]}
            onPress={handlePurchase}
            disabled={purchasing || restoring || !offeringLoaded}
          >
            {purchasing ? (
              <ActivityIndicator color="#0C0F0A" size="small" />
            ) : (
              <>
                <Text style={styles.ctaText}>Start 7-Day Free Trial</Text>
                <Text style={styles.ctaSubtext}>
                  {selectedPlan === "annual" ? "Then $299/year" : "Then $39/month"}
                </Text>
              </>
            )}
          </Pressable>

          {/* Footer links */}
          <View style={styles.footer}>
            <Pressable
              onPress={handleRestore}
              disabled={purchasing || restoring}
            >
              {restoring ? (
                <ActivityIndicator size="small" color="rgba(240, 237, 230, 0.3)" />
              ) : (
                <Text style={styles.footerLink}>Restore purchases</Text>
              )}
            </Pressable>

            <Text style={styles.footerDot}>·</Text>

            <Pressable onPress={() => Linking.openURL("https://kinai.family/privacy")}>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </Pressable>

            <Text style={styles.footerDot}>·</Text>

            <Pressable onPress={() => Linking.openURL("https://kinai.family/terms")}>
              <Text style={styles.footerLink}>Terms</Text>
            </Pressable>
          </View>

          <Text style={styles.disclaimer}>
            No payment due today. Cancel anytime before the trial ends. Subscriptions
            renew automatically. Manage in iOS Settings → Apple ID → Subscriptions.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0C0F0A",
  },

  closeButton: {
    position: "absolute",
    top: 16,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#141810",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.06)",
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 32,
    minHeight: SCREEN_HEIGHT * 0.85,
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: { alignItems: "center", marginBottom: 28 },
  crownRow: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(212, 168, 67, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(212, 168, 67, 0.2)",
  },
  heading: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 26,
    color: "#F0EDE6",
    marginBottom: 10,
  },
  trialBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(212, 168, 67, 0.1)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(212, 168, 67, 0.2)",
  },
  trialBadgeText: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "#D4A843",
  },

  // ── Plan cards ───────────────────────────────────────────────────────────
  plansRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  planCard: {
    flex: 1,
    backgroundColor: "#141810",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "rgba(240, 237, 230, 0.06)",
    position: "relative",
    minHeight: 130,
  },
  planCardAnnual: {
    borderColor: "rgba(212, 168, 67, 0.15)",
    backgroundColor: "rgba(212, 168, 67, 0.04)",
  },
  planCardSelected: {
    borderColor: "#7CB87A",
  },
  planCardAnnualSelected: {
    borderColor: "#D4A843",
  },
  planLabel: {
    fontFamily: "GeistMono-Regular",
    fontSize: 11,
    color: "rgba(240, 237, 230, 0.4)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  planPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
    marginBottom: 4,
  },
  planPrice: {
    fontFamily: "GeistMono-Regular",
    fontSize: 28,
    color: "#7CB87A",
  },
  planPeriod: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.35)",
  },
  planDetail: {
    fontFamily: "Geist",
    fontSize: 11,
    color: "rgba(240, 237, 230, 0.25)",
    marginBottom: 4,
  },
  planSavings: {
    fontFamily: "Geist-SemiBold",
    fontSize: 11,
    color: "#D4A843",
  },
  planCheckmark: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(124, 184, 122, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  bestValueBadge: {
    position: "absolute",
    top: -11,
    left: "50%",
    transform: [{ translateX: -34 }],
    backgroundColor: "#D4A843",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bestValueText: {
    fontFamily: "GeistMono-Regular",
    fontSize: 9,
    color: "#0C0F0A",
    letterSpacing: 0.5,
  },

  // ── Features ─────────────────────────────────────────────────────────────
  features: {
    backgroundColor: "#141810",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(240, 237, 230, 0.04)",
    marginBottom: 20,
    gap: 12,
  },
  featuresHeading: {
    fontFamily: "GeistMono-Regular",
    fontSize: 11,
    color: "rgba(240, 237, 230, 0.2)",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 4,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureLabel: {
    fontFamily: "Geist",
    fontSize: 14,
    color: "#F0EDE6",
    flex: 1,
  },

  // ── Error ────────────────────────────────────────────────────────────────
  errorBanner: {
    backgroundColor: "rgba(212, 116, 138, 0.1)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(212, 116, 138, 0.15)",
  },
  errorText: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "#D4748A",
    textAlign: "center",
  },

  // ── CTA ──────────────────────────────────────────────────────────────────
  ctaButton: {
    backgroundColor: "#7CB87A",
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 16,
    gap: 2,
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    fontFamily: "Geist-SemiBold",
    fontSize: 17,
    color: "#0C0F0A",
  },
  ctaSubtext: {
    fontFamily: "Geist",
    fontSize: 12,
    color: "rgba(12, 15, 10, 0.6)",
  },

  // ── Footer ───────────────────────────────────────────────────────────────
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  footerLink: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.35)",
  },
  footerDot: {
    fontFamily: "Geist",
    fontSize: 13,
    color: "rgba(240, 237, 230, 0.15)",
  },
  disclaimer: {
    fontFamily: "Geist",
    fontSize: 11,
    color: "rgba(240, 237, 230, 0.18)",
    textAlign: "center",
    lineHeight: 16,
  },

  // ── Success state ─────────────────────────────────────────────────────────
  successContainer: {
    flex: 1,
    backgroundColor: "#0C0F0A",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 32,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(124, 184, 122, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(124, 184, 122, 0.3)",
  },
  successTitle: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 24,
    color: "#F0EDE6",
    textAlign: "center",
  },
  successSubtitle: {
    fontFamily: "Geist",
    fontSize: 15,
    color: "rgba(240, 237, 230, 0.5)",
    textAlign: "center",
    lineHeight: 22,
  },
});
