"use client";

import type { CSSProperties } from "react";
import { KinMark } from "./KinMark";
import { Reveal } from "./Reveal";

// The things Kin has quietly picked up about one family — proof that it
// accumulates context over time rather than just reading a calendar.
const learned = [
  "Maya's soccer practice tends to run 15 min long on Thursdays.",
  "Tom's Monday standup overruns — don't bank on a clean 9:30.",
  "Leo naps best 1–3pm. Kin keeps that window quiet.",
  "The Petersons are reliable carpool backup when things get tight.",
];

export function HouseholdMemory() {
  return (
    <section
      style={{
        padding: "clamp(56px, 8vw, 88px) 24px",
        maxWidth: "1000px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "clamp(32px, 5vw, 56px)",
          alignItems: "center",
        }}
      >
        {/* Pitch */}
        <div>
          <Reveal>
            <p
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--ink-3)",
                fontFamily: "var(--font-geist-mono), monospace",
                letterSpacing: "1.6px",
                textTransform: "uppercase",
                marginBottom: "20px",
              }}
            >
              It learns your family
            </p>
          </Reveal>

          <Reveal delay={0.06}>
            <h2
              style={{
                fontSize: "clamp(25px, 3.8vw, 36px)",
                fontWeight: 600,
                color: "var(--ink)",
                letterSpacing: "-0.9px",
                lineHeight: 1.18,
                marginBottom: "18px",
              }}
            >
              Kin gets{" "}
              <span style={{ color: "var(--green)" }}>
                sharper every week.
              </span>
            </h2>
          </Reveal>

          <Reveal delay={0.12}>
            <p
              style={{
                fontSize: "16px",
                color: "var(--ink-2)",
                lineHeight: 1.7,
              }}
            >
              Kin isn&apos;t a calendar bot. It builds a memory of how your
              family actually runs — which practices run late, who&apos;s
              reliable for pickup, when a meeting tends to slip. Every week,
              that memory makes the next briefing smarter.
            </p>
          </Reveal>
        </div>

        {/* Memory card */}
        <Reveal delay={0.16} y={26}>
          <div
            style={{
              background: "var(--paper)",
              border: "1px solid var(--border)",
              borderRadius: "18px",
              padding: "26px",
              position: "relative",
              overflow: "hidden",
              boxShadow:
                "0 1px 2px rgba(43,38,30,0.05), 0 14px 34px rgba(43,38,30,0.08)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "3px",
                background: "var(--green)",
              }}
            />

            {/* Card header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: "var(--green-soft)",
                  border: "1px solid var(--green-line)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <KinMark size={17} color="var(--green)" />
              </div>
              <div>
                <p
                  style={{
                    fontSize: "13.5px",
                    fontWeight: 600,
                    color: "var(--ink)",
                    letterSpacing: "-0.2px",
                  }}
                >
                  What Kin has learned
                </p>
                <p
                  style={{
                    fontSize: "11px",
                    color: "var(--ink-3)",
                    fontFamily: "var(--font-geist-mono), monospace",
                    letterSpacing: "0.3px",
                  }}
                >
                  The Reyes household
                </p>
              </div>
            </div>

            <ul
              style={{
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {learned.map((item, i) => (
                <li
                  key={item}
                  className="kin-reveal"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    fontSize: "13.5px",
                    color: "var(--ink-2)",
                    lineHeight: 1.5,
                    animationDelay: `${0.2 + i * 0.07}s`,
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
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <p
              style={{
                marginTop: "20px",
                paddingTop: "16px",
                borderTop: "1px solid var(--border)",
                fontSize: "12.5px",
                fontStyle: "italic",
                color: "var(--ink-3)",
                lineHeight: 1.5,
              }}
            >
              The longer you use Kin, the less you ever have to explain.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
