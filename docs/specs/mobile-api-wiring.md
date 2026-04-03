# Spec: Mobile App — Wire API Calls to Web Backend (#10)

**Filed by:** Product & Design Lead
**Date:** 2026-04-02
**Sprint task:** #10 — Mobile app: wire API calls to web backend
**Priority:** P1
**Est:** 4h
**Owner:** Lead Eng

---

## Context

The mobile app was built alongside the web app but uses a mix of real Supabase calls (budget, auth, profiles) and missing/stub data (meals on home screen, today's meals card). Task #10 closes the gap so mobile reflects real data from the shared backend.

The mobile API client (`apps/mobile/lib/api.ts`) already exists with `generateMealPlan`, `chat`, and budget methods wired to the web backend. Most work is plugging existing methods into UI components that currently default to empty data.

---

## Audit of Current Mobile Data State

| Screen | Data Source | Status |
|--------|-------------|--------|
| Home (`index.tsx`) | `profiles`, `onboarding_preferences`, `conversations`, `household_income` | ✅ Real — all Supabase calls |
| Home — Budget card | hardcoded `budgetSpent: 0` | ❌ **MISSING** — always shows $0 |
| Home — Today's Meals | hardcoded `todaysMeals: []` | ❌ **MISSING** — meals section empty |
| Chat (`chat.tsx`) | `api.chat()` → web backend | ✅ Real |
| Budget (`budget.tsx`) | Supabase `transactions`, `household_income`, `budget_categories` | ✅ Real |
| Meals (`meals.tsx`) | `api.generateMealPlan()` + Supabase `meal_plans` | ✅ Real (shipped #48) |
| Settings (`settings.tsx`) | Supabase `profiles` | ✅ Real |

---

## User Story

> As a parent checking the Kin home screen, I want to see today's real spending and meal plan at a glance, so that I don't have to navigate to separate tabs to know the status of my household.

---

## What Needs to Be Built

### 1. Home Screen: Real Budget Spent (`budgetSpent`)

**Current behavior:** `budgetSpent: 0` hardcoded in `loadAll()` at line 198.

**Target behavior:** Show the sum of transactions for the current calendar month from the `transactions` table.

**Implementation:**

Add to the `Promise.all` in `loadAll()`:
```ts
supabase
  .from("transactions")
  .select("amount")
  .eq("profile_id", user.id)
  .gte("date", startOfMonth)  // first day of current month ISO string
  .lte("date", endOfMonth)    // last day of current month ISO string
```
Sum the `amount` values and set as `budgetSpent`.

Helper: derive `startOfMonth` and `endOfMonth` from `new Date()` — same pattern already used in `budget.tsx`.

**Display logic** (no UI change needed — already renders correctly):
```
${budgetSpent.toLocaleString()} of ${budgetTotal.toLocaleString()}/mo
```
When `budgetTotal === 0` and `budgetSpent === 0`, continue showing the "Set up budget →" CTA (no change needed).

---

### 2. Home Screen: Today's Meals Snippet

**Current behavior:** `todaysMeals: []` hardcoded — the "Today's Meals" section shows no data.

**Target behavior:** Pull the most recent saved meal plan from Supabase `meal_plans` and display the 3 dinner options (or the first meal category) as a teaser — enough to remind the parent what's for dinner tonight.

**Implementation:**

Add to the `Promise.all` in `loadAll()`:
```ts
supabase
  .from("meal_plans")
  .select("meal_options")
  .eq("profile_id", user.id)
  .order("created_at", { ascending: false })
  .limit(1)
  .single()
```

Parse `meal_options` — look for `category === "Dinner"` entries. Return the first 1-2 meal names.

**UI update (home screen `index.tsx`):**

Replace the empty/stub meals section with:
- If `todaysMeals.length > 0`: Show dinner option names in warm-white/80 text, small — e.g. "Lemon herb salmon · Chicken stir-fry"
- If `todaysMeals.length === 0`: Keep the existing "Get your meal plan →" CTA

**Type update:** Change `todaysMeals: string[]` (meal names only — no need for full MealOption objects on home screen).

---

## Screen Flow

1. App opens → home screen renders with skeleton/loading state
2. `loadAll()` fires — parallel Supabase calls for all data including transactions sum + latest meal plan
3. Budget card shows real spent/total
4. Meals card shows dinner options or CTA
5. Pull-to-refresh fires `onRefresh()` which calls `loadAll()` again — already implemented

---

## States

| State | Budget Card | Meals Card |
|-------|-------------|------------|
| Loading | Show existing skeleton | Show existing skeleton |
| No income set | "$0 of $0/mo" → show "Set budget →" CTA | unchanged |
| Income set, no transactions | "$0 of $2,000/mo" | unchanged |
| Income set, has transactions | "$847 of $2,000/mo" | unchanged |
| Has meal plan | unchanged | "Lemon herb salmon · Chicken stir-fry" |
| No meal plan | unchanged | "Get your meal plan →" CTA |
| API error | Fail silently, show $0 (non-blocking) | Fail silently, show CTA |

---

## Data Requirements

| Field | Source | Notes |
|-------|--------|-------|
| `budgetSpent` | `transactions` table, `amount` column, current month | Filter by `profile_id` + date range |
| `budgetTotal` | `household_income.monthly_income` | Already fetched |
| `todaysMeals` | `meal_plans.meal_options`, latest row | Filter `category === "Dinner"`, take first 2 names |

---

## Acceptance Criteria

- [ ] Home screen budget card shows real monthly spent (not $0) when transactions exist
- [ ] Home screen budget card shows $0 correctly when no transactions logged
- [ ] Home screen meals section shows dinner option names when a meal plan exists
- [ ] Home screen meals section shows "Get your meal plan →" CTA when no plan exists
- [ ] Pull-to-refresh updates both budget spent and meal plan data
- [ ] No loading spinner on the home screen — data loads silently (skeleton → content)
- [ ] Errors from transactions/meal_plans queries are non-fatal — degrade to $0 / CTA
- [ ] No regression to other home screen data (greeting, chat snippet, onboarding progress)
- [ ] `tsc --noEmit` → 0 errors after changes
