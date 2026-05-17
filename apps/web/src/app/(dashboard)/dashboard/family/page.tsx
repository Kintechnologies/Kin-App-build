"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  Baby,
  PawPrint,
  UserPlus,
  Loader2,
  Check,
  Clock,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FamilyMember {
  id: string;
  name: string;
  age: number | null;
  member_type: "adult" | "child" | "pet";
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

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^1/, "");
  if (digits.length !== 10) return raw;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const TYPE_META: Record<
  FamilyMember["member_type"],
  { label: string; icon: typeof Users; tone: string; bg: string; border: string }
> = {
  adult: {
    label: "Caregivers",
    icon: Users,
    tone: "#7CB87A",
    bg: "rgba(124,184,122,0.14)",
    border: "rgba(124,184,122,0.3)",
  },
  child: {
    label: "Children",
    icon: Baby,
    tone: "#7AADCE",
    bg: "rgba(122,173,206,0.14)",
    border: "rgba(122,173,206,0.3)",
  },
  pet: {
    label: "Pets",
    icon: PawPrint,
    tone: "#D4A843",
    bg: "rgba(212,168,67,0.14)",
    border: "rgba(212,168,67,0.3)",
  },
};

function MemberRow({ member }: { member: FamilyMember }) {
  const meta = TYPE_META[member.member_type];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 14px",
        background: "rgba(240,237,230,0.02)",
        border: "1px solid var(--hair)",
        borderRadius: "10px",
      }}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          background: meta.bg,
          border: `1px solid ${meta.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: meta.tone,
          fontSize: "13px",
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {member.name.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "14px",
            color: "var(--warm)",
            fontWeight: 500,
          }}
        >
          {member.name}
        </div>
        <MonoLabel>
          {member.member_type === "adult"
            ? "Parent"
            : member.age != null
              ? `${member.age} ${member.age === 1 ? "year" : "years"} old`
              : member.member_type}
        </MonoLabel>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FamilyPage() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [contextNotes, setContextNotes] = useState<string | null>(null);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
          .select("context_notes, partner_phone_pending")
          .eq("id", user.id)
          .single();
        if (!cancelled && profile) {
          setContextNotes(profile.context_notes?.trim() || null);
          setPendingPhone(profile.partner_phone_pending?.trim() || null);
        }

        const { data: rows } = await supabase
          .from("family_members")
          .select("id, name, age, member_type")
          .eq("profile_id", user.id)
          .order("created_at", { ascending: true });
        if (!cancelled && Array.isArray(rows)) {
          setMembers(rows as FamilyMember[]);
        }
      } catch {
        /* non-fatal — empty state renders */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    return {
      adult: members.filter((m) => m.member_type === "adult"),
      child: members.filter((m) => m.member_type === "child"),
      pet: members.filter((m) => m.member_type === "pet"),
    };
  }, [members]);

  async function saveInvite() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setFormError("Enter a valid phone number.");
      return;
    }
    const e164 = digits.length === 10 ? `+1${digits}` : `+${digits}`;
    setSaving(true);
    setFormError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setFormError("Please sign in again.");
        setSaving(false);
        return;
      }
      const { error } = await supabase
        .from("profiles")
        .update({ partner_phone_pending: e164 })
        .eq("id", user.id);
      if (error) {
        setFormError("Could not save. Please try again.");
        setSaving(false);
        return;
      }
      setPendingPhone(e164);
      setSaved(true);
      setPhone("");
      setTimeout(() => setSaved(false), 4000);
    } catch {
      setFormError("Network error. Please try again.");
    }
    setSaving(false);
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
        <MonoLabel>{"// FAMILY"}</MonoLabel>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 500,
            color: "var(--warm)",
            letterSpacing: "-0.025em",
            marginTop: "8px",
          }}
        >
          Your household
        </h1>
        <p
          style={{
            fontSize: "13.5px",
            color: "var(--warm-56)",
            marginTop: "6px",
            lineHeight: 1.55,
            maxWidth: "440px",
          }}
        >
          The people Kin keeps in sync. Everyone here can be part of the
          morning briefing and pickup coordination.
        </p>
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
          <Loader2 size={12} className="animate-spin" /> Loading your household…
        </p>
      ) : (
        <>
          {members.length === 0 && (
            <section
              style={{
                background: "rgba(240,237,230,0.025)",
                border: "1px dashed var(--hair-strong)",
                borderRadius: "12px",
                padding: "24px",
                textAlign: "center",
                fontSize: "13px",
                color: "var(--warm-56)",
                lineHeight: 1.55,
              }}
            >
              No family members on file yet. Invite a caregiver below, or text
              Kin anytime to add your kids and pets.
            </section>
          )}

          {(["adult", "child", "pet"] as const).map((type) => {
            const list = grouped[type];
            if (list.length === 0) return null;
            const meta = TYPE_META[type];
            return (
              <section
                key={type}
                style={{
                  background: "rgba(240,237,230,0.025)",
                  border: "1px solid var(--hair)",
                  borderRadius: "12px",
                  padding: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "14px",
                  }}
                >
                  <meta.icon size={15} style={{ color: meta.tone }} />
                  <h2
                    style={{
                      fontSize: "15px",
                      fontWeight: 500,
                      color: "var(--warm)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {meta.label}
                  </h2>
                  <span
                    style={{
                      fontFamily: "var(--font-geist-mono), monospace",
                      fontSize: "11px",
                      color: "var(--warm-40)",
                    }}
                  >
                    {list.length}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {list.map((m) => (
                    <MemberRow key={m.id} member={m} />
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}

      {/* Invite a caregiver */}
      <section
        style={{
          background: "rgba(240,237,230,0.025)",
          border: "1px solid var(--hair)",
          borderRadius: "12px",
          padding: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "6px",
          }}
        >
          <UserPlus size={15} style={{ color: "var(--sage)" }} />
          <h2
            style={{
              fontSize: "15px",
              fontWeight: 500,
              color: "var(--warm)",
              letterSpacing: "-0.01em",
            }}
          >
            Invite a caregiver
          </h2>
        </div>
        <p
          style={{
            fontSize: "13px",
            color: "var(--warm-56)",
            lineHeight: 1.55,
            marginBottom: "14px",
          }}
        >
          Add a partner, co-parent, or sitter. Drop their number and Kin will
          send them an invite to join your household.
        </p>

        {pendingPhone && !saved && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              padding: "11px 13px",
              background: "rgba(122,173,206,0.1)",
              border: "1px solid rgba(122,173,206,0.3)",
              borderRadius: "10px",
              marginBottom: "14px",
              fontSize: "12.5px",
              color: "#7AADCE",
            }}
          >
            <Clock size={14} style={{ flexShrink: 0 }} />
            <span>
              Invite pending for{" "}
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatPhone(pendingPhone)}
              </span>
            </span>
          </div>
        )}

        {saved ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              padding: "11px 13px",
              background: "var(--sage-12)",
              border: "1px solid var(--hair-sage)",
              borderRadius: "10px",
              fontSize: "13px",
              color: "var(--sage)",
            }}
          >
            <Check size={15} style={{ flexShrink: 0 }} />
            Saved — we&apos;ll send their invite shortly.
          </div>
        ) : (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveInvite();
              }}
              placeholder="(555) 123-4567"
              autoComplete="tel"
              style={{
                flex: "1 1 200px",
                background: "var(--warm-06)",
                border: "1px solid var(--hair-strong)",
                borderRadius: "10px",
                padding: "10px 12px",
                fontSize: "13.5px",
                color: "var(--warm)",
                outline: "none",
              }}
            />
            <button
              onClick={saveInvite}
              disabled={saving}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "7px",
                background: "var(--sage)",
                color: "#0C0F0A",
                border: "none",
                borderRadius: "10px",
                padding: "10px 16px",
                fontSize: "13.5px",
                fontWeight: 600,
                letterSpacing: "-0.15px",
                cursor: saving ? "wait" : "pointer",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Send invite
            </button>
          </div>
        )}

        {formError && (
          <p
            role="alert"
            style={{
              marginTop: "10px",
              fontSize: "12.5px",
              color: "rgba(212,116,138,0.85)",
            }}
          >
            {formError}
          </p>
        )}
      </section>

      {/* What Kin knows */}
      {contextNotes && (
        <section
          style={{
            background: "rgba(240,237,230,0.025)",
            border: "1px solid var(--hair)",
            borderRadius: "12px",
            padding: "20px",
          }}
        >
          <header style={{ marginBottom: "10px" }}>
            <MonoLabel>{"// HOUSEHOLD CONTEXT"}</MonoLabel>
            <h2
              style={{
                fontSize: "15px",
                fontWeight: 500,
                color: "var(--warm)",
                marginTop: "6px",
                letterSpacing: "-0.01em",
              }}
            >
              What Kin knows about your family
            </h2>
          </header>
          <p
            style={{
              fontSize: "13px",
              color: "var(--warm-72)",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
            }}
          >
            {contextNotes}
          </p>
          <p
            style={{
              fontSize: "12px",
              color: "var(--warm-40)",
              lineHeight: 1.5,
              marginTop: "12px",
              borderTop: "1px solid var(--hair)",
              paddingTop: "12px",
            }}
          >
            Text Kin anytime to update this — &ldquo;Nora started daycare on
            Tuesdays&rdquo; and it&apos;ll remember.
          </p>
        </section>
      )}
    </div>
  );
}
