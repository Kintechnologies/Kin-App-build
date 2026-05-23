/**
 * POST /api/stripe/webhook
 *
 * Keeps profiles.subscription_status in sync with Stripe:
 *   checkout.session.completed    → active  (+ store stripe_customer_id)
 *   invoice.payment_failed        → past_due
 *   invoice.payment_succeeded     → past_due → active recovery
 *   customer.subscription.updated → map Stripe status + cancel_at_period_end
 *   customer.subscription.deleted → canceled
 *
 * Idempotency (audit v5 P0-3): every accepted event is recorded in
 * stripe_events (event_id PK). A retried webhook short-circuits to 200 before
 * any handler runs, so Stripe's 3-day retry storm cannot replay state changes.
 *
 * Uses the service-role Supabase client — webhooks have no user session.
 */

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";
import { notifySlack } from "@/lib/notify";
import { STRIPE_API_VERSION } from "@/lib/stripe";

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
    apiVersion: STRIPE_API_VERSION,
  });
}

type SubscriptionStatus = "trial" | "active" | "past_due" | "canceled";

/**
 * Map a Stripe subscription.status to our 4-state DB enum. Returns null for
 * statuses we deliberately don't surface (incomplete / incomplete_expired
 * mid-checkout transitions are noise — the canonical checkout signal is
 * checkout.session.completed).
 */
function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status,
  eventType?: string
): SubscriptionStatus | null {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trial";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
      return "canceled";
    default:
      // paused / incomplete / incomplete_expired all fall through. Drop a
      // breadcrumb (audit V7 P2-B3) so when a profile gets stuck in an
      // unexpected status we can correlate which Stripe event-type caused
      // the no-op map.
      Sentry.addBreadcrumb({
        category: "stripe.webhook",
        level: "info",
        message: "Unhandled subscription status mapped to null",
        data: {
          event_type: eventType ?? "(unknown)",
          subscription_status: status,
        },
      });
      return null;
  }
}

/**
 * Update a profile's subscription_status, resolving the row by Supabase user
 * id when available, then by Stripe customer id (payment_failed events carry
 * no user metadata), then by email as a last-ditch fallback for invoice events
 * that lack both. When the email fallback succeeds we stamp stripe_customer_id
 * so the next event resolves on the fast path. (v6 P1-B1)
 */
async function setStatus(
  supabase: SupabaseClient,
  status: SubscriptionStatus,
  {
    userId,
    customerId,
    customerEmail,
  }: {
    userId?: string | null;
    customerId?: string | null;
    customerEmail?: string | null;
  }
) {
  const patch: Record<string, unknown> = { subscription_status: status };
  if (customerId) patch.stripe_customer_id = customerId;

  // Webhook race (audit V7 P2-B1): the auth.users → profiles trigger can lag
  // the first checkout.session.completed by a few hundred ms, in which case
  // an `update().eq("id", userId)` silently affects zero rows and the user
  // is left as `trial` despite paying. Use `.select("id")` to get rowCount
  // back and breadcrumb when nothing matched so we can audit failures.
  if (userId) {
    const { data } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", userId)
      .select("id");
    if (!data || data.length === 0) {
      Sentry.captureMessage(
        "Stripe webhook: setStatus matched 0 rows by userId — profile trigger may be lagging",
        "warning"
      );
    }
    return;
  }
  if (customerId) {
    const { data } = await supabase
      .from("profiles")
      .update({ subscription_status: status })
      .eq("stripe_customer_id", customerId)
      .select("id");
    if (!data || data.length === 0) {
      Sentry.captureMessage(
        "Stripe webhook: setStatus matched 0 rows by customerId",
        "warning"
      );
    }
    return;
  }
  if (customerEmail) {
    const normalizedEmail = customerEmail.toLowerCase();
    const { data: byEmail } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", normalizedEmail)
      .maybeSingle<{ id: string }>();
    if (byEmail?.id) {
      await supabase
        .from("profiles")
        .update(patch)
        .eq("id", byEmail.id);
      return;
    }
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
    // Signature mismatch is rarely a real attack — usually a webhook-secret
    // rotation mismatch — but it leaves billing events unprocessed until it's
    // fixed, so flag it loud.
    await notifySlack(
      `Stripe webhook rejected: invalid signature (${err instanceof Error ? err.message : String(err)})`,
      "critical"
    ).catch(() => {});
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getAdminSupabase();

  // Idempotency short-circuit (audit v5 P0-3). Insert the event_id; if it
  // conflicts the event has already been processed and we ack 200 without
  // re-running the handler. Belt-and-suspenders alongside the per-handler
  // active-status guard.
  const { data: inserted, error: dedupError } = await supabase
    .from("stripe_events")
    .insert({ event_id: event.id, event_type: event.type })
    .select("event_id")
    .maybeSingle();

  if (dedupError) {
    // 23505 unique_violation → already processed, this is the normal dedup path.
    if (dedupError.code === "23505") {
      return NextResponse.json({ received: true, deduped: true });
    }
    Sentry.captureException(dedupError);
    await notifySlack(
      `Stripe webhook dedup insert failed: ${dedupError.message}`,
      "critical"
    ).catch(() => {});
    return NextResponse.json({ error: "Dedup failed" }, { status: 500 });
  }
  if (!inserted) {
    return NextResponse.json({ received: true, deduped: true });
  }

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
        // P1-B1 (audit v7): clear the stale cancel_at_period_end / period_end
        // a resubscribing user may carry from their prior canceled cycle, so
        // the billing UI doesn't incorrectly show "cancels on X" right after
        // they paid again. The customer.subscription.updated event that
        // follows will repopulate period_end with the new cycle.
        const resubscribePatch = {
          cancel_at_period_end: false,
          subscription_current_period_end: null,
        };
        if (userId) {
          await supabase.from("profiles").update(resubscribePatch).eq("id", userId);
        } else if (customerId) {
          await supabase
            .from("profiles")
            .update(resubscribePatch)
            .eq("stripe_customer_id", customerId);
        }
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
          // Rare edge case: an invoice without a resolvable customer id can
          // still carry customer_email. Falling back to that field lets us
          // mark the right profile past_due instead of warning + no-op. (v6 P1-B1)
          customerEmail: invoice.customer_email ?? null,
        });
        break;
      }

      case "invoice.payment_succeeded": {
        // Recovery path: a `past_due` profile becomes `active` again as soon as
        // the retry succeeds. Without this, the user pays in the portal but our
        // briefings stay paused until the next `customer.subscription.updated`
        // (which we also handle now, but this path is the faster signal).
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id ?? null;
        if (customerId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, subscription_status")
            .eq("stripe_customer_id", customerId)
            .maybeSingle<{ id: string; subscription_status: string | null }>();
          if (profile?.subscription_status === "past_due") {
            await supabase
              .from("profiles")
              .update({ subscription_status: "active" })
              .eq("id", profile.id);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        // Stripe Customer Portal cancels arrive here first (with
        // cancel_at_period_end = true); the actual `customer.subscription.deleted`
        // can be up to 30 days later. Trial conversions and past_due/active
        // transitions also flow through this event, so it's the canonical
        // source of subscription state.
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id ?? null;

        const mapped = mapStripeSubscriptionStatus(
          subscription.status,
          event.type
        );
        if (mapped) {
          // P2-D1 (audit v6): persist current_period_end so the billing UI
          // can render the renewal/cancel date inline (migration 076).
          // Stripe moved this off Subscription onto SubscriptionItem in
          // their 2025+ API (each item can theoretically have a separate
          // period; we only have one item). Falls back to the legacy field
          // on older SDK versions for safety.
          const subItem = subscription.items?.data?.[0] as
            | { current_period_end?: number }
            | undefined;
          const legacyPeriodEnd = (subscription as unknown as {
            current_period_end?: number;
          }).current_period_end;
          const periodEndSeconds =
            subItem?.current_period_end ?? legacyPeriodEnd ?? null;
          const periodEndIso =
            typeof periodEndSeconds === "number"
              ? new Date(periodEndSeconds * 1000).toISOString()
              : null;
          const patch: Record<string, unknown> = {
            subscription_status: mapped,
            cancel_at_period_end: subscription.cancel_at_period_end === true,
            subscription_current_period_end: periodEndIso,
          };
          if (customerId) patch.stripe_customer_id = customerId;

          if (userId) {
            await supabase.from("profiles").update(patch).eq("id", userId);
          } else if (customerId) {
            await supabase
              .from("profiles")
              .update(patch)
              .eq("stripe_customer_id", customerId);
          } else {
            Sentry.captureMessage(
              "Stripe webhook: customer.subscription.updated without resolvable profile",
              "warning"
            );
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        // Idempotency / out-of-order guard (audit v4 P0-4). Stripe documents
        // that webhook events can arrive out of order and that retries continue
        // for up to 3 days. A retried (or late) `customer.subscription.deleted`
        // arriving AFTER a fresh `checkout.session.completed` (the user
        // re-subscribed) would silently flip a paying customer back to
        // `canceled` and fire the trial-ended SMS at them.
        //
        // Defense: never downgrade a profile whose current status is `active`.
        // The user could only have become `active` again by completing a new
        // checkout, which means this delete event is for an older subscription
        // that no longer represents their billing state.
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id ?? null;

        let currentStatus: string | null = null;
        if (userId) {
          const { data } = await supabase
            .from("profiles")
            .select("subscription_status")
            .eq("id", userId)
            .maybeSingle<{ subscription_status: string | null }>();
          currentStatus = data?.subscription_status ?? null;
        } else if (customerId) {
          const { data } = await supabase
            .from("profiles")
            .select("subscription_status")
            .eq("stripe_customer_id", customerId)
            .maybeSingle<{ subscription_status: string | null }>();
          currentStatus = data?.subscription_status ?? null;
        }

        if (currentStatus === "active") {
          console.log(
            `Stripe webhook: ignoring stale customer.subscription.deleted for ` +
              `customer ${customerId ?? "(unknown)"} — profile is currently active`
          );
          break;
        }

        // P1-B1 (audit v7): clear cancel_at_period_end and
        // subscription_current_period_end at the moment cancellation cuts
        // over. setStatus only writes subscription_status, so without this
        // patch the row stays cancel_at_period_end=true + a stale
        // period_end forever — analytics or future "win-back" SMS keyed on
        // either flag would treat post-cancel state as live signal.
        await setStatus(supabase, "canceled", { userId, customerId });
        const cleanupPatch = {
          cancel_at_period_end: false,
          subscription_current_period_end: null,
        };
        if (userId) {
          await supabase.from("profiles").update(cleanupPatch).eq("id", userId);
        } else if (customerId) {
          await supabase
            .from("profiles")
            .update(cleanupPatch)
            .eq("stripe_customer_id", customerId);
        }
        break;
      }

      // P1-B2 (audit v7): dispute notifications. Stripe sends
      // charge.dispute.created when a chargeback is opened against a charge
      // we've already collected on. The funds can be pulled before we
      // hear about it via the dashboard, so the only reliable signal in
      // steady state is this webhook. We alert critical to Slack and
      // capture to Sentry; no DB write — the rep handles the response
      // out-of-band in the Stripe dashboard.
      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        const customerId =
          typeof dispute.charge === "string" ? null : dispute.charge?.customer;
        const amount = (dispute.amount ?? 0) / 100;
        const currency = (dispute.currency ?? "usd").toUpperCase();
        Sentry.captureMessage(
          `Stripe dispute opened: ${dispute.id} (${dispute.reason})`,
          "warning"
        );
        await notifySlack(
          `Stripe dispute opened: ${dispute.id} for ${amount.toFixed(2)} ${currency} ` +
            `(reason: ${dispute.reason}, status: ${dispute.status}). ` +
            `Customer: ${typeof customerId === "string" ? customerId : "(unresolved)"}`,
          "critical"
        ).catch(() => {});
        break;
      }

      // Explicit no-op for refunds. We log + Sentry breadcrumb so a refund
      // doesn't silently land — but the customer.subscription.deleted path
      // is what flips the profile state, so there's nothing to write here.
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const amount = (charge.amount_refunded ?? 0) / 100;
        Sentry.captureMessage(
          `Stripe refund processed: charge ${charge.id} refunded ${amount.toFixed(2)}`,
          "info"
        );
        break;
      }
    }
  } catch (error) {
    Sentry.captureException(error);
    // A handler exception means we returned 500 to Stripe; Stripe will retry,
    // but a profile's subscription_status may now be out of sync until then.
    // Critical because this is the money path.
    await notifySlack(
      `Stripe webhook handler failed for ${event.type}: ${error instanceof Error ? error.message : String(error)}`,
      "critical"
    ).catch(() => {});
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
