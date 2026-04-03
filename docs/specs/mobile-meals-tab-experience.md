# Spec: Mobile Meals Tab — Post-Setup Experience

**Filed by:** Product & Design Lead
**Date:** 2026-04-02
**Priority:** P1 — blocks mobile TestFlight milestone (Apr 28)
**Platform:** Mobile (Expo / React Native)
**Related tasks:** #10 (mobile API wiring), #11 (Expo Go physical test), #47 (meals.tsx brand)

---

## Problem

The mobile `meals.tsx` tab has a full setup wizard (dietary prefs, nutrition goals, store selection) that correctly saves to Supabase. When setup completes, the tab renders a `setupStep === "done"` state showing three action cards:

- **Weekly Meal Plan** → `// TODO: Navigate to meal plan generator`
- **Recipes** → `// TODO: Navigate to recipe browser`
- **Grocery List** → `// TODO: Navigate to grocery list`

All three buttons are visually correct but do nothing when tapped. The mobile meals experience stops dead after setup. A parent opening the app on their phone cannot access their meal plan, cannot see their grocery list, and cannot browse recipes.

The web app has a rich `/meals` experience with full meal plan display, grocery list, recipe modal, and star ratings — all backed by the `meal_plans` table (persisted in task #26). The mobile app needs to surface this same data.

---

## User Story

> As a parent using Kin on my phone, after completing meal setup, I want to see my household's current meal plan and grocery list so that I can reference it while shopping or cooking without opening a browser.

---

## Scope Decision

Two architectural options. **Recommendation: Option A (Display-only, pull from DB).**

### Option A: Meal Plan Viewer (Display from Supabase) ← Recommended for MVP

The mobile meals tab, in its "done" state, pulls the latest `meal_plans` row for the household from Supabase and renders a read-only, mobile-optimized view.

**What this requires:**
- A `MealPlanView` component that renders the existing `MealOptions` JSON schema from the `meal_plans` table
- Pull latest plan: `SELECT * FROM meal_plans WHERE profile_id = user.id ORDER BY created_at DESC LIMIT 1`
- Display selected meals by category (Breakfast, Lunch, Dinner, Snack)
- Display grocery list grouped by store or section
- "Generate new plan" CTA → calls `/api/meals` (same endpoint as web)
- No meal selection interaction on mobile for MVP (view-only; full selection is on web)

**What to skip for MVP (Phase 2):**
- Recipe modal on mobile
- Star ratings on mobile
- "Not for us" dismiss flow on mobile
- In-app grocery list check-off

### Option B: WebView Bridge

Embed the web `/meals` route in a WebView within the mobile tab. Shares all logic with web.

**Pros:** Instant feature parity.
**Cons:** Feels cheap, breaks native feel, keyboard handling issues, cannot use native haptics or navigation. Not recommended unless Option A is blocked.

---

## Screen Flow (Option A)

### State 1: Loading
```
[Spinner — #7CB87A ActivityIndicator]
"Loading your meal plan..."
```

### State 2: No Plan Generated Yet
```
┌─────────────────────────────────┐
│  🍽️  Nutrition & Meals          │
│                                 │
│  Your meal plan is waiting.     │
│                                 │
│  [  Generate this week's plan → ]│
│     (primary green CTA)         │
│                                 │
│  "Takes about 10 seconds"       │
│  (Geist, warm-white/40)         │
└─────────────────────────────────┘
```

### State 3: Generating
```
[Full-screen animated state — similar to web onboarding]
Sparkles icon + "Building your meal plan..."
Progress indicator (dots or pulsing)
```

### State 4: Plan Exists — Main View
```
┌─────────────────────────────────┐
│  🍽️  This Week                  │
│  [Shuffle]  [Last updated: Today]│
│─────────────────────────────────│
│  🌅 BREAKFAST                   │
│  · [Selected meal name]         │
│    23m · 480 kcal · 32g protein │
│  · [Alternative option]         │
│─────────────────────────────────│
│  🥗 LUNCH                       │
│  · [Selected meal]              │
│─────────────────────────────────│
│  🍽️  DINNER                     │
│  · [Selected meal]              │
│─────────────────────────────────│
│  [  View Grocery List  →  ]     │
│  ($[total] · [N] items)         │
└─────────────────────────────────┘
```

### State 5: Grocery List (bottom sheet or new screen)
- List organized by `section` (Produce, Protein, Dairy, etc.)
- Each item: name, quantity, estimated_cost
- "Organized for [Store]" header if stores are set
- Read-only for MVP; check-off is Phase 2

### Error State
If generation fails:
```
⚠️  Couldn't generate your plan
[Try again]
```

---

## Interactions

| Action | Response |
|--------|----------|
| Tap "Generate this week's plan" | Start generation → State 3 |
| Generation completes | Save to Supabase, show State 4 |
| Tap "View Grocery List" | Open bottom sheet with organized list |
| Pull to refresh | Reload latest plan from DB |
| Tap "Shuffle" | Cycle through alternate options locally (same as web behavior) |

---

## Data

- **Read:** `meal_plans` table — latest row for `profile_id`
- **Write:** POST `/api/meals` → response JSON written to `meal_plans`
- **Schema:** existing `MealOptions` type (shared between web/mobile via `packages/shared` if applicable)

---

## Design Notes

- Use existing brand tokens throughout: `#0C0F0A` background, `#1A1D17` cards, `#7CB87A` CTAs, `#F0EDE6` text
- Meal category headers: use amber for breakfast, blue (`#7AADCE`) for lunch, green for dinner (NOT purple — purple is not for mobile CTAs). Snack → rose (`#D4748A`).
- Numbers (calories, protein, cost) → Geist Mono
- Category labels → Geist-SemiBold
- Generating state animation should feel premium — not a loading spinner. Consider a pulsing `Sparkles` icon with copy that changes ("Thinking about your family...", "Picking the best options...", etc.)
- Touch targets: all interactive elements 44px minimum

---

## Acceptance Criteria

- [ ] After completing meal setup, mobile meals tab shows existing plan from Supabase (if one exists) instead of dead action cards
- [ ] "Generate plan" CTA hits `/api/meals` and saves result to `meal_plans` table
- [ ] Generated plan renders with selected meals by category
- [ ] "View Grocery List" opens a list organized by store/section
- [ ] Loading and error states implemented
- [ ] No purple (`#A07EC8`) anywhere in the component — use brand tokens only
- [ ] `tsc --noEmit` passes after implementation

---

## Out of Scope for This Task

- Recipe modal on mobile (Phase 2)
- Star ratings on mobile (Phase 2)
- Grocery list check-off (Phase 2)
- "Not for us" dismiss on mobile (Phase 2)

_— Product & Design Lead, 2026-04-02_
