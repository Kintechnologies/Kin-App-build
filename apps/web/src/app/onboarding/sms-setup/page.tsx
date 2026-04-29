"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ArrowRight, Loader2, Phone, CreditCard, Calendar } from "lucide-react";

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex gap-2 justify-center mb-8">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === current ? "w-6 bg-primary" : i < current ? "w-2 bg-primary/40" : "w-2 bg-white/10"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Step 0: Phone ────────────────────────────────────────────────────────────

function PhoneStep({ onNext }: { onNext: () => void }) {
  const [phone, setPhone] = useState("");
  const [partnerPhone, setPartnerPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function formatPhone(raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }

  function toE164(formatted: string) {
    const digits = formatted.replace(/\D/g, "");
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const e164 = toE164(phone);
    if (!e164) {
      setError("Enter a valid US phone number.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Session expired. Please sign in again."); setLoading(false); return; }

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ phone_number: e164 })
        .eq("id", user.id);

      if (updateErr) throw updateErr;

      // Store partner phone in sessionStorage for post-Stripe partner invite SMS
      if (partnerPhone) {
        const partnerE164 = toE164(partnerPhone);
        if (partnerE164) sessionStorage.setItem("kin_partner_phone", partnerE164);
      }

      onNext();
    } catch {
      setError("Couldn't save your number. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      key="phone"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/15 mx-auto mb-4">
        <Phone className="text-primary" size={22} />
      </div>
      <h2 className="text-warm-white font-semibold text-xl text-center mb-1">
        Your phone number
      </h2>
      <p className="text-warm-white/45 text-sm text-center mb-6">
        Kin will text your morning briefing to this number every day at 6am.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-warm-white/60 text-xs font-medium mb-1.5" htmlFor="your-phone">
            Your number
          </label>
          <input
            id="your-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="(555) 000-0000"
            maxLength={14}
            required
            autoComplete="tel"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-warm-white placeholder:text-warm-white/25 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
          />
        </div>

        <div>
          <label className="block text-warm-white/60 text-xs font-medium mb-1.5" htmlFor="partner-phone">
            Partner&apos;s number{" "}
            <span className="text-warm-white/25 font-normal">(optional — we&apos;ll send them an invite)</span>
          </label>
          <input
            id="partner-phone"
            type="tel"
            value={partnerPhone}
            onChange={(e) => setPartnerPhone(formatPhone(e.target.value))}
            placeholder="(555) 000-0000"
            maxLength={14}
            autoComplete="tel"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-warm-white placeholder:text-warm-white/25 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
          />
        </div>

        {error && <p className="text-rose text-sm" role="alert">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-background py-3.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all duration-300 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          Continue <ArrowRight size={16} />
        </button>
      </form>
    </motion.div>
  );
}

// ─── Step 1: Trial ────────────────────────────────────────────────────────────

function TrialStep({ onNext }: { onNext: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function startTrial() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: "premium",
          billing: "monthly",
          successPath: "/onboarding/sms-setup?subscribed=true",
        }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Failed to start checkout");
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <motion.div
      key="trial"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-amber/15 mx-auto mb-4">
        <CreditCard className="text-amber" size={22} />
      </div>
      <h2 className="text-warm-white font-semibold text-xl text-center mb-1">
        Start your free trial
      </h2>
      <p className="text-warm-white/45 text-sm text-center mb-6">
        7 days free, then $39/mo for your entire family. Cancel anytime.
      </p>

      <div className="glass rounded-2xl px-5 py-4 mb-6 space-y-2.5">
        {[
          "Daily 6am briefing for both parents",
          "Text-back Q&A anytime",
          "Both Google Calendars synced",
          "Partner invite included",
        ].map((feat) => (
          <div key={feat} className="flex items-center gap-3">
            <CheckCircle2 size={15} className="text-primary shrink-0" />
            <span className="text-warm-white/70 text-sm">{feat}</span>
          </div>
        ))}
      </div>

      {error && <p className="text-rose text-sm mb-3" role="alert">{error}</p>}

      <button
        onClick={startTrial}
        disabled={loading}
        className="w-full bg-primary text-background py-3.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all duration-300 disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
        Start 7-day free trial <ArrowRight size={16} />
      </button>

      <p className="text-warm-white/25 text-xs text-center mt-3">
        No charge today. Card required to hold your spot.
      </p>
    </motion.div>
  );
}

// ─── Step 2: Calendar ─────────────────────────────────────────────────────────

function CalendarStep() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function connectCalendar() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/calendar/google");
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Failed to get Google OAuth URL");
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message ?? "Couldn't connect calendar. Try again.");
      setLoading(false);
    }
  }

  return (
    <motion.div
      key="calendar"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-blue/15 mx-auto mb-4">
        <Calendar className="text-blue" size={22} />
      </div>
      <h2 className="text-warm-white font-semibold text-xl text-center mb-1">
        Connect Google Calendar
      </h2>
      <p className="text-warm-white/45 text-sm text-center mb-6">
        Kin reads your calendar to build your briefing. It never writes events without asking.
      </p>

      <div className="glass rounded-2xl px-5 py-4 mb-6">
        <p className="text-warm-white/50 text-xs leading-relaxed">
          Kin requests read-only access. We sync your events every hour and on webhook updates.
          Your data is never sold or shared.
        </p>
      </div>

      {error && <p className="text-rose text-sm mb-3" role="alert">{error}</p>}

      <button
        onClick={connectCalendar}
        disabled={loading}
        className="w-full bg-primary text-background py-3.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all duration-300 disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
        Connect Google Calendar <ArrowRight size={16} />
      </button>

      <p className="text-warm-white/25 text-xs text-center mt-3">
        You&apos;ll be redirected to Google to approve access.
      </p>
    </motion.div>
  );
}

// ─── Inner component (uses useSearchParams) ───────────────────────────────────

function SmsSetupInner() {
  const searchParams = useSearchParams();
  const subscribed = searchParams.get("subscribed") === "true";

  // subscribed=true means Stripe completed — advance directly to calendar step
  const [step, setStep] = useState(subscribed ? 2 : 0);

  // On mount: if subscribed, mark onboarding_step = 2 in profiles
  useEffect(() => {
    if (!subscribed) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("profiles").update({ onboarding_step: 2 }).eq("id", user.id);
      }
    });
  }, [subscribed]);

  return (
    <div className="w-full max-w-sm">
      <StepDots current={step} />

      <div className="bg-surface rounded-2xl p-6 border border-warm-white/10">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <PhoneStep
              key="phone"
              onNext={() => setStep(1)}
            />
          )}
          {step === 1 && (
            <TrialStep
              key="trial"
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <CalendarStep key="calendar" />
          )}
        </AnimatePresence>
      </div>

      {step === 0 && (
        <p className="text-center text-warm-white/25 text-xs mt-4">
          Already subscribed?{" "}
          <button
            onClick={() => setStep(2)}
            className="text-primary hover:underline"
          >
            Skip to calendar
          </button>
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SmsSetupPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <Link href="/" className="font-serif italic text-4xl text-primary mb-10">
        Kin
      </Link>
      <Suspense fallback={
        <div className="w-full max-w-sm flex items-center justify-center py-20">
          <Loader2 className="text-primary animate-spin" size={28} />
        </div>
      }>
        <SmsSetupInner />
      </Suspense>
    </main>
  );
}
