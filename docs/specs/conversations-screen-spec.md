# Conversations Screen — Component Spec
**Version:** 1.0
**Author:** Product & Design
**Date:** 2026-04-03
**Status:** APPROVED — Lead Eng may build against this spec

---

## Overview

The Conversations screen has two views: a thread list and a conversation detail. The thread list shows two pinned threads at the top (Personal and Household), followed by any general threads below. Tapping a thread opens the conversation detail view.

This screen is both a user-initiated surface (ask Kin anything) and a Kin-initiated one (Kin will create threads when coordination needs dialogue).

---

## 1. Thread List View

### Screen Container

| Property | Value |
|----------|-------|
| Background | `#0C0F0A` |
| Safe area | Top and bottom |
| Ambient | `FloatingOrbs` renders behind thread list |

### Header

| Property | Value |
|----------|-------|
| Title text | "Conversations" |
| Title font | Instrument Serif Italic, 28px, `#F0EDE6` |
| Padding top | 16px |
| Padding horizontal | 20px |
| Margin bottom | 20px |
| New thread button | `Plus` icon, 22px, `rgba(240, 237, 230, 0.45)`, flush right in header row |

---

### Pinned Threads Section

Two always-present threads at the top of the list. They are never below general threads. They are never removed.

#### Personal Thread ("Kin")

**Visual treatment:**

| Property | Value |
|----------|-------|
| Card background | `#141810` |
| Border radius | 18px |
| Padding | 16px |
| Margin bottom | 8px |
| Border | 1px `rgba(124, 184, 122, 0.12)` (green, personal) |
| Shadow color | `#7CB87A` |
| Shadow opacity | 0.05 |
| Shadow radius | 8px |

**Thread header row:**

| Element | Font | Size | Color |
|---------|------|------|-------|
| Thread icon | `Lock` icon, 14px | — | `rgba(124, 184, 122, 0.50)` |
| Thread title "Kin" | Instrument Serif Italic | 18px | `#F0EDE6` |
| Badge (unread count) | Geist Mono Regular, 10px | 10px | `#0C0F0A` on `#7CB87A` pill |
| Timestamp | Geist Mono Regular | 10px | `rgba(240, 237, 230, 0.25)` |

**Preview line:**

| Property | Value |
|----------|-------|
| Prefix | "Kin: " or "You: " |
| Font | Geist Regular, 13px, `rgba(240, 237, 230, 0.40)` |
| Truncation | 60 characters max |
| Line height | 19px |
| Margin top | 6px |

**Empty preview state:** No preview text — don't show "Start a conversation" or any placeholder. The thread exists; it's just quiet.

**Lock icon significance:** The lock differentiates Personal (private) from Household (shared). This visual cue is important — users need to know personal messages are only visible to them.

---

#### Household Thread ("Home" or "[Family Name]")

**Visual treatment:**

| Property | Value |
|----------|-------|
| Card background | `#131519` (very slightly blue-shifted from personal thread) |
| Border radius | 18px |
| Padding | 16px |
| Margin bottom | 8px |
| Border | 1px `rgba(122, 173, 206, 0.12)` (blue — partnership/coordination) |
| Shadow color | `#7AADCE` |
| Shadow opacity | 0.05 |
| Shadow radius | 8px |

The blue tint (vs. green for personal) distinguishes the household thread visually. Blue = coordination, shared, partnership.

**Thread header row:**

| Element | Font | Size | Color |
|---------|------|------|-------|
| Thread icon | `Globe` or `Users` icon, 14px | — | `rgba(122, 173, 206, 0.50)` |
| Thread title | Instrument Serif Italic | 18px | `#F0EDE6` |
| Title text | `family_name` from profile, or "Home" as fallback | — | — |
| Badge (unread count) | Geist Mono Regular, 10px | 10px | `#0C0F0A` on `#7AADCE` pill |
| Timestamp | Geist Mono Regular | 10px | `rgba(240, 237, 230, 0.25)` |

**Preview line:** Same spec as Personal thread.

---

#### Partner-Not-Linked State (Household Thread)

When the partner has not yet accepted an invite, the household thread card shows an invite prompt **in place of** the normal thread preview.

**Do not hide the household thread** when partner isn't linked — show it with the invite prompt inside.

| Element | Spec |
|---------|------|
| Prompt text | "The Home thread is shared with your partner. Once they join, you'll both see coordination decisions here — schedules, pickups, planning." |
| Prompt font | Geist Regular, 13px, `rgba(240, 237, 230, 0.45)` |
| CTA button | "Send partner invite" — primary green button, Geist SemiBold 14px, `#0C0F0A` text |
| CTA icon | `UserPlus`, 16px, `#0C0F0A` |
| CTA background | `#7CB87A` |
| CTA border radius | 12px |
| CTA padding | 10px vertical, 16px horizontal |
| CTA haptic | Medium impact |
| CTA action | Navigates to Settings → Family → Partner invite flow |

The prompt explains *why* the thread exists and *what* it's for. First-time users haven't established the household thread's purpose yet — this copy sets the expectation.

---

### General Threads Section

Threads created from ad-hoc conversations or Kin-initiated topic threads.

**Section header:**

| Property | Value |
|----------|-------|
| Text | "RECENT" |
| Font | Geist Mono Regular, 10px, `rgba(240, 237, 230, 0.20)`, uppercase, letterSpacing 1.5 |
| Padding horizontal | 20px |
| Margin bottom | 8px |
| Margin top | 4px |

**Thread row:**

| Property | Value |
|----------|-------|
| Background | transparent |
| Border bottom | 1px `rgba(240, 237, 230, 0.04)` |
| Padding | 14px horizontal, 12px vertical |
| Layout | Row: title + preview (left) + timestamp (right) |

**Thread row elements:**

| Element | Font | Size | Color |
|---------|------|------|-------|
| Title | Geist Regular | 14px | `rgba(240, 237, 230, 0.75)` |
| Preview | Geist Regular | 12px | `rgba(240, 237, 230, 0.35)` |
| Timestamp | Geist Mono Regular | 10px | `rgba(240, 237, 230, 0.25)` |

**Empty state (no general threads):** Render nothing below the pinned section. Do not show "No conversations yet."

**Loading state:** Display an `ActivityIndicator` in Geist Mono green (`#7CB87A`) while threads are loading. Remove once loaded. Per B13 — this state was missing in the initial build and must be added.

---

## 2. Conversation Detail View

### Navigation

**Back button:** `ChevronLeft` icon, 20px, `rgba(240, 237, 230, 0.45)` — appears top left. Tap returns to thread list. Haptic: Light impact.

**Thread title:** Instrument Serif Italic, 18px, `#F0EDE6`, centered in nav bar.

**Nav bar background:** `#0C0F0A` — flush with screen.

---

### Message List

| Property | Value |
|----------|-------|
| Container | `FlatList`, inverted (newest at bottom) |
| Background | `#0C0F0A` |
| Padding horizontal | 16px |
| `FloatingOrbs` | Visible behind messages |

#### User Message Bubble

| Property | Value |
|----------|-------|
| Background | `#1E2A1C` (dark green-tinted) |
| Border radius | 18px, bottom-right 4px (speech bubble shape) |
| Padding | 12px horizontal, 10px vertical |
| Max width | 80% of screen width |
| Alignment | right edge |
| Font | Geist Regular, 14px, `#F0EDE6` |
| Line height | 21px |

#### Kin Message

| Property | Value |
|----------|-------|
| Layout | Row: avatar orb (left) + bubble (right) |
| Avatar orb | 30×30px, border-radius 10px, `rgba(124, 184, 122, 0.12)`, `Sparkles` icon 14px `#7CB87A` |
| Bubble background | `#151B13` |
| Border radius | 18px, bottom-left 4px |
| Padding | 12px horizontal, 10px vertical |
| Max width | 80% of screen width |
| Font | Geist Regular, 14px, `rgba(240, 237, 230, 0.88)` |
| Line height | 21px |
| Gap (orb to bubble) | 8px |

#### Typing Indicator

Shown while Kin is generating a response.

| Property | Value |
|----------|-------|
| Layout | Same as Kin message row |
| Bubble content | 3 dots, same size as dots below, animated |
| Dot size | 5×5px, border-radius 2.5px, `rgba(124, 184, 122, 0.60)` |
| Animation | Opacity pulse: 0.30 → 1.0, 600ms per direction, loop |
| Label text | "Kin is thinking..." in Geist Regular, 12px, `rgba(240, 237, 230, 0.30)` |

---

### Input Bar

| Property | Value |
|----------|-------|
| Container background | `rgba(20, 24, 16, 0.95)` with blur |
| Position | Bottom of screen, above tab bar |
| Padding | 12px horizontal, 10px vertical |
| Safe area bottom | Respected |

**Text input:**

| Property | Value |
|----------|-------|
| Background | `#1A201A` |
| Border radius | 18px |
| Padding horizontal | 14px |
| Padding vertical | 10px |
| Font | Geist Regular, 14px, `rgba(240, 237, 230, 0.80)` |
| Placeholder text | "Message Kin…" |
| Placeholder color | `rgba(240, 237, 230, 0.25)` |
| Multiline | true |
| Max height | 100px |

**Send button:**

| Property | Value |
|----------|-------|
| Icon | `Send`, 18px |
| Color (active) | `#7CB87A` |
| Color (inactive, no text) | `rgba(240, 237, 230, 0.20)` |
| Size | 36×36px |
| Border radius | 10px |
| Background (active) | `rgba(124, 184, 122, 0.12)` |
| Haptic | Medium impact on send |

---

## 3. Thread Type Visual Distinction Summary

| Thread | Border color | Shadow | Icon | Feel |
|--------|-------------|--------|------|------|
| Personal (Kin) | Green `rgba(124, 184, 122, 0.12)` | Green glow | `Lock` | Private, warm |
| Household (Home) | Blue `rgba(122, 173, 206, 0.12)` | Blue glow | `Globe`/`Users` | Shared, coordinated |
| General threads | No border | No shadow | None | Secondary, chronological |

---

## 4. Spec Compliance Checklist (for QA)

- [ ] Two pinned threads always present (Personal + Household), always at top
- [ ] Personal thread: green border, Lock icon
- [ ] Household thread: blue border, Globe/Users icon
- [ ] Partner-not-linked: invite prompt inside household thread card (not empty state)
- [ ] General threads have loading state (`ActivityIndicator`) while fetching
- [ ] Thread list shows "RECENT" section header above general threads
- [ ] Conversation detail: back button, centered title, FlatList message list
- [ ] Kin messages: avatar orb + bubble
- [ ] User messages: right-aligned bubble
- [ ] Typing indicator present while Kin responds
- [ ] Prefill from Today screen alert tap opens personal thread with text in input
- [ ] No purple in any element
- [ ] No budget-related chip suggestions (B10 — P0-4)
