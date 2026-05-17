// Plain "kin" wordmark — Playfair Display, olive by default.
// No SVG icon — the whole brand reads as a quiet serif word.

interface KinWordmarkProps {
  size?: number;
  tone?: "sage" | "warm" | string;
}

const TONES: Record<string, string> = {
  sage: "#5C6B4F", // olive
  warm: "#2C2C28", // charcoal
};

export default function KinWordmark({ size = 22, tone = "sage" }: KinWordmarkProps) {
  const c = TONES[tone] ?? tone;

  return (
    <span
      style={{
        fontFamily: "var(--font-instrument-serif), 'Playfair Display', serif",
        fontWeight: 600,
        fontSize: size,
        letterSpacing: "-0.01em",
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
