# Briefing Card — Component Spec
**Version:** 1.0
**Author:** Product & Design
**Date:** 2026-04-03
**Status:** APPROVED — Lead Eng may build against this spec

---

## Overview

The morning briefing card is the flagship component of the Today screen. It surfaces one AI-generated coordination insight per user per day. It must feel like it was written by someone who understands this specific family — not a generic notification.

---

## 1. Dimensions & Layout

| Property | Value |
|----------|-------|
| Border radius | 20px |
| Padding (all sides) | 20px |
| Margin bottom | 12px |
| Background | `#141810` (slightly lifted surface above screen background) |
| Border | 1px `rgba(124, 184, 122, 0.18)` (subtle green edge) |
| Shadow color | `#7CB87A` |
| Shadow offset | `{ width: 0, height: 2 }` |
| Shadow opacity | 0.06 |
| Shadow radius | 12px |
| Elevation (Android) | 3 |

---

## 2. Internal Structure (top to bottom)

### Title Row

Contains two elements: title/label (left) and live pill (right).

**Title label ("Morning")**

| Property | Value |
|----------|-------|
| Font | Instrument Serif Italic |
| Size | 18px |
| Color | `#7CB87A` (primary green) |
| Left icon | `Sparkles` (14px, `#7CB87A`), gap 7px from text |

**Live pill**

| Property | Value |
|----------|-------|
| Background | `rgba(124, 184, 122, 0.10)` |
| Padding horizontal | 8px |
| Padding vertical | 3px |
| Border radius | 20px |
| Label text | "TODAY" |
| Label font | Geist Mono Regular, 10px, `rgba(124, 184, 122, 0.80)`, uppercase, letterSpacing 0.5 |
| Dot | 5×5px circle, border-radius 2.5px, `#7CB87A`, 5px gap from text |

Title row margin bottom: 14px.

---

### Hook Sentence (first sentence of briefing)

The opening sentence of the briefing — the primary coordination insight. Always written in plain language, leading with implication not data.

| Property | Value |
|----------|-------|
| Font | Instrument Serif Italic |
| Size | 18px |
| Color | `#F0EDE6` (warm white) |
| Line height | 26px |
| Margin bottom | 10px |

The hook renders at larger Serif size to differentiate it visually from supporting beats. Instrument Serif is used here because this is the emotional/human layer — this is Kin speaking, not a system label.

---

### Supporting Beat Rows (sentences 2–4)

Additional sentences from the briefing. Max 3 supporting beats (total briefing max: 4 sentences per §5).

Each beat row:

| Property | Value |
|----------|-------|
| Layout | Row: dot + text, gap 10px |
| Dot | 4×4px circle, border-radius 2px, `rgba(124, 184, 122, 0.45)`, marginTop 9px (optical alignment with text cap height) |
| Font | Geist Regular |
| Size | 14px |
| Color | `rgba(240, 237, 230, 0.80)` |
| Line height | 22px |
| Margin bottom (per row) | 6px |

Supporting beats use Geist (functional) rather than Serif — they carry detail and context, not the emotional hook.

---

## 3. States

### Loading State — Skeleton Card

Renders while briefing fetch is in-flight. Must feel like the card is already there, settling into focus.

**Container:** Same dimensions and border radius as content card (`#141810`, border, shadow).

**Skeleton elements (top to bottom):**

| Element | Width | Height | Border radius | Color |
|---------|-------|--------|---------------|-------|
| Title stub | 80px | 16px | 8px | `rgba(240, 237, 230, 0.07)` |
| Line 1 (hook) | 100% | 12px | 6px | `rgba(240, 237, 230, 0.05)` |
| Line 2 | 100% | 12px | 6px | `rgba(240, 237, 230, 0.05)` |
| Line 3 | 75% | 12px | 6px | `rgba(240, 237, 230, 0.05)` |
| Line 4 | 55% | 12px | 6px | `rgba(240, 237, 230, 0.05)` |

**Animation:**

| Property | Value |
|----------|-------|
| Type | Opacity pulse (shimmer approximation) |
| From | 0.40 opacity |
| To | 0.90 opacity |
| Duration per direction | 900ms |
| Loop | Continuous |
| useNativeDriver | true |

Note: A true shimmer (gradient sweep) is preferred if `react-native-linear-gradient` is available. If not, the opacity pulse is acceptable. Target: 1500ms full cycle for perceived shimmer rhythm.

### Content State

Normal rendering as described above.

### Empty State (no briefing today)

Render **nothing**. Do not show a placeholder, an empty card, or an error. The absence of a briefing card is intentional — the rest of the Today screen (alerts, check-ins, silence state) handles the surface.

### Error State

Same as empty — render nothing. Do not show an error card in this position. Errors in briefing fetch should fail silently. The briefing is best-effort; absence is always valid.

---

## 4. Motion

| Transition | Duration | Easing | Notes |
|------------|----------|--------|-------|
| Entrance (card appear) | 420ms | Default | Shared with Today screen entrance animation (parallel fade + translateY) |
| Skeleton → content | No transition — skeleton unmounts, card mounts | — | Both use same entrance fade |

---

## 5. Typography Rationale

| Element | Typeface | Why |
|---------|----------|-----|
| Card title "Morning" | Instrument Serif Italic | Sets emotional register — this is a human moment |
| Hook sentence | Instrument Serif Italic | The primary insight should feel personal, handwritten |
| Supporting beats | Geist Regular | Detail and logistics — functional clarity over warmth |
| Live pill | Geist Mono | System indicator — small, precise |

---

## 6. Content Rules (for QA)

The card must be audited for spec compliance on every build:

- [ ] Max 4 sentences total (hook + max 3 beats)
- [ ] No output starting with "Based on your calendar...", "It looks like...", "You may want to..."
- [ ] Lead sentence is implication-led, not data-led
- [ ] Content is specific to this user's life (calendar, family data visible)
- [ ] Card not shown when briefing content is empty

---

## 7. Color Tokens Used

| Token | Hex | Usage |
|-------|-----|-------|
| Primary green | `#7CB87A` | Icon, title, beat dot, live pill |
| Warm white | `#F0EDE6` | Hook sentence text |
| Warm white 80% | `rgba(240, 237, 230, 0.80)` | Beat text |
| Surface card | `#141810` | Card background |
| Background | `#0C0F0A` | Screen behind card |
