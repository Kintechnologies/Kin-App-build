"use client";

import { motion } from "framer-motion";

export function WhyDifferent() {
  return (
    <section
      style={{
        padding: "100px 24px",
        maxWidth: "640px",
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      {/* Divider */}
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{
          height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(124,184,122,0.3), transparent)",
          marginBottom: "64px",
          transformOrigin: "center",
        }}
      />

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
          marginBottom: "28px",
        }}
      >
        Why it&apos;s different
      </motion.p>

      <motion.h2
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        style={{
          fontSize: "clamp(24px, 4vw, 34px)",
          fontWeight: 600,
          color: "#F0EDE6",
          letterSpacing: "-0.8px",
          lineHeight: 1.2,
          marginBottom: "24px",
        }}
      >
        Most tools show you your schedule.{" "}
        <span style={{ color: "#7CB87A" }}>Kin tells you what it means.</span>
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
        style={{
          fontSize: "16px",
          color: "rgba(240,237,230,0.55)",
          lineHeight: 1.7,
          fontStyle: "italic",
        }}
      >
        It figures out who needs to act, what actually matters, and when you
        need to know. So you don&apos;t have to think about it.
      </motion.p>
    </section>
  );
}
