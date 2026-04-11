# Kin AI — Agent Context Brief
### Read This First. Every Session.

**Last Updated:** April 2, 2026 (evening — iOS-first directive confirmed by Austin)
**Maintained by:** Chief of Staff Agent

---

## What You Are

You are one of six AI agents on the founding team of Kin Technologies LLC. You are not a general-purpose assistant. You have a specific role, a specific mandate, and a specific quality bar. This document tells you everything you need to orient quickly and start working correctly.

The six roles are:
1. **Chief of Staff / Operations** — coordination, daily briefing, sprint tracking, kill list
2. **Lead Engineer** — all code (React Native/Expo, Supabase, Anthropic API, Stripe/RevenueCat)
3. **Brand & Growth Lead** — content, voice, acquisition (Austin-led, agent-assisted)
4. **Product & Design Lead** — feature specs, UX quality, design system enforcement
5. **Business Operations Lead** — revenue tracking, cost monitoring, legal compliance
6. **QA & Standards Lead** — testing, brand consistency, deploy gates

Your full role mandate is in `kin-founding-team-blueprint.md`. Read your role section before any session where you're executing role-specific work.

---

## What Kin Is (The Current Vision — v2, April 2026)

Kin is the AI that knows your entire life.

Not a family calendar. Not a meal planner. Not a budgeting tool. All of those things, plus fitness, commute intelligence, work awareness, kids logistics, pet care, and home management — connected by a single AI that synthesizes all of them into one daily briefing and proactive suggestions.

The core product insight: no app today connects these life domains. A parent's schedule, their budget, their commute, their workout goals, their kid's soccer practice, their dog's vet appointment — all separate apps, none talking to each other. Kin is the one brain with full context across all of it.

**The morning briefing is the proof of concept and the daily retention driver:**
> *"Morning. Leave for the gym by 5:55 — 315 is backed up, take 670. Your 9:30 team sync is in 3 hours — you flagged the product brief for prep. Your wife's 6pm runs late — you've got pickup. Practice ends at 7, bedtime is 8:30. You're $23 under grocery budget. Chipotle?"*

That sentence touches commute, fitness, work calendar, partner coordination, kids logistics, and budget. No competitor can generate it. Kin does, every morning.

**Full vision document:** `kin-product-vision-v2.md` — read this before making any product, engineering, or positioning decision.

---

## What Changed in Vision v2 (April 2, 2026)

If you have prior context from before April 2, 2026, these are the important changes:

| What Changed | Old | New |
|---|---|---|
| **Product scope** | Family calendar + meals + budget | Full life OS — 11 domains |
| **First Value Moment** | Meal plan (3 min onboarding) | Daily family schedule (60 sec conversational onboarding) |
| **Pricing** | $29/month Starter + $49/month Family | **$39/month, one tier, everything included** |
| **Annual option** | $290/year or $490/year | **$299/year ($24.92/month effective)** |
| **Rent target** | 70 subscribers at $49 | **79 subscribers at $39** |
| **Build timeline** | 4–6 weeks sequential | **2 weeks parallel agent tracks** |
| **Platform** | Web first → mobile | **iOS first — mobile is the product** |

---

## The 11 Life Domains

Each domain has a full spec in Section 2 of `kin-product-vision-v2.md`. Summary for quick reference:

| Domain | Color | What It Does | MVP? |
|--------|-------|-------------|------|
| A. Daily Schedule & Calendars | #A07EC8 | 2-way sync Google + Apple, read-only work calendar, household merge, conflict detection | ✅ v1.0 |
| B. Partner & Family Coordination | #A07EC8 | Whose turn, shared to-dos, logistics gap detection | ✅ v1.0 |
| C. Commute & Traffic Intelligence | #7AADCE | Departure time, route alt, leave-by push notification | ✅ v1.0 (static) / v1.1 (real-time) |
| D. Work Awareness | #7AADCE | Read-only work calendar, meeting prep nudges, email task reminders | ✅ v1.0 |
| E. Fitness & Health | #7AADCE | Chat-based workout log, progressive overload, deload recs, window suggestions | ✅ v1.0 |
| F. Nutrition & Meal Planning | #7CB87A | AI meal plan, allergy-safe (CRITICAL), budget-aware, grocery list, ratings | ✅ v1.0 |
| G. Kids | #E07B5A | Profiles, activities, allergies → meals, school schedule → calendar, appointment reminders | ✅ v1.0 |
| H. Pets | #D4748A | Vet appointments, vaccinations, medications with one-tap confirmation | ✅ v1.0 |
| I. Budget & Financial Awareness | #D4A843 | Manual entry, category budgets, shared view, overspend alerts, subscription audit | ✅ v1.0 |
| J. Date Night & Relationship | #A07EC8 | 14-day trigger, free window detection, two-option suggestions, calendar blocking | ✅ v1.0 |
| K. Home Management | #D4A843 | Subscription audit, maintenance reminders, seasonal tasks | ✅ v1.0 (basic) |

---

## Architecture That Cannot Change

These are structural decisions. They are not up for debate. Any agent or feature that violates them creates a bug that breaks the product's core trust model.

**1. Dual private parent profiles + shared household layer**
- Each parent has their own Supabase auth session and `parent_id`
- Private data (fitness, individual transactions, personal AI thread, wellness goals) has `parent_id` FK with strict RLS — readable only by that parent
- Shared data (budget category totals, meals, grocery list, kids, pets, calendar merged view) has `household_id` FK — readable by both parents
- **The other parent can NEVER access private data through any API route, query, or AI response. Zero exceptions.**

**2. Allergy safety is non-negotiable**
- All children's allergies are stored in `children_allergies` table
- Every single meal planning API call to Claude MUST include the full allergy context in the system prompt
- A dairy or egg suggestion for an allergic child is a health hazard, not a UI bug
- The allergy enforcement check is hardcoded into the meal generation function — it is never optional, never a feature flag

**3. Irreversible actions require confirmation**
- Adding to a list, sending a message, logging a workout: Kin can do without asking
- Canceling a subscription, rescheduling an event, deleting a plan: ALWAYS requires explicit user confirmation before executing
- Kin never says "I deleted that" — Kin always says "Want me to delete that?" and waits

**4. The AI voice is always warm, direct, specific, human**
- No hedging ("I think", "perhaps", "you might want to consider")
- Always specific numbers ("$143 of $180" not "most of your budget")
- One question per response maximum
- Never corporate language (leverage, optimize, synergize)
- Full rules in `Kin_System_Prompt_v1.md`

---

## Tech Stack

| Layer | Tool | Notes |
|-------|------|-------|
| Mobile | React Native / Expo SDK 54 | iOS first. `apps/mobile` directory. |
| Web | Next.js 14 | Secondary surface. `apps/web`. |
| Database | Supabase (Postgres + Auth + Realtime) | All data here. RLS enforced on every table. |
| AI | Anthropic Claude API (`claude-sonnet-4-20250514`) | Every Kin AI response. |
| Payments (mobile) | RevenueCat | `$39/month` and `$299/year` products. |
| Payments (web) | Stripe | Same pricing. Recommend web to save 15% Apple fee. |
| Calendar (Google) | Google Calendar API v3 | OAuth 2.0. Webhooks for real-time sync. |
| Calendar (Apple) | CalDAV via `tsdav` npm package | App-specific password. 15-min poll. |
| Push notifications | Expo / APNs | `expo-notifications`. Tokens in `push_tokens` table. |
| Hosting | Vercel | Web app and API routes. |
| Commute (v1.0) | Google Maps Distance Matrix API | Static estimates. No real-time yet. |
| Analytics | PostHog | Funnel and retention tracking. |
| Repo | GitHub: `Kintechnologies/Kin-App-build` | Local path: `/Users/austin/Projects/kin` |

---

## Brand Non-Negotiables

All visual output must comply with Brand Guide v2 (`Kin_Brand_Guide_v2.md`). Quick reference:

| Element | Rule |
|---------|------|
| Background | #0C0F0A always. Never white. |
| Primary CTA | #7CB87A (brand green). Never another color for buttons. |
| Domain colors | Each domain has one color — never swap them (see table above) |
| Wordmark | Instrument Serif, italic, lowercase "kin" — never "KIN" in marketing |
| Body copy font | Geist |
| System labels | Geist Mono |
| Voice | Warm, direct, specific, human. No jargon. |
| Tagline | "The Mental Load, Handled." — always |

---

## Pricing (Updated April 2, 2026)

**One tier. No decision required from the user.**

| | Monthly | Annual |
|---|---|---|
| Customer pays | $39/month | $299/year |
| Effective monthly (annual) | — | $24.92/month |
| Net after Apple 15% cut | $33.15/month | $254.15/year |
| **Subscribers to cover rent** | **79** | — |

When building any billing UI, paywall, or pricing reference: $39/month and $299/year are the ONLY two prices. The old $29/$49 split is dead. Do not reference it.

---

## Platform Priority — READ THIS FIRST

**iOS is the ONLY platform that matters right now.**

Austin confirmed April 2, 2026: iOS first. All engineering work targets `apps/mobile` (React Native / Expo SDK 54). The web app (`apps/web`) is a secondary surface — do NOT build new features there. Do NOT prioritize web fixes over mobile work. If you find yourself writing to `apps/web`, stop and redirect to mobile unless it is a shared API route that the mobile app depends on.

**The test:** Would a real family — no laptop, just iPhone — be able to complete onboarding, receive a morning briefing, plan meals, log a workout, and manage their budget entirely through the iOS app? If the answer is yes, you're building the right thing.

---

## Current Build Status (April 3, 2026 — Day 2 Completion Review + Status Corrections)

**Phase:** 2-Week iOS App Sprint — **Day 2 COMPLETE** (Tracks A–D shipping in working tree)
**Target launch:** April 16, 2026
**Real project path:** `/Users/austin/Projects/kin`

⚠️ **CRITICAL: GIT STATE — AUSTIN ACTION REQUIRED BY END OF DAY 3**
The project has 2 commits not pushed + 35+ untracked/modified files (all Days 1–2 work). Austin must commit + push before Lead Eng can build Track E.

```bash
cd /Users/austin/Projects/kin
git add -A
git commit -m "feat: Family OS foundations — Tracks A-D complete (migrations 013–020, domains, briefing, AI, push)"
git push origin main
```

**Day 2 Velocity Summary:**
| Track | What | Status |
|-------|------|--------|
| A | Supabase schema (migrations 013–020) + Core AI (kin-ai.ts) + Push notifications | ✅ Complete (working tree) |
| B | Onboarding (5-step FVM) + CalendarConnectModal + Home screen briefing card | ✅ Complete (working tree) |
| C1 | Calendar sync (Google + Apple, conflicts, RLS) | ✅ Complete (pushed) |
| C2 | Meals domain | ✅ 95% complete — allergy gen ✅, grocery sync ✅; budget-aware + quick meal pending |
| C3 | Budget (categories, summary view, transaction modal, overspend push) | ✅ Complete (working tree) |
| C4 | Kids + Pets (family.tsx full CRUD, allergies, activities, vet/meds, med reminders C4.6 ✅, vax reminders C4.7 ✅) | ✅ 95% complete — kids appt push C4.3 only remaining gap |
| C5 | Fitness (fitness.tsx, private, goals, workout logging, progressive overload C5.3 ✅) | ✅ Complete |
| D | Intelligence layer (morning briefing, commute, date night, departure push D4 ✅ all built) | ✅ 95% complete — partner coordination push D7 only remaining gap |
| **E** | **Billing + App Store** | **⬜ NOT STARTED — P0 BLOCKER** |

**What Austin needs to do immediately (not agent tasks):**
1. **URGENT (by end Day 3):** Commit + push working tree
2. **Configure RevenueCat:** Create products `kin_monthly_3999` ($39/mo) + `kin_annual_29900` ($299/yr); add `EXPO_PUBLIC_REVENUECAT_API_KEY` to `apps/mobile/.env`
3. **Stripe payout:** Enter Mercury routing/account numbers in Stripe Dashboard (for prod checkout)
4. **Optional cleanup:** Remove duplicate `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` (localhost overrides kinai.family in dev; can stay for now)

**Next engineering priorities (updated 2026-04-03 17:30 — CoS audit corrected statuses):**

**⚠️ STATUS CORRECTION:** Tasks C5.3, D4, C4.6, C4.7 are DONE in working tree. Previous priority list was stale. See sprint-board.md for details.

**CRITICAL PATH — Unblock Track E:**
1. **Austin:** Commit + push working tree (git add -A, git commit, git push) — **BLOCKS EVERYTHING ELSE**
2. **Austin:** Configure RevenueCat — create products `kin_monthly_3999` + `kin_annual_29900`, add `EXPO_PUBLIC_REVENUECAT_API_KEY` to `apps/mobile/.env`

**Lead Eng — once git is clean:**
3. **Track E (P0)** — RevenueCat paywall + 7-day trial arc (mobile only, `apps/mobile` only — do NOT touch `apps/web` UI). Build E1–E5 with real RevenueCat key; test on physical device. This is the entire launch gate.
4. **C4.3** — Kids healthcare appointment push reminders (data model exists; push logic is the only remaining gap in C4)
5. **C2.2/C2.3** — Budget-aware meal planning (feed grocery_budget into meal gen prompt) + grocery auto-gen
6. **D7** — Partner coordination push trigger (calendar_conflicts table + conflict detection already built; push notification trigger pending)
7. **L1–L10** — End-to-end testing + quality gates (Days 13–14)

Full sprint board: `sprint-board.md`
Full phase tracker: `phase-tracker.md`
Full build spec: Section 6 of `kin-product-vision-v2.md`

---

## What Austin Does vs. What Agents Do

**Austin (human, 2–3 hrs/day):**
- Reviews and approves every deploy to production
- Approves any spending decision (any amount)
- Records and publishes all video content
- Writes and sends all outreach messages (DMs, emails to influencers/press)
- Makes final strategic calls when options are presented
- Connects Stripe to Mercury bank account (requires his login)
- Reviews daily briefing each morning (7am) — this is the 15 minutes that directs the day

**Agents (autonomous within their mandate):**
- Everything in code: write, test, deploy to staging
- All documents, specs, reports, briefings
- Data analysis and metric monitoring
- Feature spec writing and design system enforcement
- Content drafts (scripts, captions, email copy) — Austin approves before publishing
- QA testing and quality gates

**When in doubt:** agents do the work and surface a decision to Austin. Agents do not make unilateral decisions on product scope, pricing, external communications, or spending. They prepare options with a recommendation, and Austin decides.

---

## Key Files Reference

| File | What It Is |
|------|-----------|
| `kin-product-vision-v2.md` | **The authoritative product spec. Read before any product decision.** |
| `kin-founding-team-blueprint.md` | Role mandates, decision authority, operating rhythm for all 6 roles |
| `sprint-board.md` | Current sprint tasks, status, and ownership |
| `phase-tracker.md` | Phase timeline, milestones, and financial targets |
| `kill-list.md` | Features/tasks recommended for cut, simplification, or deferral |
| `Kin_Brand_Guide_v2.md` | Visual identity, voice, color system — enforced on everything |
| `Kin_System_Prompt_v1.md` | Kin's AI personality, behavior rules, memory model |
| `Kin_ClaudeCode_BuildBrief_v1.md` | Calendar sync technical spec (2-way Google + Apple) |
| `Kin_Competitor_Matrix.md` | How Kin compares to Cozi, YNAB, Monarch, Mealime, Copilot |
| `kin-ios-first-value-moment-spec.md` | Schedule FVM spec, trial arc, conversion benchmarks |
| `kin-ios-build-plan.md` | React Native / Expo architecture and framework rationale |
| `agent-context-brief.md` | **This file. Re-read at the start of every session.** |

---

*kin · The Mental Load, Handled. · Kin Technologies LLC · Confidential*
