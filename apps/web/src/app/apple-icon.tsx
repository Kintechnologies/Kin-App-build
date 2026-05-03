import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0C0F0A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="120"
          height="124"
          viewBox="0 0 13.64 22.44"
          shapeRendering="geometricPrecision"
        >
          <rect x="0.286" y="0.44" width="2.86" height="22" fill="#7CB87A" />
          <path
            d="M 3.146 13.64 L 13.64 22.44 L 10.637 22.44 L 3.146 17.16 Z"
            fill="#7CB87A"
          />
          <path
            d="M 3.146 13.64 L 10.639 7.04 L 10.639 9.9 L 3.146 17.16 Z"
            fill="#7CB87A"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
