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
        Jontae&apos;s 5pm standup typically runs late. Daycare closes at 5:45 —
        pickup is yours today. Jackson&apos;s 2-year checkup moved to 4pm (12
        min from daycare). You&apos;re clear after 3:30.
      </SMSBubble>
      <SMSBubble from="user" time="6:14 AM">
        Can she still do pickup if her meeting ends on time?
      </SMSBubble>
      <SMSBubble from="kin" time="6:14 AM">
        I&apos;ll keep an eye on her 5pm and text you by 4:30. If it looks like
        it&apos;s running over, pickup is yours.
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

function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [alreadyOnList, setAlreadyOnList] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || submitState === "loading") return;
    setSubmitState("loading");
    setErrorMessage("");
    setAlreadyOnList(false);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
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
            gap: 10,
            padding: "20px 24px",
            background: T.bgCard,
            border: `1px solid ${T.sageBorder}`,
            borderRadius: 12,
          }}
          role="status"
        >
          <CheckCircle2 size={24} color={T.sage} />
          <p style={{ color: T.warm, fontWeight: 500, margin: 0 }}>
            {alreadyOnList ? "You already have an account." : "You're in."}
          </p>
          <p style={{ color: T.warm56, fontSize: 13, margin: 0 }}>
            Check your email — your trial is ready. Takes about 5 minutes to connect your calendars.
          </p>
          <Link
            href="/signup"
            style={{ color: T.sage, fontSize: 13, textDecoration: "none" }}
          >
            Set up your account →
          </Link>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
          noValidate
        >
          <div style={{ display: "flex", gap: 8 }}>
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
              style={{
                flex: 1,
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
              }}
            />
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
                gap: 8,
                opacity: submitState === "loading" ? 0.6 : 1,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {submitState === "loading" ? (
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <ArrowRight size={16} />
              )}
              Start free trial
            </button>
          </div>

          {submitState === "error" && errorMessage && (
            <p style={{ color: "#D4748A", fontSize: 13, margin: 0 }} role="alert">
              {errorMessage}
            </p>
          )}

          <p style={{ color: T.warm40, fontSize: 12, margin: 0 }}>
            $39/mo for your whole family. Cancel anytime, no questions asked.
          </p>
        </motion.form>
      )}
    </AnimatePresence>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const watchItems = [
  "standups running long",
  "daycare closing times",
  "pediatrician reschedules",
  "school early release",
  "commute deltas",
  "flight changes",
  "team offsites",
  "birthdays",
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
      <CalendarTile label="Google" day="29" color={T.sage} />
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
      <CalendarTile label="iCloud" day="29" color="#5B9CF6" />
    </div>
  );
}

function StepConstraintsIllustration() {
  const chips = [
    { label: "Daycare closes 5:45pm", active: true },
    { label: "Austin covers pickup Mon–Wed", active: true },
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
        Jontae&apos;s 5pm runs late. Daycare closes 5:45 — <span style={{ color: T.sage }}>pickup is yours</span>. Jackson&apos;s checkup moved to 4pm (12 min away). You&apos;re clear after 3:30.
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
        I&apos;ll watch her 5pm and text you by 4:30.
      </motion.div>
    </div>
  );
}

const HOW_STEPS = [
  {
    n: "01",
    title: "We read both calendars, so you don't have to",
    body: "Connect your Google Calendars once. Kin reads both and knows the full picture — no more \"wait, what's happening Tuesday?\"",
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
    body: "6am. One text to each of you. Today's schedule, any conflicts, anything that needs a decision. No app to open, no calendar to check. Just a text.",
    Illustration: StepBriefIllustration,
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
            How it works
          </Link>
          <Link
            href="#pricing"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            Pricing
          </Link>
          <Link
            href="/signin"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
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
            Start trial
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
            SMS · BOTH PARENTS · 6AM EVERY DAY
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
            Both parents,{" "}
            <span style={{ color: T.warm56 }}>
              same page, every morning.
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
            Every morning at 6am, Kin texts you both what&apos;s happening
            today — pickups, conflicts, who needs to be where. Text back any
            question and get an answer in seconds.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link
              href="/signup"
              style={{
                height: 44,
                padding: "0 18px",
                background: T.sage,
                color: T.bg,
                borderRadius: 8,
                fontWeight: 500,
                fontSize: 14.5,
                display: "flex",
                alignItems: "center",
                gap: 8,
                textDecoration: "none",
              }}
            >
              Start 7-day trial
            </Link>
            <Link
              href="#how-it-works"
              style={{
                height: 44,
                padding: "0 18px",
                background: "transparent",
                color: T.warm72,
                borderRadius: 8,
                fontWeight: 500,
                fontSize: 14.5,
                display: "flex",
                alignItems: "center",
                gap: 8,
                textDecoration: "none",
                border: "none",
              }}
            >
              See how it works
              <ArrowRight size={14} />
            </Link>
          </div>

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
            <span>7-day trial · cancel anytime</span>
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
          How it works
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

      {/* ── Founder note ─────────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: 680,
          margin: "0 auto",
          padding: "56px 40px",
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
          — Austin, Kin founder &amp; parent of a 2-year-old
        </p>
      </div>

      {/* ── Interactive demo ─────────────────────────────────────────────── */}
      <InteractiveDemo />

      {/* ── Pricing + waitlist ───────────────────────────────────────────── */}
      <section
        id="pricing"
        data-pricing
        style={{
          borderTop: `1px solid ${T.hair}`,
          padding: "48px 40px",
          maxWidth: 1280,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 64,
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 500,
              letterSpacing: "-0.025em",
              marginBottom: 8,
            }}
          >
            $1.30 a day.{" "}
            <span style={{ color: T.warm56 }}>Less than a coffee.</span>
          </div>
          <div style={{ fontSize: 14, color: T.warm56, lineHeight: 1.5 }}>
            One subscription covers both parents. Your first 7 days are free — cancel anytime, no penalty.
          </div>
          <div
            style={{
              marginTop: 24,
              padding: "16px 0 0",
              borderTop: `1px solid ${T.hair}`,
              display: "flex",
              gap: 28,
            }}
          >
            {[
              ["$1.30/day", "less than a coffee"],
              ["$39/mo", "per family"],
              ["7-day", "free trial"],
            ].map(([k, v]) => (
              <div key={k}>
                <div
                  style={{
                    fontFamily: T.mono,
                    fontSize: 18,
                    color: T.warm,
                    fontWeight: 500,
                  }}
                >
                  {k}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: T.warm72,
                    letterSpacing: "0.02em",
                    marginTop: 2,
                  }}
                >
                  {v}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 14, color: T.warm56 }}>
            Start your free trial today. Takes about 5 minutes to set up.
          </div>
          <WaitlistForm />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 13,
              color: T.warm56,
            }}
          >
            <span>or</span>
            <Link
              href="/signup"
              style={{
                color: T.sage,
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              create your account →
            </Link>
          </div>
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
          section[data-pricing] { padding: 40px 20px !important; }
          section[data-watches] { padding: 14px 20px !important; }
          section[data-watches] > span:first-child { width: 100% !important; }
        }
      ` }} />
    </main>
  );
}
