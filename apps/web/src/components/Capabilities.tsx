"use client";

import type { CSSProperties } from "react";
import { Reveal } from "./Reveal";

type IconName =
  | "briefing"
  | "alert"
  | "pickup"
  | "sync"
  | "activities"
  | "reminders"
  | "ask";

function Icon({ name }: { name: IconName }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "briefing":
      return (
        <svg {...common}>
          <line x1="3" y1="18" x2="21" y2="18" />
          <path d="M7 18a5 5 0 0 1 10 0" />
          <line x1="12" y1="4" x2="12" y2="7" />
          <line x1="5" y1="8" x2="6.6" y2="9.6" />
          <line x1="19" y1="8" x2="17.4" y2="9.6" />
        </svg>
      );
    case "alert":
      return (
        <svg {...common}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
      );
    case "pickup":
      return (
        <svg {...common}>
          <path d="M12 3.5 22 20H2L12 3.5Z" />
          <line x1="12" y1="10" x2="12" y2="14" />
          <line x1="12" y1="16.7" x2="12" y2="16.8" />
        </svg>
      );
    case "sync":
      return (
        <svg {...common}>
          <circle cx="9" cy="12" r="6" />
          <circle cx="15" cy="12" r="6" />
        </svg>
      );
    case "activities":
      return (
        <svg {...common}>
          <path d="M12 3.5 14.6 9l6 .5-4.6 4 1.4 5.9L12 16.3 6.6 19.4 8 13.5 3.4 9.5l6-.5L12 3.5Z" />
        </svg>
      );
    case "reminders":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v5.3L15.5 15" />
        </svg>
      );
    case "ask":
      return (
        <svg {...common}>
          <path d="M4 5h16v11H9l-4 4V5Z" />
          <line x1="8.5" y1="10.5" x2="8.5" y2="10.6" />
          <line x1="12" y1="10.5" x2="12" y2="10.6" />
          <line x1="15.5" y1="10.5" x2="15.5" y2="10.6" />
        </svg>
      );
  }
}

const capabilities: {
  icon: IconName;
  title: string;
  body: string;
  accent: string;
}[] = [
  {
    icon: "briefing",
    title: "Daily morning briefing",
    body: "One calm text every morning with everything that matters that day — no app to open.",
    accent: "#3C4A33",
  },
  {
    icon: "alert",
    title: "Real-time alerts",
    body: "The moment a plan shifts, Kin tells the parent who actually needs to know.",
    accent: "#AC6A45",
  },
  {
    icon: "pickup",
    title: "Pickup risk detection",
    body: "Kin spots coverage gaps before they turn into a 5 o'clock scramble.",
    accent: "#A98230",
  },
  {
    icon: "sync",
    title: "Partner calendar sync",
    body: "Both parents' calendars in one view, so nothing slips through the gap between you.",
    accent: "#5C6B73",
  },
  {
    icon: "activities",
    title: "Kids' activities tracked",
    body: "Practices, lessons, appointments and pickup windows — all watched for you.",
    accent: "#6E7757",
  },
  {
    icon: "reminders",
    title: "Escalating reminders",
    body: "From a gentle heads-up to “leave now” as the clock closes in.",
    accent: "#3C4A33",
  },
  {
    icon: "ask",
    title: "Ask Kin anything",
    body: "Text a question, get an answer — with your whole family's context behind it.",
    accent: "#A98230",
  },
];

export function Capabilities() {
  return (
    <section
      style={{
        padding: "clamp(72px, 11vw, 120px) 24px",
        maxWidth: "1000px",
        margin: "0 auto",
      }}
    >
      <Reveal y={0}>
        <div
          style={{
            height: "1px",
            background:
              "linear-gradient(90deg, transparent, var(--border-2), transparent)",
            marginBottom: "64px",
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
            textAlign: "center",
            marginBottom: "20px",
          }}
        >
          Everything Kin watches
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
            marginBottom: "16px",
          }}
        >
          Stop being the family air traffic controller.
        </h2>
      </Reveal>

      <Reveal delay={0.12}>
        <p
          style={{
            fontSize: "16px",
            color: "var(--ink-2)",
            textAlign: "center",
            lineHeight: 1.65,
            maxWidth: "500px",
            margin: "0 auto 56px",
          }}
        >
          Fewer arguments about who&apos;s doing what. No more dropped pickups.
          Both parents, same page — every single morning.
        </p>
      </Reveal>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "16px",
        }}
      >
        {capabilities.map((cap, i) => (
          <div
            key={cap.title}
            className="kin-reveal"
            style={{
              animationDelay: `${i * 0.06}s`,
              "--kin-reveal-y": "20px",
            } as CSSProperties}
          >
            <div
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
              }}
              style={{
                height: "100%",
                background: "var(--paper)",
                border: "1px solid var(--border)",
                borderRadius: "18px",
                padding: "24px",
                boxShadow:
                  "0 1px 2px rgba(43,38,30,0.05), 0 10px 26px rgba(43,38,30,0.06)",
                transition: "transform 0.2s ease",
                cursor: "default",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "11px",
                  background: `${cap.accent}14`,
                  border: `1px solid ${cap.accent}33`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: cap.accent,
                  marginBottom: "16px",
                }}
              >
                <Icon name={cap.icon} />
              </div>

              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "var(--ink)",
                  letterSpacing: "-0.2px",
                  marginBottom: "7px",
                }}
              >
                {cap.title}
              </h3>

              <p
                style={{
                  fontSize: "13.5px",
                  color: "var(--ink-2)",
                  lineHeight: 1.55,
                }}
              >
                {cap.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
