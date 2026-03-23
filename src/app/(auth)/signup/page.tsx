"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function SignUpPage() {
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
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/onboarding");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <Link href="/" className="font-serif italic text-4xl text-primary mb-8">
        Kin
      </Link>
      <h1 className="font-serif italic text-3xl text-warm-white mb-2">
        Create your family
      </h1>
      <p className="text-warm-white/60 mb-8">
        Start your 7-day free trial — no credit card required
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
          {loading ? "Creating account..." : "Get Started"}
        </Button>

        <p className="text-center text-sm text-warm-white/40">
          Already have an account?{" "}
          <Link href="/signin" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
