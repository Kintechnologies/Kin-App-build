"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import KinWordmark from "@/components/KinWordmark";
import { motion } from "framer-motion";
import { CheckCircle2, MessageSquare, Calendar, Users, Loader2, AlertCircle } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/client";

type SaveState = "saving" | "success" | "error";

export default function OnboardingDonePage() {
  const [partnerPhone, setPartnerPhone] = useState<string | null>(null);
  const [briefingTime] = useState("6:00 AM");
  const [saveState, setSaveState] = useState<SaveState>("saving");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // P2-A3 (audit v6): when welcome SMS dispatch fails server-side, swap the
  // success copy from "first briefing tomorrow" to a "we couldn't text you"
  // notice so the user knows to expect no SMS until they retry / fix phone.
  const [welcomeSmsFailed, setWelcomeSmsFailed] = useState(false);
  // P1-D2 (audit v7): default to "failed" until the API call succeeds. A
  // network error used to land in the catch below and leave welcomeSmsFailed
  // = false, so the user saw the upbeat "first briefing tomorrow" copy even
  // though we never confirmed the welcome SMS went out.
  const [welcomeSmsConfirmed, setWelcomeSmsConfirmed] = useState(false);

  // Audit v5 P0-6: this UPDATE used to be fire-and-forget. If it failed
  // (network blip, RLS hiccup, schema drift), the user saw "All set" while
  // their DB row was still onboarding_completed=false — middleware bounced
  // them back to onboarding on next visit AND the briefing crons skipped them.
  // We now await the write, surface failures, and let the user retry.
  const completeOnboarding = useCallback(async () => {
    setSaveState("saving");
    setErrorMessage(null);
    setWelcomeSmsFailed(false);
    const supabase = createClient();
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("No authenticated user");

      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_step: 5, onboarding_completed: true })
        .eq("id", user.id);
      if (error) throw error;

      // Fire-and-await the welcome-SMS / partner-invite endpoint so we can
      // surface a failure to the user instead of leaving them confused
      // about why their phone never buzzed.
      //
      // P1-D2 (audit v7): a network error here used to land in the catch
      // below and leave the UI claiming "first briefing tomorrow" with no
      // confirmation. We now treat any non-success response (including a
      // thrown fetch) as "couldn't confirm" and show the third copy variant
      // so the user knows they may not have been texted.
      try {
        const resp = await fetch("/api/account/onboarding-complete", {
          method: "POST",
        });
        if (resp.ok) {
          const data = (await resp.json()) as {
            welcomeSmsSent?: boolean;
            welcomeSmsFailed?: boolean;
            partnerInvited?: boolean;
            partnerPhone?: string | null;
          };
          if (data.welcomeSmsFailed) setWelcomeSmsFailed(true);
          else if (data.welcomeSmsSent) setWelcomeSmsConfirmed(true);
          // P1-P4 (audit v7): the partner phone used to live in
          // sessionStorage where any same-origin script could read it.
          // The API now returns it (masked or full) so we never persist
          // a phone number in client-side storage.
          if (data.partnerPhone) setPartnerPhone(data.partnerPhone);
        } else {
          setWelcomeSmsFailed(true);
        }
      } catch (postErr) {
        Sentry.captureException(postErr);
        setWelcomeSmsFailed(true);
      }

      setSaveState("success");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Failed to mark onboarding complete:", message);
      Sentry.captureException(err);
      setErrorMessage(message);
      setSaveState("error");
    }
  }, []);

  // Mark onboarding complete. The partner phone for display arrives from the
  // server response (see completeOnboarding) — never from sessionStorage,
  // which any same-origin script (Sentry, Stripe.js, future analytics) can
  // read. (P1-P4 audit v7)
  useEffect(() => {
    void completeOnboarding();
  }, [completeOnboarding]);

  const nextSteps = [
    {
      icon: MessageSquare,
      color: "text-primary",
      bg: "bg-primary/15",
      title: `First briefing tomorrow at ${briefingTime}`,
      body: "Kin will text you and your partner every morning.",
    },
    {
      icon: Users,
      color: "text-blue",
      bg: "bg-blue/15",
      title: partnerPhone ? "Partner invite sent" : "Invite your partner",
      body: partnerPhone
        ? `We texted ${partnerPhone} with a link to join your household.`
        : "Share kinai.family with your partner so they get briefings too.",
    },
    {
      icon: Calendar,
      color: "text-amber",
      bg: "bg-amber/15",
      title: "Reply anytime",
      body: `Text back to Kin's number with questions like "Who has pickup today?" and Kin will answer.`,
    },
  ];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Subtle bg glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/6 blur-[180px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm text-center">
        {saveState === "saving" && (
          <>
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mb-5"
            >
              <Loader2 className="text-primary animate-spin" size={28} />
            </motion.div>
            <Link href="/" style={{ textDecoration: "none", marginBottom: 16, display: "block" }}>
              <KinWordmark size={24} tone="warm" />
            </Link>
            <h1 className="text-warm-white font-semibold text-2xl mb-2">
              Saving your setup…
            </h1>
            <p className="text-warm-white/50 text-sm">
              One more second — wrapping things up.
            </p>
          </>
        )}

        {saveState === "error" && (
          <>
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="w-16 h-16 rounded-full bg-amber/20 flex items-center justify-center mb-5"
            >
              <AlertCircle className="text-amber" size={28} />
            </motion.div>
            <Link href="/" style={{ textDecoration: "none", marginBottom: 16, display: "block" }}>
              <KinWordmark size={24} tone="warm" />
            </Link>
            <h1 className="text-warm-white font-semibold text-2xl mb-2">
              Couldn&apos;t finish setup
            </h1>
            <p className="text-warm-white/50 text-sm mb-6">
              We hit a snag saving the last step. Tap retry — if it keeps
              failing, refresh the page.
            </p>
            {errorMessage && (
              <p className="text-warm-white/30 text-xs mb-6">{errorMessage}</p>
            )}
            <button
              type="button"
              onClick={() => {
                void completeOnboarding();
              }}
              className="w-full glass border border-hairline py-3.5 rounded-xl text-warm-white text-sm font-medium hover:border-hairline transition-all"
            >
              Retry
            </button>
          </>
        )}

        {saveState === "success" && (
          <>
            {/* Check */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0.1 }}
              className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-5"
            >
              <CheckCircle2 className="text-primary" size={32} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Link href="/" style={{ textDecoration: "none", marginBottom: 16, display: "block" }}>
                <KinWordmark size={24} tone="warm" />
              </Link>

              <h1 className="text-warm-white font-semibold text-2xl mb-2">
                You&apos;re all set.
              </h1>
              {welcomeSmsFailed ? (
                <p className="text-warm-white/50 text-sm mb-8">
                  We couldn&apos;t send your welcome text — your first briefing
                  will still land tomorrow morning at 6am. If you don&apos;t get
                  it, double-check the phone number in Settings.
                </p>
              ) : welcomeSmsConfirmed ? (
                <p className="text-warm-white/50 text-sm mb-8">
                  Your first briefing lands tomorrow morning at 6am.
                </p>
              ) : (
                <p className="text-warm-white/50 text-sm mb-8">
                  We&apos;ll text you shortly to confirm setup. Your first
                  briefing lands tomorrow morning at 6am.
                </p>
              )}
            </motion.div>

            {/* Next steps */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="w-full space-y-3 mb-8"
            >
              {nextSteps.map((s, i) => (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.55 + i * 0.1 }}
                  className="glass rounded-2xl px-5 py-4 flex gap-4 items-start text-left"
                >
                  <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <s.icon className={s.color} size={17} />
                  </div>
                  <div>
                    <p className="text-warm-white font-medium text-sm">{s.title}</p>
                    <p className="text-warm-white/40 text-xs mt-0.5 leading-relaxed">{s.body}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="flex flex-col gap-3 w-full"
            >
              <Link
                href="/dashboard"
                className="w-full glass border border-hairline py-3.5 rounded-xl text-warm-white/70 text-sm font-medium hover:text-warm-white hover:border-hairline transition-all text-center"
              >
                Go to dashboard
              </Link>
            </motion.div>
          </>
        )}
      </div>
    </main>
  );
}
