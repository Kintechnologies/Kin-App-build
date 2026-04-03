# Spec: Stripe Checkout Flow — UX & Test Plan

**Filed by:** Product & Design Lead
**Date:** 2026-04-02
**Priority:** P0 — direct revenue path; must be flawless before any paid signups
**Related tasks:** #5 (Test Stripe checkout e2e), #42 (partner onboarding), post-checkout-welcome.md
**Platform:** Web (kinai.family/pricing)

---

## Overview

The checkout flow is the first moment a family trusts Kin with money. It must feel as premium as the rest of the product — no janky error states, no silent failures, no confusion about what they just paid for. This spec covers the complete UX from pricing page through to the post-checkout dashboard landing.

---

## Flow Map

```
/pricing  →  Stripe Checkout (hosted)  →  /dashboard?subscribed=true
                     ↓                           ↓
             (Stripe webhook fires)      (Welcome modal — see post-checkout-welcome spec)
                     ↓
          /api/stripe/webhook → mark subscription active in profiles
```

---

## Screen-by-Screen

### 1. Pricing Page (`/pricing`)

#### State: Default
- Toggle between Monthly / Annual (default: Monthly)
- Annual badge: "Save 17%" (2 months free)
- Two plans: Starter ($29/mo) and Family ($49/mo, "Most Popular" amber badge)
- Each plan: name, price, feature list, "Start free trial" CTA
- Family plan: slightly elevated card treatment (amber accent, larger presence)
- Footer: "7-day free trial · No card charged today · Cancel anytime"

#### ⚠️ Issue Found: No Error State
The current code does `console.error` when checkout fails and clears the loading state — but shows the user **nothing**. A family clicks "Start free trial," the network call fails, and the button silently re-enables with no explanation.

**Required fix (task #51):**
Add an inline error message below the plan cards when checkout fails:
```
⚠️  Something went wrong starting your trial. Please try again or contact support.
```
- Color: `text-rose/80`
- Font: Geist, text-sm
- Should clear on next click attempt

#### ⚠️ Issue Found: `console.error` in Production
Line 83 of `pricing/page.tsx`: `console.error("Checkout error:", err)` — this should be gated behind `NODE_ENV !== 'production'` like the invite routes. File as tech debt.

#### State: Loading (after CTA tap)
- Button shows a subtle loading state — spinner inside button text or button text changes to "Sending you to checkout…"
- Button becomes disabled to prevent double-tap
- The other plan's button also becomes disabled (can't be selecting two plans)

#### State: Unauthenticated User
- Current behavior: redirect to `/signup` if `!user`
- **Recommendation:** Instead of silently redirecting, show the user a message: "Create your free account first — it only takes 30 seconds." Link to `/signup?next=/pricing`
- After signup, redirect back to `/pricing` so they can complete the purchase
- The `?next=/pricing` redirect should be honored by the auth callback

---

### 2. Stripe Checkout (Hosted)

Kin uses Stripe's hosted checkout — we control the experience via the Stripe dashboard:
- **Brand colors:** Set Stripe checkout accent to `#7CB87A` (primary green)
- **Logo:** Use Kin wordmark (Instrument Serif Italic "Kin" rendered as image)
- **Trial messaging:** Stripe should clearly show "7-day free trial — $0 today"
- **After payment:** Stripe redirects to `/dashboard?subscribed=true` (success URL)
- **Cancel URL:** Stripe redirects to `/pricing` if user abandons checkout

**Stripe configuration checklist (for Lead Eng):**
- [ ] `success_url` = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscribed=true`
- [ ] `cancel_url` = `${process.env.NEXT_PUBLIC_APP_URL}/pricing`
- [ ] `trial_period_days` = 7 on the price
- [ ] Webhook: `customer.subscription.created` → mark `profiles.subscription_status = 'trialing'`
- [ ] Webhook: `customer.subscription.updated` → update status as it transitions
- [ ] Webhook: `invoice.payment_succeeded` → mark `profiles.subscription_status = 'active'`
- [ ] Webhook: `customer.subscription.deleted` → mark `profiles.subscription_status = 'canceled'`

---

### 3. Post-Checkout Landing (`/dashboard?subscribed=true`)

Handled by the welcome modal — see `docs/specs/post-checkout-welcome.md`.

One gap: the welcome modal currently says "7-day trial active — you won't be charged until [date]" using `today + 7 days` as a fallback. Once the webhook stores `trial_end_at` on the profile, this should read from the profile. Lead Eng TODO is already tracked in dashboard/page.tsx with a comment.

---

## Subscription Status States

The app needs to handle the following `subscription_status` values on `profiles`:

| Status | What it means | UX behavior |
|--------|--------------|-------------|
| `null` / `free` | No subscription attempt | Show upgrade banner in dashboard (future) |
| `trialing` | Active 7-day trial | Full access, trial badge in settings |
| `active` | Paid subscription | Full access |
| `past_due` | Payment failed | Show warning in dashboard, prompt retry |
| `canceled` | Subscription ended | Lock premium features, show resubscribe CTA |

**Note for Product:** None of the above states beyond `trialing`/`active` are currently handled in the UI. This is acceptable for Phase 1 (no real paying customers yet), but `past_due` and `canceled` states must be handled before Phase 3 (launch).

---

## E2E Test Plan (for task #5)

### Setup
1. Stripe test mode must be active (use Stripe test key in `.env.local`)
2. Stripe webhook forwarded locally via `stripe listen --forward-to localhost:3000/api/stripe/webhook`
3. Use Stripe test card: `4242 4242 4242 4242`, any future expiry, any CVC

### Happy Path
1. Visit `/pricing` as an authenticated user
2. Click "Start free trial" on the Family plan
3. Verify: loading state appears on button, other button disabled
4. Verify: redirected to Stripe hosted checkout
5. Complete checkout with test card
6. Verify: redirected to `/dashboard?subscribed=true`
7. Verify: welcome modal appears with correct name and trial date
8. Verify: `profiles.subscription_status = 'trialing'` in Supabase
9. Dismiss modal, verify: URL becomes `/dashboard` (param removed)

### Error Cases
1. **Network error during checkout initiation**: Kill network, click CTA → verify error message appears (currently broken — see #51)
2. **Unauthenticated user**: Sign out, visit `/pricing`, click CTA → verify redirect to signup with `?next=/pricing`
3. **Stripe checkout abandoned**: Start checkout, click Back → verify redirect to `/pricing`
4. **Webhook fires before user lands**: Simulate rapid webhook delivery → verify `subscribed=true` param still triggers modal (modal reads URL, not DB state, so this should always work)

---

## Design Notes

- The pricing page should feel like the product — dark background (#0C0F0A), warm white text, generous spacing
- "Most Popular" badge on Family plan: use Amber (#D4A843) to draw the eye
- Price display: numbers in Geist Mono for weight and authority
- Feature checkmarks: Primary green (#7CB87A) checkmark icons
- CTA: "Start your free trial" (not "Subscribe") — reduces anxiety, emphasizes free trial

---

## Acceptance Criteria

- [ ] Clicking "Start free trial" shows a loading state and disables both CTA buttons
- [ ] A successful checkout redirects to `/dashboard?subscribed=true` and triggers the welcome modal
- [ ] A failed checkout initiation shows an inline error message (not silent failure)
- [ ] An unauthenticated user is sent to `/signup?next=/pricing` and returned to `/pricing` after auth
- [ ] Stripe webhook marks `subscription_status = 'trialing'` on the profile
- [ ] Stripe `success_url` and `cancel_url` are correctly configured
- [ ] `console.error` on pricing page gated behind `NODE_ENV !== 'production'`

---

_— Product & Design Lead, 2026-04-02_
