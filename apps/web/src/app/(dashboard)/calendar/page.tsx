"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar as CalendarIcon, Users, Baby, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  is_shared: boolean;
  is_kid_event: boolean;
  assigned_member: string | null;
  description: string | null;
  color: string | null;
  owner_parent_id: string;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function dayKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function dayLabel(d: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dCopy = new Date(d);
  dCopy.setHours(0, 0, 0, 0);
  const diff = Math.round((dCopy.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("household_id")
        .eq("id", user.id)
        .maybeSingle();
      const householdId = profile?.household_id || user.id;

      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 14);

      const { data: rows } = await supabase
        .from("calendar_events")
        .select("id, title, start_time, end_time, all_day, is_shared, is_kid_event, assigned_member, description, color, owner_parent_id")
        .eq("household_id", householdId)
        .gte("start_time", start.toISOString())
        .lt("start_time",  end.toISOString())
        .order("start_time", { ascending: true });
      if (!cancelled) {
        setEvents((rows ?? []) as CalendarEvent[]);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const grouped = useMemo(() => {
    const out = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const k = dayKey(e.start_time);
      const arr = out.get(k) ?? [];
      arr.push(e);
      out.set(k, arr);
    }
    return Array.from(out.entries()).map(([k, evs]) => ({
      key: k,
      date: new Date(k + "T00:00:00"),
      events: evs,
    }));
  }, [events]);

  return (
    <div className="relative">
      <div className="absolute -top-20 -left-20 w-[280px] h-[280px] rounded-full bg-blue/5 blur-[120px] pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-warm-white/45 hover:text-warm-white/75 text-[12px] mb-2 transition-colors">
            <ArrowLeft size={13} /> Back
          </Link>
          <h1 className="text-3xl font-medium text-primary mb-1.5" style={{ letterSpacing: "-0.025em" }}>Calendar</h1>
          <p className="text-warm-white/40 text-sm">Next 14 days · everyone&apos;s events in one place</p>
        </div>
        <CalendarIcon size={28} className="text-primary/35 mt-2" />
      </motion.div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[0,1,2].map((i) => <div key={i} className="h-28 rounded-2xl bg-warm-white/5" />)}
        </div>
      ) : grouped.length === 0 ? (
        <div className="glass-strong rounded-2xl p-8 text-center border border-warm-white/6">
          <CalendarIcon size={28} className="text-warm-white/25 mx-auto mb-3" />
          <p className="text-warm-white/65 text-[15px] font-medium mb-1">Nothing scheduled in the next two weeks</p>
          <p className="text-warm-white/40 text-[13px]">Connect a calendar in <Link href="/settings" className="text-primary hover:underline">settings</Link> and Kin will pull it in.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {grouped.map(({ key, date, events: dayEvents }, idx) => (
            <motion.section
              key={key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.04 }}
            >
              <div className="flex items-baseline justify-between mb-2 px-1">
                <h2 className="text-warm-white/85 text-[15px] font-medium">
                  {dayLabel(date)}
                </h2>
                <span className="text-warm-white/35 text-[11px] font-mono">
                  {dayEvents.length} {dayEvents.length === 1 ? "event" : "events"}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {dayEvents.map((e) => {
                  const color = e.color || (e.is_kid_event ? "#7CB87A" : "#7AADCE");
                  const ownerIsMe = userId === e.owner_parent_id;
                  const Icon = e.is_kid_event ? Baby : e.is_shared ? Users : User;
                  return (
                    <div key={e.id} className="glass-strong rounded-2xl p-4 border border-warm-white/6 flex items-start gap-3 hover:border-warm-white/12 transition-colors">
                      <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: color, minHeight: 36 }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-warm-white/90 text-[15px] font-medium truncate">{e.title}</h3>
                          {e.is_kid_event && (
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-primary bg-primary/15 border border-primary/25 px-1.5 py-0.5 rounded-md">kid</span>
                          )}
                          {e.is_shared && !e.is_kid_event && (
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-blue bg-blue/15 border border-blue/25 px-1.5 py-0.5 rounded-md">shared</span>
                          )}
                          {!e.is_shared && !e.is_kid_event && (
                            <span className="text-[10px] uppercase tracking-wider font-medium text-warm-white/40">{ownerIsMe ? "you" : "partner"}</span>
                          )}
                        </div>
                        <div className="text-warm-white/45 text-[12px] mt-1 font-mono">
                          {formatTime(e.start_time)} – {formatTime(e.end_time)}
                          {e.assigned_member ? ` · ${e.assigned_member}` : ""}
                        </div>
                        {e.description && (
                          <p className="text-warm-white/55 text-[13px] mt-2 leading-relaxed">{e.description}</p>
                        )}
                      </div>
                      <Icon size={15} className="text-warm-white/25 mt-1 shrink-0" />
                    </div>
                  );
                })}
              </div>
            </motion.section>
          ))}
        </div>
      )}
    </div>
  );
}
