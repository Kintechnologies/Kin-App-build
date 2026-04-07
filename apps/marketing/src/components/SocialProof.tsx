"use client";

import { motion } from "framer-motion";

const quotes = [
  {
    text: "It's the first time I haven't had to double check everything.",
    author: "Parent of 2",
  },
  {
    text: "I didn't realize how much I was keeping in my head.",
    author: "Parent of 3",
  },
  {
    text: "It just… tells me what I need to know.",
    author: "Working parent",
  },
];

export function SocialProof() {
  return (
    <section
      style={{
        padding: "80px 24px",
        maxWidth: "760px",
        margin: "0 auto",
      }}
    >
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
        Early users
      </motion.p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {quotes.map((q, i) => (
          <motion.div
            key={q.author}
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{
              duration: 0.55,
              delay: i * 0.12,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              background: "#141810",
              border: "1px solid rgba(255,255,255,0.06)",
              borderLeft: "3px solid #7CB87A",
              borderRadius: "0 12px 12px 0",
              padding: "22px 24px",
              boxShadow:
                "-2px -2px 4px rgba(255,255,255,0.02), 3px 3px 10px rgba(0,0,0,0.5)",
            }}
          >
            <p
              style={{
                fontSize: "clamp(16px, 2.5vw, 20px)",
                fontStyle: "italic",
                color: "rgba(240,237,230,0.85)",
                lineHeight: 1.55,
                letterSpacing: "-0.3px",
                marginBottom: "12px",
              }}
            >
              &ldquo;{q.text}&rdquo;
            </p>
            <span
              style={{
                fontSize: "12px",
                color: "rgba(240,237,230,0.3)",
                fontFamily: "var(--font-geist-mono), monospace",
                letterSpacing: "0.5px",
              }}
            >
              — {q.author}
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
