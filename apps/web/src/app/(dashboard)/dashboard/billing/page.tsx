"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  CreditCard,
  Check,
  Loader2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type SubscriptionStatus = "trial" | "active" | "past_due" | "canceled";

interface Profile {
  id: string;
  email: string | null;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  // Migration 065: Stripe writes this on cancel-at-period-end so the user
  // keeps access until the period rolls over. subscription_status stays
  // "active" until then, so the badge alone hides the pending cancellation.
  cancel_at_period_end: boolean | null;
  // Migration 076 (P2-D1): renewal date / cancellation cutover. Populated by
  // the webhook on customer.subscription.updated. Null on legacy rows that
  // predate the migration — UI degrades to date-less copy.
  subscription_current_period_end: string | null;
}

const PREMIUM_PRICE = "$39/month";

// ── Atoms ─────────────────────────────────────────────────────────────────────

function MonoLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-mono uppercase"
      style={{
        fontSize: "11.5px",
        letterSpacing: "0.04em",
        color: "rgba(44,44,40,0.4)",
      }}
    >
      {children}
    </span>
  );
}

const STATUS_META: Record<
  SubscriptionStatus,
  { label: string; tone: string; bg: string; border: string }
> = {
  trial: {
    label: "Trial",
    tone: "#7A8C6A",
    bg: "rgba(122,140,106,0.1)",
    border: "rgba(122,140,106,0.3)",
  },
  active: {
    label: "Active",
    tone: "#5C6B4F",
    bg: "rgba(92,107,79,0.1)",
    border: "rgba(92,107,79,0.3)",
  },
  past_due: {
    label: "Past due",
    tone: "#A65A4A",
    bg: "rgba(166,90,74,0.1)",
    border: "rgba(166,90,74,0.3)",
  },
  canceled: {
    label: "Canceled",
    tone: "rgba(44,44,40,0.5)",
    bg: "rgba(44,44,40,0.04)",
    border: "rgba(44,44,40,0.08)",
  },
};

function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const m = STATUS_META[status];
  return (
    <span
      className="font-mono uppercase"
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 10px",
        background: m.bg,
        border: `0.5px solid ${m.border}`,
        borderRadius: "999px",
        fontSize: "11.5px",
        fontWeight: 500,
        color: m.tone,
        letterSpacing: "0.04em",
      }}
    >
      {m.label}
    </span>
  );
}

function PrimaryButton({
  children,
  onClick,
  loading,
}: {
  children: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "7px",
        background: "#5C6B4F",
        color: "#FDFBF7",
        border: "none",
        borderRadius: "4px",
        padding: "11px 18px",
        fontSize: "13px",
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        cursor: loading ? "wait" : "pointer",
        opacity: loading ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        if (!loading) e.currentTarget.style.background = "#3D4A33";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#5C6B4F";
      }}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

function GhostButton({
  children,
  onClick,
  loading,
}: {
  children: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "7px",
        background: "transparent",
        border: "0.5px solid rgba(44,44,40,0.12)",
        borderRadius: "4px",
        padding: "11px 18px",
        fontSize: "13px",
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "rgba(44,44,40,0.72)",
        cursor: loading ? "wait" : "pointer",
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function BillingPageInner() {
  const searchParams = useSearchParams();
  const justSubscribed = searchParams.get("subscribed") === "true";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  // P2-D5 (audit v6): the error message lives near the bottom of the pricing
  // card and is often off-screen on phones / laptops after the user clicks
  // "Start subscription." Ref it so we can scroll it into view as soon as
  // an error is set — otherwise the click feels like a no-op.
  const errorRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [error]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data } = await supabase
          .from("profiles")
          .select("id, email, subscription_status, trial_ends_at, cancel_at_period_end, subscription_current_period_end")
          .eq("id", user.id)
          .single();
        if (data && !cancelled) setProfile(data as Profile);
      } catch {
        // Fall through — the page renders its safe default (trial) state.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function startCheckout() {
    setAction("checkout");
    setError(null);
    try {
      const trimmedCoupon = couponCode.trim();
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          trimmedCoupon ? { coupon: trimmedCoupon } : {}
        ),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? "Could not start checkout. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    }
    setAction(null);
  }

  async function openPortal() {
    setAction("portal");
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnPath: "/dashboard/billing" }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? "Could not open the billing portal.");
    } catch {
      setError("Network error. Please try again.");
    }
    setAction(null);
  }

  const status: SubscriptionStatus = profile?.subscription_status ?? "trial";

  const trialEnds = profile?.trial_ends_at
    ? new Date(profile.trial_ends_at)
    : null;
  const trialDaysLeft =
    trialEnds && trialEnds > new Date()
      ? Math.max(
          1,
          Math.ceil(
            (trialEnds.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )
        )
      : 0;
  const trialEndLabel = trialEnds
    ? trialEnds.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  // P2-D1 (audit v6): render the subscription_current_period_end date inline
  // when present so the user knows exactly when their renewal lands or their
  // cancellation cuts over — instead of having to open the Stripe portal.
  const periodEndDate = profile?.subscription_current_period_end
    ? new Date(profile.subscription_current_period_end)
    : null;
  const periodEndLabel =
    periodEndDate && !Number.isNaN(periodEndDate.getTime())
      ? periodEndDate.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : null;

  function statusLine(): string {
    switch (status) {
      case "trial":
        return trialDaysLeft > 0
          ? `Free trial · ${trialDaysLeft} day${
              trialDaysLeft === 1 ? "" : "s"
            } left${trialEndLabel ? ` (ends ${trialEndLabel})` : ""}`
          : "Your free trial has ended — add a payment method to keep Kin.";
      case "active":
        // cancel_at_period_end = true means the user already cancelled via the
        // Stripe Customer Portal but keeps access until the period rolls over.
        // Without this branch the badge says "Active" right up to the cutover
        // and the user has no in-app signal that their plan is winding down.
        if (profile?.cancel_at_period_end) {
          return periodEndLabel
            ? `Cancels on ${periodEndLabel} · resubscribe anytime to undo`
            : "Cancels at end of billing period · resubscribe anytime to undo";
        }
        return periodEndLabel
          ? `Active · renews ${periodEndLabel}`
          : "Active · billed monthly";
      case "past_due":
        return "We couldn't process your last payment. Update your card to keep Kin.";
      case "canceled":
        return "Your subscription was canceled. Resubscribe anytime.";
    }
  }

  return (
    <div
      style={{
        maxWidth: "640px",
        margin: "0 auto",
        padding: "32px 24px 48px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <header>
        <MonoLabel>{"// BILLING"}</MonoLabel>
        <h1
          style={{
            fontFamily: "var(--font-instrument-serif), 'Playfair Display', serif",
            fontSize: "34px",
            fontWeight: 400,
            color: "#2C2C28",
            letterSpacing: "-0.015em",
            marginTop: "8px",
          }}
        >
          Billing & plan
        </h1>
      </header>

      {justSubscribed && (
        <div
          role="status"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 14px",
            background: "rgba(92,107,79,0.1)",
            border: "0.5px solid rgba(92,107,79,0.3)",
            borderRadius: "8px",
            fontSize: "13.5px",
            color: "#5C6B4F",
          }}
        >
          <Check size={15} />
          You&apos;re all set — thanks for subscribing to Kin Premium.
        </div>
      )}

      {loading ? (
        <p
          style={{
            fontSize: "13.5px",
            color: "rgba(44,44,40,0.4)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <Loader2 size={12} className="animate-spin" /> Loading your plan…
        </p>
      ) : (
        <section
          style={{
            background: "#FDFBF7",
            border: "0.5px solid var(--hair)",
            borderRadius: "8px",
            padding: "22px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "4px",
                }}
              >
                <h2
                  style={{
                    fontFamily: "var(--font-instrument-serif), 'Playfair Display', serif",
                    fontSize: "22px",
                    fontWeight: 400,
                    color: "#2C2C28",
                    letterSpacing: "-0.015em",
                  }}
                >
                  Kin Premium
                </h2>
                <span
                  style={{
                    fontSize: "13px",
                    color: "rgba(44,44,40,0.56)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  · {PREMIUM_PRICE}
                </span>
              </div>
              <p
                style={{
                  fontSize: "13px",
                  color:
                    status === "past_due"
                      ? "rgba(166,90,74,0.9)"
                      : "rgba(44,44,40,0.56)",
                  lineHeight: 1.5,
                  maxWidth: "380px",
                }}
              >
                {statusLine()}
              </p>
            </div>
            <StatusBadge status={status} />
          </div>

          {status === "past_due" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "9px",
                padding: "11px 13px",
                background: "rgba(166,90,74,0.08)",
                border: "0.5px solid rgba(166,90,74,0.25)",
                borderRadius: "8px",
                fontSize: "12.5px",
                color: "rgba(166,90,74,0.9)",
              }}
            >
              <AlertTriangle size={14} style={{ flexShrink: 0 }} />
              Your subscription is paused until payment succeeds.
            </div>
          )}

          {(status === "trial" || status === "canceled") && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <label htmlFor="coupon">
                <MonoLabel>{"// HAVE A BETA CODE?"}</MonoLabel>
              </label>
              <input
                id="coupon"
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Enter code"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                style={{
                  width: "100%",
                  maxWidth: "240px",
                  background: "rgba(44,44,40,0.04)",
                  border: "0.5px solid rgba(44,44,40,0.12)",
                  borderRadius: "4px",
                  padding: "10px 12px",
                  fontSize: "13.5px",
                  color: "#2C2C28",
                  letterSpacing: "0.02em",
                  outline: "none",
                }}
              />
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {status === "active" ? (
              <PrimaryButton
                onClick={openPortal}
                loading={action === "portal"}
              >
                <CreditCard size={15} /> Manage subscription
              </PrimaryButton>
            ) : status === "past_due" ? (
              <PrimaryButton
                onClick={openPortal}
                loading={action === "portal"}
              >
                <CreditCard size={15} /> Update payment method
              </PrimaryButton>
            ) : (
              <PrimaryButton
                onClick={startCheckout}
                loading={action === "checkout"}
              >
                <Sparkles size={15} />
                {status === "canceled"
                  ? "Resubscribe"
                  : "Add payment method"}
              </PrimaryButton>
            )}

            {status === "active" && (
              <GhostButton onClick={openPortal} loading={action === "portal"}>
                Update card or cancel
              </GhostButton>
            )}
          </div>

          {error && (
            <p
              ref={errorRef}
              role="alert"
              style={{ fontSize: "12.5px", color: "rgba(166,90,74,0.9)" }}
            >
              {error}
            </p>
          )}

          <p
            style={{
              fontSize: "12px",
              color: "rgba(44,44,40,0.4)",
              lineHeight: 1.5,
              borderTop: "0.5px solid var(--hair)",
              paddingTop: "14px",
            }}
          >
            Payments are processed securely by Stripe. Kin never sees or stores
            your card details.
          </p>
        </section>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={null}>
      <BillingPageInner />
    </Suspense>
  );
}
