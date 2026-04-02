// Design tokens — spacing, typography, radii
// Based on 8px grid system

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
  "3xl": 64,
} as const;

export const fontSize = {
  micro: 11,
  caption: 13,
  body: 15,
  subheading: 17,
  heading: 22,
  display: 28,
  hero: 36,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const fontFamily = {
  serif: "InstrumentSerif-Italic",
  sans: "Geist",
  mono: "GeistMono",
} as const;
