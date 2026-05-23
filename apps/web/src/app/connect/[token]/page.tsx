/**
 * /connect/[token] — calendar connect landing for SMS-onboarded users.
 *
 * Step 8 of SMS onboarding texts the user a kinai.family/connect/<token> link.
 * They have no web session, so the random one-time token is what identifies
 * them:
 *
 *   1. First visit (no query params) — validate the token against
 *      profiles.calendar_connect_token, then bounce to Google OAuth with
 *      state="sms:<token>".
 *   2. Google redirects to /api/calendar/google/callback, which attaches the
 *      connection and redirects back here with ?connected=1.
 *   3. ?connected=1 — show the "Connected! Go back to your texts" confirmation.
 *
 * The token is cleared by the callback once a connection is attached, so a
 * reused link with no query params falls through to the invalid-link state.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import KinWordmark from "@/components/KinWordmark";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGoogleAuthUrl } from "@/lib/calendar/google";

export const dynamic = "force-dynamic";

// Token shape — mirrors SMS_TOKEN_RE in /api/calendar/google/callback so we
// reject malformed tokens here (audit V7 P2-A5) rather than handing them to
// the OAuth state round-trip and only validating downstream.
const CONNECT_TOKEN_RE = /^[a-zA-Z0-9_-]{8,128}$/;

// ─── Design tokens (inline — matches the landing page + tokens.css) ──────────
const T = {
  bg: "#F7F3ED",
  bgCard: "#FDFBF7",
  sage: "#5C6B4F",
  sageBorder: "rgba(92,107,79,0.28)",
  sage12: "rgba(92,107,79,0.12)",
  warm: "#2C2C28",
  warm72: "rgba(44,44,40,0.72)",
  warm56: "rgba(44,44,40,0.56)",
  warm40: "rgba(44,44,40,0.40)",
  hair: "#E5DFD5",
  rose: "#A65A4A",
  roseBorder: "rgba(166,90,74,0.28)",
  rose12: "rgba(166,90,74,0.12)",
};

interface ConnectPageProps {
  params: { token: string };
  searchParams: { connected?: string; error?: string };
}

export default async function ConnectCalendarPage({
  params,
  searchParams,
}: ConnectPageProps) {
  const { token } = params;

  // ── Connected — confirmation screen ─────────────────────────────────────────
  if (searchParams.connected) {
    return (
      <PageShell>
        <div style={cardStyle}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              background: T.sage12,
              border: `0.5px solid ${T.sageBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 28px rgba(92,107,79,0.10)",
            }}
          >
            <CheckIcon />
          </div>
          <h1 style={headingStyle}>Connected!</h1>
          <p style={bodyStyle}>
            Your calendar is linked. Kin will use it to make your morning
            briefings actually useful.
          </p>
          <div style={dividerStyle} />
          <p
            style={{
              margin: 0,
              fontSize: 14.5,
              lineHeight: 1.55,
              color: T.warm,
              fontWeight: 500,
            }}
          >
            Go back to your texts — Kin is waiting for you there.
          </p>
        </div>
      </PageShell>
    );
  }

  // ── Error from the OAuth callback ───────────────────────────────────────────
  if (searchParams.error) {
    return (
      <PageShell>
        <NoticeCard
          title="We couldn't connect your calendar"
          body="Something went wrong linking your Google Calendar. Head back to your texts and reply to Kin — it can send you a fresh link."
        />
      </PageShell>
    );
  }

  // ── First visit — validate token, then bounce to Google OAuth ───────────────
  // Shape-check upstream so obviously-malformed tokens never hit the DB or
  // get round-tripped through Google's OAuth state (audit V7 P2-A5).
  if (!CONNECT_TOKEN_RE.test(token)) {
    return (
      <PageShell>
        <NoticeCard
          title="This link isn't valid"
          body="It may have already been used, or it expired. Go back to your texts and reply to Kin — it can send you a new one."
        />
      </PageShell>
    );
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("calendar_connect_token", token)
    .maybeSingle<{ id: string }>();

  if (!profile) {
    return (
      <PageShell>
        <NoticeCard
          title="This link isn't valid"
          body="It may have already been used, or it expired. Go back to your texts and reply to Kin — it can send you a new one."
        />
      </PageShell>
    );
  }

  // redirect() throws — must run outside any try/catch.
  redirect(getGoogleAuthUrl(`sms:${token}`));
}

// ─── Layout ─────────────────────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: T.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        position: "relative",
        overflow: "hidden",
        fontFamily: "var(--font-geist-sans), Geist, system-ui, sans-serif",
        letterSpacing: "-0.005em",
      }}
    >
      {/* ambient sage glow */}
      <div
        style={{
          position: "absolute",
          top: "32%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 520,
          height: 520,
          borderRadius: "50%",
          background: "rgba(92,107,79,0.06)",
          filter: "blur(130px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
        }}
      >
        <Link href="/" style={{ textDecoration: "none", display: "inline-block" }}>
          <KinWordmark size={26} tone="warm" />
        </Link>
        {children}
      </div>
    </main>
  );
}

// ─── Shared styles ──────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  width: "100%",
  background: T.bgCard,
  border: `0.5px solid ${T.hair}`,
  borderRadius: 8,
  padding: "40px 32px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  gap: 16,
  boxShadow: "0 24px 60px rgba(60,74,51,0.14)",
};

const headingStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-instrument-serif), Georgia, serif",
  fontStyle: "italic",
  fontWeight: 400,
  fontSize: 34,
  lineHeight: 1.1,
  color: T.warm,
  letterSpacing: "-0.01em",
};

const bodyStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 14.5,
  lineHeight: 1.6,
  color: T.warm56,
  maxWidth: 300,
};

const dividerStyle: React.CSSProperties = {
  width: 32,
  height: 0.5,
  background: T.hair,
  margin: "4px 0",
};

// ─── Notice card (error / invalid-link states) ──────────────────────────────────

function NoticeCard({ title, body }: { title: string; body: string }) {
  return (
    <div style={cardStyle}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          background: T.rose12,
          border: `0.5px solid ${T.roseBorder}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AlertIcon />
      </div>
      <h1
        style={{
          ...headingStyle,
          fontSize: 26,
        }}
      >
        {title}
      </h1>
      <p style={bodyStyle}>{body}</p>
    </div>
  );
}

// ─── Icons ──────────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke={T.sage}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke={T.rose}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
