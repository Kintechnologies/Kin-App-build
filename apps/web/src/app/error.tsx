"use client";

import { useEffect } from "react";
import Link from "next/link";
import { KinMark } from "@/components/KinMark";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

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
          background: "radial-gradient(ellipse at center, rgba(172,106,69,0.08) 0%, transparent 70%)",
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
            Something went wrong
          </p>

          <h1
            style={{
              fontFamily: "var(--font-instrument-serif), serif",
              fontStyle: "italic",
              fontSize: "clamp(30px, 5vw, 38px)",
              color: "var(--ink)",
              letterSpacing: "-0.7px",
              lineHeight: 1.15,
            }}
          >
            Kin tripped on something.
          </h1>

          <p
            style={{
              fontSize: "16px",
              color: "var(--ink-2)",
              lineHeight: 1.65,
              maxWidth: "30rem",
            }}
          >
            We were notified. Try again — if it keeps happening, email{" "}
            <a href="mailto:hello@kinai.family" style={{ color: "var(--green)", fontWeight: 500 }}>
              hello@kinai.family
            </a>{" "}
            and we&apos;ll sort it.
          </p>

          <div style={{ display: "flex", gap: "12px", marginTop: "12px", flexWrap: "wrap", justifyContent: "center" }}>
            <button
              onClick={reset}
              style={{
                padding: "14px 28px",
                borderRadius: "999px",
                background: "var(--green)",
                color: "var(--paper)",
                fontSize: "15px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                letterSpacing: "-0.2px",
              }}
            >
              Try again
            </button>
            <Link
              href="/"
              style={{
                padding: "14px 28px",
                borderRadius: "999px",
                background: "var(--paper)",
                border: "1px solid var(--border)",
                color: "var(--ink)",
                fontSize: "15px",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Back home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
