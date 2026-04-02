# Spec: Post-Checkout Welcome State

**Filed by:** Product & Design Lead
**Date:** 2026-04-02
**Priority:** P1 — paying customers deserve a moment
**Platform:** Web (Next.js)
**Related:** Stripe checkout flow → `/api/stripe/checkout/route.ts`

---

## Problem

After a successful Stripe checkout, the user is redirected to:
```
/dashboard?subscribed=true
```

The dashboard **ignores this query param entirely.** A parent who just paid $49/month lands on their dashboard and sees... nothing different. No acknowledgment. No "you're in." No celebration.

This is the moment Kin earns trust. We're blowing it.

---

## User Story

> As a parent who just subscribed, I want to see a clear confirmation that my account is active so that I feel confident I made the right choice, and I know what to do next.

---

## Screen Flow

1. User completes Stripe checkout (credit card entered, payment confirmed)
2. Stripe redirects to `/dashboard?subscribed=true`
3. Dashboard detects `?subscribed=true` param
4. A **welcome modal or toast** appears over the dashboard

---

## Two Options — Pick One

### Option A: Inline Banner (Lower lift, ship fast)

A dismissible banner appears at the top of the dashboard when `?subscribed=true` is in the URL:

```
┌─────────────────────────────────────────────────────────────┐
│  ✓  Welcome to Kin, [First Name]. Your family is set up.    │
│     Your 7-day trial starts now. Enjoy.              [✕]    │
└─────────────────────────────────────────────────────────────┘
```

- Background: `#7CB87A` with 15% opacity, border `#7CB87A/30`
- Icon: CheckCircle in primary green
- Text: Geist, warm white
- Dismiss: X button, removes param from URL

**Pros:** Fast to build (< 30 min). On-brand. Non-blocking.
**Cons:** Easy to miss. No moment of delight.

### Option B: Welcome Modal (Recommended)

A centered modal appears on first load with `?subscribed=true`:

```
         ✦ Kin
  ─────────────────────────

  You're in.

  "Your family's week, handled."

  ──────────────────────────
  ✓  Your meal plan is ready
  ✓  Your budget is tracking
  ✓  Kin AI is listening

  [  Go to my dashboard  ]

  Your 7-day trial has started. You won't be charged
  until [date]. Cancel anytime.
  ─────────────────────────
```

- Modal background: `#1A1D17` (surface), `rounded-3xl`, soft shadow
- Headline: Instrument Serif Italic, 36px, warm white — "You're in."
- Subhead: Instrument Serif Italic, 18px, warm white/60 — the tagline
- Checklist: Geist, 3 items in primary green
- CTA: Full-width primary green button, "Go to my dashboard"
- Footer: Geist Mono for the trial end date, warm white/30

**Pros:** Emotionally resonant. Sets expectations. Doubles as a "you've activated" receipt.
**Cons:** Adds ~1h of eng time.

**Recommendation: Build Option B.** We only get one first payment. Make it feel like an Apple product, not a SaaS subscription form.

---

## Interactions

| Action | Response |
|--------|----------|
| Page loads with `?subscribed=true` | Modal appears with subtle scale-in animation |
| Click "Go to my dashboard" | Modal closes, `?subscribed=true` removed from URL |
| Click outside modal | Do nothing — user must confirm they've seen it |
| Press ESC | Close modal (accessibility) |
| Page reloads without param | Modal does not reappear |

---

## States

| State | What user sees |
|-------|---------------|
| `?subscribed=true` in URL | Welcome modal (Option B) |
| Param missing | Normal dashboard (no change) |
| Modal visible | CTA button, trial info |
| Modal dismissed | Dashboard loads normally |

---

## Data Needed

- `user.display_name` or `family_members.name` (adult) — for greeting
- Trial end date: `subscription.trial_end` from Stripe webhook (stored in `profiles.subscription_status` or similar)
  - If not available: calculate as today + 7 days

---

## Acceptance Criteria

- [ ] `?subscribed=true` after Stripe redirect shows welcome modal/banner
- [ ] Modal greets user by first name
- [ ] Trial end date shown in Geist Mono format: "Apr 9, 2026"
- [ ] Dismissing modal removes `?subscribed=true` from URL (no re-trigger on refresh)
- [ ] Modal does not appear on subsequent visits to `/dashboard`
- [ ] Accessible: ESC key closes modal, focus trapped inside while open

---

## Design Notes

- The "You're in." headline should feel earned — weight and whitespace matter. Don't cram it.
- The checklist is NOT a features list. It's a confidence builder: "yes, your stuff is ready."
- Geist Mono on the trial date makes it feel like a receipt — intentional, real.
- Ambient glow behind the Kin icon (same `bg-primary/5 blur-[120px]` pattern from invite page)
- No confetti, no animations beyond the entry motion. Premium = restraint.

---

## Implementation Note

The dashboard (`app/(dashboard)/dashboard/page.tsx`) is already a client component (added for greeting personalization in #28). Adding `useSearchParams()` and a modal state is a small addition.

_— Product & Design Lead, 2026-04-02_
