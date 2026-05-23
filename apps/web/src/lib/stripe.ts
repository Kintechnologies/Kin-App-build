import Stripe from "stripe";

// Pinned API version — keep this in sync with the version constructHmac'd
// against in apps/web/src/app/api/stripe/webhook/route.ts. Drift between the
// two would mean the SDK serializes against one schema and the webhook
// verifier validates against another (audit V7 P2-B2).
export const STRIPE_API_VERSION = "2026-02-25.clover" as const;

let stripeInstance: Stripe | null = null;
let degradeAlerted = false;

export function getStripe() {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    // Misconfig guard (audit V7 P2-B4): if Stripe is wired up but Upstash
    // isn't, the rate limiter graceful-degrades to "allow all" — which on
    // the Stripe checkout/coupon/portal endpoints means unbounded API spend.
    // Slack-ping once per process so a Vercel boot in this state surfaces
    // immediately. Fire-and-forget — never block Stripe init on Slack.
    const hasUpstash =
      !!process.env.UPSTASH_REDIS_REST_URL &&
      !!process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!hasUpstash && !degradeAlerted) {
      degradeAlerted = true;
      void (async () => {
        try {
          const { notifySlack } = await import("@/lib/notify");
          await notifySlack(
            "Stripe configured without Upstash rate-limit backend — checkout/coupon/portal endpoints are unbounded.",
            "critical"
          );
        } catch {
          console.error(
            "stripe: rate-limit backend missing while Stripe is configured"
          );
        }
      })();
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_API_VERSION,
    });
  }
  return stripeInstance;
}

// Kin Premium — a single $39/mo plan. The 14-day trial is tracked at the app
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
