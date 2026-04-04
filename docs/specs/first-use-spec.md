# First-Use Emotional Moment — Component Spec
**Version:** 1.0
**Author:** Product & Design
**Date:** 2026-04-03
**Status:** APPROVED — Lead Eng may build against this spec
**Reference:** Intelligence Engine §21

---

## Overview

The first-use moment is a one-time event: the first time a user opens the Today screen after completing onboarding. It is an audition. The user is deciding in that moment whether Kin is worth keeping.

The goal is one specific feeling: **"This is already helping me think less."**

This spec defines the visual container. Intelligence Engineer owns the content generation logic — see `docs/prompts/first-use-prompt.md`.

---

## 1. When It Fires

**Trigger:** `profiles.today_screen_first_opened IS NULL` at the time the Today screen renders.

**One-time:** Immediately after detection, set `today_screen_first_opened = now()`. The first-use content never fires again.

**Timing rules (from §21):**
- If onboarding completes after 6pm → first-use content shows on first Today screen open, but the full engineered briefing may wait until the next morning briefing.
- If onboarding completes before noon → first-use content fires same-day.
- Never delay past 24 hours. Use onboarding fallback if data is thin.

---

## 2. Visual Container

The first-use moment reuses the **briefing card container**. It is not a separate component. This is intentional — on day one, the first-use card *is* the morning briefing. The user should experience it as Kin speaking to them, not as a welcome screen.

**Container specs:** Identical to `briefing-card-spec.md`:

| Property | Value |
|----------|-------|
| Background | `#141810` |
| Border radius | 20px |
| Padding | 20px |
| Border | 1px `rgba(124, 184, 122, 0.18)` |
| Shadow color | `#7CB87A` |
| Shadow opacity | 0.06 |
| Shadow radius | 12px |

---

## 3. Header Row

| Element | Spec |
|---------|------|
| Icon | `Sparkles`, 14px, `#7CB87A` |
| Title text | "Hey" (not "Morning" — this is a first meeting) |
| Title font | Instrument Serif Italic, 18px, `#7CB87A` |
| No live pill | The "Today" live pill is omitted — this is not a daily briefing |

---

## 4. Content Structure

Three structural elements, rendered in order:

### Hook (Required)

A brief acknowledgment that Kin has oriented itself to this specific family — then immediately the primary insight.

| Property | Value |
|----------|-------|
| Font | Instrument Serif Italic |
| Size | 18px |
| Color | `#F0EDE6` |
| Line height | 26px |
| Margin bottom | 10px |

**Content rule:** Must not use setup language like "Based on what you've told me..." or "I've reviewed your calendar and..." — Kin just speaks, as if it already knows.

**Examples of correct opening:**
- "Got your week." (data available)
- "Got you and [Partner Name] set up." (partner linked)

**Examples of incorrect opening (never):**
- "Welcome to Kin!"
- "Thanks for completing onboarding."
- "I've connected to your calendar and I'm getting oriented." *(current implementation — see deviation note below)*

### Primary Insight (Required)

The specific coordination or schedule insight Kin has found. Implication-led. If data is thin, use the onboarding fallback sequence (§13).

| Property | Value |
|----------|-------|
| Font | Instrument Serif Italic |
| Size | 18px |
| Color | `#F0EDE6` |
| Continuation of hook | No visual break between hook and insight — they're one block |

### Closing Relief Line (Required)

One sentence that signals Kin is on it. The user no longer has to hold this in their head.

| Property | Value |
|----------|-------|
| Font | Geist Regular |
| Size | 13px |
| Color | `rgba(240, 237, 230, 0.40)` |
| Font style | Italic |
| Margin top | 10px |
| Line height | 20px |

**Approved closing phrases (per §21):**
- "I'll remind you when it's time to leave."
- "I'll flag it in the morning so you're not caught off guard."
- "I'll keep an eye on it." *(acceptable but generic — use specific form when possible)*
- "I'll flag it if anything changes." *(preferred — per SPRINT B12)*

**Closing phrases that are NOT approved:**
- "I'll let you know if anything changes." *(current implementation — per SPRINT B12 this must be corrected)*
- "I'm here if you need me." *(too passive)*
- "Let me know if you have any questions." *(too assistant-y)*

---

## 5. Entrance Animation

The first-use card uses a **slower, more deliberate entrance** than the standard Today screen:

| Property | Value |
|----------|-------|
| Type | Parallel fade + slide up |
| Duration | 400ms (vs. 420ms for standard content — intentionally similar, slightly unhurried) |
| Easing | ease-in |
| Initial opacity | 0 → 1 |
| Initial translateY | 16px → 0px |
| useNativeDriver | true |

The 400ms ease-in is intentional per §21: "deliberate, unhurried." The user should sense this moment is meaningful, not loading.

---

## 6. Position on Screen

The first-use card renders in the **same position as the morning briefing card** — at the top of the scrollable content area, immediately below the header. It takes the place of the briefing card on day one.

If a real briefing exists for today AND the first-use flag fires (edge case: user opened the app and a briefing was already generated), display the **real briefing** instead and skip the first-use card. The real briefing is always higher quality than the fallback first-use content.

---

## 7. Deviation Note — Current Implementation

> **⚠️ SPEC DEVIATION (P1 — must fix before TestFlight)**

Current `index.tsx` (line 491–492) uses this static first-use content:
> *"Good to meet you. I've connected to your calendar and I'm getting oriented. I'll flag anything that needs your attention and stay quiet when things look clear."*

This violates §21 in two ways:
1. "I've connected to your calendar and I'm getting oriented" is setup language — it tells the user *what Kin is doing*, not *what Kin found*. This is disqualifying on day one.
2. The content is not specific to the user's life. It makes no reference to their family, their schedule, or any data from onboarding.

**Required fix:** The first-use content must be **dynamically generated** via the Intelligence Engineer's first-use prompt (`docs/prompts/first-use-prompt.md`). The static fallback above must be replaced with a call to the same endpoint that generates the morning briefing, with a first-use flag that triggers §21 content rules.

If the prompt isn't ready yet: the minimum acceptable static fallback (until prompt is wired) is:
> *"Got your week. I'll flag anything that needs your attention and stay quiet when things look clear. I'll flag it if anything changes."*

This is still generic but at least doesn't narrate Kin's own state ("I'm getting oriented").

**Closing line fix** (also required, per SPRINT B12): Change "I'll keep an eye on it and flag anything that changes." → "I'll flag it if anything changes."

---

## 8. Relationship to Morning Briefing

| Dimension | First-Use Card | Morning Briefing Card |
|-----------|---------------|----------------------|
| Fires | Once, day one | Daily |
| Header title | "Hey" | "Morning" |
| Live pill | No | Yes ("TODAY") |
| Entrance | 400ms ease-in | 420ms (standard) |
| Closing line | Relief + "I'll flag it" | No closing line |
| Content source | First-use prompt (§21, §13 fallback) | Briefing endpoint |

---

## 9. Spec Compliance Checklist (for QA)

- [ ] First-use card fires once, marked in `profiles.today_screen_first_opened`
- [ ] Visual container matches briefing card (same background, border, shadow)
- [ ] Header title is "Hey", not "Morning"
- [ ] No "Today" live pill
- [ ] Content is specific to user's life (not generic "I've connected to your calendar")
- [ ] Closing line: "I'll flag it if anything changes." (not "let you know")
- [ ] 400ms ease-in entrance animation
- [ ] Real briefing supersedes first-use card if both are present
- [ ] Instrumentation: `today_screen_first_opened` set to `now()` on first render
