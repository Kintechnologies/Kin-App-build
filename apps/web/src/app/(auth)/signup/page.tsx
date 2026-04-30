"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ArrowRight } from "lucide-react";
import KinWordmark from "@/components/KinWordmark";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg: "#0C0F0A",
  sage: "#7CB87A",
  sageBorder: "rgba(124,184,122,0.28)",
  warm: "#F0EDE6",
  warm56: "rgba(240,237,230,0.56)",
  warm40: "rgba(240,237,230,0.40)",
  warm12: "rgba(240,237,230,0.12)",
  hair: "rgba(240,237,230,0.08)",
  mono: "'Geist Mono', 'JetBrains Mono', monospace",
};

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.61z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.96 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33z" fill="#FBBC05" />
      <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

type PhoneStep = "phone" | "code";

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("invite");

  const [phoneStep, setPhoneStep] = useState<PhoneStep>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const callbackUrl = typeof window !== "undefined"
    ? `${window.location.origin}/auth/callback${inviteCode ? `?invite=${inviteCode}` : ""}`
    : "/auth/callback";

  async function handleGoogle() {
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
        scopes: "https://www.googleapis.com/auth/calendar.readonly",
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const normalized = phone.replace(/\D/g, "");
    const e164 = normalized.startsWith("1") ? `+${normalized}` : `+1${normalized}`;
    const { error: otpError } = await supabase.auth.signInWithOtp({ phone: e164 });
    if (otpError) {
      setError(otpError.message);
      setLoading(false);
      return;
    }
    setLoading(false);
    setPhoneStep("code");
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const normalized = phone.replace(/\D/g, "");
    const e164 = normalized.startsWith("1") ? `+${normalized}` : `+1${normalized}`;
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: e164,
      token: code,
      type: "sms",
    });
    if (verifyError) {
      setError(verifyError.message);
      setLoading(false);
      return;
    }
    if (inviteCode) {
      try {
        const res = await fetch(`/api/invite/${inviteCode}/accept`, { method: "POST" });
        if (res.ok) { router.push("/onboarding/sms-setup"); return; }
      } catch { /* non-fatal */ }
    }
    router.push("/onboarding/sms-setup");
  }

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    height: 44,
    padding: "0 14px",
    background: "rgba(240,237,230,0.04)",
    border: `1px solid ${T.warm12}`,
    borderRadius: 8,
    color: T.warm,
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    letterSpacing: "-0.005em",
    boxSizing: "border-box",
  };

  const primaryBtnStyle: React.CSSProperties = {
    width: "100%",
    height: 44,
    background: T.sage,
    color: T.bg,
    border: "none",
    borderRadius: 8,
    fontFamily: "inherit",
    fontWeight: 500,
    fontSize: 14.5,
    cursor: loading ? "default" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    opacity: loading ? 0.6 : 1,
  };

  const secondaryBtnStyle: React.CSSProperties = {
    width: "100%",
    height: 44,
    background: "rgba(240,237,230,0.06)",
    color: T.warm,
    border: `1px solid ${T.warm12}`,
    borderRadius: 8,
    fontFamily: "inherit",
    fontWeight: 500,
    fontSize: 14.5,
    cursor: loading ? "default" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    opacity: loading ? 0.6 : 1,
  };

  return (
    <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.025em", marginBottom: 6, color: T.warm }}>
          {inviteCode ? "Join your household" : "Wake up to a brief."}
        </div>
        <div style={{ fontSize: 13.5, color: T.warm56 }}>
          {inviteCode
            ? "Create your account to connect with your partner on Kin."
            : "7-day free trial · no credit card yet · ~90 seconds to set up."}
        </div>
      </div>

      {/* Google — primary */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={handleGoogle} disabled={loading} style={primaryBtnStyle}>
          {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <GoogleGlyph />}
          <span>Continue with Google</span>
        </button>
        <div style={{ fontFamily: T.mono, fontSize: 11, color: T.warm40, letterSpacing: "0.03em" }}>
          // signs you in · connects your calendar · read-only
        </div>
      </div>

      {/* divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, color: T.warm40, fontSize: 11.5, fontFamily: T.mono, letterSpacing: "0.04em" }}>
        <div style={{ flex: 1, height: 1, background: T.hair }} />
        <span>OR</span>
        <div style={{ flex: 1, height: 1, background: T.hair }} />
      </div>

      {/* Phone OTP — secondary */}
      {phoneStep === "phone" ? (
        <form onSubmit={handleSendCode} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 11.5, color: T.warm56, letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 500, marginBottom: 8 }}>
              Mobile number
            </label>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{
                height: 44, padding: "0 12px",
                background: "rgba(240,237,230,0.04)",
                border: `1px solid ${T.warm12}`,
                borderRight: "none",
                borderRadius: "8px 0 0 8px",
                display: "flex", alignItems: "center",
                fontSize: 14, color: T.warm40,
                fontFamily: T.mono, flexShrink: 0,
              }}>+1</div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(415) 555-0117"
                autoFocus
                required
                style={{ ...fieldStyle, borderRadius: "0 8px 8px 0" }}
              />
            </div>
            <div style={{ marginTop: 6, fontFamily: T.mono, fontSize: 11, color: T.warm40, letterSpacing: "0.03em" }}>
              // no password — we text you a 6-digit code
            </div>
          </div>
          {error && <p style={{ color: "#D4748A", fontSize: 13, margin: 0 }} role="alert">{error}</p>}
          <button type="submit" disabled={loading} style={secondaryBtnStyle}>
            {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : null}
            Send verification code
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 11.5, color: T.warm56, letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 500, marginBottom: 8 }}>
              6-digit code
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              autoFocus
              required
              style={{ ...fieldStyle, fontFamily: T.mono, letterSpacing: "0.15em", fontSize: 18, textAlign: "center" }}
            />
            <div style={{ marginTop: 6, fontFamily: T.mono, fontSize: 11, color: T.warm40, letterSpacing: "0.03em" }}>
              // sent to +1 {phone} ·{" "}
              <button
                type="button"
                onClick={() => { setPhoneStep("phone"); setCode(""); setError(""); }}
                style={{ background: "none", border: "none", color: T.sage, cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", padding: 0 }}
              >
                change
              </button>
            </div>
          </div>
          {error && <p style={{ color: "#D4748A", fontSize: 13, margin: 0 }} role="alert">{error}</p>}
          <button type="submit" disabled={loading || code.length < 6} style={{ ...secondaryBtnStyle, opacity: (loading || code.length < 6) ? 0.5 : 1 }}>
            {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <ArrowRight size={16} />}
            Verify &amp; continue
          </button>
        </form>
      )}

      {/* pricing spec */}
      <div style={{
        padding: "16px",
        background: "rgba(124,184,122,0.06)",
        border: `1px solid ${T.sageBorder}`,
        borderRadius: 10,
        display: "flex",
        gap: 20,
      }}>
        {[["$1.30/day", "less than a coffee"], ["$39/mo", "per family"], ["7-day", "free trial"]].map(([k, v]) => (
          <div key={k}>
            <div style={{ fontFamily: T.mono, fontSize: 14, color: T.warm, fontWeight: 500 }}>{k}</div>
            <div style={{ fontSize: 11, color: T.warm40, marginTop: 1 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", fontSize: 13, color: T.warm56 }}>
        Already have an account?{" "}
        <Link href={inviteCode ? `/signin?invite=${inviteCode}` : "/signin"} style={{ color: T.sage, textDecoration: "none" }}>
          Sign in
        </Link>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0C0F0A",
        color: "#F0EDE6",
        fontFamily: "var(--font-geist-sans), Geist, system-ui, sans-serif",
        WebkitFontSmoothing: "antialiased",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        gap: 40,
      }}
    >
      <Link href="/" style={{ textDecoration: "none" }}>
        <KinWordmark size={28} tone="warm" />
      </Link>
      <Suspense fallback={null}>
        <SignUpForm />
      </Suspense>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
    </main>
  );
}
