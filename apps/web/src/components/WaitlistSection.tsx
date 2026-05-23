"use client";

import { Reveal } from "./Reveal";
import { WaitlistForm } from "./WaitlistForm";

export function WaitlistSection() {
  return (
    <section
      id="waitlist"
      style={{
        padding: "clamp(80px, 12vw, 130px) 24px",
        margin: "0 auto",
        maxWidth: "720px",
      }}
    >
      <Reveal y={0}>
        <div
          style={{
            height: "1px",
            background:
              "linear-gradient(90deg, transparent, var(--border-2), transparent)",
            marginBottom: "64px",
          }}
        />
      </Reveal>

      <div
        style={{
          background: "var(--paper)",
          border: "1px solid var(--border)",
          borderRadius: "24px",
          padding: "clamp(36px, 6vw, 56px)",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxShadow: "0 2px 4px rgba(43,38,30,0.05), 0 18px 44px rgba(43,38,30,0.09)",
        }}
      >
        <Reveal>
          <h2
            style={{
              fontSize: "clamp(27px, 4.4vw, 40px)",
              fontWeight: 600,
              color: "var(--ink)",
              letterSpacing: "-1px",
              lineHeight: 1.16,
              marginBottom: "14px",
            }}
          >
            One less thing to think about — every day.
          </h2>
        </Reveal>

        <Reveal delay={0.08}>
          <p
            style={{
              fontSize: "16px",
              fontStyle: "italic",
              color: "var(--ink-2)",
              marginBottom: "34px",
              lineHeight: 1.6,
              maxWidth: "420px",
            }}
          >
            Join the waitlist. We&apos;ll text you when your spot is ready.
          </p>
        </Reveal>

        <Reveal delay={0.14}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            {/* Unified CTA copy (audit V7 P2-L5). */}
            <WaitlistForm ctaText="Get Early Access" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
