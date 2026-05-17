import Link from "next/link";
import KinWordmark from "@/components/KinWordmark";

// Design tokens — kept in lockstep with apps/web/src/app/page.tsx
export const T = {
  bg: "#F7F3ED",
  bgCard: "#FDFBF7",
  bgElev: "#EBE8E0",
  sage: "#5C6B4F",
  sageBorder: "rgba(92,107,79,0.28)",
  sage12: "rgba(92,107,79,0.12)",
  sage08: "rgba(92,107,79,0.08)",
  warm: "#2C2C28",
  warm72: "rgba(44,44,40,0.72)",
  warm56: "rgba(44,44,40,0.56)",
  warm40: "rgba(44,44,40,0.40)",
  warm24: "rgba(44,44,40,0.24)",
  warm12: "rgba(44,44,40,0.12)",
  warm06: "rgba(44,44,40,0.06)",
  hair: "rgba(44,44,40,0.08)",
  amber: "#D4A843",
  amberBorder: "rgba(212,168,67,0.28)",
  amber08: "rgba(212,168,67,0.08)",
  rose: "#A65A4A",
  roseBorder: "rgba(166,90,74,0.28)",
  rose08: "rgba(166,90,74,0.08)",
  serif: "var(--font-instrument-serif), 'Playfair Display', serif",
  mono: "'Geist Mono', 'JetBrains Mono', monospace",
} as const;

export default function LegalShell({
  eyebrow,
  title,
  org,
  updated,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  org: string;
  updated: string;
  intro: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: T.bg,
        color: T.warm,
        fontFamily: "var(--font-geist-sans), Geist, system-ui, sans-serif",
        WebkitFontSmoothing: "antialiased",
        letterSpacing: "-0.005em",
      }}
    >
      {/* ── Nav ───────────────────────────────────────────────────────── */}
      <nav
        data-legal-nav
        style={{
          height: 64,
          padding: "0 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `0.5px solid ${T.hair}`,
          position: "sticky",
          top: 0,
          background: T.bg,
          zIndex: 10,
        }}
      >
        <Link href="/" style={{ textDecoration: "none", display: "inline-flex" }}>
          <KinWordmark size={22} tone="warm" />
        </Link>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            fontSize: 13.5,
            color: T.warm72,
          }}
        >
          <Link href="/#how-it-works" style={{ color: "inherit", textDecoration: "none" }}>
            How Kin works
          </Link>
          <Link href="/#demo" style={{ color: "inherit", textDecoration: "none" }}>
            Demo
          </Link>
          <Link href="/#pricing" style={{ color: "inherit", textDecoration: "none" }}>
            Pricing
          </Link>
          <Link
            href="/#waitlist-top"
            style={{
              height: 34,
              padding: "0 14px",
              background: T.sage,
              color: T.bg,
              borderRadius: 8,
              fontWeight: 500,
              fontSize: 13.5,
              display: "flex",
              alignItems: "center",
              textDecoration: "none",
            }}
          >
            Join waitlist
          </Link>
        </div>
      </nav>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "72px 40px 40px",
          maxWidth: 760,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            fontFamily: T.mono,
            fontSize: 12,
            color: T.sage,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontWeight: 600,
            marginBottom: 16,
          }}
        >
          {eyebrow}
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: T.serif,
            fontWeight: 600,
            fontSize: "clamp(36px, 4.4vw, 56px)",
            lineHeight: 1.05,
            letterSpacing: "-0.015em",
            color: T.warm,
          }}
        >
          {title}
        </h1>
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            marginTop: 16,
            fontFamily: T.mono,
            fontSize: 11.5,
            color: T.warm56,
            letterSpacing: "0.04em",
          }}
        >
          <span>{org}</span>
          <span style={{ color: T.warm24 }}>·</span>
          <span>Last updated: {updated}</span>
        </div>
        <div
          style={{
            marginTop: 28,
            padding: "20px 22px",
            background: T.bgCard,
            border: `0.5px solid ${T.hair}`,
            borderRadius: 8,
            boxShadow: "0 1px 2px rgba(60,74,51,0.04)",
            color: T.warm72,
            fontSize: 14.5,
            lineHeight: 1.6,
          }}
        >
          {intro}
        </div>
      </section>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "16px 40px 88px",
          maxWidth: 760,
          margin: "0 auto",
          color: T.warm72,
          fontSize: 14.5,
          lineHeight: 1.65,
        }}
      >
        {children}
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: `0.5px solid ${T.hair}`,
          padding: "24px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: 1280,
          margin: "0 auto",
        }}
      >
        <KinWordmark size={16} tone="warm" />
        <div style={{ display: "flex", gap: 20, fontSize: 12, color: T.warm40 }}>
          <Link href="/privacy" style={{ color: "inherit", textDecoration: "none" }}>
            Privacy
          </Link>
          <Link href="/terms" style={{ color: "inherit", textDecoration: "none" }}>
            Terms
          </Link>
          <Link href="/pricing" style={{ color: "inherit", textDecoration: "none" }}>
            Pricing
          </Link>
        </div>
      </footer>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media (max-width: 768px) {
          nav[data-legal-nav] { padding: 0 20px !important; }
          nav[data-legal-nav] > div { gap: 12px !important; }
          nav[data-legal-nav] > div > a:not(:last-child):not(:nth-last-child(2)) { display: none !important; }
        }
      `,
        }}
      />
    </main>
  );
}

// ─── Section primitives shared between privacy/terms ──────────────────────────

export function LegalSection({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: 48 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <span
          style={{
            fontFamily: T.mono,
            fontSize: 11,
            color: T.sage,
            letterSpacing: "0.08em",
            fontWeight: 600,
          }}
        >
          {n}
        </span>
        <h2
          style={{
            margin: 0,
            fontFamily: T.serif,
            fontSize: 24,
            fontWeight: 500,
            color: T.warm,
            letterSpacing: "-0.015em",
            lineHeight: 1.25,
          }}
        >
          {title}
        </h2>
      </div>
      <div style={{ paddingLeft: 0 }}>{children}</div>
    </section>
  );
}

export function LegalSubheading({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        margin: "20px 0 8px",
        fontSize: 14,
        fontWeight: 500,
        color: T.sage,
        fontFamily: T.mono,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </h3>
  );
}

export function LegalP({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: "0 0 12px",
        color: T.warm72,
        fontSize: 14.5,
        lineHeight: 1.65,
      }}
    >
      {children}
    </p>
  );
}

export function LegalUL({ children }: { children: React.ReactNode }) {
  return (
    <ul
      style={{
        margin: "8px 0 16px",
        padding: 0,
        listStyle: "none",
        display: "flex",
        flexDirection: "column",
        gap: 7,
      }}
    >
      {children}
    </ul>
  );
}

export function LegalLI({ children }: { children: React.ReactNode }) {
  return (
    <li
      style={{
        position: "relative",
        paddingLeft: 18,
        color: T.warm72,
        fontSize: 14.5,
        lineHeight: 1.6,
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 0,
          top: 10,
          width: 6,
          height: 1,
          background: T.sage,
          opacity: 0.7,
        }}
      />
      {children}
    </li>
  );
}

export function LegalStrong({ children }: { children: React.ReactNode }) {
  return <strong style={{ color: T.warm, fontWeight: 500 }}>{children}</strong>;
}

export function LegalCallout({
  tone = "sage",
  title,
  children,
}: {
  tone?: "sage" | "amber" | "rose";
  title?: string;
  children: React.ReactNode;
}) {
  const palette =
    tone === "amber"
      ? { bg: T.amber08, border: T.amberBorder, accent: T.amber }
      : tone === "rose"
        ? { bg: T.rose08, border: T.roseBorder, accent: T.rose }
        : { bg: T.sage08, border: T.sageBorder, accent: T.sage };
  return (
    <div
      style={{
        margin: "12px 0 16px",
        padding: "14px 16px",
        background: palette.bg,
        border: `0.5px solid ${palette.border}`,
        borderRadius: 8,
      }}
    >
      {title && (
        <div
          style={{
            fontFamily: T.mono,
            fontSize: 11,
            color: palette.accent,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          {title}
        </div>
      )}
      <div style={{ color: T.warm72, fontSize: 13.5, lineHeight: 1.6 }}>
        {children}
      </div>
    </div>
  );
}

export function LegalInlineLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        color: T.sage,
        textDecoration: "none",
        borderBottom: `0.5px solid ${T.sageBorder}`,
      }}
    >
      {children}
    </Link>
  );
}

export function LegalEmail({ address }: { address: string }) {
  return (
    <a
      href={`mailto:${address}`}
      style={{
        color: T.sage,
        textDecoration: "none",
        fontFamily: T.mono,
        fontSize: 13.5,
      }}
    >
      {address}
    </a>
  );
}
