import type { CSSProperties } from "react";
import { WaitlistForm } from "./WaitlistForm";

export function Hero() {
  return (
    <section
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "120px 24px 80px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Warm ambient wash */}
      <div
        style={{
          position: "absolute",
          top: "8%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "760px",
          height: "520px",
          background:
            "radial-gradient(ellipse at center, rgba(172,106,69,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: "660px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Eyebrow */}
        <div
          className="kin-reveal"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--paper)",
            border: "1px solid var(--border)",
            borderRadius: "100px",
            padding: "6px 14px 6px 12px",
            marginBottom: "30px",
            boxShadow: "0 1px 2px rgba(43,38,30,0.05)",
            animationDelay: "0.05s",
            "--kin-reveal-y": "8px",
          } as CSSProperties}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "var(--clay)",
            }}
          />
          <span
            style={{
              fontSize: "11px",
              fontWeight: 500,
              color: "var(--ink-2)",
              fontFamily: "var(--font-geist-mono), monospace",
              letterSpacing: "1.4px",
              textTransform: "uppercase",
            }}
          >
            The Family OS · Early Access
          </span>
        </div>

        {/* Headline */}
        <h1
          className="kin-reveal"
          style={{
            fontSize: "clamp(32px, 6vw, 58px)",
            fontWeight: 600,
            color: "var(--ink)",
            textAlign: "center",
            letterSpacing: "-1.8px",
            lineHeight: 1.1,
            marginBottom: "22px",
            animationDelay: "0.15s",
            "--kin-reveal-y": "16px",
          } as CSSProperties}
        >
          Stop keeping your
          <br />
          family schedule
          <br />
          in your head.
        </h1>

        {/* Subheadline */}
        <p
          className="kin-reveal"
          style={{
            fontSize: "18px",
            color: "var(--ink-2)",
            textAlign: "center",
            lineHeight: 1.6,
            maxWidth: "500px",
            marginBottom: "40px",
            animationDelay: "0.3s",
            "--kin-reveal-y": "12px",
          } as CSSProperties}
        >
          Kin is a Family OS that texts you one calm morning briefing —
          everything that matters today, before you have to figure it out
          yourself.
        </p>

        {/* Phone CTA #1 */}
        <div
          className="kin-reveal"
          style={{
            display: "flex",
            justifyContent: "center",
            width: "100%",
            animationDelay: "0.42s",
            "--kin-reveal-y": "12px",
          } as CSSProperties}
        >
          <WaitlistForm ctaText="Join the Waitlist" />
        </div>

        {/* Reassurance */}
        <p
          className="kin-fade"
          style={{
            marginTop: "26px",
            fontSize: "13px",
            color: "var(--ink-3)",
            fontStyle: "italic",
            animationDelay: "0.6s",
          }}
        >
          No app to download. It arrives as a text — like a note from someone
          who&apos;s got you.
        </p>
      </div>
    </section>
  );
}
