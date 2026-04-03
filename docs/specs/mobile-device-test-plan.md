# Spec: Mobile App Physical Device Test — Task #11

**Author:** Product & Design Lead (automated)
**Date:** 2026-04-02
**Status:** Ready for QA
**Depends on:** Expo Go installed on Austin's device, web backend deployed to Vercel (#1)

---

## User Story

As a parent, I want the Kin mobile app to work perfectly on a real iPhone so that I can trust it in front of real families during beta.

---

## Setup Prerequisites

Before testing:
1. `cd apps/mobile && npx expo start`
2. Scan QR code with Expo Go on device (iOS preferred — App Store target)
3. Ensure device is on same WiFi as dev machine OR use tunnel mode (`--tunnel`)
4. Confirm `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set in `apps/mobile/.env.local`
5. Confirm `EXPO_PUBLIC_API_URL` points to the live Vercel deployment (not localhost)

---

## Tabs to Verify

### Tab 1 — Home (index.tsx)

| Check | Expected | Pass/Fail |
|-------|----------|-----------|
| App loads to home tab | Within 2s, no blank screen | |
| Greeting is personalized | "Good morning/evening, [Name]" | |
| Budget summary shows real data | `$X spent of $Y budget` (not always $0) | |
| Today's meals card shows actual meals | Breakfast / Lunch / Dinner text visible | |
| Quick action buttons are tappable | 44px+ tap targets, no mis-fires | |
| No purple (#A07EC8) visible anywhere | All accents green or amber | |
| Background is dark green (#0C0F0A) | Not pure black | |

### Tab 2 — Meals (meals.tsx)

| Check | Expected | Pass/Fail |
|-------|----------|-----------|
| Loading spinner appears on mount | 3-dot pulse, not blank screen | |
| If meal plan exists: shows plan view | Breakfast/Lunch/Dinner/Snack sections | |
| Category headers are color-coded | Amber/Blue/Green/Rose — no purple | |
| Meal card shows prep time + calories | GeistMono numbers, formatted | |
| "New plan" button triggers regeneration | Cycling loading messages appear | |
| Grocery list opens as native modal | pageSheet presentation, items grouped by store | |
| Grocery total in GeistMono | `$XX.XX` formatted | |
| If no meal plan: noPlan CTA shown | "Generate my meal plan" button visible | |
| Error state: retry button visible | If API fails, card with retry CTA appears | |
| No `#fff` or `#A07EC8` visible | Toggle thumb is a minor exception (iOS convention) | |

### Tab 3 — Budget (budget.tsx)

| Check | Expected | Pass/Fail |
|-------|----------|-----------|
| Loading state appears on mount | Not blank | |
| Income card shows correct amount | Matches what was set, not $0 | |
| Budget bars animate in correctly | Needs/Wants/Savings | |
| Add transaction flow works | Bottom sheet slides up, entry saves | |
| Transaction appears in list | Optimistic update visible | |
| Over-budget indicator shown if applicable | Rose badge on card | |
| No purple in any buttons or tabs | All CTA → green, warnings → amber | |

### Tab 4 — Chat (chat.tsx)

| Check | Expected | Pass/Fail |
|-------|----------|-----------|
| Empty state: Kin avatar + quick reply chips | No purple chip | |
| Send a message — response arrives | Under 5s for simple questions | |
| Typing indicator visible while loading | 3 animated dots | |
| Message history persists after tab switch | Tap away and back — messages still there | |
| Voice input mic button tappable | 44px minimum, activates recording | |
| Recording indicator shows when active | Visual feedback that mic is on | |

### Tab 5 — Settings (settings.tsx)

| Check | Expected | Pass/Fail |
|-------|----------|-----------|
| All sections render correctly | Profile, appearance, notifications, subscription | |
| Theme toggle works (if implemented) | Tapping switches light/dark | |
| No purple anywhere | Moon/Sun/Monitor → blue, not purple | |
| Sign out works | Navigates to auth screen | |

---

## Auth Flow (Full Loop)

| Check | Expected | Pass/Fail |
|-------|----------|-----------|
| Sign up with new email | Account created, navigates to onboarding | |
| Onboarding completes | Meal plan generated, navigates to dashboard | |
| Sign out | Returns to sign-in screen | |
| Sign back in | All data restored, meal plan visible | |

---

## Edge Cases

| Check | Expected | Pass/Fail |
|-------|----------|-----------|
| App backgrounded for 5+ minutes | Returns to correct state, no auth errors | |
| No internet connection | Graceful error, not crash | |
| Device rotation (if applicable) | Layout doesn't break | |
| iPhone home indicator area | Content not hidden behind home bar | |
| Notch / Dynamic Island area | Status bar content visible | |

---

## Acceptance Criteria

- All 5 tabs render without blank screens or uncaught crashes
- Auth loop works end-to-end (signup → onboarding → meal plan → dashboard)
- Budget real data loads (not $0 forever)
- Chat sends and receives a real AI response
- Meals tab shows actual meal plan data or a clear CTA to generate one
- No purple (`#A07EC8`) visible anywhere
- Background is dark (#0C0F0A), not pure black
- Fonts: Instrument Serif Italic for headlines, Geist for body, GeistMono for numbers
- Touch targets are comfortable on a real device (no mis-taps on adjacent elements)
