# Design Session Log — April 3, 2026
**Product & Design Lead · Automated session**

---

## Sprint State Read

**Day:** 2 of 14
**Tracks A–D:** 95%+ complete across all domains
**Track E (Billing):** NOT STARTED — P0 blocker

Critical blocker Austin must resolve before Lead Engineer can begin Track E:
```bash
cd /Users/austin/Projects/kin
git add -A
git commit -m "feat: Family OS foundations — Tracks A-D complete"
git push origin main
```

Then: create RevenueCat products + provide `EXPO_PUBLIC_REVENUECAT_IOS_KEY`.

---

## Outputs This Session

### 1. Settings Screen Component Spec
**File:** `docs/design/settings-spec.md`

Complete component spec for the Settings screen — the third and final main tab. Covers all 7 sections (Profile, Family, Calendars, Kin Memory, Notifications, Subscription, About), all TypeScript prop interfaces, all states (loading, empty, error, trial active, trial expired, subscribed), brand token application, spacing rules, and navigation targets.

**Priority for Lead Engineer:** Build this alongside Track E. The Subscription section is the link point between the paywall and the in-app settings experience.

### 2. Trial Arc UX & Copy Spec
**File:** `docs/design/trial-arc-spec.md`

Complete spec for the 7-day trial arc — the conversion program that runs from Day 0 (onboarding FVM) through Day 7 (hard paywall). Covers:
- Day-by-day trigger conditions and what surfaces on each day
- Exact copy for every arc-initiated message (FVM, push notifications, check-in cards, Day 6 loss preview, Day 7 conversion summary)
- Implementation checklist for Supabase schema, cron changes, new components, and `_layout.tsx` logic
- Suppression rules (arc never overrides High-priority coordination alerts)
- Tone compliance per §8 and §19 of the intelligence engine

**Priority for Lead Engineer:** This IS Track E4 (trial arc) — build from this spec directly.

---

## Open Engineering Issues (From Previous UX Audit — Unresolved)

From `specs/ux-audit-apr3-2026.md`, these have not been fixed:

| # | Issue | File | Priority |
|---|-------|------|----------|
| A | Budget card compares spend to monthly income, not category limits | `index.tsx` lines 198–229 | High — visible to every user |
| B | Calendar events hardcoded to `[]` — schedule card always shows empty state | `index.tsx` line 248 | P0 — breaks core Today screen |
| C | N+1 query on thread list load (21 queries for 20 threads) | `chat.tsx` lines 112–148 | Medium — performance issue |
| D | Fitness progress bar always 0% or 100% (formula bug) | `fitness.tsx` lines 456–471 | High — visible metric is wrong |
| E | Onboarding completion shows 38% for fully-onboarded users | `index.tsx` lines 209–224 | Medium — degrades trust |

**Issue B is P0** — the Today screen is the flagship screen and the schedule card is always empty for every user. Fix before TestFlight.

---

## What Needs Design Next

In priority order:

1. **Conversations Screen Component Spec** — `chat.tsx` is built but not spec'd against the product spec. The Conversations list (auto-title, unread badge, pinned household thread, + button) and the conversation types (Personal vs. Household) need a formal spec to ensure the built screen matches intent.

2. **Today Screen Tone Review** — Once Issue B (calendar events) is fixed, review the assembled Today screen for briefing card hierarchy (briefing card must visually dominate), alert placement, and check-in card copy against §8 of the intelligence engine.

3. **App Store Listing Copy** — E6 in the sprint. Screenshot descriptions, app description, and search keywords. Target: Day 10.

---

## Brand Compliance Note

All specs produced today use the following token set — Lead Engineer should confirm these match current `constants/Colors.ts` or equivalent:

| Token | Value |
|---|---|
| Background | `#0C0F0A` |
| Surface | `#141810` |
| Primary text | `#F0EDE6` |
| Muted text | `rgba(240,237,230,0.4)` |
| Accent / CTA | `#7CB87A` |
| Warning | `#E8875A` |
| Danger | `#E57373` |
| Font (labels) | Geist-SemiBold |
| Font (body) | Geist |
| Font (brand mark) | Instrument Serif italic |

---

*kin · The Mental Load, Handled. · Kin Technologies LLC · Confidential*
