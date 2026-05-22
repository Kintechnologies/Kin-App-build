"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          backgroundColor: "#ECE4D2",
          color: "#2B261E",
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
        }}
      >
        <div style={{ maxWidth: "560px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "9px", marginBottom: "48px" }}>
            <svg width="26" height="26" viewBox="0 0 64 64" aria-label="Kin">
              <circle cx="32" cy="20" r="8" fill="#3C4A33" />
              <circle cx="21.75" cy="37.9" r="9" fill="#3C4A33" />
              <circle cx="42.25" cy="37.9" r="9" fill="#3C4A33" />
            </svg>
            <span style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-0.4px" }}>Kin</span>
          </div>

          <p
            style={{
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "1.6px",
              textTransform: "uppercase",
              color: "rgba(43,38,30,0.4)",
              marginBottom: "16px",
            }}
          >
            Something went wrong
          </p>

          <h1
            style={{
              fontStyle: "italic",
              fontSize: "32px",
              letterSpacing: "-0.7px",
              lineHeight: 1.15,
              margin: "0 0 16px",
            }}
          >
            Kin tripped on something.
          </h1>

          <p style={{ fontSize: "15px", color: "rgba(43,38,30,0.62)", lineHeight: 1.65, marginBottom: "28px" }}>
            We were notified. Try again — if it keeps happening, email{" "}
            <a
              href="mailto:hello@kinai.family"
              style={{ color: "#3C4A33", fontWeight: 500, textDecoration: "none" }}
            >
              hello@kinai.family
            </a>
            .
          </p>

          <button
            onClick={reset}
            style={{
              padding: "14px 28px",
              borderRadius: "999px",
              background: "#3C4A33",
              color: "#F7F2E6",
              fontSize: "15px",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
