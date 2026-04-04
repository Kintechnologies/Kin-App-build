# Today Screen — Component Spec
**Version:** 1.0
**Author:** Product & Design
**Date:** 2026-04-03
**Status:** APPROVED — Lead Eng may build against this spec

---

## Overview

The Today screen is the home surface. It surfaces the intelligence engine's output in three ordered layers: morning briefing, alert cards, and check-in cards. When nothing is worth surfacing, it shows a calm clean-day state. It never feels empty or broken.

---

## 1. Layout

### Screen Container

| Property | Value |
|----------|-------|
| Background | `#0C0F0A` (near-black) |
| Safe area | `SafeAreaView` — top and bottom edges respected |
| Scroll | `ScrollView`, vertical, standard iOS momentum — no custom scroll behavior |
| Horizontal padding | 20px both sides |
| Bottom padding | 120px (clears tab bar + breathing room) |

### Component Order (top to bottom)

1. Header (greeting + name + date)
2. Morning Briefing Card — or skeleton while loading
3. Alert Cards (OPEN first, then ACKNOWLEDGED, then RESOLVED)
4. Today's Schedule section *(B11 — required per spec §1, not yet built)*
5. Check-in Cards (max 2, suppressed when OPEN alert active)
6. Clean-day state (only when all layers are empty and loading is complete)

---

## 2. Header

### Layout

| Property | Value |
|----------|-------|
| Alignment | Centered horizontally |
| Margin top | 16px |
| Margin bottom | 28px |

### Elements (top to bottom)

**Greeting line** (e.g., "Good morning")

| Property | Value |
|----------|-------|
| Font | Geist Mono Regular |
| Size | 11px |
| Color | `rgba(240, 237, 230, 0.28)` |
| Transform | uppercase |
| Letter spacing | 2 |
| Margin bottom | 6px |

**Display name** (e.g., "Austin")

| Property | Value |
|----------|-------|
| Font | Instrument Serif Italic |
| Size | 32px |
| Color | `#F0EDE6` (warm white) |
| Alignment | center |

**Date line** (e.g., "Friday, April 3")

| Property | Value |
|----------|-------|
| Font | Geist Regular |
| Size | 13px |
| Color | `rgba(240, 237, 230, 0.30)` |
| Margin top | 4px |
| Format | `weekday: "long", month: "long", day: "numeric"` |

### Entrance Animation

| Property | Value |
|----------|-------|
| Type | Parallel fade + slide up |
| Duration | 420ms |
| Easing | Default (ease-in-out) |
| Initial opacity | 0 → 1 |
| Initial translateY | 16px → 0px |
| useNativeDriver | true |

---

## 3. Morning Briefing Card

See `briefing-card-spec.md` for full spec.

**Ordering rule:** Briefing card always renders before alert cards. If no briefing exists and loading is complete, render nothing (do not show a placeholder).

---

## 4. Alert Cards

See `alert-card-spec.md` for full spec.

**Ordering rule:**
- One OPEN alert visible at a time (the most recent unacknowledged issue)
- All ACKNOWLEDGED alerts render below the single OPEN alert
- RESOLVED alerts render after acknowledged (closure line + auto-fade)
- If multiple OPEN alerts exist, queue them — only the first is shown until acknowledged

---

## 5. Today's Schedule

> **Status: BUILT (B11 resolved). Lead Eng shipped `TodayScheduleSection` in even-hour run G. QA Run D verified clean.**

### Layout

Position: Below alert cards, above check-in cards.

| Property | Value |
|----------|-------|
| Section header font | Geist Mono Regular, 10px, `rgba(240, 237, 230, 0.25)`, uppercase, letterSpacing 1.5 |
| Section header margin bottom | 8px |
| Section margin bottom | 16px |
| Background | None (transparent — items float on screen background) |

### Event Row

| Property | Value |
|----------|-------|
| Font: time | Geist Mono Regular, 12px, `rgba(240, 237, 230, 0.45)` |
| Font: event title | Geist Regular, 14px, `rgba(240, 237, 230, 0.75)` |
| Person indicator | 6px circle, left edge of row: `#7AADCE` for Parent A, `#D4748A` for Parent B |
| Row padding | 10px vertical, no horizontal (full card width) |
| Row separator | 1px `rgba(240, 237, 230, 0.04)` |
| Empty state | Render nothing — do not show "No events" placeholder |

### Data source

Fetched from connected calendar events for today. Real-time subscription via Supabase. Per-person color coding requires profile ID cross-reference. Sort ascending by start time.

---

## 6. Check-in Cards

See `checkin-card-spec.md` for full spec.

**Suppression rule:** Do not render check-in cards when any OPEN alert is active.
**Limit:** Maximum 2 per day, never more.

---

## 7. Clean-Day State

See `silence-state-spec.md` for full spec.

**Trigger:** Render only when:
- `briefingLoading` is false, AND
- No briefing content exists, AND
- No active or acknowledged alerts, AND
- No undismissed check-in cards, AND
- First-use content is not being shown

---

## 8. Ambient Background

`FloatingOrbs` component renders behind all content. Subtle ambient animation on the screen background. This is intentional — it gives the screen visual life on clean-day state and prevents the background from feeling static.

---

## 9. Pull-to-Refresh

| Property | Value |
|----------|-------|
| Tint color | `#7CB87A` (primary green) |
| Haptic | Light impact on pull |
| Action | Re-fetches briefing, issues, and check-ins |

---

## 10. Spec Compliance Checklist (for QA)

- [x] Header centered, greeting in Geist Mono, name in Instrument Serif Italic 32px — **verified 2026-04-04 P&D audit**
- [x] Briefing card renders above alert cards at all times — **verified 2026-04-04**
- [x] Only 1 OPEN alert visible at a time — **verified 2026-04-04** (`activeOpenAlert = openIssues[0]`)
- [x] Check-in cards suppressed when any OPEN alert present — **verified 2026-04-04** (`showCheckins = activeOpenAlert === null`)
- [x] Max 2 check-in cards per day — **verified 2026-04-04** (`.slice(0, 2)` enforced in render)
- [x] Clean-day state renders only when all layers empty and loading complete — **verified 2026-04-04**
- [x] No loading spinner or blank white screen in any state — **verified 2026-04-04** (skeleton card + clean-day fallback)
- [x] No domain tab navigation reachable from this screen — **verified 2026-04-04** (`_layout.tsx`: 3 tabs only)
- [x] Today's Schedule section present with realtime subscription (B11 — built, verified QA Run D)
- [x] Entrance animation: 420ms parallel fade + slide up — **verified 2026-04-04**
- [x] First-use moment wired to `/api/first-use` with 400ms ease-in — **verified 2026-04-04** (S4.2 complete)
- [x] Load-error retry state present (B15) — **verified 2026-04-04** (`loadError` state with tap-to-retry)
