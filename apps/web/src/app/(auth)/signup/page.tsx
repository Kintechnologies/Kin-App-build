"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

// Inner component uses useSearchParams — must be wrapped in Suspense by the page.
function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("invite");
  const refCode = searchParams.get("ref");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();

    // When an invite is present, carry the code through the confirmation email
    // so /auth/callback can accept the invite after the session is established.
    // This handles the email-confirmation-ON case where signUp() returns no session.
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

    // Email confirmation is OFF — session returned immediately. Try accept now.
    // (If email confirmation is ON, authData.session is null and the invite will
    // be accepted via /auth/callback after the user clicks the confirmation link.)
    if (inviteCode && authData.session) {
      try {
        const res = await fetch(`/api/invite/${inviteCode}/accept`, {
          method: "POST",
        });
        if (res.ok) {
          // Household linked — proceed to partner mini-onboarding (#42)
          router.push("/onboarding/partner");
          return;
        }
        // Accept failed (expired, email mismatch, etc.) — proceed to normal onboarding
      } catch {
        // Non-fatal — proceed to onboarding
      }
    }

    // Preserve referral code if present so /onboarding can apply it
    const dest = refCode ? `/onboarding?ref=${refCode}` : "/onboarding";
    router.push(dest);
  }

  return (
    <>
      {inviteCode ? (
        <>
          <h1 className="font-serif italic text-3xl text-warm-white mb-2">
            Join your household
          </h1>
          <p className="text-warm-white/60 mb-8 text-center max-w-sm">
            Create your account to connect with your partner on Kin
          </p>
        </>
      ) : (
        <>
          <h1 className="font-serif italic text-3xl text-warm-white mb-2">
            Create your family
          </h1>
          <p className="text-warm-white/60 mb-8">
            Start your 7-day free trial — no credit card required
          </p>
        </>
      )}

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-surface rounded-xl p-6 border border-warm-white/10 space-y-4"
      >
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />

        {error && (
          <p className="text-rose text-sm">{error}</p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? "Creating account…" : inviteCode ? "Join Kin" : "Get Started"}
        </Button>

        <p className="text-center text-sm text-warm-white/40">
          Already have an account?{" "}
          <Link
            href={inviteCode ? `/signin?invite=${inviteCode}` : "/signin"}
            className="text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </>
  );
}

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <Link href="/" className="font-serif italic text-4xl text-primary mb-8">
        Kin
      </Link>
      <Suspense fallback={null}>
        <SignUpForm />
      </Suspense>
    </main>
  );
}
