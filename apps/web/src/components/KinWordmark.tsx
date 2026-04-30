// Cut-k wordmark: custom SVG k with upper diagonal cut flat at the join, Geist "in"

interface KinWordmarkProps {
  size?: number;
  tone?: "sage" | "warm" | string;
}

const TONES: Record<string, string> = {
  sage: "#7CB87A",
  warm: "#F0EDE6",
};

export default function KinWordmark({ size = 28, tone = "sage" }: KinWordmarkProps) {
  const c = TONES[tone] ?? tone;
  const h = size;
  const stroke = h * 0.13;
  const w = h * 0.62;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: h * 0.02,
        color: c,
        lineHeight: 1,
        userSelect: "none",
      }}
    >
      <svg
        width={w}
        height={h * 1.05}
        viewBox={`0 0 ${w} ${h * 1.05}`}
        style={{ display: "block", alignSelf: "flex-end" }}
        aria-hidden="true"
      >
        {/* vertical stem */}
        <rect x={stroke * 0.1} y={h * 0.02} width={stroke} height={h * 1.0} fill={c} />
        {/* lower diagonal */}
        <path
          d={`M ${stroke * 1.1} ${h * 0.62} L ${w} ${h * 1.02} L ${w - stroke * 1.05} ${h * 1.02} L ${stroke * 1.1} ${h * 0.78} Z`}
          fill={c}
        />
        {/* upper diagonal — cut flat at top instead of meeting in a peak */}
        <path
          d={`M ${stroke * 1.1} ${h * 0.62} L ${w * 0.78} ${h * 0.32} L ${w * 0.78} ${h * 0.32 + stroke * 1.0} L ${stroke * 1.1} ${h * 0.78} Z`}
          fill={c}
        />
      </svg>
      <span
        style={{
          fontFamily: "var(--font-geist-sans), Geist, system-ui, sans-serif",
          fontWeight: 600,
          fontSize: h,
          letterSpacing: "-0.045em",
        }}
      >
        in
      </span>
    </span>
  );
}
