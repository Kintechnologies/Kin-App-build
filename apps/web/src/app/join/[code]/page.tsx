import Link from "next/link";
import KinWordmark from "@/components/KinWordmark";
import { createClient } from "@/lib/supabase/server";
import { Sparkles, UtensilsCrossed, Wallet, Calendar, MessageCircle } from "lucide-react";

export default async function ReferralLandingPage({
  params,
}: {
  params: { code: string };
}) {
  const supabase = createClient();

  // Look up referrer by code
  const { data: referrer } = await supabase
    .from("profiles")
    .select("family_name")
    .eq("referral_code", params.code)
    .single();

  const referrerName = referrer?.family_name || "A Kin family";

  const features = [
    { icon: MessageCircle, label: "AI family assistant", desc: "Ask Kin anything about meals, budget, or scheduling" },
    { icon: UtensilsCrossed, label: "Smart meal planning", desc: "Personalized options with nutrition tracking" },
    { icon: Wallet, label: "50/30/20 budgeting", desc: "Track needs, wants, and savings effortlessly" },
    { icon: Calendar, label: "Family coordination", desc: "Calendars, date nights, Sunday briefings" },
  ];

  return (
    <main className="min-h-screen px-6 py-16 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-amber/5 blur-[100px] pointer-events-none" />

      <div className="max-w-lg mx-auto text-center relative">
        <Link href="/" style={{ textDecoration: "none", marginBottom: 32, display: "inline-block" }}>
          <KinWordmark size={24} tone="warm" />
        </Link>

        {/* Headline */}
        <h1 className="font-serif italic text-3xl md:text-4xl text-warm-white mb-3 leading-tight">
          {referrerName} thinks Kin will change your week.
        </h1>
        <p className="text-warm-white/50 text-lg mb-8">
          Your first month is on us.
        </p>

        {/* Value prop */}
        <div className="bg-surface-raised rounded-2xl p-6 border border-warm-white/5 text-left mb-6">
          <p className="text-warm-white/60 text-sm mb-6 leading-relaxed">
            Two working parents. Two jobs. Kids. And somehow one of you is still managing all of it in your head. Kin is the AI built for your family — meals, budget, calendar, and everything in between. Both parents, fully connected.
          </p>

          <div className="space-y-3">
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-warm-white text-sm font-medium">{label}</p>
                  <p className="text-warm-white/40 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Offer card */}
        <div className="bg-gradient-to-br from-amber/15 to-amber/5 rounded-2xl p-5 border border-amber/20 mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles size={16} className="text-amber" />
            <p className="text-amber font-semibold">
              Because {referrerName} referred you
            </p>
          </div>
          <p className="text-warm-white text-sm">
            Your first month is completely free. No charge until month 2.
          </p>
        </div>

        {/* CTA */}
        <Link
          href={`/signup?ref=${params.code}`}
          className="inline-flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-primary text-background font-semibold text-base hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all mb-4"
        >
          Claim your free month
        </Link>

        <p className="text-warm-white/20 text-xs">
          Credit card required. $39/month after free month. Cancel anytime.
        </p>

        {/* Footer */}
        <div className="flex justify-center gap-4 mt-8">
          <Link href="/privacy" className="text-warm-white/20 text-xs hover:text-warm-white/40 transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="text-warm-white/20 text-xs hover:text-warm-white/40 transition-colors">
            Terms
          </Link>
        </div>
      </div>
    </main>
  );
}
