"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const words = [
  "pickup",
  "dinner",
  "bedtime",
  "your meetings",
  "your partner's meetings",
  "and everything in between",
];

export function Relatability() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      style={{
        padding: "100px 24px",
        maxWidth: "720px",
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          fontSize: "clamp(28px, 4.5vw, 40px)",
          fontWeight: 600,
          color: "#F0EDE6",
          letterSpacing: "-0.8px",
          lineHeight: 1.15,
          marginBottom: "36px",
        }}
      >
        You&apos;re keeping track of everything.
      </motion.h2>

      {/* Word list */}
      <div
        ref={ref}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginBottom: "40px",
        }}
      >
        {words.map((word, i) => (
          <motion.div
            key={word}
            initial={{ opacity: 0, x: -12 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{
              duration: 0.5,
              delay: i * 0.1,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              fontSize: i < 3 ? "clamp(22px, 3.5vw, 30px)" : i === 3 || i === 4 ? "clamp(18px, 2.8vw, 24px)" : "clamp(16px, 2.2vw, 20px)",
              fontWeight: i < 3 ? 500 : 400,
              color: i < 3
                ? "#F0EDE6"
                : i < 5
                ? "rgba(240,237,230,0.7)"
                : "rgba(240,237,230,0.45)",
              letterSpacing: i < 3 ? "-0.4px" : "-0.2px",
            }}
          >
            {word}
          </motion.div>
        ))}
      </div>

      {/* Transition line */}
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.7 }}
        style={{
          fontSize: "17px",
          fontStyle: "italic",
          color: "rgba(240,237,230,0.45)",
          marginBottom: "28px",
          letterSpacing: "-0.2px",
        }}
      >
        And somehow… it still falls through sometimes.
      </motion.p>

      {/* Resolution */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.9 }}
        style={{
          display: "inline-block",
          background: "rgba(124,184,122,0.08)",
          border: "1px solid rgba(124,184,122,0.2)",
          borderRadius: "12px",
          padding: "14px 24px",
        }}
      >
        <span
          style={{
            fontSize: "17px",
            fontWeight: 500,
            color: "#7CB87A",
            letterSpacing: "-0.2px",
          }}
        >
          Kin takes that off your plate.
        </span>
      </motion.div>
    </section>
  );
}
