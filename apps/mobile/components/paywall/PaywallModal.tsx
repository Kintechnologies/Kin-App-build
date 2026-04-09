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

import { useState, useEffect, useCallback, useMemo } from "react";
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
import { useThemeColors } from "../../lib/theme";
import type { ThemeColors } from "../../constants/colors";

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
    priceDetail: "$349.00 billed annually",
    badge: "Best Value",
    highlight: true,
    savings: "Save $169 vs monthly",
  },
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

  const c = useThemeColors();
  const styles = useMemo(() => createPaywallStyles(c), [c]);

  const features = useMemo(
    () => [
      { icon: Sparkles, label: "Personalized morning briefings", color: c.amber },
      { icon: MessageCircle, label: "Unlimited Kin AI chat", color: c.green },
      { icon: CalendarDays, label: "Smart family calendar sync", color: c.blue },
      { icon: Wallet, label: "Household budget tracking", color: c.amber },
      { icon: Zap, label: "Real-time coordination alerts", color: c.green },
      { icon: Star, label: "Family meal planning", color: c.amber },
      { icon: Shield, label: "Private & encrypted", color: c.blue },
    ],
    [c]
  );

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
        if (pid === "kin_monthly_39") setMonthlyPkg(pkg);
        if (pid === "kin_annual_34900") setAnnualPkg(pkg);
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
            <Check size={40} color={c.green} strokeWidth={3} />
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
          <X size={20} color={c.textMuted} />
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
              <Crown size={28} color={c.amber} />
            </View>
            <Text style={styles.heading}>Kin Family Plan</Text>
            <View style={styles.trialBadge}>
              <Sparkles size={12} color={c.amber} />
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
                  <Check size={12} color={c.green} strokeWidth={3} />
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
              <Text style={[styles.planLabel, { color: c.textPrimary }]}>Annual</Text>
              <View style={styles.planPriceRow}>
                <Text style={[styles.planPrice, { color: c.amber }]}>
                  {getAnnualMonthlyPrice()}
                </Text>
                <Text style={styles.planPeriod}>/mo</Text>
              </View>
              <Text style={styles.planDetail}>{getAnnualTotalPrice()}</Text>
              <Text style={styles.planSavings}>Save $169 vs monthly</Text>
              {selectedPlan === "annual" && (
                <View style={[styles.planCheckmark, { backgroundColor: c.amberSubtle }]}>
                  <Check size={12} color={c.amber} strokeWidth={3} />
                </View>
              )}
            </Pressable>
          </View>

          {/* Features */}
          <View style={styles.features}>
            <Text style={styles.featuresHeading}>Everything included</Text>
            {features.map(({ icon: Icon, label, color }) => (
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
              <ActivityIndicator color={c.background} size="small" />
            ) : (
              <>
                <Text style={styles.ctaText}>Start 7-Day Free Trial</Text>
                <Text style={styles.ctaSubtext}>
                  {selectedPlan === "annual" ? "Then $349/year" : "Then $39/month"}
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
                <ActivityIndicator size="small" color={c.textMuted} />
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

function createPaywallStyles(c: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: c.background,
    },

    closeButton: {
      position: "absolute",
      top: 16,
      right: 20,
      zIndex: 10,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.surfacePrimary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.tabBarBorder,
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
      backgroundColor: c.amberSubtle,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.amberBorder,
    },
    heading: {
      fontFamily: "Geist-SemiBold",
      fontSize: 26,
      color: c.textPrimary,
      marginBottom: 10,
    },
    trialBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.amberSubtle,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: c.amberBorder,
    },
    trialBadgeText: {
      fontFamily: "Geist",
      fontSize: 13,
      color: c.amber,
    },

    // ── Plan cards ───────────────────────────────────────────────────────────
    plansRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 24,
    },
    planCard: {
      flex: 1,
      backgroundColor: c.surfacePrimary,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1.5,
      borderColor: c.tabBarBorder,
      position: "relative",
      minHeight: 130,
    },
    planCardAnnual: {
      borderColor: c.amberBorder,
      backgroundColor: c.amberSubtle,
    },
    planCardSelected: {
      borderColor: c.green,
    },
    planCardAnnualSelected: {
      borderColor: c.amber,
    },
    planLabel: {
      fontFamily: "GeistMono-Regular",
      fontSize: 11,
      color: c.textMuted,
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
      color: c.green,
    },
    planPeriod: {
      fontFamily: "Geist",
      fontSize: 13,
      color: c.textMuted,
    },
    planDetail: {
      fontFamily: "Geist",
      fontSize: 11,
      color: c.textDim,
      marginBottom: 4,
    },
    planSavings: {
      fontFamily: "Geist-SemiBold",
      fontSize: 11,
      color: c.amber,
    },
    planCheckmark: {
      position: "absolute",
      top: 10,
      right: 10,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: c.greenSubtle,
      alignItems: "center",
      justifyContent: "center",
    },
    bestValueBadge: {
      position: "absolute",
      top: -11,
      left: "50%",
      transform: [{ translateX: -34 }],
      backgroundColor: c.amber,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    bestValueText: {
      fontFamily: "GeistMono-Regular",
      fontSize: 9,
      color: c.background,
      letterSpacing: 0.5,
    },

    // ── Features ─────────────────────────────────────────────────────────────
    features: {
      backgroundColor: c.surfacePrimary,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: c.inputBorder,
      marginBottom: 20,
      gap: 12,
    },
    featuresHeading: {
      fontFamily: "GeistMono-Regular",
      fontSize: 11,
      color: c.textFaint,
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
      color: c.textPrimary,
      flex: 1,
    },

    // ── Error ────────────────────────────────────────────────────────────────
    errorBanner: {
      backgroundColor: c.roseSubtle,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.roseSubtle,
    },
    errorText: {
      fontFamily: "Geist",
      fontSize: 13,
      color: c.rose,
      textAlign: "center",
    },

    // ── CTA ──────────────────────────────────────────────────────────────────
    ctaButton: {
      backgroundColor: c.green,
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
      color: c.textOnGreen,
    },
    ctaSubtext: {
      fontFamily: "Geist",
      fontSize: 12,
      color: c.textOnGreenMuted,
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
      color: c.textMuted,
    },
    footerDot: {
      fontFamily: "Geist",
      fontSize: 13,
      color: c.textFaint,
    },
    disclaimer: {
      fontFamily: "Geist",
      fontSize: 11,
      color: c.textFaint,
      textAlign: "center",
      lineHeight: 16,
    },

    // ── Success state ─────────────────────────────────────────────────────────
    successContainer: {
      flex: 1,
      backgroundColor: c.background,
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      paddingHorizontal: 32,
    },
    successIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: c.greenSubtle,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: c.greenDim,
    },
    successTitle: {
      fontFamily: "Geist-SemiBold",
      fontSize: 24,
      color: c.textPrimary,
      textAlign: "center",
    },
    successSubtitle: {
      fontFamily: "Geist",
      fontSize: 15,
      color: c.textMuted,
      textAlign: "center",
      lineHeight: 22,
    },
  });
}
