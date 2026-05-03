"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  Check,
  Trash2,
  Phone,
  Sun,
  Moon,
  CreditCard,
  Gift,
  Copy,
  LogOut,
  X,
  Loader2,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  email: string | null;
  family_name: string | null;
  subscription_tier: "free" | "starter" | "family" | string;
  trial_ends_at: string | null;
  phone_number: string | null;
  referral_code: string | null;
}

interface FamilyMember {
  id: string;
  name: string;
  member_type: "adult" | "child" | "pet";
  age: number | null;
  phone_number?: string | null;
  role?: string | null;
}

interface CalendarConnection {
  id: string;
  provider: "google" | "apple";
  email?: string | null;
  account_label?: string | null;
  enabled?: boolean;
  sync_status?: "idle" | "syncing" | "error";
}

// ── Demo fallbacks ────────────────────────────────────────────────────────────
// Realistic placeholder values for sections without backend coverage yet.

const DEMO_CALENDARS: CalendarConnection[] = [
  {
    id: "demo-1",
    provider: "google",
    email: "austin@gmail.com",
    account_label: "Personal",
    enabled: true,
    sync_status: "idle",
  },
  {
    id: "demo-2",
    provider: "google",
    email: "austin@company.com",
    account_label: "Work",
    enabled: true,
    sync_status: "idle",
  },
];

const DEMO_FAMILY: FamilyMember[] = [
  {
    id: "demo-a",
    name: "Austin",
    member_type: "adult",
    age: null,
    phone_number: "+1 415-555-0117",
    role: "Parent",
  },
  {
    id: "demo-b",
    name: "Sam",
    member_type: "adult",
    age: null,
    phone_number: "+1 415-555-0204",
    role: "Parent",
  },
];

// ── Shared atoms ──────────────────────────────────────────────────────────────

function MonoLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-mono uppercase"
      style={{
        fontSize: "11.5px",
        letterSpacing: "0.04em",
        color: "rgba(240,237,230,0.4)",
      }}
    >
      {children}
    </span>
  );
}

function SectionCard({
  label,
  title,
  description,
  children,
}: {
  label: string;
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: "rgba(240,237,230,0.025)",
        border: "1px solid rgba(240,237,230,0.06)",
        borderRadius: "12px",
        padding: "20px",
      }}
    >
      <header style={{ marginBottom: "18px" }}>
        <MonoLabel>{label}</MonoLabel>
        {title && (
          <h2
            style={{
              fontSize: "17px",
              fontWeight: 500,
              color: "#F0EDE6",
              marginTop: "6px",
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </h2>
        )}
        {description && (
          <p
            style={{
              fontSize: "13.5px",
              color: "rgba(240,237,230,0.56)",
              marginTop: "4px",
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}

function ProviderGlyph({ provider }: { provider: "google" | "apple" }) {
  if (provider === "google") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#F0EDE6" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function StatusDot({ status }: { status: "connected" | "syncing" | "error" }) {
  const color =
    status === "connected"
      ? "#7CB87A"
      : status === "syncing"
        ? "#7AADCE"
        : "#D4748A";
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: "6px",
        height: "6px",
        borderRadius: "50%",
        background: color,
        boxShadow: `0 0 8px ${color}`,
      }}
    />
  );
}

function GhostButton({
  children,
  onClick,
  type = "button",
  disabled,
  tone = "default",
  fullWidth,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  tone?: "default" | "sage" | "danger";
  fullWidth?: boolean;
}) {
  const colors = {
    default: { color: "rgba(240,237,230,0.7)", border: "rgba(240,237,230,0.12)", hover: "rgba(240,237,230,0.2)" },
    sage: { color: "#7CB87A", border: "rgba(124,184,122,0.35)", hover: "rgba(124,184,122,0.6)" },
    danger: { color: "rgba(212,116,138,0.85)", border: "rgba(212,116,138,0.25)", hover: "rgba(212,116,138,0.5)" },
  }[tone];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: fullWidth ? "100%" : undefined,
        background: "transparent",
        border: `1px solid ${colors.border}`,
        borderRadius: "10px",
        padding: "9px 14px",
        fontSize: "13px",
        fontWeight: 500,
        color: colors.color,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        letterSpacing: "-0.1px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        transition: "border-color 180ms ease, color 180ms ease, background 180ms ease",
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.borderColor = colors.hover;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.borderColor = colors.border;
        }
      }}
    >
      {children}
    </button>
  );
}

// ── Sections ──────────────────────────────────────────────────────────────────

function CalendarsSection({
  connections,
  onConnect,
  onDisconnect,
  loading,
}: {
  connections: CalendarConnection[];
  onConnect: () => void;
  onDisconnect: (id: string, provider: "google" | "apple") => void;
  loading: boolean;
}) {
  return (
    <SectionCard
      label="// CALENDARS"
      title="Connected calendars"
      description="Kin reads these to build your morning briefing and coordinate pickups."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {connections.length === 0 && !loading && (
          <p style={{ fontSize: "13.5px", color: "rgba(240,237,230,0.4)" }}>
            No calendars connected yet.
          </p>
        )}
        {connections.map((conn) => (
          <div
            key={conn.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 14px",
              background: "rgba(240,237,230,0.02)",
              border: "1px solid rgba(240,237,230,0.05)",
              borderRadius: "10px",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(240,237,230,0.04)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ProviderGlyph provider={conn.provider} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "2px",
                }}
              >
                <span
                  style={{
                    fontSize: "14px",
                    color: "#F0EDE6",
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {conn.email ?? (conn.provider === "google" ? "Google account" : "Apple account")}
                </span>
                <StatusDot
                  status={
                    conn.sync_status === "error"
                      ? "error"
                      : conn.sync_status === "syncing"
                        ? "syncing"
                        : "connected"
                  }
                />
              </div>
              <MonoLabel>
                {conn.provider} ·{" "}
                {conn.account_label ?? (conn.sync_status === "error" ? "Sync error" : "Connected")}
              </MonoLabel>
            </div>
            <button
              onClick={() => onDisconnect(conn.id, conn.provider)}
              aria-label="Disconnect calendar"
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(240,237,230,0.3)",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "color 180ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#D4748A";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(240,237,230,0.3)";
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "14px" }}>
        <GhostButton onClick={onConnect} tone="sage">
          <Plus size={14} /> Connect calendar
        </GhostButton>
      </div>
    </SectionCard>
  );
}

function FamilySection({
  members,
  onAdd,
  onRemove,
}: {
  members: FamilyMember[];
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <SectionCard
      label="// FAMILY"
      title="Family members"
      description="The people Kin coordinates between. Phone numbers receive the morning briefing."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {members.map((m) => (
          <div
            key={m.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 14px",
              background: "rgba(240,237,230,0.02)",
              border: "1px solid rgba(240,237,230,0.05)",
              borderRadius: "10px",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "rgba(124,184,122,0.14)",
                border: "1px solid rgba(124,184,122,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#7CB87A",
                fontSize: "13px",
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {m.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "8px",
                  marginBottom: "2px",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: "14px",
                    color: "#F0EDE6",
                    fontWeight: 500,
                  }}
                >
                  {m.name}
                </span>
                <MonoLabel>{m.role ?? "Parent"}</MonoLabel>
              </div>
              {m.phone_number && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    fontSize: "12.5px",
                    color: "rgba(240,237,230,0.56)",
                  }}
                >
                  <Phone size={11} aria-hidden="true" />
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{m.phone_number}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => onRemove(m.id)}
              aria-label={`Remove ${m.name}`}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(240,237,230,0.3)",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "color 180ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#D4748A";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(240,237,230,0.3)";
              }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "8px", marginTop: "14px", flexWrap: "wrap" }}>
        <GhostButton onClick={onAdd} tone="sage">
          <Plus size={14} /> Add member
        </GhostButton>
        <GhostButton onClick={onAdd}>
          <Plus size={14} /> Add caregiver
        </GhostButton>
      </div>
    </SectionCard>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark" || theme === "system";

  return (
    <SectionCard
      label="// APPEARANCE"
      title="Theme"
      description="Choose how Kin looks. Light mode is in development."
    >
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <ThemeOption
          icon={<Moon size={15} />}
          label="Dark"
          selected={isDark}
          onClick={() => setTheme("dark")}
        />
        <ThemeOption
          icon={<Sun size={15} />}
          label="Light"
          selected={theme === "light"}
          onClick={() => setTheme("light")}
          comingSoon
        />
      </div>
    </SectionCard>
  );
}

function ThemeOption({
  icon,
  label,
  selected,
  onClick,
  comingSoon,
}: {
  icon: React.ReactNode;
  label: string;
  selected: boolean;
  onClick: () => void;
  comingSoon?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: "1 1 140px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px 14px",
        background: selected ? "rgba(124,184,122,0.1)" : "rgba(240,237,230,0.02)",
        border: selected
          ? "1px solid rgba(124,184,122,0.5)"
          : "1px solid rgba(240,237,230,0.06)",
        borderRadius: "10px",
        color: selected ? "#7CB87A" : "rgba(240,237,230,0.7)",
        cursor: "pointer",
        fontSize: "13.5px",
        fontWeight: 500,
        letterSpacing: "-0.1px",
        textAlign: "left",
        transition: "border-color 180ms ease, background 180ms ease",
      }}
    >
      <span style={{ display: "flex", alignItems: "center" }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {selected && <Check size={14} aria-hidden="true" />}
      {comingSoon && (
        <span
          className="font-mono"
          style={{
            fontSize: "9.5px",
            letterSpacing: "0.05em",
            color: "rgba(240,237,230,0.35)",
            textTransform: "uppercase",
          }}
        >
          Soon
        </span>
      )}
    </button>
  );
}

function PlanSection({ profile }: { profile: Profile | null }) {
  const tier = profile?.subscription_tier ?? "free";
  const trialActive = profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date();
  const trialDaysLeft = trialActive
    ? Math.max(
        1,
        Math.ceil((new Date(profile!.trial_ends_at!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      )
    : 0;

  const planLabel =
    tier === "family" ? "Kin Family" : tier === "starter" ? "Kin Starter" : "Kin Family";
  const planPrice = tier === "starter" ? "$19/month" : "$39/month";
  const trialEndDate = profile?.trial_ends_at
    ? new Date(profile.trial_ends_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <SectionCard label="// PLAN">
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <h2
                style={{
                  fontSize: "17px",
                  fontWeight: 500,
                  color: "#F0EDE6",
                  letterSpacing: "-0.01em",
                }}
              >
                {planLabel}
              </h2>
              <span
                style={{
                  fontSize: "13px",
                  color: "rgba(240,237,230,0.56)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                · {planPrice}
              </span>
            </div>
            {trialActive ? (
              <p style={{ fontSize: "13px", color: "rgba(240,237,230,0.56)" }}>
                Free trial · {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} left
                {trialEndDate ? ` (ends ${trialEndDate})` : ""}
              </p>
            ) : tier === "free" ? (
              <p style={{ fontSize: "13px", color: "rgba(240,237,230,0.56)" }}>
                No active subscription
              </p>
            ) : (
              <p style={{ fontSize: "13px", color: "rgba(240,237,230,0.56)" }}>
                Active · billed monthly
              </p>
            )}
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 10px",
              background: trialActive
                ? "rgba(122,173,206,0.1)"
                : tier === "free"
                  ? "rgba(240,237,230,0.04)"
                  : "rgba(124,184,122,0.1)",
              border: trialActive
                ? "1px solid rgba(122,173,206,0.3)"
                : tier === "free"
                  ? "1px solid rgba(240,237,230,0.08)"
                  : "1px solid rgba(124,184,122,0.3)",
              borderRadius: "999px",
              fontSize: "11.5px",
              fontWeight: 500,
              color: trialActive
                ? "#7AADCE"
                : tier === "free"
                  ? "rgba(240,237,230,0.5)"
                  : "#7CB87A",
              fontFamily: "var(--font-geist-mono), monospace",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {trialActive ? "Trial" : tier === "free" ? "Inactive" : "Active"}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 14px",
            background: "rgba(240,237,230,0.02)",
            border: "1px solid rgba(240,237,230,0.05)",
            borderRadius: "10px",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "rgba(240,237,230,0.04)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(240,237,230,0.6)",
            }}
          >
            <CreditCard size={15} />
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: "13.5px",
                color: "#F0EDE6",
                fontVariantNumeric: "tabular-nums",
                marginBottom: "2px",
              }}
            >
              Visa •••• 4242
            </div>
            <MonoLabel>Expires 04/29</MonoLabel>
          </div>
          <GhostButton>Update</GhostButton>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <Link
            href="/pricing"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              background: "#7CB87A",
              color: "#0C0F0A",
              border: "none",
              borderRadius: "10px",
              padding: "10px 16px",
              fontSize: "13.5px",
              fontWeight: 600,
              letterSpacing: "-0.15px",
              textDecoration: "none",
            }}
          >
            Change plan
          </Link>
          <button
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(240,237,230,0.4)",
              fontSize: "12.5px",
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
              padding: "6px 0",
              transition: "color 180ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "rgba(212,116,138,0.85)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(240,237,230,0.4)";
            }}
          >
            Cancel subscription
          </button>
        </div>
      </div>
    </SectionCard>
  );
}

function ReferralsSection({ profile }: { profile: Profile | null }) {
  const [copied, setCopied] = useState(false);
  const referralCode = profile?.referral_code ?? "";
  const link = referralCode ? `kinai.family/join/${referralCode}` : "kinai.family/join/...";

  function copy() {
    if (!referralCode) return;
    navigator.clipboard.writeText(`https://${link}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <SectionCard
      label="// REFERRALS"
      title="Share Kin with another family"
      description="Send your link. They get their first month free, you earn a free month when they subscribe."
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 12px",
          background: "rgba(240,237,230,0.02)",
          border: "1px solid rgba(240,237,230,0.05)",
          borderRadius: "10px",
          marginBottom: "12px",
        }}
      >
        <Gift size={14} style={{ color: "rgba(240,237,230,0.4)", flexShrink: 0 }} />
        <span
          className="font-mono"
          style={{
            flex: 1,
            fontSize: "12.5px",
            color: "#7CB87A",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            letterSpacing: "-0.1px",
          }}
        >
          {link}
        </span>
        <button
          onClick={copy}
          disabled={!referralCode}
          aria-label="Copy referral link"
          style={{
            background: copied ? "rgba(124,184,122,0.15)" : "transparent",
            border: copied ? "1px solid rgba(124,184,122,0.4)" : "1px solid rgba(240,237,230,0.08)",
            borderRadius: "8px",
            padding: "6px",
            color: copied ? "#7CB87A" : "rgba(240,237,230,0.5)",
            cursor: referralCode ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "color 180ms ease, background 180ms ease, border-color 180ms ease",
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: "13.5px", color: "#F0EDE6", marginBottom: "2px" }}>
            <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>0</span>{" "}
            <span style={{ color: "rgba(240,237,230,0.56)" }}>referrals so far</span>
          </div>
          <MonoLabel>Up to 3 free months · then $15 credit each</MonoLabel>
        </div>
        <Link
          href="/settings/referrals"
          style={{
            fontSize: "12.5px",
            color: "rgba(240,237,230,0.6)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          View details →
        </Link>
      </div>
    </SectionCard>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [calendars, setCalendars] = useState<CalendarConnection[]>([]);
  const [loadingCals, setLoadingCals] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, email, family_name, subscription_tier, trial_ends_at, phone_number, referral_code")
        .eq("id", user.id)
        .single();
      if (profileData && !cancelled) setProfile(profileData as Profile);

      const { data: members } = await supabase
        .from("family_members")
        .select("id, name, member_type, age")
        .eq("profile_id", user.id)
        .eq("member_type", "adult")
        .order("created_at", { ascending: true });

      if (!cancelled) {
        // Hydrate adult members with phone numbers — for the demo we pair the
        // signed-in user's actual phone with their first member, then fall back
        // to placeholder numbers so the section renders something real-looking.
        const live = (members || []) as FamilyMember[];
        if (live.length > 0) {
          const hydrated = live.map((m, i) => ({
            ...m,
            phone_number:
              i === 0
                ? (profileData as Profile | null)?.phone_number ?? DEMO_FAMILY[i]?.phone_number ?? null
                : DEMO_FAMILY[i]?.phone_number ?? null,
            role: "Parent",
          }));
          setFamilyMembers(hydrated);
        } else {
          setFamilyMembers(DEMO_FAMILY);
        }
      }

      try {
        const res = await fetch("/api/calendar/sync");
        if (res.ok && !cancelled) {
          const { connections } = await res.json();
          if (Array.isArray(connections) && connections.length > 0) {
            setCalendars(connections as CalendarConnection[]);
          } else {
            setCalendars(DEMO_CALENDARS);
          }
        } else if (!cancelled) {
          setCalendars(DEMO_CALENDARS);
        }
      } catch {
        if (!cancelled) setCalendars(DEMO_CALENDARS);
      } finally {
        if (!cancelled) setLoadingCals(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/signin");
  }

  async function connectGoogle() {
    try {
      const res = await fetch("/api/calendar/google");
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      // no-op — surfaced by parent error boundary if needed
    }
  }

  function disconnectCalendar(id: string, provider: "google" | "apple") {
    setCalendars((prev) => prev.filter((c) => c.id !== id));
    if (id.startsWith("demo-")) return;
    const endpoint = provider === "google" ? "/api/calendar/google" : "/api/calendar/apple/connect";
    fetch(endpoint, { method: "DELETE" }).catch(() => {});
  }

  function removeMember(id: string) {
    setFamilyMembers((prev) => prev.filter((m) => m.id !== id));
  }

  function addMember() {
    // Placeholder — real add-member flow lives in onboarding for now.
  }

  const headerName = useMemo(() => {
    if (profile?.family_name) return `${profile.family_name} family`;
    return "Settings";
  }, [profile?.family_name]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Page header */}
      <header style={{ marginBottom: "4px" }}>
        <MonoLabel>{"// SETTINGS"}</MonoLabel>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 500,
            color: "#F0EDE6",
            letterSpacing: "-0.025em",
            marginTop: "8px",
            marginBottom: "6px",
          }}
        >
          {headerName}
        </h1>
        {profile?.email && (
          <p
            style={{
              fontSize: "13.5px",
              color: "rgba(240,237,230,0.56)",
            }}
          >
            Signed in as {profile.email}
          </p>
        )}
        {!profile && (
          <p
            style={{
              fontSize: "13.5px",
              color: "rgba(240,237,230,0.4)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Loader2 size={12} className="animate-spin" /> Loading account…
          </p>
        )}
      </header>

      <CalendarsSection
        connections={calendars}
        onConnect={connectGoogle}
        onDisconnect={disconnectCalendar}
        loading={loadingCals}
      />

      <FamilySection members={familyMembers} onAdd={addMember} onRemove={removeMember} />

      <AppearanceSection />

      <PlanSection profile={profile} />

      <ReferralsSection profile={profile} />

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          background: "transparent",
          border: "1px solid rgba(240,237,230,0.06)",
          borderRadius: "12px",
          padding: "14px",
          color: "rgba(240,237,230,0.56)",
          fontSize: "13.5px",
          fontWeight: 500,
          cursor: "pointer",
          transition: "color 180ms ease, border-color 180ms ease, background 180ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#D4748A";
          e.currentTarget.style.borderColor = "rgba(212,116,138,0.25)";
          e.currentTarget.style.background = "rgba(212,116,138,0.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "rgba(240,237,230,0.56)";
          e.currentTarget.style.borderColor = "rgba(240,237,230,0.06)";
          e.currentTarget.style.background = "transparent";
        }}
      >
        <LogOut size={14} /> Sign out
      </button>

      <p
        className="font-mono"
        style={{
          fontSize: "10.5px",
          color: "rgba(240,237,230,0.25)",
          textAlign: "center",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          paddingBottom: "24px",
        }}
      >
        Kin · Built for families
      </p>
    </div>
  );
}
