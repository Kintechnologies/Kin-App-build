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
        background: "var(--background)",
        surface: "var(--surface)",
        "surface-raised": "var(--surface-raised)",
        foreground: "var(--foreground)",
        primary: "var(--primary)",
        "primary-soft": "var(--primary-soft)",
        "warm-white": "var(--warm-white)",
        amber: "var(--amber)",
        purple: "var(--purple)",
        blue: "var(--blue)",
        rose: "var(--rose)",
        // Aimé Leon Dore palette
        cream: "#F7F3ED",
        "warm-cream": "#FDFBF7",
        "sage-bg": "#EBE8E0",
        olive: "#5C6B4F",
        "olive-dark": "#3D4A33",
        "olive-light": "#7A8C6A",
        brown: "#8B7355",
        tan: "#C4A97D",
        charcoal: "#2C2C28",
        text: "#3A3832",
        muted: "#7A756D",
        hairline: "#E5DFD5",
      },
      fontFamily: {
        serif: ["var(--font-instrument-serif)", "Playfair Display", "serif"],
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
        display: ["var(--font-instrument-serif)", "Playfair Display", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
