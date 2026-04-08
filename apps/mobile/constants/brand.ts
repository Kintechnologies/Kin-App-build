// ─────────────────────────────────────────
// Kin Brand Tokens  ·  v1.0  ·  April 2026
// ─────────────────────────────────────────

export const Colors = {
  // Backgrounds
  bg:       '#0C0F0A',   // App background
  surface:  '#141810',   // Cards, sheets, input fills
  surface2: '#1c211a',   // Elevated surface (modals)

  // Borders
  border:   'rgba(255,255,255,0.07)',
  border2:  'rgba(255,255,255,0.13)',  // Hover / focus

  // Text
  text:     '#F0EDE6',               // Primary text
  text2:    'rgba(240,237,230,0.55)', // Secondary text
  text3:    'rgba(240,237,230,0.28)', // Placeholder / muted

  // Brand accent — primary interactive color
  green:    '#7CB87A',

  // Semantic colors — alert types
  amber:    '#D4A843',   // Warning / schedule compression
  purple:   '#A07EC8',   // Household thread
  blue:     '#7AADCE',   // Coverage gap
  rose:     '#D4748A',   // Urgent / high-priority alert
  orange:   '#E07B5A',   // Transition risk
} as const;

export const Typography = {
  families: {
    sans:      'Geist',         // All UI text and wordmark
    sansMed:   'Geist-Medium',
    sansSemi:  'Geist-SemiBold',
    mono:      'GeistMono',     // Labels, timestamps, codes
  },
  weights: {
    light:    '300' as const,
    regular:  '400' as const,
    medium:   '500' as const,
    semibold: '600' as const,
  },
  sizes: {
    xs:    11,   // Timestamps, metadata
    sm:    13,   // Secondary body, captions
    base:  15,   // Primary body copy
    md:    17,   // Lead text, emphasized body
    lg:    20,   // Subheadings, card titles
    xl:    24,   // Section headings
    '2xl': 30,   // Large headings
    '3xl': 36,   // Hero / display
  },
  tracking: {
    tight:  -0.5,
    normal:  0,
    wide:    0.5,
    widest:  1.5,  // Mono labels (uppercase)
  },
} as const;

export const Spacing = {
  xs:    4,
  sm:    8,
  md:    16,
  lg:    24,
  xl:    32,
  '2xl': 48,
  '3xl': 64,
} as const;

export const Radii = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  full: 9999,  // Pills / tags
} as const;
