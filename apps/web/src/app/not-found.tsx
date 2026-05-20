import Link from "next/link";
import { KinMark } from "@/components/KinMark";

export const metadata = {
  title: "Page not found — Kin",
};

export default function NotFound() {
  return (
    <main
      className="marketing"
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg)",
        color: "var(--ink)",
        padding: "32px 24px 80px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "12%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "640px",
          height: "440px",
          background: "radial-gradient(ellipse at center, rgba(60,74,51,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: "560px", margin: "0 auto", position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: "72px" }}>
          <Link
            href="/"
            style={{ display: "inline-flex", alignItems: "center", gap: "9px", textDecoration: "none" }}
          >
            <KinMark size={26} color="#3C4A33" />
            <span style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-0.4px", color: "var(--ink)" }}>
              Kin
            </span>
          </Link>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "20px",
          }}
        >
          <p
            style={{
              fontSize: "11px",
              fontWeight: 500,
              fontFamily: "var(--font-geist-mono), monospace",
              letterSpacing: "1.6px",
              textTransform: "uppercase",
              color: "var(--ink-3)",
            }}
          >
            404
          </p>

          <h1
            style={{
              fontFamily: "var(--font-instrument-serif), serif",
              fontStyle: "italic",
              fontSize: "clamp(34px, 6vw, 44px)",
              color: "var(--ink)",
              letterSpacing: "-0.8px",
              lineHeight: 1.1,
            }}
          >
            We couldn&apos;t find that page.
          </h1>

          <p
            style={{
              fontSize: "16px",
              color: "var(--ink-2)",
              lineHeight: 1.65,
              maxWidth: "30rem",
            }}
          >
            The link may be old, or the page may have moved. Head back home and we&apos;ll get you sorted.
          </p>

          <Link
            href="/"
            style={{
              marginTop: "12px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "14px 28px",
              borderRadius: "999px",
              background: "var(--green)",
              color: "var(--paper)",
              fontSize: "15px",
              fontWeight: 600,
              textDecoration: "none",
              letterSpacing: "-0.2px",
            }}
          >
            Back to kinai.family
          </Link>
        </div>
      </div>
    </main>
  );
}
