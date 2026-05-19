import type { CSSProperties } from "react";

const words = [
  "pickup",
  "dinner",
  "bedtime",
  "your meetings",
  "your partner's meetings",
  "and everything in between",
];

export function Relatability() {
  return (
    <section
      style={{
        padding: "clamp(80px, 11vw, 120px) 24px",
        maxWidth: "720px",
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <h2
        className="kin-reveal"
        style={{
          fontSize: "clamp(28px, 4.6vw, 42px)",
          fontWeight: 600,
          color: "var(--ink)",
          letterSpacing: "-1px",
          lineHeight: 1.14,
          marginBottom: "40px",
          "--kin-reveal-y": "18px",
        } as CSSProperties}
      >
        You&apos;re the family air traffic controller.
      </h2>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginBottom: "44px",
        }}
      >
        {words.map((word, i) => (
          <div
            key={word}
            className="kin-reveal"
            style={{
              fontSize:
                i < 3
                  ? "clamp(22px, 3.6vw, 31px)"
                  : i < 5
                  ? "clamp(18px, 2.8vw, 24px)"
                  : "clamp(16px, 2.2vw, 20px)",
              fontWeight: i < 3 ? 500 : 400,
              color: i < 3 ? "var(--ink)" : i < 5 ? "var(--ink-2)" : "var(--ink-3)",
              letterSpacing: i < 3 ? "-0.5px" : "-0.2px",
              animationDelay: `${i * 0.11}s`,
              "--kin-reveal-y": "8px",
            } as CSSProperties}
          >
            {word}
          </div>
        ))}
      </div>

      <p
        className="kin-fade"
        style={{
          fontSize: "17px",
          fontStyle: "italic",
          color: "var(--ink-2)",
          marginBottom: "30px",
          letterSpacing: "-0.2px",
          animationDelay: "0.5s",
        }}
      >
        And somehow… it still falls through sometimes.
      </p>

      <div
        className="kin-reveal"
        style={{
          display: "inline-block",
          background: "var(--green-soft)",
          border: "1px solid var(--green-line)",
          borderRadius: "100px",
          padding: "11px 24px",
          animationDelay: "0.65s",
          "--kin-reveal-y": "12px",
        } as CSSProperties}
      >
        <span
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--green)",
            letterSpacing: "-0.2px",
          }}
        >
          Kin takes that off your plate.
        </span>
      </div>
    </section>
  );
}
