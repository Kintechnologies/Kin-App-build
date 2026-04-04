# Silence State — Component Spec
**Version:** 1.0
**Author:** Product & Design
**Date:** 2026-04-03
**Status:** APPROVED — Lead Eng may build against this spec

---

## Overview

The silence state is what the Today screen shows when Kin has nothing to surface. This is a product moment, not an edge case. A day with nothing coordination-critical is a good day — the silence should communicate that.

**The silence must feel intentional, not empty.** The user should sense that Kin looked at their day and found nothing that needs attention — not that the app failed to load content.

---

## 1. Trigger Condition

Show the silence/clean-day state **only** when all of the following are true:
- Briefing load is complete (`briefingLoading === false`)
- No briefing content for today
- No active OPEN or ACKNOWLEDGED alerts
- No RESOLVED alerts still fading out
- No undismissed check-in cards
- First-use content is not being displayed

If any of the above layers has content, render that layer — never render the clean-day state alongside other cards.

---

## 2. Layout

| Property | Value |
|----------|-------|
| Position | Centered horizontally in the scrollable area |
| Padding top | 60px (clear the header) |
| Padding bottom | 40px |
| Alignment | `alignItems: "center"` |
| Background | Transparent (screen background `#0C0F0A` shows through) |

No card, no border, no container background. The text floats on the screen.

---

## 3. Content

**Primary line:**

> "Clean day — nothing to stay ahead of."

| Property | Value |
|----------|-------|
| Font | Instrument Serif Italic |
| Size | 17px |
| Color | `rgba(240, 237, 230, 0.22)` (very quiet — not screaming for attention) |
| Alignment | center |
| Line height | 24px |

Instrument Serif Italic is used here — even in silence, this is a human moment. Kin is telling you something, not failing to load.

The opacity of 0.22 is intentional: quiet but readable. It should be the *softest* text on the screen. Users who look will find it; users who don't need it won't be bothered by it.

---

## 4. Ambient Context (Optional Enhancement — Post-TestFlight)

After TestFlight, consider adding one or both of the following to the silence state. Do **not** build these for the initial TestFlight build.

**Option A — Ambient date/time**

Add a very faint current time below the clean-day line:

```
Clean day — nothing to stay ahead of.
2:14 PM
```

| Property | Value |
|----------|-------|
| Font | Geist Mono Regular |
| Size | 12px |
| Color | `rgba(240, 237, 230, 0.10)` |
| Margin top | 10px |

**Option B — Brand mark**

A faint Kin logotype or wordmark at very low opacity (0.06–0.08) centered on screen. This gives visual presence without competing with content when it arrives.

*Decision: Flag for Austin review before implementing Option A or B.*

---

## 5. What NOT to Render in Silence State

These are explicitly prohibited:

| ❌ Never show | Why |
|--------------|-----|
| Loading spinner | Silence is not loading |
| Blank white or blank dark screen | No ambient presence |
| "No content available" | Technical language — wrong register |
| "Come back later" | Dismissive |
| "Everything's under control" | Overly cheerful |
| Placeholder card with dashes | Looks broken |
| Any domain tab suggestion ("Try the Meals tab") | Domain tabs are retired |
| Error state UI | Silence is not an error |

---

## 6. FloatingOrbs Context

The `FloatingOrbs` ambient background component renders on the Today screen at all times — including during the silence state. This ensures the screen never looks completely dead even when no content cards are present.

The FloatingOrbs and the clean-day text together create the intended "calm, breathing surface" feel.

---

## 7. Motion

The clean-day state has no entrance animation of its own. It appears when the Today screen finishes loading and no other content is present. The FloatingOrbs provide all ambient motion.

---

## 8. Spec Compliance Checklist (for QA)

- [ ] Clean-day text renders only when all content layers are empty and loading is complete
- [ ] Text is Instrument Serif Italic, 17px, warm white at 0.22 opacity
- [ ] No card background, border, or container
- [ ] No loading spinner, error message, or placeholder
- [ ] FloatingOrbs are visible in silence state
- [ ] Text content: "Clean day — nothing to stay ahead of."
- [ ] No domain tab references or suggestions
