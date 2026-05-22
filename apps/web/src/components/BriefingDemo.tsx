"use client";

import type { CSSProperties } from "react";
import { useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { KinMark } from "./KinMark";
import { Reveal } from "./Reveal";
import { WaitlistForm } from "./WaitlistForm";

// One continuous day with Kin, told as a single SMS thread. The morning
// briefing lands as one calm text and sets up the day. Hours later the day
// shifts — a meeting slides into a pickup — and Kin catches it, texts both
// parents a fix, and closes the loop, all before anyone has to scramble.
// Messages sharing a divider render as one unbroken moment in the thread.
type Message = {
  divider: string;
  text: string;
};

const messages: Message[] = [
  {
    divider: "Today 7:03 AM",
    text: "Maya has soccer at 4:30 — you're on pickup. Tom's got a 5:00 call he can't move, so today's on you.\n\nHeads up: your 3:00 meeting runs right up against pickup. Worth building in a buffer.\n\nOne to remember — Leo's field-trip slip is due tomorrow.\n\nThat's everything. Have a good one. 💚",
  },
  {
    divider: "Today 3:47 PM",
    text: "Quick one, Sarah — your 3:00 just slid to 4:15. That lands right on top of Maya's 4:30 soccer pickup.",
  },
  {
    divider: "Today 3:47 PM",
    text: "Already on it. Maya's coach can keep her until 5:15, and Tom can break free by 4:45. I've texted you both — Tom grabs Maya, you keep your meeting.",
  },
  {
    divider: "Today 3:47 PM",
    text: "Tom's confirmed. 👍 Pickup's covered and your 4:15 is safe — sorted before it ever became a scramble. 💚",
  },
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
        <span
          key={i}
          style={{
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background: "#9A9488",
            display: "block",
            animation: `kinTypingDot 1s ease-in-out ${i * 0.18}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function DayDivider({ label }: { label: string }) {
  return (
    <span
      style={{
        fontSize: "10.5px",
        color: "#9A9488",
        textAlign: "center",
        margin: "6px 0 2px",
      }}
    >
      <strong style={{ fontWeight: 600 }}>{label.split(" ")[0]}</strong>{" "}
      {label.split(" ").slice(1).join(" ")}
    </span>
  );
}

export function BriefingDemo() {
  const phoneRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const inView = useInView(phoneRef, { once: true, margin: "-120px" });
  const [visibleCount, setVisibleCount] = useState(0);
  const [typingIndex, setTypingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!inView) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let t = 500;
    messages.forEach((message, i) => {
      if (i > 0) {
        // A long beat when the day jumps forward; a short one between
        // texts that belong to the same moment.
        const newMoment = messages[i - 1].divider !== message.divider;
        t += newMoment ? 1600 : 350;
      }
      timers.push(setTimeout(() => setTypingIndex(i), t));
      // The morning briefing is long; let the typing indicator linger.
      t += i === 0 ? 1700 : 1150;
      timers.push(
        setTimeout(() => {
          setTypingIndex(null);
          setVisibleCount(i + 1);
        }, t)
      );
      t += 700;
    });
    return () => timers.forEach(clearTimeout);
  }, [inView]);

  // Keep the newest message in view as the thread fills.
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [visibleCount, typingIndex]);

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
          A day with Kin
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
          One calm morning text.{" "}
          <span style={{ color: "var(--green)" }}>
            Then Kin handles the rest.
          </span>
        </h2>
      </Reveal>

      <Reveal delay={0.1}>
        <p
          style={{
            fontSize: "16px",
            color: "var(--ink-2)",
            textAlign: "center",
            lineHeight: 1.65,
            maxWidth: "460px",
            marginBottom: "56px",
          }}
        >
          No dashboard. No app to open. A calm briefing every morning — and
          when the day shifts, Kin sorts it before it becomes a scramble.
        </p>
      </Reveal>

      {/* Phone */}
      <div
        ref={phoneRef}
        className="kin-reveal"
        style={{
          width: "340px",
          maxWidth: "100%",
          background: "#221E17",
          borderRadius: "46px",
          padding: "12px",
          boxShadow:
            "0 2px 6px rgba(43,38,30,0.12), 0 30px 70px rgba(43,38,30,0.28)",
          "--kin-reveal-y": "36px",
        } as CSSProperties}
      >
        <div
          style={{
            background: "#FBFAF7",
            borderRadius: "35px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            height: "620px",
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
            <span>3:52</span>
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
            ref={threadRef}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              padding: "16px 14px",
              overflowY: "auto",
              scrollbarWidth: "none",
            }}
          >
            {messages.map((message, i) => {
              if (i >= visibleCount && typingIndex !== i) return null;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {(i === 0 ||
                    messages[i - 1].divider !== message.divider) && (
                    <DayDivider label={message.divider} />
                  )}
                  {i < visibleCount ? (
                    <div
                      className="kin-reveal"
                      style={{
                        alignSelf: "flex-start",
                        maxWidth: "84%",
                        background: "#E7E3DA",
                        color: "#2B261E",
                        borderRadius: "18px 18px 18px 5px",
                        padding: "11px 15px",
                        fontSize: "13.5px",
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                        animationDuration: "0.4s",
                        "--kin-reveal-y": "10px",
                      } as CSSProperties}
                    >
                      {message.text}
                    </div>
                  ) : (
                    <div className="kin-fade">
                      <TypingDots />
                    </div>
                  )}
                </div>
              );
            })}

            {visibleCount === messages.length && typingIndex === null && (
              <span
                className="kin-fade"
                style={{
                  alignSelf: "flex-end",
                  fontSize: "10px",
                  color: "#9A9488",
                  paddingRight: "4px",
                  animationDelay: "0.3s",
                }}
              >
                Delivered
              </span>
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
              Text Kin back…
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
      </div>

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
            Want Kin watching your family&apos;s day?
          </p>
          <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
            <WaitlistForm ctaText="Get Early Access" />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
