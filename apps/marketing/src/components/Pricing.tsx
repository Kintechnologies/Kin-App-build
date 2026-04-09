"use client";

import { motion } from "framer-motion";
import { useState } from "react";

const features = [
  "Daily morning briefing — one sharp coordination insight, every day",
  "Real-time alerts when your partner's schedule shifts and it affects you",
  "Pickup risk detection — Kin catches coverage gaps before you do",
  "Partner calendar sync — Kin sees both sides of your household",
  "Kids' schedules, activities & pickup windows — all tracked",
  "Escalating reminders — from heads-up to 'leave now' as time closes in",
  "Household memory — learns your routines and gets sharper over time",
  "Ask Kin anything — AI chat with full family context",
];

export function Pricing() {
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");

  const monthlyPrice = 39;
  const annualPrice = 349;
  const annualSavings = (monthlyPrice * 12) - annualPrice; // $119

  return (
    <section
      style={{
        padding: "clamp(72px, 12vw, 120px) 24px",
        maxWidth: "560px",
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
          marginBottom: "24px",
        }}
      >
        Pricing
      </motion.p>

      {/* Heading */}
      <motion.h2
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        style={{
          fontSize: "clamp(28px, 4.5vw, 40px)",
          fontWeight: 600,
          color: "#F0EDE6",
          textAlign: "center",
          letterSpacing: "-0.8px",
          lineHeight: 1.15,
          marginBottom: "14px",
        }}
      >
        Simple pricing. No surprises.
      </motion.h2>

      {/* Subheading */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.15 }}
        style={{
          fontSize: "15px",
          fontStyle: "italic",
          color: "rgba(240,237,230,0.55)",
          textAlign: "center",
          marginBottom: "36px",
          letterSpacing: "-0.2px",
        }}
      >
        Early access members lock in this price forever.
      </motion.p>

      {/* Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "48px",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            background: "#141810",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "10px",
            padding: "3px",
            gap: "0",
          }}
        >
          {(["monthly", "annual"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: "7px 18px",
                borderRadius: "7px",
                fontSize: "13px",
                fontWeight: 500,
                border: "none",
                background: p === period ? "#1c211a" : "transparent",
                color: p === period ? "#F0EDE6" : "rgba(240,237,230,0.55)",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow:
                  p === period ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
              }}
            >
              {p === "monthly" ? "Monthly" : "Annual"}
              {p === "annual" && (
                <span
                  style={{
                    marginLeft: "6px",
                    padding: "2px 7px",
                    background: "rgba(124,184,122,0.15)",
                    borderRadius: "100px",
                    fontSize: "10px",
                    fontFamily: "var(--font-geist-mono), monospace",
                    color: "#7CB87A",
                    letterSpacing: "0.5px",
                    display: "inline-block",
                  }}
                >
                  save ${annualSavings}
                </span>
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Pricing card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{
          duration: 0.55,
          delay: 0.25,
          ease: [0.22, 1, 0.36, 1],
        }}
        style={{
          background: "linear-gradient(145deg, #1a201a 0%, #141a12 100%)",
          border: "1px solid rgba(124,184,122,0.25)",
          borderRadius: "18px",
          padding: "32px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "1px",
            background:
              "linear-gradient(to right, transparent, rgba(124,184,122,0.4), transparent)",
          }}
        />

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.35 }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "3px 10px",
            background: "rgba(124,184,122,0.12)",
            border: "1px solid rgba(124,184,122,0.2)",
            borderRadius: "100px",
            fontSize: "10px",
            fontFamily: "var(--font-geist-mono), monospace",
            letterSpacing: "1px",
            textTransform: "uppercase",
            color: "#7CB87A",
            marginBottom: "20px",
          }}
        >
          Early Access
        </motion.div>

        {/* Card name */}
        <h3
          style={{
            fontSize: "15px",
            fontWeight: 600,
            color: "#F0EDE6",
            marginBottom: "8px",
            letterSpacing: "-0.2px",
          }}
        >
          Everything Kin does — for your whole family.
        </h3>

        {/* Price */}
        <div
          style={{
            marginTop: "20px",
            marginBottom: "6px",
          }}
        >
          <motion.div
            key={`price-${period}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "4px",
            }}
          >
            <span
              style={{
                fontSize: "clamp(32px, 4vw, 44px)",
                fontWeight: 600,
                color: "#F0EDE6",
                letterSpacing: "-1px",
                lineHeight: 1,
              }}
            >
              ${period === "monthly" ? monthlyPrice : annualPrice}
            </span>
            <span
              style={{
                fontSize: "13px",
                color: "rgba(240,237,230,0.28)",
                marginBottom: "6px",
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            >
              {period === "monthly" ? "/mo" : "/yr"}
            </span>
          </motion.div>
        </div>

        {/* Annual note */}
        <motion.div
          key={`note-${period}`}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            fontSize: "12px",
            color: "rgba(240,237,230,0.28)",
            marginBottom: "28px",
            fontStyle: "italic",
            minHeight: "16px",
          }}
        >
          {period === "annual"
            ? `Billed once yearly (that's $${(annualPrice / 12).toFixed(0)}/mo)`
            : ""}
        </motion.div>

        {/* Features list */}
        <ul
          style={{
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginBottom: "28px",
          }}
        >
          {features.map((feature, i) => (
            <motion.li
              key={feature}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.35,
                delay: 0.35 + i * 0.04,
              }}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                fontSize: "13px",
                color: "rgba(240,237,230,0.55)",
                lineHeight: 1.4,
              }}
            >
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  background: "rgba(124,184,122,0.15)",
                  border: "1px solid rgba(124,184,122,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "1px",
                }}
              >
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 8 8"
                  fill="none"
                  style={{ opacity: 0.9 }}
                >
                  <path
                    d="M1 4l2 2 4-4"
                    stroke="#7CB87A"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <span>{feature}</span>
            </motion.li>
          ))}
        </ul>

        {/* CTA button */}
        <motion.a
          href="#waitlist"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.65 }}
          whileHover={{ y: -1 }}
          style={{
            display: "block",
            width: "100%",
            padding: "12px",
            textAlign: "center",
            borderRadius: "10px",
            fontSize: "14px",
            fontWeight: 600,
            background: "#7CB87A",
            color: "#0C0F0A",
            textDecoration: "none",
            cursor: "pointer",
            marginTop: "4px",
            position: "relative",
            overflow: "hidden",
            transition: "all 0.2s ease",
            boxShadow: "0 0 20px rgba(124,184,122,0.25)",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLAnchorElement).style.opacity = "0.9";
            (e.target as HTMLAnchorElement).style.boxShadow =
              "0 6px 20px rgba(124,184,122,0.24)";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLAnchorElement).style.opacity = "1";
            (e.target as HTMLAnchorElement).style.boxShadow =
              "0 0 20px rgba(124,184,122,0.25)";
          }}
        >
          Claim your spot
        </motion.a>

        {/* Early access note */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginTop: "14px",
            fontSize: "11px",
            fontFamily: "var(--font-geist-mono), monospace",
            color: "rgba(124,184,122,0.5)",
            letterSpacing: "0.3px",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: "rgba(124,184,122,0.4)",
            }}
          />
          Early access price — locked in forever
        </div>
      </motion.div>
    </section>
  );
}
