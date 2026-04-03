# Spec: Budget Flow E2E Verification — Task #8

**Author:** Product & Design Lead (automated)
**Date:** 2026-04-02
**Status:** Ready for QA
**Depends on:** Vercel deploy (#1), Supabase `transactions` + `household_income` tables live

---

## User Story

As a parent, I want to see where our money is going this month and log new transactions so that I feel in control of our family finances without needing a spreadsheet.

---

## Screen Flow

1. User navigates to `/budget` (dashboard nav)
2. Loading state: 3-dot pulse animation while income + transactions load
3. **New user (no income set):** Income card shows `$0` — user taps the pencil icon to enter monthly income
4. User enters income → taps "Save" → budget allocation cards update (Needs 50%, Wants 30%, Savings 20%)
5. User taps the `+` button (top right, primary green) → "Add Expense" modal slides up
6. User enters: amount, category (grouped pill picker), optional description → taps "Add"
7. Modal closes; transaction appears in recent transactions list; bucket bar updates
8. If spending exceeds a bucket: "Over" badge appears on the card (rose/red)
9. Near-limit warning: amber indicator when bucket hits 85%+ of budget

---

## States to Verify

### Loading State
- [ ] 3-dot pulse animation appears on page load (bg-primary/30, animate-pulse)
- [ ] Loading state resolves even if Supabase returns no data (new user)
- [ ] **[BUG - P2]** If Supabase fetch throws (network error, auth issue), `loading` stays `true` forever → infinite spinner. Needs try/catch + error fallback.

### No Income Set (New User)
- [ ] Income card shows `$0` with edit pencil visible
- [ ] Budget allocation bars show 0% spent (correct — no budget to compare against)
- [ ] CTA or prompt encouraging user to "Set your monthly income to track budget" should be visible
- [ ] Note: Currently no such prompt exists — user must discover the pencil icon. **[UX GAP - P2]**

### Income Set, No Transactions
- [ ] Income displays correctly (e.g., `$5,000`)
- [ ] Allocation cards: Needs $2,500, Wants $1,500, Savings $1,000 (at 50/30/20 split)
- [ ] All bars show 0% spent
- [ ] Total spent: $0 / $5,000 (0%)
- [ ] Recent transactions section: empty — should show "No transactions yet this month" copy
- [ ] Note: Currently no empty-state copy for the transaction list **[UX GAP - P2]**

### Active Budget with Transactions
- [ ] Each bucket bar fills proportionally
- [ ] Spent amount and budget amount shown in Geist Mono
- [ ] "Over" badge (rose) appears when `spent > budget`
- [ ] Near-limit visual treatment (amber?) when ≥ 85%
- [ ] Recent transactions list: amount, category, date — most recent first

### Add Transaction Modal
- [ ] Modal opens on `+` button tap
- [ ] Amount input: numeric keyboard on mobile; `$` prefix visual
- [ ] Category grouped picker: Needs / Wants / Savings with colored pills
- [ ] Selecting category auto-sets the bucket (no manual bucket selection needed)
- [ ] Optional description field
- [ ] "Add" button disabled when amount is 0 or empty
- [ ] On success: modal closes, transaction appears, bar updates
- [ ] On error: modal stays open with inline error message

---

## Interactions to Test

| Action | Expected |
|--------|----------|
| Page load, authenticated | Income + transactions load from Supabase |
| Tap pencil on income card | Inline input opens; keyboard appears |
| Enter income and Save | Income saved to `household_income` table; bars update |
| Press Enter in income input | Saves (same as tap Save) |
| Tap `+` button | Add Expense modal appears |
| Select category | Bucket auto-assigned (Needs/Wants/Savings) |
| Submit transaction | Appears in list; bar updates; optimistic UI |
| Spend over budget | "Over" badge appears on card |
| Reload page | All data persists (Supabase, not local state) |

---

## Data Requirements

- `household_income` table: `{ profile_id, monthly_income }`
- `transactions` table: `{ id, profile_id, amount, category, bucket, description, date }`
- Data scoped to current month (monthStart calculated from first day of month)
- Auth guard: unauthenticated users → redirect to `/signin`

---

## Acceptance Criteria

- [ ] Income set and saved to DB — persists on reload
- [ ] Budget allocation math correct: Needs=50%, Wants=30%, Savings=20% of income
- [ ] Transaction added: appears immediately in list + bar updates
- [ ] Over-budget state clearly visible (rose "Over" badge)
- [ ] Loading state appears and resolves correctly
- [ ] Add modal: amount + category required; description optional
- [ ] No brand violations: Wants=amber ✅, Needs=blue ✅, Savings=green ✅ (no purple)
- [ ] `$` amounts use Geist Mono font
- [ ] All touch targets ≥ 44px on mobile
- [ ] No infinite spinner on Supabase error (requires P2 fix — see bug below)

---

## Bugs & UX Gaps Found During Spec

### 🔴 P2 Bug — Budget page: infinite spinner on fetch error
**File:** `apps/web/src/app/(dashboard)/budget/page.tsx`
**Issue:** The `load()` function inside `useEffect` has no `try/catch`. If `supabase.auth.getUser()` or the subsequent queries throw, `setLoading(false)` is never called → the page shows the 3-dot spinner indefinitely.
**Fix:** Wrap `load()` body in `try/catch/finally { setLoading(false) }`. Add a `loadError` state and render a user-facing "Couldn't load your budget data. Please refresh." fallback.

### 🟡 P2 UX Gap — No empty-state prompt for new user income setup
**Issue:** A new user with no income set sees `$0` and three empty bars with no explanation. They must discover the edit pencil on the income card without a prompt.
**Fix:** When `monthlyIncome === 0`, show a subtle nudge below the income card: `"Set your monthly income to start tracking → "` with the pencil icon. Alternatively, auto-focus the income input on first visit.

### 🟡 P2 UX Gap — No empty-state copy for transaction list
**Issue:** When no transactions have been added, the recent transactions section renders nothing. A blank space below the bucket cards is confusing.
**Fix:** Show: `"No transactions logged yet this month. Tap + to add your first."` in `text-warm-white/30` with a subtle Wallet icon.

---

## Known Gaps / Future Work

- **P3:** Budget insights from AI ("You're on track to overspend on dining this month")
- **P3:** Recurring transactions
- **P3:** Export to CSV
- **P3:** Partner's transactions visible in shared household view
- **P3:** Month-over-month comparison chart
