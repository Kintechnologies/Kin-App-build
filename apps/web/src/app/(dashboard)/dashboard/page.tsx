"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  MessageSquare,
  CalendarCheck,
  Users,
  CreditCard,
  Settings as SettingsIcon,
  Clock,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PhoneBrief from "@/components/dashboard/PhoneBrief";

// ─── tokens ──────────────────────────────────────────────────────────────────
const T = {
  bg: "var(--bg)",
  bgCard: "var(--bg-card)",
  bgElev: "var(--bg-elev)",
  warm: "var(--warm)",
  warm72: "var(--warm-72)",
  warm56: "var(--warm-56)",
  warm40: "var(--warm-40)",
  warm12: "var(--warm-12)",
  warm06: "var(--warm-06)",
  hair: "var(--hair)",
  hairStrong: "var(--hair-strong)",
  sage: "var(--sage)",
  sage12: "var(--sage-12)",
  sage20: "var(--sage-20)",
  sage40: "var(--sage-40)",
  hairSage: "var(--hair-sage)",
  mono: "var(--font-geist-mono), 'Geist Mono', monospace",
  serif: "var(--font-instrument-serif), 'Playfair Display', serif",
};

// ─── helpers ─────────────────────────────────────────────────────────────────
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDateRow(d = new Date()): string {
  const day = d
    .toLocaleDateString("en-US", { weekday: "short" })
    .toUpperCase();
  const month = d
    .toLocaleDateString("en-US", { month: "short" })
    .toUpperCase();
  const date = d.getDate();
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${day} · ${month} ${date} · ${time}`;
}

function formatTrialEnd(trialEndMs?: number | null): string {
  const d = trialEndMs
    ? new Date(trialEndMs * 1000)
    : (() => {
        const now = new Date();
        now.setDate(now.getDate() + 7);
        return now;
      })();
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── card primitives ─────────────────────────────────────────────────────────
function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "#FDFBF7",
        border: `0.5px solid ${T.hair}`,
        borderRadius: 8,
        padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function PhaseTag({
  label,
  tone = "sage",
}: {
  label: string;
  tone?: "sage" | "muted";
}) {
  const isSage = tone === "sage";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 8px",
        borderRadius: 999,
        fontFamily: T.mono,
        fontSize: 9.5,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: isSage ? T.sage : T.warm56,
        background: isSage ? T.sage12 : T.warm06,
        border: `0.5px solid ${isSage ? T.hairSage : T.hair}`,
      }}
    >
      {label}
    </span>
  );
}

// ─── timeline row ────────────────────────────────────────────────────────────
type TimelineRow = {
  time: string;
  tag: "brief" | "reply" | "alert" | "sync";
  text: string;
  done?: boolean;
};

const TIMELINE: TimelineRow[] = [
  {
    time: "06:02",
    tag: "brief",
    text: "Sent morning brief to you and Sam — both opened it.",
    done: true,
  },
  {
    time: "06:14",
    tag: "reply",
    text: "Sam replied: \"I'll grab Nora at 5:45. You handle Emma's soccer.\"",
    done: true,
  },
  {
    time: "07:31",
    tag: "sync",
    text: "Pulled 4 new work events — sprint planning landed on your 2pm.",
    done: true,
  },
  {
    time: "08:42",
    tag: "alert",
    text: "Pickup conflict resolved — Sam confirmed Nora's 5:45 daycare.",
    done: true,
  },
];

const TAG_COLOR: Record<TimelineRow["tag"], string> = {
  brief: T.sage,
  reply: T.warm72,
  alert: "#C4A97D", // amber
  sync: T.warm56,
};

function TimelineRowView({ row }: { row: TimelineRow }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "56px 64px 1fr auto",
        gap: 12,
        alignItems: "start",
        padding: "10px 0",
        borderTop: `0.5px solid ${T.hair}`,
      }}
    >
      <div
        style={{
          fontFamily: T.mono,
          fontSize: 11,
          color: T.warm40,
          letterSpacing: "0.04em",
          paddingTop: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {row.time}
      </div>
      <div>
        <span
          style={{
            display: "inline-block",
            padding: "2px 7px",
            borderRadius: 4,
            fontFamily: T.mono,
            fontSize: 9.5,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: TAG_COLOR[row.tag],
            background: "rgba(44,44,40,0.04)",
            border: `0.5px solid ${T.hair}`,
          }}
        >
          {row.tag}
        </span>
      </div>
      <div
        style={{
          fontSize: 13,
          color: T.warm72,
          letterSpacing: "-0.005em",
          lineHeight: 1.45,
        }}
      >
        {row.text}
      </div>
      <div style={{ paddingTop: 1 }}>
        {row.done && <CheckCircle2 size={14} style={{ color: T.sage }} />}
      </div>
    </div>
  );
}

// ─── briefing card ───────────────────────────────────────────────────────────
function BriefingCard() {
  return (
    <Card
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      {/* header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: T.sage12,
              border: `0.5px solid ${T.hairSage}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: T.sage,
            }}
          >
            <MessageSquare size={14} strokeWidth={1.8} />
          </div>
          <div>
            <div
              style={{
                fontSize: 14,
                color: T.warm,
                fontWeight: 500,
                letterSpacing: "-0.01em",
              }}
            >
              Morning briefing
            </div>
            <div
              style={{
                fontFamily: T.mono,
                fontSize: 10.5,
                color: T.warm40,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginTop: 2,
              }}
            >
              Delivered 6:02 AM · 1 conflict resolved
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <PhaseTag label="Day 1 · YC ship" tone="sage" />
        </div>
      </div>

      {/* body grid */}
      <div
        className="kin-brief-body"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px, 240px) 1fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        <PhoneBrief width={240} height={420} />

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div
            style={{
              fontFamily: T.mono,
              fontSize: 10.5,
              color: T.warm40,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "4px 0 2px",
            }}
          >
            {"// today's timeline"}
          </div>
          {TIMELINE.map((row) => (
            <TimelineRowView key={row.time} row={row} />
          ))}

          {/* Conflict resolved callout */}
          <div
            style={{
              marginTop: 12,
              padding: "12px 14px",
              borderRadius: 10,
              background: T.sage12,
              border: `0.5px solid ${T.hairSage}`,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                fontFamily: T.mono,
                fontSize: 10.5,
                color: T.sage,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              {"// CONFLICT RESOLVED"}
            </div>
            <div
              style={{
                fontSize: 13,
                color: T.warm72,
                lineHeight: 1.5,
                letterSpacing: "-0.005em",
              }}
            >
              Sam&apos;s 5pm wrap covered Nora&apos;s 5:45 daycare. You kept
              your sprint planning + design review back-to-back — no reschedule
              needed.
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1100px) {
          .kin-brief-body { grid-template-columns: 1fr !important; justify-items: center; }
        }
      `}</style>
    </Card>
  );
}

// ─── this week card ──────────────────────────────────────────────────────────
type Day = {
  label: string;
  date: string;
  events: { time: string; title: string; who?: string; conflict?: boolean }[];
};

const WEEK: Day[] = [
  {
    label: "Today",
    date: "Fri",
    events: [
      { time: "9:30a", title: "Standup", who: "you" },
      { time: "11:00a", title: "Sprint planning", who: "you" },
      { time: "3:00p", title: "Emma · soccer practice", who: "you" },
      { time: "5:45p", title: "Nora · daycare pickup", who: "Sam" },
    ],
  },
  {
    label: "Mon",
    date: "May 5",
    events: [
      { time: "9:30a", title: "Standup", who: "you" },
      { time: "10:00a", title: "Sam · 1:1 with manager", who: "Sam" },
      { time: "2:00p", title: "Design review", who: "you" },
      { time: "5:45p", title: "Nora · daycare pickup", who: "you" },
    ],
  },
  {
    label: "Tue",
    date: "May 6",
    events: [
      { time: "9:00a", title: "Standup · both of you", conflict: true },
      { time: "2:00p", title: "Nora · pediatrician (18-mo)", who: "you" },
      { time: "7:00p", title: "Date night · Oleana", who: "shared" },
    ],
  },
];

function ThisWeekCard() {
  return (
    <Card>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 13.5,
            color: T.warm,
            fontWeight: 500,
            letterSpacing: "-0.005em",
          }}
        >
          This week
        </div>
        <Link
          href="/calendar"
          style={{
            fontFamily: T.mono,
            fontSize: 10.5,
            color: T.sage,
            letterSpacing: "0.06em",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          OPEN
          <ArrowRight size={11} />
        </Link>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {WEEK.map((day) => (
          <div key={day.label}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 12.5,
                  color: day.label === "Today" ? T.sage : T.warm,
                  fontWeight: 500,
                  letterSpacing: "-0.005em",
                }}
              >
                {day.label}
              </span>
              <span
                style={{
                  fontFamily: T.mono,
                  fontSize: 10,
                  color: T.warm40,
                  letterSpacing: "0.06em",
                }}
              >
                {day.date}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {day.events.map((e, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "52px 1fr auto",
                    gap: 10,
                    alignItems: "baseline",
                  }}
                >
                  <span
                    style={{
                      fontFamily: T.mono,
                      fontSize: 11,
                      color: T.warm40,
                      letterSpacing: "0.02em",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {e.time}
                  </span>
                  <span
                    style={{
                      fontSize: 12.5,
                      color: e.conflict ? "#C4A97D" : T.warm72,
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {e.title}
                  </span>
                  {e.who && (
                    <span
                      style={{
                        fontFamily: T.mono,
                        fontSize: 9.5,
                        color: T.warm40,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      {e.who}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── coverage card ───────────────────────────────────────────────────────────
type Coverage = { who: string; doing: string; window: string; tone: "you" | "partner" | "shared" };

const COVERAGE: Coverage[] = [
  { who: "You", doing: "Emma · soccer practice + drop-off", window: "3:00 – 4:30 PM", tone: "you" },
  { who: "Sam", doing: "Nora · daycare pickup", window: "5:45 PM", tone: "partner" },
  { who: "Together", doing: "Family dinner", window: "6:30 PM", tone: "shared" },
];

function CoverageCard() {
  return (
    <Card>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 13.5,
            color: T.warm,
            fontWeight: 500,
            letterSpacing: "-0.005em",
          }}
        >
          Today&apos;s coverage
        </div>
        <PhaseTag label="Resolved" tone="sage" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {COVERAGE.map((c, i) => {
          const accent =
            c.tone === "you" ? T.sage : c.tone === "partner" ? "#7A8C6A" : T.warm72;
          return (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "70px 1fr auto",
                gap: 10,
                alignItems: "baseline",
                padding: "10px 12px",
                borderRadius: 8,
                border: `0.5px solid ${T.hair}`,
                background: "#FDFBF7",
              }}
            >
              <span
                style={{
                  fontFamily: T.mono,
                  fontSize: 10.5,
                  color: accent,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                {c.who}
              </span>
              <span
                style={{
                  fontSize: 12.5,
                  color: T.warm72,
                  letterSpacing: "-0.005em",
                  lineHeight: 1.4,
                }}
              >
                {c.doing}
              </span>
              <span
                style={{
                  fontFamily: T.mono,
                  fontSize: 10.5,
                  color: T.warm40,
                  letterSpacing: "0.04em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {c.window}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── welcome modal ───────────────────────────────────────────────────────────
const WELCOME_CHECKLIST = [
  "Your 6am briefings start tomorrow",
  "Both calendars synced",
  "Text Kin anytime with questions",
];

function WelcomeModal({
  firstName,
  trialEnd,
  onDismiss,
}: {
  firstName: string | null;
  trialEnd: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-heading"
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(60,74,51,0.2)",
          backdropFilter: "blur(8px)",
        }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
          background: T.bgCard,
          border: `0.5px solid ${T.hairStrong}`,
          borderRadius: 8,
          padding: 28,
          boxShadow: "0 24px 80px rgba(60,74,51,0.16)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              background: T.sage12,
              border: `0.5px solid ${T.hairSage}`,
              color: T.sage,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              fontWeight: 600,
              fontSize: 22,
              letterSpacing: "-0.045em",
            }}
          >
            kin
          </div>
          <div>
            <h2
              id="welcome-heading"
              style={{
                fontFamily: T.serif,
                fontSize: 30,
                fontWeight: 400,
                color: T.warm,
                letterSpacing: "-0.015em",
                marginBottom: 6,
              }}
            >
              You&apos;re in{firstName ? `, ${firstName}` : ""}.
            </h2>
            <p style={{ fontSize: 13.5, color: T.warm56 }}>
              Your 6am briefing starts tomorrow.
            </p>
          </div>
          <div style={{ width: "100%", height: 0.5, background: T.hair }} />
          <ul
            style={{
              width: "100%",
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              textAlign: "left",
            }}
          >
            {WELCOME_CHECKLIST.map((line) => (
              <li key={line} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <CheckCircle2 size={16} style={{ color: T.sage, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: T.warm72 }}>{line}</span>
              </li>
            ))}
          </ul>
          <div style={{ width: "100%", height: 0.5, background: T.hair }} />
          <button
            onClick={onDismiss}
            autoFocus
            style={{
              width: "100%",
              padding: "13px 16px",
              borderRadius: 4,
              background: "#5C6B4F",
              color: "#FDFBF7",
              border: "none",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#3D4A33";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#5C6B4F";
            }}
          >
            Go to my dashboard
          </button>
          <p
            style={{
              fontFamily: T.mono,
              fontSize: 10.5,
              color: T.warm40,
              letterSpacing: "0.04em",
            }}
          >
            7-day trial active — you won&apos;t be charged until{" "}
            <span style={{ color: T.warm56 }}>{trialEnd}</span>. Cancel anytime.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ─── page ────────────────────────────────────────────────────────────────────
const DEMO_EMAILS = new Set(["demo@kinai.family", "partner@kinai.family"]);

type SubscriptionStatus = "trial" | "active" | "past_due" | "canceled";

const SUB_META: Record<
  SubscriptionStatus,
  { label: string; tone: string; bg: string; border: string }
> = {
  trial: {
    label: "Trial",
    tone: "#7A8C6A",
    bg: "rgba(122,140,106,0.1)",
    border: "rgba(122,140,106,0.3)",
  },
  active: {
    label: "Active",
    tone: T.sage,
    bg: T.sage12,
    border: T.hairSage,
  },
  past_due: {
    label: "Past due",
    tone: "#A65A4A",
    bg: "rgba(166,90,74,0.1)",
    border: "rgba(166,90,74,0.3)",
  },
  canceled: {
    label: "Canceled",
    tone: T.warm56,
    bg: T.warm06,
    border: T.hair,
  },
};

function nextBriefing(): { label: string; countdown: string } {
  const now = new Date();
  const next = new Date(now);
  next.setHours(6, 0, 0, 0);
  const isToday = now.getHours() < 6;
  if (!isToday) next.setDate(next.getDate() + 1);
  const ms = next.getTime() - now.getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return {
    label: isToday ? "Today, 6:00 AM" : "Tomorrow, 6:00 AM",
    countdown: `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m away`,
  };
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub: string;
  accent?: string;
}) {
  return (
    <Card style={{ padding: 16, display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        style={{
          fontFamily: T.mono,
          fontSize: 9.5,
          color: T.warm40,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: T.serif,
          fontSize: 28,
          fontWeight: 400,
          color: accent ?? T.warm,
          letterSpacing: "-0.015em",
          lineHeight: 1.15,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11.5, color: T.warm56, letterSpacing: "-0.005em" }}>
        {sub}
      </div>
    </Card>
  );
}

const QUICK_LINKS: {
  href: string;
  label: string;
  desc: string;
  icon: typeof CalendarCheck;
}[] = [
  {
    href: "/dashboard/calendars",
    label: "Calendars",
    desc: "Connect or manage calendars",
    icon: CalendarCheck,
  },
  {
    href: "/dashboard/family",
    label: "Family",
    desc: "Household members & invites",
    icon: Users,
  },
  {
    href: "/dashboard/billing",
    label: "Billing",
    desc: "Plan & payment method",
    icon: CreditCard,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    desc: "Phone, briefing & theme",
    icon: SettingsIcon,
  },
];

type OverviewData = {
  subscriptionStatus: SubscriptionStatus;
  trialDaysLeft: number;
  trialEndLabel: string | null;
  daysActive: number;
  calendarCount: number;
  familyCount: number;
};

function Overview({ data }: { data: OverviewData }) {
  const {
    subscriptionStatus,
    trialDaysLeft,
    trialEndLabel,
    daysActive,
    calendarCount,
    familyCount,
  } = data;
  const sub = SUB_META[subscriptionStatus];
  const brief = nextBriefing();
  const hasCalendar = calendarCount > 0;

  const subValue =
    subscriptionStatus === "trial"
      ? `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"}`
      : sub.label;
  const subSub =
    subscriptionStatus === "trial"
      ? trialEndLabel
        ? `Trial ends ${trialEndLabel}`
        : "Free trial active"
      : subscriptionStatus === "active"
        ? "Kin Premium · billed monthly"
        : subscriptionStatus === "past_due"
          ? "Update your payment method"
          : "Resubscribe anytime";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* stat grid */}
      <div
        className="kin-stat-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        <StatCard
          label="Subscription"
          value={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              {subValue}
              <span
                style={{
                  fontFamily: T.mono,
                  fontSize: 9.5,
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: sub.tone,
                  background: sub.bg,
                  border: `0.5px solid ${sub.border}`,
                  borderRadius: 999,
                  padding: "3px 7px",
                }}
              >
                {sub.label}
              </span>
            </span>
          }
          sub={subSub}
        />
        <StatCard
          label="Next briefing"
          value={brief.label.replace(", 6:00 AM", "")}
          sub={brief.countdown}
          accent={T.sage}
        />
        <StatCard
          label="Days active"
          value={daysActive}
          sub={daysActive === 1 ? "Since you joined" : "Since you joined Kin"}
        />
        <StatCard
          label="Calendars"
          value={calendarCount}
          sub={calendarCount === 1 ? "1 calendar connected" : "connected"}
        />
      </div>

      {/* briefing status / setup */}
      <Card style={{ padding: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: T.sage12,
              border: `0.5px solid ${T.hairSage}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: T.sage,
              flexShrink: 0,
            }}
          >
            {hasCalendar ? <CheckCircle2 size={18} /> : <Sparkles size={18} />}
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h2
              style={{
                fontFamily: T.serif,
                fontSize: 21,
                fontWeight: 400,
                color: T.warm,
                letterSpacing: "-0.015em",
                margin: "2px 0 6px",
              }}
            >
              {hasCalendar
                ? "Your morning briefing is on"
                : "Connect a calendar to start your briefings"}
            </h2>
            <p
              style={{
                fontSize: 13.5,
                color: T.warm56,
                margin: 0,
                lineHeight: 1.55,
                maxWidth: 460,
              }}
            >
              {hasCalendar
                ? `Kin reads ${calendarCount === 1 ? "your calendar" : "your calendars"} every morning and texts you a briefing at 6:00 AM — ${brief.countdown.toLowerCase()}.`
                : "Read-only Google connection — Kin reads your day to write the brief, and never posts back without your say-so."}
            </p>
            <div
              style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}
            >
              <Link
                href={hasCalendar ? "/calendar" : "/dashboard/calendars"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "11px 18px",
                  borderRadius: 4,
                  background: "#5C6B4F",
                  color: "#FDFBF7",
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {hasCalendar ? "See this week" : "Connect calendar"}
                <ArrowRight size={13} />
              </Link>
              {!hasCalendar && (
                <Link
                  href="/calendar"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "11px 18px",
                    borderRadius: 4,
                    background: "transparent",
                    color: T.warm72,
                    border: `0.5px solid ${T.hair}`,
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Open calendar view
                </Link>
              )}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 12px",
              borderRadius: 8,
              background: T.warm06,
              border: `0.5px solid ${T.hair}`,
              color: T.warm72,
            }}
          >
            <Clock size={14} style={{ color: T.sage }} />
            <span
              style={{
                fontFamily: T.mono,
                fontSize: 11,
                letterSpacing: "0.04em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {brief.label}
            </span>
          </div>
        </div>
      </Card>

      {/* quick links */}
      <div
        className="kin-stat-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        {QUICK_LINKS.map(({ href, label, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            style={{ textDecoration: "none" }}
          >
            <Card
              style={{
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                height: "100%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: T.warm06,
                    border: `0.5px solid ${T.hair}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: T.warm72,
                  }}
                >
                  <Icon size={15} strokeWidth={1.8} />
                </div>
                <ArrowUpRight size={14} style={{ color: T.warm40 }} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 500,
                    color: T.warm,
                    letterSpacing: "-0.005em",
                  }}
                >
                  {label}
                  {label === "Family" && familyCount > 0 ? (
                    <span style={{ color: T.warm40, fontWeight: 400 }}>
                      {" "}
                      · {familyCount}
                    </span>
                  ) : null}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: T.warm56,
                    marginTop: 2,
                    lineHeight: 1.4,
                  }}
                >
                  {desc}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <style>{`
        @media (max-width: 860px) {
          .kin-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .kin-stat-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [firstName, setFirstName] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [trialEnd, setTrialEnd] = useState(() => formatTrialEnd(null));
  const [now, setNow] = useState(() => new Date());
  const [isDemoUser, setIsDemoUser] = useState<boolean | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (searchParams.get("subscribed") === "true") setShowWelcome(true);
  }, [searchParams]);

  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("subscribed");
    const next = params.size > 0 ? `?${params.toString()}` : "";
    router.replace(`/dashboard${next}`);
  }, [router, searchParams]);

  useEffect(() => {
    let cancelled = false;
    let demo = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        demo = !!user.email && DEMO_EMAILS.has(user.email.toLowerCase());
        if (!cancelled) setIsDemoUser(demo);

        const { data: profile } = await supabase
          .from("profiles")
          .select(
            "first_name, trial_ends_at, subscription_status, created_at, household_id",
          )
          .eq("id", user.id)
          .single();

        if (profile?.trial_ends_at) {
          const trialMs = new Date(profile.trial_ends_at).getTime() / 1000;
          if (!cancelled) setTrialEnd(formatTrialEnd(trialMs));
        }

        const { data: members } = await supabase
          .from("family_members")
          .select("name, profile_id, member_type")
          .order("created_at", { ascending: true });

        if (cancelled) return;

        const adults = (members ?? []).filter((m) => m.member_type === "adult");
        const me = adults.find((m) => m.profile_id === user.id);
        const partner = adults.find((m) => m.profile_id !== user.id);

        if (me?.name) setFirstName(me.name.split(" ")[0]);
        else if (profile?.first_name)
          setFirstName(profile.first_name.split(" ")[0]);

        if (partner?.name) setPartnerName(partner.name.split(" ")[0]);

        // Overview stats — only rendered for non-demo users.
        if (!demo) {
          const { count: connCount } = await supabase
            .from("calendar_connections")
            .select("id", { count: "exact", head: true })
            .eq("profile_id", user.id);

          const myMembers = (members ?? []).filter(
            (m) => m.profile_id === user.id,
          );

          const status = (profile?.subscription_status ??
            "trial") as SubscriptionStatus;
          const trialEndsAt = profile?.trial_ends_at
            ? new Date(profile.trial_ends_at)
            : null;
          const trialDaysLeft =
            trialEndsAt && trialEndsAt > new Date()
              ? Math.max(
                  1,
                  Math.ceil(
                    (trialEndsAt.getTime() - Date.now()) / 86_400_000,
                  ),
                )
              : 0;
          const trialEndLabel = trialEndsAt
            ? trialEndsAt.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : null;
          const createdAt = profile?.created_at
            ? new Date(profile.created_at)
            : null;
          const daysActive = createdAt
            ? Math.max(
                1,
                Math.floor((Date.now() - createdAt.getTime()) / 86_400_000) + 1,
              )
            : 1;

          if (!cancelled) {
            setOverview({
              subscriptionStatus: status,
              trialDaysLeft,
              trialEndLabel,
              daysActive,
              calendarCount: connCount ?? 0,
              familyCount: myMembers.length,
            });
          }
        }
      } catch {
        // Non-fatal — fall back to a safe overview so the home base still
        // renders for a signed-in user even if a query failed.
        if (!cancelled && !demo) {
          setOverview({
            subscriptionStatus: "trial",
            trialDaysLeft: 0,
            trialEndLabel: null,
            daysActive: 1,
            calendarCount: 0,
            familyCount: 0,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const greeting = getGreeting();
  const greetingText = firstName ? `${greeting}, ${firstName}.` : `${greeting}.`;
  const showDemo = isDemoUser === true;
  const subtitle = showDemo
    ? partnerName
      ? `Today's brief went out at 6:02. You and ${partnerName} both read it.`
      : "Today's brief went out at 6:02. Coverage is locked in."
    : (overview?.calendarCount ?? 0) > 0
      ? "Your calendar is connected. Here's your home base."
      : "One quick step: connect your calendar so Kin can build your morning briefing.";

  return (
    <>
      <AnimatePresence>
        {showWelcome && (
          <WelcomeModal
            firstName={firstName}
            trialEnd={trialEnd}
            onDismiss={dismissWelcome}
          />
        )}
      </AnimatePresence>

      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "32px clamp(20px, 4vw, 40px) 60px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* header */}
        <header
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                fontFamily: T.mono,
                fontSize: 11,
                color: T.warm40,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              {formatDateRow(now)}
            </div>
            <h1
              style={{
                fontFamily: T.serif,
                fontSize: "clamp(32px, 3.8vw, 42px)",
                fontWeight: 400,
                color: T.warm,
                letterSpacing: "-0.015em",
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              {greetingText}
            </h1>
            <p
              style={{
                fontSize: 14.5,
                color: T.warm56,
                margin: 0,
                lineHeight: 1.5,
                maxWidth: 520,
              }}
            >
              {showDemo && partnerName ? (
                <>
                  Today&apos;s brief went out at{" "}
                  <span style={{ color: T.sage }}>6:02</span>. You and{" "}
                  {partnerName} both read it.
                </>
              ) : (
                subtitle
              )}
            </p>
          </div>

          {showDemo && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link
                href="/calendar"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "11px 18px",
                  borderRadius: 4,
                  background: "#5C6B4F",
                  color: "#FDFBF7",
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                See the week
                <ArrowRight size={13} />
              </Link>
            </div>
          )}
        </header>

        {showDemo ? (
          /* grid — demo data only for demo@kinai.family / partner@kinai.family */
          <div
            className="kin-dash-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)",
              gap: 16,
              alignItems: "stretch",
            }}
          >
            <BriefingCard />
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <ThisWeekCard />
              <CoverageCard />
            </div>
          </div>
        ) : overview ? (
          <Overview data={overview} />
        ) : (
          <p
            style={{
              fontSize: 13,
              color: T.warm40,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: T.sage,
                display: "inline-block",
              }}
            />
            Loading your home base…
          </p>
        )}

        <style>{`
          @media (max-width: 1100px) {
            .kin-dash-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
