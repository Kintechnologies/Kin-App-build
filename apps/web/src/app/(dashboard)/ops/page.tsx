"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Severity = "info" | "warning" | "critical";
type SystemLight = "green" | "yellow" | "red";
type Subsystem = "briefing" | "sms" | "calendar" | "payments";

interface Metrics {
  generatedAt: string;
  briefing: {
    expected: number;
    sent: number;
    failed: number;
    successRate: number;
    averageScore: number | null;
    grade: string;
  };
  sms: {
    sentToday: number;
    failedToday: number;
    inboundToday: number;
    deliveryRate: number;
  };
  calendar: {
    connected: number;
    errored: number;
    lastSyncedAt: string | null;
    stale: number;
  };
  alerts: Array<{
    id: string;
    severity: Severity;
    category: string;
    message: string;
    createdAt: string;
    delivered: boolean;
  }>;
  users: {
    households: number;
    activeLast7d: number;
    trial: number;
    paid: number;
    pastDue: number;
    canceled: number;
    newLast24h: number;
  };
  status: Record<Subsystem, SystemLight>;
}

const LIGHT_COLOR: Record<SystemLight, string> = {
  green: "#5C6B4F",
  yellow: "#C4A97D",
  red: "#A65A4A",
};

const SEVERITY_COLOR: Record<Severity, string> = {
  info: "#5C6B4F",
  warning: "#C4A97D",
  critical: "#A65A4A",
};

const SEVERITY_DOT: Record<Severity, string> = {
  info: "🟢",
  warning: "🟡",
  critical: "🔴",
};

function fmtPercent(n: number): string {
  return `${Math.round(n * 1000) / 10}%`;
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}

export default function OpsDashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/ops/metrics", { cache: "no-store" });
        if (res.status === 401) {
          router.push("/signin?next=/ops");
          return;
        }
        if (res.status === 403) {
          if (!cancelled) {
            setError("Not authorized — this dashboard is admin-only.");
            setLoading(false);
          }
          return;
        }
        if (!res.ok) {
          if (!cancelled) {
            setError(`Failed to load metrics (HTTP ${res.status})`);
            setLoading(false);
          }
          return;
        }
        const data: Metrics = await res.json();
        if (cancelled) return;
        setMetrics(data);
        setError(null);
        setLoading(false);
        setLastFetched(new Date());
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      }
    }

    load();
    const t = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [router]);

  if (loading) {
    return <ShellMessage>Loading ops metrics…</ShellMessage>;
  }
  if (error) {
    return <ShellMessage>{error}</ShellMessage>;
  }
  if (!metrics) {
    return <ShellMessage>No metrics available.</ShellMessage>;
  }

  return (
    <div
      style={{
        padding: "32px 36px 80px",
        maxWidth: 1180,
        margin: "0 auto",
      }}
    >
      <Header lastFetched={lastFetched} />
      <SystemRow status={metrics.status} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
          marginTop: 20,
        }}
      >
        <BriefingCard m={metrics.briefing} />
        <SmsCard m={metrics.sms} />
        <CalendarCard m={metrics.calendar} />
        <UsersCard m={metrics.users} />
      </div>

      <AlertsCard alerts={metrics.alerts} />
    </div>
  );
}

function Header({ lastFetched }: { lastFetched: Date | null }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        marginBottom: 24,
      }}
    >
      <div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: -0.4,
            color: "var(--warm)",
            margin: 0,
          }}
        >
          Ops
        </h1>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 14,
            color: "var(--warm-56)",
          }}
        >
          Founder-only view. Auto-refreshes every 60s.
        </p>
      </div>
      <span style={{ fontSize: 12, color: "var(--warm-40)" }}>
        {lastFetched
          ? `Updated ${lastFetched.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
          : ""}
      </span>
    </div>
  );
}

function SystemRow({ status }: { status: Metrics["status"] }) {
  const items: Array<{ key: Subsystem; label: string }> = [
    { key: "briefing", label: "Briefing" },
    { key: "sms", label: "SMS" },
    { key: "calendar", label: "Calendar" },
    { key: "payments", label: "Payments" },
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 10,
        marginBottom: 4,
      }}
    >
      {items.map(({ key, label }) => (
        <div
          key={key}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            border: "0.5px solid var(--hair)",
            borderRadius: "var(--radius)",
            background: "var(--bg-card)",
          }}
        >
          <span
            aria-hidden
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: LIGHT_COLOR[status[key]],
              boxShadow: `0 0 0 3px ${LIGHT_COLOR[status[key]]}22`,
            }}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--warm)",
            }}
          >
            {label}
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              color: "var(--warm-56)",
            }}
          >
            {status[key]}
          </span>
        </div>
      ))}
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        border: "0.5px solid var(--hair)",
        borderRadius: "var(--radius-lg)",
        background: "var(--bg-card)",
        padding: 20,
      }}
    >
      <h2
        style={{
          margin: "0 0 14px",
          fontSize: 12,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: "var(--warm-56)",
          fontWeight: 600,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          color: "var(--warm-40)",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: "var(--warm)",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {hint && (
        <div style={{ fontSize: 12, color: "var(--warm-56)", marginTop: 2 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function StatGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        rowGap: 16,
        columnGap: 12,
      }}
    >
      {children}
    </div>
  );
}

function BriefingCard({ m }: { m: Metrics["briefing"] }) {
  return (
    <Card title="Briefing Health">
      <StatGrid>
        <Stat
          label="Today"
          value={`${m.sent} / ${m.expected}`}
          hint={`${m.failed} failed`}
        />
        <Stat label="Success rate" value={fmtPercent(m.successRate)} />
        <Stat
          label="Avg quality"
          value={
            m.averageScore !== null
              ? `${m.grade} (${m.averageScore})`
              : m.grade
          }
          hint="Last 24h"
        />
        <Stat
          label="Failed"
          value={m.failed}
          hint={m.failed > 0 ? "needs eyes" : "none"}
        />
      </StatGrid>
    </Card>
  );
}

function SmsCard({ m }: { m: Metrics["sms"] }) {
  return (
    <Card title="SMS Health">
      <StatGrid>
        <Stat label="Sent today" value={m.sentToday} />
        <Stat
          label="Delivery rate"
          value={fmtPercent(m.deliveryRate)}
          hint={m.failedToday > 0 ? `${m.failedToday} send failures` : "clean"}
        />
        <Stat label="Inbound today" value={m.inboundToday} />
        <Stat label="Send failures" value={m.failedToday} />
      </StatGrid>
    </Card>
  );
}

function CalendarCard({ m }: { m: Metrics["calendar"] }) {
  return (
    <Card title="Calendar Health">
      <StatGrid>
        <Stat label="Connected" value={m.connected} />
        <Stat
          label="In error"
          value={m.errored}
          hint={m.errored > 0 ? "auth or sync failure" : "—"}
        />
        <Stat label="Stale (>6h)" value={m.stale} />
        <Stat label="Last sync" value={fmtRelative(m.lastSyncedAt)} />
      </StatGrid>
    </Card>
  );
}

function UsersCard({ m }: { m: Metrics["users"] }) {
  return (
    <Card title="User Metrics">
      <StatGrid>
        <Stat label="Households" value={m.households} />
        <Stat
          label="Active 7d"
          value={m.activeLast7d}
          hint="received a briefing"
        />
        <Stat
          label="Trial / Paid"
          value={`${m.trial} / ${m.paid}`}
          hint={
            m.pastDue > 0
              ? `${m.pastDue} past due, ${m.canceled} canceled`
              : `${m.canceled} canceled`
          }
        />
        <Stat label="New (24h)" value={m.newLast24h} />
      </StatGrid>
    </Card>
  );
}

function AlertsCard({ alerts }: { alerts: Metrics["alerts"] }) {
  return (
    <section
      style={{
        marginTop: 20,
        border: "0.5px solid var(--hair)",
        borderRadius: "var(--radius-lg)",
        background: "var(--bg-card)",
        overflow: "hidden",
      }}
    >
      <h2
        style={{
          margin: 0,
          padding: "16px 20px",
          fontSize: 12,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: "var(--warm-56)",
          fontWeight: 600,
          borderBottom: "0.5px solid var(--hair)",
        }}
      >
        Recent Alerts
      </h2>
      {alerts.length === 0 ? (
        <div style={{ padding: "24px 20px", color: "var(--warm-56)", fontSize: 14 }}>
          No alerts logged yet.
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {alerts.map((a) => (
            <li
              key={a.id}
              style={{
                display: "grid",
                gridTemplateColumns: "20px 96px 1fr auto",
                gap: 12,
                alignItems: "baseline",
                padding: "12px 20px",
                borderTop: "0.5px solid var(--hair)",
              }}
            >
              <span aria-hidden style={{ fontSize: 11 }}>
                {SEVERITY_DOT[a.severity]}
              </span>
              <span
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  color: SEVERITY_COLOR[a.severity],
                  fontWeight: 600,
                }}
              >
                {a.category}
              </span>
              <span
                style={{
                  fontSize: 14,
                  color: "var(--warm)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={a.message}
              >
                {a.message}
              </span>
              <span style={{ fontSize: 12, color: "var(--warm-40)" }}>
                {fmtRelative(a.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ShellMessage({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "60px 36px",
        maxWidth: 720,
        margin: "0 auto",
        color: "var(--warm-56)",
        fontSize: 14,
      }}
    >
      <h1
        style={{
          fontSize: 24,
          fontWeight: 600,
          color: "var(--warm)",
          margin: "0 0 12px",
        }}
      >
        Ops
      </h1>
      {children}
    </div>
  );
}
