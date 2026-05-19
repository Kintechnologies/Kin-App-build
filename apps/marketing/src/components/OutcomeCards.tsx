"use client";

import { motion } from "framer-motion";
import { Reveal } from "./Reveal";

const cards = [
  {
    label: "Knows when things don't line up",
    quote: "Your partner's meeting runs late — you've got pickup.",
    accent: "#3C4A33",
  },
  {
    label: "Catches tight schedules before they break",
    quote: "Back-to-back until 6, then pickup — tight stretch.",
    accent: "#A98230",
  },
  {
    label: "Adapts when plans change",
    quote: "Your 3pm cleared — you're back on for pickup.",
    accent: "#5C6B73",
  },
  {
    label: "Closes the loop",
    quote: "Pickup's sorted — you're clear for the evening.",
    accent: "#AC6A45",
  },
];

const ease = [0.22, 1, 0.36, 1] as const;

export function OutcomeCards() {
  return (
    <section
      style={{
        padding: "clamp(60px, 9vw, 90px) 24px",
        maxWidth: "880px",
        margin: "0 auto",
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
            marginBottom: "48px",
          }}
        >
          What Kin does
        </p>
      </Reveal>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))",
          gap: "18px",
        }}
      >
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: i * 0.09, ease }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            style={{
              background: "var(--paper)",
              border: "1px solid var(--border)",
              borderRadius: "18px",
              padding: "28px",
              boxShadow: "0 1px 2px rgba(43,38,30,0.05), 0 10px 26px rgba(43,38,30,0.06)",
              position: "relative",
              overflow: "hidden",
              cursor: "default",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "3px",
                background: card.accent,
              }}
            />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "9px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: card.accent,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--ink)",
                  letterSpacing: "-0.2px",
                  lineHeight: 1.35,
                }}
              >
                {card.label}
              </span>
            </div>

            <p
              style={{
                fontSize: "14px",
                fontStyle: "italic",
                color: "var(--ink-2)",
                lineHeight: 1.55,
                paddingLeft: "14px",
                borderLeft: `2px solid ${card.accent}55`,
              }}
            >
              &ldquo;{card.quote}&rdquo;
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
