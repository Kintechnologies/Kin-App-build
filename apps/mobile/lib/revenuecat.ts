/**
 * RevenueCat integration for Kin mobile billing.
 *
 * Products (create in RC dashboard):
 *   kin_monthly_3999   — $39.00 / month
 *   kin_annual_29900   — $299.00 / year
 *
 * Required env var:
 *   EXPO_PUBLIC_REVENUECAT_API_KEY — Apple App Store API key from RC project settings.
 *   Add to apps/mobile/.env before TestFlight build.
 *
 * Austin: once RC products are configured and .env is set, remove the
 * REVENUECAT_NOT_CONFIGURED guard and the static-price fallback in PaywallModal.
 */

import Purchases, {
  type PurchasesOffering,
  type PurchasesPackage,
  type CustomerInfo,
  LOG_LEVEL,
} from "react-native-purchases";

// Exported so PaywallModal can show a static-price fallback UI when RC isn't configured.
export const REVENUECAT_CONFIGURED =
  !!process.env.EXPO_PUBLIC_REVENUECAT_API_KEY &&
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY !== "placeholder_revenuecat_key";

const RC_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? "placeholder_revenuecat_key";

// The RevenueCat entitlement identifier — must match what's set in RC dashboard.
export const ENTITLEMENT_ID = "kin_premium";

// Offering identifier to fetch — "default" is the RC dashboard default.
export const OFFERING_ID = "default";

let initialized = false;

/**
 * Call once on app start (after user ID is known).
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export async function initRevenueCat(userId?: string): Promise<void> {
  if (initialized) return;

  if (!REVENUECAT_CONFIGURED) {
    // Placeholder key — RC SDK will initialise but won't return real offerings.
    // All purchase calls will fail gracefully. Paywall shows static prices.
  }

  if (process.env.NODE_ENV !== "production") {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  Purchases.configure({ apiKey: RC_API_KEY });
  initialized = true;

  if (userId) {
    try {
      await Purchases.logIn(userId);
    } catch {
      // Non-fatal: anonymous session will be used
    }
  }
}

/**
 * Fetch the current RevenueCat offering.
 * Returns null when RC is not configured or network fails.
 */
export async function getOffering(): Promise<PurchasesOffering | null> {
  if (!REVENUECAT_CONFIGURED) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch {
    return null;
  }
}

export interface PurchaseResult {
  success: boolean;
  cancelled?: boolean;
  error?: string;
}

/**
 * Purchase a package from the current offering.
 * Returns `{ success: true }` when the kin_premium entitlement is active.
 */
export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<PurchaseResult> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isActive =
      customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    return { success: isActive };
  } catch (e: unknown) {
    // RC throws an object with `userCancelled` when the user cancels the sheet.
    if (
      e &&
      typeof e === "object" &&
      "userCancelled" in e &&
      (e as { userCancelled: boolean }).userCancelled
    ) {
      return { success: false, cancelled: true };
    }
    const msg = e instanceof Error ? e.message : "Purchase failed";
    return { success: false, error: msg };
  }
}

/**
 * Restore previous purchases. Returns `{ success: true }` if kin_premium is active.
 */
export async function restorePurchases(): Promise<PurchaseResult> {
  try {
    const customerInfo: CustomerInfo = await Purchases.restorePurchases();
    const isActive =
      customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    return { success: isActive };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Restore failed";
    return { success: false, error: msg };
  }
}

/**
 * Get current customer info without triggering a purchase.
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

/**
 * Check if the user currently has an active kin_premium entitlement.
 */
export async function hasPremiumEntitlement(): Promise<boolean> {
  const info = await getCustomerInfo();
  if (!info) return false;
  return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
}
