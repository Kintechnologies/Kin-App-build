"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || state === "loading") return;

    setState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setState("success");
      setEmail("");
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setTimeout(() => setState("idle"), 4000);
    }
  };

  return (
    <section
      id="waitlist"
      style={{
        padding: "100px 24px 120px",
        maxWidth: "560px",
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
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
          marginBottom: "64px",
          transformOrigin: "center",
        }}
      />

      <motion.h2
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        style={{
          fontSize: "clamp(26px, 4vw, 36px)",
          fontWeight: 600,
          color: "#F0EDE6",
          letterSpacing: "-0.8px",
          lineHeight: 1.2,
          marginBottom: "14px",
        }}
      >
        One less thing to think about — every day.
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1 }}
        style={{
          fontSize: "15px",
          fontStyle: "italic",
          color: "rgba(240,237,230,0.45)",
          marginBottom: "36px",
          lineHeight: 1.6,
        }}
      >
        Join the waitlist. We&apos;ll reach out when your spot is ready.
      </motion.p>

      {state === "success" ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background: "rgba(124,184,122,0.1)",
            border: "1px solid rgba(124,184,122,0.3)",
            borderRadius: "12px",
            padding: "20px 24px",
            boxShadow: "0 0 24px rgba(124,184,122,0.12)",
          }}
        >
          <p
            style={{
              fontSize: "15px",
              color: "#7CB87A",
              fontWeight: 500,
              letterSpacing: "-0.2px",
            }}
          >
            You&apos;re on the list. We&apos;ll be in touch soon.
          </p>
        </motion.div>
      ) : (
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            style={{
              flex: "1 1 220px",
              maxWidth: "300px",
              background: "#141810",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              padding: "12px 16px",
              fontSize: "15px",
              color: "#F0EDE6",
              outline: "none",
              boxShadow: "inset -2px -2px 4px rgba(255,255,255,0.02), inset 2px 2px 6px rgba(0,0,0,0.4)",
              transition: "border-color 200ms ease",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "rgba(124,184,122,0.4)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(255,255,255,0.1)";
            }}
          />
          <button
            type="submit"
            disabled={state === "loading"}
            style={{
              flex: "0 0 auto",
              fontSize: "15px",
              fontWeight: 500,
              color: "#0C0F0A",
              background: "#7CB87A",
              padding: "12px 24px",
              borderRadius: "10px",
              letterSpacing: "-0.2px",
              boxShadow: "0 0 20px rgba(124,184,122,0.25)",
              opacity: state === "loading" ? 0.7 : 1,
              transition: "opacity 150ms ease",
              cursor: state === "loading" ? "wait" : "pointer",
            }}
          >
            {state === "loading" ? "Joining…" : "Get early access"}
          </button>
        </motion.form>
      )}

      {state === "error" && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            marginTop: "12px",
            fontSize: "13px",
            color: "#D4748A",
          }}
        >
          {errorMsg}
        </motion.p>
      )}
    </section>
  );
}
