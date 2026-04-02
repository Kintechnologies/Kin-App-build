// Kin brand colors — used by both web (CSS vars) and mobile (NativeWind)
export const colors = {
  background: "#0C0F0A",
  surface: "#1A1F16",
  "surface-raised": "#212820",
  foreground: "#F0EDE6",
  primary: "#7CB87A",
  "primary-soft": "#3D5C3C",
  "warm-white": "#F0EDE6",
  amber: "#D4A843",
  purple: "#A07EC8",
  blue: "#7AADCE",
  rose: "#D4748A",
} as const;

// Light mode overrides
export const lightColors = {
  background: "#FAFAF8",
  surface: "#F0EDE6",
  "surface-raised": "#FFFFFF",
  foreground: "#0C0F0A",
  primary: "#5A9A58",
  "primary-soft": "#E8F5E8",
  "warm-white": "#0C0F0A",
  amber: "#B8912E",
  purple: "#7E5CA6",
  blue: "#5A8DAE",
  rose: "#B85A70",
} as const;

export type ColorKey = keyof typeof colors;
