"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import KinWordmark from "@/components/KinWordmark";
import { useParams, useRouter } from "next/navigation";
import { Home, Loader2, AlertCircle, CheckCircle, Users } from "lucide-react";

interface InviteData {
  valid: true;
  inviterName: string;
  familyName: string;
  inviteeEmail: string;
  expiresAt: string;
}

interface InviteInvalid {
  valid: false;
  reason: "expired" | "accepted" | "not_found";
}

type InviteState =
  | { status: "loading" }
  | { status: "valid"; data: InviteData }
  | { status: "invalid"; reason: InviteInvalid["reason"] }
  | { status: "accepting" }
  | { status: "accepted" }
  | { status: "error"; message: string };

const invalidMessages: Record<InviteInvalid["reason"], { title: string; body: string }> = {
  expired: {
    title: "This invite has expired",
    body: "Invite links are valid for 7 days. Ask your partner to send a new one from their Kin settings.",
  },
  accepted: {
    title: "This invite has already been used",
    body: "It looks like you're already connected to this household. Sign in to see your shared family view.",
  },
  not_found: {
    title: "Invite not found",
    body: "This link doesn't match any invite we have on file. Check the link or ask your partner to send a new one.",
  },
};

export default function InviteLandingPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [state, setState] = useState<InviteState>({ status: "loading" });

  useEffect(() => {
    if (!code) {
      setState({ status: "invalid", reason: "not_found" });
      return;
    }

    fetch(`/api/invite/${code}`)
      .then((r) => r.json())
      .then((data: InviteData | InviteInvalid) => {
        if (data.valid) {
          setState({ status: "valid", data });
        } else {
          setState({ status: "invalid", reason: data.reason });
        }
      })
      .catch(() => setState({ status: "invalid", reason: "not_found" }));
  }, [code]);

  async function handleJoin() {
    if (state.status !== "valid") return;

    // Route to sign-up/sign-in with the invite code in the query string.
    // After auth, the /signup and /signin pages should consume this code via
    // POST /api/invite/[code]/accept on successful authentication.
    // For now, we redirect to /signup with the invite code so it's preserved.
    router.push(`/signup?invite=${code}`);
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (state.status === "loading") {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-4 py-16">
          <Loader2 size={32} className="text-primary animate-spin" />
          <p className="text-warm-white/50 text-sm">Loading your invite…</p>
        </div>
      </PageShell>
    );
  }

  // ── Invalid states ────────────────────────────────────────────────────────
  if (state.status === "invalid") {
    const { title, body } = invalidMessages[state.reason];
    return (
      <PageShell>
        <div className="flex flex-col items-center text-center gap-4 py-8">
          <div className="w-14 h-14 rounded-full bg-rose/15 flex items-center justify-center">
            <AlertCircle size={24} className="text-rose" />
          </div>
          <h1 className="font-serif italic text-2xl text-warm-white">{title}</h1>
          <p className="text-warm-white/50 text-sm max-w-sm leading-relaxed">{body}</p>
          <Link
            href="/signup"
            className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-surface-raised border border-warm-white/10 text-warm-white/70 hover:text-warm-white text-sm transition-colors"
          >
            Create a new account
          </Link>
        </div>
      </PageShell>
    );
  }

  // ── Success after accepting ───────────────────────────────────────────────
  if (state.status === "accepted") {
    return (
      <PageShell>
        <div className="flex flex-col items-center text-center gap-4 py-8">
          <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
            <CheckCircle size={24} className="text-primary" />
          </div>
          <h1 className="font-serif italic text-2xl text-warm-white">You&apos;re connected!</h1>
          <p className="text-warm-white/50 text-sm">
            Your household is now linked. Head to your dashboard to see the shared family view.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center justify-center gap-2 w-full max-w-sm py-4 rounded-2xl bg-primary text-background font-semibold text-base hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Home size={18} /> Go to dashboard
          </Link>
        </div>
      </PageShell>
    );
  }

  // ── Valid invite ──────────────────────────────────────────────────────────
  if (state.status === "valid") {
    const { inviterName, familyName } = state.data;

    return (
      <PageShell>
        <div className="flex flex-col items-center text-center gap-6">
          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center">
            <Users size={28} className="text-primary" />
          </div>

          {/* Headline */}
          <div>
            <h1 className="font-serif italic text-3xl md:text-4xl text-warm-white mb-2 leading-tight">
              {inviterName} has invited you to Kin
            </h1>
            <p className="text-warm-white/50 text-base">
              Join {familyName} and start managing your family together.
            </p>
          </div>

          {/* Value card */}
          <div className="w-full bg-surface-raised rounded-2xl p-5 border border-warm-white/5 text-left space-y-3">
            <p className="text-warm-white/60 text-sm leading-relaxed">
              Kin is your family&apos;s AI operating system — meal planning, budgets, calendars, and
              a private AI chat for each parent. Both of you in one shared household, each with your
              own private profile.
            </p>
            <ul className="space-y-2 text-sm">
              {[
                "Shared meal plan & grocery list",
                "50/30/20 budget, together",
                "Family calendar coordination",
                "Private AI chat for each parent",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-warm-white/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <button
            onClick={handleJoin}
            className="w-full py-4 rounded-2xl bg-primary text-background font-semibold text-base hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Join the {familyName}
          </button>

          <p className="text-warm-white/30 text-xs">
            You&apos;ll create your own account and set your preferences. Takes 2 minutes.
          </p>

          {/* Existing-user sign-in path */}
          <p className="text-warm-white/40 text-sm">
            Already have a Kin account?{" "}
            <Link
              href={`/signin?invite=${code}`}
              className="text-primary hover:underline"
            >
              Sign in →
            </Link>
          </p>

          {/* Footer links */}
          <div className="flex justify-center gap-4 mt-4">
            <Link href="/privacy" className="text-warm-white/20 text-xs hover:text-warm-white/40 transition-colors">Privacy</Link>
            <Link href="/terms" className="text-warm-white/20 text-xs hover:text-warm-white/40 transition-colors">Terms</Link>
          </div>
        </div>
      </PageShell>
    );
  }

  // ── Generic error ─────────────────────────────────────────────────────────
  return (
    <PageShell>
      <div className="flex flex-col items-center text-center gap-4 py-8">
        <AlertCircle size={32} className="text-rose" />
        <h1 className="font-serif italic text-2xl text-warm-white">Something went wrong</h1>
        <p className="text-warm-white/50 text-sm">
          {state.status === "error" ? state.message : "Please try again or ask your partner to resend the invite."}
        </p>
        <Link href="/signup" className="text-primary text-sm hover:underline">
          Create a new account
        </Link>
      </div>
    </PageShell>
  );
}

// ── Shared layout wrapper ─────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
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

        {children}
      </div>
    </main>
  );
}
