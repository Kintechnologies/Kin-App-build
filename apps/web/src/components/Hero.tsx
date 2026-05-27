import type { CSSProperties } from "react";
import { PhoneDemo } from "./PhoneDemo";
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
      {/* Warm ambient wash — sits behind both columns. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "-10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "clamp(420px, 110vw, 1280px)",
          height: "clamp(320px, 78vw, 820px)",
          background:
            "radial-gradient(ellipse at center, rgba(172,106,69,0.13) 0%, rgba(196,168,130,0.08) 38%, transparent 72%)",
          pointerEvents: "none",
          filter: "blur(2px)",
        }}
      />

      {/* Subtle warm crosshatch on the bottom edge so the hero hands off into
          the next section with texture rather than a flat seam. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, rgba(43,38,30,0.10), transparent)",
          pointerEvents: "none",
        }}
      />

      <div
        className="kin-hero-grid"
        style={{ position: "relative", zIndex: 1 }}
      >
        {/* ─── Left column — copy ─────────────────────────────────────── */}
        <div
          className="kin-hero-copy"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
          }}
        >
          {/* Eyebrow */}
          <div
            className="kin-reveal"
            style={{
              display: "inline-flex",
              alignSelf: "flex-start",
              alignItems: "center",
              gap: "8px",
              background: "var(--paper)",
              border: "1px solid var(--border)",
              borderRadius: "100px",
              padding: "6px 14px 6px 12px",
              marginBottom: "28px",
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
              fontSize: "clamp(36px, 5.6vw, 64px)",
              fontWeight: 600,
              color: "var(--ink)",
              letterSpacing: "-2px",
              lineHeight: 1.04,
              marginBottom: "22px",
              animationDelay: "0.15s",
              "--kin-reveal-y": "16px",
            } as CSSProperties}
          >
            Stop keeping
            <br />
            your family schedule
            <br />
            <span style={{ fontStyle: "italic", color: "var(--green)" }}>
              in your head.
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className="kin-reveal"
            style={{
              fontSize: "18px",
              color: "var(--ink-2)",
              lineHeight: 1.6,
              maxWidth: "480px",
              marginBottom: "36px",
              animationDelay: "0.3s",
              "--kin-reveal-y": "12px",
            } as CSSProperties}
          >
            Kin is a Family OS that texts you one calm morning briefing —
            everything that matters today, before you have to figure it out
            yourself.
          </p>

          {/* CTA */}
          <div
            className="kin-reveal"
            style={{
              display: "flex",
              width: "100%",
              animationDelay: "0.42s",
              "--kin-reveal-y": "12px",
            } as CSSProperties}
          >
            <WaitlistForm ctaText="Get Early Access" />
          </div>

          {/* Trust row — small, scannable, replaces the long italic line.
              Uses Unicode middots between items so wrapping doesn't leave
              an orphan separator at the start of a new line. */}
          <p
            className="kin-fade"
            style={{
              marginTop: "26px",
              fontSize: "12.5px",
              color: "var(--ink-3)",
              letterSpacing: "0.1px",
              lineHeight: 1.7,
              animationDelay: "0.6s",
            }}
          >
            Arrives as a text
            <span aria-hidden style={{ margin: "0 10px", color: "var(--border-2)" }}>
              ·
            </span>
            No app to download
            <span aria-hidden style={{ margin: "0 10px", color: "var(--border-2)" }}>
              ·
            </span>
            14-day trial · $39/mo
          </p>
        </div>

        {/* ─── Right column — animated phone ─────────────────────────── */}
        <div
          className="kin-hero-phone kin-reveal"
          style={{
            position: "relative",
            animationDelay: "0.25s",
            "--kin-reveal-y": "28px",
          } as CSSProperties}
        >
          {/* Phone-side ambient glow — warmer, larger, behind the device. */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "440px",
              height: "440px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(196,168,130,0.32) 0%, rgba(196,168,130,0.12) 40%, transparent 70%)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />

          {/* The crown jewel — animation starts immediately on hero mount. */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <PhoneDemo immediate />
          </div>

          {/* Tiny caption under the phone — frames it as live, not static. */}
          <p
            style={{
              position: "absolute",
              bottom: "-34px",
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: "11px",
              fontFamily: "var(--font-geist-mono), monospace",
              letterSpacing: "1.4px",
              textTransform: "uppercase",
              color: "var(--ink-3)",
              whiteSpace: "nowrap",
            }}
          >
            A day with Kin — live
          </p>
        </div>
      </div>
    </section>
  );
}
