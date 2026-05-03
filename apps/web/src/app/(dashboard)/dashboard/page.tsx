"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, MessageSquare, Sparkles } from "lucide-react";
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
        background: "rgba(240,237,230,0.025)",
        border: `1px solid ${T.warm06}`,
        borderRadius: 12,
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
        border: `1px solid ${isSage ? T.hairSage : T.hair}`,
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
    text: "Sent morning brief to you and Sarah.",
    done: true,
  },
  {
    time: "06:08",
    tag: "reply",
    text: "Sarah replied: \"Got Jaxon at 4. You owe me bedtime.\"",
    done: true,
  },
  {
    time: "07:14",
    tag: "sync",
    text: "Pulled 3 new events from your work calendar.",
    done: true,
  },
  {
    time: "08:30",
    tag: "alert",
    text: "Pickup conflict resolved — Sarah confirmed Jaxon's 4pm soccer.",
    done: true,
  },
];

const TAG_COLOR: Record<TimelineRow["tag"], string> = {
  brief: T.sage,
  reply: T.warm72,
  alert: "#D4A843", // amber
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
        borderTop: `1px solid ${T.hair}`,
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
            background: "rgba(240,237,230,0.04)",
            border: `1px solid ${T.hair}`,
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
              border: `1px solid ${T.hairSage}`,
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
              Delivered 6:02 AM · 2 replies
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
              border: `1px solid ${T.hairSage}`,
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
              Sarah&apos;s 4pm window covered Jaxon&apos;s soccer pickup. You
              kept your back-to-back stretch — no reschedule needed.
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
      { time: "4:00p", title: "Jaxon · soccer pickup", who: "Sarah" },
      { time: "6:00p", title: "Maya · SAT prep", who: "Sarah" },
    ],
  },
  {
    label: "Sat",
    date: "May 3",
    events: [
      { time: "10:00a", title: "Farmers market", who: "family" },
      { time: "2:00p", title: "Jaxon's friend birthday", who: "you" },
    ],
  },
  {
    label: "Mon",
    date: "May 5",
    events: [
      { time: "8:30a", title: "Both of you · 1:1 conflict", conflict: true },
      { time: "5:30p", title: "Jaxon · daycare close" },
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
                      color: e.conflict ? "#D4A843" : T.warm72,
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

// ─── ask kin card ────────────────────────────────────────────────────────────
function AskKinCard() {
  const SUGGESTIONS = [
    "Who's got Jaxon Friday?",
    "Move my 3pm",
    "What's for dinner tonight?",
  ];

  return (
    <Card>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 13.5,
            color: T.warm,
            fontWeight: 500,
            letterSpacing: "-0.005em",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Sparkles size={13} style={{ color: T.sage }} />
          Ask Kin
        </div>
        <PhaseTag label="V1" tone="muted" />
      </div>
      <div
        style={{
          fontSize: 12.5,
          color: T.warm56,
          lineHeight: 1.55,
          marginBottom: 12,
          letterSpacing: "-0.005em",
        }}
      >
        Text or type. Ask about pickups, scheduling, what&apos;s for dinner —
        anything family coordination.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {SUGGESTIONS.map((s) => (
          <Link
            key={s}
            href={`/chat?q=${encodeURIComponent(s)}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "9px 12px",
              borderRadius: 8,
              border: `1px solid ${T.hair}`,
              background: "rgba(240,237,230,0.02)",
              color: T.warm72,
              fontSize: 12.5,
              textDecoration: "none",
              letterSpacing: "-0.005em",
              transition: "border-color 160ms ease, background 160ms ease, color 160ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = T.hairSage;
              e.currentTarget.style.background = T.sage12;
              e.currentTarget.style.color = T.sage;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = T.hair;
              e.currentTarget.style.background = "rgba(240,237,230,0.02)";
              e.currentTarget.style.color = T.warm72;
            }}
          >
            <span>{s}</span>
            <ArrowRight size={12} />
          </Link>
        ))}
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
          background: "rgba(0,0,0,0.6)",
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
          border: `1px solid ${T.hairStrong}`,
          borderRadius: 16,
          padding: 28,
          boxShadow: "0 24px 80px rgba(0,0,0,0.55), 0 0 60px rgba(124,184,122,0.08)",
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
              borderRadius: 12,
              background: T.sage12,
              border: `1px solid ${T.hairSage}`,
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
                fontSize: 26,
                fontWeight: 500,
                color: T.warm,
                letterSpacing: "-0.025em",
                marginBottom: 6,
              }}
            >
              You&apos;re in{firstName ? `, ${firstName}` : ""}.
            </h2>
            <p style={{ fontSize: 13.5, color: T.warm56 }}>
              Your 6am briefing starts tomorrow.
            </p>
          </div>
          <div style={{ width: "100%", height: 1, background: T.hair }} />
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
          <div style={{ width: "100%", height: 1, background: T.hair }} />
          <button
            onClick={onDismiss}
            autoFocus
            style={{
              width: "100%",
              padding: "13px 16px",
              borderRadius: 10,
              background: T.sage,
              color: "#0C0F0A",
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "-0.005em",
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
function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [firstName, setFirstName] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [trialEnd, setTrialEnd] = useState(() => formatTrialEnd(null));
  const [now, setNow] = useState(() => new Date());

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
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, trial_ends_at")
          .eq("id", user.id)
          .single();

        if (profile?.trial_ends_at) {
          const trialMs = new Date(profile.trial_ends_at).getTime() / 1000;
          if (!cancelled) setTrialEnd(formatTrialEnd(trialMs));
        }

        const { data: members } = await supabase
          .from("family_members")
          .select("name, profile_id")
          .eq("member_type", "adult")
          .order("created_at", { ascending: true });

        if (cancelled) return;

        const me = members?.find((m) => m.profile_id === user.id);
        const partner = members?.find((m) => m.profile_id !== user.id);

        if (me?.name) setFirstName(me.name.split(" ")[0]);
        else if (profile?.display_name)
          setFirstName(profile.display_name.split(" ")[0]);

        if (partner?.name) setPartnerName(partner.name.split(" ")[0]);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const greeting = getGreeting();
  const greetingText = firstName ? `${greeting}, ${firstName}.` : `${greeting}.`;
  const subtitle = partnerName
    ? `Today's brief went out at 6:02. You and ${partnerName} both read it.`
    : "Today's brief went out at 6:02. Tap into Ask Kin anytime.";

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
                fontSize: "clamp(28px, 3.4vw, 36px)",
                fontWeight: 500,
                color: T.warm,
                letterSpacing: "-0.025em",
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
              {partnerName ? (
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

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link
              href="/calendar"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 14px",
                borderRadius: 8,
                background: T.warm06,
                border: `1px solid ${T.hair}`,
                color: T.warm,
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: "-0.005em",
              }}
            >
              View today&apos;s brief
            </Link>
            <Link
              href="/chat"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 14px",
                borderRadius: 8,
                background: T.sage,
                color: "#0C0F0A",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "-0.005em",
              }}
            >
              Ask Kin
              <ArrowRight size={13} />
            </Link>
          </div>
        </header>

        {/* grid */}
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
            <AskKinCard />
          </div>
        </div>

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
