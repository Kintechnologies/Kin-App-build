# Check-in Card — Component Spec
**Version:** 1.0
**Author:** Product & Design
**Date:** 2026-04-03
**Status:** APPROVED — Lead Eng may build against this spec

---

## Overview

Check-in cards are Kin-initiated light-touch prompts on the Today screen. They are softer and lower-stakes than alert cards — gentle contextual nudges, not coordination demands. They open a conversation when tapped.

Max 2 per day. Never shown when a High-priority (OPEN) alert is active.

---

## 1. Dimensions & Layout

| Property | Value |
|----------|-------|
| Border radius | 16px |
| Padding | 14px all sides |
| Margin bottom | 8px |
| Background | `#141810` |
| Border | 1px `rgba(124, 184, 122, 0.08)` (very faint green) |
| Shadow | None |

Check-in cards intentionally have no shadow — they should feel lighter and less prominent than briefing and alert cards.

---

## 2. Internal Layout

Single horizontal row with three columns:

```
[ Kin orb ] [ Content column ] [ Dismiss button ]
```

Row alignment: `alignItems: "flex-start"`, gap 10px between columns.

### Kin Orb (left)

| Property | Value |
|----------|-------|
| Size | 28×28px |
| Border radius | 10px (squircle-adjacent) |
| Background | `rgba(124, 184, 122, 0.10)` |
| Icon | `Sparkles`, size 13px, `#7CB87A` |
| Alignment | centered in orb |
| Margin top | 1px (optical alignment with content cap height) |

The orb signals that this is a Kin-originated item, not user-generated content or a system notification.

### Content Column (center, flex: 1)

**Observation text** (main content)

| Property | Value |
|----------|-------|
| Font | Geist Regular |
| Size | 14px |
| Color | `rgba(240, 237, 230, 0.72)` |
| Line height | 21px |
| Margin bottom | 3px (when prompt present) |

**Prompt text** (optional — the invite to engage)

| Property | Value |
|----------|-------|
| Font | Geist Regular |
| Size | 13px |
| Color | `rgba(124, 184, 122, 0.55)` (muted green — conversational invite) |
| Line height | 18px |

Content format per §10 Check-in Card Structure: `[Observation] + [Optional prompt]`. The observation comes first — Kin never leads with a question.

### Dismiss Button (right)

| Property | Value |
|----------|-------|
| Icon | `X`, size 13px, `rgba(240, 237, 230, 0.25)` (very faint) |
| Container | 24×24px |
| Alignment | top of card, margin top 2px |
| Haptic | Light impact on press |
| Action | Marks card dismissed, removes from view |
| hitSlop | `{ top: 10, bottom: 10, left: 10, right: 10 }` |

The dismiss button is intentionally faint — it exists but doesn't compete with the content. Users who want to engage will tap the card; users who want to clear it will find the X.

---

## 3. Interactive States

**Tap (full card):** Opens Conversations screen (personal thread) with card content prefilled.
**Haptic:** Light impact on card press.
**Pressed visual:** `opacity: 0.90, scale: 0.99`.

**Dismiss tap:** Sets `dismissed: true` in `kin_check_ins` table. Card immediately vanishes from view (no animation — instant removal is the right feel; the card wasn't urgent).

---

## 4. Suppression Rules

Check-in cards render **only** when:
1. No OPEN coordination issue is active on Today screen
2. The card was created today (`check_in_date = today`)
3. The card has not been dismissed (`dismissed = false`)

Maximum rendered: 2 per day (enforced via `LIMIT 2` on query).

---

## 5. States

### Default (visible, not dismissed)

Normal rendering as described above.

### Dismissed

Card is hidden immediately. No fade animation — instant removal is intentional (the dismiss was the user's explicit choice).

### Empty (no check-ins today)

Render nothing. Never show an empty-state placeholder in the check-in section.

---

## 6. Motion

| Action | Behavior | Notes |
|--------|----------|-------|
| Card appear | No animation — renders as part of screen on load | Shares Today screen entrance animation |
| Card dismiss | Instant removal, no animation | Respect the user's decision without ceremony |
| Card tap | Pressed scale 0.99 + opacity 0.90 | Feedback for tappable surface |

---

## 7. Color Tokens

| Element | Token | Hex |
|---------|-------|-----|
| Card background | Surface | `#141810` |
| Orb background | Primary green 10% | `rgba(124, 184, 122, 0.10)` |
| Orb icon | Primary green | `#7CB87A` |
| Observation text | Warm white 72% | `rgba(240, 237, 230, 0.72)` |
| Prompt text | Primary green 55% | `rgba(124, 184, 122, 0.55)` |
| Dismiss icon | Warm white 25% | `rgba(240, 237, 230, 0.25)` |
| Card border | Primary green 8% | `rgba(124, 184, 122, 0.08)` |

---

## 8. Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Observation | Geist | 14px | Regular |
| Prompt | Geist | 13px | Regular |

Both elements use Geist (functional font) — check-ins are conversational but not as emotionally weighted as the briefing hook. They're a tap away from a conversation, not the conversation itself.

---

## 9. Spec Compliance Checklist (for QA)

- [ ] Max 2 check-in cards per day
- [ ] Check-ins hidden when any OPEN alert is active
- [ ] No check-in shown when all for the day are dismissed
- [ ] Dismiss persists to Supabase (`kin_check_ins.dismissed = true`)
- [ ] Tap opens Conversations / personal thread with content prefilled
- [ ] No prompt text when observation is standalone
- [ ] Observation uses Geist 14px warm white 72%, not Serif
- [ ] No purple in any element
