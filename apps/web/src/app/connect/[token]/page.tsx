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
        <div className="flex flex-col items-center text-center gap-4 py-8">
          <div className="w-16 h-16 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center">
            <CheckIcon />
          </div>
          <h1 className="font-serif italic text-3xl text-warm-white">Connected!</h1>
          <p className="text-warm-white/50 text-base max-w-sm leading-relaxed">
            Your calendar is linked. Kin will use it to make your morning briefings
            actually useful.
          </p>
          <p className="text-warm-white/70 text-sm mt-2">
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
        <div className="flex flex-col items-center text-center gap-4 py-8">
          <div className="w-14 h-14 rounded-full bg-rose/15 flex items-center justify-center">
            <AlertIcon />
          </div>
          <h1 className="font-serif italic text-2xl text-warm-white">
            We couldn&apos;t connect your calendar
          </h1>
          <p className="text-warm-white/50 text-sm max-w-sm leading-relaxed">
            Something went wrong linking your Google Calendar. Head back to your
            texts and reply to Kin — it can send you a fresh link.
          </p>
        </div>
      </PageShell>
    );
  }

  // ── First visit — validate token, then bounce to Google OAuth ───────────────
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("calendar_connect_token", token)
    .maybeSingle<{ id: string }>();

  if (!profile) {
    return (
      <PageShell>
        <div className="flex flex-col items-center text-center gap-4 py-8">
          <div className="w-14 h-14 rounded-full bg-rose/15 flex items-center justify-center">
            <AlertIcon />
          </div>
          <h1 className="font-serif italic text-2xl text-warm-white">
            This link isn&apos;t valid
          </h1>
          <p className="text-warm-white/50 text-sm max-w-sm leading-relaxed">
            It may have already been used, or it expired. Go back to your texts and
            reply to Kin — it can send you a new one.
          </p>
        </div>
      </PageShell>
    );
  }

  // redirect() throws — must run outside any try/catch.
  redirect(getGoogleAuthUrl(`sms:${token}`));
}

// ─── Layout + icons ────────────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen px-6 py-16 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-amber/5 blur-[100px] pointer-events-none" />

      <div className="max-w-lg mx-auto relative">
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

function CheckIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-primary"
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
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-rose"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
