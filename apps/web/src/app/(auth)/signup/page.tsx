"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ArrowRight } from "lucide-react";
import KinWordmark from "@/components/KinWordmark";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg: "#F7F3ED",
  bgLift: "#FDFBF7",
  bgElev: "#EBE8E0",
  sage: "#5C6B4F",
  sageDark: "#3D4A33",
  sageBorder: "rgba(92,107,79,0.28)",
  warm: "#2C2C28",
  warm56: "rgba(44,44,40,0.56)",
  warm40: "rgba(44,44,40,0.40)",
  warm12: "rgba(44,44,40,0.12)",
  hair: "#E5DFD5",
  border: "#E5DFD5",
  rose: "#A65A4A",
  serif: "var(--font-instrument-serif), 'Playfair Display', serif",
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
type EmailStep = "email" | "sent";

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("invite");

  const [phoneStep, setPhoneStep] = useState<PhoneStep>("phone");
  const [emailStep, setEmailStep] = useState<EmailStep>("email");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [method, setMethod] = useState<"phone" | "email">("phone");
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
      options: { redirectTo: callbackUrl },
    });
    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  }

  async function handleEmailLink(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: magicErr } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl },
    });
    if (magicErr) {
      setError(magicErr.message);
      setLoading(false);
      return;
    }
    setLoading(false);
    setEmailStep("sent");
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
    // Fire-and-forget founder alert (idempotent server-side)
    fetch("/api/account/signup-notify", { method: "POST" }).catch(() => {});
    if (inviteCode) {
      try {
        const res = await fetch(`/api/invite/${inviteCode}/accept`, { method: "POST" });
        // Accepted partners join an existing household — route them to the
        // abbreviated 2-step partner onboarding (skips the trial/payment step,
        // since the household already has a subscription).
        if (res.ok) { router.push("/onboarding/partner"); return; }
      } catch { /* non-fatal */ }
    }
    router.push("/onboarding/sms-setup");
  }

  function switchMethod(m: "phone" | "email") {
    setMethod(m);
    setError("");
    setPhoneStep("phone");
    setEmailStep("email");
    setCode("");
  }

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    height: 44,
    padding: "0 14px",
    background: T.bgLift,
    border: `0.5px solid ${T.border}`,
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
    color: "#FDFBF7",
    border: "none",
    borderRadius: 4,
    fontFamily: "inherit",
    fontWeight: 500,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
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
    background: T.bgLift,
    color: T.warm,
    border: `0.5px solid ${T.border}`,
    borderRadius: 4,
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

  const textLinkStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    color: T.warm56,
    cursor: "pointer",
    fontFamily: T.mono,
    fontSize: 11.5,
    letterSpacing: "0.02em",
    padding: 0,
    alignSelf: "center",
  };

  return (
    <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: T.serif, fontSize: 36, fontWeight: 400, letterSpacing: "-0.015em", marginBottom: 6, color: T.warm, lineHeight: 1.1 }}>
          {inviteCode ? "Join your household" : "Wake up to a brief."}
        </div>
        <div style={{ fontSize: 13.5, color: T.warm56 }}>
          {inviteCode
            ? "Verify your number to connect with your partner on Kin."
            : "14-day free trial · ~90 seconds to set up · no password needed."}
        </div>
      </div>

      {/* Phone OTP — primary */}
      {method === "phone" && (phoneStep === "phone" ? (
        <form onSubmit={handleSendCode} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 11.5, color: T.warm56, letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 500, marginBottom: 8 }}>
              Mobile number
            </label>
            <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
              <div style={{
                height: 44, padding: "0 12px", background: T.bgElev,
                border: `0.5px solid ${T.border}`, borderRight: "none", borderRadius: "8px 0 0 8px",
                display: "flex", alignItems: "center", fontSize: 14, color: T.warm40,
                fontFamily: T.mono, flexShrink: 0, boxSizing: "border-box",
              }}>+1</div>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="(415) 555-0117" autoFocus required
                style={{ ...fieldStyle, borderRadius: "0 8px 8px 0", flex: 1, width: "auto", minWidth: 0 }} />
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: T.warm40, lineHeight: 1.6 }}>
              By verifying your number you agree to receive automated SMS from Kin (sign-in codes and daily briefings, ~1/day). Msg &amp; data rates may apply.{" "}
              <Link href="/terms" style={{ color: T.sage, textDecoration: "none" }}>Terms</Link>
              {" · "}
              <Link href="/privacy" style={{ color: T.sage, textDecoration: "none" }}>Privacy</Link>
              {" · Reply STOP to cancel"}
            </div>
          </div>
          {error && <p style={{ color: T.rose, fontSize: 13, margin: 0 }} role="alert">{error}</p>}
          <button type="submit" disabled={loading} style={primaryBtnStyle}>
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
            <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456" autoFocus required
              style={{ ...fieldStyle, fontFamily: T.mono, letterSpacing: "0.15em", fontSize: 18, textAlign: "center" }} />
            <div style={{ marginTop: 6, fontFamily: T.mono, fontSize: 11, color: T.warm40, textAlign: "center" }}>
              {"// sent to +1 "}{phone}{" · "}
              <button type="button" onClick={() => { setPhoneStep("phone"); setCode(""); setError(""); }}
                style={{ background: "none", border: "none", color: T.sage, cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", padding: 0 }}>
                change
              </button>
            </div>
          </div>
          {error && <p style={{ color: T.rose, fontSize: 13, margin: 0 }} role="alert">{error}</p>}
          <button type="submit" disabled={loading || code.length < 6}
            style={{ ...primaryBtnStyle, opacity: (loading || code.length < 6) ? 0.5 : 1 }}>
            {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <ArrowRight size={16} />}
            Verify &amp; continue
          </button>
        </form>
      ))}

      {/* Email magic link — fallback */}
      {method === "email" && (emailStep === "email" ? (
        <form onSubmit={handleEmailLink} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 11.5, color: T.warm56, letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 500, marginBottom: 8 }}>
              Email address
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" autoFocus required style={fieldStyle} />
            <div style={{ marginTop: 6, fontFamily: T.mono, fontSize: 11, color: T.warm40, textAlign: "center" }}>
              {"// we'll email you a one-click sign-in link"}
            </div>
          </div>
          {error && <p style={{ color: T.rose, fontSize: 13, margin: 0 }} role="alert">{error}</p>}
          <button type="submit" disabled={loading} style={primaryBtnStyle}>
            {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : null}
            Send link
          </button>
        </form>
      ) : (
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>📬</div>
          <div style={{ color: "rgba(44,44,40,0.72)", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Check your email</div>
          <div style={{ color: T.warm40, fontSize: 13 }}>We sent a sign-in link to <span style={{ color: T.warm }}>{email}</span></div>
          <button type="button" onClick={() => { setEmailStep("email"); setError(""); }}
            style={{ background: "none", border: "none", color: T.sage, cursor: "pointer", fontSize: 12, marginTop: 12, fontFamily: "inherit" }}>
            Use a different email
          </button>
        </div>
      ))}

      {/* method switch — only at the first step to avoid mid-verify state */}
      {((method === "phone" && phoneStep === "phone") ||
        (method === "email" && emailStep === "email")) && (
        <button
          type="button"
          onClick={() => switchMethod(method === "phone" ? "email" : "phone")}
          style={textLinkStyle}
        >
          {method === "phone"
            ? "// use an email link instead"
            : "// use a text code instead"}
        </button>
      )}

      {/* divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, color: T.warm40, fontSize: 11.5, fontFamily: T.mono, letterSpacing: "0.04em" }}>
        <div style={{ flex: 1, height: 1, background: T.hair }} />
        <span>OR</span>
        <div style={{ flex: 1, height: 1, background: T.hair }} />
      </div>

      {/* Google — alternative */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={handleGoogle} disabled={loading} style={secondaryBtnStyle}>
          {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <GoogleGlyph />}
          <span>Continue with Google</span>
        </button>
        <div style={{ fontFamily: T.mono, fontSize: 11, color: T.warm40, letterSpacing: "0.03em", textAlign: "center" }}>
          {"// creates your account · you'll connect calendar in the next step"}
        </div>
      </div>

      {/* pricing spec */}
      <div style={{
        padding: "16px 12px",
        background: "rgba(92,107,79,0.06)",
        border: `0.5px solid ${T.sageBorder}`,
        borderRadius: 8,
        display: "flex",
        gap: 8,
      }}>
        {[["$1.30/day", "less than a coffee"], ["$39/mo", "per family"], ["14-day", "free trial"]].map(([k, v]) => (
          <div key={k} style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
            <div style={{ fontFamily: T.mono, fontSize: 14, color: T.warm, fontWeight: 500 }}>{k}</div>
            <div style={{ fontSize: 11, color: T.warm40, marginTop: 2 }}>{v}</div>
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
        background: "#F7F3ED",
        color: "#2C2C28",
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
