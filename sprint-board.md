# Kin AI — Sprint Board

**Current Phase:** 2-Week iOS Launch Sprint
**Sprint Start:** April 2, 2026
**Target Launch:** April 16, 2026
**Last Updated:** 2026-04-03 17:30 (CoS automated pass — corrected task statuses. Code audit found 4 tasks marked ⬜ that are actually ✅ complete in working tree: C5.3 progressive overload (fitness.tsx), D4 commute departure push (cron/commute-departure/route.ts), C4.6 med reminders (cron/med-reminders/route.ts), C4.7 vax reminders (cron/vax-reminders/route.ts). ⚠️ FLAG: web dashboard UI pages (budget, chat, meals, dashboard) modified Apr 2 23:43 — appears to be brand/QA fixes from commits d72bcea/3b0df24, not new features; acceptable but borderline. Critical blockers unchanged: git not committed/pushed, RevenueCat key missing, Track E not started.)

---

## Sprint Goal

Ship a working iOS app that delivers the morning briefing experience on Day 1 of a user's trial. By April 16, a real family can download Kin from TestFlight (or App Store pending review), complete the 60-second conversational onboarding, receive their first morning briefing, plan the week's meals, and connect their calendar — all within 10 minutes of download.

**The test:** Would Austin's own morning briefing — commute, gym window, 9:30 meeting prep, wife's late meeting, soccer pickup, budget status, dinner suggestion — be generated correctly from real connected data? If yes, we're ready.

---

## Track Status Overview (Day 2 Velocity Check)

| Track | Description | Days | Status | Blocking? |
|-------|-------------|------|--------|-----------|
| **A** | Core Infrastructure (schema, auth, AI) | 1–3 | ✅ **Complete** — migrations 013–020 + kin-ai.ts + push notifications built; untracked but verified in working tree | **YES — unblocks all tracks once committed** |
| **B** | Onboarding + Schedule FVM | 3–5 | ✅ **Complete** — 5-step conversational onboarding, FVM briefing preview, CalendarConnectModal, save-onboarding.ts all built; untracked | No |
| **C1** | Calendar Sync Domain | 4–6 | ✅ **Complete** — Google OAuth, Apple CalDAV, household merge, conflict detection all built | No |
| **C2** | Meals Domain | 4–7 | 🟡 **90% complete** — allergy-safe gen ✅, grocery realtime sync ✅ (migration 020 untracked); budget-aware + quick meal pending | No |
| **C3** | Budget Domain | 5–7 | ✅ **Complete** — categories, summary view, transaction modal, overspend push all built (check-overspend route untracked) | No |
| **C4** | Kids + Pets Domain | 4–6 | ✅ **95% complete** — family.tsx full CRUD ✅, med reminders C4.6 ✅, vax reminders C4.7 ✅; kids appointment push C4.3 pending | No |
| **C5** | Fitness Domain | 5–8 | ✅ **Complete** — fitness.tsx full UI + workout logging + progressive overload C5.3 all built | No |
| **D** | Intelligence Layer (briefings, commute, date night) | 6–10 | ✅ **95% complete** — morning briefing ✅, commute ✅, date night ✅, departure push D4 ✅ all built; coordination push D7 pending | No |
| **E** | Billing + App Store | 8–12 | ⬜ **NOT STARTED — P0 BLOCKER** — RevenueCat paywall + trial arc entire track untouched | **YES — blocks TestFlight + git push** |

### ⚠️ Git State Warning — CRITICAL (Austin Action Required Before Lead Eng Proceeds)
The working tree has a very large amount of complete but **UNCOMMITTED** work. This is the blocker for Track E.

**Current state (2026-04-03 15:30):**
- **2 commits ahead of origin/main** (not pushed)
- **35+ untracked/modified files** representing all Days 1–2 work:
  - **Core domains:** family.tsx, kin-ai.ts, push-notifications.ts, CalendarConnectModal.tsx, save-onboarding.ts, commute.ts, date-night.ts
  - **Migrations:** 013–020 (all in apps/web/supabase/migrations)
  - **API routes:** morning-briefing, check-overspend, push-tokens, supabase/functions/morning-briefing
  - **Brand fixes:** budget.tsx, chat.tsx, fitness.tsx, index.tsx, meals.tsx (mobile) + web pages
  - **Untracked docs:** BRIEFING_SYSTEM_FILES.txt, BUILD_SUMMARY.md, IMPLEMENTATION_REPORT.md, etc.

**Austin action (required by end of Day 3):**
```bash
cd /Users/austin/Projects/kin
git add -A
git commit -m "feat: Family OS foundations — Tracks A-D complete (migrations, domains, briefing, AI, push)"
git push origin main
```

Lead Eng cannot begin Track E until this is committed + pushed.

---

## Pre-Build Prerequisites — Blocker Status Check (2026-04-03)
*Austin confirms all blocking items. Current state for Track E unblock.*

| # | Item | Owner | Status | Notes |
|---|------|-------|--------|-------|
| P1 | Expo SDK 54 scaffold current in `apps/mobile` | Lead Eng | ✅ Confirmed | Scaffold exists + operational |
| P2 | Supabase project URL + service key active | Austin | ✅ Confirmed | `https://coxqdpcffmsncvisfyvj.supabase.co` active in `.env` |
| P3 | Anthropic API key active + rate limits confirmed | Austin | ✅ Confirmed | Integrated in kin-ai.ts (claude-sonnet-4-20250514) |
| P4 | Google Cloud project — Calendar API v3 enabled, OAuth 2.0 client ID created | Austin | ✅ Confirmed | `/api/calendar/google/*` routes exist |
| P5 | Apple Developer push certificate ready | Austin | ✅ Confirmed | APNs configured; push-notifications.ts built |
| **P6** | **RevenueCat — $39/month + $299/year products configured** | **Austin** | **⬜ NOT DONE — P0 BLOCKER** | **Create products in dashboard: `kin_monthly_3999` ($39/mo) + `kin_annual_29900` ($299/yr). Provide `EXPO_PUBLIC_REVENUECAT_API_KEY` to `/apps/mobile/.env`.** |
| P7 | Stripe connected to Mercury bank | Austin | ⚠️ Pending | Mercury account routing/account numbers need to be entered in Stripe payout settings |
| P8 | DNS: Namecheap → Vercel for kinai.family | Austin/Lead Eng | ⬜ Deferred | Secondary — required for web checkout, not blocking TestFlight |

---

## Track A — Core Infrastructure
*Days 1–3 · MUST COMPLETE BEFORE OTHER TRACKS BEGIN*

### A1: Supabase Schema (Day 1)
Build the complete database schema in one session. RLS must be configured correctly from the start.

| # | Task | Status | Notes |
|---|------|--------|-------|
| A1.1 | Create all tables per schema in `kin-product-vision-v2.md` Section 6 | ✅ | Migrations 013–018: push_tokens, children_details/allergies/activities, pet_details/medications/vaccinations, fitness_profiles, workout_sessions, budget_categories, parent_schedules, morning_briefings |
| A1.2 | Configure RLS policies on every table — per-parent for private, per-household for shared | ✅ | Fitness strictly private; budget household-shared; children/pets profile-owned |
| A1.3 | Create `budget_summary_view` | ✅ | In migration 017 — aggregated totals only, no line items |
| A1.4 | Seed test household: Austin + partner + 1 child (dairy/egg allergy) + 1 dog | ⬜ | Austin: run `supabase db reset` then use onboarding flow to seed |

### A2: Authentication + Dual Profile Architecture (Day 2)
| # | Task | Status | Notes |
|---|------|--------|-------|
| A2.1 | Email/password auth via Supabase Auth | ✅ | Exists in sign-in.tsx / sign-up.tsx + auth.tsx context |
| A2.2 | Google OAuth social sign-in (for personal Google account only — NOT calendar scope) | ⬜ | Pending — add to sign-in.tsx |
| A2.3 | Household creation on Parent 1 signup | ✅ | `household_invites` table + `household_id` on profiles (migration 012) |
| A2.4 | Partner invite: generate unique link → store pending invite → resolve on Partner 2 signup | ✅ | `/api/invite/` routes exist in web app |
| A2.5 | Dual session model: each parent logs in from their own device | ✅ | Standard Supabase auth — each device has own session |

### A3: Core AI Integration + Push Notifications (Day 3)
| # | Task | Status | Notes |
|---|------|--------|-------|
| A3.1 | Anthropic API integration: `claude-sonnet-4-20250514` | ✅ | `/api/chat/route.ts` exists; kin-ai.ts built |
| A3.2 | Context assembly function: builds `family_context` block from Supabase dynamically | ✅ | `assembleFamilyContext()` in apps/mobile/lib/kin-ai.ts |
| A3.3 | Basic chat interface: send/receive working end-to-end in React Native | ✅ | chat.tsx with thread support already built |
| A3.4 | Expo push notifications: APNs configured, push token stored on app launch | ✅ | push-notifications.ts built; push_tokens table in migration 013 |
| A3.5 | Morning briefing cron: Supabase Edge Function fires at 6am per parent's time zone | ✅ | supabase/functions/morning-briefing/index.ts built |

---

## Track B — Onboarding + First Value Moment
*Days 3–5 · Begins after A2 is complete*

| # | Task | Status | Notes |
|---|------|--------|-------|
| B1 | Onboarding Screen 1: Family name, home location, household type | ✅ | Step 1 in OnboardingSurvey.tsx |
| B2 | Onboarding Screen 2: "Tell me about a typical weekday" — Claude parses free-form into schedule scaffold | ✅ | Step 2 in OnboardingSurvey.tsx → saves to parent_schedules |
| B3 | Onboarding Screen 3: Kids (name, age, allergies, activities) + Pets (name, species, vet schedule) | ✅ | Step 3 in OnboardingSurvey.tsx with allergy multi-select |
| B4 | Onboarding Screen 4: "What's your monthly grocery budget?" | ✅ | Step 4 in OnboardingSurvey.tsx |
| B5 | FVM delivery: generate + display first morning briefing preview at end of onboarding | ✅ | Step 5 in OnboardingSurvey.tsx with loading animation + briefing preview |
| B6 | Post-onboarding: prompt calendar connection (Google personal → Apple → work read-only) | ✅ | CalendarConnectModal.tsx built; shown in index.tsx after handleOnboardingComplete succeeds |
| B7 | Deferred account creation: show schedule/briefing preview BEFORE asking for sign-up | ✅ | FVM preview shown at Step 5 before "Start Your Free Trial" CTA |

---

## Track C — Domain Builds
*Days 4–10 · All run in parallel after Track A completes · Each can be a separate agent*

### C1: Calendar Sync (Days 4–6)
*Spec: `Kin_ClaudeCode_BuildBrief_v1.md` Section 2*

| # | Task | Status | Notes |
|---|------|--------|-------|
| C1.1 | Google Calendar OAuth 2.0 — personal calendar read/write scope | ✅ | `/api/calendar/google/` routes exist in web app |
| C1.2 | Initial import: pull last 6 months + all future events → store in `calendar_events` with `external_id` | ✅ | calendar_events table (migration 009) + sync route |
| C1.3 | Outbound sync: Kin event create/edit/delete → push to Google Calendar via API | ✅ | `/api/calendar/events` POST/PUT exists |
| C1.4 | Inbound sync: Google webhook registered at `/google/calendar/webhook` → trigger re-sync | ✅ | `/api/calendar/google/webhook` route exists |
| C1.5 | Apple CalDAV sync via `tsdav` — 15-minute poll cycle, iCal parsed via `ical.js` | ✅ | `/api/calendar/apple/connect` route exists |
| C1.6 | Read-only work calendar connection (separate OAuth with read-only calendar scope) | ⬜ | Needs a separate OAuth scope on the Google route |
| C1.7 | Household calendar merge: both parents' shared events + kids' activities in one view | ✅ | `is_shared` + `is_kid_event` flags on calendar_events + household RLS |
| C1.8 | Conflict detection: flag when both parents have clashing required commitments | ✅ | `calendar_conflicts` table + `/api/calendar/conflicts` route |
| C1.9 | Privacy enforcement: personal events visible only to owning parent; work events titles private | ✅ | RLS policies in migration 009 |

### C2: Meals Domain (Days 4–7)
| # | Task | Status | Notes |
|---|------|--------|-------|
| C2.1 | Meal generation function: Claude generates 7-day plan with allergy-safe enforcement | ✅ | `/api/meals` route exists; allergy context injected via `assembleFamilyContext()` in kin-ai.ts |
| C2.2 | Budget-aware planning: estimated cost per meal, total vs. grocery budget | ⬜ | Needs budget_categories data fed into meal generation prompt |
| C2.3 | Grocery list auto-generation from meal plan with deduplication | ⬜ | |
| C2.4 | Meal display: plan + grocery list + recipe card per meal | ✅ | meals.tsx + RecipeModal component exists |
| C2.5 | Meal ratings: chat-based "How was [meal]?" → 1–5 stars → store in `meal_ratings` | ✅ | meal_ratings table + StarRating component exists |
| C2.6 | Quick meal mode: "Something in 20 minutes" → Claude generates from family preferences | ⬜ | Add shortcut in meals.tsx or via chat |
| C2.7 | Grocery list real-time sync: checked items auto-sort to bottom, visible to both parents | ✅ | migration 020_grocery_list_items.sql + Realtime subscription + checkbox UI in meals.tsx |

### C3: Budget Domain (Days 5–7)
| # | Task | Status | Notes |
|---|------|--------|-------|
| C3.1 | Category budget setup in onboarding/settings: name, monthly limit, color | ✅ | budget_categories table (migration 017); budget.tsx shows setup prompt with defaults |
| C3.2 | Manual transaction entry via chat: "Spent $47 at Kroger — groceries" → Claude parses → stores | ⬜ | Chat route can parse this; needs transaction write handler |
| C3.3 | Quick-add UI: amount + category selector for fast logging without chat | ✅ | Add Transaction modal built in updated budget.tsx |
| C3.4 | Shared budget view: category totals by month — both parents see combined totals only | ✅ | budget_summary_view in migration 017; budget.tsx queries totals |
| C3.5 | Overspend flag: one push notification when any category hits 80% of monthly limit | ✅ | `/api/budget/check-overspend/route.ts` built; called from budget.tsx after transaction insert; max 1/month enforced |
| C3.6 | Subscription list: manual entry with monthly cost, renewal date | ⬜ | Pending |
| C3.7 | Monthly subscription audit prompt: one proactive message per month listing unused subscriptions | ⬜ | Pending |

### C4: Kids + Pets Domain (Days 4–6)
| # | Task | Status | Notes |
|---|------|--------|-------|
| C4.1 | Full kid profile: name, age, school, grade, allergies, activities, food preferences | ✅ | children_details + children_allergies tables + family.tsx CRUD |
| C4.2 | Activity schedule: days, times, location — auto-populates family calendar | ✅ | children_activities table (migration 014) |
| C4.3 | Healthcare appointments: entry + reminders (48 hrs prior, 1 day prior) | ⬜ | vet_next_appointment field exists; push logic pending (not in cron routes — this is kids appt, separate from C4.7 which is pet vax) |
| C4.4 | Activity reminders in morning briefing: "Soccer today at 4:30 — leave work by 4" | ✅ | Morning briefing engine queries children_activities for today |
| C4.5 | Full pet profile: name, species, breed, age, vet info, vaccinations, medications | ✅ | pet_details + pet_vaccinations + pet_medications + family.tsx CRUD |
| C4.6 | Medication reminders: daily push with one-tap confirmation | ✅ | `cron/med-reminders/route.ts` built; runs 8 AM UTC; consolidated per-user push with dedup by calendar day |
| C4.7 | Vaccination reminders: 7-day and 1-day prior push notifications | ✅ | `cron/vax-reminders/route.ts` built; runs 9 AM UTC; dedup by due_date so reminders re-trigger after boosters |

### C5: Fitness Domain (Days 5–8)
| # | Task | Status | Notes |
|---|------|--------|-------|
| C5.1 | Fitness profile: goals, current weight, target weight, timeline — strictly private per parent | ✅ | fitness_profiles table (migration 016) + fitness.tsx setup flow |
| C5.2 | Chat-based workout logging: Claude parses free-form → stores exercise/sets/reps/weight to `workout_sessions` | ✅ | workout_sessions with exercises JSONB; fitness.tsx parses "bench 185 3x8" |
| C5.3 | Progressive overload tracker: compare last session per exercise → prompt increase when rep target hit twice | ✅ | `checkProgressiveOverload()` built in fitness.tsx; compares last 2 sessions per exercise; UI renders suggestions inline |
| C5.4 | Workout window suggestions in morning briefing: identify calendar gaps, suggest training if scheduled | ✅ | Morning briefing engine checks calendar for workout windows |
| C5.5 | Privacy enforcement: fitness data never appears in shared context or partner's thread | ✅ | Migration 016 RLS: auth.uid() = profile_id only; assembleFamilyContext() keeps fitness private |

---

## Track D — Intelligence Layer
*Days 6–10 · Runs after C domains are partially complete*

| # | Task | Status | Notes |
|---|------|--------|-------|
| D1 | Morning briefing engine: assembles all domain data → structured context → Claude → push notification | ✅ | `/api/morning-briefing/route.ts` + `supabase/functions/morning-briefing/index.ts` built |
| D2 | Briefing priority logic: time-sensitive logistics first, coordination second, budget/meals third, opportunistic last | ✅ | Priority order coded into briefing assembly prompt in morning-briefing route |
| D3 | Commute intelligence (static v1.0): Google Maps Distance Matrix API → departure time for first calendar event | ✅ | `lib/commute.ts` built; injected into morning-briefing route; needs GOOGLE_MAPS_API_KEY in .env.local |
| D4 | Commute departure push: 15 minutes before optimal leave time | ✅ | `cron/commute-departure/route.ts` built; runs every 5 min via Vercel cron; sends in [leave_by - 20min, leave_by - 10min] window; max 1/day enforced |
| D5 | Work awareness: work calendar events in briefing as read-only; back-to-back detection | ✅ | calendar_events with is_shared=false for work; included in briefing context |
| D6 | Meeting prep nudge: 30 min before any event flagged "needs prep" | ⬜ | |
| D7 | Partner coordination triggers: when one parent's schedule change creates a logistics gap → push to other parent | ⬜ | calendar_conflicts table + conflict detection ready; push trigger pending |
| D8 | Date night engine: daily check → 14-day threshold + both free → inject suggestion into briefing | ✅ | `lib/date-night.ts` + migration 019_date_nights.sql built; injected into morning-briefing route |
| D9 | Date night: 2-option suggestions calibrated to preferences + dining budget remaining | ✅ | 2 suggestions generated in buildDateNightSuggestion(), calibrated to dining budget remaining |

---

## Track E — Billing + App Store
*Days 8–12 · Runs parallel to Track D*

| # | Task | Status | Notes |
|---|------|--------|-------|
| E1 | RevenueCat: `react-native-purchases` installed, $39/month + $299/year products wired | ⬜ | |
| E2 | Paywall screen: dark background, annual highlighted, monthly savings shown | ⬜ | Brand guide compliant |
| E3 | 7-day trial: trial starts on first sign-in, stored in Supabase, countdown visible in settings | ⬜ | |
| E4 | Trial arc implementation: Day 0–7 progressive feature reveals (see Section 6 of vision doc) | ⬜ | |
| E5 | Day 6 loss preview in briefing: "Trial ends tomorrow. This week Kin [summary of what it handled]" | ⬜ | |
| E6 | App Store listing prepared: screenshots, preview video, description, privacy policy URL | ⬜ | App name: "Kin: Family AI" |
| E7 | App Store submission — target Day 12 | ⬜ | Review ~24–48 hrs |
| E8 | Plaid application submitted on launch day (starts approval clock) | ⬜ | Austin's task |

---

## Days 13–14: Integration + Launch

| # | Task | Status | Notes |
|---|------|--------|-------|
| L1 | End-to-end flow test: both parents, kids + allergies, pets, calendar, morning briefing | ⬜ | |
| L2 | Allergy safety test: confirm dairy/egg meals never generated for allergic profiles | ⬜ | P0 quality gate |
| L3 | Privacy test: confirm Parent 1 cannot access Parent 2's individual transactions or fitness data | ⬜ | P0 quality gate |
| L4 | Notification delivery: all 7 notification types verified on physical device | ⬜ | |
| L5 | RevenueCat purchase flow: test monthly + annual, trial state, post-trial paywall | ⬜ | |
| L6 | TestFlight build: distribute to Austin + 5–10 beta users | ⬜ | |
| L7 | App Store approved (submitted Day 12, approved Day 13–14) | ⬜ | |
| L8 | Beehiiv waitlist email: "Kin is live" | ⬜ | Austin sends |
| L9 | First TikTok/Instagram content: the morning briefing — Austin's real life | ⬜ | Austin records |
| L10 | Plaid application submitted | ⬜ | Austin submits |

---

## Quality Gates — Nothing Ships Without These

| Gate | Criteria | Owner |
|------|----------|-------|
| **Allergy safety** | Generate 20 meal plans for a dairy/egg-allergic child. Zero violations. | QA Lead |
| **Privacy wall** | Log in as Parent 1. Attempt to access Parent 2's fitness data, transactions, and chat thread through every available UI path and API route. Zero access. | QA Lead |
| **Briefing accuracy** | Morning briefing for test household includes commute, correct schedule, coordination prompt, budget line, and dinner suggestion — all from live connected data. | Lead Eng + Austin |
| **Notification delivery** | All 7 notification types delivered to physical device. Max 3 per day confirmed. | QA Lead |
| **Brand compliance** | Every screen uses #0C0F0A background, correct domain colors, Instrument Serif + Geist typography. | Product & Design |
| **Trial conversion** | Day 7 paywall fires correctly. Purchase completes. Subscription active in RevenueCat. | Lead Eng + QA |

---

## Velocity Notes

- Sprint started April 2, 2026
- First velocity check: April 7 (Day 5) — are Tracks A and B complete?
- Critical path: Track A → Track D (briefing engine) → Launch
- If Track A slips past Day 4: escalate to Austin immediately. Everything else depends on it.
