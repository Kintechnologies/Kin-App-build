"use client";

import type { CSSProperties } from "react";
import { Reveal } from "./Reveal";

/**
 * The "this isn't another shared calendar" moment. The page has just shown a
 * phone demo — visitors are wondering "couldn't I do this myself?". This
 * section answers that head-on with a side-by-side: calendars surface events,
 * Kin surfaces decisions.
 */

type Row = {
  label: string;
  calendar: string;
  kin: string;
};

const rows: Row[] = [
  {
    label: "When the day changes",
    calendar: "You notice — if you happen to look.",
    kin: "Kin texts the parent who needs to know.",
  },
  {
    label: "Pickup at 4:30",
    calendar: "Shows up as a calendar block.",
    kin: "Knows whose turn, flags traffic, builds a buffer.",
  },
  {
    label: "Two meetings collide",
    calendar: "Two events. Same color.",
    kin: "Catches the conflict and offers a fix.",
  },
  {
    label: "Permission slip due",
    calendar: "Whatever you remembered to type in.",
    kin: "Tracked from the email. Surfaced the night before.",
  },
];

export function WhyDifferent() {
  return (
    <section
      style={{
        padding: "clamp(96px, 12vw, 140px) 24px",
        maxWidth: "1040px",
        margin: "0 auto",
      }}
    >
      <Reveal y={0}>
        <div className="kin-hairline" style={{ marginBottom: "72px" }} />
      </Reveal>

      {/* ── Heading block ────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          textAlign: "center",
          marginBottom: "clamp(48px, 7vw, 80px)",
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
              marginBottom: "26px",
            }}
          >
            Why it&apos;s different
          </p>
        </Reveal>

        <Reveal delay={0.08}>
          <h2
            style={{
              fontSize: "clamp(30px, 4.4vw, 46px)",
              fontWeight: 600,
              color: "var(--ink)",
              letterSpacing: "-1.2px",
              lineHeight: 1.1,
              marginBottom: "22px",
            }}
          >
            Calendars show your schedule.{" "}
            <span style={{ fontStyle: "italic", color: "var(--green)" }}>
              Kin tells you what it means.
            </span>
          </h2>
        </Reveal>

        <Reveal delay={0.16}>
          <p
            style={{
              fontSize: "17px",
              color: "var(--ink-2)",
              lineHeight: 1.7,
              maxWidth: "560px",
              margin: "0 auto",
            }}
          >
            A shared calendar still leaves you running the whole operation in
            your head. Kin reads it for you — figures out who has to act, what
            actually matters, and when you need to know.
          </p>
        </Reveal>
      </div>

      {/* ── Comparison card ─────────────────────────────────────────── */}
      <Reveal delay={0.22} y={24}>
        <div
          style={{
            background: "var(--paper)",
            border: "1px solid var(--border)",
            borderRadius: "22px",
            overflow: "hidden",
            boxShadow:
              "0 1px 2px rgba(43,38,30,0.05), 0 22px 50px rgba(43,38,30,0.08)",
          }}
        >
          {/* Column headers */}
          <div
            className="kin-compare-head"
            style={{
              borderBottom: "1px solid var(--border)",
              background:
                "linear-gradient(180deg, rgba(43,38,30,0.025), transparent)",
            }}
          >
            <div
              style={{
                padding: "22px 24px",
                fontSize: "11px",
                fontWeight: 500,
                fontFamily: "var(--font-geist-mono), monospace",
                letterSpacing: "1.4px",
                textTransform: "uppercase",
                color: "var(--ink-3)",
              }}
            >
              The moment
            </div>
            <div
              style={{
                padding: "22px 24px",
                fontSize: "11px",
                fontWeight: 500,
                fontFamily: "var(--font-geist-mono), monospace",
                letterSpacing: "1.4px",
                textTransform: "uppercase",
                color: "var(--ink-3)",
                borderLeft: "1px solid var(--border)",
              }}
            >
              A shared calendar
            </div>
            <div
              style={{
                padding: "22px 24px",
                fontSize: "11px",
                fontWeight: 600,
                fontFamily: "var(--font-geist-mono), monospace",
                letterSpacing: "1.4px",
                textTransform: "uppercase",
                color: "var(--green)",
                borderLeft: "1px solid var(--green-line)",
                background: "var(--green-soft)",
              }}
            >
              Kin
            </div>
          </div>

          {/* Rows */}
          {rows.map((row, i) => (
            <div
              key={row.label}
              className="kin-reveal kin-compare-row"
              style={{
                borderBottom:
                  i === rows.length - 1 ? "none" : "1px solid var(--border)",
                animationDelay: `${0.28 + i * 0.07}s`,
                "--kin-reveal-y": "10px",
              } as CSSProperties}
            >
              <div
                style={{
                  padding: "22px 24px",
                  fontSize: "14.5px",
                  fontWeight: 600,
                  color: "var(--ink)",
                  letterSpacing: "-0.2px",
                  lineHeight: 1.45,
                }}
              >
                {row.label}
              </div>
              <div
                style={{
                  padding: "22px 24px",
                  fontSize: "14.5px",
                  color: "var(--ink-2)",
                  lineHeight: 1.55,
                  borderLeft: "1px solid var(--border)",
                }}
              >
                {row.calendar}
              </div>
              <div
                style={{
                  padding: "22px 24px",
                  fontSize: "14.5px",
                  color: "var(--ink)",
                  lineHeight: 1.55,
                  borderLeft: "1px solid var(--green-line)",
                  background: "rgba(60,74,51,0.04)",
                  fontWeight: 500,
                }}
              >
                {row.kin}
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={0.34}>
        <p
          style={{
            marginTop: "36px",
            fontSize: "15px",
            color: "var(--ink-2)",
            textAlign: "center",
            fontStyle: "italic",
            letterSpacing: "-0.2px",
          }}
        >
          One less operating system in your head.
        </p>
      </Reveal>

    </section>
  );
}
