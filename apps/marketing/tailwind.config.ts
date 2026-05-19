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
        bg: "#ECE4D2",
        paper: "#F7F2E6",
        paper2: "#EFE7D4",
        green: "#3C4A33",
        clay: "#AC6A45",
        ochre: "#A98230",
        olive: "#6E7757",
        dusk: "#5C6B73",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      boxShadow: {
        "card-sm": "0 1px 2px rgba(43,38,30,0.06), 0 6px 16px rgba(43,38,30,0.06)",
        "card-md": "0 2px 4px rgba(43,38,30,0.06), 0 14px 36px rgba(43,38,30,0.1)",
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
