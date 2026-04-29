"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";

type SubmitState = "idle" | "loading" | "success" | "error";

// ─── SMS Demo ─────────────────────────────────────────────────────────────────

function SmsDemo() {
  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Phone shell */}
      <div className="relative bg-[#1a1a1a] rounded-[2.5rem] p-[3px] shadow-2xl shadow-black/60 ring-1 ring-white/10">
        {/* Screen */}
        <div className="bg-[#0c0c0c] rounded-[2.3rem] overflow-hidden">
          {/* Status bar */}
          <div className="flex items-center justify-between px-7 pt-4 pb-1">
            <span className="text-white text-xs font-semibold">6:02</span>
            <div className="w-20 h-4 bg-black rounded-full" />
            <div className="flex gap-1 items-center">
              <div className="w-3 h-1.5 rounded-sm bg-white/70" />
              <div className="w-0.5 h-1 rounded-sm bg-white/40" />
            </div>
          </div>

          {/* Message header */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="font-serif italic text-primary text-sm font-bold">K</span>
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Kin</p>
              <p className="text-white/40 text-xs">Family AI</p>
            </div>
          </div>

          {/* Messages */}
          <div className="px-4 py-4 space-y-3 min-h-[260px]">
            {/* Kin message */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex gap-2 items-end"
            >
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mb-0.5">
                <span className="font-serif italic text-primary text-xs">K</span>
              </div>
              <div className="bg-[#1e2a1e] rounded-2xl rounded-bl-sm px-3.5 py-2.5 max-w-[80%]">
                <p className="text-white/90 text-[13px] leading-relaxed">
                  Jontae&apos;s 5pm standup typically runs late. Daycare closes
                  at 5:45 — pickup is yours today. Jackson&apos;s 2-year
                  checkup moved to this afternoon at 4pm (12 min from daycare).
                  You&apos;re clear after 3:30.
                </p>
              </div>
            </motion.div>

            {/* User reply */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.5 }}
              className="flex justify-end"
            >
              <div className="bg-[#2a5c2a] rounded-2xl rounded-br-sm px-3.5 py-2.5 max-w-[75%]">
                <p className="text-white/90 text-[13px] leading-relaxed">
                  Can she still do pickup if her meeting ends on time?
                </p>
              </div>
            </motion.div>

            {/* Kin follow-up */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.7, duration: 0.5 }}
              className="flex gap-2 items-end"
            >
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mb-0.5">
                <span className="font-serif italic text-primary text-xs">K</span>
              </div>
              <div className="bg-[#1e2a1e] rounded-2xl rounded-bl-sm px-3.5 py-2.5 max-w-[80%]">
                <p className="text-white/90 text-[13px] leading-relaxed">
                  I&apos;ll keep an eye on her 5pm and text you by 4:30. If it
                  looks like it&apos;s running over, pickup is yours.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Input bar mock */}
          <div className="px-4 pb-6 pt-2 flex items-center gap-2 border-t border-white/5">
            <div className="flex-1 bg-white/5 rounded-full px-4 py-2">
              <p className="text-white/20 text-[13px]">Message</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <ArrowRight size={14} className="text-primary" />
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-warm-white/25 text-xs mt-4">
        Every morning. Both parents. One text.
      </p>
    </div>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────

const steps = [
  {
    n: "1",
    title: "Connect both calendars",
    body: "Each parent links their Google Calendar. Kin watches both.",
  },
  {
    n: "2",
    title: "Kin reads the day",
    body: "Every night, Kin scans for conflicts, tight pickups, and decisions you'll need to make.",
  },
  {
    n: "3",
    title: "6am text to both parents",
    body: "One SMS. No app to open. Reply anytime — Kin knows your whole family's schedule.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [email, setEmail] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [alreadyOnList, setAlreadyOnList] = useState(false);

  async function handleJoinWaitlist(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || submitState === "loading") return;

    setSubmitState("loading");
    setErrorMessage("");
    setAlreadyOnList(false);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        existing?: boolean;
        error?: string;
      };

      if (res.ok && data.success) {
        setAlreadyOnList(data.existing === true);
        setSubmitState("success");
      } else {
        setErrorMessage(data.error ?? "Something went wrong. Please try again.");
        setSubmitState("error");
      }
    } catch {
      setErrorMessage("Network error. Please try again.");
      setSubmitState("error");
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-6 pb-20 relative overflow-hidden">
      {/* Gradient mesh */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-[10%] left-[15%] w-[500px] h-[500px] rounded-full bg-primary/7 blur-[180px] pulse-soft" />
        <div
          className="absolute top-[55%] right-[10%] w-[400px] h-[400px] rounded-full bg-blue/5 blur-[150px] pulse-soft"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute bottom-[15%] left-[35%] w-[350px] h-[350px] rounded-full bg-amber/4 blur-[140px] pulse-soft"
          style={{ animationDelay: "4s" }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-md">

        {/* ── Hero ── */}
        <div className="flex flex-col items-center pt-20 pb-12 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="font-serif italic text-7xl md:text-9xl text-primary mb-6"
          >
            Kin
          </motion.h1>

          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-warm-white text-2xl md:text-3xl font-semibold leading-tight mb-4 max-w-sm"
          >
            Every morning at 6am, both parents know what the day looks like.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-warm-white/50 text-base mb-10"
          >
            One text. Two calendars. No app to open.
          </motion.p>

          {/* Waitlist form */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="w-full"
          >
            <AnimatePresence mode="wait">
              {submitState === "success" ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-3 glass rounded-2xl px-6 py-8 text-center"
                  role="status"
                >
                  <CheckCircle2 className="text-primary" size={32} />
                  <p className="text-warm-white font-semibold">
                    {alreadyOnList ? "You're already on the list!" : "You're on the list."}
                  </p>
                  <p className="text-warm-white/40 text-sm max-w-xs">
                    We&apos;re personally onboarding each beta family. We&apos;ll be in touch soon.
                  </p>
                  <Link href="/signup" className="mt-2 text-primary text-sm hover:underline">
                    Ready to start? Create your account →
                  </Link>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={handleJoinWaitlist}
                  className="flex flex-col gap-3"
                  noValidate
                >
                  <div className="flex gap-2">
                    <label htmlFor="waitlist-email" className="sr-only">
                      Email address
                    </label>
                    <input
                      id="waitlist-email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (submitState === "error") setSubmitState("idle");
                      }}
                      placeholder="your@email.com"
                      required
                      autoComplete="email"
                      className="flex-1 glass rounded-2xl px-5 py-4 text-warm-white placeholder:text-warm-white/25 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={submitState === "loading"}
                      className="bg-primary text-background px-6 py-4 rounded-2xl font-semibold hover:shadow-xl hover:shadow-primary/30 hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-60 disabled:scale-100 flex items-center gap-2 shrink-0"
                    >
                      {submitState === "loading" ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <ArrowRight size={16} />
                      )}
                      <span className="hidden sm:inline">
                        {submitState === "loading" ? "Joining…" : "Join Waitlist"}
                      </span>
                    </button>
                  </div>

                  {submitState === "error" && errorMessage && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-rose/80 text-sm text-center"
                      role="alert"
                    >
                      {errorMessage}
                    </motion.p>
                  )}

                  <p className="text-warm-white/20 text-xs text-center">
                    $39/mo for your entire family — 7-day free trial, cancel anytime.
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mt-5 flex gap-4 text-sm"
          >
            <Link href="/signup" className="text-primary hover:underline">
              Start free trial →
            </Link>
            <Link href="/signin" className="text-warm-white/30 hover:text-warm-white/60 transition-colors">
              Sign in
            </Link>
          </motion.div>
        </div>

        {/* ── SMS Demo ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7 }}
          className="w-full mb-16"
        >
          <SmsDemo />
        </motion.div>

        {/* ── Founder note ── */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass rounded-2xl px-6 py-5 mb-12 text-center"
        >
          <p className="text-warm-white/70 text-sm leading-relaxed">
            &ldquo;We don&apos;t know who&apos;s picking up our son from daycare until last minute.&rdquo;
          </p>
          <p className="text-warm-white/35 text-xs mt-2">
            — Austin, Kin founder & parent of a 2-year-old
          </p>
        </motion.div>

        {/* ── How it works ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="w-full mb-14"
        >
          <h3 className="text-warm-white/40 text-xs font-semibold uppercase tracking-widest text-center mb-6">
            How it works
          </h3>
          <div className="space-y-3">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="glass rounded-2xl px-5 py-4 flex gap-4 items-start"
              >
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-primary text-xs font-bold">{s.n}</span>
                </div>
                <div>
                  <p className="text-warm-white font-medium text-sm">{s.title}</p>
                  <p className="text-warm-white/45 text-xs mt-0.5 leading-relaxed">{s.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Pricing CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="w-full glass rounded-2xl px-6 py-7 flex flex-col items-center text-center gap-3"
        >
          <p className="text-warm-white font-semibold text-lg">
            $39<span className="text-warm-white/40 font-normal text-base">/mo</span>
          </p>
          <p className="text-warm-white/50 text-sm">
            For your entire family. 7-day free trial. Cancel anytime.
          </p>
          <p className="text-warm-white/30 text-xs">
            We&apos;re personally onboarding each beta family — space is limited.
          </p>
          <Link
            href="/signup"
            className="mt-1 w-full bg-primary text-background py-4 rounded-2xl font-semibold text-center hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2"
          >
            Start your free trial
            <ArrowRight size={16} />
          </Link>
        </motion.div>

        {/* ── Footer ── */}
        <div className="mt-10 flex gap-5 text-warm-white/20 text-xs">
          <Link href="/privacy" className="hover:text-warm-white/40 transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-warm-white/40 transition-colors">Terms</Link>
          <Link href="/pricing" className="hover:text-warm-white/40 transition-colors">Pricing</Link>
        </div>
      </div>
    </main>
  );
}
