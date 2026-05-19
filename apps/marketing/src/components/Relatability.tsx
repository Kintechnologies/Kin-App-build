"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const words = [
  "pickup",
  "dinner",
  "bedtime",
  "your meetings",
  "your partner's meetings",
  "and everything in between",
];

const ease = [0.22, 1, 0.36, 1] as const;

export function Relatability() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      style={{
        padding: "clamp(80px, 11vw, 120px) 24px",
        maxWidth: "720px",
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <motion.h2
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease }}
        style={{
          fontSize: "clamp(28px, 4.6vw, 42px)",
          fontWeight: 600,
          color: "var(--ink)",
          letterSpacing: "-1px",
          lineHeight: 1.14,
          marginBottom: "40px",
        }}
      >
        You&apos;re keeping track of everything.
      </motion.h2>

      <div
        ref={ref}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginBottom: "44px",
        }}
      >
        {words.map((word, i) => (
          <motion.div
            key={word}
            initial={{ opacity: 0, y: 8 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: i * 0.11, ease }}
            style={{
              fontSize:
                i < 3
                  ? "clamp(22px, 3.6vw, 31px)"
                  : i < 5
                  ? "clamp(18px, 2.8vw, 24px)"
                  : "clamp(16px, 2.2vw, 20px)",
              fontWeight: i < 3 ? 500 : 400,
              color: i < 3 ? "var(--ink)" : i < 5 ? "var(--ink-2)" : "var(--ink-3)",
              letterSpacing: i < 3 ? "-0.5px" : "-0.2px",
            }}
          >
            {word}
          </motion.div>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.5 }}
        style={{
          fontSize: "17px",
          fontStyle: "italic",
          color: "var(--ink-2)",
          marginBottom: "30px",
          letterSpacing: "-0.2px",
        }}
      >
        And somehow… it still falls through sometimes.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.65, ease }}
        style={{
          display: "inline-block",
          background: "var(--green-soft)",
          border: "1px solid var(--green-line)",
          borderRadius: "100px",
          padding: "11px 24px",
        }}
      >
        <span
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--green)",
            letterSpacing: "-0.2px",
          }}
        >
          Kin takes that off your plate.
        </span>
      </motion.div>
    </section>
  );
}
