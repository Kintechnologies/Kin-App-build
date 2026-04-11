# RevenueCat Paywall — iOS Spec
**Track E · Written by: Product & Design Lead · April 3, 2026**

---

## Context

RevenueCat products to create (Austin's task, blocking this spec):
- `kin_monthly_3999` — $39.00/month
- `kin_annual_29900` — $299.00/year

Trial: 7 days free, no credit card required at start (RevenueCat handles this).

---

## Where the Paywall Appears

Three trigger points:

1. **After onboarding** — user completes the 60-second conversational onboarding and sees their first home screen. After a 3-second delay, if the trial hasn't started yet, show the paywall as a bottom sheet (not full-screen — let them see the app behind it).

2. **Trial end** — on the morning of day 8, if subscription hasn't been purchased. Full-screen modal, can't be dismissed. This is the hard gate.

3. **Gated feature tap** — if a non-subscriber taps a domain feature during trial expiry (e.g., tries to generate a meal plan after trial ends). Contextual message that references the feature they tried to access.

---

## Paywall: Post-Onboarding (Bottom Sheet)

**Trigger:** `onboardingComplete === true && !hasActiveSubscription && !hasStartedTrial`

**Behavior:** Slides up 60% of screen height. Background is dimmed but app is visible. Can be dismissed with a swipe down (trial starts on dismiss — they get 7 days regardless).

**Layout:**

```
┌──────────────────────────────────────────┐
│  ▬  (drag handle)                        │
│                                          │
│  kin                                     │  ← Instrument Serif italic, #7CB87A, 22pt
│  The Mental Load, Handled.               │  ← Geist, rgba(240,237,230,0.4), 13pt
│                                          │
│  Your 7-day free trial starts now.       │  ← Geist-SemiBold, #F0EDE6, 18pt
│  Cancel anytime. No charge today.        │  ← Geist, rgba(240,237,230,0.4), 13pt
│                                          │
│  ╔══════════════════════════════════╗   │
│  ║  $39 / month                     ║   │  ← selected by default, green border
│  ║  Billed monthly after trial      ║   │
│  ╚══════════════════════════════════╝   │
│                                          │
│  ╔══════════════════════════════════╗   │
│  ║  $299 / year   · Save 36%        ║   │  ← unselected, muted border
│  ║  $24.92/mo · Billed annually     ║   │
│  ╚══════════════════════════════════╝   │
│                                          │
│  [  Start Free Trial  ]                  │  ← #7CB87A CTA, full width
│                                          │
│  Restore purchase                        │  ← Geist, muted, centered, small
└──────────────────────────────────────────┘
```

**CTA copy:** "Start Free Trial" — never "Subscribe Now" or "Upgrade." The trial is the promise.

**On tap "Start Free Trial":** Call `Purchases.purchasePackage(selectedPackage)`. On success, dismiss sheet, fire haptic success, show a one-time toast "7 days free — enjoy Kin." On failure, show inline error below CTA.

**On dismiss (swipe down):** Call `Purchases.beginRefundRequestForActiveEntitlement()` — NO, wrong. Just dismiss. The trial starts when they tap "Start Free Trial." Dismissing without tapping means they haven't started the trial yet — they'll see this again on next app open.

---

## Paywall: Trial End (Day 8 Gate)

**Trigger:** `trialExpired === true && !hasActiveSubscription`

**Behavior:** Full-screen. Cannot be dismissed. Back navigation disabled. This is the hard conversion moment.

**Layout:**

```
Background: #0C0F0A, full screen

  (top 1/3: subtle FloatingOrbs component)

  kin                                       ← Instrument Serif italic, 36pt, #F0EDE6

  Your trial ended.                         ← Geist-SemiBold, 22pt, #F0EDE6

  Everything you set up is still here.      ← Geist, 15pt, rgba(240,237,230,0.6)
  Subscribe to keep going.                  ← same style

  ┌─────────────────────────────────────┐
  │  $39 / month                        │  ← default selected
  │  Everything included                │
  └─────────────────────────────────────┘

  ┌─────────────────────────────────────┐
  │  $299 / year  · Save $169           │  ← secondary option
  │  $24.92/mo · Best value             │
  └─────────────────────────────────────┘

  [ Subscribe — Keep Everything ]           ← #7CB87A, full width, 52pt height

  Restore purchase                          ← muted, small, centered
```

**Copy rationale:** "Everything you set up is still here" is the retention hook — the user's data (schedule, meals, budget, family profiles) is preserved. They're not losing their work. They're just unlocking it.

---

## Paywall: Gated Feature (Contextual)

**Trigger:** User taps a feature action (generate meal plan, add transaction, view morning briefing in full) after trial has expired.

**Behavior:** Bottom sheet, 50% height. References the specific feature.

**Copy template:**
> "Meal planning is part of Kin. Subscribe to keep generating personalized plans for your family."

OR

> "Your morning briefing is ready. Subscribe to read it."

**CTA:** "Subscribe — $39/month" → navigates to full paywall screen.

---

## React Native Implementation Notes

**File to create:** `apps/mobile/components/paywall/PaywallSheet.tsx`

**RevenueCat setup:**
```tsx
import Purchases, { PurchasesPackage } from 'react-native-purchases';

// Initialize in _layout.tsx (app startup):
Purchases.configure({ apiKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY });

// Check entitlement:
const customerInfo = await Purchases.getCustomerInfo();
const isActive = customerInfo.entitlements.active['kin_premium'] !== undefined;
```

**Entitlement ID:** `kin_premium` (to be created in RevenueCat dashboard by Austin)

**Offering ID:** `default` (RevenueCat default offering containing both packages)

**State to track in app:**
- `hasActiveSubscription: boolean` — from RevenueCat entitlement check on app launch
- `trialStartDate: string | null` — stored in Supabase `profiles` table when trial begins
- Check on app foreground via `AppState` listener

**Where to put the entitlement check:**
- `app/_layout.tsx` — load on app start, store in a context or zustand slice
- Re-check on `AppState` change to `active` (handles cases where user subscribes from App Store directly)

---

## Brand Compliance

- Background: `#0C0F0A`
- CTA: `#7CB87A` — "Start Free Trial" / "Subscribe"
- Selected plan card: `borderColor: rgba(124, 184, 122, 0.4)`, `backgroundColor: rgba(124, 184, 122, 0.06)`
- Unselected plan card: `borderColor: rgba(240, 237, 230, 0.08)`, `backgroundColor: #141810`
- "Save X%" pill: `backgroundColor: rgba(124, 184, 122, 0.15)`, text `#7CB87A`
- Price typography: `fontFamily: Geist-SemiBold`, `fontSize: 18`, `color: #F0EDE6`
- Subtext: `fontFamily: Geist`, `fontSize: 13`, `color: rgba(240, 237, 230, 0.4)`

---

## What Austin Must Do First

1. Create RevenueCat account at app.revenuecat.com
2. Create iOS app in RevenueCat linked to the App Store bundle ID
3. Create two products in App Store Connect: `kin_monthly_3999` and `kin_annual_29900`
4. Create entitlement `kin_premium` in RevenueCat, attach both products
5. Create offering `default` with both packages
6. Add `EXPO_PUBLIC_REVENUECAT_IOS_KEY` to Expo environment secrets
7. Run `npx expo install react-native-purchases` in `apps/mobile`

Once steps 1–7 are done, engineering can build PaywallSheet.tsx directly from this spec.

---

*kin · The Mental Load, Handled. · Kin Technologies LLC · Confidential*
