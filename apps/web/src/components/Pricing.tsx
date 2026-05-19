"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { Reveal } from "./Reveal";

const features = [
  "Both parents on the same page — every single morning",
  "A real-time heads-up the moment plans collide",
  "No more dropped pickups or forgotten permission slips",
  "Ask Kin anything, any time — full family context",
];

export function Pricing() {
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");

  const monthlyPrice = 39;
  const annualPrice = 349;
  const annualSavings = monthlyPrice * 12 - annualPrice;

  return (
    <section
      style={{
        padding: "clamp(72px, 12vw, 120px) 24px",
        maxWidth: "560px",
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
            marginBottom: "24px",
          }}
        >
          Pricing
        </p>
      </Reveal>

      <Reveal delay={0.06}>
        <h2
          style={{
            fontSize: "clamp(28px, 4.6vw, 42px)",
            fontWeight: 600,
            color: "var(--ink)",
            textAlign: "center",
            letterSpacing: "-1px",
            lineHeight: 1.14,
            marginBottom: "14px",
          }}
        >
          Simple pricing. No surprises.
        </h2>
      </Reveal>

      <Reveal delay={0.12}>
        <p
          style={{
            fontSize: "15px",
            fontStyle: "italic",
            color: "var(--ink-2)",
            textAlign: "center",
            marginBottom: "36px",
            letterSpacing: "-0.2px",
          }}
        >
          Early access members lock in this price forever.
        </p>
      </Reveal>

      {/* Toggle */}
      <Reveal delay={0.16}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "44px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              background: "var(--paper2)",
              border: "1px solid var(--border)",
              borderRadius: "11px",
              padding: "3px",
            }}
          >
            {(["monthly", "annual"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  background: p === period ? "var(--paper)" : "transparent",
                  color: p === period ? "var(--ink)" : "var(--ink-3)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow:
                    p === period ? "0 1px 4px rgba(43,38,30,0.1)" : "none",
                }}
              >
                {p === "monthly" ? "Monthly" : "Annual"}
                {p === "annual" && (
                  <span
                    style={{
                      marginLeft: "6px",
                      padding: "2px 7px",
                      background: "var(--green-soft)",
                      borderRadius: "100px",
                      fontSize: "10px",
                      fontFamily: "var(--font-geist-mono), monospace",
                      color: "var(--green)",
                      letterSpacing: "0.4px",
                    }}
                  >
                    save ${annualSavings}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Pricing card */}
      <div
        className="kin-reveal"
        style={{
          background: "var(--paper)",
          border: "1px solid var(--green-line)",
          borderRadius: "20px",
          padding: "34px",
          position: "relative",
          overflow: "hidden",
          boxShadow:
            "0 2px 4px rgba(43,38,30,0.05), 0 18px 44px rgba(43,38,30,0.1)",
          animationDelay: "0.1s",
          "--kin-reveal-y": "26px",
        } as CSSProperties}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: "var(--green)",
          }}
        />

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "4px 11px",
            background: "var(--green-soft)",
            border: "1px solid var(--green-line)",
            borderRadius: "100px",
            fontSize: "10px",
            fontFamily: "var(--font-geist-mono), monospace",
            letterSpacing: "1px",
            textTransform: "uppercase",
            color: "var(--green)",
            marginBottom: "20px",
          }}
        >
          Early Access
        </div>

        <h3
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--ink)",
            marginBottom: "8px",
            letterSpacing: "-0.2px",
          }}
        >
          Everything Kin does — for your whole family.
        </h3>

        <div style={{ marginTop: "20px", marginBottom: "4px" }}>
          <div
            key={`price-${period}`}
            className="kin-fade"
            style={{ display: "flex", alignItems: "flex-end", gap: "5px" }}
          >
            <span
              style={{
                fontSize: "clamp(34px, 4vw, 46px)",
                fontWeight: 600,
                color: "var(--ink)",
                letterSpacing: "-1.4px",
                lineHeight: 1,
              }}
            >
              ${period === "monthly" ? monthlyPrice : annualPrice}
            </span>
            <span
              style={{
                fontSize: "13px",
                color: "var(--ink-3)",
                marginBottom: "6px",
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            >
              {period === "monthly" ? "/mo" : "/yr"}
            </span>
          </div>
        </div>

        <div
          style={{
            fontSize: "12px",
            color: "var(--ink-3)",
            marginBottom: "28px",
            fontStyle: "italic",
            minHeight: "16px",
          }}
        >
          {period === "annual"
            ? `Billed once yearly (that's $${(annualPrice / 12).toFixed(0)}/mo)`
            : ""}
        </div>

        <ul
          style={{
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: "11px",
            marginBottom: "28px",
          }}
        >
          {features.map((feature, i) => (
            <li
              key={feature}
              className="kin-reveal"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                fontSize: "13.5px",
                color: "var(--ink-2)",
                lineHeight: 1.45,
                animationDelay: `${0.2 + i * 0.05}s`,
                "--kin-reveal-y": "8px",
              } as CSSProperties}
            >
              <div
                style={{
                  width: "17px",
                  height: "17px",
                  borderRadius: "50%",
                  background: "var(--green-soft)",
                  border: "1px solid var(--green-line)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "1px",
                }}
              >
                <svg width="9" height="9" viewBox="0 0 8 8" fill="none">
                  <path
                    d="M1 4l2 2 4-4"
                    stroke="#3C4A33"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <a
          href="#waitlist"
          style={{
            display: "block",
            width: "100%",
            padding: "13px",
            textAlign: "center",
            borderRadius: "11px",
            fontSize: "14px",
            fontWeight: 600,
            background: "var(--green)",
            color: "var(--paper)",
            cursor: "pointer",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            boxShadow: "0 4px 14px rgba(60,74,51,0.22)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.transform =
              "translateY(-1px)";
            (e.currentTarget as HTMLAnchorElement).style.boxShadow =
              "0 6px 18px rgba(60,74,51,0.3)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.transform =
              "translateY(0)";
            (e.currentTarget as HTMLAnchorElement).style.boxShadow =
              "0 4px 14px rgba(60,74,51,0.22)";
          }}
        >
          Claim your spot
        </a>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginTop: "14px",
            fontSize: "11px",
            fontFamily: "var(--font-geist-mono), monospace",
            color: "var(--ink-3)",
            letterSpacing: "0.3px",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: "var(--clay)",
            }}
          />
          Early access price — locked in forever
        </div>
      </div>
    </section>
  );
}
