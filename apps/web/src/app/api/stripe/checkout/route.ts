import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, PLANS } from "@/lib/stripe";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: Request) {
  try {
    const { planId, billing = "monthly", successPath = "/dashboard?subscribed=true" } = await request.json();

    if (!planId || !(planId in PLANS)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe is not configured yet. Add STRIPE_SECRET_KEY to .env.local" },
        { status: 503 }
      );
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const plan = PLANS[planId as keyof typeof PLANS];
    const priceId = billing === "annual" ? plan.annualPriceId : plan.monthlyPriceId;
    const stripe = getStripe();

    // Create or retrieve Stripe customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

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

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7,
        metadata: { supabase_user_id: user.id, plan: planId, billing },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}${successPath}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: { supabase_user_id: user.id, plan: planId, billing },
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
