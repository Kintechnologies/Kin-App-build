# Spec: Meal Plan Data Persistence (FVM Critical Fix)

**Sprint task:** NEW — [PRODUCT] P1 — Meal plan lost on page refresh
**Priority:** P1 (FVM — First Value Moment protection)
**Platform:** Web (Next.js)
**Written by:** Product & Design Lead
**Date:** 2026-04-01

---

## Problem

The meal plan page (`/meals`) reads exclusively from `sessionStorage`:

```typescript
// apps/web/src/app/(dashboard)/meals/page.tsx
useEffect(() => {
  const stored = sessionStorage.getItem("mealOptions");
  if (stored) {
    const options: MealOptions = JSON.parse(stored);
    setMealOptions(options);
    ...
  }
}, []);
```

`sessionStorage` is tab-specific and cleared when:
- The user refreshes the page
- The browser tab is closed and reopened
- The user opens the app on a different device or browser

When this happens, the user lands on an empty state:
> "No meal options yet. Complete onboarding to get your personalized picks."

...even though they already completed onboarding. There is no path to recover their meal plan except re-running onboarding. The empty state message implies they need to re-onboard, which is confusing and demoralizing.

**This is a P1 issue.** The meal plan is the First Value Moment — the thing Kin promises. Losing it on a page refresh breaks the core product promise.

---

## Root Cause

The `/api/meals` route does return meal options, and these are stored in `sessionStorage` on the onboarding completion screen. However, the meal options are NOT persisted to the database — they exist only in memory/sessionStorage. If the user navigates away, the data is gone.

---

## Solution

Two-part fix:

### Part 1: Persist meal options to Supabase on generation

In `/api/meals/route.ts`, after generating the AI meal plan, store the result in a new `meal_plans` table (or an existing appropriate table).

**Proposed schema** (if no table exists yet):
```sql
CREATE TABLE meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  meal_options JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  week_start DATE -- the Monday of the week this plan is for
);
```

Or, if simpler and the data model supports it, store the `mealOptions` JSON blob in `onboarding_preferences` or `profiles` as a JSONB column. The key constraint is: **the meal plan must survive a page reload**.

### Part 2: Update meals page to fetch from DB as fallback

```typescript
useEffect(() => {
  async function loadMealOptions() {
    // 1. Try sessionStorage first (fast path)
    const stored = sessionStorage.getItem("mealOptions");
    if (stored) {
      const options: MealOptions = JSON.parse(stored);
      setMealOptions(options);
      setSelectedMeals(getDefaultSelection(options));
      return;
    }

    // 2. Fallback: fetch from Supabase
    setLoadingFromDb(true);
    const supabase = createClient();
    const { data: plan } = await supabase
      .from("meal_plans")
      .select("meal_options")
      .order("generated_at", { ascending: false })
      .limit(1)
      .single();

    if (plan?.meal_options) {
      setMealOptions(plan.meal_options as MealOptions);
      setSelectedMeals(getDefaultSelection(plan.meal_options as MealOptions));
      // Re-hydrate sessionStorage for next navigation
      sessionStorage.setItem("mealOptions", JSON.stringify(plan.meal_options));
    }
    setLoadingFromDb(false);
  }

  loadMealOptions();
}, []);
```

---

## User Flow

### Happy path (existing — no change)
1. User completes onboarding
2. Meal plan generated, stored in sessionStorage + Supabase
3. User lands on /meals, sees their plan immediately

### Recovery path (new)
1. User refreshes /meals (or re-opens tab)
2. sessionStorage is empty
3. Page shows loading indicator ("Fetching your meal plan...")
4. Supabase query returns stored plan
5. Page renders with their existing meal plan

### True empty state (no plan exists)
1. User has never completed onboarding (or DB has no record)
2. Page shows empty state with CTA: "Get your personalized meal plan → [Complete Setup]"
3. CTA links to `/onboarding` (not just a dead message)

---

## States

| State | What the user sees |
|-------|-------------------|
| **sessionStorage hit** | Instant render, no loading flash |
| **DB loading** | Subtle loading animation (existing dots pattern), message: "Fetching your meal plan..." |
| **DB hit** | Meal plan renders |
| **No plan in DB** | Empty state with CTA button: "Get your meal plan" → links to /onboarding |
| **DB error** | Empty state with: "Couldn't load your meal plan — try refreshing" |

---

## Also: Fix silent failure in onboarding

In `onboarding/page.tsx`, if the `/api/meals` call fails, the error is swallowed:

```typescript
} catch (err) {
  console.error("Failed to generate meal options:", err);
}
// ... user is still redirected to /dashboard
```

The user is sent to `/dashboard` with no meal plan and no explanation. This should show a user-facing error message:

```typescript
} catch (err) {
  console.error("Failed to generate meal options:", err);
  // Show toast or inline message: "We had trouble generating your meal plan.
  // You can get it from the Meals tab anytime."
  // Still redirect — don't block them — but tell them what happened.
}
```

---

## Acceptance Criteria

- [ ] Meal plan survives a page refresh on `/meals`
- [ ] Meal plan survives closing and reopening the browser tab
- [ ] When DB fallback is used, a subtle loading state is shown (not a jarring blank)
- [ ] Empty state when no plan exists shows a CTA that links to `/onboarding`
- [ ] Onboarding completion shows a user-facing message if meal generation fails
- [ ] No duplicate meal plan rows on re-generation (upsert by profile_id + week_start, or just keep latest)

---

## Design Notes

- Loading state: use existing "three dots" pulse pattern from the chat page
- Add a line like "Fetching your meal plan..." in `text-warm-white/40 text-sm` below the dots
- Empty state CTA: primary green button "Get your meal plan" — 44px height minimum
- No other visual changes to the meal plan page
