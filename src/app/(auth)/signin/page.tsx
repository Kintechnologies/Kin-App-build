"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Check if onboarding is completed
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .single();

    if (profile && !profile.onboarding_completed) {
      router.push("/onboarding");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <Link href="/" className="font-serif italic text-4xl text-primary mb-8">
        Kin
      </Link>
      <h1 className="font-serif italic text-3xl text-warm-white mb-2">
        Welcome back
      </h1>
      <p className="text-warm-white/60 mb-8">Sign in to your Kin account</p>

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
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <p className="text-rose text-sm">{error}</p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </Button>

        <div className="flex justify-between text-sm">
          <Link
            href="/reset-password"
            className="text-warm-white/40 hover:text-warm-white/60"
          >
            Forgot password?
          </Link>
          <Link href="/signup" className="text-primary hover:underline">
            Create account
          </Link>
        </div>
      </form>
    </main>
  );
}
