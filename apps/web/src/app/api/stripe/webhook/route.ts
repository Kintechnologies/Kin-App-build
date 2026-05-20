/**
 * POST /api/stripe/webhook
 *
 * Keeps profiles.subscription_status in sync with Stripe:
 *   checkout.session.completed   → active  (+ store stripe_customer_id)
 *   invoice.payment_failed       → past_due
 *   customer.subscription.deleted → canceled
 *
 * Uses the service-role Supabase client — webhooks have no user session.
 */

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";

// Stripe SDK relies on Node's crypto for webhook signature verification.
export const runtime = "nodejs";

function getAdminSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for Stripe webhook handling"
    );
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
  });
}

type SubscriptionStatus = "trial" | "active" | "past_due" | "canceled";

/**
 * Update a profile's subscription_status, resolving the row by Supabase user
 * id when available and otherwise by Stripe customer id (payment_failed events
 * carry no user metadata).
 */
async function setStatus(
  supabase: SupabaseClient,
  status: SubscriptionStatus,
  { userId, customerId }: { userId?: string | null; customerId?: string | null }
) {
  const patch: Record<string, unknown> = { subscription_status: status };
  if (customerId) patch.stripe_customer_id = customerId;

  if (userId) {
    await supabase.from("profiles").update(patch).eq("id", userId);
    return;
  }
  if (customerId) {
    await supabase
      .from("profiles")
      .update({ subscription_status: status })
      .eq("stripe_customer_id", customerId);
    return;
  }
  Sentry.captureMessage(
    "Stripe webhook: could not resolve a profile to update",
    "warning"
  );
}

/**
 * Send the one-time "You're all set" payment confirmation. Resolves the profile
 * by Supabase user id, falling back to Stripe customer id. Best-effort and
 * guarded by profiles.payment_email_sent_at so Stripe webhook retries (and the
 * subscription's first invoice) never double-send.
 */
async function sendPaymentConfirmation(
  supabase: SupabaseClient,
  { userId, customerId }: { userId?: string | null; customerId?: string | null }
) {
  try {
    let query = supabase
      .from("profiles")
      .select("id, email, family_name, payment_email_sent_at");
    query = userId
      ? query.eq("id", userId)
      : query.eq("stripe_customer_id", customerId ?? "");

    const { data: profile } = await query.maybeSingle<{
      id: string;
      email: string | null;
      family_name: string | null;
      payment_email_sent_at: string | null;
    }>();

    if (!profile?.email || profile.payment_email_sent_at) return;

    const firstName = (profile.family_name ?? "").split(/\s+/)[0] || null;
    const { sendEmail, paymentConfirmationEmail } = await import("@/lib/email");
    const sent = await sendEmail({
      to: profile.email,
      ...paymentConfirmationEmail(firstName),
    });

    if (sent) {
      await supabase
        .from("profiles")
        .update({ payment_email_sent_at: new Date().toISOString() })
        .eq("id", profile.id);
    }
  } catch (err) {
    Sentry.captureException(err);
  }
}

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const body = await request.text();
  const signature = headers().get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getAdminSupabase();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id ?? null;
        await setStatus(supabase, "active", { userId, customerId });
        await sendPaymentConfirmation(supabase, { userId, customerId });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await setStatus(supabase, "past_due", {
          customerId:
            typeof invoice.customer === "string"
              ? invoice.customer
              : invoice.customer?.id ?? null,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await setStatus(supabase, "canceled", {
          userId: subscription.metadata?.supabase_user_id,
          customerId:
            typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer?.id ?? null,
        });
        break;
      }
    }
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
