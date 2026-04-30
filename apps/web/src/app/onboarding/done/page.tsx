"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import KinWordmark from "@/components/KinWordmark";
import { motion } from "framer-motion";
import { CheckCircle2, MessageSquare, Calendar, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingDonePage() {
  const [partnerPhone, setPartnerPhone] = useState<string | null>(null);
  const [briefingTime] = useState("6:00 AM");

  // Mark onboarding complete + retrieve partner phone for display
  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("profiles")
          .update({ onboarding_step: 5, onboarding_completed: true })
          .eq("id", user.id);
      }
    });

    const stored = sessionStorage.getItem("kin_partner_phone");
    if (stored) {
      setPartnerPhone(stored);
      sessionStorage.removeItem("kin_partner_phone");
    }
  }, []);

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
          <p className="text-warm-white/50 text-sm mb-8">
            Your first briefing lands tomorrow morning at 6am.
          </p>
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
            className="w-full glass border border-white/10 py-3.5 rounded-xl text-warm-white/70 text-sm font-medium hover:text-warm-white hover:border-white/20 transition-all text-center"
          >
            Go to dashboard
          </Link>
        </motion.div>
      </div>
    </main>
  );
}
