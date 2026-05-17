import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe() {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
    });
  }
  return stripeInstance;
}

// Kin Premium — a single $39/mo plan. The 7-day trial is tracked at the app
// level (profiles.trial_ends_at), so the Stripe subscription bills immediately.
export const PREMIUM_MONTHLY_PRICE = 39;

const MONTHLY_LOOKUP_KEY = "kin_premium_monthly";

/**
 * Resolve the Stripe Price id for the $39/mo plan.
 *
 * Prefers STRIPE_PRICE_ID. Falls back to looking up an existing price by
 * lookup_key, and creates the product + price on first run if neither exists —
 * so a fresh Stripe account works without any manual dashboard setup.
 */
export async function resolveMonthlyPriceId(stripe: Stripe): Promise<string> {
  const fromEnv = process.env.STRIPE_PRICE_ID;
  if (fromEnv && !fromEnv.includes("placeholder")) return fromEnv;

  const existing = await stripe.prices.list({
    lookup_keys: [MONTHLY_LOOKUP_KEY],
    active: true,
    limit: 1,
  });
  if (existing.data[0]) return existing.data[0].id;

  const price = await stripe.prices.create({
    currency: "usd",
    unit_amount: PREMIUM_MONTHLY_PRICE * 100,
    recurring: { interval: "month" },
    lookup_key: MONTHLY_LOOKUP_KEY,
    product_data: { name: "Kin Premium" },
  });
  return price.id;
}
