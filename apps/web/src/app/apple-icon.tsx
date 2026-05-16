import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// "kin" wordmark — Geist 600 outlines, matching KinWordmark.tsx (tone="warm").
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
          width="180"
          height="180"
          viewBox="0 0 180 180"
          shapeRendering="geometricPrecision"
        >
          <g
            transform="translate(32.737 120.497) scale(0.085787 -0.085787)"
            fill="#F0EDE6"
          >
            <path d="M80 710H164V245L422 530H534L325 305L543 0H441L268 248L164 138V0H80Z" />
            <path
              transform="translate(550 0)"
              d="M80 530H164V0H80ZM78 711H166V613H78Z"
            />
            <path
              transform="translate(754 0)"
              d="M80 530H157L160 395L150 404Q164 472 210.5 507.0Q257 542 322 542Q409 542 455.0 486.0Q501 430 501 341V0H417V317Q417 392 390.0 430.0Q363 468 304 468Q241 468 202.5 428.5Q164 389 164 317V0H80Z"
            />
          </g>
        </svg>
      </div>
    ),
    { ...size },
  );
}
