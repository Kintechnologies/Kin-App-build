"use client";

import { useEffect } from "react";
import Link from "next/link";
import { KinMark } from "@/components/KinMark";

// Shared error boundary used by every route-group error.tsx. ALD palette: warm
// oat/cream surface, sage accent, mono microcopy. Logs the error to the
// console so Sentry's client-side wrapper picks it up.
export function RouteError({
  error,
  reset,
  heading = "Kin tripped on something.",
  body,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  heading?: string;
  body?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F7F3ED",
        color: "#2C2C28",
        fontFamily:
          "var(--font-geist-sans), Geist, system-ui, -apple-system, sans-serif",
        WebkitFontSmoothing: "antialiased",
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
          background:
            "radial-gradient(ellipse at center, rgba(172,106,69,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 560, margin: "0 auto", position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 72 }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              textDecoration: "none",
            }}
          >
            <KinMark size={26} color="#3C4A33" />
            <span
              style={{
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: "-0.4px",
                color: "#2C2C28",
              }}
            >
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
            gap: 20,
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 500,
              fontFamily: "var(--font-geist-mono), monospace",
              letterSpacing: "1.6px",
              textTransform: "uppercase",
              color: "rgba(44,44,40,0.4)",
            }}
          >
            Something went wrong
          </p>

          <h1
            style={{
              fontFamily:
                "var(--font-instrument-serif), 'Playfair Display', serif",
              fontStyle: "italic",
              fontSize: "clamp(28px, 5vw, 36px)",
              color: "#2C2C28",
              letterSpacing: "-0.7px",
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            {heading}
          </h1>

          <p
            style={{
              fontSize: 15,
              color: "rgba(44,44,40,0.62)",
              lineHeight: 1.65,
              maxWidth: "30rem",
              margin: 0,
            }}
          >
            {body ?? (
              <>
                We were notified. Try again — if it keeps happening, email{" "}
                <a
                  href="mailto:hello@kinai.family"
                  style={{
                    color: "#3C4A33",
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  hello@kinai.family
                </a>{" "}
                and we&apos;ll sort it.
              </>
            )}
          </p>

          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 12,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <button
              onClick={reset}
              style={{
                padding: "14px 28px",
                borderRadius: 999,
                background: "#3C4A33",
                color: "#F7F2E6",
                fontSize: 15,
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
                borderRadius: 999,
                background: "#FDFBF7",
                border: "1px solid #E5DFD5",
                color: "#2C2C28",
                fontSize: 15,
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
