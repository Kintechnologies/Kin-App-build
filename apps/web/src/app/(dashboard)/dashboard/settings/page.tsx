"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatPhone } from "@/lib/format";
import {
  Phone,
  Bell,
  Clock,
  MapPin,
  LogOut,
  Loader2,
  AlertTriangle,
  Trash2,
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
      // P2-D6 (audit v6): aria-label exposes the section as a landmark so
      // screen-reader users can jump between Settings groups via the
      // sections-list shortcut. Without it the regions are unlabeled and
      // every <section> just announces as "region."
      aria-label={title}
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
  hint?: React.ReactNode;
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

// formatPhone lifted to lib/format.ts (audit V7 P2-D6).

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardSettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [timezone, setTimezone] = useState("—");
  const [signingOut, setSigningOut] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
    router.refresh();
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Account deletion failed");
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/?deleted=1");
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Deletion failed");
      setDeleting(false);
    }
  }

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
              hint={
                <>
                  To change your number, text Kin or{" "}
                  <a
                    href="mailto:hello@kinai.family?subject=Change%20my%20phone%20number"
                    style={{
                      color: "var(--warm-56)",
                      textDecoration: "underline",
                      textUnderlineOffset: "2px",
                    }}
                  >
                    email support
                  </a>
                  .
                </>
              }
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
                hint="Delivered every morning in your local time."
              />
              <InfoRow
                icon={MapPin}
                label="Time zone"
                value={timezone}
                hint="Detected from your device. We use the timezone you set during onboarding — text Kin to change it."
              />
              <InfoRow
                icon={Bell}
                label="Delivered to"
                value={formatPhone(profile?.phone_number ?? null)}
              />
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

          <section
            aria-label="Danger zone"
            style={{
              background: "rgba(166,90,74,0.04)",
              border: "0.5px solid rgba(166,90,74,0.25)",
              borderRadius: "8px",
              padding: "20px",
              marginTop: "16px",
            }}
          >
            <header style={{ marginBottom: "12px" }}>
              <span
                className="font-mono uppercase"
                style={{
                  fontSize: "11.5px",
                  letterSpacing: "0.04em",
                  color: "#A65A4A",
                }}
              >
                {"// DANGER ZONE"}
              </span>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: 500,
                  color: "var(--warm)",
                  marginTop: "6px",
                  letterSpacing: "-0.01em",
                }}
              >
                Delete account
              </h2>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--warm-56)",
                  marginTop: "4px",
                  lineHeight: 1.5,
                }}
              >
                Permanently removes your profile, calendar connections,
                briefings, and SMS history. This action cannot be undone.
              </p>
            </header>
            <button
              onClick={() => {
                setDeleteConfirmText("");
                setDeleteError(null);
                setShowDeleteModal(true);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "transparent",
                border: "0.5px solid rgba(166,90,74,0.35)",
                borderRadius: "8px",
                padding: "10px 14px",
                color: "#A65A4A",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <Trash2 size={14} />
              Delete my account
            </button>
          </section>

          {showDeleteModal && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-account-title"
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(28,24,20,0.55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px",
                zIndex: 1000,
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget && !deleting) {
                  setShowDeleteModal(false);
                }
              }}
            >
              <div
                style={{
                  background: "#FDFBF7",
                  border: "0.5px solid var(--hair)",
                  borderRadius: "12px",
                  padding: "24px",
                  maxWidth: "440px",
                  width: "100%",
                  boxShadow: "0 20px 60px rgba(28,24,20,0.25)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "12px",
                  }}
                >
                  <AlertTriangle size={20} color="#A65A4A" />
                  <h3
                    id="delete-account-title"
                    style={{
                      fontSize: "17px",
                      fontWeight: 600,
                      color: "var(--warm)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Delete your account?
                  </h3>
                </div>
                <p
                  style={{
                    fontSize: "13.5px",
                    color: "var(--warm-56)",
                    lineHeight: 1.55,
                    marginBottom: "16px",
                  }}
                >
                  This permanently removes everything Kin has on file — your
                  briefings stop immediately and the data cannot be recovered.
                  To confirm, type <strong>DELETE</strong> below.
                </p>
                <label
                  htmlFor="delete-confirm"
                  style={{
                    display: "block",
                    fontSize: "11.5px",
                    fontFamily: "monospace",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "var(--warm-40)",
                    marginBottom: "6px",
                  }}
                >
                  Type DELETE to confirm
                </label>
                <input
                  id="delete-confirm"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  autoComplete="off"
                  disabled={deleting}
                  style={{
                    width: "100%",
                    background: "var(--warm-06)",
                    border: "0.5px solid var(--hair-strong)",
                    borderRadius: "6px",
                    padding: "10px 12px",
                    fontSize: "14px",
                    color: "var(--warm)",
                    outline: "none",
                    marginBottom: "12px",
                  }}
                />
                {deleteError && (
                  <p
                    style={{
                      fontSize: "12.5px",
                      color: "#A65A4A",
                      marginBottom: "12px",
                    }}
                  >
                    {deleteError}
                  </p>
                )}
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    disabled={deleting}
                    style={{
                      background: "transparent",
                      border: "0.5px solid var(--hair)",
                      borderRadius: "6px",
                      padding: "10px 16px",
                      color: "var(--warm-56)",
                      fontSize: "13px",
                      fontWeight: 500,
                      cursor: deleting ? "wait" : "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting || deleteConfirmText !== "DELETE"}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      background:
                        deleteConfirmText === "DELETE" && !deleting
                          ? "#A65A4A"
                          : "rgba(166,90,74,0.4)",
                      color: "#FDFBF7",
                      border: "none",
                      borderRadius: "6px",
                      padding: "10px 16px",
                      fontSize: "13px",
                      fontWeight: 500,
                      cursor:
                        deleteConfirmText === "DELETE" && !deleting
                          ? "pointer"
                          : "not-allowed",
                    }}
                  >
                    {deleting && <Loader2 size={13} className="animate-spin" />}
                    {deleting ? "Deleting…" : "Delete account"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
