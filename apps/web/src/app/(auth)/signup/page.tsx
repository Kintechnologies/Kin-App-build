"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, Loader2 } from "lucide-react";

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("invite");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();

    const callbackUrl = inviteCode
      ? `${window.location.origin}/auth/callback?invite=${inviteCode}`
      : `${window.location.origin}/auth/callback`;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: callbackUrl },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (inviteCode && authData.session) {
      try {
        const res = await fetch(`/api/invite/${inviteCode}/accept`, { method: "POST" });
        if (res.ok) {
          router.push("/onboarding/sms-setup");
          return;
        }
      } catch {
        // non-fatal
      }
    }

    router.push("/onboarding/sms-setup");
  }

  return (
    <div className="w-full max-w-sm">
      {inviteCode ? (
        <div className="text-center mb-8">
          <h1 className="font-serif italic text-3xl text-warm-white mb-2">
            Join your household
          </h1>
          <p className="text-warm-white/50 text-sm">
            Create your account to connect with your partner on Kin
          </p>
        </div>
      ) : (
        <div className="text-center mb-8">
          <h1 className="font-serif italic text-3xl text-warm-white mb-2">
            Get your 6am briefing
          </h1>
          <p className="text-warm-white/50 text-sm">
            Start your 7-day free trial — no credit card required yet
          </p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-surface rounded-2xl p-6 border border-warm-white/10 space-y-4"
      >
        <div>
          <label className="block text-warm-white/60 text-xs font-medium mb-1.5" htmlFor="signup-email">
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-warm-white placeholder:text-warm-white/25 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
          />
        </div>

        <div>
          <label className="block text-warm-white/60 text-xs font-medium mb-1.5" htmlFor="signup-password">
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
            autoComplete="new-password"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-warm-white placeholder:text-warm-white/25 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
          />
        </div>

        {error && (
          <p className="text-rose text-sm" role="alert">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-background py-3.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all duration-300 disabled:opacity-60 disabled:scale-100 flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Creating account…</>
          ) : (
            <>{inviteCode ? "Join Kin" : "Create account"} <ArrowRight size={16} /></>
          )}
        </button>

        <p className="text-center text-xs text-warm-white/30">
          Already have an account?{" "}
          <Link
            href={inviteCode ? `/signin?invite=${inviteCode}` : "/signin"}
            className="text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <Link href="/" className="font-serif italic text-4xl text-primary mb-10">
        Kin
      </Link>
      <Suspense fallback={null}>
        <SignUpForm />
      </Suspense>
    </main>
  );
}
