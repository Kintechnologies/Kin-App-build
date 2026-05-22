"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle, Users } from "lucide-react";
import { KinMark } from "@/components/KinMark";

interface InviteData {
  valid: true;
  inviterName: string;
  familyName: string;
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
    router.push(`/signup?invite=${code}`);
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (state.status === "loading") {
    return (
      <PageShell>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "64px 0" }}>
          <Loader2 size={28} className="animate-spin" style={{ color: "var(--green)" }} />
          <p style={{ fontSize: "14px", color: "var(--ink-3)" }}>Loading your invite…</p>
        </div>
      </PageShell>
    );
  }

  // ── Invalid states ────────────────────────────────────────────────────────
  if (state.status === "invalid") {
    const { title, body } = invalidMessages[state.reason];
    return (
      <PageShell>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "18px", padding: "24px 0" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "999px",
              background: "rgba(172, 106, 69, 0.12)",
              border: "1px solid rgba(172, 106, 69, 0.28)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertCircle size={24} style={{ color: "var(--clay)" }} />
          </div>
          <h1 style={{ fontFamily: "var(--font-instrument-serif), serif", fontStyle: "italic", fontSize: "26px", color: "var(--ink)", letterSpacing: "-0.5px" }}>
            {title}
          </h1>
          <p style={{ fontSize: "15px", color: "var(--ink-2)", maxWidth: "26rem", lineHeight: 1.65 }}>{body}</p>
          <Link
            href="/signup"
            style={{
              marginTop: "12px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 24px",
              borderRadius: "999px",
              background: "var(--paper)",
              border: "1px solid var(--border)",
              color: "var(--ink)",
              fontSize: "14px",
              fontWeight: 500,
              textDecoration: "none",
            }}
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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "18px", padding: "24px 0" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "999px",
              background: "var(--green-soft)",
              border: "1px solid var(--green-line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckCircle size={24} style={{ color: "var(--green)" }} />
          </div>
          <h1 style={{ fontFamily: "var(--font-instrument-serif), serif", fontStyle: "italic", fontSize: "26px", color: "var(--ink)", letterSpacing: "-0.5px" }}>
            You&apos;re connected.
          </h1>
          <p style={{ fontSize: "15px", color: "var(--ink-2)", maxWidth: "26rem", lineHeight: 1.65 }}>
            Your household is linked. Head to your dashboard to see your shared family view.
          </p>
          <Link
            href="/dashboard"
            style={{
              marginTop: "12px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "100%",
              maxWidth: "22rem",
              padding: "16px 24px",
              borderRadius: "999px",
              background: "var(--green)",
              color: "var(--paper)",
              fontSize: "15px",
              fontWeight: 600,
              textDecoration: "none",
              letterSpacing: "-0.2px",
            }}
          >
            Go to dashboard
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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "28px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "999px",
              background: "var(--green-soft)",
              border: "1px solid var(--green-line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Users size={28} style={{ color: "var(--green)" }} />
          </div>

          <div>
            <p
              style={{
                fontSize: "11px",
                fontWeight: 500,
                fontFamily: "var(--font-geist-mono), monospace",
                letterSpacing: "1.6px",
                textTransform: "uppercase",
                color: "var(--ink-3)",
                marginBottom: "14px",
              }}
            >
              You&apos;ve been invited
            </p>
            <h1
              style={{
                fontFamily: "var(--font-instrument-serif), serif",
                fontStyle: "italic",
                fontSize: "clamp(28px, 5vw, 36px)",
                color: "var(--ink)",
                letterSpacing: "-0.6px",
                lineHeight: 1.15,
                marginBottom: "14px",
              }}
            >
              {inviterName} wants to run your family on Kin together.
            </h1>
            <p style={{ fontSize: "15px", color: "var(--ink-2)", lineHeight: 1.65, maxWidth: "30rem", margin: "0 auto" }}>
              Join the {familyName} household and you&apos;ll both wake up to the same calm morning briefing — what&apos;s on today, who&apos;s doing pickup, what needs to be packed.
            </p>
          </div>

          {/* Value card */}
          <div
            style={{
              width: "100%",
              maxWidth: "30rem",
              background: "var(--paper)",
              border: "1px solid var(--border)",
              borderLeft: "2px solid var(--green)",
              borderRadius: "0 12px 12px 0",
              padding: "20px 22px",
              textAlign: "left",
              boxShadow: "0 1px 2px rgba(43,38,30,0.06), 0 6px 16px rgba(43,38,30,0.06)",
            }}
          >
            <p style={{ fontSize: "14px", color: "var(--ink-2)", lineHeight: 1.7, marginBottom: "12px" }}>
              Kin is a Family OS that texts you one calm morning briefing — calendar, conflicts, pickups, what each kid needs that day. No new app to open. No new habit to build.
            </p>
            <ul style={{ paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
              {[
                "One shared family view of the week",
                "A morning text built around your household",
                "Conflict and pickup detection across both calendars",
                "Private memory: who likes what, who needs what",
              ].map((item) => (
                <li key={item} style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--ink-2)" }}>
                  <span style={{ width: "5px", height: "5px", borderRadius: "999px", background: "var(--green)", flexShrink: 0 }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <button
            onClick={handleJoin}
            style={{
              width: "100%",
              maxWidth: "22rem",
              padding: "16px 24px",
              borderRadius: "999px",
              background: "var(--green)",
              color: "var(--paper)",
              fontSize: "15px",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              letterSpacing: "-0.2px",
            }}
          >
            Join the {familyName} household
          </button>

          <p style={{ fontSize: "12px", color: "var(--ink-3)" }}>
            You&apos;ll create your own account and set your preferences. Takes about two minutes.
          </p>

          <p style={{ fontSize: "14px", color: "var(--ink-2)" }}>
            Already have a Kin account?{" "}
            <Link href={`/signin?invite=${code}`} style={{ color: "var(--green)", fontWeight: 500 }}>
              Sign in →
            </Link>
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: "18px", marginTop: "12px" }}>
            <Link href="/privacy" style={{ fontSize: "12px", color: "var(--ink-3)", textDecoration: "none" }}>Privacy</Link>
            <Link href="/terms" style={{ fontSize: "12px", color: "var(--ink-3)", textDecoration: "none" }}>Terms</Link>
          </div>
        </div>
      </PageShell>
    );
  }

  // ── Generic error ─────────────────────────────────────────────────────────
  return (
    <PageShell>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "16px", padding: "24px 0" }}>
        <AlertCircle size={28} style={{ color: "var(--clay)" }} />
        <h1 style={{ fontFamily: "var(--font-instrument-serif), serif", fontStyle: "italic", fontSize: "24px", color: "var(--ink)" }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: "14px", color: "var(--ink-2)" }}>
          {state.status === "error" ? state.message : "Please try again or ask your partner to resend the invite."}
        </p>
        <Link href="/signup" style={{ fontSize: "14px", color: "var(--green)", fontWeight: 500 }}>
          Create a new account
        </Link>
      </div>
    </PageShell>
  );
}

// ── Shared layout wrapper ─────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="marketing"
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg)",
        color: "var(--ink)",
        padding: "32px 24px 80px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "640px",
          height: "440px",
          background: "radial-gradient(ellipse at center, rgba(60,74,51,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ maxWidth: "560px", margin: "0 auto", position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "9px", textDecoration: "none" }}>
            <KinMark size={26} color="#3C4A33" />
            <span style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-0.4px", color: "var(--ink)" }}>Kin</span>
          </Link>
        </div>
        {children}
      </div>
    </main>
  );
}
