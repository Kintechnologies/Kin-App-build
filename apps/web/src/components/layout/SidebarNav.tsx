"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarCheck,
  Users,
  CreditCard,
  Settings as SettingsIcon,
  Menu,
  X,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const SIDEBAR_W = 232;

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string | null;
  enabled?: boolean;
};

const NAV: NavItem[] = [
  { href: "/dashboard/family", label: "Household", icon: Users, enabled: true },
  { href: "/dashboard/calendars", label: "Calendars", icon: CalendarCheck, enabled: true },
  { href: "/dashboard/billing", label: "Payments", icon: CreditCard, enabled: true },
  { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon, enabled: true },
];

function nextBriefCountdown(): string {
  const now = new Date();
  const next = new Date(now);
  next.setHours(6, 0, 0, 0);
  if (now.getHours() >= 6) next.setDate(next.getDate() + 1);
  const ms = next.getTime() - now.getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [countdown, setCountdown] = useState("06:00");
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setCountdown(nextBriefCountdown());
    const t = setInterval(() => setCountdown(nextBriefCountdown()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        if (user.email) setEmail(user.email);
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name")
          .eq("id", user.id)
          .single();
        if (cancelled) return;
        if (profile?.first_name) {
          setName(profile.first_name.split(" ")[0]);
        } else if (user.email) {
          setName(user.email.split("@")[0]);
        }
      } catch {
        /* non-fatal */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/signin");
  }

  const initial = (name || email || "K").charAt(0).toUpperCase();

  const NavList = (
    <nav style={{ display: "flex", flexDirection: "column", gap: 2 }} aria-label="Main">
      {NAV.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname?.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "9px 12px",
              borderRadius: 8,
              color: isActive ? "var(--sage)" : "var(--warm-72)",
              background: isActive ? "var(--sage-12)" : "transparent",
              border: isActive ? "0.5px solid var(--hair-sage)" : "0.5px solid transparent",
              fontSize: 13.5,
              fontWeight: isActive ? 500 : 400,
              letterSpacing: "-0.005em",
              textDecoration: "none",
              transition: "background 160ms ease, color 160ms ease, border-color 160ms ease",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = "var(--warm-06)";
                e.currentTarget.style.color = "var(--warm)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--warm-72)";
              }
            }}
          >
            <Icon size={16} strokeWidth={1.8} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const Wordmark = (
    <Link
      href="/dashboard"
      style={{
        display: "inline-block",
        textDecoration: "none",
        color: "#5C6B4F",
        fontFamily: "var(--font-geist-sans), Geist, system-ui, sans-serif",
        fontWeight: 600,
        fontSize: 22,
        letterSpacing: "-0.04em",
        lineHeight: 1,
        padding: "2px 4px",
      }}
    >
      kin
    </Link>
  );

  const NextBriefCard = (
    <div
      style={{
        marginTop: 12,
        padding: "10px 12px",
        borderRadius: 8,
        background: "var(--bg-card)",
        border: "0.5px solid var(--hair)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: 9.5,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--warm-40)",
          marginBottom: 4,
        }}
      >
        Next brief
      </div>
      <div
        style={{
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: 18,
          color: "var(--sage)",
          letterSpacing: "0.02em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {countdown}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--warm-40)",
          marginTop: 2,
          letterSpacing: "-0.005em",
        }}
      >
        until 6:00 AM
      </div>
    </div>
  );

  const UserRow = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 8px",
        borderTop: "0.5px solid var(--hair)",
        marginTop: 10,
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: "var(--sage-20)",
          color: "var(--sage)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 600,
          fontSize: 12.5,
          border: "0.5px solid var(--hair-sage)",
          flexShrink: 0,
        }}
      >
        {initial}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12.5,
            color: "var(--warm)",
            fontWeight: 500,
            letterSpacing: "-0.005em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name || "You"}
        </div>
        <div
          style={{
            fontSize: 10.5,
            color: "var(--warm-40)",
            fontFamily: "var(--font-geist-mono), monospace",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {email || "signed in"}
        </div>
      </div>
      <button
        onClick={handleSignOut}
        aria-label="Sign out"
        title="Sign out"
        style={{
          background: "transparent",
          border: "none",
          color: "var(--warm-40)",
          cursor: "pointer",
          padding: 6,
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          transition: "color 160ms ease, background 160ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--warm)";
          e.currentTarget.style.background = "var(--warm-06)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--warm-40)";
          e.currentTarget.style.background = "transparent";
        }}
      >
        <LogOut size={14} />
      </button>
    </div>
  );

  const Inner = (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "18px 14px 14px",
        background: "var(--bg-lift)",
        borderRight: "0.5px solid var(--hair)",
      }}
    >
      <div style={{ padding: "0 4px 16px" }}>{Wordmark}</div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {NavList}
        <div style={{ flex: 1 }} />
        {NextBriefCard}
      </div>
      {UserRow}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="kin-sidebar-desktop"
        style={{
          width: SIDEBAR_W,
          flexShrink: 0,
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        {Inner}
      </aside>

      {/* Mobile top bar */}
      <div
        className="kin-sidebar-mobile-bar"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          display: "none",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: "rgba(247,243,237,0.88)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "0.5px solid var(--hair)",
        }}
      >
        {Wordmark}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          style={{
            background: "var(--warm-06)",
            border: "0.5px solid var(--hair)",
            color: "var(--warm-72)",
            borderRadius: 8,
            padding: 8,
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          {mobileOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="kin-sidebar-mobile-drawer"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "none",
          }}
        >
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(60,74,51,0.2)",
              backdropFilter: "blur(4px)",
            }}
          />
          <div
            style={{
              position: "relative",
              width: SIDEBAR_W,
              maxWidth: "82vw",
              height: "100%",
            }}
          >
            {Inner}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .kin-sidebar-desktop { display: none !important; }
          .kin-sidebar-mobile-bar { display: flex !important; }
          .kin-sidebar-mobile-drawer { display: block !important; }
        }
      `}</style>
    </>
  );
}
