/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout session for the $39/mo Kin Premium subscription
 * and returns the session URL for the client to redirect to.
 *
 * The 14-day free trial is tracked at the app level (profiles.trial_ends_at),
 * so the subscription created here bills immediately on day 14 — no extra
 * Stripe-side trial.
 */

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getStripe, resolveMonthlyPriceId } from "@/lib/stripe";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import * as Sentry from "@sentry/nextjs";

/**
 * Resolves a user-entered code to a Stripe Checkout `discounts` entry.
 *
 * Accepts either a promotion code (the human-readable code customers type,
 * e.g. "BETA") or a raw coupon ID. Promotion codes are checked first since
 * that's what beta users will actually enter; a coupon-ID retrieve is the
 * fallback. Returns null when the code matches nothing or is inactive.
 */
async function resolveDiscount(
  stripe: Stripe,
  code: string
): Promise<Stripe.Checkout.SessionCreateParams.Discount | null> {
  const promos = await stripe.promotionCodes.list({
    code,
    active: true,
    limit: 1,
  });
  if (promos.data.length > 0) {
    return { promotion_code: promos.data[0].id };
  }

  try {
    const coupon = await stripe.coupons.retrieve(code);
    if (coupon.valid) {
      return { coupon: coupon.id };
    }
  } catch {
    // Not a coupon ID either — fall through to "no match".
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      successPath?: string;
      cancelPath?: string;
      coupon?: string;
    };
    const successPath = body.successPath ?? "/dashboard/billing?subscribed=true";
    const cancelPath = body.cancelPath ?? "/dashboard/billing";

    // Open-redirect guard: caller-supplied paths must be same-origin. Allow
    // only paths that start with "/" but not "//" (which would resolve to
    // protocol-relative external origins).
    const isSafePath = (p: string) => p.startsWith("/") && !p.startsWith("//");
    if (!isSafePath(successPath) || !isSafePath(cancelPath)) {
      return NextResponse.json(
        { error: "Invalid redirect path" },
        { status: 400 }
      );
    }
    const couponCode = (
      body.coupon ??
      new URL(request.url).searchParams.get("coupon") ??
      ""
    ).trim();

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Billing is not configured yet." },
        { status: 503 }
      );
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(user.id, "stripe-checkout");
    if (!rl.allowed) return rateLimitResponse(rl);

    const stripe = getStripe();

    // Create or reuse the Stripe customer for this user.
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single<{ stripe_customer_id: string | null }>();

    let customerId = profile?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const priceId = await resolveMonthlyPriceId(stripe);
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
    if (couponCode) {
      // Coupon-specific limit so a single user can't probe many codes per
      // minute through the timing oracle in resolveDiscount.
      const couponRl = await checkRateLimit(user.id, "stripe-coupon");
      if (!couponRl.allowed) return rateLimitResponse(couponRl);

      const discount = await resolveDiscount(stripe, couponCode);
      if (!discount) {
        return NextResponse.json(
          { error: "That code isn't valid. Check it and try again." },
          { status: 400 }
        );
      }
      discounts = [discount];
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      // Metadata on both the session and the subscription so every webhook
      // event can resolve back to the Supabase user.
      metadata: { supabase_user_id: user.id },
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
      ...(discounts ? { discounts } : {}),
      success_url: `${baseUrl}${successPath}`,
      cancel_url: `${baseUrl}${cancelPath}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
