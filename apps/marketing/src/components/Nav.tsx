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
        height: "60px",
        background: scrolled
          ? "rgba(12, 15, 10, 0.88)"
          : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled
          ? "1px solid rgba(255,255,255,0.06)"
          : "1px solid transparent",
        transition: "background 300ms ease, border-color 300ms ease, backdrop-filter 300ms ease",
      }}
    >
      {/* Logo */}
      <a
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <KinMark size={26} />
        <span
          style={{
            fontSize: "17px",
            fontWeight: 500,
            color: "#F0EDE6",
            letterSpacing: "-0.3px",
          }}
        >
          Kin
        </span>
      </a>

      {/* CTA */}
      <button
        onClick={scrollToWaitlist}
        style={{
          fontSize: "13px",
          fontWeight: 500,
          color: "#0C0F0A",
          background: "#7CB87A",
          padding: "7px 16px",
          borderRadius: "8px",
          letterSpacing: "-0.1px",
          boxShadow: "0 0 12px rgba(124,184,122,0.2)",
          transition: "opacity 150ms ease, box-shadow 150ms ease",
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLButtonElement).style.opacity = "0.88";
          (e.target as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(124,184,122,0.35)";
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.opacity = "1";
          (e.target as HTMLButtonElement).style.boxShadow = "0 0 12px rgba(124,184,122,0.2)";
        }}
      >
        Get early access
      </button>
    </nav>
  );
}
