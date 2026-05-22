"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ArrowRight, Lock } from "lucide-react";
import KinWordmark from "@/components/KinWordmark";

// ─── tokens ───────────────────────────────────────────────────────────────────
const T = {
  bg: "#F7F3ED",
  bgLift: "#FDFBF7",
  bgCard: "#FDFBF7",
  bgElev: "#EBE8E0",
  sage: "#5C6B4F",
  sageDark: "#3D4A33",
  sageBorder: "rgba(92,107,79,0.28)",
  sage12: "rgba(92,107,79,0.12)",
  sage20: "rgba(92,107,79,0.20)",
  hairSage: "rgba(92,107,79,0.14)",
  warm: "#2C2C28",
  warm72: "rgba(44,44,40,0.72)",
  warm56: "rgba(44,44,40,0.56)",
  warm40: "rgba(44,44,40,0.40)",
  warm24: "rgba(44,44,40,0.24)",
  warm12: "rgba(44,44,40,0.12)",
  warm06: "rgba(44,44,40,0.06)",
  hair: "#E5DFD5",
  hairStrong: "rgba(44,44,40,0.14)",
  border: "#E5DFD5",
  rose: "#A65A4A",
  cardBg: "#FDFBF7",
  serif: "var(--font-instrument-serif), 'Playfair Display', serif",
  mono: "var(--font-geist-mono), 'Geist Mono', 'JetBrains Mono', monospace",
  sans: "var(--font-geist-sans), 'Geist', system-ui, sans-serif",
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

type Method = "phone" | "email";
type PhoneStep = "phone" | "code";
type EmailStep = "email" | "sent";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("invite");
  const demoMode = searchParams.get("demo") === "true";

  const [method, setMethod] = useState<Method>("phone");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("phone");
  const [emailStep, setEmailStep] = useState<EmailStep>("email");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  // P2-L3 (audit v6): hardcoded demo credentials are INTENTIONAL for the
  // beta. They prefill only when the URL is /signin?demo=true (the link
  // from Landing → "See it in action") so beta evaluators and investor
  // demos can get into the seeded demo account without us emailing a
  // password. The demo account is sandboxed: limited household data, no
  // outbound SMS, no Stripe customer. Remove this prefill before opening
  // signup to the public.
  const [email, setEmail] = useState(demoMode ? "demo@kinai.family" : "");
  const [password, setPassword] = useState(demoMode ? "KinDemo2026!" : "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Keep the demo account prefilled if ?demo=true changes (e.g. SPA nav)
  useEffect(() => {
    if (demoMode) {
      setEmail((e) => e || "demo@kinai.family");
      setPassword((p) => p || "KinDemo2026!");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode]);

  const callbackUrl =
    typeof window !== "undefined"
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
    // Phone OTP makes no signin/signup distinction — a brand-new number
    // creates an account here. Fire the (idempotent) founder alert so first
    // sign-ins from /signin still get logged.
    fetch("/api/account/signup-notify", { method: "POST" }).catch(() => {});
    await routeAfterAuth();
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: pwErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (pwErr) {
      setError(pwErr.message);
      setLoading(false);
      return;
    }
    await routeAfterAuth();
  }

  async function routeAfterAuth() {
    const supabase = createClient();
    if (inviteCode) {
      try {
        const res = await fetch(`/api/invite/${inviteCode}/accept`, { method: "POST" });
        if (res.ok) { router.push("/dashboard"); return; }
      } catch { /* non-fatal */ }
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .single();
    router.push(profile?.onboarding_completed ? "/dashboard" : "/onboarding/sms-setup");
  }

  function switchMethod(m: Method) {
    setMethod(m);
    setError("");
    setPhoneStep("phone");
    setEmailStep("email");
    setCode("");
  }

  // ── styles ───────────────────────────────────────────────────────────────
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
    fontSize: 14,
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

  // ── Demo login (gated behind ?demo=true) ──────────────────────────────────
  // Phone OTP is the real product. Password sign-in survives only for the
  // prefilled reviewer/demo account so walkthroughs keep working.
  if (demoMode) {
    return (
      <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 22 }}>
        <div>
          <div
            style={{
              fontFamily: T.serif,
              fontSize: 34,
              fontWeight: 400,
              letterSpacing: "-0.015em",
              marginBottom: 6,
              color: T.warm,
              lineHeight: 1.1,
            }}
          >
            Demo sign in
          </div>
          <div style={{ fontSize: 13.5, color: T.warm56, lineHeight: 1.5 }}>
            The demo account is prefilled — click Sign in to explore Kin with sample data.
          </div>
        </div>

        <form onSubmit={handlePassword} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              padding: "10px 12px",
              background: T.sage12,
              border: `0.5px solid ${T.hairSage}`,
              borderRadius: 8,
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <Lock size={14} style={{ color: T.sage, marginTop: 2, flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: T.warm72, lineHeight: 1.5 }}>
              <div style={{ color: T.sage, fontWeight: 500, marginBottom: 2 }}>
                Demo account prefilled
              </div>
              Click <span style={{ color: T.warm }}>Sign in</span> to walk
              through Kin&apos;s full dashboard with sample data.
            </div>
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={fieldStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
              style={fieldStyle}
            />
          </div>
          {error && <ErrorText>{error}</ErrorText>}
          <button type="submit" disabled={loading || !email || !password} style={primaryBtnStyle}>
            {loading ? (
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Lock size={14} />
            )}
            Sign in
          </button>
        </form>

        <div style={{ textAlign: "center", fontSize: 13, color: T.warm56 }}>
          <Link href="/signin" style={{ color: T.sage, textDecoration: "none" }}>
            Use phone sign-in instead
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <div
          style={{
            fontFamily: T.serif,
            fontSize: 34,
            fontWeight: 400,
            letterSpacing: "-0.015em",
            marginBottom: 6,
            color: T.warm,
            lineHeight: 1.1,
          }}
        >
          {inviteCode ? "Join your household" : "Sign in"}
        </div>
        <div style={{ fontSize: 13.5, color: T.warm56, lineHeight: 1.5 }}>
          {inviteCode
            ? "Verify your number to connect with your partner on Kin."
            : "Enter your mobile number and we'll text you a code. No password to remember."}
        </div>
      </div>

      {/* Phone OTP — primary */}
      {method === "phone" && (phoneStep === "phone" ? (
        <form onSubmit={handleSendCode} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>Mobile number</label>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  height: 44,
                  padding: "0 12px",
                  background: T.bgElev,
                  border: `0.5px solid ${T.border}`,
                  borderRight: "none",
                  borderRadius: "8px 0 0 8px",
                  display: "flex",
                  alignItems: "center",
                  fontSize: 14,
                  color: T.warm40,
                  fontFamily: T.mono,
                  flexShrink: 0,
                }}
              >
                +1
              </div>
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
            <div style={fineprintStyle}>
              By verifying your number you agree to receive automated SMS from Kin (sign-in
              codes and daily briefings, ~1/day). Msg &amp; data rates may apply.{" "}
              <Link href="/terms" style={{ color: T.sage, textDecoration: "none" }}>Terms</Link>
              {" · "}
              <Link href="/privacy" style={{ color: T.sage, textDecoration: "none" }}>Privacy</Link>
              {" · Reply STOP to cancel"}
            </div>
          </div>
          {error && <ErrorText>{error}</ErrorText>}
          <button type="submit" disabled={loading} style={primaryBtnStyle}>
            {loading && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
            Text me a code
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>6-digit code</label>
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
              style={{
                ...fieldStyle,
                fontFamily: T.mono,
                letterSpacing: "0.15em",
                fontSize: 18,
                textAlign: "center",
              }}
            />
            <div style={{ marginTop: 6, fontFamily: T.mono, fontSize: 11, color: T.warm40 }}>
              {"// sent to +1 "}
              {phone}
              {" · "}
              <button
                type="button"
                onClick={() => {
                  setPhoneStep("phone");
                  setCode("");
                  setError("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: T.sage,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "inherit",
                  padding: 0,
                }}
              >
                change
              </button>
            </div>
          </div>
          {error && <ErrorText>{error}</ErrorText>}
          <button
            type="submit"
            disabled={loading || code.length < 6}
            style={{ ...primaryBtnStyle, opacity: loading || code.length < 6 ? 0.5 : 1 }}
          >
            {loading ? (
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <ArrowRight size={16} />
            )}
            Verify code
          </button>
        </form>
      ))}

      {/* Email magic link — fallback */}
      {method === "email" && (emailStep === "email" ? (
        <form onSubmit={handleEmailLink} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              required
              style={fieldStyle}
            />
            <div style={{ marginTop: 6, fontFamily: T.mono, fontSize: 11, color: T.warm40 }}>
              {"// we'll email you a one-click sign-in link"}
            </div>
          </div>
          {error && <ErrorText>{error}</ErrorText>}
          <button type="submit" disabled={loading} style={primaryBtnStyle}>
            {loading && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
            Send link
          </button>
        </form>
      ) : (
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>📬</div>
          <div style={{ color: T.warm72, fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
            Check your email
          </div>
          <div style={{ color: T.warm40, fontSize: 13 }}>
            We sent a sign-in link to <span style={{ color: T.warm }}>{email}</span>
          </div>
          <button
            type="button"
            onClick={() => { setEmailStep("email"); setError(""); }}
            style={{
              background: "none",
              border: "none",
              color: T.sage,
              cursor: "pointer",
              fontSize: 12,
              marginTop: 12,
              fontFamily: "inherit",
            }}
          >
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          color: T.warm40,
          fontSize: 11,
          fontFamily: T.mono,
          letterSpacing: "0.06em",
        }}
      >
        <div style={{ flex: 1, height: 1, background: T.hair }} />
        <span>OR</span>
        <div style={{ flex: 1, height: 1, background: T.hair }} />
      </div>

      {/* Google — alternative */}
      <button onClick={handleGoogle} disabled={loading} style={secondaryBtnStyle}>
        {loading ? (
          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
        ) : (
          <GoogleGlyph />
        )}
        <span>Continue with Google</span>
      </button>

      <div style={{ textAlign: "center", fontSize: 13, color: T.warm56 }}>
        New here?{" "}
        <Link
          href={inviteCode ? `/signup?invite=${inviteCode}` : "/signup"}
          style={{ color: T.sage, textDecoration: "none" }}
        >
          Start a 14-day trial
        </Link>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  color: T.warm56,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  fontWeight: 500,
  marginBottom: 8,
  fontFamily: T.mono,
};

const fineprintStyle: React.CSSProperties = {
  marginTop: 6,
  fontSize: 11,
  color: T.warm40,
  lineHeight: 1.55,
};

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        color: T.rose,
        fontSize: 13,
        margin: 0,
        padding: "8px 12px",
        background: "rgba(166,90,74,0.08)",
        border: "0.5px solid rgba(166,90,74,0.2)",
        borderRadius: 8,
      }}
      role="alert"
    >
      {children}
    </p>
  );
}

// ─── Decorative left rail ─────────────────────────────────────────────────────
function LeftRail() {
  return (
    <div
      className="kin-signin-rail"
      style={{
        width: 480,
        flexShrink: 0,
        height: "100vh",
        position: "sticky",
        top: 0,
        background: T.bgLift,
        borderRight: `0.5px solid ${T.hair}`,
        padding: "44px 48px",
        display: "flex",
        flexDirection: "column",
        gap: 32,
        overflow: "hidden",
      }}
    >
      {/* ambient glow */}
      <div
        style={{
          position: "absolute",
          top: -120,
          right: -120,
          width: 380,
          height: 380,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(92,107,79,0.12), rgba(92,107,79,0) 60%)",
          pointerEvents: "none",
        }}
      />

      <Link
        href="/"
        style={{
          textDecoration: "none",
          alignSelf: "flex-start",
          position: "relative",
        }}
      >
        <KinWordmark size={28} tone="sage" />
      </Link>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 20, position: "relative" }}>
        <div
          style={{
            fontFamily: T.mono,
            fontSize: 11,
            color: T.sage,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          {"// family AI"}
        </div>
        <div
          style={{
            fontFamily: T.serif,
            fontSize: 46,
            fontWeight: 400,
            color: T.warm,
            letterSpacing: "-0.015em",
            lineHeight: 1.1,
          }}
        >
          Both calendars.
          <br />
          <span style={{ color: T.sage }}>One number.</span>
        </div>
        <p
          style={{
            fontSize: 15,
            color: T.warm72,
            lineHeight: 1.55,
            maxWidth: 360,
            margin: 0,
          }}
        >
          Kin reads your week, texts a 6 AM brief that names the conflicts and
          who&apos;s covering — and quietly handles the seams in between.
        </p>

        {/* spec rows */}
        <div
          style={{
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            gap: 1,
            border: `0.5px solid ${T.hair}`,
            borderRadius: 8,
            background: T.bgCard,
            overflow: "hidden",
            maxWidth: 360,
          }}
        >
          {[
            { k: "Cost", v: "$1.30 / day" },
            { k: "Plan", v: "$39 / month" },
            { k: "Trial", v: "14-day free" },
          ].map((row, i) => (
            <div
              key={row.k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "11px 14px",
                borderTop: i === 0 ? "none" : `0.5px solid ${T.hair}`,
                fontSize: 13,
              }}
            >
              <span
                style={{
                  fontFamily: T.mono,
                  color: T.warm40,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  fontSize: 10.5,
                }}
              >
                {row.k}
              </span>
              <span
                style={{
                  color: T.warm,
                  fontFamily: T.mono,
                  fontSize: 12,
                  letterSpacing: "0.02em",
                }}
              >
                {row.v}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          fontFamily: T.mono,
          fontSize: 10.5,
          color: T.warm40,
          letterSpacing: "0.06em",
          position: "relative",
        }}
      >
        {"// kinai.family · v1"}
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <main
      className="kin-signin-shell"
      style={{
        minHeight: "100vh",
        background: T.bg,
        color: T.warm,
        fontFamily: T.sans,
        WebkitFontSmoothing: "antialiased",
        display: "flex",
        flexDirection: "row",
      }}
    >
      <LeftRail />
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
          minHeight: "100vh",
        }}
      >
        {/* mobile wordmark — shown above the form when the rail is hidden */}
        <div className="kin-signin-mobile-wordmark" style={{ display: "none" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <KinWordmark size={26} tone="sage" />
          </Link>
        </div>
        <Suspense fallback={null}>
          <SignInForm />
        </Suspense>
      </div>
    </main>
  );
}
