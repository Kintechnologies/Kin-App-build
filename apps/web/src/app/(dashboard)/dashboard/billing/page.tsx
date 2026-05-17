"use client";

import { useState, useEffect, Suspense } from "react";
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
        color: "rgba(240,237,230,0.4)",
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
    tone: "#7AADCE",
    bg: "rgba(122,173,206,0.1)",
    border: "rgba(122,173,206,0.3)",
  },
  active: {
    label: "Active",
    tone: "#7CB87A",
    bg: "rgba(124,184,122,0.1)",
    border: "rgba(124,184,122,0.3)",
  },
  past_due: {
    label: "Past due",
    tone: "#D4748A",
    bg: "rgba(212,116,138,0.1)",
    border: "rgba(212,116,138,0.3)",
  },
  canceled: {
    label: "Canceled",
    tone: "rgba(240,237,230,0.5)",
    bg: "rgba(240,237,230,0.04)",
    border: "rgba(240,237,230,0.08)",
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
        border: `1px solid ${m.border}`,
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
        background: "#7CB87A",
        color: "#0C0F0A",
        border: "none",
        borderRadius: "10px",
        padding: "11px 18px",
        fontSize: "13.5px",
        fontWeight: 600,
        letterSpacing: "-0.15px",
        cursor: loading ? "wait" : "pointer",
        opacity: loading ? 0.6 : 1,
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
        border: "1px solid rgba(240,237,230,0.12)",
        borderRadius: "10px",
        padding: "11px 18px",
        fontSize: "13.5px",
        fontWeight: 500,
        color: "rgba(240,237,230,0.72)",
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
          .select("id, email, subscription_status, trial_ends_at")
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

  function statusLine(): string {
    switch (status) {
      case "trial":
        return trialDaysLeft > 0
          ? `Free trial · ${trialDaysLeft} day${
              trialDaysLeft === 1 ? "" : "s"
            } left${trialEndLabel ? ` (ends ${trialEndLabel})` : ""}`
          : "Your free trial has ended — add a payment method to keep Kin.";
      case "active":
        return "Active · billed monthly";
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
            fontSize: "28px",
            fontWeight: 500,
            color: "#F0EDE6",
            letterSpacing: "-0.025em",
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
            background: "rgba(124,184,122,0.1)",
            border: "1px solid rgba(124,184,122,0.3)",
            borderRadius: "10px",
            fontSize: "13.5px",
            color: "#7CB87A",
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
            color: "rgba(240,237,230,0.4)",
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
            background: "rgba(240,237,230,0.025)",
            border: "1px solid rgba(240,237,230,0.06)",
            borderRadius: "12px",
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
                    fontSize: "18px",
                    fontWeight: 500,
                    color: "#F0EDE6",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Kin Premium
                </h2>
                <span
                  style={{
                    fontSize: "13px",
                    color: "rgba(240,237,230,0.56)",
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
                      ? "rgba(212,116,138,0.85)"
                      : "rgba(240,237,230,0.56)",
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
                background: "rgba(212,116,138,0.08)",
                border: "1px solid rgba(212,116,138,0.25)",
                borderRadius: "10px",
                fontSize: "12.5px",
                color: "rgba(212,116,138,0.9)",
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
                  background: "rgba(240,237,230,0.04)",
                  border: "1px solid rgba(240,237,230,0.12)",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  fontSize: "13.5px",
                  color: "#F0EDE6",
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
              role="alert"
              style={{ fontSize: "12.5px", color: "rgba(212,116,138,0.85)" }}
            >
              {error}
            </p>
          )}

          <p
            style={{
              fontSize: "12px",
              color: "rgba(240,237,230,0.4)",
              lineHeight: 1.5,
              borderTop: "1px solid rgba(240,237,230,0.06)",
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
