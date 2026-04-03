# Spec: Onboarding → First Value Moment — Test Plan

**Filed by:** Product & Design Lead
**Date:** 2026-04-02
**Priority:** P1 — The First Value Moment is the most important flow in the product. Any friction that delays or degrades it is P0.
**Related task:** #6 (Verify onboarding → meal plan flow e2e on web)
**Platform:** Web (kinai.family)

---

## What We're Testing

The First Value Moment (FVM) is the moment a new user — a tired parent at the end of a long day — completes onboarding and receives a personalized meal plan. Everything up to that moment is overhead. The meal plan is the payoff.

This test plan covers the full path from account creation through to a rendered, personalized meal plan.

---

## Prerequisites

- Web app deployed to Vercel (Task #1)
- Supabase migrations 011 and 012 applied
- Anthropic API key set in Vercel env
- Test account available (new, never completed onboarding)

---

## Step-by-Step Test Plan

### Stage 1: Account Creation

| Step | Action | Expected |
|------|--------|----------|
| 1.1 | Visit kinai.family/signup | Page loads, background #0C0F0A, Kin wordmark in Instrument Serif Italic |
| 1.2 | Enter email + password | Input fields accept input, no layout shifts |
| 1.3 | Click "Create account" | Loading state visible on button |
| 1.4 | Email confirmation flow | User receives email (if confirmation ON) OR proceeds directly (if OFF) |
| 1.5 | Auth confirmed | Redirected to `/onboarding` (NOT `/dashboard`) |

**Failure mode to verify:** If email confirmation is ON and user clicks the confirm link from a different device, the invite code in the URL is preserved through the callback route. (See #36.)

---

### Stage 2: Onboarding (8 steps)

**Overall check:** The progress bar should count up correctly. Single-parent: 7 steps total. Two-parent: 8 steps total. The counter and bar must stay in sync.

| Step | Screen | Key Checks |
|------|--------|-----------|
| 2.1 | Family Name | Accepts text, required field, continue disabled until filled |
| 2.2 | Household Type | Single or couple. Selecting "solo parent" should reduce total step count |
| 2.3 | Kids | Adding kids: name, age, school. At least one kid. Can skip to "no kids" |
| 2.4 | Dietary Preferences | Multi-select pills. None selected = valid. Pills have correct amber/green color, no purple |
| 2.5 | Nutrition Goals | Radio-style selection. Pre-selections from prior steps carry over |
| 2.6 | Grocery Stores | Multi-select stores. At least one should be recommended based on location |
| 2.7 | Foods Loved / Avoided | Free text or chips. Optional |
| 2.8 | Partner Invite (if two-parent) | Invite input. "Skip for now" available |

**Brand checks throughout:**
- Background: #0C0F0A (not pure black)
- Primary text: #F0EDE6 (not white)
- CTA buttons: #7CB87A primary green
- Progress bar fill: primary green
- Progress counter: Geist, warm-white/40
- Section headlines: Instrument Serif Italic
- No purple anywhere

---

### Stage 3: Meal Plan Generation (the FVM)

| Step | Action | Expected |
|------|--------|----------|
| 3.1 | Complete final onboarding step | "Generating your meal plan..." loading state appears |
| 3.2 | Loading state | Progress animation visible, cycling messages ("Crafting your grocery list...", etc.) — not a blank screen |
| 3.3 | Generation succeeds | Meal plan appears with breakfast, lunch, dinner, snack categories |
| 3.4 | Meal plan is personalized | Names match dietary restrictions chosen in step 2.4. Vegetarian = no meat. Nut allergy = no nuts. |
| 3.5 | Generation fails | Amber inline banner: "We had trouble — get your meal plan from the Meals tab anytime." User still proceeds |
| 3.6 | Redirect after generation | User routed to `/dashboard`, NOT `/meals` |

**FVM quality bar:** The meal plan should feel like it was made for this specific family. "Chicken breast with quinoa and steamed broccoli" is fine but not exciting. "Tuesday: Sheet Pan Harissa Chicken with roasted chickpeas (35 min, 490 cal)" sets the right tone. The AI prompt quality matters here.

---

### Stage 4: Dashboard First Visit

| Step | Action | Expected |
|------|--------|----------|
| 4.1 | Land on /dashboard | Personalized greeting: "Good evening, [First Name]" in Instrument Serif Italic |
| 4.2 | "Today's Meals" card | Visible, links to /meals |
| 4.3 | "Budget Snapshot" card | Visible, links to /budget |
| 4.4 | "Ask Kin" card | Visible, links to /chat |
| 4.5 | "This Week" card | Visible, links to /calendar — blue icon, NOT purple |
| 4.6 | Tip strip at bottom | Shows "Ask Kin to plan date night..." in primary green, not amber |
| 4.7 | No loading spinners on arrival | Name resolves within ~500ms; greeting may briefly show without name (acceptable) |

---

### Stage 5: Meals Page (the FVM Delivery)

| Step | Action | Expected |
|------|--------|----------|
| 5.1 | Navigate to /meals | Loads meal plan from DB (not regenerated) |
| 5.2 | Breakfast section | Amber accent, meals listed with prep time + calories in Geist Mono |
| 5.3 | Lunch section | Blue accent |
| 5.4 | Dinner section | **Must NOT be purple** — should be blue or green |
| 5.5 | Snack section | Rose accent |
| 5.6 | Click a meal | Selection state highlights the card |
| 5.7 | Click recipe icon | Recipe modal slides up with recipe text |
| 5.8 | Grocery list | CTA visible, tapping opens grocery items grouped by store |
| 5.9 | Page refresh | Meal plan still renders (persisted to DB in migration 011) |

---

### Stage 6: Return Visit (persistence check)

| Step | Action | Expected |
|------|--------|----------|
| 6.1 | Sign out and sign back in | Session restored |
| 6.2 | Navigate to /meals | Previous meal plan still shows (not regenerated) |
| 6.3 | "Regenerate" CTA | Clicking triggers a new generation |

---

## Red Flags — Automatic Fail

These are deal-breakers. If any of these occur, the FVM is not ready for beta:

- ❌ Blank screen at any point during onboarding (no loading state)
- ❌ "Good morning, Parent" greeting after completing onboarding (name not saved)
- ❌ Meal plan regenerated on every page visit (DB persistence not working)
- ❌ Meal plan lost on refresh (migration 011 not applied or not working)
- ❌ Purple anywhere on the meals page (brand violation)
- ❌ Grocery list shows items with "null" or "undefined"
- ❌ Network error during meal generation → blank screen with no message
- ❌ Onboarding progress bar shows wrong step count (e.g., "Step 7 of 8" for a solo parent)

---

## Acceptance Criteria

- [ ] Full onboarding → meal plan → dashboard flow completes without errors
- [ ] Personalized greeting uses correct first name
- [ ] Meal plan reflects dietary preferences set in onboarding
- [ ] Meal plan persists across page refreshes and sign-out/sign-in
- [ ] Loading state visible during meal plan generation
- [ ] Error state visible if generation fails (amber banner, not blank)
- [ ] All screens match brand guide (no purple, correct fonts, correct background)
- [ ] Flow works for both "solo parent" (7 steps) and "two-parent" (8 steps) configurations

---

## Notes for Lead Eng

After completing this test plan, document any failures in the sprint board with `[QA BUG]` tags. The FVM is the product promise — it must be flawless before beta opens.

The Dinner category on `/meals` web page uses `purple` (task #54 in sprint board). Before running this test plan, verify if #54 has shipped. If not, the dinner section will fail the brand check at Step 5.4.

---

_— Product & Design Lead, 2026-04-02_
