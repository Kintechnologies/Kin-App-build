"use client";

import { useState } from "react";

// Must match SMS_CONSENT_TEXT in /api/waitlist/route.ts — the server
// snapshots this exact wording onto the row for the carrier audit trail.
const TCPA_COPY =
  "By submitting, you agree to receive SMS messages from Kin. Msg & data rates may apply.";

// Light US-style display formatting. International numbers (typed with a
// leading +) are left alone — the server normalizes either way.
function formatPhone(value: string): string {
  if (value.trimStart().startsWith("+")) {
    return value.replace(/[^\d+\s()-]/g, "");
  }
  const d = value.replace(/\D/g, "").slice(0, 10);
  if (d.length === 0) return "";
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

type FormState = "idle" | "loading" | "success" | "error";

interface WaitlistFormProps {
  ctaText?: string;
  id?: string;
}

export function WaitlistForm({
  ctaText = "Get Early Access",
  id,
}: WaitlistFormProps) {
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [focused, setFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || state === "loading") return;

    setState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      setState("success");
      setPhone("");
    } catch (err) {
      setState("error");
      setErrorMsg(
        err instanceof Error ? err.message : "Something went wrong. Try again."
      );
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
    if (state === "error") {
      setState("idle");
      setErrorMsg("");
    }
  };

  return (
    <div id={id} style={{ width: "100%", maxWidth: "440px" }}>
      {state === "success" ? (
        <div
          className="kin-fade"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            background: "var(--green-soft)",
            border: "1px solid var(--green-line)",
            borderRadius: "12px",
            padding: "16px 20px",
            textAlign: "left",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="10" cy="10" r="9" stroke="var(--green)" strokeWidth="1.4" />
            <path
              d="M6 10.2l2.6 2.6L14 7.4"
              stroke="var(--green)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p
            style={{
              fontSize: "15px",
              color: "var(--green)",
              fontWeight: 500,
              letterSpacing: "-0.2px",
              lineHeight: 1.5,
            }}
          >
            Check your phone — we just texted you. Reply with your name and
            email to lock in your spot.
          </p>
        </div>
      ) : (
        <div>
          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={handlePhoneChange}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="(555) 123-4567"
              aria-label="Phone number"
              required
              aria-invalid={state === "error"}
              style={{
                flex: "1 1 200px",
                minHeight: 44, // WCAG 2.5.5 touch target (audit V7 P2-D11)
                // V6 P1-L2: paint the input itself when validation fails so the
                // error reads at a glance, not just the secondary copy below.
                background:
                  state === "error" ? "rgba(166,90,74,0.06)" : "var(--paper)",
                border:
                  state === "error"
                    ? "1px solid var(--clay)"
                    : `1px solid ${focused ? "var(--green-line)" : "var(--border)"}`,
                borderLeftWidth: state === "error" ? "3px" : "1px",
                borderRadius: "11px",
                padding: "13px 16px",
                fontSize: "15px",
                color: "var(--ink)",
                outline: "none",
                boxShadow:
                  state === "error"
                    ? "0 0 0 3px rgba(166,90,74,0.12)"
                    : focused
                      ? "0 0 0 3px var(--green-soft)"
                      : "inset 0 1px 2px rgba(43,38,30,0.05)",
                transition: "border-color 180ms ease, box-shadow 180ms ease",
              }}
            />
            <button
              type="submit"
              disabled={state === "loading"}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
              }}
              style={{
                flex: "0 0 auto",
                minHeight: 44, // WCAG 2.5.5 touch target (audit V7 P2-D11)
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--paper)",
                background: "var(--green)",
                padding: "13px 24px",
                borderRadius: "11px",
                letterSpacing: "-0.1px",
                opacity: state === "loading" ? 0.7 : 1,
                cursor: state === "loading" ? "wait" : "pointer",
                transition: "opacity 150ms ease, transform 150ms ease",
                boxShadow: "0 4px 14px rgba(60,74,51,0.22)",
              }}
            >
              {state === "loading" ? "Joining…" : ctaText}
            </button>
          </form>

          <p
            style={{
              marginTop: "8px",
              fontSize: "11.5px",
              lineHeight: 1.55,
              color: "var(--ink-3)",
              letterSpacing: "0.1px",
            }}
          >
            Enter your 10-digit US phone number.
          </p>
          <p
            style={{
              marginTop: "6px",
              fontSize: "11.5px",
              lineHeight: 1.55,
              color: "var(--ink-3)",
              letterSpacing: "0.1px",
            }}
          >
            {TCPA_COPY}
          </p>

          {state === "error" && (
            <p
              className="kin-fade"
              style={{
                marginTop: "8px",
                fontSize: "12.5px",
                color: "var(--clay)",
                fontWeight: 500,
              }}
            >
              {errorMsg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
