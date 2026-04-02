"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { UtensilsCrossed, Wallet, MessageCircle, Calendar, Sparkles, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const cards = [
  {
    href: "/meals",
    icon: UtensilsCrossed,
    label: "Today's Meals",
    desc: "View your meal picks and grocery list",
    iconBg: "bg-amber/20",
    iconColor: "text-amber",
    borderHover: "hover:border-amber/25",
    glowHover: "hover:shadow-amber/10",
  },
  {
    href: "/budget",
    icon: Wallet,
    label: "Budget Snapshot",
    desc: "Track spending across your household",
    iconBg: "bg-blue/20",
    iconColor: "text-blue",
    borderHover: "hover:border-blue/25",
    glowHover: "hover:shadow-blue/10",
  },
  {
    href: "/chat",
    icon: MessageCircle,
    label: "Ask Kin",
    desc: "Get help with anything — meals, budget, schedule",
    iconBg: "bg-primary/20",
    iconColor: "text-primary",
    borderHover: "hover:border-primary/25",
    glowHover: "hover:shadow-primary/10",
  },
  {
    href: "/calendar",
    icon: Calendar,
    label: "This Week",
    desc: "Calendar highlights will appear here",
    iconBg: "bg-purple/20",
    iconColor: "text-purple",
    borderHover: "hover:border-purple/25",
    glowHover: "hover:shadow-purple/10",
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

export default function DashboardPage() {
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    async function loadName() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

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
          // Use first name only
          setFirstName(member.name.split(" ")[0]);
          return;
        }

        // Fallback: profile display_name or email prefix
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single();

        if (profile?.display_name) {
          setFirstName(profile.display_name.split(" ")[0]);
        }
      } catch {
        // Non-fatal — greeting still shows without name
      }
    }
    loadName();
  }, []);

  const greeting = getGreeting();
  const greetingText = firstName ? `${greeting}, ${firstName}` : greeting;

  return (
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
        <h1 className="font-serif italic text-3xl text-primary mb-1.5 tracking-tight">
          {greetingText}
        </h1>
        <p className="text-warm-white/40 text-sm tracking-wide">
          Here&apos;s what&apos;s happening with your family today
        </p>
      </motion.div>

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
              <div className={`glass-strong rounded-2xl p-5 border border-warm-white/6 ${borderHover} hover:shadow-xl ${glowHover} hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl ${iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <Icon size={20} className={iconColor} />
                    </div>
                    <h3 className="text-warm-white font-semibold text-[15px] tracking-tight">{label}</h3>
                  </div>
                  <ArrowRight size={16} className="text-warm-white/0 group-hover:text-warm-white/25 transition-all duration-300 group-hover:translate-x-1" />
                </div>
                <p className="text-warm-white/35 text-sm pl-14 leading-relaxed">
                  {desc}
                </p>
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
          <span className="font-semibold text-primary">Tip:</span> Ask Kin to plan date night, suggest a quick dinner, or check if you&apos;re on budget this month.
        </p>
      </motion.div>
    </div>
  );
}
