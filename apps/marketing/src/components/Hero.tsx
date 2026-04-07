"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const chatMessages = [
  {
    id: 1,
    text: "Are you getting Ava?",
    side: "right" as const,
    delay: 0.8,
  },
  {
    id: 2,
    text: "I thought you were…",
    side: "left" as const,
    delay: 2.0,
  },
  {
    id: 3,
    text: "Your partner's tied up — pickup's on you. I'll remind you when it's time to leave.",
    side: "kin" as const,
    delay: 3.4,
  },
];

function ChatBubble({
  message,
  visible,
}: {
  message: (typeof chatMessages)[0];
  visible: boolean;
}) {
  const isKin = message.side === "kin";
  const isRight = message.side === "right";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{
            display: "flex",
            justifyContent: isRight ? "flex-end" : isKin ? "center" : "flex-start",
            width: "100%",
          }}
        >
          {isKin ? (
            <div
              style={{
                background: "rgba(124,184,122,0.08)",
                border: "1px solid rgba(124,184,122,0.28)",
                borderRadius: "14px",
                padding: "14px 18px",
                maxWidth: "340px",
                width: "100%",
                boxShadow: "0 0 24px rgba(124,184,122,0.12), 0 0 48px rgba(124,184,122,0.05)",
                position: "relative",
              }}
            >
              {/* Kin label */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "8px",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="20" r="8" fill="#7CB87A" />
                  <circle cx="21.75" cy="37.9" r="9" fill="#7CB87A" />
                  <circle cx="42.25" cy="37.9" r="9" fill="#7CB87A" />
                </svg>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 500,
                    color: "#7CB87A",
                    fontFamily: "var(--font-geist-mono), monospace",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                  }}
                >
                  Kin
                </span>
              </div>
              <p
                style={{
                  fontSize: "14px",
                  color: "#F0EDE6",
                  lineHeight: 1.55,
                  fontStyle: "italic",
                }}
              >
                {message.text}
              </p>
            </div>
          ) : (
            <div
              style={{
                background: "#1c211a",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: isRight ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                padding: "10px 14px",
                maxWidth: "240px",
                boxShadow: "-2px -2px 4px rgba(255,255,255,0.02), 3px 3px 8px rgba(0,0,0,0.5)",
              }}
            >
              <p
                style={{
                  fontSize: "14px",
                  color: "rgba(240,237,230,0.88)",
                  lineHeight: 1.5,
                }}
              >
                {message.text}
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Hero() {
  const [visibleMessages, setVisibleMessages] = useState<Set<number>>(new Set());

  useEffect(() => {
    const timers = chatMessages.map((msg) =>
      setTimeout(() => {
        setVisibleMessages((prev) => new Set([...prev, msg.id]));
      }, msg.delay * 1000)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const scrollToWaitlist = () => {
    document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 24px 60px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient green glow */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "400px",
          background: "radial-gradient(ellipse at center, rgba(124,184,122,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Subtle grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 0%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 0%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: "640px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0",
        }}
      >
        {/* Label */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(124,184,122,0.08)",
            border: "1px solid rgba(124,184,122,0.2)",
            borderRadius: "100px",
            padding: "5px 12px 5px 8px",
            marginBottom: "28px",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="20" r="8" fill="#7CB87A" />
            <circle cx="21.75" cy="37.9" r="9" fill="#7CB87A" />
            <circle cx="42.25" cy="37.9" r="9" fill="#7CB87A" />
          </svg>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 500,
              color: "#7CB87A",
              fontFamily: "var(--font-geist-mono), monospace",
              letterSpacing: "1.2px",
              textTransform: "uppercase",
            }}
          >
            Early access open
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontSize: "clamp(36px, 6vw, 56px)",
            fontWeight: 600,
            color: "#F0EDE6",
            textAlign: "center",
            letterSpacing: "-1.5px",
            lineHeight: 1.1,
            marginBottom: "20px",
          }}
        >
          Stop keeping your family schedule in your head
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          style={{
            fontSize: "17px",
            color: "rgba(240,237,230,0.55)",
            textAlign: "center",
            lineHeight: 1.65,
            maxWidth: "460px",
            marginBottom: "44px",
            fontStyle: "italic",
          }}
        >
          Kin watches your family&apos;s schedule and tells you what matters — before you have to figure it out yourself.
        </motion.p>

        {/* Chat window */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          style={{
            width: "100%",
            background: "#141810",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "18px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            minHeight: "180px",
            boxShadow: "-3px -3px 8px rgba(255,255,255,0.02), 4px 4px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
            marginBottom: "36px",
          }}
        >
          {chatMessages.map((msg) => (
            <ChatBubble
              key={msg.id}
              message={msg}
              visible={visibleMessages.has(msg.id)}
            />
          ))}

          {/* Typing indicator */}
          {!visibleMessages.has(3) && visibleMessages.size > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "4px",
                padding: "8px 0",
              }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                  style={{
                    width: "5px",
                    height: "5px",
                    borderRadius: "50%",
                    background: "#7CB87A",
                  }}
                />
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* CTA */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          onClick={scrollToWaitlist}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            fontSize: "15px",
            fontWeight: 500,
            color: "#0C0F0A",
            background: "#7CB87A",
            padding: "12px 28px",
            borderRadius: "10px",
            letterSpacing: "-0.2px",
            boxShadow: "0 0 20px rgba(124,184,122,0.25), 0 0 40px rgba(124,184,122,0.08)",
            cursor: "pointer",
          }}
        >
          Get early access
        </motion.button>
      </div>
    </section>
  );
}
