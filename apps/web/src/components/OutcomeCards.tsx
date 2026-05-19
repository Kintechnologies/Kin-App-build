"use client";

import type { CSSProperties } from "react";
import { Reveal } from "./Reveal";

const cards = [
  {
    label: "Catches conflicts before they collide",
    quote:
      "Your 4:00 and your partner's 4:00 both need a parent — one of you has to move.",
    accent: "#3C4A33",
  },
  {
    label: "Reads the weather and the roads",
    quote:
      "Rain at pickup time — send an umbrella. And leave 10 minutes early, traffic's heavy toward school.",
    accent: "#5C6B73",
  },
  {
    label: "Remembers what you'd forget",
    quote:
      "Field-trip permission slip is due tomorrow — and the dentist moved to Thursday.",
    accent: "#A98230",
  },
  {
    label: "Adjusts the moment the day shifts",
    quote:
      "School called an early release today — work just got rearranged for both of you.",
    accent: "#AC6A45",
  },
];

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
          <div
            key={card.label}
            className="kin-reveal"
            style={{
              animationDelay: `${i * 0.09}s`,
              "--kin-reveal-y": "24px",
            } as CSSProperties}
          >
            <div
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
              }}
              style={{
                background: "var(--paper)",
                border: "1px solid var(--border)",
                borderRadius: "18px",
                padding: "28px",
                boxShadow:
                  "0 1px 2px rgba(43,38,30,0.05), 0 10px 26px rgba(43,38,30,0.06)",
                position: "relative",
                overflow: "hidden",
                cursor: "default",
                transition: "transform 0.2s ease",
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
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
