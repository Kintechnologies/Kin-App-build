"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ArrowRight, Lock } from "lucide-react";
import KinWordmark from "@/components/KinWordmark";

// ─── tokens ───────────────────────────────────────────────────────────────────
const T = {
  bg: "#0C0F0A",
  bgLift: "#14181A",
  bgCard: "#161A17",
  bgElev: "#1B201C",
  sage: "#7CB87A",
  sageBorder: "rgba(124,184,122,0.28)",
  sage12: "rgba(124,184,122,0.12)",
  sage20: "rgba(124,184,122,0.20)",
  hairSage: "rgba(124,184,122,0.14)",
  warm: "#F0EDE6",
  warm72: "rgba(240,237,230,0.72)",
  warm56: "rgba(240,237,230,0.56)",
  warm40: "rgba(240,237,230,0.40)",
  warm24: "rgba(240,237,230,0.24)",
  warm12: "rgba(240,237,230,0.12)",
  warm06: "rgba(240,237,230,0.06)",
  hair: "rgba(240,237,230,0.08)",
  hairStrong: "rgba(240,237,230,0.14)",
  rose: "#D4748A",
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

type Method = "phone" | "email" | "password";
type PhoneStep = "phone" | "code";
type EmailStep = "email" | "sent";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("invite");
  const demoMode = searchParams.get("demo") === "true";

  const [method, setMethod] = useState<Method>(demoMode ? "password" : "phone");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("phone");
  const [emailStep, setEmailStep] = useState<EmailStep>("email");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState(demoMode ? "demo@kinai.family" : "");
  const [password, setPassword] = useState(demoMode ? "KinDemo2026!" : "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Keep method in sync with ?demo=true if it changes (e.g. SPA nav)
  useEffect(() => {
    if (demoMode) {
      setMethod("password");
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
    router.push(profile?.onboarding_completed ? "/dashboard" : "/onboarding");
  }

  // ── styles ───────────────────────────────────────────────────────────────
  const fieldStyle: React.CSSProperties = {
    width: "100%",
    height: 44,
    padding: "0 14px",
    background: "rgba(240,237,230,0.04)",
    border: `1px solid ${T.warm12}`,
    borderRadius: 10,
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
    borderRadius: 10,
    fontFamily: "inherit",
    fontWeight: 600,
    fontSize: 14,
    cursor: loading ? "default" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    opacity: loading ? 0.6 : 1,
    letterSpacing: "-0.005em",
  };

  const secondaryBtnStyle: React.CSSProperties = {
    width: "100%",
    height: 44,
    background: "rgba(240,237,230,0.06)",
    color: T.warm,
    border: `1px solid ${T.warm12}`,
    borderRadius: 10,
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

  return (
    <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 500,
            letterSpacing: "-0.025em",
            marginBottom: 6,
            color: T.warm,
            lineHeight: 1.1,
          }}
        >
          {inviteCode ? "Join your household" : "Sign in"}
        </div>
        <div style={{ fontSize: 13.5, color: T.warm56, lineHeight: 1.5 }}>
          {inviteCode
            ? "Sign in to connect with your partner on Kin"
            : "Continue with Google, get a code by text, or use the demo login."}
        </div>
      </div>

      {/* Google primary */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button onClick={handleGoogle} disabled={loading} style={primaryBtnStyle}>
          {loading && method !== "password" ? (
            <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            <GoogleGlyph />
          )}
          <span>Continue with Google</span>
        </button>
        <div style={{ fontFamily: T.mono, fontSize: 10.5, color: T.warm40, letterSpacing: "0.04em" }}>
          {"// creates your account · no calendar access yet"}
        </div>
      </div>

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

      {/* Method tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: 4,
          background: "rgba(240,237,230,0.03)",
          border: `1px solid ${T.hair}`,
          borderRadius: 10,
        }}
      >
        {(["phone", "email", "password"] as Method[]).map((m) => {
          const active = method === m;
          const label =
            m === "phone" ? "Text code" : m === "email" ? "Email link" : "Demo login";
          return (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMethod(m);
                setError("");
              }}
              style={{
                flex: 1,
                height: 32,
                border: "none",
                borderRadius: 7,
                background: active ? T.sage12 : "transparent",
                color: active ? T.sage : T.warm56,
                fontFamily: "inherit",
                fontSize: 12.5,
                fontWeight: active ? 500 : 400,
                cursor: "pointer",
                letterSpacing: "-0.005em",
                transition: "background 160ms ease, color 160ms ease",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Phone OTP */}
      {method === "phone" && (phoneStep === "phone" ? (
        <form onSubmit={handleSendCode} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>Mobile number</label>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  height: 44,
                  padding: "0 12px",
                  background: "rgba(240,237,230,0.04)",
                  border: `1px solid ${T.warm12}`,
                  borderRight: "none",
                  borderRadius: "10px 0 0 10px",
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
                style={{ ...fieldStyle, borderRadius: "0 10px 10px 0" }}
              />
            </div>
            <div style={fineprintStyle}>
              By verifying your number you agree to receive automated SMS from Kin (daily briefings,
              ~1/day). Msg &amp; data rates may apply.{" "}
              <Link href="/terms" style={{ color: T.sage, textDecoration: "none" }}>Terms</Link>
              {" · "}
              <Link href="/privacy" style={{ color: T.sage, textDecoration: "none" }}>Privacy</Link>
              {" · Reply STOP to cancel"}
            </div>
          </div>
          {error && <ErrorText>{error}</ErrorText>}
          <button type="submit" disabled={loading} style={secondaryBtnStyle}>
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
            style={{ ...secondaryBtnStyle, opacity: loading || code.length < 6 ? 0.5 : 1 }}
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

      {/* Email magic link */}
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
          <button type="submit" disabled={loading} style={secondaryBtnStyle}>
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

      {/* Password (demo) */}
      {method === "password" && (
        <form onSubmit={handlePassword} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {demoMode && (
            <div
              style={{
                padding: "10px 12px",
                background: T.sage12,
                border: `1px solid ${T.hairSage}`,
                borderRadius: 10,
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
          )}
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus={!demoMode}
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
            <div style={{ marginTop: 6, fontFamily: T.mono, fontSize: 11, color: T.warm40 }}>
              {"// for the demo account or invited reviewers"}
            </div>
          </div>
          {error && <ErrorText>{error}</ErrorText>}
          <button type="submit" disabled={loading || !email || !password} style={secondaryBtnStyle}>
            {loading ? (
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Lock size={14} />
            )}
            Sign in
          </button>
        </form>
      )}

      <div style={{ textAlign: "center", fontSize: 13, color: T.warm56 }}>
        New here?{" "}
        <Link
          href={inviteCode ? `/signup?invite=${inviteCode}` : "/signup"}
          style={{ color: T.sage, textDecoration: "none" }}
        >
          Start a 7-day trial
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
        background: "rgba(212,116,138,0.08)",
        border: "1px solid rgba(212,116,138,0.2)",
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
        borderRight: `1px solid ${T.hair}`,
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
            "radial-gradient(circle, rgba(124,184,122,0.18), rgba(124,184,122,0) 60%)",
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
            fontSize: 38,
            fontWeight: 500,
            color: T.warm,
            letterSpacing: "-0.03em",
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
            border: `1px solid ${T.hair}`,
            borderRadius: 10,
            background: T.bgCard,
            overflow: "hidden",
            maxWidth: 360,
          }}
        >
          {[
            { k: "Cost", v: "$1.30 / day" },
            { k: "Plan", v: "$39 / month" },
            { k: "Trial", v: "7-day free" },
          ].map((row, i) => (
            <div
              key={row.k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "11px 14px",
                borderTop: i === 0 ? "none" : `1px solid ${T.hair}`,
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
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes spin { to { transform: rotate(360deg); } }
            @media (max-width: 900px) {
              .kin-signin-rail { display: none !important; }
              .kin-signin-shell { flex-direction: column !important; }
              .kin-signin-mobile-wordmark {
                display: block !important;
                position: absolute;
                top: 28px;
                left: 50%;
                transform: translateX(-50%);
              }
            }
          `,
        }}
      />
    </main>
  );
}
