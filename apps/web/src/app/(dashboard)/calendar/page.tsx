"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar as CalendarIcon, MapPin, ArrowRight, Loader2 } from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string | null;
  location?: string | null;
  is_kid_event?: boolean;
  is_shared?: boolean;
}

interface CalendarConnection {
  id: string;
  provider: "google";
}

function formatDayHeader(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function dayKey(iso: string): string {
  return startOfDay(new Date(iso)).toISOString().slice(0, 10);
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [connections, setConnections] = useState<CalendarConnection[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const today = startOfDay(new Date());
      const end = addDays(today, 14);
      try {
        const [eventsRes, syncRes] = await Promise.all([
          fetch(
            `/api/calendar/events?view=household&start=${today.toISOString()}&end=${end.toISOString()}`,
            { credentials: "include" }
          ),
          fetch("/api/calendar/sync", { credentials: "include" }),
        ]);

        if (cancelled) return;

        if (eventsRes.ok) {
          const { events: data } = (await eventsRes.json()) as {
            events: CalendarEvent[] | null;
          };
          setEvents(data ?? []);
        } else {
          setEvents([]);
        }

        if (syncRes.ok) {
          const { connections: conns } = (await syncRes.json()) as {
            connections: CalendarConnection[] | null;
          };
          setConnections(conns ?? []);
        } else {
          setConnections([]);
        }
      } catch {
        if (!cancelled) {
          setEvents([]);
          setConnections([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Group events by day
  const byDay: Record<string, CalendarEvent[]> = {};
  (events ?? []).forEach((e) => {
    const k = dayKey(e.start_time);
    if (!byDay[k]) byDay[k] = [];
    byDay[k].push(e);
  });

  const today = startOfDay(new Date());
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));

  const hasConnection = (connections?.length ?? 0) > 0;
  const hasEvents = (events?.length ?? 0) > 0;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-2xl bg-blue/15 flex items-center justify-center">
          <CalendarIcon size={16} className="text-blue" />
        </div>
        <h1 className="font-serif italic text-2xl text-primary">Your Calendar</h1>
      </div>
      <p className="text-warm-white/40 text-sm mb-8 ml-10">
        The next two weeks &mdash; what Kin reads to build your 6am briefing
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="text-warm-white/40 animate-spin" />
        </div>
      ) : !hasConnection ? (
        <EmptyState
          title="No calendars connected yet"
          body="Connect a calendar so Kin can see what's on your day. We use it read-only — no posting, no email access."
          ctaLabel="Connect a calendar"
          ctaHref="/settings"
        />
      ) : !hasEvents ? (
        <EmptyState
          title="Nothing on the calendar yet"
          body="Your calendar is connected, but the next two weeks look open. New events from Google show up here automatically."
          ctaLabel="Manage calendars"
          ctaHref="/settings"
        />
      ) : (
        <div className="space-y-6">
          {days.map((d) => {
            const k = d.toISOString().slice(0, 10);
            const dayEvents = byDay[k] ?? [];
            if (dayEvents.length === 0) return null;
            const isToday = k === today.toISOString().slice(0, 10);
            return (
              <div key={k}>
                <div className="flex items-baseline gap-2 mb-3">
                  <h2 className="text-warm-white font-semibold text-sm tracking-tight">
                    {isToday ? "Today" : formatDayHeader(d)}
                  </h2>
                  {isToday && (
                    <span className="text-primary text-[11px] font-mono tracking-wide">
                      ·  {formatDayHeader(d)}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {dayEvents.map((e) => (
                    <EventRow key={e.id} event={e} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  title,
  body,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div className="bg-gradient-to-br from-surface-raised to-background rounded-2xl p-8 border border-warm-white/5 text-center">
      <div className="w-14 h-14 rounded-2xl bg-blue/15 mx-auto mb-4 flex items-center justify-center">
        <CalendarIcon size={22} className="text-blue" />
      </div>
      <h3 className="text-warm-white font-semibold text-base mb-2">{title}</h3>
      <p className="text-warm-white/50 text-sm max-w-sm mx-auto mb-5">{body}</p>
      <Link
        href={ctaHref}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary text-background font-semibold text-sm hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
      >
        {ctaLabel}
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}

function EventRow({ event }: { event: CalendarEvent }) {
  const accent = event.is_kid_event ? "amber" : event.is_shared ? "primary" : "blue";
  const accentClass: Record<string, string> = {
    amber: "border-amber/20 bg-amber/5",
    primary: "border-primary/20 bg-primary/5",
    blue: "border-blue/15 bg-surface-raised",
  };
  return (
    <div
      className={`rounded-2xl p-4 border ${accentClass[accent]} flex items-start gap-3`}
    >
      <div className="font-mono text-xs text-warm-white/50 w-16 shrink-0 pt-0.5">
        {formatTime(event.start_time)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-warm-white text-sm font-medium truncate">
          {event.title}
        </div>
        {event.location && (
          <div className="flex items-center gap-1 text-warm-white/40 text-xs mt-1">
            <MapPin size={11} />
            <span className="truncate">{event.location}</span>
          </div>
        )}
      </div>
    </div>
  );
}
