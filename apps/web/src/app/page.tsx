"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import KinWordmark from "@/components/KinWordmark";
import { InteractiveDemo } from "@/components/InteractiveDemo";

type SubmitState = "idle" | "loading" | "success" | "error";

// ─── Design tokens (inline — matches tokens.css) ─────────────────────────────
const T = {
  bg: "#0C0F0A",
  bgCard: "#161A17",
  bgElev: "#1B201C",
  sage: "#7CB87A",
  sageBorder: "rgba(124,184,122,0.28)",
  sage12: "rgba(124,184,122,0.12)",
  warm: "#F0EDE6",
  warm72: "rgba(240,237,230,0.72)",
  warm56: "rgba(240,237,230,0.56)",
  warm40: "rgba(240,237,230,0.40)",
  warm24: "rgba(240,237,230,0.24)",
  warm12: "rgba(240,237,230,0.12)",
  warm06: "rgba(240,237,230,0.06)",
  hair: "rgba(240,237,230,0.08)",
  mono: "'Geist Mono', 'JetBrains Mono', monospace",
};

// ─── Phone frame + SMS demo ───────────────────────────────────────────────────

function KinConversation() {
  return (
    <>
      <div
        style={{
          textAlign: "center",
          fontFamily: T.mono,
          fontSize: 10.5,
          color: T.warm40,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          margin: "4px 0 8px",
        }}
      >
        Today · 6:02 AM
      </div>
      <SMSBubble from="kin" time="6:02 AM">
        Tight afternoon ahead. Jontae&apos;s 5pm standup usually runs over — if
        it passes 5:15, daycare pickup becomes yours. Daycare locks at 5:45.
        It&apos;s a 12 min drive, 18 with school traffic, so plan to leave by
        4:22. Jaxon&apos;s 2-year checkup also moved to 4pm.
      </SMSBubble>
      <SMSBubble from="user" time="6:14 AM">
        Can she still do pickup if her meeting ends on time?
      </SMSBubble>
      <SMSBubble from="kin" time="6:14 AM">
        I&apos;ll watch her 5pm in real time. If it&apos;s still going at 5:15,
        I&apos;ll text you to leave — pickup is yours, and 4:22 keeps it
        comfortable.
      </SMSBubble>
    </>
  );
}

function SMSBubble({
  from,
  time,
  children,
}: {
  from: "kin" | "user";
  time?: string;
  children: React.ReactNode;
}) {
  const isUser = from === "user";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 8,
      }}
    >
      <div style={{ maxWidth: "82%" }}>
        <div
          style={{
            padding: "9px 13px",
            borderRadius: 14,
            borderBottomRightRadius: isUser ? 4 : 14,
            borderBottomLeftRadius: isUser ? 14 : 4,
            background: isUser ? T.warm : "rgba(124,184,122,0.10)",
            border: isUser ? "1px solid transparent" : `1px solid ${T.sageBorder}`,
            color: isUser ? T.bg : T.warm,
            fontSize: 13,
            lineHeight: 1.42,
            letterSpacing: "-0.005em",
          }}
        >
          {children}
        </div>
        {time && (
          <div
            style={{
              fontFamily: T.mono,
              fontSize: 9.5,
              color: T.warm40,
              marginTop: 3,
              padding: "0 4px",
              textAlign: isUser ? "right" : "left",
              letterSpacing: "0.04em",
            }}
          >
            {time}
          </div>
        )}
      </div>
    </div>
  );
}

function PhoneDemo() {
  return (
    <div
      style={{
        width: 260,
        height: 500,
        borderRadius: 28,
        background: T.bgElev,
        border: `1px solid ${T.warm12}`,
        padding: 8,
        boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 22,
          background: T.bg,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* status bar */}
        <div
          style={{
            height: 28,
            padding: "0 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: T.mono,
            fontSize: 10,
            color: T.warm40,
            letterSpacing: "0.04em",
            flexShrink: 0,
          }}
        >
          <span>9:41</span>
          <span style={{ color: T.sage }}>kin</span>
        </div>
        {/* contact row */}
        <div
          style={{
            padding: "4px 14px 10px",
            borderBottom: `1px solid ${T.warm06}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              background: "rgba(124,184,122,0.18)",
              border: `1px solid rgba(124,184,122,0.4)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <KinWordmark size={9} tone="sage" />
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: T.warm }}>
            Kin
          </div>
          <div
            style={{
              marginLeft: "auto",
              fontFamily: T.mono,
              fontSize: 9,
              color: T.warm40,
            }}
          >
            +1 (415) 555-0117
          </div>
        </div>
        {/* messages */}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            padding: "12px 12px 8px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <KinConversation />
        </div>
        {/* compose bar */}
        <div
          style={{
            padding: "8px 12px 12px",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              flex: 1,
              height: 30,
              borderRadius: 15,
              background: T.warm06,
              border: `1px solid ${T.warm12}`,
              padding: "0 12px",
              display: "flex",
              alignItems: "center",
              fontSize: 11.5,
              color: T.warm40,
            }}
          >
            iMessage
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Waitlist form ────────────────────────────────────────────────────────────
// Submissions land in Supabase `waitlist` table. To see signups, query:
//   SELECT email, first_name, last_name, situation, created_at
//   FROM waitlist ORDER BY created_at DESC;
// (Studio: https://supabase.com/dashboard/project/coxqdpcffmsncvisfyvj/editor)

type Situation = "co-parent" | "dual-parent" | "caregiver" | "other";

const SITUATION_OPTIONS: ReadonlyArray<{ value: Situation; label: string; hint: string }> = [
  { value: "co-parent",   label: "Co-parent",   hint: "Sharing kids across households" },
  { value: "dual-parent", label: "Dual parent", hint: "Two parents, same household"    },
  { value: "caregiver",   label: "Caregiver",   hint: "Caring for kids or family"      },
  { value: "other",       label: "Other",       hint: "Tell us when we reach out"      },
];

// A2P/10DLC consent copy, shown as a small-print disclosure below the submit
// button. Submitting the form with a phone number constitutes consent (the
// standard TCPA pattern used by Uber, DoorDash, etc.) — no checkbox required.
// Twilio carrier reviewers look for this language ("agree to receive SMS",
// "Msg & data rates", "Reply STOP"). Don't paraphrase without updating the
// registration submitted to Twilio. This exact string is also stored on the
// waitlist row as the proof-of-consent record.
const SMS_CONSENT_TEXT =
  "By signing up, you agree to receive SMS messages from Kin. Msg & data rates may apply. Reply STOP to cancel.";

function WaitlistForm({
  source = "landing_page",
  ctaLabel = "Join waitlist",
  compact = false,
}: {
  source?: string;
  ctaLabel?: string;
  compact?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [situation, setSituation] = useState<Situation | "">("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [alreadyOnList, setAlreadyOnList] = useState(false);

  // Expand the form once the email field has any content. The full form
  // collapses back if the user empties the email — keeps things minimal at first.
  const expanded = email.trim().length > 0 || phone.trim().length > 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitState === "loading") return;

    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedEmail) {
      setErrorMessage("Email is required.");
      setSubmitState("error");
      return;
    }
    // Phone and SMS consent are optional. If a phone is provided, validate
    // loosely; the API route does the strict E.164 check.
    if (trimmedPhone) {
      const phoneDigits = trimmedPhone.replace(/[^\d]/g, "");
      if (phoneDigits.length < 10 || phoneDigits.length > 15) {
        setErrorMessage("That phone number doesn't look right — leave it blank or fix the digits.");
        setSubmitState("error");
        return;
      }
    }
    if (!trimmedFirst || !trimmedLast) {
      setErrorMessage("Please add your first and last name.");
      setSubmitState("error");
      return;
    }
    if (!situation) {
      setErrorMessage("Pick the option that fits your situation.");
      setSubmitState("error");
      return;
    }

    setSubmitState("loading");
    setErrorMessage("");
    setAlreadyOnList(false);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          phone: trimmedPhone || undefined,
          // Submitting the form with a phone number constitutes SMS consent —
          // the disclosure is shown below the submit button (TCPA pattern).
          smsConsent: trimmedPhone ? true : false,
          smsConsentText: trimmedPhone ? SMS_CONSENT_TEXT : undefined,
          firstName: trimmedFirst,
          lastName: trimmedLast,
          situation,
          source,
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        existing?: boolean;
        error?: string;
      };
      if (res.ok && data.success) {
        setAlreadyOnList(data.existing === true);
        setSubmitState("success");
      } else {
        setErrorMessage(data.error ?? "Something went wrong. Please try again.");
        setSubmitState("error");
      }
    } catch {
      setErrorMessage("Network error. Please try again.");
      setSubmitState("error");
    }
  }

  const fieldStyle: React.CSSProperties = {
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
    width: "100%",
    boxSizing: "border-box",
  };

  void compact;
  return (
    <AnimatePresence mode="wait">
      {submitState === "success" ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 8,
            padding: "20px 24px",
            background: T.bgCard,
            border: `1px solid ${T.sageBorder}`,
            borderRadius: 12,
          }}
          role="status"
        >
          <CheckCircle2 size={24} color={T.sage} />
          <p style={{ color: T.warm, fontWeight: 500, margin: 0 }}>
            {alreadyOnList ? "You're already on the list." : "You're on the list."}
          </p>
          <p style={{ color: T.warm56, fontSize: 13, margin: 0 }}>
            We&apos;ll email you the moment we open access. Founder-built, hand-onboarded — we&apos;re bringing families on a few at a time.
          </p>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
          noValidate
          aria-describedby="sms-consent-text"
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <label htmlFor="waitlist-email" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>
              Email address
            </label>
            <input
              id="waitlist-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (submitState === "error") setSubmitState("idle");
              }}
              placeholder="your@email.com"
              required
              autoComplete="email"
              style={{ ...fieldStyle, flex: "1 1 180px", width: "auto" }}
            />
            <label htmlFor="waitlist-phone" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>
              Mobile phone number
            </label>
            <input
              id="waitlist-phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (submitState === "error") setSubmitState("idle");
              }}
              placeholder="Mobile phone (optional)"
              autoComplete="tel"
              inputMode="tel"
              style={{ ...fieldStyle, flex: "1 1 180px", width: "auto" }}
            />
          </div>

          <button
            type="submit"
            disabled={submitState === "loading"}
            style={{
              height: 44,
              padding: "0 18px",
              background: T.sage,
              color: T.bg,
              border: "none",
              borderRadius: 8,
              fontFamily: "inherit",
              fontWeight: 500,
              fontSize: 14,
              cursor: submitState === "loading" ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: submitState === "loading" ? 0.6 : 1,
              whiteSpace: "nowrap",
              width: "100%",
            }}
          >
            {submitState === "loading" ? (
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <ArrowRight size={16} />
            )}
            {expanded ? ctaLabel : "Get on the list"}
          </button>

          {/* SMS consent disclosure — A2P/10DLC. Submitting the form with a */}
          {/* phone number constitutes consent; no checkbox required as long  */}
          {/* as this disclosure is clearly visible (standard TCPA pattern).  */}
          <p
            id="sms-consent-text"
            style={{
              fontSize: 11.5,
              lineHeight: 1.5,
              color: T.warm40,
              margin: 0,
              letterSpacing: "-0.005em",
            }}
          >
            {SMS_CONSENT_TEXT}{" "}
            <Link href="/privacy" style={{ color: T.warm56, textDecoration: "underline" }}>
              Privacy Policy
            </Link>
            {" · "}
            <Link href="/terms" style={{ color: T.warm56, textDecoration: "underline" }}>
              Terms
            </Link>
          </p>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 4 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1] }}
                style={{ overflow: "hidden", display: "flex", flexDirection: "column", gap: 10 }}
              >
                <div style={{ display: "flex", gap: 8 }}>
                  <label htmlFor="waitlist-first" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>
                    First name
                  </label>
                  <input
                    id="waitlist-first"
                    type="text"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (submitState === "error") setSubmitState("idle");
                    }}
                    placeholder="First name"
                    autoComplete="given-name"
                    style={fieldStyle}
                  />
                  <label htmlFor="waitlist-last" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>
                    Last name
                  </label>
                  <input
                    id="waitlist-last"
                    type="text"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      if (submitState === "error") setSubmitState("idle");
                    }}
                    placeholder="Last name"
                    autoComplete="family-name"
                    style={fieldStyle}
                  />
                </div>

                <fieldset
                  style={{
                    border: `1px solid ${T.warm12}`,
                    borderRadius: 8,
                    padding: "10px 12px 8px",
                    background: "rgba(240,237,230,0.02)",
                    margin: 0,
                  }}
                >
                  <legend
                    style={{
                      padding: "0 6px",
                      fontFamily: T.mono,
                      fontSize: 10.5,
                      color: T.warm56,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Your situation
                  </legend>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: 6,
                      marginTop: 4,
                    }}
                  >
                    {SITUATION_OPTIONS.map((opt) => {
                      const checked = situation === opt.value;
                      return (
                        <label
                          key={opt.value}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 8,
                            padding: "8px 10px",
                            background: checked ? "rgba(124,184,122,0.10)" : "transparent",
                            border: `1px solid ${checked ? T.sageBorder : T.hair}`,
                            borderRadius: 6,
                            cursor: "pointer",
                            transition: "background 120ms ease, border-color 120ms ease",
                          }}
                        >
                          <input
                            type="radio"
                            name="situation"
                            value={opt.value}
                            checked={checked}
                            onChange={() => {
                              setSituation(opt.value);
                              if (submitState === "error") setSubmitState("idle");
                            }}
                            style={{
                              appearance: "none",
                              WebkitAppearance: "none",
                              width: 14,
                              height: 14,
                              borderRadius: 7,
                              border: `1.5px solid ${checked ? T.sage : T.warm40}`,
                              background: checked ? T.sage : "transparent",
                              flexShrink: 0,
                              margin: "3px 0 0",
                              cursor: "pointer",
                              outline: "none",
                            }}
                          />
                          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span
                              style={{
                                fontSize: 13,
                                color: T.warm,
                                fontWeight: 500,
                                letterSpacing: "-0.005em",
                              }}
                            >
                              {opt.label}
                            </span>
                            <span style={{ fontSize: 11.5, color: T.warm56, lineHeight: 1.35 }}>
                              {opt.hint}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </motion.div>
            )}
          </AnimatePresence>

          {submitState === "error" && errorMessage && (
            <p style={{ color: "#D4748A", fontSize: 13, margin: 0 }} role="alert">
              {errorMessage}
            </p>
          )}

          <p style={{ color: T.warm40, fontSize: 12, margin: 0 }}>
            We&apos;ll email you the moment access opens up. No spam, ever.
          </p>
        </motion.form>
      )}
    </AnimatePresence>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const watchItems = [
  "doctor appointments",
  "dentist visits",
  "field trips",
  "soccer practice",
  "birthday parties",
  "school early release",
  "daycare pickup",
  "dinner plans",
  "work meetings",
  "weddings",
];

// ─── How it works illustrations ───────────────────────────────────────────────

function CalendarTile({ label, day, color }: { label: string; day: string; color: string }) {
  return (
    <div style={{
      width: 80, borderRadius: 8,
      background: T.bgElev, border: `1px solid ${T.hair}`,
      overflow: "hidden", flexShrink: 0,
    }}>
      <div style={{
        background: color, height: 20,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontFamily: T.mono, color: T.bg, letterSpacing: "0.06em",
        textTransform: "uppercase", fontWeight: 600,
      }}>{label}</div>
      <div style={{
        padding: "6px 0", textAlign: "center",
        fontSize: 22, fontWeight: 600, color: T.warm, letterSpacing: "-0.02em",
      }}>{day}</div>
      <div style={{ padding: "0 6px 8px", display: "flex", flexDirection: "column", gap: 3 }}>
        {[color, T.warm24, T.warm12].map((c, i) => (
          <div key={i} style={{ height: 4, borderRadius: 2, background: c, width: i === 0 ? "100%" : i === 1 ? "70%" : "50%" }} />
        ))}
      </div>
    </div>
  );
}

function StepCalendarIllustration() {
  return (
    <div style={{ padding: "20px 0 4px", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <CalendarTile label="Parent A" day="29" color={T.sage} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <div style={{ width: 28, height: 1, background: T.sageBorder }} />
        <div style={{
          width: 20, height: 20, borderRadius: 10,
          background: "rgba(124,184,122,0.12)", border: `1px solid ${T.sageBorder}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, color: T.sage,
        }}>✓</div>
        <div style={{ width: 28, height: 1, background: T.sageBorder }} />
      </div>
      <CalendarTile label="Parent B" day="29" color="#5B9CF6" />
    </div>
  );
}

function StepConstraintsIllustration() {
  const chips = [
    { label: "Daycare closes 5:45pm", active: true },
    { label: "You cover pickup Mon–Wed", active: true },
    { label: "School: Tue early release", active: false },
    { label: "Jontae: standup runs late", active: false },
  ];
  return (
    <div style={{ padding: "20px 0 4px", display: "flex", flexDirection: "column", gap: 6 }}>
      {chips.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 + i * 0.08, duration: 0.35 }}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 10px",
            background: c.active ? "rgba(124,184,122,0.08)" : T.bgElev,
            border: `1px solid ${c.active ? T.sageBorder : T.hair}`,
            borderRadius: 6,
          }}
        >
          <div style={{
            width: 14, height: 14, borderRadius: 7, flexShrink: 0,
            background: c.active ? T.sage : "transparent",
            border: `1.5px solid ${c.active ? T.sage : T.warm40}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 8, color: T.bg,
          }}>{c.active ? "✓" : ""}</div>
          <span style={{ fontSize: 11.5, color: c.active ? T.warm72 : T.warm40, letterSpacing: "-0.005em" }}>
            {c.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function StepBriefIllustration() {
  return (
    <div style={{ padding: "20px 0 4px", display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{
        fontFamily: T.mono, fontSize: 10, color: T.warm40,
        letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "center", marginBottom: 2,
      }}>
        Tue Apr 29 · 6:02 AM
      </div>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3, duration: 0.4 }}
        style={{
          padding: "9px 12px",
          background: "rgba(124,184,122,0.08)",
          border: `1px solid ${T.sageBorder}`,
          borderRadius: "12px 12px 12px 3px",
          fontSize: 12.5, lineHeight: 1.45, color: T.warm,
        }}
      >
        Jontae&apos;s 5pm usually runs over. If it passes 5:15, <span style={{ color: T.sage }}>pickup is yours</span> — leave by 4:22 (18 min in school traffic). Daycare locks at 5:45.
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.55, duration: 0.35 }}
        style={{
          alignSelf: "flex-end",
          padding: "7px 11px",
          background: T.warm,
          borderRadius: "12px 12px 3px 12px",
          fontSize: 12.5, color: T.bg,
        }}
      >
        Can she still do pickup if her meeting ends on time?
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.8, duration: 0.35 }}
        style={{
          padding: "7px 11px",
          background: "rgba(124,184,122,0.08)",
          border: `1px solid ${T.sageBorder}`,
          borderRadius: "12px 12px 12px 3px",
          fontSize: 12.5, lineHeight: 1.45, color: T.warm,
        }}
      >
        Watching her 5pm live — if it&apos;s still going at 5:15, I&apos;ll text you to leave.
      </motion.div>
    </div>
  );
}

const HOW_STEPS = [
  {
    n: "01",
    title: "Kin sees the conflict before you do",
    body: "Kin spots the collision early — a late meeting that's about to eat a daycare pickup — and quietly tells the right parent before it becomes a scramble. Connect your Google Calendars once and it has the full picture to work from.",
    Illustration: StepCalendarIllustration,
  },
  {
    n: "02",
    title: "Tell Kin how your family works",
    body: "A few quick questions: who handles pickup when it's unplanned? What time should the briefing hit? Kin learns your patterns so the briefing is actually useful.",
    Illustration: StepConstraintsIllustration,
  },
  {
    n: "03",
    title: "Wake up already coordinated",
    body: "6am. One text to each of you — today's schedule, any conflicts, anything that needs a decision. The morning brief is just the start: Kin keeps learning, and gets sharper every week.",
    Illustration: StepBriefIllustration,
  },
];

const PERSONAS = [
  {
    tag: "Parents",
    title: "Two-parent households",
    body: "Dual incomes, two calendars, one shared life. Neither of you has to be the air traffic controller anymore.",
  },
  {
    tag: "Co-parents",
    title: "Coordinating custody",
    body: "Different homes, different schedules, same kid. Kin keeps both households aligned without group-chat drama.",
  },
  {
    tag: "Caregivers",
    title: "Nannies, grandparents & sitters",
    body: "Add anyone who helps with your kids. Kin loops the right people in for pickup, bedtime, or the unplanned half-day.",
  },
];

const COMPARISON = [
  {
    kind: "General AI assistants",
    examples: "Poke, Airstitch",
    body: "You text them, they do stuff. Useful — but only for one person at a time.",
    highlight: false,
  },
  {
    kind: "Family apps",
    examples: "Cozi, FamCal",
    body: "Download an app, hope your partner does too. Then update it. Forever.",
    highlight: false,
  },
  {
    kind: "Kin",
    examples: "Your family's AI",
    body: "Kin learns your whole family and keeps everyone coordinated — one system that gets smarter over time. Nothing to download.",
    highlight: true,
  },
];

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: T.bg,
        color: T.warm,
        fontFamily: "var(--font-geist-sans), Geist, system-ui, sans-serif",
        WebkitFontSmoothing: "antialiased",
        letterSpacing: "-0.005em",
      }}
    >
      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav
        style={{
          height: 64,
          padding: "0 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${T.hair}`,
          position: "sticky",
          top: 0,
          background: T.bg,
          zIndex: 10,
        }}
      >
        <KinWordmark size={22} tone="warm" />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            fontSize: 13.5,
            color: T.warm72,
          }}
        >
          <Link
            href="#how-it-works"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            How Kin works
          </Link>
          <Link
            href="#demo"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            Demo
          </Link>
          <Link
            href="#pricing"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            Pricing
          </Link>
          <Link
            href="#waitlist-top"
            style={{
              height: 34,
              padding: "0 14px",
              background: T.sage,
              color: T.bg,
              borderRadius: 8,
              fontWeight: 500,
              fontSize: 13.5,
              display: "flex",
              alignItems: "center",
              textDecoration: "none",
            }}
          >
            Join waitlist
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        data-hero
        style={{
          padding: "80px 40px 60px",
          display: "grid",
          gridTemplateColumns: "1.45fr 1fr",
          gap: 64,
          alignItems: "center",
          maxWidth: 1280,
          margin: "0 auto",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ display: "flex", flexDirection: "column", gap: 24 }}
        >
          {/* eyebrow */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 10px 5px 8px",
              background: "rgba(124,184,122,0.08)",
              border: `1px solid ${T.sageBorder}`,
              borderRadius: 999,
              fontSize: 11.5,
              fontFamily: T.mono,
              color: T.sage,
              letterSpacing: "0.04em",
              width: "fit-content",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                background: T.sage,
                boxShadow: "0 0 8px rgba(124,184,122,0.7)",
                flexShrink: 0,
              }}
            />
            LEARNS YOUR FAMILY · RUNS THE HOUSEHOLD · NO APP
          </div>

          {/* headline */}
          <h1
            style={{
              margin: 0,
              fontWeight: 600,
              fontSize: "clamp(42px, 5vw, 68px)",
              lineHeight: 1.04,
              letterSpacing: "-0.04em",
              color: T.warm,
            }}
          >
            The AI that runs your household.{" "}
            <span style={{ color: T.warm56 }}>
              It learns how your family works.
            </span>
          </h1>

          {/* sub */}
          <p
            style={{
              margin: 0,
              fontSize: 17,
              lineHeight: 1.55,
              color: T.warm56,
              maxWidth: 520,
            }}
          >
            Kin learns your family&apos;s patterns, keeps every schedule in
            sync, and gets smarter every week. It starts with a morning text
            that tells everyone where they need to be — no app, no group-chat
            chaos.
          </p>

          {/* secondary link */}
          <Link
            href="#how-it-works"
            style={{
              color: T.warm72,
              fontSize: 13.5,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            See how it works
            <ArrowRight size={13} />
          </Link>

          {/* pricing meta */}
          <div
            style={{
              display: "flex",
              gap: 20,
              fontSize: 11.5,
              fontFamily: T.mono,
              color: T.warm72,
              letterSpacing: "0.04em",
              flexWrap: "wrap",
            }}
          >
            <span>
              <span style={{ color: T.sage }}>$1.30/day</span> · for the whole
              family
            </span>
            <span>$39/mo · per family</span>
            <span>Founder-onboarded · invite only</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          style={{ display: "flex", justifyContent: "flex-end" }}
        >
          <PhoneDemo />
        </motion.div>
      </section>

      {/* ── // kin watches strip ──────────────────────────────────────────── */}
      <div
        data-watches
        style={{
          borderTop: `1px solid ${T.hair}`,
          borderBottom: `1px solid ${T.hair}`,
          padding: "14px 40px",
          display: "flex",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
          fontFamily: T.mono,
          fontSize: 11.5,
          color: T.warm56,
          letterSpacing: "0.02em",
          overflowX: "auto",
        }}
      >
        <span style={{ color: T.sage, flexShrink: 0, fontWeight: 500 }}>{"// kin watches"}</span>
        {watchItems.map((item, i) => (
          <span
            key={item}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              whiteSpace: "nowrap",
            }}
          >
            {item}
            {i < watchItems.length - 1 && (
              <span style={{ opacity: 0.3 }}>·</span>
            )}
          </span>
        ))}
      </div>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        data-how-it-works
        style={{
          padding: "72px 40px",
          maxWidth: 1280,
          margin: "0 auto",
          borderBottom: `1px solid ${T.hair}`,
        }}
      >
        {/* section label */}
        <div style={{
          fontFamily: T.mono, fontSize: 12, color: T.sage,
          letterSpacing: "0.1em", textTransform: "uppercase",
          marginBottom: 40, fontWeight: 600,
        }}>
          How Kin works
        </div>

        <div data-steps style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 0,
          position: "relative",
        }}>
          {/* connector line behind the cards */}
          <div data-connector style={{
            position: "absolute",
            top: 52, left: "16.6%", right: "16.6%",
            height: 1,
            background: `linear-gradient(90deg, ${T.sageBorder}, rgba(124,184,122,0.1) 50%, ${T.sageBorder})`,
            zIndex: 0,
            pointerEvents: "none",
          }} />

          {HOW_STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
              style={{
                padding: "0 24px 0",
                position: "relative", zIndex: 1,
                borderRight: i < 2 ? `1px solid ${T.hair}` : "none",
              }}
            >
              {/* step number bubble */}
              <div style={{
                width: 36, height: 36, borderRadius: 18,
                background: T.bgCard,
                border: `1px solid ${T.sageBorder}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: T.mono, fontSize: 11, color: T.sage,
                letterSpacing: "0.04em", fontWeight: 600,
                marginBottom: 20,
              }}>
                {s.n}
              </div>

              {/* illustration */}
              <div style={{
                background: T.bgCard,
                border: `1px solid ${T.hair}`,
                borderRadius: 12,
                padding: "4px 16px 16px",
                marginBottom: 20,
                minHeight: 160,
              }}>
                <s.Illustration />
              </div>

              {/* text */}
              <div style={{
                fontSize: 18, fontWeight: 500,
                letterSpacing: "-0.02em", marginBottom: 6,
              }}>
                {s.title}
              </div>
              <div style={{ fontSize: 13.5, color: T.warm72, lineHeight: 1.55 }}>
                {s.body}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Who it's for ─────────────────────────────────────────────────── */}
      <section
        id="who-its-for"
        data-personas
        style={{
          padding: "72px 40px",
          maxWidth: 1280,
          margin: "0 auto",
          borderBottom: `1px solid ${T.hair}`,
        }}
      >
        <div style={{
          fontFamily: T.mono, fontSize: 12, color: T.sage,
          letterSpacing: "0.1em", textTransform: "uppercase",
          marginBottom: 12, fontWeight: 600,
        }}>
          Who it&apos;s for
        </div>
        <h2 style={{
          margin: "0 0 10px",
          fontSize: "clamp(28px, 3.2vw, 40px)",
          letterSpacing: "-0.03em",
          fontWeight: 500,
          color: T.warm,
          lineHeight: 1.1,
        }}>
          Built for families.{" "}
          <span style={{ color: T.warm56 }}>Works for anyone who shares a life.</span>
        </h2>
        <p style={{
          fontSize: 15,
          color: T.warm56,
          margin: "0 0 32px",
          maxWidth: 600,
          lineHeight: 1.55,
        }}>
          If two or more people coordinate their day around each other, Kin
          makes it less work. Add nannies, grandparents, or anyone who helps
          with your kids — everyone stays in the loop.
        </p>

        <div data-personas-grid style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
        }}>
          {PERSONAS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              style={{
                padding: "20px",
                background: T.bgCard,
                border: `1px solid ${T.hair}`,
                borderRadius: 12,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{
                fontFamily: T.mono, fontSize: 10, color: T.sage,
                letterSpacing: "0.06em", textTransform: "uppercase",
              }}>
                {p.tag}
              </div>
              <div style={{
                fontSize: 16,
                fontWeight: 500,
                letterSpacing: "-0.015em",
                color: T.warm,
              }}>
                {p.title}
              </div>
              <div style={{ fontSize: 13, color: T.warm72, lineHeight: 1.5 }}>
                {p.body}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Interactive demo ─────────────────────────────────────────────── */}
      <InteractiveDemo />

      {/* ── Mini story — "this actually happened" ────────────────────────── */}
      <section
        data-story
        style={{
          padding: "72px 40px",
          maxWidth: 720,
          margin: "0 auto",
          borderBottom: `1px solid ${T.hair}`,
        }}
      >
        <div style={{
          fontFamily: T.mono, fontSize: 12, color: T.sage,
          letterSpacing: "0.1em", textTransform: "uppercase",
          marginBottom: 20, fontWeight: 600,
        }}>
          {"// a real Tuesday"}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{
            background: T.bgCard,
            border: `1px solid ${T.hair}`,
            borderRadius: 16,
            padding: "32px 36px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <p style={{
            margin: 0,
            fontSize: 18,
            lineHeight: 1.6,
            color: T.warm72,
            letterSpacing: "-0.01em",
          }}>
            Last Tuesday, Kin noticed Jontae&apos;s 5pm standup was likely to run
            late — it usually does. Daycare closes at 5:45. At 3:58pm, it texted
            Austin:
          </p>
          <div style={{
            alignSelf: "flex-start",
            maxWidth: "90%",
            padding: "11px 15px",
            background: "rgba(124,184,122,0.10)",
            border: `1px solid ${T.sageBorder}`,
            borderRadius: "14px 14px 14px 4px",
            fontSize: 15,
            lineHeight: 1.5,
            color: T.warm,
            letterSpacing: "-0.005em",
          }}>
            Pickup is yours today. Leave by 4:22 to make it comfortably.
          </div>
          <p style={{
            margin: 0,
            fontSize: 18,
            lineHeight: 1.6,
            color: T.warm,
            fontWeight: 500,
            letterSpacing: "-0.01em",
          }}>
            No group chat. No last-minute scramble.{" "}
            <span style={{ color: T.sage }}>Just handled.</span>
          </p>
        </motion.div>
      </section>

      {/* ── How is this different ────────────────────────────────────────── */}
      <section
        id="comparison"
        data-comparison
        style={{
          padding: "72px 40px",
          maxWidth: 1280,
          margin: "0 auto",
          borderBottom: `1px solid ${T.hair}`,
        }}
      >
        <div style={{
          fontFamily: T.mono, fontSize: 12, color: T.sage,
          letterSpacing: "0.1em", textTransform: "uppercase",
          marginBottom: 12, fontWeight: 600,
        }}>
          How is this different
        </div>
        <h2 style={{
          margin: "0 0 32px",
          fontSize: "clamp(28px, 3.2vw, 40px)",
          letterSpacing: "-0.03em",
          fontWeight: 500,
          color: T.warm,
          lineHeight: 1.1,
        }}>
          There are AI assistants. There are family apps.{" "}
          <span style={{ color: T.warm56 }}>Kin is neither.</span>
        </h2>

        <div data-comparison-grid style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
          marginBottom: 20,
        }}>
          {COMPARISON.map((c, i) => (
            <motion.div
              key={c.kind}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              style={{
                padding: "24px 22px",
                background: c.highlight ? "rgba(124,184,122,0.06)" : T.bgCard,
                border: `1px solid ${c.highlight ? T.sageBorder : T.hair}`,
                borderRadius: 12,
                display: "flex",
                flexDirection: "column",
                gap: 14,
                position: "relative",
              }}
            >
              {c.highlight && (
                <div style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  fontFamily: T.mono,
                  fontSize: 9,
                  color: T.sage,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "2px 7px",
                  background: "rgba(124,184,122,0.12)",
                  border: `1px solid ${T.sageBorder}`,
                  borderRadius: 999,
                }}>
                  Us
                </div>
              )}
              <div>
                <div style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: c.highlight ? T.sage : T.warm,
                  letterSpacing: "-0.01em",
                  marginBottom: 4,
                }}>
                  {c.kind}
                </div>
                <div style={{
                  fontFamily: T.mono,
                  fontSize: 11,
                  color: T.warm40,
                  letterSpacing: "0.04em",
                }}>
                  {c.examples}
                </div>
              </div>
              <div style={{
                fontSize: 15,
                color: c.highlight ? T.warm : T.warm72,
                lineHeight: 1.5,
                fontWeight: c.highlight ? 500 : 400,
                letterSpacing: "-0.005em",
              }}>
                {c.body}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Founder note ─────────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: 680,
          margin: "0 auto",
          padding: "56px 40px 32px",
          textAlign: "center",
        }}
      >
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          style={{
            fontSize: 18,
            lineHeight: 1.55,
            color: T.warm72,
            fontStyle: "italic",
            margin: "0 0 12px",
          }}
        >
          &ldquo;One parent always ends up being the air traffic controller — tracking everything, texting reminders, holding the whole schedule in their head. That&apos;s the thing we built Kin to fix.&rdquo;
        </motion.p>
        <p style={{ fontSize: 13, color: T.warm40, margin: 0 }}>
          — Jontae, Kin founder &amp; parent of a 2-year-old
        </p>
      </div>

      {/* ── Mid-page waitlist CTA — spot 1 of 3 ─────────────────────────── */}
      <section
        id="waitlist-top"
        style={{
          maxWidth: 560,
          margin: "0 auto",
          padding: "0 40px 72px",
          textAlign: "center",
          scrollMarginTop: 80,
        }}
      >
        <div
          style={{
            fontFamily: T.mono,
            fontSize: 11.5,
            color: T.sage,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Get on the list
        </div>
        <p
          style={{
            fontSize: 16,
            color: T.warm72,
            margin: "0 0 18px",
            lineHeight: 1.5,
          }}
        >
          We&apos;re onboarding families a few at a time. Join the waitlist and we&apos;ll text you when it&apos;s your turn.
        </p>
        <WaitlistForm source="landing_midpage" ctaLabel="Save my spot" />
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section
        id="pricing"
        data-pricing
        style={{
          borderTop: `1px solid ${T.hair}`,
          padding: "88px 40px",
          maxWidth: 1280,
          margin: "0 auto",
          scrollMarginTop: 80,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* section label */}
        <div
          style={{
            fontFamily: T.mono,
            fontSize: 12,
            color: T.sage,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontWeight: 600,
            marginBottom: 16,
          }}
        >
          Pricing
        </div>

        {/* heading */}
        <h2
          style={{
            margin: 0,
            fontWeight: 600,
            fontSize: "clamp(32px, 4vw, 48px)",
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            color: T.warm,
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          One price.{" "}
          <span style={{ color: T.warm56 }}>Both parents covered.</span>
        </h2>

        <p
          style={{
            margin: 0,
            fontSize: 16,
            lineHeight: 1.55,
            color: T.warm56,
            textAlign: "center",
            maxWidth: 520,
            marginBottom: 40,
          }}
        >
          One subscription for the whole family — no per-seat math, no
          add-ons, no surprises.
        </p>

        {/* hero price card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          data-price-card
          style={{
            width: "100%",
            maxWidth: 520,
            background: T.bgCard,
            border: `1px solid ${T.sageBorder}`,
            borderRadius: 16,
            padding: "40px 36px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
          }}
        >
          {/* hero number */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontSize: "clamp(72px, 10vw, 104px)",
                fontWeight: 600,
                lineHeight: 1,
                letterSpacing: "-0.045em",
                color: T.sage,
              }}
            >
              $39
            </span>
            <span
              style={{
                fontSize: 20,
                color: T.warm72,
                fontWeight: 500,
                letterSpacing: "-0.01em",
              }}
            >
              / month
            </span>
          </div>

          <div
            style={{
              fontSize: 14,
              color: T.warm56,
              fontFamily: T.mono,
              letterSpacing: "0.04em",
              marginBottom: 28,
            }}
          >
            per family ·{" "}
            <span style={{ color: T.warm72 }}>$1.30/day</span>
            <span style={{ color: T.warm40 }}> · less than a coffee</span>
          </div>

          {/* trust list */}
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              padding: "20px 0",
              borderTop: `1px solid ${T.hair}`,
              borderBottom: `1px solid ${T.hair}`,
              marginBottom: 24,
            }}
          >
            {[
              "Hand-onboarded by the founder",
              "Both parents, one shared brief",
              "Cancel anytime, no questions asked",
            ].map((item) => (
              <div
                key={item}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 14.5,
                  color: T.warm,
                }}
              >
                <CheckCircle2
                  size={16}
                  color={T.sage}
                  style={{ flexShrink: 0 }}
                />
                {item}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ width: "100%" }}>
            <WaitlistForm source="landing_pricing" ctaLabel="Reserve my spot" />
          </div>

          <p
            style={{
              fontSize: 13,
              color: T.warm56,
              marginTop: 16,
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            Founder-onboarded. We&apos;ll reach out personally as we open access.
          </p>
        </motion.div>
      </section>

      {/* ── Closing waitlist CTA — spot 3 of 3 ──────────────────────────── */}
      <section
        style={{
          borderTop: `1px solid ${T.hair}`,
          padding: "56px 40px",
          textAlign: "center",
          background: T.bgCard,
        }}
      >
        <h2
          style={{
            margin: "0 0 12px",
            fontSize: "clamp(28px, 3.5vw, 40px)",
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: T.warm,
          }}
        >
          Ready to drop the air traffic controller hat?
        </h2>
        <p
          style={{
            fontSize: 15,
            color: T.warm56,
            maxWidth: 520,
            margin: "0 auto 24px",
            lineHeight: 1.55,
          }}
        >
          Both parents, same page, every morning. Get on the list and we&apos;ll
          let you know the second a slot opens.
        </p>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <WaitlistForm source="landing_footer" ctaLabel="Join waitlist" />
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: `1px solid ${T.hair}`,
          padding: "24px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: 1280,
          margin: "0 auto",
        }}
      >
        <KinWordmark size={16} tone="warm" />
        <div style={{ display: "flex", gap: 20, fontSize: 12, color: T.warm40 }}>
          <Link href="/privacy" style={{ color: "inherit", textDecoration: "none" }}>Privacy</Link>
          <Link href="/terms" style={{ color: "inherit", textDecoration: "none" }}>Terms</Link>
          <Link href="/pricing" style={{ color: "inherit", textDecoration: "none" }}>Pricing</Link>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes kinPulse {
          0%, 100% { box-shadow: 0 0 22px rgba(124,184,122,0.32), 0 0 44px rgba(124,184,122,0.1); }
          50% { box-shadow: 0 0 38px rgba(124,184,122,0.55), 0 0 76px rgba(124,184,122,0.22); }
        }
        @media (max-width: 768px) {
          section { grid-template-columns: 1fr !important; gap: 32px !important; }
          nav { padding: 0 20px !important; }
          nav > div { gap: 12px !important; }
          nav > div > a:not(:last-child):not(:nth-last-child(2)) { display: none !important; }
          section[data-hero] { padding: 48px 20px 32px !important; }
          section[data-hero] > div:last-child { justify-content: center !important; }
          section[data-how-it-works] { padding: 56px 20px !important; }
          section[data-how-it-works] > div[data-steps] { grid-template-columns: 1fr !important; gap: 32px !important; }
          section[data-how-it-works] > div[data-steps] > div { border-right: none !important; padding: 0 !important; }
          section[data-how-it-works] > div[data-steps] > div[data-connector] { display: none !important; }
          section[data-personas] { padding: 56px 20px !important; }
          section[data-personas] > div[data-personas-grid] { grid-template-columns: 1fr !important; gap: 12px !important; }
          section[data-story] { padding: 56px 20px !important; }
          section[data-comparison] { padding: 56px 20px !important; }
          section[data-comparison] > div[data-comparison-grid] { grid-template-columns: 1fr !important; gap: 12px !important; }
          section[data-pricing] { padding: 56px 20px !important; }
          section[data-pricing] div[data-price-card] { padding: 32px 24px !important; }
          section[data-watches] { padding: 14px 20px !important; }
          section[data-watches] > span:first-child { width: 100% !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          section[data-personas] > div[data-personas-grid] { grid-template-columns: 1fr 1fr 1fr !important; }
        }
      ` }} />
    </main>
  );
}
