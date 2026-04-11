// ─────────────────────────────────────────────────────
// Kin Brand Tokens  ·  v1.0  ·  April 2026
// Single source of truth for all design constants.
// Import from this file — never hardcode brand values.
// ─────────────────────────────────────────────────────

export const Colors = {
  // ── Backgrounds ──────────────────────────────────
  bg:       '#0C0F0A',             // App background (slight dark green, not pure black)
  surface:  '#141810',             // Cards, bottom sheets, input backgrounds
  surface2: '#1c211a',             // Elevated surface (modals, popovers)

  // ── Borders ──────────────────────────────────────
  border:   'rgba(255,255,255,0.07)',   // Default border
  border2:  'rgba(255,255,255,0.13)',   // Hover / active / focus

  // ── Text ─────────────────────────────────────────
  text:     '#F0EDE6',                  // Primary — warm off-white
  text2:    'rgba(240,237,230,0.55)',    // Secondary — dimmed
  text3:    'rgba(240,237,230,0.28)',    // Placeholder / disabled / muted

  // ── Brand Green — primary interactive color ──────
  green:    '#7CB87A',
  greenDim: 'rgba(124,184,122,0.12)',   // Green tinted backgrounds
  greenGlow: 'rgba(124,184,122,0.25)',  // Glow / shadow

  // ── Semantic colors — alert / thread types ───────
  amber:    '#D4A843',   // Warning, schedule compression
  purple:   '#A07EC8',   // Household thread
  blue:     '#7AADCE',   // Coverage gap / informational
  rose:     '#D4748A',   // Urgent / high-priority alert
  orange:   '#E07B5A',   // Transition risk

  // ── Semantic backgrounds (10–12% opacity) ────────
  amberDim:  'rgba(212,168,67,0.10)',
  purpleDim: 'rgba(160,126,200,0.10)',
  blueDim:   'rgba(122,173,206,0.10)',
  roseDim:   'rgba(212,116,138,0.10)',
  orangeDim: 'rgba(224,123,90,0.10)',
} as const;

export type ColorKey = keyof typeof Colors;

// ─────────────────────────────────────────────────────

export const Typography = {
  families: {
    sans:        'Geist',          // All UI text, wordmark
    sansMedium:  'Geist-Medium',   // Font weight 500 (React Native requires separate family)
    sansSemi:    'Geist-SemiBold', // Font weight 600
    sansLight:   'Geist-Light',    // Font weight 300
    mono:        'GeistMono',      // Labels, timestamps, eyebrows, metadata
    monoMedium:  'GeistMono-Medium',
  },
  weights: {
    light:    '300' as const,
    regular:  '400' as const,
    medium:   '500' as const,
    semibold: '600' as const,
  },
  sizes: {
    // UI scale
    xs:    11,   // Timestamps, metadata labels
    sm:    13,   // Captions, secondary body
    base:  15,   // Primary body copy
    md:    17,   // Lead text, emphasized body
    lg:    20,   // Card titles, subheadings
    xl:    24,   // Section headings
    '2xl': 30,   // Large display headings
    '3xl': 36,   // Hero / splash display
  },
  tracking: {
    tight:   -0.5,
    normal:   0,
    wide:     0.5,
    widest:   1.5,  // Uppercase mono labels (PICKUP RISK, 7:14 AM, etc.)
  },
  lineHeights: {
    tight:  1.2,
    normal: 1.5,
    loose:  1.7,
  },
} as const;

// ─────────────────────────────────────────────────────

export const Spacing = {
  xs:    4,
  sm:    8,
  md:   16,
  lg:   24,
  xl:   32,
  '2xl': 48,
  '3xl': 64,
} as const;

// ─────────────────────────────────────────────────────

export const Radii = {
  sm:   8,    // Small tags, badges
  md:   12,   // Cards, input fields
  lg:   16,   // Sheets, modals
  xl:   20,   // Large cards
  full: 9999, // Pills, circular buttons
} as const;

// ─────────────────────────────────────────────────────

/** Logo mark geometry — equilateral triangle of circles */
export const KinMarkGeometry = {
  viewBox: '0 0 64 64',
  // Top circle (child — slightly smaller)
  topCx: 32, topCy: 20, topR: 8,
  // Bottom-left circle (parent)
  blCx: 21.75, blCy: 37.9, blR: 9,
  // Bottom-right circle (parent)
  brCx: 42.25, brCy: 37.9, brR: 9,
} as const;

/** Recommended mark sizes by usage context */
export const KinMarkSizes = {
  tabBar:    24,
  navHeader: 22,
  settings:  28,
  onboarding: 64,
  appIcon:   512,
} as const;
