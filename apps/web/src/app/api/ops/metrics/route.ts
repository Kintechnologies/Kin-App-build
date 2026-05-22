/**
 * GET /api/ops/metrics
 *
 * Founder-facing snapshot of system health. Admin-only — gated by phone number
 * against ADMIN_PHONES below. Returns the sections that the /ops dashboard
 * renders as cards:
 *
 *   briefing   — today's sends vs. expected, success rate, average quality
 *   sms        — messages sent today, send-failure count, delivery rate
 *   calendar   — connected calendars, syncs in error, last-sync recency
 *   users      — total households, active-this-week, trial vs. paid
 *   alerts     — placeholder (no alerts_log table in prod yet); empty array
 *   status     — derived green/yellow/red per subsystem
 *
 * Returns 401 if not signed in, 403 if not an admin. All queries run with the
 * service-role key so RLS never silently zeroes out a metric.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const ADMIN_PHONES = new Set(["+16266762222", "+16266762832"]);

type SystemLight = "green" | "yellow" | "red";

interface Metrics {
  generatedAt: string;
  briefing: BriefingHealth;
  sms: SmsHealth;
  calendar: CalendarHealth;
  alerts: AlertEntry[];
  users: UserMetrics;
  status: Record<"briefing" | "sms" | "calendar" | "payments", SystemLight>;
}

interface BriefingHealth {
  expected: number;
  sent: number;
  failed: number;
  successRate: number;
  averageScore: number | null;
  grade: string;
}

interface SmsHealth {
  sentToday: number;
  failedToday: number;
  inboundToday: number;
  deliveryRate: number;
}

interface CalendarHealth {
  connected: number;
  errored: number;
  lastSyncedAt: string | null;
  stale: number;
}

interface AlertEntry {
  id: string;
  severity: "info" | "warning" | "critical";
  category: string;
  message: string;
  createdAt: string;
  delivered: boolean;
}

interface UserMetrics {
  households: number;
  activeLast7d: number;
  trial: number;
  paid: number;
  pastDue: number;
  canceled: number;
  newLast24h: number;
}

function startOfTodayIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function toGrade(score: number | null): string {
  if (score === null) return "—";
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C-";
  if (score >= 60) return "D";
  return "F";
}

async function briefingHealth(
  supabase: ReturnType<typeof createAdminClient>
): Promise<BriefingHealth> {
  const since = startOfTodayIso();

  const { count: expectedCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .not("phone_number", "is", null);

  const { data: todays } = await supabase
    .from("morning_briefings")
    .select("delivery_status, quality_score")
    .gte("created_at", since);

  const rows = todays ?? [];
  const sent = rows.filter((r) => r.delivery_status === "sent").length;
  const failed = rows.filter((r) => r.delivery_status === "failed").length;
  const expected = expectedCount ?? 0;
  const successRate = expected > 0 ? sent / expected : 0;

  const scored = rows
    .map((r) => r.quality_score)
    .filter((s): s is number => typeof s === "number");
  const averageScore =
    scored.length > 0
      ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length)
      : null;

  return {
    expected,
    sent,
    failed,
    successRate,
    averageScore,
    grade: toGrade(averageScore),
  };
}

async function smsHealth(
  supabase: ReturnType<typeof createAdminClient>
): Promise<SmsHealth> {
  const since = startOfTodayIso();
  const { data } = await supabase
    .from("sms_conversations")
    .select("direction")
    .gte("sent_at", since);

  const rows = data ?? [];
  const outbound = rows.filter((r) => r.direction === "outbound").length;
  const failed = rows.filter((r) => r.direction === "outbound_failed").length;
  const inbound = rows.filter((r) => r.direction === "inbound").length;
  const attempted = outbound + failed;
  const deliveryRate = attempted > 0 ? outbound / attempted : 1;

  return {
    sentToday: outbound,
    failedToday: failed,
    inboundToday: inbound,
    deliveryRate,
  };
}

async function calendarHealth(
  supabase: ReturnType<typeof createAdminClient>
): Promise<CalendarHealth> {
  const { data, count } = await supabase
    .from("calendar_connections")
    .select("sync_status, last_synced_at", { count: "exact" })
    .eq("enabled", true);

  const rows = data ?? [];
  const errored = rows.filter((r) => r.sync_status === "error").length;
  const staleCutoff = Date.now() - 6 * 3_600_000; // > 6h since last sync
  const stale = rows.filter(
    (r) => !r.last_synced_at || new Date(r.last_synced_at).getTime() < staleCutoff
  ).length;

  const newest = rows
    .map((r) => r.last_synced_at)
    .filter((t): t is string => Boolean(t))
    .sort()
    .at(-1);

  return {
    connected: count ?? rows.length,
    errored,
    lastSyncedAt: newest ?? null,
    stale,
  };
}

async function userMetrics(
  supabase: ReturnType<typeof createAdminClient>
): Promise<UserMetrics> {
  // Households = primary parents (household_id IS NULL on the primary row).
  const { count: households } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .is("household_id", null);

  const since7d = isoDaysAgo(7);
  const { data: activeRows } = await supabase
    .from("morning_briefings")
    .select("profile_id")
    .eq("delivery_status", "sent")
    .gte("created_at", since7d);
  const activeLast7d = new Set((activeRows ?? []).map((r) => r.profile_id)).size;

  const subCount = async (status: string): Promise<number> => {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("subscription_status", status);
    return count ?? 0;
  };

  const [trial, paid, pastDue, canceled] = await Promise.all([
    subCount("trial"),
    subCount("active"),
    subCount("past_due"),
    subCount("canceled"),
  ]);

  const { count: newLast24h } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .gte("created_at", isoDaysAgo(1));

  return {
    households: households ?? 0,
    activeLast7d,
    trial,
    paid,
    pastDue,
    canceled,
    newLast24h: newLast24h ?? 0,
  };
}

function deriveStatus(
  briefing: BriefingHealth,
  sms: SmsHealth,
  calendar: CalendarHealth,
  users: UserMetrics
): Metrics["status"] {
  const briefingLight: SystemLight =
    briefing.expected === 0
      ? "green"
      : briefing.failed > 0 || briefing.successRate < 0.9
        ? "red"
        : briefing.successRate < 1
          ? "yellow"
          : "green";

  const smsLight: SystemLight =
    sms.failedToday >= 3 || sms.deliveryRate < 0.9
      ? "red"
      : sms.failedToday > 0
        ? "yellow"
        : "green";

  const calendarLight: SystemLight =
    calendar.connected === 0
      ? "green"
      : calendar.errored > 0
        ? "red"
        : calendar.stale > 0
          ? "yellow"
          : "green";

  const paymentsLight: SystemLight =
    users.pastDue > 0 ? "yellow" : "green";

  return {
    briefing: briefingLight,
    sms: smsLight,
    calendar: calendarLight,
    payments: paymentsLight,
  };
}

export async function GET() {
  // Auth: must be signed in and on the hard-coded admin phone list. Phone
  // gating (vs. a profiles.is_admin flag) keeps the route migration-free —
  // ship a dashboard today, formalize admins later.
  const supabaseSession = createClient();
  const {
    data: { user },
  } = await supabaseSession.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("phone_number")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.phone_number || !ADMIN_PHONES.has(profile.phone_number)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Defense-in-depth on top of phone-list gating: 60/min/uid is generous for
  // a single admin browser polling the dashboard, but caps the blast radius if
  // the founder account is ever compromised. (audit v3 P1-I3)
  const rl = await checkRateLimit(user.id, "ops-metrics");
  if (!rl.allowed) return rateLimitResponse(rl);

  const [briefing, sms, calendar, users] = await Promise.all([
    briefingHealth(supabase),
    smsHealth(supabase),
    calendarHealth(supabase),
    userMetrics(supabase),
  ]);

  const metrics: Metrics = {
    generatedAt: new Date().toISOString(),
    briefing,
    sms,
    calendar,
    alerts: [],
    users,
    status: deriveStatus(briefing, sms, calendar, users),
  };

  return NextResponse.json(metrics);
}
