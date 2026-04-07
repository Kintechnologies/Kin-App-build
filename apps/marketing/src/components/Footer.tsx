import { KinMark } from "./KinMark";

export function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "32px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "20px",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <KinMark size={22} />
        <span
          style={{
            fontSize: "15px",
            fontWeight: 500,
            color: "rgba(240,237,230,0.6)",
            letterSpacing: "-0.2px",
          }}
        >
          Kin
        </span>
      </div>

      {/* Links */}
      <div
        style={{
          display: "flex",
          gap: "24px",
          alignItems: "center",
        }}
      >
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
              color: "rgba(240,237,230,0.35)",
              transition: "color 150ms ease",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLAnchorElement).style.color = "rgba(240,237,230,0.7)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLAnchorElement).style.color = "rgba(240,237,230,0.35)";
            }}
          >
            {link.label}
          </a>
        ))}
      </div>

      {/* Copyright */}
      <p
        style={{
          fontSize: "12px",
          color: "rgba(240,237,230,0.2)",
          fontFamily: "var(--font-geist-mono), monospace",
        }}
      >
        © 2026 Kin Technologies LLC
      </p>
    </footer>
  );
}
