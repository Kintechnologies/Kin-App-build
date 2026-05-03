"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, RefreshCw, ArrowRight } from "lucide-react";

const T = {
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
  hairSage: "var(--hair-sage)",
  bgCard: "var(--bg-card)",
  mono: "var(--font-geist-mono), 'Geist Mono', monospace",
};

type CalendarEvent = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location?: string | null;
  is_kid_event?: boolean;
  is_shared?: boolean;
  assigned_member?: string | null;
};

function startOfWeek(d = new Date()): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const dow = out.getDay();
  out.setDate(out.getDate() - dow);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).toLowerCase().replace(" ", "");
}

function fmtDayLabel(d: Date): { dow: string; date: string; month: string } {
  return {
    dow: d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
    date: String(d.getDate()),
    month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
  };
}

function isToday(d: Date): boolean {
  const t = new Date();
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  );
}

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

// Sun → Sat. Two working parents (you = Jordan, Sam = partner), two kids
// (Emma, 8; Nora, 18mo). Stacks tech-work meetings against family logistics
// so the coordination value is visible at a glance.
const PLACEHOLDER_WEEK: Record<number, { time: string; title: string; who?: string }[]> = {
  // Sun
  0: [
    { time: "9:00a", title: "Farmers market", who: "family" },
    { time: "10:30a", title: "Emma · soccer game", who: "you" },
    { time: "7:00p", title: "Dinner · Patel family", who: "shared" },
  ],
  // Mon
  1: [
    { time: "9:30a", title: "Standup", who: "you" },
    { time: "10:00a", title: "Sam · 1:1 with manager", who: "Sam" },
    { time: "2:00p", title: "Design review", who: "you" },
    { time: "3:30p", title: "Emma · school pickup", who: "you" },
    { time: "5:45p", title: "Nora · daycare pickup", who: "you" },
    { time: "6:30p", title: "Sam · book club", who: "Sam" },
  ],
  // Tue
  2: [
    { time: "9:00a", title: "Standup · both of you", who: "conflict" },
    { time: "11:00a", title: "Sprint planning", who: "you" },
    { time: "2:00p", title: "Nora · pediatrician (18-mo)", who: "you" },
    { time: "5:45p", title: "Nora · daycare pickup", who: "Sam" },
    { time: "7:00p", title: "Date night · Oleana", who: "shared" },
  ],
  // Wed
  3: [
    { time: "9:30a", title: "Standup", who: "you" },
    { time: "10:00a", title: "All-hands", who: "you" },
    { time: "12:00p", title: "Sam · lunch with Sarah", who: "Sam" },
    { time: "4:00p", title: "Emma · soccer practice", who: "you" },
    { time: "5:45p", title: "Nora · daycare pickup", who: "Sam" },
  ],
  // Thu
  4: [
    { time: "9:30a", title: "Standup", who: "you" },
    { time: "1:00p", title: "Quarterly planning", who: "you" },
    { time: "3:30p", title: "Emma · school pickup", who: "you" },
    { time: "5:00p", title: "Sam · happy hour with team", who: "Sam" },
    { time: "5:45p", title: "Nora · daycare pickup", who: "you" },
    { time: "6:30p", title: "Dinner · Grandma's", who: "shared" },
  ],
  // Fri
  5: [
    { time: "9:30a", title: "Standup", who: "you" },
    { time: "11:00a", title: "Sprint demo", who: "you" },
    { time: "3:00p", title: "Emma · soccer practice", who: "you" },
    { time: "5:45p", title: "Nora · daycare pickup", who: "Sam" },
  ],
  // Sat
  6: [
    { time: "10:00a", title: "Emma · soccer game", who: "you" },
    { time: "2:00p", title: "Birthday party · Olive's house", who: "Sam" },
    { time: "7:00p", title: "Movie night", who: "family" },
  ],
};

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingPlaceholder, setUsingPlaceholder] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const start = weekStart.toISOString();
        const end = addDays(weekStart, 7).toISOString();
        const res = await fetch(
          `/api/calendar/events?view=household&start=${encodeURIComponent(
            start,
          )}&end=${encodeURIComponent(end)}`,
        );
        if (!res.ok) throw new Error("fetch failed");
        const json = await res.json();
        if (cancelled) return;
        const evs = (json.events as CalendarEvent[]) || [];
        setEvents(evs);
        setUsingPlaceholder(evs.length === 0);
      } catch {
        if (!cancelled) {
          setEvents([]);
          setUsingPlaceholder(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [weekStart]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const eventsByDay: Record<number, CalendarEvent[]> = {};
  for (let i = 0; i < 7; i++) eventsByDay[i] = [];
  for (const ev of events) {
    const d = new Date(ev.start_time);
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      if (
        d.getFullYear() === day.getFullYear() &&
        d.getMonth() === day.getMonth() &&
        d.getDate() === day.getDate()
      ) {
        eventsByDay[i].push(ev);
        break;
      }
    }
  }

  return (
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
            {"// this week · household view"}
          </div>
          <h1
            style={{
              fontSize: "clamp(26px, 3vw, 32px)",
              fontWeight: 500,
              color: T.warm,
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            {weekStart.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
            })}{" "}
            —{" "}
            {addDays(weekStart, 6).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
            })}
          </h1>
          <p style={{ fontSize: 13.5, color: T.warm56, margin: 0 }}>
            What Kin&apos;s watching across both of your calendars.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            style={btnSecondary}
            aria-label="Previous week"
          >
            ← Prev
          </button>
          <button
            onClick={() => setWeekStart(startOfWeek())}
            style={btnSecondary}
          >
            This week
          </button>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            style={btnSecondary}
            aria-label="Next week"
          >
            Next →
          </button>
        </div>
      </header>

      {usingPlaceholder && !loading && (
        <Card
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: T.sage12,
            border: `1px solid ${T.hairSage}`,
          }}
        >
          <CalendarDays size={16} style={{ color: T.sage, flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 13, color: T.warm72 }}>
            <span style={{ color: T.sage, fontWeight: 500 }}>Demo view</span>
            {" — "}
            connect a calendar in{" "}
            <Link
              href="/settings"
              style={{ color: T.sage, textDecoration: "underline" }}
            >
              Settings
            </Link>{" "}
            to see your real week here.
          </div>
        </Card>
      )}

      {/* week grid */}
      <div
        className="kin-week-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        {days.map((d, i) => {
          const today = isToday(d);
          const labels = fmtDayLabel(d);
          const liveEvents = eventsByDay[i];
          const fallback = usingPlaceholder ? PLACEHOLDER_WEEK[i] || [] : [];
          return (
            <Card
              key={i}
              style={{
                padding: 14,
                minHeight: 220,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                border: today
                  ? `1px solid ${T.hairSage}`
                  : `1px solid ${T.warm06}`,
                background: today ? T.sage12 : "rgba(240,237,230,0.025)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    fontFamily: T.mono,
                    fontSize: 10,
                    color: today ? T.sage : T.warm40,
                    letterSpacing: "0.12em",
                  }}
                >
                  {labels.dow}
                </div>
                <div
                  style={{
                    fontSize: 18,
                    color: today ? T.sage : T.warm,
                    fontWeight: 500,
                    letterSpacing: "-0.02em",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {labels.date}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  flex: 1,
                }}
              >
                {liveEvents.length > 0
                  ? liveEvents.map((ev) => (
                      <div
                        key={ev.id}
                        style={{
                          padding: "6px 8px",
                          borderRadius: 6,
                          background: ev.is_kid_event
                            ? T.sage12
                            : "rgba(240,237,230,0.04)",
                          border: `1px solid ${
                            ev.is_kid_event ? T.hairSage : T.hair
                          }`,
                          display: "flex",
                          flexDirection: "column",
                          gap: 1,
                        }}
                      >
                        <div
                          style={{
                            fontFamily: T.mono,
                            fontSize: 9.5,
                            color: T.warm40,
                            letterSpacing: "0.04em",
                          }}
                        >
                          {fmtTime(ev.start_time)}
                        </div>
                        <div
                          style={{
                            fontSize: 11.5,
                            color: T.warm72,
                            letterSpacing: "-0.005em",
                            lineHeight: 1.3,
                          }}
                        >
                          {ev.title}
                        </div>
                      </div>
                    ))
                  : fallback.map((e, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "6px 8px",
                          borderRadius: 6,
                          background: "rgba(240,237,230,0.03)",
                          border: `1px solid ${T.hair}`,
                          display: "flex",
                          flexDirection: "column",
                          gap: 1,
                        }}
                      >
                        <div
                          style={{
                            fontFamily: T.mono,
                            fontSize: 9.5,
                            color:
                              e.who === "conflict" ? "#D4A843" : T.warm40,
                            letterSpacing: "0.04em",
                          }}
                        >
                          {e.time}
                        </div>
                        <div
                          style={{
                            fontSize: 11.5,
                            color: e.who === "conflict" ? "#D4A843" : T.warm72,
                            letterSpacing: "-0.005em",
                            lineHeight: 1.3,
                          }}
                        >
                          {e.title}
                        </div>
                        {e.who && e.who !== "conflict" && (
                          <div
                            style={{
                              fontFamily: T.mono,
                              fontSize: 9,
                              color: T.warm40,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                            }}
                          >
                            {e.who}
                          </div>
                        )}
                      </div>
                    ))}

                {liveEvents.length === 0 && fallback.length === 0 && (
                  <div
                    style={{
                      fontFamily: T.mono,
                      fontSize: 10,
                      color: T.warm40,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      paddingTop: 10,
                    }}
                  >
                    {loading ? "Loading…" : "No events"}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* footer */}
      <Card
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <RefreshCw size={14} style={{ color: T.sage }} />
          <div style={{ fontSize: 13, color: T.warm72 }}>
            Kin syncs both calendars every 5 minutes — and writes back conflicts
            it solves over text.
          </div>
        </div>
        <Link
          href="/settings"
          style={{
            fontFamily: T.mono,
            fontSize: 11,
            color: T.sage,
            letterSpacing: "0.06em",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          MANAGE CALENDARS
          <ArrowRight size={11} />
        </Link>
      </Card>

      <style>{`
        @media (max-width: 900px) {
          .kin-week-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 540px) {
          .kin-week-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

const btnSecondary: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  background: T.warm06,
  border: `1px solid ${T.hair}`,
  color: T.warm72,
  fontSize: 12.5,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
  letterSpacing: "-0.005em",
};
