"use client";

import { useEffect, useState } from "react";
import { KinMark } from "./KinMark";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const scrollToWaitlist = () => {
    document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        height: "64px",
        background: scrolled ? "rgba(236, 228, 210, 0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(14px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(14px)" : "none",
        borderBottom: scrolled
          ? "1px solid var(--border)"
          : "1px solid transparent",
        transition:
          "background 300ms ease, border-color 300ms ease, backdrop-filter 300ms ease",
      }}
    >
      <a href="/" style={{ display: "flex", alignItems: "center", gap: "9px" }}>
        <KinMark size={26} color="#3C4A33" />
        <span
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "var(--ink)",
            letterSpacing: "-0.4px",
          }}
        >
          Kin
        </span>
      </a>

      <button
        onClick={scrollToWaitlist}
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: "var(--paper)",
          background: "var(--green)",
          padding: "8px 18px",
          borderRadius: "9px",
          letterSpacing: "-0.1px",
          boxShadow: "0 3px 10px rgba(60,74,51,0.2)",
          transition: "transform 150ms ease, box-shadow 150ms ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow =
            "0 5px 16px rgba(60,74,51,0.3)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow =
            "0 3px 10px rgba(60,74,51,0.2)";
        }}
      >
        Get Early Access
      </button>
    </nav>
  );
}
