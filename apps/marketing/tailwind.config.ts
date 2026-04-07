import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0C0F0A",
        surface: "#141810",
        surface2: "#1c211a",
        green: "#7CB87A",
        amber: "#D4A843",
        purple: "#A07EC8",
        blue: "#7AADCE",
        rose: "#D4748A",
        orange: "#E07B5A",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      boxShadow: {
        "neuro-sm":
          "-2px -2px 4px rgba(255,255,255,0.025), 2px 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
        "neuro-md":
          "-3px -3px 8px rgba(255,255,255,0.025), 4px 4px 14px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
        "neuro-inset":
          "inset -2px -2px 4px rgba(255,255,255,0.025), inset 2px 2px 6px rgba(0,0,0,0.5)",
        "glow-green":
          "0 0 20px rgba(124,184,122,0.2), 0 0 40px rgba(124,184,122,0.08)",
        "glow-green-sm": "0 0 12px rgba(124,184,122,0.18)",
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease forwards",
        "fade-in": "fadeIn 0.5s ease forwards",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      maxWidth: {
        content: "720px",
        wide: "1080px",
      },
    },
  },
  plugins: [],
};

export default config;
