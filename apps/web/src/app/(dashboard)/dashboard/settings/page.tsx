"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/ThemeProvider";
import {
  Phone,
  Bell,
  Clock,
  MapPin,
  Moon,
  Sun,
  Check,
  LogOut,
  Loader2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Profile {
  email: string | null;
  phone_number: string | null;
  first_name: string | null;
}

// ── Atoms ─────────────────────────────────────────────────────────────────────

function MonoLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-mono uppercase"
      style={{
        fontSize: "11.5px",
        letterSpacing: "0.04em",
        color: "var(--warm-40)",
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
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: "#FDFBF7",
        border: "0.5px solid var(--hair)",
        borderRadius: "8px",
        padding: "20px",
      }}
    >
      <header style={{ marginBottom: "16px" }}>
        <MonoLabel>{label}</MonoLabel>
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 500,
            color: "var(--warm)",
            marginTop: "6px",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h2>
        {description && (
          <p
            style={{
              fontSize: "13px",
              color: "var(--warm-56)",
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

function InfoRow({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 14px",
        background: "rgba(44,44,40,0.02)",
        border: "0.5px solid var(--hair)",
        borderRadius: "8px",
      }}
    >
      <div
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "8px",
          background: "var(--warm-06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--warm-56)",
          flexShrink: 0,
        }}
      >
        <Icon size={15} strokeWidth={1.8} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <MonoLabel>{label}</MonoLabel>
        <div
          style={{
            fontSize: "14px",
            color: "var(--warm)",
            marginTop: "2px",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </div>
        {hint && (
          <div
            style={{
              fontSize: "12px",
              color: "var(--warm-40)",
              marginTop: "3px",
              lineHeight: 1.45,
            }}
          >
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}

function formatPhone(raw: string | null): string {
  if (!raw) return "Not on file";
  const digits = raw.replace(/\D/g, "").replace(/^1/, "");
  if (digits.length !== 10) return raw;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardSettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [timezone, setTimezone] = useState("—");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    try {
      setTimezone(
        Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " "),
      );
    } catch {
      /* keep fallback */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data } = await supabase
          .from("profiles")
          .select("email, phone_number, first_name")
          .eq("id", user.id)
          .single();
        if (data && !cancelled) {
          setProfile({
            email: data.email ?? user.email ?? null,
            phone_number: data.phone_number,
            first_name: data.first_name,
          });
        } else if (!cancelled) {
          setProfile({
            email: user.email ?? null,
            phone_number: null,
            first_name: null,
          });
        }
      } catch {
        /* non-fatal */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/signin");
  }

  const isDark = theme === "dark" || theme === "system";

  return (
    <div
      style={{
        maxWidth: "640px",
        margin: "0 auto",
        padding: "32px clamp(20px, 4vw, 32px) 56px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <header>
        <MonoLabel>{"// SETTINGS"}</MonoLabel>
        <h1
          style={{
            fontFamily: "var(--font-instrument-serif), 'Playfair Display', serif",
            fontSize: "34px",
            fontWeight: 400,
            color: "var(--warm)",
            letterSpacing: "-0.015em",
            marginTop: "8px",
          }}
        >
          Settings
        </h1>
        {profile?.email && (
          <p
            style={{
              fontSize: "13.5px",
              color: "var(--warm-56)",
              marginTop: "6px",
            }}
          >
            Signed in as {profile.email}
          </p>
        )}
      </header>

      {loading ? (
        <p
          style={{
            fontSize: "13px",
            color: "var(--warm-40)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <Loader2 size={12} className="animate-spin" /> Loading your account…
        </p>
      ) : (
        <>
          <SectionCard
            label="// ACCOUNT"
            title="Phone number"
            description="The number Kin texts your briefing to and listens on for replies."
          >
            <InfoRow
              icon={Phone}
              label="On file"
              value={formatPhone(profile?.phone_number ?? null)}
              hint="To change your number, text Kin or reach out to support."
            />
          </SectionCard>

          <SectionCard
            label="// NOTIFICATIONS"
            title="Morning briefing"
            description="When and where your daily briefing arrives."
          >
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              <InfoRow
                icon={Clock}
                label="Briefing time"
                value="6:00 AM"
                hint="Delivered every morning. Custom times are coming soon."
              />
              <InfoRow
                icon={MapPin}
                label="Time zone"
                value={timezone}
                hint="Detected from your device — this sets when 6:00 AM lands."
              />
              <InfoRow
                icon={Bell}
                label="Delivered to"
                value={formatPhone(profile?.phone_number ?? null)}
              />
            </div>
          </SectionCard>

          <SectionCard
            label="// APPEARANCE"
            title="Theme"
            description="Choose how Kin looks. Light mode is in development."
          >
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                onClick={() => setTheme("dark")}
                style={{
                  flex: "1 1 140px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 14px",
                  background: isDark ? "var(--sage-12)" : "rgba(44,44,40,0.02)",
                  border: isDark
                    ? "0.5px solid rgba(92,107,79,0.5)"
                    : "0.5px solid var(--hair)",
                  borderRadius: "8px",
                  color: isDark ? "var(--sage)" : "var(--warm-72)",
                  cursor: "pointer",
                  fontSize: "13.5px",
                  fontWeight: 500,
                  textAlign: "left",
                }}
              >
                <Moon size={15} />
                <span style={{ flex: 1 }}>Dark</span>
                {isDark && <Check size={14} />}
              </button>
              <button
                onClick={() => setTheme("light")}
                style={{
                  flex: "1 1 140px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 14px",
                  background:
                    theme === "light"
                      ? "var(--sage-12)"
                      : "rgba(44,44,40,0.02)",
                  border:
                    theme === "light"
                      ? "0.5px solid rgba(92,107,79,0.5)"
                      : "0.5px solid var(--hair)",
                  borderRadius: "8px",
                  color: theme === "light" ? "var(--sage)" : "var(--warm-72)",
                  cursor: "pointer",
                  fontSize: "13.5px",
                  fontWeight: 500,
                  textAlign: "left",
                }}
              >
                <Sun size={15} />
                <span style={{ flex: 1 }}>Light</span>
                {theme === "light" ? (
                  <Check size={14} />
                ) : (
                  <span
                    className="font-mono"
                    style={{
                      fontSize: "9.5px",
                      letterSpacing: "0.05em",
                      color: "var(--warm-24)",
                      textTransform: "uppercase",
                    }}
                  >
                    Soon
                  </span>
                )}
              </button>
            </div>
          </SectionCard>

          <button
            onClick={handleSignOut}
            disabled={signingOut}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              background: "transparent",
              border: "0.5px solid var(--hair)",
              borderRadius: "8px",
              padding: "14px",
              color: "var(--warm-56)",
              fontSize: "13.5px",
              fontWeight: 500,
              cursor: signingOut ? "wait" : "pointer",
              transition:
                "color 180ms ease, border-color 180ms ease, background 180ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#A65A4A";
              e.currentTarget.style.borderColor = "rgba(166,90,74,0.25)";
              e.currentTarget.style.background = "rgba(166,90,74,0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--warm-56)";
              e.currentTarget.style.borderColor = "var(--hair)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            {signingOut ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <LogOut size={14} />
            )}
            Sign out
          </button>
        </>
      )}
    </div>
  );
}
