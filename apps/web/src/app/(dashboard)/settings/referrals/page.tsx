"use client";

import { useState, useEffect } from "react";
import { Gift, Copy, Check, Share2, MessageCircle, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ReferralData {
  referralCode: string;
  chargeCount: number;
  referrals: { status: string; created_at: string }[];
  freeMonthsEarned: number;
  creditsEarned: number;
}

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("referral_code, subscription_charge_count")
        .eq("id", user.id)
        .single();

      const { data: referrals } = await supabase
        .from("referrals")
        .select("status, created_at")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });

      const { data: rewards } = await supabase
        .from("referral_rewards")
        .select("reward_type, amount")
        .eq("profile_id", user.id);

      const freeMonths = (rewards || []).filter((r) => r.reward_type === "free_month").length;
      const credits = (rewards || []).filter((r) => r.reward_type === "credit").reduce((sum, r) => sum + Number(r.amount), 0);

      setData({
        referralCode: profile?.referral_code || "",
        chargeCount: profile?.subscription_charge_count || 0,
        referrals: (referrals || []) as { status: string; created_at: string }[],
        freeMonthsEarned: freeMonths,
        creditsEarned: credits,
      });
      setLoading(false);
    }
    load();
  }, []);

  const referralLink = data?.referralCode
    ? `kinai.family/join/${data.referralCode}`
    : "";

  const isUnlocked = (data?.chargeCount || 0) >= 2;
  const maxFreeMonths = 3;

  function copyLink() {
    navigator.clipboard.writeText(`https://${referralLink}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareLink() {
    const shareText = `Hey — we've been using this app called Kin for our family and it's genuinely been a game changer. It plans our meals for the week, builds the grocery list, and actually keeps us organized.\n\nThey gave me a link to share — you get your first month completely free. Worth trying if you're dealing with the same chaos we were.\n\nhttps://${referralLink}`;

    if (navigator.share) {
      await navigator.share({ text: shareText });
    } else {
      copyLink();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2.5 h-2.5 rounded-full bg-primary/30 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-2xl bg-amber/20 flex items-center justify-center">
            <Gift size={16} className="text-amber" />
          </div>
          <h1 className="font-serif italic text-2xl text-primary">Refer a Family</h1>
        </div>
        <p className="text-warm-white/40 text-sm mb-8 ml-10">Share Kin. Earn free months.</p>

        <div className="bg-gradient-to-br from-surface-raised to-background rounded-2xl p-8 text-center border border-warm-white/5">
          <div className="w-14 h-14 rounded-3xl bg-amber/10 flex items-center justify-center mx-auto mb-4">
            <Lock size={24} className="text-amber/40" />
          </div>
          <h2 className="text-warm-white font-semibold mb-2">Referrals unlock after your second month</h2>
          <p className="text-warm-white/40 text-sm max-w-xs mx-auto mb-4">
            Once you&apos;ve been with Kin for a full billing cycle, you&apos;ll get your personal referral link. Share it with families who need this — they get their first month free, you get a free month when they subscribe.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber/10 text-amber text-sm font-medium">
            <span>{data?.chargeCount || 0} of 2 payments completed</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-2xl bg-amber/20 flex items-center justify-center">
          <Gift size={16} className="text-amber" />
        </div>
        <h1 className="font-serif italic text-2xl text-primary">Refer a Family</h1>
      </div>
      <p className="text-warm-white/40 text-sm mb-8 ml-10">Share Kin. Earn free months.</p>

      {/* Reward progress */}
      <div className="bg-gradient-to-br from-amber/15 to-amber/5 rounded-2xl p-5 mb-6 border border-amber/10">
        <div className="flex items-center justify-between mb-3">
          <p className="text-warm-white font-semibold text-sm">
            {data!.freeMonthsEarned < maxFreeMonths
              ? `${data!.freeMonthsEarned} of ${maxFreeMonths} free months earned`
              : "Free months maxed out!"}
          </p>
          {data!.creditsEarned > 0 && (
            <span className="text-primary font-mono text-sm font-semibold">
              +${data!.creditsEarned} credits
            </span>
          )}
        </div>
        {/* Progress bar */}
        <div className="w-full rounded-full h-3 border border-amber/30 bg-background/30 overflow-hidden mb-2">
          <div
            className="h-full rounded-full bg-amber transition-all duration-700"
            style={{ width: `${Math.min((data!.freeMonthsEarned / maxFreeMonths) * 100, 100)}%` }}
          />
        </div>
        <p className="text-warm-white/30 text-xs">
          {data!.freeMonthsEarned >= maxFreeMonths
            ? "Every referral now earns $15 in account credit"
            : `${maxFreeMonths - data!.freeMonthsEarned} more to go`}
        </p>
      </div>

      {/* Share link */}
      <div className="bg-surface-raised rounded-2xl p-5 mb-6 border border-warm-white/5">
        <p className="text-warm-white/50 text-xs mb-3">Your referral link</p>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 bg-background/50 rounded-xl px-4 py-3 text-primary font-mono text-sm border border-warm-white/10 truncate">
            {referralLink}
          </div>
          <button
            onClick={copyLink}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
              copied
                ? "bg-primary text-background"
                : "bg-warm-white/5 text-warm-white/40 hover:text-warm-white/70 hover:bg-warm-white/10"
            }`}
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={shareLink}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-background font-semibold text-sm hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Share2 size={16} /> Share with a Family
          </button>
          <button
            onClick={() => {
              const smsText = encodeURIComponent(`Hey — we've been using Kin for our family and it's a game changer. You get your first month free: https://${referralLink}`);
              window.open(`sms:?body=${smsText}`);
            }}
            className="w-11 h-11 rounded-xl bg-blue/15 text-blue flex items-center justify-center hover:bg-blue/25 transition-all"
            title="Send via text"
          >
            <MessageCircle size={18} />
          </button>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-surface-raised rounded-2xl p-5 mb-6 border border-warm-white/5">
        <h3 className="text-warm-white font-semibold text-sm mb-4">How it works</h3>
        <div className="space-y-4">
          {[
            { step: "1", text: "Share your link with a family" },
            { step: "2", text: "They get their first month completely free" },
            { step: "3", text: "When they subscribe, you get a free month" },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <span className="text-primary text-xs font-bold">{step}</span>
              </div>
              <p className="text-warm-white/60 text-sm">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Referral history */}
      {data!.referrals.length > 0 && (
        <div>
          <h3 className="text-warm-white font-semibold text-sm mb-3">Referral History</h3>
          <div className="space-y-2">
            {data!.referrals.map((ref, i) => (
              <div key={i} className="flex items-center justify-between rounded-2xl px-4 py-3 bg-surface-raised border border-warm-white/5">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    ref.status === "rewarded" ? "bg-primary" :
                    ref.status === "paid" ? "bg-amber" :
                    ref.status === "trial" ? "bg-blue" : "bg-warm-white/20"
                  }`} />
                  <span className="text-warm-white/60 text-sm">
                    {new Date(ref.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  ref.status === "rewarded" ? "bg-primary/15 text-primary" :
                  ref.status === "paid" ? "bg-amber/15 text-amber" :
                  ref.status === "trial" ? "bg-blue/15 text-blue" : "bg-warm-white/10 text-warm-white/40"
                }`}>
                  {ref.status === "rewarded" ? "Free month earned" :
                   ref.status === "paid" ? "Subscribed" :
                   ref.status === "trial" ? "In trial" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-warm-white/20 text-xs mt-6 text-center">
        Referred family must complete first paid month for reward to unlock.
        Max 3 free months, then $15 credit per referral.{" "}
        <a href="/terms" className="text-warm-white/30 hover:text-warm-white/50">Terms apply</a>
      </p>
    </div>
  );
}
