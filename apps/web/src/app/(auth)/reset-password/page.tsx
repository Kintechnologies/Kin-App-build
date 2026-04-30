"use client";

import { useState } from "react";
import Link from "next/link";
import KinWordmark from "@/components/KinWordmark";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/auth/callback` }
    );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6">
        <Link
          href="/"
          style={{ textDecoration: "none", marginBottom: 32 }}
        >
          <KinWordmark size={28} tone="warm" />
        </Link>
        <div className="w-full max-w-sm bg-surface rounded-xl p-6 border border-warm-white/10 text-center">
          <h2 className="text-2xl font-medium text-warm-white mb-2" style={{ letterSpacing: "-0.02em" }}>
            Check your email
          </h2>
          <p className="text-warm-white/60 text-sm mb-4">
            We sent a password reset link to{" "}
            <span className="text-warm-white">{email}</span>
          </p>
          <Link href="/signin" className="text-primary text-sm hover:underline">
            Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <Link href="/" style={{ textDecoration: "none", marginBottom: 32 }}>
        <KinWordmark size={28} tone="warm" />
      </Link>
      <h1 className="text-3xl font-medium text-warm-white mb-2" style={{ letterSpacing: "-0.025em" }}>
        Reset password
      </h1>
      <p className="text-warm-white/60 mb-8">
        We&apos;ll send you a link to reset your password
      </p>

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

        {error && (
          <p className="text-rose text-sm">{error}</p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? "Sending..." : "Send Reset Link"}
        </Button>

        <p className="text-center text-sm text-warm-white/40">
          Remember your password?{" "}
          <Link href="/signin" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
