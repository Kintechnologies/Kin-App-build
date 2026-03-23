import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe() {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-03-31.basil",
    });
  }
  return stripeInstance;
}

// Replace placeholder IDs with real Stripe Price IDs after creating products
export const PLANS = {
  starter: {
    name: "Starter",
    monthlyPrice: 29,
    annualPrice: 290,
    monthlyPriceId: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID || "price_starter_monthly_placeholder",
    annualPriceId: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID || "price_starter_annual_placeholder",
  },
  family: {
    name: "Family",
    monthlyPrice: 49,
    annualPrice: 490,
    monthlyPriceId: process.env.STRIPE_FAMILY_MONTHLY_PRICE_ID || "price_family_monthly_placeholder",
    annualPriceId: process.env.STRIPE_FAMILY_ANNUAL_PRICE_ID || "price_family_annual_placeholder",
  },
} as const;
