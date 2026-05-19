"use client";

import { motion, AnimatePresence, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { KinMark } from "./KinMark";
import { Reveal } from "./Reveal";
import { WaitlistForm } from "./WaitlistForm";

const ease = [0.22, 1, 0.36, 1] as const;

// A realistic Kin morning briefing, split into the sections that arrive
// one after another — the way a real text lands on your phone.
const briefing = [
  "Good morning, Sarah. Here's your family's day. ☀️",
  "Maya has soccer at 4:30 — you're on pickup. Tom has a 5:00 call he can't move, so it's you today.",
  "Heads up: your 3:00 meeting runs right up against school dismissal. Worth building in a buffer.",
  "One to remember — Leo's field-trip slip is due tomorrow. That's everything. Have a good one. 💚",
];

function TypingDots() {
  return (
    <div
      style={{
        alignSelf: "flex-start",
        background: "#E7E3DA",
        borderRadius: "18px 18px 18px 5px",
        padding: "12px 16px",
        display: "flex",
        gap: "5px",
      }}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.3, 0.85, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
          style={{
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background: "#9A9488",
            display: "block",
          }}
        />
      ))}
    </div>
  );
}

export function BriefingDemo() {
  const phoneRef = useRef<HTMLDivElement>(null);
  const inView = useInView(phoneRef, { once: true, margin: "-120px" });
  const [visibleCount, setVisibleCount] = useState(0);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (!inView) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let t = 500;
    briefing.forEach((_, i) => {
      timers.push(setTimeout(() => setTyping(true), t));
      t += 1150;
      timers.push(
        setTimeout(() => {
          setTyping(false);
          setVisibleCount(i + 1);
        }, t)
      );
      t += 900;
    });
    return () => timers.forEach(clearTimeout);
  }, [inView]);

  return (
    <section
      style={{
        padding: "clamp(80px, 12vw, 130px) 24px",
        maxWidth: "780px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Reveal>
        <p
          style={{
            fontSize: "11px",
            fontWeight: 500,
            color: "var(--ink-3)",
            fontFamily: "var(--font-geist-mono), monospace",
            letterSpacing: "1.6px",
            textTransform: "uppercase",
            textAlign: "center",
            marginBottom: "20px",
          }}
        >
          A morning with Kin
        </p>
      </Reveal>

      <Reveal delay={0.05}>
        <h2
          style={{
            fontSize: "clamp(28px, 4.6vw, 42px)",
            fontWeight: 600,
            color: "var(--ink)",
            textAlign: "center",
            letterSpacing: "-1px",
            lineHeight: 1.14,
            marginBottom: "14px",
          }}
        >
          One text. The whole day, handled.
        </h2>
      </Reveal>

      <Reveal delay={0.1}>
        <p
          style={{
            fontSize: "16px",
            color: "var(--ink-2)",
            textAlign: "center",
            lineHeight: 1.65,
            maxWidth: "440px",
            marginBottom: "56px",
          }}
        >
          No dashboard. No app to open. Here&apos;s exactly what a Kin briefing
          looks like when it lands.
        </p>
      </Reveal>

      {/* Phone */}
      <motion.div
        ref={phoneRef}
        initial={{ opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-90px" }}
        transition={{ duration: 0.8, ease }}
        style={{
          width: "340px",
          maxWidth: "100%",
          background: "#221E17",
          borderRadius: "46px",
          padding: "12px",
          boxShadow:
            "0 2px 6px rgba(43,38,30,0.12), 0 30px 70px rgba(43,38,30,0.28)",
        }}
      >
        <div
          style={{
            background: "#FBFAF7",
            borderRadius: "35px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            height: "600px",
            position: "relative",
          }}
        >
          {/* Status bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 26px 6px",
              fontSize: "12px",
              fontWeight: 600,
              color: "#2B261E",
            }}
          >
            <span>7:03</span>
            <div
              style={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
                top: "12px",
                width: "82px",
                height: "22px",
                background: "#221E17",
                borderRadius: "20px",
              }}
            />
            <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
              <svg width="17" height="11" viewBox="0 0 17 11" fill="none">
                <rect x="0" y="6" width="3" height="5" rx="1" fill="#2B261E" />
                <rect x="4.5" y="4" width="3" height="7" rx="1" fill="#2B261E" />
                <rect x="9" y="2" width="3" height="9" rx="1" fill="#2B261E" />
                <rect x="13.5" y="0" width="3" height="11" rx="1" fill="#2B261E" />
              </svg>
              <svg width="22" height="11" viewBox="0 0 22 11" fill="none">
                <rect
                  x="0.5"
                  y="0.5"
                  width="18"
                  height="10"
                  rx="3"
                  stroke="#2B261E"
                  opacity="0.5"
                />
                <rect x="2.5" y="2.5" width="13" height="6" rx="1.5" fill="#2B261E" />
                <rect x="20" y="3.5" width="2" height="4" rx="1" fill="#2B261E" opacity="0.5" />
              </svg>
            </div>
          </div>

          {/* Conversation header */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "5px",
              padding: "10px 0 14px",
              borderBottom: "1px solid rgba(43,38,30,0.07)",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: "#EFE7D4",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <KinMark size={24} color="#3C4A33" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span
                style={{ fontSize: "13px", fontWeight: 600, color: "#2B261E" }}
              >
                Kin
              </span>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path
                  d="M4 2.5L8 6l-4 3.5"
                  stroke="#9A9488"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Thread */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              padding: "16px 14px",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                fontSize: "10.5px",
                color: "#9A9488",
                textAlign: "center",
                marginBottom: "4px",
              }}
            >
              <strong style={{ fontWeight: 600 }}>Today</strong> 7:03 AM
            </span>

            {briefing.slice(0, visibleCount).map((text, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease }}
                style={{
                  alignSelf: "flex-start",
                  maxWidth: "82%",
                  background: "#E7E3DA",
                  color: "#2B261E",
                  borderRadius: "18px 18px 18px 5px",
                  padding: "9px 14px",
                  fontSize: "13.5px",
                  lineHeight: 1.5,
                }}
              >
                {text}
              </motion.div>
            ))}

            <AnimatePresence>
              {typing && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <TypingDots />
                </motion.div>
              )}
            </AnimatePresence>

            {visibleCount === briefing.length && !typing && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                style={{
                  alignSelf: "flex-end",
                  fontSize: "10px",
                  color: "#9A9488",
                  paddingRight: "4px",
                }}
              >
                Delivered
              </motion.span>
            )}
          </div>

          {/* Input bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px 16px",
              borderTop: "1px solid rgba(43,38,30,0.07)",
            }}
          >
            <div
              style={{
                flex: 1,
                border: "1px solid rgba(43,38,30,0.16)",
                borderRadius: "16px",
                padding: "7px 14px",
                fontSize: "12.5px",
                color: "#9A9488",
              }}
            >
              iMessage
            </div>
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                background: "#E7E3DA",
                flexShrink: 0,
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* Phone CTA #2 */}
      <Reveal delay={0.1}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: "56px",
          }}
        >
          <p
            style={{
              fontSize: "16px",
              color: "var(--ink-2)",
              textAlign: "center",
              marginBottom: "20px",
              letterSpacing: "-0.2px",
            }}
          >
            Want one of these every morning?
          </p>
          <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
            <WaitlistForm ctaText="Get Early Access" />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
