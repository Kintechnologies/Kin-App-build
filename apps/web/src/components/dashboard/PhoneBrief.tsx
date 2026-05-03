"use client";

type Bubble =
  | { kind: "kin"; text: string; time?: string }
  | { kind: "user"; text: string; time?: string }
  | { kind: "system"; text: string };

const SAMPLE_BUBBLES: Bubble[] = [
  { kind: "system", text: "Today · 6:02 AM" },
  {
    kind: "kin",
    text:
      "Morning. Today's brief —\n\nYou: standup 9:30, sprint planning 11, design review 2. Tight, but no overlaps.\n\nEmma's soccer practice 3–4:30 — you've got the drop-off (gap between standup wrap and Sam's 1:1).\n\nNora's daycare closes 5:45. Sam's clear after 5 — looped him in, he's covering.\n\nDate night Tuesday at Oleana, 7pm. Your calendars are blocked.",
    time: "6:02 AM",
  },
  { kind: "user", text: "Tell Sam I owe him", time: "6:14 AM" },
  {
    kind: "kin",
    text: "Sent — Sam says \"you owe me bedtime.\" I'm on the 7:45 reminder.",
    time: "6:14 AM",
  },
];

function StatusBar() {
  return (
    <div
      style={{
        height: 28,
        padding: "0 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: "var(--font-geist-mono), monospace",
        fontSize: 10,
        color: "var(--warm)",
        letterSpacing: "0.04em",
        fontVariantNumeric: "tabular-nums",
        flexShrink: 0,
      }}
    >
      <span>9:41</span>
      <span style={{ color: "var(--sage)", fontWeight: 600 }}>kin</span>
    </div>
  );
}

function ContactHeader() {
  return (
    <div
      style={{
        padding: "8px 14px 12px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        borderBottom: "1px solid var(--hair)",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: "var(--sage-20)",
          border: "1px solid var(--hair-sage)",
          color: "var(--sage)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 600,
          fontSize: 13,
          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
          letterSpacing: "-0.04em",
        }}
      >
        k
      </div>
      <div
        style={{
          fontSize: 11.5,
          color: "var(--warm)",
          fontWeight: 500,
          letterSpacing: "-0.005em",
        }}
      >
        Kin
      </div>
      <div
        style={{
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: 9.5,
          color: "var(--warm-40)",
          letterSpacing: "0.02em",
        }}
      >
        +1 (415) 555-0117
      </div>
    </div>
  );
}

function ComposeBar() {
  return (
    <div
      style={{
        padding: "8px 10px 12px",
        borderTop: "1px solid var(--hair)",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          height: 28,
          padding: "0 12px",
          borderRadius: 999,
          background: "var(--warm-06)",
          border: "1px solid var(--hair)",
          display: "flex",
          alignItems: "center",
          fontSize: 11,
          color: "var(--warm-40)",
          letterSpacing: "-0.005em",
        }}
      >
        iMessage
      </div>
    </div>
  );
}

function BubbleView({ bubble }: { bubble: Bubble }) {
  if (bubble.kind === "system") {
    return (
      <div
        style={{
          textAlign: "center",
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: 9.5,
          color: "rgba(240,237,230,0.32)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          margin: "4px 0 6px",
        }}
      >
        {bubble.text}
      </div>
    );
  }

  const isKin = bubble.kind === "kin";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isKin ? "flex-start" : "flex-end",
        gap: 2,
        marginBottom: 2,
      }}
    >
      <div
        style={{
          maxWidth: "84%",
          padding: "8px 11px",
          borderRadius: isKin ? "14px 14px 14px 4px" : "14px 14px 4px 14px",
          background: isKin ? "rgba(124,184,122,0.10)" : "#F0EDE6",
          border: isKin ? "1px solid rgba(124,184,122,0.28)" : "1px solid rgba(240,237,230,0)",
          color: isKin ? "var(--warm)" : "#0C0F0A",
          fontSize: 12,
          lineHeight: 1.4,
          letterSpacing: "-0.005em",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {bubble.text}
      </div>
      {bubble.time && (
        <div
          style={{
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: 9.5,
            color: "rgba(240,237,230,0.32)",
            letterSpacing: "0.04em",
            padding: "0 6px",
          }}
        >
          {bubble.time}
        </div>
      )}
    </div>
  );
}

interface PhoneBriefProps {
  width?: number;
  height?: number;
  bubbles?: Bubble[];
}

export default function PhoneBrief({
  width = 240,
  height = 440,
  bubbles = SAMPLE_BUBBLES,
}: PhoneBriefProps) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 28,
        background: "var(--bg-elev)",
        border: "1px solid rgba(240,237,230,0.10)",
        padding: 8,
        boxShadow:
          "0 0 0 1px rgba(240,237,230,0.04), 0 12px 40px rgba(0,0,0,0.55), 0 0 60px rgba(124,184,122,0.05)",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 22,
          background: "var(--bg)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <StatusBar />
        <ContactHeader />
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 10px 4px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            scrollbarWidth: "none",
          }}
        >
          {bubbles.map((b, i) => (
            <BubbleView key={i} bubble={b} />
          ))}
        </div>
        <ComposeBar />
      </div>
    </div>
  );
}
