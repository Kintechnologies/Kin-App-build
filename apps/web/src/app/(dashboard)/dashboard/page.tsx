"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  MessageSquare,
  Calendar as CalendarIcon,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────
interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  is_shared: boolean;
  is_kid_event: boolean;
  assigned_member: string | null;
  description: string | null;
  color: string | null;
  owner_parent_id: string;
}

interface CoordinationIssue {
  id: string;
  trigger_type: string;
  state: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  severity: "RED" | "YELLOW" | null;
  content: string;
  event_window_start: string | null;
  event_window_end: string | null;
  surfaced_at: string;
}

interface SmsRow {
  id: string;
  direction: "inbound" | "outbound" | "outbound_failed";
  body: string;
  sent_at: string;
}

interface ChatRow {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

type ConversationItem =
  | { kind: "sms"; id: string; from: "user" | "kin"; body: string; at: string }
  | { kind: "chat"; id: string; from: "user" | "kin"; body: string; at: string };

// ── Helpers ───────────────────────────────────────────────────────────────────
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatRelative(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diffMin = Math.round((now - t) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function severityStyle(sev: CoordinationIssue["severity"]) {
  if (sev === "RED") {
    return { Icon: AlertCircle, label: "Needs attention", iconColor: "text-rose", bg: "bg-rose/10", border: "border-rose/30" };
  }
  if (sev === "YELLOW") {
    return { Icon: AlertTriangle, label: "Heads up", iconColor: "text-amber", bg: "bg-amber/10", border: "border-amber/25" };
  }
  return { Icon: AlertTriangle, label: "Note", iconColor: "text-warm-white/50", bg: "bg-warm-white/5", border: "border-warm-white/15" };
}

// Pair an event window to coordination issues that overlap with it
function eventConflictsWith(event: CalendarEvent, issues: CoordinationIssue[]): CoordinationIssue | null {
  const evStart = new Date(event.start_time).getTime();
  const evEnd   = new Date(event.end_time).getTime();
  for (const i of issues) {
    if (!i.event_window_start || !i.event_window_end) continue;
    const ws = new Date(i.event_window_start).getTime();
    const we = new Date(i.event_window_end).getTime();
    if (ws <= evEnd && we >= evStart) return i;
  }
  return null;
}

// ── Page ──────────────────────────────────────────────────────────────────────
function DashboardContent() {
  const [firstName, setFirstName] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [issues, setIssues] = useState<CoordinationIssue[]>([]);
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, household_id, phone_number")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;
        const householdId = profile?.household_id || user.id;
        if (profile?.first_name) setFirstName(profile.first_name);
        if (profile?.phone_number) setPhoneNumber(profile.phone_number);

        // Next 7 days of events for the household
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 7);

        const [evRes, issueRes, smsRes, chatRes] = await Promise.all([
          supabase
            .from("calendar_events")
            .select("id, title, start_time, end_time, is_shared, is_kid_event, assigned_member, description, color, owner_parent_id")
            .eq("household_id", householdId)
            .gte("start_time", start.toISOString())
            .lt("start_time", end.toISOString())
            .order("start_time", { ascending: true })
            .limit(60),
          supabase
            .from("coordination_issues")
            .select("id, trigger_type, state, severity, content, event_window_start, event_window_end, surfaced_at")
            .eq("household_id", householdId)
            .in("state", ["OPEN", "ACKNOWLEDGED"])
            .order("surfaced_at", { ascending: false })
            .limit(8),
          supabase
            .from("sms_conversations")
            .select("id, direction, body, sent_at")
            .eq("profile_id", user.id)
            .order("sent_at", { ascending: false })
            .limit(20),
          supabase
            .from("conversations")
            .select("id, role, content, created_at")
            .eq("profile_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20),
        ]);

        if (cancelled) return;
        if (evRes.data) setEvents(evRes.data as CalendarEvent[]);
        if (issueRes.data) setIssues(issueRes.data as CoordinationIssue[]);

        // Merge SMS + chat into one timeline, newest first, capped at 12
        const sms: ConversationItem[] = (smsRes.data ?? []).map((r: SmsRow) => ({
          kind: "sms",
          id: r.id,
          from: r.direction === "inbound" ? "user" : "kin",
          body: r.body,
          at: r.sent_at,
        }));
        const chat: ConversationItem[] = (chatRes.data ?? []).map((r: ChatRow) => ({
          kind: "chat",
          id: r.id,
          from: r.role === "user" ? "user" : "kin",
          body: r.content,
          at: r.created_at,
        }));
        const merged = [...sms, ...chat]
          .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
          .slice(0, 12);
        if (!cancelled) setConversation(merged);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const greetingText = useMemo(() => {
    const greeting = getGreeting();
    return firstName ? `${greeting}, ${firstName}` : greeting;
  }, [firstName]);

  const groupedDays = useMemo(() => {
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

  const openIssues = useMemo(() => issues.filter((i) => i.state === "OPEN"), [issues]);

  return (
    <div className="relative">
      <div className="absolute -top-20 -right-20 w-[300px] h-[300px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-6">
        <h1 className="text-3xl font-medium text-primary mb-1.5" style={{ letterSpacing: "-0.025em" }}>
          {greetingText}
        </h1>
        <p className="text-warm-white/40 text-sm">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </motion.header>

      {loading ? (
        <Skeleton />
      ) : (
        <div className="flex flex-col gap-5">
          {/* Open coordination alerts */}
          {openIssues.length > 0 && (
            <section aria-label="Open coordination alerts" className="flex flex-col gap-2">
              {openIssues.map((issue) => {
                const s = severityStyle(issue.severity);
                const { Icon } = s;
                return (
                  <motion.div
                    key={issue.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`glass-strong rounded-2xl p-4 border ${s.border} ${s.bg}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                        <Icon size={17} className={s.iconColor} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[11px] uppercase tracking-wider font-semibold ${s.iconColor}`}>{s.label}</span>
                          {issue.event_window_start && (
                            <span className="text-[11px] text-warm-white/45 font-mono">
                              · {dayLabel(new Date(issue.event_window_start))} {formatTime(issue.event_window_start)}
                            </span>
                          )}
                        </div>
                        <p className="text-warm-white/85 text-[14px] leading-relaxed">{issue.content}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </section>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* SMS / chat history */}
            <section aria-label="Recent activity">
              <SectionHeader icon={MessageSquare} label="Recent with Kin" right={<Link href="/chat" className="text-primary text-[12px] font-medium hover:underline">Open chat →</Link>} />
              <div className="glass-strong rounded-2xl p-4 border border-warm-white/6 max-h-[480px] overflow-y-auto">
                {conversation.length === 0 ? (
                  <div className="text-warm-white/45 text-[13.5px] py-3">
                    No conversation history yet.
                    {phoneNumber ? (
                      <> Text Kin at your dedicated number to get started.</>
                    ) : (
                      <> <Link href="/settings" className="text-primary hover:underline">Set up SMS</Link> or open <Link href="/chat" className="text-primary hover:underline">chat</Link> to start.</>
                    )}
                  </div>
                ) : (
                  <ol className="flex flex-col gap-3">
                    {conversation.map((m) => (
                      <li key={`${m.kind}-${m.id}`} className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-wider font-semibold">
                          <span className={m.from === "user" ? "text-warm-white/55" : "text-primary"}>
                            {m.from === "user" ? "you" : "kin"}
                          </span>
                          <span className="text-warm-white/30 font-mono normal-case tracking-normal">
                            · {m.kind === "sms" ? "sms" : "chat"} · {formatRelative(m.at)}
                          </span>
                        </div>
                        <p className="text-warm-white/80 text-[13.5px] leading-relaxed line-clamp-3">{m.body}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </section>

            {/* 7-day calendar with conflicts highlighted */}
            <section aria-label="Upcoming calendar">
              <SectionHeader
                icon={CalendarIcon}
                label="Next 7 days"
                right={<Link href="/calendar" className="text-primary text-[12px] font-medium hover:underline">Full view →</Link>}
              />
              <div className="glass-strong rounded-2xl p-4 border border-warm-white/6 max-h-[480px] overflow-y-auto">
                {groupedDays.length === 0 ? (
                  <p className="text-warm-white/45 text-[13.5px] py-2">
                    Nothing on the calendar this week. <Link href="/settings" className="text-primary hover:underline">Connect a calendar</Link> to see events.
                  </p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {groupedDays.map(({ key, date, events: dayEvents }) => (
                      <div key={key}>
                        <div className="text-[11px] uppercase tracking-wider font-semibold text-warm-white/55 mb-2">
                          {dayLabel(date)}
                        </div>
                        <ul className="flex flex-col gap-1.5">
                          {dayEvents.map((e) => {
                            const conflict = eventConflictsWith(e, issues);
                            const color = e.color || (e.is_kid_event ? "#7CB87A" : "#7AADCE");
                            return (
                              <li key={e.id} className={`rounded-xl border p-2.5 flex items-center gap-3 ${conflict ? "border-rose/30 bg-rose/5" : "border-warm-white/5 bg-warm-white/[0.025]"}`}>
                                <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: conflict ? "#D4748A" : color, minHeight: 22 }} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-warm-white/90 text-[13.5px] font-medium truncate">{e.title}</span>
                                    {e.assigned_member && (
                                      <span className="text-[10px] uppercase tracking-wider font-medium text-warm-white/40">· {e.assigned_member}</span>
                                    )}
                                  </div>
                                  <div className="text-warm-white/40 text-[11px] font-mono mt-0.5">
                                    {formatTime(e.start_time)} – {formatTime(e.end_time)}
                                    {e.is_shared ? " · shared" : ""}
                                  </div>
                                  {conflict && (
                                    <div className="mt-1.5 flex items-start gap-1.5 text-rose text-[11.5px]">
                                      <AlertCircle size={12} className="mt-0.5 shrink-0" />
                                      <span className="leading-snug">{conflict.content}</span>
                                    </div>
                                  )}
                                </div>
                                {conflict && <ArrowRight size={12} className="text-rose/50 shrink-0" />}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  label,
  right,
}: {
  icon: LucideIcon;
  label: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-2 px-1">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-warm-white/40" />
        <span className="text-[11.5px] uppercase tracking-[0.08em] font-medium text-warm-white/55">{label}</span>
      </div>
      {right && <div className="text-[12px] text-warm-white/45">{right}</div>}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-20 rounded-2xl bg-warm-white/5" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-72 rounded-2xl bg-warm-white/5" />
        <div className="h-72 rounded-2xl bg-warm-white/5" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
