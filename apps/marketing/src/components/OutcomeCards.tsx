"use client";

import { motion } from "framer-motion";

const cards = [
  {
    label: "Knows when things don't line up",
    quote: "Your partner's meeting runs late — you've got pickup.",
    accent: "#7CB87A",
  },
  {
    label: "Catches tight schedules before they break",
    quote: "Back-to-back until 6, then pickup — tight stretch.",
    accent: "#D4A843",
  },
  {
    label: "Adapts when plans change",
    quote: "Your 3pm cleared — you're back on for pickup.",
    accent: "#7AADCE",
  },
  {
    label: "Closes the loop",
    quote: "Pickup's sorted — you're clear for the evening.",
    accent: "#A07EC8",
  },
];

export function OutcomeCards() {
  return (
    <section
      style={{
        padding: "80px 24px",
        maxWidth: "1080px",
        margin: "0 auto",
      }}
    >
      {/* Section label */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        style={{
          fontSize: "11px",
          fontWeight: 500,
          color: "rgba(240,237,230,0.35)",
          fontFamily: "var(--font-geist-mono), monospace",
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          textAlign: "center",
          marginBottom: "48px",
        }}
      >
        What Kin does
      </motion.p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
        }}
      >
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{
              duration: 0.55,
              delay: i * 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            style={{
              background: "#141810",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "16px",
              padding: "28px",
              boxShadow:
                "-3px -3px 8px rgba(255,255,255,0.025), 4px 4px 14px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
              position: "relative",
              overflow: "hidden",
              cursor: "default",
            }}
          >
            {/* Top accent bar */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: "28px",
                right: "28px",
                height: "1px",
                background: `linear-gradient(90deg, transparent, ${card.accent}40, transparent)`,
              }}
            />

            {/* Ambient glow */}
            <div
              style={{
                position: "absolute",
                top: "-40px",
                left: "-20px",
                width: "200px",
                height: "200px",
                background: `radial-gradient(circle, ${card.accent}08 0%, transparent 70%)`,
                pointerEvents: "none",
              }}
            />

            <div style={{ position: "relative", zIndex: 1 }}>
              {/* Label */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: card.accent,
                    flexShrink: 0,
                    boxShadow: `0 0 8px ${card.accent}60`,
                  }}
                />
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#F0EDE6",
                    letterSpacing: "-0.2px",
                    lineHeight: 1.35,
                  }}
                >
                  {card.label}
                </span>
              </div>

              {/* Quote */}
              <p
                style={{
                  fontSize: "14px",
                  fontStyle: "italic",
                  color: "rgba(240,237,230,0.5)",
                  lineHeight: 1.55,
                  paddingLeft: "14px",
                  borderLeft: `2px solid ${card.accent}30`,
                }}
              >
                &ldquo;{card.quote}&rdquo;
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
