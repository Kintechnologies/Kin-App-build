# Kin AI — Sprint Board

**Current Phase:** Phase 0 → Phase 1 Transition
**Sprint:** Week of April 1, 2026
**Last Updated:** 2026-04-01

---

## Phase 0 Exit Checklist

| # | Task | Status | Owner | Notes |
|---|------|--------|-------|-------|
| 1 | Daily briefing running | ✅ Done | CoS | First briefing delivered 2026-04-01 |
| 2 | Sprint backlog for Phase 1 defined | ✅ Done | CoS + Lead Eng | See Sprint Backlog below |
| 3 | Waitlist collecting signups | ⬜ Not started | Brand & Growth | kinai.family needs Vercel deploy + DNS |
| 4 | All accounts and infrastructure configured | 🟡 Partial | Business Ops | Supabase ✅, Stripe ⬜ (waiting Mercury), Vercel ⬜, Apple Dev ✅, Google Play ✅ |
| 5 | Git repo current on GitHub | 🟡 Committed locally | Lead Eng | Austin needs to `git push origin main` |
| 6 | Operational artifacts created | ✅ Done | CoS | Sprint board, kill list, briefing template |

---

## Phase 1 Sprint Backlog — Core App MVP

**Goal:** A real family can sign up, complete onboarding, get a personalized meal plan, view grocery list, enter budget data, and invite a partner. Stripe checkout + 7-day trial working.

**Priority order** (sequenced by dependency + user impact):

### P0 — Ship Blockers

| # | Task | Status | Owner | Est. | Notes |
|---|------|--------|-------|------|-------|
| 1 | Deploy web app to Vercel | ⬜ | Lead Eng | 1h | Next.js monorepo config, env vars |
| 2 | Connect kinai.family domain (Namecheap → Vercel) | ⬜ | Lead Eng + Austin | 30m | DNS propagation may take hours |
| 3 | Fix web app build errors (monorepo paths) | ⬜ | Lead Eng | 2h | Verify `npm run build` passes in apps/web |
| 4 | Stripe Connect to Mercury bank | ⬜ | Austin (HUMAN) | 15m | Waiting on Mercury routing/account numbers |
| 5 | Test Stripe checkout end-to-end (test mode) | ⬜ | Lead Eng | 1h | Pricing page → checkout → webhook → subscription active |

### P1 — Core Experience

| # | Task | Status | Owner | Est. | Notes |
|---|------|--------|-------|------|-------|
| 6 | Verify onboarding → meal plan flow works e2e on web | ⬜ | Lead Eng + QA | 2h | The First Value Moment — must be flawless |
| 7 | Verify chat works e2e on web (AI responses, persistence) | ⬜ | Lead Eng + QA | 1h | Anthropic API key configured in Vercel env |
| 8 | Verify budget flow works e2e on web | ⬜ | Lead Eng + QA | 1h | |
| 9 | Test partner invite flow on web | ⬜ | Lead Eng + QA | 1h | Join link, dual profile creation |
| 10 | Mobile app: wire API calls to web backend | ⬜ | Lead Eng | 4h | Replace any mocked data with real Supabase calls |
| 11 | Mobile app: test on physical device via Expo Go | ⬜ | Lead Eng + Austin | 1h | Verify all 5 tabs, auth, theme |

### P2 — Polish & Quality

| # | Task | Status | Owner | Est. | Notes |
|---|------|--------|-------|------|-------|
| 12 | BottomNav rendering in dashboard layout (known bug) | ⬜ | Lead Eng | 30m | |
| 13 | Post-onboarding redirect → /dashboard (not /meals) | ⬜ | Lead Eng | 15m | |
| 14 | Brand audit — all screens match brand guide | ⬜ | Product & Design | 2h | Typography, colors, spacing |
| 15 | Error handling audit — all API routes | ⬜ | QA | 2h | Graceful failures, user-facing messages |
| 16 | Accessibility pass — color contrast, touch targets | ⬜ | QA | 1h | |

### P3 — Deferred (Not This Sprint)

| # | Task | Notes |
|---|------|-------|
| — | Calendar sync (Google + Apple) | API routes exist, needs OAuth setup + testing |
| — | RevenueCat mobile billing | After web Stripe is proven |
| — | Push notifications | After mobile TestFlight |
| — | Voice input | After core chat is solid |
| — | Referral program activation | After 50 paying families |

---

## Velocity Notes

_First sprint — no historical velocity data. Will calibrate after Week 1._
