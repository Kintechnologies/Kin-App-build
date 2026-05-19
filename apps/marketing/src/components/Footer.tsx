"use client";

import { KinMark } from "./KinMark";

export function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        background: "var(--bg-deep)",
        padding: "44px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "22px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
        <KinMark size={24} color="#3C4A33" />
        <span
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--ink-2)",
            letterSpacing: "-0.3px",
          }}
        >
          Kin
        </span>
      </div>

      <div style={{ display: "flex", gap: "26px", alignItems: "center" }}>
        {[
          { label: "Privacy", href: "/privacy" },
          { label: "Terms", href: "/terms" },
          { label: "hello@kinai.family", href: "mailto:hello@kinai.family" },
        ].map((link) => (
          <a
            key={link.label}
            href={link.href}
            style={{
              fontSize: "13px",
              color: "var(--ink-3)",
              transition: "color 150ms ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = "var(--ink)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = "var(--ink-3)";
            }}
          >
            {link.label}
          </a>
        ))}
      </div>

      <p
        style={{
          fontSize: "12px",
          color: "var(--ink-3)",
          fontFamily: "var(--font-geist-mono), monospace",
        }}
      >
        © 2026 Kin Technologies LLC
      </p>
    </footer>
  );
}
