import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Kin — Stop keeping your family schedule in your head.";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#ECE4D2",
          display: "flex",
          flexDirection: "column",
          padding: "80px 96px",
          position: "relative",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Soft sage wash */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-120px",
            width: "560px",
            height: "560px",
            borderRadius: "999px",
            background: "radial-gradient(circle at center, rgba(60,74,51,0.16) 0%, rgba(60,74,51,0) 70%)",
          }}
        />

        {/* Wordmark row */}
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <svg width="56" height="56" viewBox="0 0 64 64">
            <circle cx="32" cy="20" r="8" fill="#3C4A33" />
            <circle cx="21.75" cy="37.9" r="9" fill="#3C4A33" />
            <circle cx="42.25" cy="37.9" r="9" fill="#3C4A33" />
          </svg>
          <div
            style={{
              fontSize: "44px",
              fontWeight: 600,
              color: "#2B261E",
              letterSpacing: "-1.2px",
            }}
          >
            Kin
          </div>
        </div>

        {/* Eyebrow */}
        <div
          style={{
            marginTop: "auto",
            fontSize: "20px",
            fontWeight: 500,
            color: "rgba(43,38,30,0.55)",
            letterSpacing: "3px",
            textTransform: "uppercase",
            marginBottom: "28px",
          }}
        >
          The Family OS
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: "78px",
            fontWeight: 600,
            color: "#2B261E",
            letterSpacing: "-2.4px",
            lineHeight: 1.05,
            maxWidth: "920px",
            display: "flex",
          }}
        >
          Stop keeping your family schedule in your head.
        </div>

        {/* Subhead */}
        <div
          style={{
            marginTop: "32px",
            fontSize: "26px",
            color: "rgba(43,38,30,0.62)",
            lineHeight: 1.4,
            maxWidth: "880px",
            display: "flex",
          }}
        >
          One calm morning text. Calendar, conflicts, pickups — handled before coffee.
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: "56px",
            right: "96px",
            fontSize: "18px",
            color: "rgba(43,38,30,0.5)",
            letterSpacing: "0.4px",
          }}
        >
          kinai.family
        </div>
      </div>
    ),
    { ...size },
  );
}
