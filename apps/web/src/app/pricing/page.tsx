"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Sparkles, Crown, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const plans = [
  {
    id: "starter",
    name: "Starter",
    monthly: 29,
    annual: 290,
    annualMonthly: 24.17,
    description: "Everything one parent needs to run the household",
    features: [
      "1 parent profile",
      "Full AI chat with Kin",
      "Weekly meal plans & grocery lists",
      "Budget tracking (50/30/20)",
      "Nutrition goal planning",
      "Voice input & read-aloud",
    ],
    gradient: "from-primary/20 to-primary/5",
    badge: null,
  },
  {
    id: "family",
    name: "Family",
    monthly: 49,
    annual: 490,
    annualMonthly: 40.83,
    description: "For both parents — private profiles, shared household",
    features: [
      "Everything in Starter, plus:",
      "2 private parent profiles",
      "Shared household layer",
      "Dual calendar coordination",
      "Date night suggestions",
      "Sunday family briefing",
      "Partner invite & shared meals",
    ],
    gradient: "from-amber/20 to-amber/5",
    badge: "Most Popular",
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const savingsPercent = 17; // ~2 months free on annual

  async function handleSubscribe(planId: string) {
    setLoading(planId);
    setCheckoutError(null); // clear any previous error on new attempt

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
        body: JSON.stringify({ planId, billing }),
      });

      if (response.ok) {
        const { url } = await response.json();
        if (url) {
          window.location.href = url;
          return;
        }
      }

      // Non-ok response or missing redirect URL
      setCheckoutError("Something went wrong starting your trial. Please try again.");
    } catch {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error("Checkout error — see network tab for details");
      }
      setCheckoutError("Something went wrong starting your trial. Please try again.");
    }

    setLoading(null);
  }

  return (
    <main className="min-h-screen px-6 py-16 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/5 blur-[150px] pointer-events-none" />

      <div className="max-w-3xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/" className="font-serif italic text-3xl text-primary mb-6 inline-block">
            Kin
          </Link>
          <h1 className="font-serif italic text-4xl text-warm-white mb-3">
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

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          {plans.map((plan) => {
            const isFamily = plan.id === "family";
            const colorClasses = isFamily
              ? { text: "text-amber", bg: "bg-amber/15", bgStrong: "bg-amber/20", border: "border-amber/30", shadow: "shadow-amber/10" }
              : { text: "text-primary", bg: "bg-primary/15", bgStrong: "bg-primary/20", border: "border-primary/30", shadow: "shadow-primary/10" };

            const displayPrice = billing === "monthly" ? plan.monthly : plan.annualMonthly;
            const totalAnnual = plan.annual;

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl ${isFamily ? "p-6 pt-8" : "p-6"} bg-gradient-to-br ${plan.gradient} to-surface-raised border ${isFamily ? "border-amber/20" : "border-warm-white/10"} transition-all hover:scale-[1.02] hover:shadow-xl ${colorClasses.shadow}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full text-xs font-semibold bg-amber text-background shadow-lg shadow-amber/25">
                    <Crown size={12} className="inline mr-1 -mt-0.5" />
                    {plan.badge}
                  </div>
                )}

                <div className="mb-5">
                  <h2 className={`text-lg font-semibold ${colorClasses.text} mb-1`}>{plan.name}</h2>
                  <p className="text-warm-white/40 text-sm">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-bold font-mono ${colorClasses.text}`}>
                      ${billing === "monthly" ? displayPrice : displayPrice.toFixed(0)}
                    </span>
                    <span className="text-warm-white/30 text-sm">/month</span>
                  </div>
                  {billing === "annual" && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-warm-white/25 text-xs font-mono line-through">
                        ${plan.monthly}/mo
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colorClasses.bg} ${colorClasses.text}`}>
                        ${totalAnnual}/year
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      {feature.startsWith("Everything") ? (
                        <Sparkles size={14} className={`${colorClasses.text} mt-0.5 shrink-0`} />
                      ) : (
                        <div className={`w-4 h-4 rounded-full ${colorClasses.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                          <Check size={10} className={colorClasses.text} />
                        </div>
                      )}
                      <span className={`text-sm ${feature.startsWith("Everything") ? `font-semibold ${colorClasses.text}` : "text-warm-white/70"}`}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading !== null}
                  className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 ${
                    isFamily
                      ? "bg-amber text-background hover:shadow-lg hover:shadow-amber/25"
                      : "bg-primary text-background hover:shadow-lg hover:shadow-primary/25"
                  }`}
                >
                  {loading === plan.id ? (
                    <span>Starting trial...</span>
                  ) : (
                    <>
                      Start Free Trial <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            );
          })}
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
