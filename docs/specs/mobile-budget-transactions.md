# Spec: Mobile Budget — Transaction Fetch & Add Transaction Flow

**Sprint tasks:** #19 (fetch real transaction data), #20 (Add Transaction flow)
**Priority:** P1
**Platform:** Mobile (Expo / React Native)
**Written by:** Product & Design Lead
**Date:** 2026-04-01

---

## Problem

The mobile budget dashboard is visually complete but functionally empty:

- All three budget categories show `spent: $0` regardless of actual spending
- The "Add Transaction" button fires haptics only — no modal, no form, no DB write
- A user who has logged transactions on web will see the mobile budget as blank

This is the core feature of the budget tab. Until it's real, the tab is misleading.

---

## User Story

As a parent reviewing the family budget on my phone, I want to see how much we've actually spent in each category this month, and be able to quickly log a new purchase, so that I always know where we stand against our budget.

---

## Screen Flow

### A. Budget Dashboard (existing layout, new data)

1. User opens Budget tab
2. App checks `household_income` for this user (already done ✅)
3. App **also** fetches `transactions` for the current calendar month, grouped by `bucket`
4. Each of the three 50/30/20 cards shows real `spent` totals
5. Progress bar fills based on actual spend vs. budget allocation
6. Below the cards: a "Recent" section shows the last 5–10 transactions, each with category name, amount, and date

### B. Add Transaction Sheet

1. User taps "Add Transaction" button
2. **Bottom sheet slides up** (full modal, same pattern as iOS share sheet)
3. Sheet contains:
   - Large dollar amount input (numeric keyboard, auto-focused)
   - Category picker (grouped by Needs / Wants / Savings — same `categoryOptions` list as web)
   - Optional description text field
   - Date picker (defaults to today)
   - "Add" button (primary CTA)
4. User fills in amount + category, taps "Add"
5. Sheet dismisses with haptic success feedback
6. Dashboard updates immediately (optimistic update) — no full reload
7. Transaction is written to `transactions` table in Supabase

---

## Interactions

| Action | Response |
|--------|----------|
| Tap "Add Transaction" | Bottom sheet animates up, amount field auto-focuses |
| Type amount | Dollar sign prefix, numeric keyboard |
| Select category | Pill highlights in that bucket's color |
| Tap Add (valid) | Haptic impact, sheet closes, card totals update in place |
| Tap Add (invalid) | Button stays disabled, no action |
| Swipe down on sheet | Sheet dismisses, no data saved |
| Long-press transaction in Recent list | (V2 — skip for now) |

---

## States

| State | What the user sees |
|-------|-------------------|
| **Loading** | ActivityIndicator (existing ✅) |
| **No income set** | Existing setup flow ✅ |
| **Income set, no transactions** | Cards show $0 spent / 0% bars. Below cards: "No transactions yet — tap + to log your first" |
| **Income set, has transactions** | Cards show real totals, recent list below |
| **Add Transaction sheet open** | Sheet over dimmed background |
| **Amount entered, no category** | Add button disabled |
| **Both entered** | Add button enabled (primary green) |
| **Save error** | Toast: "Couldn't save — try again" (non-blocking) |
| **Over budget** | Progress bar turns rose/red, alert badge appears on card |
| **Near budget (85%+)** | Amber alert badge appears on card |

---

## Data

**Read:**
```sql
SELECT bucket, SUM(amount) as spent
FROM transactions
WHERE profile_id = $userId
  AND date >= [first day of current month]
GROUP BY bucket
```

**Recent list:**
```sql
SELECT id, category, bucket, amount, description, date
FROM transactions
WHERE profile_id = $userId
  AND date >= [first day of current month]
ORDER BY date DESC
LIMIT 10
```

**Write (Add Transaction):**
```sql
INSERT INTO transactions (profile_id, amount, category, bucket, description, date)
VALUES ($userId, $amount, $category, $bucket, $description, $date)
```

The `bucket` field should be derived from the selected category using the same mapping as the web (`categoryOptions` array in web `budget/page.tsx`). This mapping should be moved to `packages/shared` so both platforms share it.

---

## Acceptance Criteria

- [ ] Budget dashboard shows real `spent` values for each bucket (not hardcoded 0)
- [ ] Progress bars animate to correct fill percentage on load
- [ ] Over-budget state (>100%) turns bar to rose, shows alert
- [ ] Near-budget state (≥85%) shows amber alert
- [ ] Recent transactions list appears below the cards with real data
- [ ] "Add Transaction" opens a bottom sheet (not a full-screen nav push)
- [ ] Sheet has: amount input (auto-focus), category picker, optional description, date, Add button
- [ ] Tapping Add writes to Supabase and updates cards without a full refresh
- [ ] Haptic feedback on successful add
- [ ] Empty transaction state shows a helpful message, not just empty space
- [ ] Works with the same `transactions` table and schema as the web app

---

## Design Notes

- Sheet background: `#1A1D17` (surface token) with `borderRadius: 28` on top corners
- Amount input: large, Geist-SemiBold, 32px, with a `$` prefix in warm-white/30
- Category pills: grouped by bucket, pill color matches bucket color on selection
- Add button: primary green (#7CB87A), full width, 52px height, Geist-SemiBold
- Drag handle at top of sheet: 4px × 32px, warm-white/15, centered
- Recent list rows: same card style as existing budget cards (#1A1D17, 12px radius, 16px padding)

**⚠️ Color note for Lead Eng:** The current mobile budget uses `#A07EC8` (purple) throughout — this color is NOT in the Kin design system. When implementing this feature, replace all `#A07EC8` references with brand tokens: primary green `#7CB87A` for CTAs, amber `#D4A843` for Wants, blue-ish accents should be avoided. See brand guide in SPRINT.md.

---

## Shared Code Opportunity

The `categoryOptions` array (categories → bucket mapping) is duplicated across web and mobile. Move it to `packages/shared/src/budget.ts` so both platforms stay in sync when categories are added/changed.

```typescript
// packages/shared/src/budget.ts
export const BUDGET_CATEGORIES = [
  { label: "Rent / Mortgage", bucket: "needs" },
  { label: "Groceries", bucket: "needs" },
  // ... etc
] as const;

export type BudgetBucket = "needs" | "wants" | "savings";
```
