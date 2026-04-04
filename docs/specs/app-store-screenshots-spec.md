# App Store Screenshots — Spec
**Version:** 1.0
**Author:** Product & Design
**Date:** 2026-04-03
**Status:** DRAFT — Production screenshots needed 3–4 weeks before App Store submission
**Timeline:** TestFlight target April 18–19. App Store submission target: mid-May 2026. Screenshots needed by: late April 2026.

---

## Overview

Five required App Store screenshots plus a preview storyboard. These are the first thing a potential user sees before installing Kin. They must communicate the core value proposition — coordination intelligence — not feature tabs.

The visual bar for App Store screenshots is high. These must look like a premium product.

---

## 1. Screenshot Dimensions

**iPhone 6.9" display (required — highest priority)**

| Property | Value |
|----------|-------|
| Dimensions | 1320 × 2868px |
| Safe content area | 1320 × 2400px (leave 234px top/bottom for system chrome) |
| Format | PNG |
| Color profile | sRGB |

**iPhone 6.5" display (required)**

| Property | Value |
|----------|-------|
| Dimensions | 1242 × 2688px |

Screenshots should be designed at 6.9" and exported at both sizes. Compositionally they should work at both.

---

## 2. The Five Required Screenshots

### Screenshot 1 — The Hook (Today Screen, Morning)

**Purpose:** The first screenshot must capture the core product moment in one glance.

**Content:**
- Today screen fully loaded
- Morning briefing card visible with a compelling, specific coordination insight
- Example content: *"Morning. Your partner's 5pm runs long — pickup's yours. Practice ends at 6:30. Worth leaving by 5:45."*
- One OPEN alert card below the briefing: *"Your partner's 3pm just extended to 5 — you've got pickup."* (amber state, action affordance visible)
- Date header: "Austin" in Instrument Serif, a real weekday and date

**Caption bar** (below screenshot in listing):
- Line 1: "Always one step ahead" (Instrument Serif Italic, 28px)
- Line 2: "Kin sees what you'd miss" (Geist Regular, 16px, muted)

**Background treatment:** None — show full device frame with `#0C0F0A` background. The dark screen with FloatingOrbs ambient glow should be visible and distinctive.

---

### Screenshot 2 — The Intelligence (Today Screen, Detail)

**Purpose:** Show that Kin is smart, specific, and uses real family data.

**Content:**
- Today screen with a richer briefing card (2–3 sentences)
- Example: *"Morning. Back-to-back meetings until 3 — tight stretch. Practice ends at 5:30, and dinner needs to happen. Leave by 5:15 if you want a window."*
- Below briefing: a check-in card: *"Dinner's in 3 hours. You've got a clear window at 5."*
- Today's Schedule section visible below (once B11 is built)
- Header name shows a realistic family name

**Caption bar:**
- Line 1: "Kin does the math"
- Line 2: "So you don't have to hold it all in your head"

---

### Screenshot 3 — The Coordination (Alert State)

**Purpose:** Show the real-time coordination use case — this is the core defensible value.

**Content:**
- Today screen focused on an active OPEN alert
- Alert card in full OPEN state: amber border, bold content
- Example alert: *"Your partner's 6pm just moved to 7:30 — you've got pickup tonight."*
- Briefing card above, slightly scrolled (partially visible)
- Timestamp context visible in header (evening, e.g., 4:47 PM)

**Caption bar:**
- Line 1: "Real-time coordination"
- Line 2: "When things change, Kin catches it first"

---

### Screenshot 4 — The Conversation (Conversations Screen)

**Purpose:** Show depth — Kin is also a partner you can talk to.

**Content:**
- Conversation detail view (personal thread)
- A short, realistic back-and-forth:
  - User: "Can I skip the 5pm and still make pickup?"
  - Kin: "Practice ends at 6:15 and it's a 20-minute drive. If your 5pm runs even 15 minutes, you'll be cutting it close. Your partner's calendar is clear after 4:30 — worth a quick confirm."
  - User: "My partner can cover it"
  - Kin: "Got it. I've updated your afternoon — you're clear."
- Kin message uses avatar orb with Sparkles icon
- Thread title "Kin" visible in nav bar

**Caption bar:**
- Line 1: "Ask Kin anything"
- Line 2: "Your partner's schedule, your kids' pickups — it all connects"

---

### Screenshot 5 — The Clean Day (Silence State + Calm)

**Purpose:** Show that Kin is not noise. When there's nothing to do, it says so. This builds trust.

**Content:**
- Today screen in clean-day state
- Header: "Austin" in Instrument Serif, a quiet mid-week date
- Clean-day text: "Clean day — nothing to stay ahead of."
- FloatingOrbs visible in background — the screen breathes
- No cards, no alerts, intentionally spacious
- Tab bar visible at bottom

**Caption bar:**
- Line 1: "When it's quiet, it says so"
- Line 2: "No noise. Just what you need."

---

## 3. App Preview Video (Optional — Recommend for Launch)

A 15–30 second video demonstrating the core loop:

1. Today screen loads (skeleton → content)
2. Alert card appears (OPEN state, amber)
3. User taps alert → Conversations screen opens with prefill
4. Short exchange with Kin
5. Return to Today → alert moves to ACKNOWLEDGED state

**Production notes:**
- Use real device recording (not simulator)
- Background: `#0C0F0A` throughout
- FloatingOrbs ambient motion should be visible
- No voiceover — text only
- Music: none (App Store previews autoplay muted)

---

## 4. Caption Bar Design System

All screenshots should follow a consistent caption bar treatment:

| Property | Value |
|----------|-------|
| Caption area | Below screenshot, ~200px height |
| Background | `#0C0F0A` |
| Line 1 (hero claim) | Instrument Serif Italic, 28px, `#F0EDE6` |
| Line 2 (supporting) | Geist Regular, 16px, `rgba(240, 237, 230, 0.55)` |
| Horizontal padding | 32px |
| Vertical padding | 24px top, centered |

---

## 5. Production Checklist

Screenshots must be produced from **real device builds**, not simulated screen designs. The actual rendered UI must be used.

**Requirements before screenshot session:**
- [ ] TestFlight build running on physical iPhone (6 Pro or 6 Pro Max preferred)
- [ ] Seed data loaded: realistic family name, real-looking briefing content, staged alert in OPEN state
- [ ] B11 (Today's Schedule) built and visible
- [ ] B10 (budget chips removed from Conversations) resolved
- [ ] All brand colors correct (no purple anywhere)
- [ ] Typography rendering correctly (Instrument Serif Italic loading)
- [ ] FloatingOrbs animation running

**After screenshots captured:**
- [ ] Export at both iPhone 6.9" and 6.5" dimensions
- [ ] Review each for personal data (don't ship real user data in screenshots)
- [ ] Confirm caption bars render correctly

---

## 6. What NOT to Show in Screenshots

| ❌ Never show | Why |
|--------------|-----|
| Domain tabs (meals, budget, fitness, family) | Retired architecture — sets wrong expectations |
| Any purple (`#A07EC8`) | Out of brand |
| Empty or loading states | Shows a weak product moment |
| Generic AI assistant UI | Kin is a coordination engine, not a chatbot |
| "Set up your account" or onboarding flows | Show the product at its best |
| Multiple messages from Kin in one screenshot without user turns | Makes it look one-sided |
