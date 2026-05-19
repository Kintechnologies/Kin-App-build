"use client";

import { Reveal } from "./Reveal";

export function WhyDifferent() {
  return (
    <section
      style={{
        padding: "clamp(80px, 11vw, 120px) 24px",
        maxWidth: "640px",
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <Reveal y={0}>
        <div
          style={{
            height: "1px",
            background:
              "linear-gradient(90deg, transparent, var(--border-2), transparent)",
            marginBottom: "60px",
          }}
        />
      </Reveal>

      <Reveal>
        <p
          style={{
            fontSize: "11px",
            fontWeight: 500,
            color: "var(--ink-3)",
            fontFamily: "var(--font-geist-mono), monospace",
            letterSpacing: "1.6px",
            textTransform: "uppercase",
            marginBottom: "26px",
          }}
        >
          Why it&apos;s different
        </p>
      </Reveal>

      <Reveal delay={0.08}>
        <h2
          style={{
            fontSize: "clamp(25px, 4vw, 36px)",
            fontWeight: 600,
            color: "var(--ink)",
            letterSpacing: "-0.9px",
            lineHeight: 1.2,
            marginBottom: "22px",
          }}
        >
          Most tools show you your schedule.{" "}
          <span style={{ color: "var(--green)" }}>
            Kin tells you what it means.
          </span>
        </h2>
      </Reveal>

      <Reveal delay={0.16}>
        <p
          style={{
            fontSize: "16px",
            color: "var(--ink-2)",
            lineHeight: 1.7,
            fontStyle: "italic",
          }}
        >
          It figures out who needs to act, what actually matters, and when you
          need to know. So you don&apos;t have to think about it.
        </p>
      </Reveal>
    </section>
  );
}
