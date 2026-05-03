"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import KinWordmark from "@/components/KinWordmark";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MessageSquare,
  MessageCircle,
  Calendar,
  Settings,
  Sparkles,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const cards = [
  {
    href: "/chat",
    icon: MessageCircle,
    label: "Ask Kin",
    desc: "Text or type a question — pickups, schedules, anything family coordination",
    iconBg: "bg-primary/20",
    iconColor: "text-primary",
    borderHover: "hover:border-primary/25",
    glowHover: "hover:shadow-primary/10",
  },
  {
    href: "/calendar",
    icon: Calendar,
    label: "This Week",
    desc: "Your calendar events — Kin reads these to build your 6am briefing",
    iconBg: "bg-blue/20",
    iconColor: "text-blue",
    borderHover: "hover:border-blue/25",
    glowHover: "hover:shadow-blue/10",
  },
  {
    href: "/chat",
    icon: MessageSquare,
    label: "6am Briefing",
    desc: "Kin texts you and your partner every morning with what's on the calendar",
    iconBg: "bg-amber/20",
    iconColor: "text-amber",
    borderHover: "hover:border-amber/25",
    glowHover: "hover:shadow-amber/10",
  },
  {
    href: "/settings",
    icon: Settings,
    label: "Settings",
    desc: "Manage your phone number, calendar connections, and subscription",
    iconBg: "bg-blue/20",
    iconColor: "text-blue",
    borderHover: "hover:border-blue/25",
    glowHover: "hover:shadow-blue/10",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Format trial end date — today + 7 days, or use the provided timestamp. */
function formatTrialEnd(trialEndMs?: number | null): string {
  const d = trialEndMs ? new Date(trialEndMs * 1000) : (() => {
    const now = new Date();
    now.setDate(now.getDate() + 7);
    return now;
  })();
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const WELCOME_CHECKLIST = [
  "Your 6am briefings start tomorrow",
  "Both calendars synced",
  "Text Kin anytime with questions",
];

// ── Welcome Modal ─────────────────────────────────────────────────────────────

interface WelcomeModalProps {
  firstName: string | null;
  trialEnd: string;
  onDismiss: () => void;
}

function WelcomeModal({ firstName, trialEnd, onDismiss }: WelcomeModalProps) {
  // ESC key closes modal
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-heading"
    >
      {/* Backdrop — intentionally non-dismissible per spec */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      {/* Modal card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative w-full max-w-md bg-surface rounded-3xl p-8 border border-warm-white/8 shadow-2xl overflow-hidden"
      >
        {/* Ambient glow behind the icon */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

        {/* Logo mark */}
        <div className="relative flex flex-col items-center text-center gap-6">
          <KinWordmark size={40} tone="sage" />

          {/* Headline */}
          <div>
            <h2
              id="welcome-heading"
              className="text-4xl font-medium text-warm-white leading-tight mb-2"
              style={{ letterSpacing: "-0.03em" }}
            >
              You&apos;re in
              {firstName ? `, ${firstName}` : ""}.
            </h2>
            <p className="text-lg text-warm-white/60">
              Your 6am briefing starts tomorrow.
            </p>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-warm-white/8" />

          {/* Checklist */}
          <ul className="w-full space-y-3 text-left">
            {WELCOME_CHECKLIST.map((line) => (
              <li key={line} className="flex items-center gap-3">
                <CheckCircle size={18} className="text-primary shrink-0" />
                <span className="text-warm-white/80 text-sm">{line}</span>
              </li>
            ))}
          </ul>

          {/* Divider */}
          <div className="w-full h-px bg-warm-white/8" />

          {/* CTA */}
          <button
            onClick={onDismiss}
            className="w-full py-4 rounded-2xl bg-primary text-background font-semibold text-base hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
            autoFocus
          >
            Go to my dashboard
          </button>

          {/* Trial footer */}
          <p className="font-mono text-xs text-warm-white/30 tracking-wide">
            7-day trial active &mdash; you won&apos;t be charged until{" "}
            <span className="text-warm-white/50">{trialEnd}</span>. Cancel anytime.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ── Dashboard Page ────────────────────────────────────────────────────────────

interface SetupStatus {
  hasCalendar: boolean;
  hasPartner: boolean;
  upcomingCount: number;
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [firstName, setFirstName] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [trialEnd, setTrialEnd] = useState(() => formatTrialEnd(null));
  const [setup, setSetup] = useState<SetupStatus | null>(null);

  // Show welcome modal when ?subscribed=true is present
  useEffect(() => {
    if (searchParams.get("subscribed") === "true") {
      setShowWelcome(true);
    }
  }, [searchParams]);

  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
    // Remove ?subscribed=true from URL so modal doesn't re-appear on refresh
    const params = new URLSearchParams(searchParams.toString());
    params.delete("subscribed");
    const next = params.size > 0 ? `?${params.toString()}` : "";
    router.replace(`/dashboard${next}`);
  }, [router, searchParams]);

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Load profile for trial date + display name fallback
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, trial_ends_at, household_id")
          .eq("id", user.id)
          .single();

        // Use real Stripe trial_ends_at if available; otherwise keep today+7d fallback
        if (profile?.trial_ends_at) {
          const trialMs = new Date(profile.trial_ends_at).getTime() / 1000;
          setTrialEnd(formatTrialEnd(trialMs));
        }

        // Try family_members first (adult member with this profile_id)
        const { data: member } = await supabase
          .from("family_members")
          .select("name")
          .eq("profile_id", user.id)
          .eq("member_type", "adult")
          .order("created_at", { ascending: true })
          .limit(1)
          .single();

        if (member?.name) {
          setFirstName(member.name.split(" ")[0]);
        } else if (profile?.display_name) {
          setFirstName(profile.display_name.split(" ")[0]);
        }

        // ── Setup status: per-user, RLS-scoped queries ────────────────────
        const today = new Date().toISOString();
        const [
          { count: connCount },
          { count: eventCount },
          { data: partner },
        ] = await Promise.all([
          supabase
            .from("calendar_connections")
            .select("id", { count: "exact", head: true })
            .eq("profile_id", user.id),
          supabase
            .from("calendar_events")
            .select("id", { count: "exact", head: true })
            .eq("profile_id", user.id)
            .gte("start_time", today)
            .is("deleted_at", null),
          supabase
            .from("profiles")
            .select("id")
            .eq("household_id", profile?.household_id ?? user.id)
            .neq("id", user.id)
            .limit(1)
            .maybeSingle(),
        ]);

        setSetup({
          hasCalendar: (connCount ?? 0) > 0,
          hasPartner: !!partner || !!profile?.household_id,
          upcomingCount: eventCount ?? 0,
        });
      } catch {
        // Non-fatal — greeting and trial date still show with fallback values
        setSetup({ hasCalendar: false, hasPartner: false, upcomingCount: 0 });
      }
    }
    loadProfile();
  }, []);

  const greeting = getGreeting();
  const greetingText = firstName ? `${greeting}, ${firstName}` : greeting;

  return (
    <>
      {/* Post-checkout welcome modal */}
      <AnimatePresence>
        {showWelcome && (
          <WelcomeModal
            firstName={firstName}
            trialEnd={trialEnd}
            onDismiss={dismissWelcome}
          />
        )}
      </AnimatePresence>

      <div className="relative">
        {/* Ambient glow */}
        <div className="absolute -top-20 -right-20 w-[300px] h-[300px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-medium text-primary mb-1.5" style={{ letterSpacing: "-0.025em" }}>
            {greetingText}
          </h1>
          <p className="text-warm-white/40 text-sm tracking-wide">
            Here&apos;s what&apos;s happening with your family today
          </p>
        </motion.div>

        {/* Setup banner — shown until the user has a calendar connected */}
        {setup && !setup.hasCalendar && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-6 glass-strong rounded-2xl p-5 border border-primary/20 bg-primary/[0.04]"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
                <Calendar size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-warm-white font-semibold text-sm mb-1">
                  Let&apos;s get your briefing set up
                </p>
                <p className="text-warm-white/55 text-sm leading-relaxed mb-3">
                  Connect a calendar so Kin can read your day. Read-only — no posting, no email access.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/settings"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-background text-xs font-semibold hover:shadow-md hover:shadow-primary/20 transition-all"
                  >
                    Connect calendar
                    <ArrowRight size={12} />
                  </Link>
                  {!setup.hasPartner && (
                    <Link
                      href="/settings"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface text-warm-white/60 text-xs font-medium border border-warm-white/10 hover:border-warm-white/25 transition-all"
                    >
                      Invite your partner
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Cards */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {cards.map(({ href, icon: Icon, label, desc, iconBg, iconColor, borderHover, glowHover }) => (
            <motion.div key={href} variants={item}>
              <Link href={href} className="block group">
                <div
                  className={`glass-strong rounded-2xl p-5 border border-warm-white/6 ${borderHover} hover:shadow-xl ${glowHover} hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-2xl ${iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                      >
                        <Icon size={20} className={iconColor} aria-hidden="true" />
                      </div>
                      <h3 className="text-warm-white font-semibold text-[15px] tracking-tight">
                        {label}
                      </h3>
                    </div>
                    <ArrowRight
                      size={16}
                      aria-hidden="true"
                      className="text-warm-white/0 group-hover:text-warm-white/25 transition-all duration-300 group-hover:translate-x-1"
                    />
                  </div>
                  <p className="text-warm-white/35 text-sm pl-14 leading-relaxed">{desc}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick tip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-6 glass rounded-2xl p-4 flex items-start gap-3"
        >
          <Sparkles size={16} className="text-primary mt-0.5 shrink-0 shimmer" />
          <p className="text-warm-white/50 text-sm leading-relaxed">
            <span className="font-semibold text-primary">Tip:</span> Text Kin&apos;s number directly with questions like &ldquo;Who has pickup today?&rdquo; or &ldquo;What&apos;s on the calendar this week?&rdquo;
          </p>
        </motion.div>
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
