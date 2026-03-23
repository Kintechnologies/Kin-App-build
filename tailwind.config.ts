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
      },
      fontFamily: {
        serif: ["var(--font-instrument-serif)", "serif"],
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
