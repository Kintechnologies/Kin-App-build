/**
 * POST /api/stripe/portal
 *
 * Creates a Stripe Customer Billing Portal session and returns its URL.
 * Used by the Settings → Cancel / Change Plan buttons. The portal is the
 * canonical place to cancel, swap plans, update payment method, and view
 * invoices, so we don't reimplement any of that ourselves.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: Request) {
  try {
    const { returnPath = "/dashboard/billing" } = (await request
      .json()
      .catch(() => ({}))) as { returnPath?: string };

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single<{ stripe_customer_id: string | null }>();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No active subscription on file." },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}${returnPath}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json(
      { error: "Could not open billing portal." },
      { status: 500 }
    );
  }
}
