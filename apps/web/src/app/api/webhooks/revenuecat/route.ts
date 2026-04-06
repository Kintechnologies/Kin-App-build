import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";

// Use service role for webhook handlers (no user session).
function getAdminSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for RevenueCat webhook handling");
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

// RevenueCat event types we care about
type RCEventType =
  | "INITIAL_PURCHASE"
  | "RENEWAL"
  | "PRODUCT_CHANGE"
  | "CANCELLATION"
  | "BILLING_ISSUE"
  | "EXPIRATION"
  | "SUBSCRIBER_ALIAS"
  | "NON_RENEWING_PURCHASE"
  | "TRANSFER";

interface RCEvent {
  type: RCEventType;
  /** Supabase user ID — set via Purchases.logIn(userId) in the mobile app */
  app_user_id: string;
  original_app_user_id: string;
  product_id: string;
  entitlement_ids: string[] | null;
  expiration_at_ms: number | null;
  purchased_at_ms: number | null;
  cancel_reason?: string;
}

interface RCWebhookBody {
  api_version: string;
  event: RCEvent;
}

export async function POST(request: Request) {
  if (!process.env.REVENUECAT_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "RevenueCat webhook not configured" }, { status: 503 });
  }

  // Verify bearer token — set in RevenueCat dashboard under Project → Webhooks → Auth header
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (token !== process.env.REVENUECAT_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RCWebhookBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event } = body;
  if (!event?.type || !event?.app_user_id) {
    return NextResponse.json({ error: "Missing event fields" }, { status: 400 });
  }

  const supabase = getAdminSupabase();
  // RevenueCat app_user_id is set to the Supabase user UUID via Purchases.logIn()
  const userId = event.app_user_id;

  try {
    switch (event.type) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "NON_RENEWING_PURCHASE": {
        // Active paid subscription — elevate to starter tier
        await supabase
          .from("profiles")
          .update({
            subscription_tier: "starter",
            // Clear any prior cancellation data on reactivation
            cancelled_at: null,
            data_deletion_at: null,
            deletion_reminded: false,
          })
          .eq("id", userId);
        break;
      }

      case "PRODUCT_CHANGE": {
        // Product changed but still active — keep as starter (single tier)
        await supabase
          .from("profiles")
          .update({ subscription_tier: "starter" })
          .eq("id", userId);
        break;
      }

      case "CANCELLATION": {
        // Subscription cancelled but may still be in grace period until expiration.
        // We note the cancellation but do not downgrade until EXPIRATION fires.
        const now = new Date();
        const deletionDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

        await supabase
          .from("profiles")
          .update({
            cancelled_at: now.toISOString(),
            data_deletion_at: deletionDate.toISOString(),
            deletion_reminded: false,
          })
          .eq("id", userId);

        if (process.env.NODE_ENV !== "production") {
          console.log(`RC: subscription cancelled for user ${userId}. Deletion scheduled ${deletionDate.toISOString()}`);
        }
        break;
      }

      case "EXPIRATION":
      case "BILLING_ISSUE": {
        // Access ended — downgrade to free tier
        const now = new Date();
        const deletionDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

        await supabase
          .from("profiles")
          .update({
            subscription_tier: "free",
            cancelled_at: now.toISOString(),
            data_deletion_at: deletionDate.toISOString(),
            deletion_reminded: false,
          })
          .eq("id", userId);

        if (process.env.NODE_ENV !== "production") {
          console.log(`RC: ${event.type} for user ${userId} — downgraded to free`);
        }
        break;
      }

      // SUBSCRIBER_ALIAS and TRANSFER don't require tier changes
      default:
        break;
    }
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
