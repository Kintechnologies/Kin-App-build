# Alert Card — Component Spec
**Version:** 1.1
**Author:** Product & Design
**Date:** 2026-04-04 (updated from v1.0, 2026-04-03)
**Status:** APPROVED — Lead Eng may build against this spec

---

## Overview

Alert cards surface real-time coordination issues on the Today screen. They have three distinct visual states — OPEN, ACKNOWLEDGED, and RESOLVED — each with different visual weight and motion behavior. The state progression must feel deliberate, not accidental.

One rule governs everything: **one OPEN alert is visible at a time**. Others wait in queue.

---

## 1. State: OPEN

This is the highest-priority surface on the Today screen. It demands attention but does not panic. Bold, present, actionable.

### Container

| Property | Value |
|----------|-------|
| Background | `#161C14` |
| Border radius | 18px |
| Padding | 16px all sides |
| Margin bottom | 10px |
| Border | 1px `rgba(212, 168, 67, 0.25)` (amber — attention, not alarm) |
| Shadow color | `#D4A843` |
| Shadow offset | `{ width: 0, height: 2 }` |
| Shadow opacity | 0.08 |
| Shadow radius | 10px |
| Elevation (Android) | 3 |

The amber border and shadow distinguish alert cards from the briefing card (green) and check-in cards (green, dimmer). Amber = needs attention. Not red — Kin is confident but not alarming.

### Header Row (top of card)

Left to right: amber dot, spacer (flex: 1), dismiss button (flush right). No text label.

**Design decision (P2-3, resolved 2026-04-03):** The original design included a "HEADS UP" text label. This was removed — "Heads up" violates §8 tone rules (disallowed opener). The amber dot alone carries the urgency signal. No label is the approved final state.

**Alert dot**

| Property | Value |
|----------|-------|
| Size | 7×7px circle, border-radius 3.5px |
| Color | `#D4A843` (amber) |

**Dismiss button (X)**

| Property | Value |
|----------|-------|
| Icon | `X`, size 14px, `rgba(240, 237, 230, 0.40)` |
| Tap target | 28×28px container + `hitSlop: { top: 10, bottom: 10, left: 10, right: 10 }` |
| Haptic | Light impact on press |
| Action | Transitions card from OPEN → ACKNOWLEDGED |

Header row margin bottom: 10px.

### Content Text

| Property | Value |
|----------|-------|
| Font | Geist SemiBold |
| Size | 15px |
| Color | `#F0EDE6` (warm white) |
| Line height | 22px |
| Margin bottom | 12px |
| Format | One sentence: `[What changed] — [Implication]` |

SemiBold weight is intentional — this is the heaviest text weight used in the product, reserved for OPEN alerts. The extra weight signals urgency without relying on color alone.

### Footer CTA

| Property | Value |
|----------|-------|
| Icon | `MessageCircle`, size 12px, `rgba(124, 184, 122, 0.60)` |
| Text | "Tap to talk to Kin about this" |
| Font | Geist Regular, 12px, `rgba(124, 184, 122, 0.50)` |
| Gap | 5px |
| Layout | Row, aligned center |

The green CTA uses primary green to invite action without competing with the amber "attention" signal above.

### Interactive States

**Tap (full card):** Opens Conversations screen with alert content prefilled in personal thread.
**Haptic:** Medium impact on card press.
**Pressed state:** `opacity: 0.90, scale: 0.99` — subtle physical feedback.

---

## 2. State: ACKNOWLEDGED

The user has seen the issue. It's still unresolved, but they know. Visual weight drops significantly — this card moves to the background. It should not demand re-attention.

### Container

| Property | Value |
|----------|-------|
| Background | `#111410` |
| Border radius | 16px |
| Padding | 14px all sides |
| Margin bottom | 8px |
| Border | 1px `rgba(240, 237, 230, 0.04)` (barely visible edge) |
| Shadow | None |

### Content Text

| Property | Value |
|----------|-------|
| Font | Geist Regular |
| Size | 13px |
| Color | `rgba(240, 237, 230, 0.25)` (heavily muted) |
| Line height | 20px |
| numberOfLines | 2 (truncate if long) |

No header row, no CTA, no dismiss button. The content is readable but not demanding. The user acknowledged it — Kin doesn't repeat itself.

### No interactive action

ACKNOWLEDGED cards are not tappable. They are purely informational — the user already knows. If they want to discuss, they can open Conversations directly.

---

## 3. State: RESOLVED

The issue has been handled. Kin confirms this with one quiet closure line, then the card disappears.

### Container

| Property | Value |
|----------|-------|
| Layout | Row (inline) |
| Padding horizontal | 14px |
| Padding vertical | 10px |
| Margin bottom | 8px |
| Background | None (transparent) |
| Border | None |

No card background — the RESOLVED state deliberately fades into the screen surface, signaling completion rather than persistence.

### Content

**Icon:** `CheckCircle`, size 14px, `rgba(124, 184, 122, 0.50)` — green, half-opacity. Done but not celebratory.

**Text:** Closure line — one sentence confirming resolution.

| Property | Value |
|----------|-------|
| Font | Geist Regular |
| Size | 13px |
| Color | `rgba(124, 184, 122, 0.40)` (green, quiet) |
| Font style | Italic |
| Gap from icon | 8px |

**Default closure text:** "Sorted. I'll flag it if anything changes."

Closure text matches implementation (resolved 2026-04-04). Dynamic closure wording per §24 — specific to resolution type — is a Layer 2 enhancement; static fallback is accepted for v0 TestFlight.

### RESOLVED Motion

| Phase | Duration | Easing | Notes |
|-------|----------|--------|-------|
| Display | 1400ms | — | Hold resolved state visible; user reads closure line |
| Fade out | 600ms | ease-out | Animate opacity to 0, then unmount |

**Total visible duration:** ~2000ms before card disappears.

**Implementation note (accepted):** Original motion spec called for 300ms ease-in + 1500ms hold + 250ms fade. The built implementation uses 1400ms hold + 600ms fade-out. The slower fade (600ms vs 250ms) produces a softer exit — this is a deliberate quality-of-feel improvement from the original spec. Accepted as final. Total duration difference is ~50ms, imperceptible to users. No fix needed.

Use `setTimeout(1400, () => Animated.timing(opacity, { toValue: 0, duration: 600 }).start())`. Unmount after animation completes.

---

## 4. State Transitions

| From | To | Trigger | Visual |
|------|----|---------|--------|
| OPEN | ACKNOWLEDGED | User taps dismiss (X) OR taps full card (navigates to chat) | Instant — card re-renders in ACKNOWLEDGED style |
| ACKNOWLEDGED | RESOLVED | Calendar change eliminates conflict, user confirms in chat, or event window passes | 300ms appear in RESOLVED state, then 1500ms hold, then 250ms fade |
| OPEN | RESOLVED | Direct resolution (calendar change, time window passes) | Same RESOLVED motion, skip ACKNOWLEDGED |

Transitions write to Supabase immediately — state persists across app restarts.

---

## 5. Queuing Rule

One OPEN alert is visible at a time. If multiple OPEN issues exist:
- Show only the most recently surfaced (index 0 after sort by `surfaced_at DESC`)
- Others remain in state OPEN but are not rendered
- When the visible OPEN alert becomes ACKNOWLEDGED, the next OPEN issue in queue becomes visible

This prevents alert overload and keeps the Today screen calm.

---

## 6. Color Token Summary

| State | Border | Text | Icon | Background |
|-------|--------|------|------|------------|
| OPEN | `rgba(212, 168, 67, 0.25)` amber | `#F0EDE6` warm white | `#D4A843` amber dot | `#161C14` |
| ACKNOWLEDGED | `rgba(240, 237, 230, 0.04)` barely-there | `rgba(240, 237, 230, 0.25)` muted | — | `#111410` |
| RESOLVED | none | `rgba(124, 184, 122, 0.40)` green quiet | `rgba(124, 184, 122, 0.50)` green | transparent |

---

## 7. Spec Compliance Checklist (for QA)

- [ ] OPEN state: amber border, Geist SemiBold content, amber dot (no label), dismiss button, CTA footer
- [ ] ACKNOWLEDGED state: no shadow, muted text (0.25 opacity), no dismiss, not tappable
- [ ] RESOLVED state: transparent background, green italic text, CheckCircle icon
- [ ] RESOLVED auto-fades within ~2 seconds of appearing (1400ms hold + 600ms fade)
- [ ] Only 1 OPEN alert visible at a time
- [ ] OPEN → ACKNOWLEDGED transition persists to Supabase immediately
- [ ] No purple in any alert state
- [ ] Closure text: "Sorted. I'll flag it if anything changes."
