# PaywallModal — Visual Design Spec
**Version:** 1.0
**Author:** Product & Design Lead
**Date:** 2026-04-04
**Status:** APPROVED — authored to support B23 (light theme token migration, task #75)
**Component:** `apps/mobile/components/paywall/PaywallModal.tsx`
**Related tasks:** #74 (author this spec), #75 (migrate hardcoded hex → `useThemeColors()` tokens)

---

## Context

PaywallModal was built in commit `2ac9378` without a prior Product & Design spec. The component is visually correct and brand-compliant (verified by P&D run Z). This spec formalizes the design so:

1. Lead Eng has a reference for the B23 light-theme token migration (#75)
2. Future changes to the paywall have a spec to update first

**Live status:** Not yet shown to real users — gated on Austin completing B2 (RevenueCat iOS app + products in dashboard).

---

## 1. Layout & Component Hierarchy

The modal uses `presentationStyle="pageSheet"` — iOS bottom sheet that rises over the current screen. This is correct behavior for a paywall and should not change.

```
Modal (pageSheet, slide animation)
└── SafeAreaView (edges: top, bottom) — flex: 1, bg: background
    ├── Close button (absolute, top-right)
    └── ScrollView (vertical, no indicator, bounces: false)
        └── ScrollContent (paddingH: 20, paddingTop: 52, paddingBottom: 32)
            ├── Header section (centered)
            │   ├── Crown icon orb (56×56, amber)
            │   ├── "Kin Family Plan" heading
            │   └── Trial badge pill
            ├── Plan cards row (horizontal, gap: 10)
            │   ├── Monthly plan card
            │   └── Annual plan card (highlighted by default)
            ├── Features section (card)
            │   ├── "EVERYTHING INCLUDED" label
            │   └── 7 feature rows (icon + label)
            ├── Error banner (conditional — only on error)
            ├── CTA button ("Start 7-Day Free Trial")
            ├── Footer link row (Restore · Privacy · Terms)
            └── Disclaimer text
```

**Minimum scroll height:** `SCREEN_HEIGHT × 0.85` — ensures the modal feels like a full-bleed sheet on all devices.

---

## 2. Color Tokens

PaywallModal currently uses **hardcoded hex values**. For B23 (light theme migration, task #75), all values must be replaced with `const c = useThemeColors()` references.

The table below documents every color in the component and its correct token mapping.

### 2.1 Surface colors

| Hardcoded value | Token | Notes |
|----------------|-------|-------|
| `#0C0F0A` | `c.background` | Modal background, success state background |
| `#141810` | `c.surfacePrimary` | Plan cards, Features card |
| `rgba(212,168,67,0.04)` | `c.amberSubtle` | Annual card base tint (dark: amberSubtle `rgba(212,168,67,0.08)`) — slightly lighter than token; see §2.4 |

### 2.2 Text colors

| Hardcoded value | Token | Notes |
|----------------|-------|-------|
| `#F0EDE6` | `c.textPrimary` | Heading, feature labels, annual plan label |
| `rgba(240,237,230,0.4)` | `c.textMuted` | Close button icon, plan label (non-amber) |
| `rgba(240,237,230,0.35)` | `c.textMuted` | Plan period "/mo", footer links — use `c.textMuted` |
| `rgba(240,237,230,0.25)` | `c.textDim` | Plan detail text ("Billed monthly") |
| `rgba(240,237,230,0.2)` | `c.textFaint` | Features heading ("EVERYTHING INCLUDED") |
| `rgba(240,237,230,0.18)` | `c.textFaint` | Disclaimer text — use `c.textFaint` |
| `rgba(240,237,230,0.15)` | `c.textFaint` | Footer dot separator — use `c.textFaint` |
| `rgba(12,15,10,0.6)` | `c.textOnGreen` + `0.6` opacity | CTA subtext — implement as `rgba(c.textOnGreen + ,0.6)` or add to token set as `textOnGreenMuted` |

### 2.3 Brand accent colors

| Hardcoded value | Token | Notes |
|----------------|-------|-------|
| `#7CB87A` | `c.green` | CTA button bg, monthly plan price, monthly checkmark |
| `rgba(124,184,122,0.15)` | custom — see §2.4 | Monthly checkmark bg — no exact token; use `c.greenSubtle` (`rgba(124,184,122,0.10)`) or add `greenSubtle2` |
| `rgba(124,184,122,0.3)` | `c.greenDim` | Success icon border |
| `rgba(124,184,122,0.15)` | `c.greenSubtle` | Success icon bg — token is 0.10; see §2.4 |
| `#D4A843` | `c.amber` | Crown icon, trial badge text, annual price, savings text, BEST VALUE badge bg, annual checkmark |
| `rgba(212,168,67,0.12)` | `c.amberSubtle` | Crown orb bg — dark: `rgba(212,168,67,0.08)` (token), light: `rgba(212,168,67,0.10)` — see §2.4 |
| `rgba(212,168,67,0.1)` | `c.amberSubtle` | Trial badge bg — exact match |
| `rgba(212,168,67,0.15)` | `c.amberBorder` | Annual card unselected border — dark: `rgba(212,168,67,0.25)` (token) — see §2.4 |
| `rgba(212,168,67,0.2)` | `c.amberBorder` | Crown orb border — dark: `rgba(212,168,67,0.25)` (token) — use `c.amberBorder` |
| `rgba(212,168,67,0.15)` | `c.amberSubtle` | Annual checkmark bg — use `c.amberSubtle` |
| `#D4748A` | `c.rose` | Error text |
| `rgba(212,116,138,0.1)` | `c.roseSubtle` | Error banner bg — exact match |
| `rgba(212,116,138,0.15)` | `c.roseSubtle` | Error banner border — token is `rgba(212,116,138,0.08)`; use `c.roseSubtle` |
| `rgba(240,237,230,0.06)` | `c.tabBarBorder` | Close button border, plan card default border |
| `rgba(240,237,230,0.04)` | `c.inputBorder` | Features card border |

### 2.4 Token delta notes (for B23 migration decisions)

Several hardcoded values don't exactly match the nearest token. During B23 migration, Lead Eng should standardize to the nearest token unless the visual delta is obvious. Below are the gaps:

| Value in component | Nearest token | Delta | Recommendation |
|-------------------|--------------|-------|---------------|
| `rgba(124,184,122,0.15)` | `c.greenSubtle` `(0.10)` | +5% opacity | Use `c.greenSubtle` — delta imperceptible on dark bg |
| `rgba(124,184,122,0.15)` | `c.greenDim` `(0.40)` | –25% opacity | This is actually closer to `c.greenSubtle` — use `c.greenSubtle` |
| `rgba(212,168,67,0.12)` | `c.amberSubtle` `(0.08)` | +4% opacity | Use `c.amberSubtle` — imperceptible |
| `rgba(212,168,67,0.04)` | `c.amberSubtle` `(0.08)` | –4% opacity | Use `c.amberSubtle` — imperceptible; annual card already has amber border to distinguish |
| `rgba(212,168,67,0.15)` | `c.amberBorder` `(0.25)` | –10% opacity | Use `c.amberBorder` — the additional opacity reads as more premium, which is correct for annual card |
| `rgba(212,116,138,0.15)` | `c.roseSubtle` `(0.08)` | +7% opacity | Use `c.roseSubtle` — acceptable; error state only, tolerance is higher |
| `rgba(12,15,10,0.6)` | `c.textOnGreen` | Alpha wrapper needed | Add `c.textOnGreenMuted: 'rgba(12,15,10,0.60)'` to color token set (dark) + `'rgba(10,10,6,0.60)'` (light) |

**`textOnGreenMuted` is the only new token required for this migration.** All other values map to existing tokens with imperceptible delta.

---

## 3. Typography

| Element | Font | Size | Weight | Color token | Notes |
|---------|------|------|--------|-------------|-------|
| Modal heading "Kin Family Plan" | Instrument Serif Italic | 26px | Italic | `c.textPrimary` | — |
| Trial badge text | Geist | 13px | Regular | `c.amber` | — |
| Plan label ("Monthly", "Annual") | Geist Mono Regular | 11px | Regular | `c.textMuted` | Uppercase, letterSpacing 1 |
| Plan price ("$39", "$25") | Geist Mono Regular | 28px | Regular | `c.green` (monthly) / `c.amber` (annual) | — |
| Plan period ("/mo") | Geist | 13px | Regular | `c.textMuted` | — |
| Plan detail ("Billed monthly") | Geist | 11px | Regular | `c.textDim` | — |
| Plan savings text ("Save $169...") | Geist SemiBold | 11px | SemiBold | `c.amber` | Annual card only |
| BEST VALUE badge | Geist Mono Regular | 9px | Regular | `c.background` | All-caps, letterSpacing 0.5, amber bg |
| Features heading | Geist Mono Regular | 11px | Regular | `c.textFaint` | Uppercase, letterSpacing 2 |
| Feature label | Geist | 14px | Regular | `c.textPrimary` | — |
| CTA primary text | Geist SemiBold | 17px | SemiBold | `c.textOnGreen` | — |
| CTA subtext | Geist | 12px | Regular | `c.textOnGreenMuted` | — |
| Footer links | Geist | 13px | Regular | `c.textMuted` | — |
| Footer dot separator | Geist | 13px | Regular | `c.textFaint` | — |
| Disclaimer | Geist | 11px | Regular | `c.textFaint` | Centered, lineHeight 16 |
| Error text | Geist | 13px | Regular | `c.rose` | Centered |
| Success title | Instrument Serif Italic | 24px | Italic | `c.textPrimary` | Centered |
| Success subtitle | Geist | 15px | Regular | `c.textMuted` | Centered, lineHeight 22 |

---

## 4. Component Dimensions & Spacing

### Close button
- Size: 36×36px
- Border radius: 18px (full circle)
- Position: absolute, top 16px, right 20px
- Icon: `X` from lucide, 20px, `c.textMuted`
- Hit slop: 12px all sides
- Background: `c.surfacePrimary`
- Border: 1px, `c.tabBarBorder`

### Header section
- Center-aligned
- Margin bottom: 28px

**Crown orb:**
- Size: 56×56px
- Border radius: 28px (full circle)
- Background: `c.amberSubtle`
- Border: 1px, `c.amberBorder`
- Margin bottom: 12px
- Icon: `Crown` from lucide, 28px, `c.amber`

**Heading:**
- Margin bottom: 10px

**Trial badge pill:**
- flexDirection: row, gap: 6px
- Background: `c.amberSubtle`
- Border radius: 20px
- Padding: 6px vertical, 14px horizontal
- Border: 1px, `c.amberBorder`
- Icon: `Sparkles` 12px, `c.amber`

### Plan cards row
- flexDirection: row
- Gap: 10px
- Margin bottom: 24px

**Plan card (base):**
- flex: 1 (equal width)
- Background: `c.surfacePrimary`
- Border radius: 18px
- Padding: 16px all sides
- Border: 1.5px, `c.tabBarBorder` (default)
- Min height: 130px

**Plan card — selected state:**
- Border: 1.5px, `c.green` (monthly selected) or `c.amber` (annual selected)

**Annual card modifier (always active):**
- Background: `c.amberSubtle` (very light amber tint)
- Border: 1.5px, `c.amberBorder` (unselected) or `c.amber` (selected)

**Plan checkmark (selected state only):**
- Size: 22×22px
- Border radius: 11px (full circle)
- Position: absolute, top 10px, right 10px
- Background: `c.greenSubtle` (monthly) or `c.amberSubtle` (annual)
- Icon: `Check` 12px strokeWidth 3, `c.green` (monthly) or `c.amber` (annual)

**BEST VALUE badge (annual card, always visible):**
- Position: absolute, top –11px, horizontally centered (left: 50%, translateX: –34px)
- Background: `c.amber`
- Border radius: 8px
- Padding: 3px vertical, 8px horizontal

### Features section
- Background: `c.surfacePrimary`
- Border radius: 18px
- Padding: 16px
- Border: 1px, `c.inputBorder`
- Margin bottom: 20px
- Gap between rows: 12px
- Gap between heading and first row: 4px additional (via `marginBottom: 4` on heading)

**Feature row:**
- flexDirection: row
- alignItems: center
- Gap: 12px

**Feature icon orb:**
- Size: 28×28px
- Border radius: 8px
- Background: `${iconColor}18` where iconColor is one of `c.amber`, `c.green`, `c.blue` (18 = hex for ~10% opacity)
- flexShrink: 0
- Icon: 15px, matching iconColor

**Feature icon/color assignments:**
| Feature | Icon | Color token |
|---------|------|-------------|
| Personalized morning briefings | `Sparkles` | `c.amber` |
| Unlimited Kin AI chat | `MessageCircle` | `c.green` |
| Smart family calendar sync | `CalendarDays` | `c.blue` |
| Household budget tracking | `Wallet` | `c.amber` |
| Real-time coordination alerts | `Zap` | `c.green` |
| Family meal planning | `Star` | `c.amber` |
| Private & encrypted | `Shield` | `c.blue` |

### Error banner (conditional)
- Background: `c.roseSubtle`
- Border radius: 12px
- Padding: 12px
- Margin bottom: 12px
- Border: 1px, `c.roseSubtle`

### CTA button
- Background: `c.green`
- Border radius: 18px
- Padding vertical: 18px
- alignItems: center
- Margin bottom: 16px
- Gap (between primary and subtext): 2px
- Disabled state: opacity 0.6
- Press state: opacity 0.85 (React Native `pressed` feedback)

### Footer link row
- flexDirection: row
- alignItems: center
- justifyContent: center
- Gap: 8px
- Margin bottom: 12px
- flexWrap: wrap (safe on narrow devices)

### Disclaimer
- Margin: 0 (sits at bottom of scroll content)

---

## 5. States

### 5.1 Loading state (RC offering not yet fetched)
- CTA button is disabled (`disabled={!offeringLoaded}`)
- CTA opacity 0.6 via `ctaButtonDisabled`
- No loading indicator shown in the modal body — prices fall back to static values
- Static fallback: Monthly `$39/mo`, Annual `$25/mo` (`$299/yr`)
- Note: This state is brief in production. Acceptable for TestFlight.

### 5.2 Default state (RC loaded, annual selected)
- Annual plan card shows amber border + amber checkmark
- Monthly plan card shows default border
- BEST VALUE badge visible on annual card
- CTA text: "Start 7-Day Free Trial" / "Then $299/year"
- Prices sourced from RC packages when available

### 5.3 Monthly plan selected
- Monthly card border: `c.green` (1.5px)
- Annual card border: `c.amberBorder` (1.5px, reverts to unselected)
- Monthly checkmark visible, green
- Annual checkmark hidden
- CTA subtext: "Then $39/month"

### 5.4 Purchasing state
- CTA button shows `ActivityIndicator` (size small, color `c.background`)
- All plan selection and footer controls disabled
- No layout shift — `ActivityIndicator` replaces the two text lines

### 5.5 Restoring state
- Footer "Restore purchases" text replaced by `ActivityIndicator` (size small, color `c.textMuted`)
- CTA and plan selection remain interactive
- This is intentional — restoring is a secondary action

### 5.6 Error state
- Error banner fades in above CTA button
- Error banner uses `c.roseSubtle` background, `c.rose` text
- Error banner renders conditionally (`errorMsg !== null`)
- Error clears on plan selection change
- Common errors: "This plan isn't available right now. Please try again." / "No previous purchase found for this Apple ID."

### 5.7 Success state (purchased or restored)
- Entire modal JSX replaced with success screen (separate `if (purchased)` branch)
- This is a full-modal replacement, not an overlay
- After 1800ms, `onClose()` is called automatically — modal dismisses
- No user interaction required in success state

**Success screen layout:**
- Background: `c.background`, full flex: 1
- Center-aligned content, gap: 16px, padding horizontal: 32px
- Icon orb: 80×80px, border radius 40px, `c.greenSubtle` bg, border 2px `c.greenDim`
- Icon: `Check` 40px strokeWidth 3, `c.green`
- Title: "Welcome to Kin Family Plan" — Instrument Serif Italic 24px, `c.textPrimary`, centered
- Subtitle: "Your 7-day free trial has started. Enjoy the full Kin experience." — Geist 15px, `c.textMuted`, centered, lineHeight 22

---

## 6. Motion

| Interaction | Behavior |
|------------|---------|
| Modal entrance | `animationType="slide"` — iOS default pageSheet slide-up |
| Modal dismiss | Reverse slide-down (iOS default) |
| Plan selection tap | Light haptic impact (`ImpactFeedbackStyle.Light`). Checkmark appears/disappears. Border color transitions — no animation specified; iOS renders at frame rate. Optional for B23: add 150ms opacity ease-out on checkmark appear. |
| CTA button press | `opacity: 0.85` on `pressed` state — immediate, no animation |
| Purchase success | Success notification haptic (`NotificationFeedbackType.Success`). Then 1800ms delay → `onClose()`. No fade-out animation on the success screen; the modal dismisses via its native slide-down. |
| Restore in-progress | Activity indicator replaces text in footer — no layout animation |

---

## 7. Light Theme Migration Notes (B23, task #75)

When implementing B23, the PaywallModal migration steps are:

1. Import `useThemeColors`: add `const c = useThemeColors();` inside the component function body (before the JSX, same pattern as `index.tsx`, `chat.tsx`, `settings.tsx`).

2. Move `StyleSheet.create({...})` inside the component (or use inline styles for color values) so styles can reference `c`. This is the same pattern used throughout the app.

3. Replace all hardcoded hex values with the token mappings in §2 above.

4. Add `textOnGreenMuted` to `darkColors` and `lightColors` in `apps/mobile/constants/colors.ts`:
   - Dark: `textOnGreenMuted: 'rgba(12,15,10,0.60)'`
   - Light: `textOnGreenMuted: 'rgba(10,10,6,0.60)'`

5. The icon color `${color}18` pattern (used in feature icon wraps) works in dark mode but may not provide enough contrast in light mode. During B23, verify the icon orb tint reads correctly on `c.surfacePrimary` (light: `#EDE8DF`). If insufficient contrast, bump alpha to `22` (hex ~13%) for light theme.

6. The `BEST VALUE` badge (`c.amber` background, `c.background` text) looks correct in both themes — amber reads on both light and dark backgrounds, and `c.background` is dark/light accordingly.

7. The CTA button (`c.green` background, `c.textOnGreen` / `c.textOnGreenMuted` text) is identical in both themes — no adaptation needed.

---

## 8. What NOT to Change

- `presentationStyle="pageSheet"` — iOS native behavior, not customizable
- `animationType="slide"` — matches other modal presentations in the app
- The 7-feature list copy — product decision, not design
- Static fallback prices (`$39`, `$25`) — correct at launch; update if pricing changes
- RevenueCat product identifiers (`kin_monthly_3999`, `kin_annual_29900`) — functional, not spec scope
- The 1800ms auto-dismiss delay on success — a deliberate product beat

---

_— Product & Design Lead, 2026-04-04_
