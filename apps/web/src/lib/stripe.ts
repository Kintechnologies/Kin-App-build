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

// Single "Kin Premium" plan — $39/mo or $299/yr.
// Replace placeholder IDs with real Stripe Price IDs after creating the product.
export const PLANS = {
  premium: {
    name: "Kin Premium",
    monthlyPrice: 39,
    annualPrice: 299,
    monthlyPriceId: process.env.STRIPE_MONTHLY_PRICE_ID || "price_monthly_placeholder",
    annualPriceId: process.env.STRIPE_ANNUAL_PRICE_ID || "price_annual_placeholder",
  },
} as const;
