"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import KinWordmark from "@/components/KinWordmark";
import { createClient } from "@/lib/supabase/client";

export default function PartnerOnboardingPage() {
  const router = useRouter();

  const [familyName, setFamilyName] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load the household's family name for the welcome headline
  useEffect(() => {
    async function loadFamilyName() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Partner's household_id points to the inviter's profile_id
        const { data: profile } = await supabase
          .from("profiles")
          .select("household_id")
          .eq("id", user.id)
          .single();

        if (!profile?.household_id) return;

        const { data: householdProfile } = await supabase
          .from("profiles")
          .select("family_name")
          .eq("id", profile.household_id)
          .single();

        if (householdProfile?.family_name) {
          setFamilyName(householdProfile.family_name);
        }
      } catch {
        // Non-fatal — headline still renders without a family name
      }
    }
    loadFamilyName();
  }, []);

  async function handleSubmit() {
    if (!name.trim() || loading) return;
    setLoading(true);
    setSaveError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { error } = await supabase.from("family_members").upsert(
        { profile_id: user.id, name: name.trim(), member_type: "adult" },
        { onConflict: "profile_id,member_type" }
      );

      if (error) throw error;
      router.push("/dashboard");
    } catch {
      setSaveError("Couldn't save your name — you can update this in Settings.");
      setLoading(false);
    }
  }

  const headlineFamilyName = familyName ? `the ${familyName} family` : "your household";

  return (
    <main className="min-h-screen px-6 py-16 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-amber/5 blur-[100px] pointer-events-none" />

      <div className="max-w-lg mx-auto relative">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" style={{ textDecoration: "none", display: "inline-block" }}>
            <KinWordmark size={24} tone="warm" />
          </Link>
        </div>

        <div className="flex flex-col items-center text-center gap-6">
          {/* Headline */}
          <div>
            <h1 className="font-serif italic text-3xl md:text-4xl text-warm-white mb-2 leading-tight">
              Welcome to {headlineFamilyName}.
            </h1>
            <p className="text-warm-white/50 text-base">
              What should Kin call you?
            </p>
          </div>

          {/* Card */}
          <div className="w-full bg-surface-raised rounded-2xl p-5 border border-warm-white/5 space-y-4">
            <input
              type="text"
              placeholder="First name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              className="w-full px-4 py-3.5 rounded-2xl bg-surface border border-warm-white/10 text-warm-white placeholder-warm-white/30 focus:outline-none focus:border-primary/50 transition-colors text-base"
              autoFocus
            />

            {saveError && (
              <p className="text-rose text-xs text-left">{saveError}</p>
            )}
          </div>

          {/* CTA */}
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || loading}
            className="w-full py-4 rounded-2xl bg-primary text-background font-semibold text-base flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            {loading ? "Saving…" : (<>Continue <ArrowRight size={18} /></>)}
          </button>

          <p className="text-warm-white/30 text-xs">
            You can update your preferences anytime in Settings.
          </p>
        </div>
      </div>
    </main>
  );
}
