# Kin AI — Chief of Staff Daily Briefing
**Date:** Thursday, April 2, 2026
**Delivered by:** Chief of Staff Agent
**Austin's required time:** ~15 minutes this morning

---

## Situation Summary

Today is Day 1 of the 2-Week iOS Launch Sprint. The vision is locked. The scope is clear. The agents are oriented. The clock starts now.

Yesterday's work produced four documents that change the operating picture entirely: `kin-product-vision-v2.md` (11 domains, full spec), `agent-context-brief.md` (shared context for all agents), and updated `sprint-board.md` and `phase-tracker.md` reflecting the 2-week parallel build plan. The team is briefed. The roadmap is on the wall. Target launch: **April 16, 2026**.

---

## What's on Track

- ✅ Vision v2 finalized and documented
- ✅ All 6 agent roles updated with new context
- ✅ Sprint board rebuilt with parallel tracks (A–E)
- ✅ Phase tracker updated with $39 single-tier financial model
- ✅ 79 subscribers = rent covered — that's the number

---

## What Needs You Today (3 Decisions, ~15 Minutes)

### Decision 1 — Confirm the 8 Pre-Build Prerequisites
*Austin's task: 10 minutes of account checks before any agent touches code*

Before the Lead Engineer can write a single line of code, these 8 things need to be confirmed or actioned. Most are just "log in and confirm it's set up." Two require action:

| # | Item | What You Need to Do |
|---|------|---------------------|
| P1 | Expo SDK 54 scaffold in `apps/mobile` | Open terminal: `ls /Users/austin/Projects/kin/apps/mobile` — confirm it exists |
| P2 | Supabase URL + service key | Log into supabase.com — copy the project URL and service role key for env vars |
| P3 | Anthropic API key | Confirm it's active at console.anthropic.com — note any rate limits |
| P4 | Google Cloud Calendar API v3 + OAuth client | Log into console.cloud.google.com — confirm Calendar API enabled and OAuth 2.0 client ID exists |
| P5 | Apple Developer push cert | Log into developer.apple.com — confirm APNs certificate is active for the Kin app bundle ID |
| **P6** | **RevenueCat products** | **ACTION NEEDED: Log into app.revenuecat.com — create two products: `kin_monthly_3999` ($39/month) and `kin_annual_29900` ($299/year)** |
| **P7** | **Stripe → Mercury** | **ACTION NEEDED: Log into stripe.com/settings/payouts — enter Mercury routing + account numbers. This is the last pending item from Phase 0.** |
| P8 | DNS: Namecheap → Vercel | Log into namecheap.com — confirm DNS records point to Vercel. If not set: update A record and CNAME per Vercel's instructions. |

**Recommendation:** Do this now, before your 9:30 (or whenever your morning work block starts). Send the Lead Engineer agent a thumbs-up once prerequisites are confirmed — that's the green light to begin Track A.

---

### Decision 2 — Lead Engineer's First Task
*Austin approves the build order: start immediately*

The Lead Engineer is ready to begin Track A — the Supabase schema, authentication, and core AI integration. This is the blocking dependency for everything else. Recommend you approve this now so work can begin without waiting for your evening review.

**Your call:** Approve Track A start → Lead Engineer begins Supabase schema build today.

If you have any changes to the schema or architecture from Section 6 of `kin-product-vision-v2.md`, flag them now. Once A1 (schema) is locked and RLS is built, structural changes become expensive.

---

### Decision 3 — Kill List Review
*One item being flagged for your input*

| Item | Why It's Flagged | CoS Recommendation |
|------|-----------------|-------------------|
| Android support | Currently listed as v2.0 (Month 2–3). Some early vision docs mention it alongside iOS. | **Confirm defer to post-launch.** iOS first. Android adds build time, doubles testing, and delays launch. Revisit when 100 paying iOS subscribers are achieved. |
| Web app (Next.js) as active build surface | The existing Next.js web app has bugs and outstanding work from Phase 0. Building both web and mobile simultaneously splits Lead Eng capacity. | **Confirm web is secondary surface only.** Maintain it, don't actively build it during the sprint. iOS is the product. Web is the waitlist page and a future desktop experience. |

**Your call:** Confirm both defers? Or is there a reason to prioritize either?

---

## Today's Agent Work Plan

Once Austin confirms prerequisites and approves Track A start, here is what runs today:

| Agent | Track | Task Today |
|-------|-------|-----------|
| Lead Engineer | A1 | Build complete Supabase schema per vision v2 Section 6. RLS on every table. Seed test household. |
| Product & Design Lead | — | Review `kin-product-vision-v2.md` Section 4 (iOS architecture) and draft the screen-by-screen spec for onboarding (Track B). Ready for Lead Eng by tomorrow. |
| QA & Standards Lead | — | Build the quality checklist for all 6 launch gates (allergy safety, privacy wall, briefing accuracy, notification delivery, brand compliance, trial conversion). |
| Business Operations Lead | — | Update financial model with $39 single-tier pricing. Prepare P&L projection for 79, 100, and 256 subscribers. Update accelerator application thresholds. |
| Brand & Growth Lead | — | Draft the first post-launch TikTok script: the morning briefing use case. Austin records and posts on launch day. |

---

## Upcoming Critical Path

| Date | What Must Be True |
|------|-----------------|
| Apr 5 (Day 3 EOD) | Track A complete. Supabase schema live, auth working, basic chat sending/receiving. If not: escalate. |
| Apr 7 (Day 5 EOD) | Onboarding complete. FVM briefing preview working. Calendar connection prompt live. |
| Apr 10 (Day 8 EOD) | At least 3 of 5 domain tracks (C1–C5) complete. Briefing engine has data to draw from. |
| Apr 12 (Day 10 EOD) | Morning briefing generating correctly from live connected data. App Store submission sent. |
| Apr 14 (Day 12 EOD) | QA gates passed. TestFlight distributed to beta users. |
| **Apr 16** | **Launch.** |

---

## One Thing You Should Know

The previous sprint board had the launch target as May 26 for first public availability. That was based on a sequential build model where one agent worked one thing at a time. The new model — 5 parallel agent tracks, 24/7 — compresses that to April 16.

**The risk worth flagging:** this timeline assumes Track A completes on schedule (Days 1–3). If schema or auth hits unexpected complexity and slips to Day 5, the parallel tracks are delayed two days and the launch moves to April 18. That's still fine. The timeline is aggressive but has a 2-day buffer before it starts affecting App Store review timing. Watch Track A closely.

---

## Your 15 Minutes This Morning

1. **Confirm prerequisites P1–P8** (check accounts, action P6 and P7)
2. **Approve Track A start** — send the green light to Lead Engineer
3. **Confirm Android defer + web-as-secondary** — two quick decisions from the Kill List

Everything else is running. The agents are briefed. The clock is ticking. Let's build.

---

*Next briefing: Friday, April 3, 2026 — will report Track A Day 1 progress and flag any blockers.*

*kin · The Mental Load, Handled. · Kin Technologies LLC · Confidential*
