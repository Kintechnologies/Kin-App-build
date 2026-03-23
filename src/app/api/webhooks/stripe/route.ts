import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Use service role for webhook handlers (no user session)
function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-03-31.basil",
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
          await supabase
            .from("profiles")
            .update({
              subscription_tier: plan === "family" ? "family" : "starter",
              stripe_customer_id: session.customer as string,
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
          console.log(`Subscription cancelled for user ${userId}. Data deletion scheduled for ${deletionDate.toISOString()}`);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

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
                console.log(`Referral unlocked for user ${userId}`);
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
        console.log(`Payment failed for customer ${customerId}`);
        break;
      }
    }
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
