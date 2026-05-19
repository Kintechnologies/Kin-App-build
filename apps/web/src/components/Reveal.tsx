import type { CSSProperties, ElementType, ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li";
}

// Subtle fade-up entrance. One shared primitive so every section enters the
// page with the same restrained motion. Implemented as a CSS animation (see
// .kin-reveal in globals.css) so it completes even when the tab loads in the
// background — a framer-motion rAF animation would stall there at opacity 0.
export function Reveal({
  children,
  delay = 0,
  y = 22,
  className,
  as = "div",
}: RevealProps) {
  const Tag = as as ElementType;
  const style = {
    animationDelay: delay ? `${delay}s` : undefined,
    "--kin-reveal-y": `${y}px`,
  } as CSSProperties;

  return (
    <Tag
      className={["kin-reveal", className].filter(Boolean).join(" ")}
      style={style}
    >
      {children}
    </Tag>
  );
}
