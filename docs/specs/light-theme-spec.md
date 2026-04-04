# Light Theme — Color Token Spec
**Version:** 1.0
**Author:** Product & Design
**Date:** 2026-04-03
**Status:** APPROVED — Lead Eng may implement against this spec
**Blocker resolved:** B23 (app is dark-mode only — no `useColorScheme` support)

---

## Overview

Every background color in the current build is hardcoded hex (e.g., `#0C0F0A`, `#141810`). Users with iOS Light Mode enabled see a dark app. This spec defines the complete light-mode token set so Lead Eng can implement `useColorScheme` throughout.

The light theme is not an inversion of the dark theme. It is a warm, off-white surface that carries the same emotional register — calm, considered, unhurried — without feeling clinical. It must feel like the same product, not a different one.

**Philosophy:** Dark theme = late night kitchen table. Light theme = morning light through a window. Same conversation, different light.

---

## 1. Implementation Pattern

Lead Eng should create a single `useThemeColors()` hook (or a `colors` constant derived from `useColorScheme()`) that returns the active token set. All StyleSheet values that are currently hardcoded hex must be replaced with token references. No conditional rendering based on theme — only color swaps.

```ts
// Recommended pattern
import { useColorScheme } from 'react-native';
import { darkColors, lightColors } from '@/constants/colors';

export function useThemeColors() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkColors : lightColors;
}
```

Every `StyleSheet.create({})` block that uses hardcoded color values must be converted to use the token object. This is a global refactor across `index.tsx`, `chat.tsx`, `settings.tsx`, `_layout.tsx`, and any shared components.

---

## 2. Core Background Tokens

These are the surface colors — the most structurally important values.

| Token | Dark value | Light value | Usage |
|-------|-----------|-------------|-------|
| `background` | `#0C0F0A` | `#F5F0E8` | Screen background (SafeAreaView) |
| `surfacePrimary` | `#141810` | `#EDE8DF` | Card primary surface (briefing, check-in, chat thread row) |
| `surfaceSecondary` | `#161C14` | `#E6E0D5` | Card secondary surface (OPEN alert, chat bubble elevated) |
| `surfaceMuted` | `#111410` | `#E9E4DB` | ACKNOWLEDGED alert card |
| `surfaceOverlay` | `#121618` | `#E8EBE6` | Chat thread type badges (personal/household) |
| `surfaceSubtle` | `rgba(240,237,230,0.05)` | `rgba(30,28,24,0.04)` | Settings section dividers, hairlines |

**Note on `#F5F0E8`:** This is the design system's named warm white, repurposed as the light background. It gives the light theme a warm, parchment quality rather than a stark white. The dark theme's `#0C0F0A` is the opposite extreme — near-black. Both feel intentional.

---

## 3. Text Tokens

| Token | Dark value | Light value | Usage |
|-------|-----------|-------------|-------|
| `textPrimary` | `#F0EDE6` | `#1A1A16` | Primary text (names, card content, briefing body) |
| `textSecondary` | `rgba(240,237,230,0.75)` | `rgba(30,28,24,0.65)` | Secondary labels, schedule event titles |
| `textMuted` | `rgba(240,237,230,0.40)` | `rgba(30,28,24,0.35)` | Muted copy (timestamps, subtitles, check-in prompt) |
| `textDim` | `rgba(240,237,230,0.28)` | `rgba(30,28,24,0.25)` | Greeting line ("GOOD MORNING"), section headers |
| `textFaint` | `rgba(240,237,230,0.22)` | `rgba(30,28,24,0.18)` | Hairline labels, legal, placeholder text |
| `textAcknowledged` | `rgba(240,237,230,0.25)` | `rgba(30,28,24,0.22)` | ACKNOWLEDGED alert card text |
| `textOnGreen` | `#0C0F0A` | `#0C0F0A` | Text on solid green button (no change — same dark value) |

---

## 4. Brand Color Tokens (Accent + Interactive)

Brand accent colors remain the same in both themes. The underlying surface changes; the accent does not. However, their opacity-based variants must be adjusted because they sit on a light surface.

| Token | Dark value | Light value | Usage |
|-------|-----------|-------------|-------|
| `green` | `#7CB87A` | `#7CB87A` | Primary action, briefing icon, send button |
| `greenMuted` | `rgba(124,184,122,0.50)` | `rgba(124,184,122,0.65)` | CTA footer in OPEN alert, resolved icon |
| `greenSubtle` | `rgba(124,184,122,0.10)` | `rgba(124,184,122,0.14)` | Briefing card shadow fill area, check-in surface tint |
| `greenDim` | `rgba(124,184,122,0.40)` | `rgba(124,184,122,0.55)` | RESOLVED state text (green italic closure line) |
| `greenShadow` | `#7CB87A` | `#7CB87A` | Shadow color on briefing + check-in card (same — shadow opacity handles it) |
| `amber` | `#D4A843` | `#D4A843` | OPEN alert border dot, Refer a Family accent |
| `amberBorder` | `rgba(212,168,67,0.25)` | `rgba(212,168,67,0.35)` | OPEN alert card border (slightly higher opacity on light — still reads amber, not yellow) |
| `amberShadow` | `rgba(212,168,67,0.08)` | `rgba(212,168,67,0.12)` | Alert shadow (slightly more visible on warm-white surface) |
| `amberSubtle` | `rgba(212,168,67,0.08)` | `rgba(212,168,67,0.10)` | Settings RC badge, Refer background tint |
| `blue` | `#7AADCE` | `#7AADCE` | Calendar, Parent A indicator, household thread badge |
| `blueSubtle` | `rgba(122,173,206,0.08)` | `rgba(122,173,206,0.12)` | Household thread background, partner chip |
| `rose` | `#D4748A` | `#D4748A` | Parent B indicator, partner care accent |
| `roseSubtle` | `rgba(212,116,138,0.08)` | `rgba(212,116,138,0.12)` | Error states, partner invite background tint |

---

## 5. Tab Bar Tokens

The tab bar uses a blur effect. Light mode should invert the darkness of the blur.

| Token | Dark value | Light value |
|-------|-----------|-------------|
| `tabBarBackground` | `rgba(12,15,10,0.85)` | `rgba(245,240,232,0.88)` |
| `tabBarBorder` | `rgba(240,237,230,0.06)` | `rgba(30,28,24,0.08)` |
| `tabBarActive` | `#7CB87A` | `#7CB87A` |
| `tabBarInactive` | `rgba(240,237,230,0.30)` | `rgba(30,28,24,0.28)` |

The blur intensity itself (`blurType`) should swap from `'dark'` to `'light'` (or `'chromeMaterialLight'` if using `@react-native-community/blur`).

---

## 6. Input + Compose Area Tokens (Chat Screen)

| Token | Dark value | Light value | Usage |
|-------|-----------|-------------|-------|
| `inputBackground` | `#141810` | `#EDE8DF` | Message compose area background |
| `inputBorder` | `rgba(240,237,230,0.04)` | `rgba(30,28,24,0.08)` | Compose area top border |
| `inputPlaceholder` | `rgba(240,237,230,0.20)` | `rgba(30,28,24,0.22)` | Placeholder text in compose field |
| `userBubble` | `#7CB87A` | `#7CB87A` | User message bubble (same — brand green, no change) |
| `assistantBubble` | `rgba(122,173,206,0.10)` | `rgba(122,173,206,0.14)` | Kin message bubble |
| `assistantText` | `rgba(240,237,230,0.85)` | `#1A1A16` | Kin message text (fully readable on light surface) |

---

## 7. Skeleton / Loading State Tokens

| Token | Dark value | Light value | Usage |
|-------|-----------|-------------|-------|
| `skeletonBase` | `rgba(240,237,230,0.07)` | `rgba(30,28,24,0.07)` | Skeleton line base color |
| `skeletonHighlight` | `rgba(240,237,230,0.12)` | `rgba(30,28,24,0.12)` | Shimmer animation peak color |

Shimmer direction and timing remain unchanged.

---

## 8. Per-Screen Token Mapping

### Today Screen (`index.tsx`)

| Style key | Dark value | Light token |
|-----------|-----------|-------------|
| `safeArea.backgroundColor` | `#0C0F0A` | `background` |
| `greetingText.color` | `rgba(240,237,230,0.28)` | `textDim` |
| `nameText.color` | `#F0EDE6` | `textPrimary` |
| `dateText.color` | `rgba(240,237,230,0.30)` | `textMuted` |
| `briefingCard.backgroundColor` | `#141810` | `surfacePrimary` |
| `briefingCard border` | `rgba(124,184,122,0.18)` | `rgba(124,184,122,0.22)` |
| `briefingContent.color` | `rgba(240,237,230,0.80)` | `textSecondary` |
| `alertCard (OPEN).backgroundColor` | `#161C14` | `surfaceSecondary` |
| `alertCard (OPEN) border` | `rgba(212,168,67,0.25)` | `amberBorder` |
| `alertContent.color` | `#F0EDE6` | `textPrimary` |
| `alertCard (ACKNOWLEDGED).backgroundColor` | `#111410` | `surfaceMuted` |
| `acknowledgedText.color` | `rgba(240,237,230,0.25)` | `textAcknowledged` |
| `resolvedText.color` | `rgba(124,184,122,0.40)` | `greenDim` |
| `checkinCard.backgroundColor` | `#141810` | `surfacePrimary` |
| `scheduleTimeText.color` | `rgba(240,237,230,0.45)` | `textMuted` |
| `scheduleEventText.color` | `rgba(240,237,230,0.75)` | `textSecondary` |
| `scheduleDivider` | `rgba(240,237,230,0.04)` | `rgba(30,28,24,0.05)` |
| `loadErrorCard.backgroundColor` | `rgba(240,237,230,0.07)` | `skeletonBase` |

### Conversations Screen (`chat.tsx`)

| Style key | Dark value | Light token |
|-----------|-----------|-------------|
| `safeArea.backgroundColor` | `#0C0F0A` | `background` |
| `threadRow.backgroundColor` | `#141810` | `surfacePrimary` |
| `threadTitle.color` | `#F0EDE6` | `textPrimary` |
| `threadPreview.color` | `rgba(240,237,230,0.32)` | `textMuted` |
| `personalBadge.backgroundColor` | `rgba(124,184,122,0.12)` | `greenSubtle` |
| `householdBadge.backgroundColor` | `rgba(122,173,206,0.08)` | `blueSubtle` |
| `userBubble.backgroundColor` | `#7CB87A` | `green` |
| `userText.color` | `#0C0F0A` | `textOnGreen` |
| `assistantBubble.backgroundColor` | `rgba(122,173,206,0.10)` | `assistantBubble` |
| `assistantText.color` | `rgba(240,237,230,0.85)` | `assistantText` |
| `inputBackground.backgroundColor` | `#141810` | `inputBackground` |
| `inputText.color` | `#F0EDE6` | `textPrimary` |
| `sendButton.backgroundColor` | `#7CB87A` | `green` |

### Settings Screen (`settings.tsx`)

| Style key | Dark value | Light token |
|-----------|-----------|-------------|
| `safeArea.backgroundColor` | `#0C0F0A` | `background` |
| `sectionCard.backgroundColor` | `#141810` | `surfacePrimary` |
| `cardTitle.color` | `#F0EDE6` | `textPrimary` |
| `cardSubtitle.color` | `rgba(240,237,230,0.30)` | `textMuted` |
| `iconWrap` (neutral) | `rgba(240,237,230,0.05)` | `rgba(30,28,24,0.06)` |
| `divider` | `rgba(240,237,230,0.03)` | `rgba(30,28,24,0.06)` |
| `versionText.color` | `rgba(240,237,230,0.10)` | `rgba(30,28,24,0.18)` |

---

## 9. FloatingOrbs Component

The FloatingOrbs ambient background animation sits behind all content. In dark mode the orbs are near-invisible against the near-black surface. In light mode they should remain subtle but slightly more visible.

| Property | Dark value | Light value |
|----------|-----------|-------------|
| Orb opacity range | 0.04–0.08 | 0.06–0.10 |
| Green orb color | `#7CB87A` | `#7CB87A` |
| Orb blend mode | Normal (on dark) | Normal (on warm white) |

No structural change — only opacity adjustment.

---

## 10. What Does NOT Change in Light Mode

These values are the same in both themes:

- All brand accent colors (`#7CB87A`, `#D4A843`, `#7AADCE`, `#D4748A`) — these are the product's identity
- Green send button background
- User message bubble (always `#7CB87A`)
- Text on green buttons (always `#0C0F0A`)
- Per-person calendar color dots (Parent A `#7AADCE`, Parent B `#D4748A`)
- Shadow colors (shadow opacity handles the visual difference)
- No purple (`#A07EC8`) in either theme

---

## 11. Constants File

Lead Eng should create `apps/mobile/constants/colors.ts` with both token sets exported:

```ts
export const darkColors = {
  background: '#0C0F0A',
  surfacePrimary: '#141810',
  surfaceSecondary: '#161C14',
  surfaceMuted: '#111410',
  textPrimary: '#F0EDE6',
  textSecondary: 'rgba(240,237,230,0.75)',
  textMuted: 'rgba(240,237,230,0.40)',
  textDim: 'rgba(240,237,230,0.28)',
  textFaint: 'rgba(240,237,230,0.22)',
  textAcknowledged: 'rgba(240,237,230,0.25)',
  textOnGreen: '#0C0F0A',
  green: '#7CB87A',
  greenMuted: 'rgba(124,184,122,0.50)',
  greenSubtle: 'rgba(124,184,122,0.10)',
  greenDim: 'rgba(124,184,122,0.40)',
  amber: '#D4A843',
  amberBorder: 'rgba(212,168,67,0.25)',
  amberShadow: 'rgba(212,168,67,0.08)',
  amberSubtle: 'rgba(212,168,67,0.08)',
  blue: '#7AADCE',
  blueSubtle: 'rgba(122,173,206,0.08)',
  rose: '#D4748A',
  roseSubtle: 'rgba(212,116,138,0.08)',
  tabBarBackground: 'rgba(12,15,10,0.85)',
  tabBarBorder: 'rgba(240,237,230,0.06)',
  tabBarActive: '#7CB87A',
  tabBarInactive: 'rgba(240,237,230,0.30)',
  inputBackground: '#141810',
  inputBorder: 'rgba(240,237,230,0.04)',
  inputPlaceholder: 'rgba(240,237,230,0.20)',
  assistantBubble: 'rgba(122,173,206,0.10)',
  assistantText: 'rgba(240,237,230,0.85)',
  skeletonBase: 'rgba(240,237,230,0.07)',
  skeletonHighlight: 'rgba(240,237,230,0.12)',
};

export const lightColors: typeof darkColors = {
  background: '#F5F0E8',
  surfacePrimary: '#EDE8DF',
  surfaceSecondary: '#E6E0D5',
  surfaceMuted: '#E9E4DB',
  textPrimary: '#1A1A16',
  textSecondary: 'rgba(30,28,24,0.65)',
  textMuted: 'rgba(30,28,24,0.35)',
  textDim: 'rgba(30,28,24,0.25)',
  textFaint: 'rgba(30,28,24,0.18)',
  textAcknowledged: 'rgba(30,28,24,0.22)',
  textOnGreen: '#0C0F0A',
  green: '#7CB87A',
  greenMuted: 'rgba(124,184,122,0.65)',
  greenSubtle: 'rgba(124,184,122,0.14)',
  greenDim: 'rgba(124,184,122,0.55)',
  amber: '#D4A843',
  amberBorder: 'rgba(212,168,67,0.35)',
  amberShadow: 'rgba(212,168,67,0.12)',
  amberSubtle: 'rgba(212,168,67,0.10)',
  blue: '#7AADCE',
  blueSubtle: 'rgba(122,173,206,0.12)',
  rose: '#D4748A',
  roseSubtle: 'rgba(212,116,138,0.12)',
  tabBarBackground: 'rgba(245,240,232,0.88)',
  tabBarBorder: 'rgba(30,28,24,0.08)',
  tabBarActive: '#7CB87A',
  tabBarInactive: 'rgba(30,28,24,0.28)',
  inputBackground: '#EDE8DF',
  inputBorder: 'rgba(30,28,24,0.08)',
  inputPlaceholder: 'rgba(30,28,24,0.22)',
  assistantBubble: 'rgba(122,173,206,0.14)',
  assistantText: '#1A1A16',
  skeletonBase: 'rgba(30,28,24,0.07)',
  skeletonHighlight: 'rgba(30,28,24,0.12)',
};
```

---

## 12. Status Bar

| Property | Dark mode | Light mode |
|----------|-----------|------------|
| `StatusBar` style | `light-content` | `dark-content` |

Set in the root `_layout.tsx`. Use `useColorScheme()` to toggle.

---

## 13. QA Compliance Checklist

- [ ] `useColorScheme()` is used — no hardcoded hex anywhere in `index.tsx`, `chat.tsx`, `settings.tsx`, `_layout.tsx`
- [ ] `apps/mobile/constants/colors.ts` exists with `darkColors` and `lightColors` exports
- [ ] `useThemeColors()` hook (or equivalent) returns correct set based on system setting
- [ ] Today screen background is `#F5F0E8` in light mode, `#0C0F0A` in dark mode
- [ ] Card surfaces are warm off-white in light mode (not pure white `#FFFFFF`)
- [ ] Brand accent colors unchanged in both modes
- [ ] No purple anywhere in either theme
- [ ] Tab bar blur inverts (`chromeMaterialDark` → `chromeMaterialLight` or equivalent)
- [ ] StatusBar style toggles (`light-content` ↔ `dark-content`)
- [ ] FloatingOrbs opacity marginally increased in light mode (0.04→0.06 floor)
- [ ] `assistantText` is fully opaque `#1A1A16` in light mode (not opacity-based `rgba(240,237,230,0.85)`)
- [ ] User message bubble remains `#7CB87A` in both themes

---

_Unblocks: B23. Lead Eng can now implement `useColorScheme` with full token authority._
