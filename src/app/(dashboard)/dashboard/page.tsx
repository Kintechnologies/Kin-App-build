import { UtensilsCrossed, Wallet, MessageCircle, Calendar, Sparkles } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif italic text-3xl text-primary mb-1">
          Good morning
        </h1>
        <p className="text-warm-white/50 text-sm">
          Here&apos;s what&apos;s happening with your family today
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Meals card */}
        <Link href="/meals" className="block group">
          <div className="bg-gradient-to-br from-amber/15 via-surface-raised to-surface-raised rounded-2xl p-5 hover:scale-[1.02] hover:shadow-lg hover:shadow-amber/10 transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber/20 flex items-center justify-center">
                <UtensilsCrossed size={18} className="text-amber" />
              </div>
              <h3 className="text-warm-white font-semibold text-sm">
                Today&apos;s Meals
              </h3>
            </div>
            <p className="text-warm-white/40 text-sm">
              View your meal picks and grocery list
            </p>
          </div>
        </Link>

        {/* Budget card */}
        <Link href="/budget" className="block group">
          <div className="bg-gradient-to-br from-blue/15 via-surface-raised to-surface-raised rounded-2xl p-5 hover:scale-[1.02] hover:shadow-lg hover:shadow-blue/10 transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-blue/20 flex items-center justify-center">
                <Wallet size={18} className="text-blue" />
              </div>
              <h3 className="text-warm-white font-semibold text-sm">
                Budget Snapshot
              </h3>
            </div>
            <p className="text-warm-white/40 text-sm">
              Track spending across your household
            </p>
          </div>
        </Link>

        {/* Chat card */}
        <Link href="/chat" className="block group">
          <div className="bg-gradient-to-br from-primary/15 via-surface-raised to-surface-raised rounded-2xl p-5 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
                <MessageCircle size={18} className="text-primary" />
              </div>
              <h3 className="text-warm-white font-semibold text-sm">
                Ask Kin
              </h3>
            </div>
            <p className="text-warm-white/40 text-sm">
              Get help with anything — meals, budget, schedule
            </p>
          </div>
        </Link>

        {/* Week card */}
        <div className="bg-gradient-to-br from-purple/15 via-surface-raised to-surface-raised rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-purple/20 flex items-center justify-center">
              <Calendar size={18} className="text-purple" />
            </div>
            <h3 className="text-warm-white font-semibold text-sm">
              This Week
            </h3>
          </div>
          <p className="text-warm-white/40 text-sm">
            Calendar highlights will appear here
          </p>
        </div>
      </div>

      {/* Quick tip */}
      <div className="mt-6 bg-gradient-to-r from-primary/10 to-transparent rounded-2xl p-4 flex items-start gap-3">
        <Sparkles size={16} className="text-primary mt-0.5 shrink-0 shimmer" />
        <div>
          <p className="text-warm-white/70 text-sm">
            <span className="font-semibold text-primary">Tip:</span> Ask Kin to plan date night, suggest a quick dinner, or check if you&apos;re on budget this month.
          </p>
        </div>
      </div>
    </div>
  );
}
