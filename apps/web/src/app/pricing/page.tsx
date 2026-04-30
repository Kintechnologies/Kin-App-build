"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import KinWordmark from "@/components/KinWordmark";
import { Check, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const PLAN = {
  id: "premium",
  name: "Kin Premium",
  monthly: 39,
  annual: 299,
  annualMonthly: 24.92,
  description: "Everything your family needs — one plan, no tiers",
  features: [
    "Morning briefing & coordination alerts",
    "Unlimited Kin AI chat",
    "Smart family calendar sync",
    "Household budget tracking",
    "Weekly meal plans & grocery lists",
    "Partner household sharing",
    "Private & encrypted",
  ],
};

const savingsPercent = Math.round((1 - PLAN.annualMonthly / PLAN.monthly) * 100); // 36%

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  async function handleSubscribe() {
    setLoading(true);
    setCheckoutError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/signup");
      return;
    }

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: PLAN.id, billing }),
      });

      if (response.ok) {
        const { url } = await response.json();
        if (url) {
          window.location.href = url;
          return;
        }
      }

      setCheckoutError("Something went wrong starting your trial. Please try again.");
    } catch {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error("Checkout error — see network tab for details");
      }
      setCheckoutError("Something went wrong starting your trial. Please try again.");
    }

    setLoading(false);
  }

  const displayPrice = billing === "monthly" ? PLAN.monthly : PLAN.annualMonthly;

  return (
    <main className="min-h-screen px-6 py-16 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/5 blur-[150px] pointer-events-none" />

      <div className="max-w-lg mx-auto relative">
        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/" style={{ textDecoration: "none", marginBottom: 24, display: "inline-block" }}>
            <KinWordmark size={24} tone="warm" />
          </Link>
          <h1 className="text-4xl font-medium text-warm-white mb-3" style={{ letterSpacing: "-0.03em" }}>
            Your family deserves a chief of staff
          </h1>
          <p className="text-warm-white/50 text-lg max-w-md mx-auto">
            7-day free trial — no credit card required to start
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center bg-surface-raised rounded-2xl p-1 border border-warm-white/5">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                billing === "monthly"
                  ? "bg-primary text-background shadow-md shadow-primary/20"
                  : "text-warm-white/40 hover:text-warm-white/60"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                billing === "annual"
                  ? "bg-primary text-background shadow-md shadow-primary/20"
                  : "text-warm-white/40 hover:text-warm-white/60"
              }`}
            >
              Annual
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                billing === "annual"
                  ? "bg-background/20 text-background"
                  : "bg-primary/20 text-primary"
              }`}>
                Save {savingsPercent}%
              </span>
            </button>
          </div>
        </div>

        {/* Plan card */}
        <div className="rounded-3xl p-6 bg-gradient-to-br from-primary/20 to-surface-raised border border-primary/30 transition-all hover:shadow-xl shadow-primary/10">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-primary mb-1">{PLAN.name}</h2>
            <p className="text-warm-white/40 text-sm">{PLAN.description}</p>
          </div>

          <div className="mb-6">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold font-mono text-primary">
                ${billing === "monthly" ? displayPrice : displayPrice.toFixed(0)}
              </span>
              <span className="text-warm-white/30 text-sm">/month</span>
            </div>
            {billing === "annual" && (
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-warm-white/25 text-xs font-mono line-through">
                  ${PLAN.monthly}/mo
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                  ${PLAN.annual}/year
                </span>
              </div>
            )}
          </div>

          <div className="space-y-3 mb-6">
            {PLAN.features.map((feature, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Check size={10} className="text-primary" />
                </div>
                <span className="text-sm text-warm-white/70">{feature}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 bg-primary text-background hover:shadow-lg hover:shadow-primary/25"
          >
            {loading ? (
              <span>Starting trial...</span>
            ) : (
              <>
                Start 7-Day Free Trial <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

        {/* Checkout error banner */}
        {checkoutError && (
          <p className="text-center text-rose/80 text-sm mt-5" role="alert">
            ⚠️ {checkoutError}
          </p>
        )}

        <p className="text-center text-warm-white/25 text-xs mt-8 max-w-sm mx-auto">
          7-day free trial, cancel anytime. No credit card required to start your trial.
          You&apos;ll only be charged after the trial ends.
        </p>
        <div className="flex justify-center gap-4 mt-4">
          <Link href="/privacy" className="text-warm-white/20 text-xs hover:text-warm-white/40 transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-warm-white/20 text-xs hover:text-warm-white/40 transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
    </main>
  );
}
