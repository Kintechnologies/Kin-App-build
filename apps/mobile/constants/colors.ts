/**
 * Kin AI — Color Token System
 *
 * Two complete token sets: darkColors (near-black surface) and lightColors
 * (warm-white parchment surface). All hardcoded hex values in the mobile app
 * should reference these tokens via useThemeColors().
 *
 * Spec: docs/specs/light-theme-spec.md (B23)
 * Dark theme = late night kitchen table.
 * Light theme = morning light through a window.
 */

export const darkColors = {
  // ── Backgrounds ──────────────────────────────────────────────────────────
  background: '#0C0F0A',
  surfacePrimary: '#141810',
  surfaceSecondary: '#161C14',
  surfaceMuted: '#111410',
  surfaceOverlay: '#121618',
  surfaceSubtle: 'rgba(240,237,230,0.05)',

  // ── Text ─────────────────────────────────────────────────────────────────
  textPrimary: '#F0EDE6',
  textSecondary: 'rgba(240,237,230,0.75)',
  textMuted: 'rgba(240,237,230,0.40)',
  textDim: 'rgba(240,237,230,0.28)',
  textFaint: 'rgba(240,237,230,0.22)',
  textAcknowledged: 'rgba(240,237,230,0.25)',
  textOnGreen: '#0C0F0A',
  textOnGreenMuted: 'rgba(12,15,10,0.60)',

  // ── Brand accents ─────────────────────────────────────────────────────────
  green: '#7CB87A',
  greenMuted: 'rgba(124,184,122,0.50)',
  greenSubtle: 'rgba(124,184,122,0.10)',
  greenDim: 'rgba(124,184,122,0.40)',
  greenShadow: '#7CB87A',

  amber: '#D4A843',
  amberBorder: 'rgba(212,168,67,0.25)',
  amberShadow: 'rgba(212,168,67,0.08)',
  amberSubtle: 'rgba(212,168,67,0.08)',

  blue: '#7AADCE',
  blueSubtle: 'rgba(122,173,206,0.08)',

  rose: '#D4748A',
  roseSubtle: 'rgba(212,116,138,0.08)',

  // ── Tab bar ───────────────────────────────────────────────────────────────
  tabBarBackground: 'rgba(12,15,10,0.85)',
  tabBarBorder: 'rgba(240,237,230,0.06)',
  tabBarActive: '#7CB87A',
  tabBarInactive: 'rgba(240,237,230,0.30)',

  // ── Input / Compose ───────────────────────────────────────────────────────
  inputBackground: '#141810',
  inputBorder: 'rgba(240,237,230,0.04)',
  inputPlaceholder: 'rgba(240,237,230,0.20)',

  // ── Chat bubbles ──────────────────────────────────────────────────────────
  userBubble: '#7CB87A',
  assistantBubble: 'rgba(122,173,206,0.10)',
  assistantText: 'rgba(240,237,230,0.85)',

  // ── Skeleton / loading ────────────────────────────────────────────────────
  skeletonBase: 'rgba(240,237,230,0.07)',
  skeletonHighlight: 'rgba(240,237,230,0.12)',
};

export const lightColors = {
  // ── Backgrounds ──────────────────────────────────────────────────────────
  background: '#F5F0E8',
  surfacePrimary: '#EDE8DF',
  surfaceSecondary: '#E6E0D5',
  surfaceMuted: '#E9E4DB',
  surfaceOverlay: '#E8EBE6',
  surfaceSubtle: 'rgba(30,28,24,0.04)',

  // ── Text ─────────────────────────────────────────────────────────────────
  textPrimary: '#1A1A16',
  textSecondary: 'rgba(30,28,24,0.65)',
  textMuted: 'rgba(30,28,24,0.35)',
  textDim: 'rgba(30,28,24,0.25)',
  textFaint: 'rgba(30,28,24,0.18)',
  textAcknowledged: 'rgba(30,28,24,0.22)',
  textOnGreen: '#0C0F0A',
  textOnGreenMuted: 'rgba(10,10,6,0.60)',

  // ── Brand accents ─────────────────────────────────────────────────────────
  green: '#7CB87A',
  greenMuted: 'rgba(124,184,122,0.65)',
  greenSubtle: 'rgba(124,184,122,0.14)',
  greenDim: 'rgba(124,184,122,0.55)',
  greenShadow: '#7CB87A',

  amber: '#D4A843',
  amberBorder: 'rgba(212,168,67,0.35)',
  amberShadow: 'rgba(212,168,67,0.12)',
  amberSubtle: 'rgba(212,168,67,0.10)',

  blue: '#7AADCE',
  blueSubtle: 'rgba(122,173,206,0.12)',

  rose: '#D4748A',
  roseSubtle: 'rgba(212,116,138,0.12)',

  // ── Tab bar ───────────────────────────────────────────────────────────────
  tabBarBackground: 'rgba(245,240,232,0.88)',
  tabBarBorder: 'rgba(30,28,24,0.08)',
  tabBarActive: '#7CB87A',
  tabBarInactive: 'rgba(30,28,24,0.28)',

  // ── Input / Compose ───────────────────────────────────────────────────────
  inputBackground: '#EDE8DF',
  inputBorder: 'rgba(30,28,24,0.08)',
  inputPlaceholder: 'rgba(30,28,24,0.22)',

  // ── Chat bubbles ──────────────────────────────────────────────────────────
  userBubble: '#7CB87A',
  assistantBubble: 'rgba(122,173,206,0.14)',
  assistantText: '#1A1A16',

  // ── Skeleton / loading ────────────────────────────────────────────────────
  skeletonBase: 'rgba(30,28,24,0.07)',
  skeletonHighlight: 'rgba(30,28,24,0.12)',
};

export type ThemeColors = typeof darkColors;
