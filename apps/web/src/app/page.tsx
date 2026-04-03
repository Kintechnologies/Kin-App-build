"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { UtensilsCrossed, Wallet, MessageCircle, Calendar } from "lucide-react";

const features = [
  { icon: UtensilsCrossed, label: "Meal Planning", color: "text-amber", bg: "bg-amber/15" },
  { icon: Wallet, label: "Smart Budget", color: "text-blue", bg: "bg-blue/15" },
  { icon: MessageCircle, label: "AI Assistant", color: "text-primary", bg: "bg-primary/15" },
  { icon: Calendar, label: "Family Calendar", color: "text-blue", bg: "bg-blue/15" },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Gradient mesh background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[15%] left-[20%] w-[400px] h-[400px] rounded-full bg-primary/8 blur-[150px] pulse-soft" />
        <div className="absolute top-[60%] right-[15%] w-[350px] h-[350px] rounded-full bg-blue/6 blur-[130px] pulse-soft" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-[20%] left-[40%] w-[300px] h-[300px] rounded-full bg-amber/5 blur-[120px] pulse-soft" style={{ animationDelay: "4s" }} />
      </div>

      <div className="relative z-10 flex flex-col items-center">
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
              <Icon size={14} />
              <span className="text-xs font-medium">{label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="flex gap-4 mb-6"
        >
          <Link
            href="/signup"
            className="bg-primary text-background px-8 py-4 rounded-2xl font-semibold hover:shadow-xl hover:shadow-primary/30 hover:scale-105 active:scale-95 transition-all duration-300"
          >
            Get Started Free
          </Link>
          <Link
            href="/signin"
            className="glass text-warm-white px-8 py-4 rounded-2xl font-medium hover:bg-warm-white/10 hover:scale-105 active:scale-95 transition-all duration-300"
          >
            Sign In
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.0 }}
        >
          <Link
            href="/pricing"
            className="text-warm-white/25 text-sm hover:text-warm-white/50 transition-colors"
          >
            View pricing
          </Link>
        </motion.div>
      </div>
    </main>
  );
}
