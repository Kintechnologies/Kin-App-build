# UX Audit — April 3, 2026
**Written by: Product & Design Lead**

---

## Screens Audited

Home (index.tsx), Budget (budget.tsx), Fitness (fitness.tsx), Family (family.tsx), Chat (chat.tsx), CalendarConnectModal.tsx

---

## Fixed This Session

### 1. Home → Schedule card routed to Settings (Fixed)
**What was wrong:** Tapping the Schedule card on the home screen called `router.push("/(tabs)/settings")`. Empty state said "Connect your calendar in Settings." This was a 3-step detour to a simple connect action.

**What was fixed:** The onPress now calls `setShowCalendarModal(true)` when no events are loaded, opening the CalendarConnectModal directly. Empty state copy updated to "Tap to connect your calendar" — makes the affordance explicit.

### 2. Home → Quick Actions row was fully redundant (Fixed)
**What was wrong:** The Quick Actions row showed Chat, Meals, Budget, Calendar — all of which were already one tap away in the tab bar (7-item tab bar: Home, Chat, Meals, Budget, Family, Fitness, Settings). "Calendar" in Quick Actions routed to Settings, not a calendar view.

**What was fixed:** Quick Actions section removed. The space it occupied now collapses, tightening the home screen.

### 3. CalendarConnectModal — subheadline didn't address permission anxiety (Fixed)
**What was wrong:** Copy said "Kin needs your calendar to give you commute times, pickup reminders, and briefings that actually match your day." This starts with "Kin needs" (feels demanding) and doesn't address why people hesitate (privacy).

**What was fixed:**
- New subheadline: "Without your calendar, Kin is guessing. Connect once and your morning briefing will reflect your actual day — commutes, pickups, meetings, all of it." Honest framing.
- Added privacy note in GeistMono below: "Read-only · Kin sees your events, not your emails" — addresses the top objection without burying it.
- Skip copy shortened from "Skip for now — I'll connect later in Settings" to "Skip for now" — less verbose, removes the outdated "in Settings" reference.

---

## Open Issues (Not Yet Fixed — Engineering Needed)

### A. Home — budget card compares spend to income, not budget limits
**File:** `apps/mobile/app/(tabs)/index.tsx`, lines 198–229

**What's happening:** `budgetTotal` is populated from `household_income.monthly_income`. The home card shows "$X spent of $Y/mo" where Y is total monthly income — not the sum of category limits. Users will see "$1,200 of $7,500/mo" when they expect "$1,200 of $1,250 budgeted" (sum of active category limits).

**Fix needed (Lead Engineer):** In `loadAll()`, replace the `household_income` query with a sum of `budget_categories.monthly_limit` where `active = true`. Store as `budgetTotal` in state. Fallback to income if no categories set up.

### B. Home — calendar events never loaded
**File:** `apps/mobile/app/(tabs)/index.tsx`, line 248

**What's happening:** `calendarEvents: []` is hardcoded in `setDailyData()`. The `loadAll()` function makes no query to `calendar_events` or any calendar table. The Schedule card on the home screen will always show the empty state even for users with connected calendars.

**Fix needed (Lead Engineer):** Add a query to `loadAll()` that fetches today's calendar events from the unified `calendar_events` table (or equivalent — whatever the calendar sync writes to). Filter to `event_date = today`. Surface top 3 events. The CalendarConnectModal is already built; the data layer just isn't surfacing on home.

### C. Chat — N+1 query pattern on thread list load
**File:** `apps/mobile/app/(tabs)/chat.tsx`, lines 112–148

**What's happening:** `loadThreads()` fetches 20 threads, then loops over each thread to fetch the last message preview — 21 separate Supabase queries. On a cold load with 20 threads, this fires 21 requests sequentially.

**Fix needed (Lead Engineer):** Use a Postgres function or view that returns thread + last_message_preview in a single query. Alternative: use Supabase's `select with joins` to get the latest conversation row per thread in one request (window function or LATERAL join).

### D. Fitness — weight progress bar is always 0% or 100%
**File:** `apps/mobile/app/(tabs)/fitness.tsx`, lines 456–471

**What's happening:** The progress bar width calculation: `((current - target) / (current - target)) * 100` — this always equals 1 (100%) because numerator = denominator. The bar never shows actual progress toward goal.

**Fix needed (Lead Engineer):** The formula needs a third value — `starting_weight`. Progress = `(starting - current) / (starting - target)`. If no starting weight is stored, either hide the bar or use a flat "X lbs to goal" text label instead.

### E. Onboarding completion percentage is misleading
**File:** `apps/mobile/app/(tabs)/index.tsx`, lines 209–224

**What's happening:** Progress is calculated as `answered.length / ONBOARDING_QUESTIONS.length * 100` where `ONBOARDING_QUESTIONS` has 21 items. But only 8 items actually have data mappings in `loadAll()`. A fully-onboarded user will show as 38% complete indefinitely — "Getting to know you" never disappears.

**Fix needed:** Either (a) reduce `ONBOARDING_QUESTIONS` to only the questions that actually have data mappings, or (b) complete the data mapping for the remaining 13 questions. Option (a) is the 30-minute fix; option (b) is the right answer but requires additional schema work.

---

## Specs Written This Session

1. **`date-night-ui-spec.md`** — Full spec for Domain J: date night suggestion card, morning briefing integration, calendar block confirmation, data model, chat context flow
2. **`ux-audit-apr3-2026.md`** — This file

---

*kin · The Mental Load, Handled. · Kin Technologies LLC · Confidential*
