// Plain "kin" wordmark — Geist 600, sage by default, tight tracking.
// No SVG icon — the whole brand reads as quiet text.

interface KinWordmarkProps {
  size?: number;
  tone?: "sage" | "warm" | string;
}

const TONES: Record<string, string> = {
  sage: "#7CB87A",
  warm: "#F0EDE6",
};

export default function KinWordmark({ size = 22, tone = "sage" }: KinWordmarkProps) {
  const c = TONES[tone] ?? tone;

  return (
    <span
      style={{
        fontFamily: "var(--font-geist-sans), Geist, system-ui, sans-serif",
        fontWeight: 600,
        fontSize: size,
        letterSpacing: "-0.04em",
        lineHeight: 1,
        color: c,
        userSelect: "none",
        display: "inline-block",
      }}
    >
      kin
    </span>
  );
}
