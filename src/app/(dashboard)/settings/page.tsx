"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import { Settings as SettingsIcon, Crown, Sparkles, LogOut, User, CreditCard, Gift } from "lucide-react";

interface Profile {
  email: string;
  family_name: string | null;
  subscription_tier: string;
  trial_ends_at: string | null;
}

const tierLabels: Record<string, { label: string; color: string; bg: string }> = {
  free: { label: "Free Trial", color: "text-warm-white/60", bg: "bg-warm-white/10" },
  starter: { label: "Starter", color: "text-primary", bg: "bg-primary/15" },
  family: { label: "Family", color: "text-amber", bg: "bg-amber/15" },
};

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("email, family_name, subscription_tier, trial_ends_at")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data as Profile);
    }
    load();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/signin");
  }

  const tier = tierLabels[profile?.subscription_tier || "free"];
  const trialActive = profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date();
  const trialDaysLeft = trialActive
    ? Math.ceil((new Date(profile.trial_ends_at!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-2xl bg-warm-white/10 flex items-center justify-center">
          <SettingsIcon size={16} className="text-warm-white/60" />
        </div>
        <h1 className="font-serif italic text-2xl text-primary">Settings</h1>
      </div>
      <p className="text-warm-white/40 text-sm mb-8 ml-10">
        Manage your profile and subscription
      </p>

      <div className="space-y-4">
        {/* Profile card */}
        <div className="bg-gradient-to-br from-surface-raised to-background rounded-2xl p-5 border border-warm-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center">
              <User size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-warm-white font-semibold text-sm">
                {profile?.family_name || "Your Family"}
              </p>
              <p className="text-warm-white/30 text-xs">{profile?.email}</p>
            </div>
          </div>
        </div>

        {/* Subscription card */}
        <div className="bg-gradient-to-br from-surface-raised to-background rounded-2xl p-5 border border-warm-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-11 h-11 rounded-2xl ${tier.bg} flex items-center justify-center`}>
              {profile?.subscription_tier === "family" ? (
                <Crown size={20} className={tier.color} />
              ) : (
                <Sparkles size={20} className={tier.color} />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className={`font-semibold text-sm ${tier.color}`}>{tier.label}</p>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${tier.bg} ${tier.color}`}>
                  {profile?.subscription_tier === "free" ? "Trial" : "Active"}
                </span>
              </div>
              {trialActive && (
                <p className="text-warm-white/30 text-xs">
                  {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} left in trial
                </p>
              )}
            </div>
          </div>

          {profile?.subscription_tier === "free" ? (
            <Link
              href="/pricing"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-primary text-background font-semibold text-sm hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <CreditCard size={16} /> Upgrade Plan
            </Link>
          ) : (
            <div className="flex gap-2">
              <Link
                href="/pricing"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-surface text-warm-white/60 font-medium text-sm border border-warm-white/10 hover:border-warm-white/20 transition-all"
              >
                Change Plan
              </Link>
              <button
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-surface text-warm-white/40 font-medium text-sm border border-warm-white/10 hover:border-rose/30 hover:text-rose transition-all"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Referral card */}
        <Link
          href="/settings/referrals"
          className="block bg-gradient-to-br from-amber/10 to-surface-raised rounded-2xl p-5 border border-amber/10 hover:border-amber/20 transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber/20 flex items-center justify-center">
              <Gift size={20} className="text-amber" />
            </div>
            <div className="flex-1">
              <p className="text-amber font-semibold text-sm">Refer a Family</p>
              <p className="text-warm-white/30 text-xs">Share Kin, earn free months</p>
            </div>
            <span className="text-warm-white/20 text-lg">→</span>
          </div>
        </Link>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-surface-raised text-warm-white/40 font-medium text-sm hover:text-rose hover:bg-rose/10 border border-warm-white/5 hover:border-rose/20 transition-all"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
}
