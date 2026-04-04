"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  UtensilsCrossed,
  Wallet,
  MessageCircle,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from "lucide-react";

// App subdomain URL — set NEXT_PUBLIC_APP_URL=https://app.kinai.family in Vercel env.
// Falls back to same-origin paths so local dev still works.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

const features = [
  { icon: UtensilsCrossed, label: "Meal Planning", color: "text-amber", bg: "bg-amber/15" },
  { icon: Wallet, label: "Smart Budget", color: "text-blue", bg: "bg-blue/15" },
  { icon: MessageCircle, label: "AI Assistant", color: "text-primary", bg: "bg-primary/15" },
  { icon: Calendar, label: "Family Calendar", color: "text-blue", bg: "bg-blue/15" },
];

type SubmitState = "idle" | "loading" | "success" | "error";

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
      setErrorMessage("Network error. Please check your connection and try again.");
      setSubmitState("error");
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Gradient mesh background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[15%] left-[20%] w-[400px] h-[400px] rounded-full bg-primary/8 blur-[150px] pulse-soft" />
        <div
          className="absolute top-[60%] right-[15%] w-[350px] h-[350px] rounded-full bg-blue/6 blur-[130px] pulse-soft"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute bottom-[20%] left-[40%] w-[300px] h-[300px] rounded-full bg-amber/5 blur-[120px] pulse-soft"
          style={{ animationDelay: "4s" }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        {/* Logo */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="font-serif italic text-7xl md:text-9xl text-primary mb-3"
        >
          Kin
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-warm-white/50 text-lg md:text-xl text-center max-w-md mb-4"
        >
          Your AI-powered family operating system
        </motion.p>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-warm-white/25 text-sm mb-10"
        >
          The mental load, handled.
        </motion.p>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-wrap justify-center gap-2 mb-10"
        >
          {features.map(({ icon: Icon, label, color }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.6 + i * 0.1 }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full glass ${color}`}
            >
              <Icon size={14} aria-hidden="true" />
              <span className="text-xs font-medium">{label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Waitlist form / success state */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="w-full"
        >
          <AnimatePresence mode="wait">
            {submitState === "success" ? (
              /* ── Success state ── */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center gap-3 glass rounded-2xl px-6 py-8 text-center"
                role="status"
                aria-live="polite"
              >
                <CheckCircle2 className="text-primary" size={36} aria-hidden="true" />
                <p className="text-warm-white font-semibold text-lg">
                  {alreadyOnList ? "You're already on the list!" : "You're on the list!"}
                </p>
                <p className="text-warm-white/40 text-sm max-w-xs">
                  {alreadyOnList
                    ? "We have your email. We'll send your beta invite as soon as a spot opens up."
                    : "We'll send your beta invite as soon as a spot opens up. Stay tuned."}
                </p>
                <Link
                  href="/pricing"
                  className="mt-2 text-warm-white/30 text-xs hover:text-warm-white/60 transition-colors"
                >
                  Preview pricing →
                </Link>
              </motion.div>
            ) : (
              /* ── Waitlist form ── */
              <motion.form
                key="form"
                onSubmit={handleJoinWaitlist}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-3"
                aria-label="Join the Kin waitlist"
                noValidate
              >
                <div className="flex gap-2">
                  <label htmlFor="waitlist-email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="waitlist-email"
                    type="email"
                    name="email"
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
                    aria-label="Join the waitlist"
                    className="bg-primary text-background px-6 py-4 rounded-2xl font-semibold hover:shadow-xl hover:shadow-primary/30 hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-60 disabled:scale-100 disabled:shadow-none flex items-center gap-2 shrink-0"
                  >
                    {submitState === "loading" ? (
                      <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <ArrowRight size={16} aria-hidden="true" />
                    )}
                    <span className="hidden sm:inline">
                      {submitState === "loading" ? "Joining…" : "Join Waitlist"}
                    </span>
                  </button>
                </div>

                {/* Inline error */}
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

                {/* Legal micro-copy */}
                <p className="text-warm-white/20 text-xs text-center">
                  No spam. Beta invites go out in waves — we&apos;ll email you when your spot is ready.
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Beta sign-in link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.0 }}
          className="mt-6 flex flex-col items-center gap-2"
        >
          <Link
            href={`${APP_URL}/signin`}
            className="text-warm-white/25 text-sm hover:text-warm-white/50 transition-colors"
          >
            Already have beta access? Sign in →
          </Link>
          <Link
            href="/pricing"
            className="text-warm-white/15 text-xs hover:text-warm-white/35 transition-colors"
          >
            Preview pricing
          </Link>
        </motion.div>
      </div>
    </main>
  );
}
