import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Use service role for webhook handlers (no user session).
// Throws if SUPABASE_SERVICE_ROLE_KEY is absent — caller's try/catch returns 500
// so Stripe will retry rather than silently accepting a broken handler.
function getAdminSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for Stripe webhook handling");
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
  });
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
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getAdminSupabase();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const plan = session.metadata?.plan;

        if (userId && plan) {
          // Fetch subscription to get the real trial_end timestamp
          let trialEndsAt: string | null = null;
          if (session.subscription) {
            try {
              const stripe = getStripe();
              const subId =
                typeof session.subscription === "string"
                  ? session.subscription
                  : session.subscription.id;
              const sub = await stripe.subscriptions.retrieve(subId);
              if (sub.trial_end) {
                trialEndsAt = new Date(sub.trial_end * 1000).toISOString();
              }
            } catch {
              // Non-fatal — profile trial_ends_at falls back to signup value
            }
          }

          await supabase
            .from("profiles")
            .update({
              subscription_tier: "starter",
              stripe_customer_id: session.customer as string,
              // Store real trial end from Stripe (null = no trial / already ended)
              ...(trialEndsAt !== null ? { trial_ends_at: trialEndsAt } : {}),
              // Clear cancellation data on reactivation
              cancelled_at: null,
              data_deletion_at: null,
              deletion_reminded: false,
            })
            .eq("id", userId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        if (userId) {
          const now = new Date();
          const deletionDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days

          await supabase
            .from("profiles")
            .update({
              subscription_tier: "free",
              cancelled_at: now.toISOString(),
              data_deletion_at: deletionDate.toISOString(),
              deletion_reminded: false,
            })
            .eq("id", userId);

          // TODO: Send cancellation email via Beehiiv
          // Include: 90-day grace period notice, reactivation link
          // TODO: Replace with structured logging (Sentry) before GA
          if (process.env.NODE_ENV !== "production") {
            console.log(`Subscription cancelled for user ${userId}. Data deletion scheduled for ${deletionDate.toISOString()}`);
          };
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        // In Stripe API 2026-02-25.clover, subscription is nested under parent.subscription_details
        const sub = invoice.parent?.subscription_details?.subscription;
        const subscriptionId = typeof sub === "string" ? sub : (sub as Stripe.Subscription | undefined)?.id ?? null;

        if (subscriptionId) {
          const stripe = getStripe();
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const userId = subscription.metadata?.supabase_user_id;

          if (userId) {
            // Increment charge count
            const { data: profile } = await supabase
              .from("profiles")
              .select("subscription_charge_count, referral_code")
              .eq("id", userId)
              .single();

            if (profile) {
              const newCount = (profile.subscription_charge_count || 0) + 1;
              await supabase
                .from("profiles")
                .update({ subscription_charge_count: newCount })
                .eq("id", userId);

              // Referral unlock at charge count === 2
              if (newCount === 2) {
                // TODO: Trigger referral reward (e.g., send email, add credit)
                // TODO: Replace with structured logging (Sentry) before GA
                if (process.env.NODE_ENV !== "production") {
                  console.log(`Referral unlocked for user ${userId}`);
                }
              }
            }
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // TODO: Send payment failed email notification
        // TODO: Replace with structured logging (Sentry) before GA
        if (process.env.NODE_ENV !== "production") {
          console.log(`Payment failed for customer ${customerId}`);
        }
        break;
      }
    }
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
