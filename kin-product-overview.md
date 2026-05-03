<div align="center">

# Kin

### The AI Chief-of-Staff for Modern Families

**Product Overview · May 2026**

*Kin Technologies LLC · kinai.family*

---

</div>

## The Problem: The Coordination Tax

Every morning, in 35 million dual-income American households, the same invisible work happens. One parent — statistically, the mother — runs a mental simulation that no app can run for them:

> *Traffic is bad, so I need to leave earlier. But if I leave earlier I skip the gym. I have a 9:30 I need to prep for. My partner has a late meeting so I need to figure out pickup. The pediatrician moved to 4pm. And dinner is still undecided.*

This is the **mental load** — the cognitive overhead of coordinating two adults, multiple children, overlapping calendars, and unpredictable schedules across a shared life. It's exhausting, it's invisible, and it's the number-one source of friction in working-parent households.

The industry has tried to solve it. Every solution has failed for the same reason.

**Family apps require both parents to download and use them.** Cozi, FamilyWall, OurHome, Skylight — each one dies from the same cause: adoption decay. One parent downloads the app, adds the events, manages the data. The other never opens it. The product becomes another chore for the parent already doing the most. Skylight even built a $169 hardware calendar to sidestep the app problem — and families still abandon it.

**General AI assistants work for individuals, not groups.** ChatGPT, Poke, Airstitch — you text them, they do things for you. But "you" is one person. They don't read both parents' calendars. They don't detect conflicts between two schedules. They don't assign ownership. The output is personal, not shared.

The result: the status quo isn't a competing product. It's ad-hoc texting between partners, with one person silently carrying the entire coordination burden.

---

## The Solution: Kin

**Kin is the first AI coordination layer built for groups, delivered through SMS.**

No app to download. No dashboard to check. No behavior change required. Kin reads both parents' calendars, watches for conflicts and risks, and texts each parent a merged daily game plan at 6am — with ownership clearly assigned, conflicts flagged, and decisions surfaced before they become emergencies.

Parents text back to ask questions, update plans, or hand off responsibilities. Kin responds with full household context and follows up when something is at risk.

The insight behind Kin is simple: **the channel is the product.** Not features, not UI, not visualization. The constraint on every family coordination tool is behavior change — and SMS removes it entirely. Every parent already knows how to text. Open rates on SMS exceed 95%. There is nothing to learn, nothing to install, nothing to remember to check.

Both parents are coordinated from day one, because both parents receive the same briefing. Neither has to adopt anything new. The coordination tax drops to zero.

<!-- Screenshot: kinai.family landing page hero — dark background, SMS mockup showing a 6:02am briefing about daycare pickup coordination, headline "Your family's daily game plan, delivered by text." -->

> **[Landing Page — kinai.family]** The hero section features a phone mockup showing a real Kin SMS conversation: a 6:02am briefing about pickup coordination, followed by a parent's follow-up question and Kin's contextual reply. The headline reads: *"Your family's daily game plan, delivered by text."*

---

## Key Features

### The 6am Morning Briefing

Every morning, each parent receives a personalized SMS briefing. It's not a list of calendar events — it's a **coordination-aware game plan** that synthesizes both parents' schedules, identifies who handles what, and flags anything that needs a decision.

A real briefing looks like this:

> *"Morning. Here's today — Emma's got soccer at 4. You're back-to-back until 4:30 — but Sarah's clear after 3, she could grab pickup. Say the word and I'll loop her in. Heads up: dinner's still TBD — you haven't decided since Tuesday. Want a few options?"*

Every sentence does work. The briefing doesn't just tell you what's happening — it tells you what to do about it.

### AI-Powered Conflict Detection

Kin continuously monitors both parents' calendars for schedule conflicts, pickup gaps, and logistical risks. When Kin spots a problem — a late-running meeting that threatens daycare pickup, a double-booked evening, a gap in kid coverage — it flags it proactively, before it becomes an emergency.

This is the core difference from passive calendar tools. Kin doesn't wait for you to notice the problem. It notices for you.

### Conversational SMS Interface

Kin isn't a one-way notification system. Parents text back anytime — to ask questions, update plans, confirm handoffs, or delegate. Kin responds in seconds with full household context.

- *"Can she still do pickup if her meeting ends on time?"*
- *"I'll keep an eye on her 5pm and text you by 4:30. If it looks like it's running over, pickup is yours."*

The conversation is natural, contextual, and stateful. Kin remembers what was discussed and follows through.

### Conversation Memory

Kin maintains a rolling memory of household context — previous briefings, past conversations, preferences, recurring patterns, and family-specific logistics. This means Kin gets smarter over time. It learns which parent typically handles which responsibilities, what time the family eats dinner, which meetings tend to run late, and how the household actually operates.

### Multi-Parent Coordination

Both parents receive the same briefing. Both see the same conflicts. Both know who's handling what. This is structurally different from individual AI assistants — the output of every Kin interaction is a **shared game plan**, not a personal to-do list. Neither parent has to relay information to the other. The coordination happens automatically.

### Caregiver Support

Families don't operate in isolation. Kin supports adding nannies, grandparents, babysitters, and any other caregiver who participates in the family's logistics. Caregivers receive relevant briefing information and can be looped into specific handoffs — keeping everyone aligned without group-chat chaos.

<!-- Screenshot: kinai.family interactive demo — household configuration panel on left, phone mockup on right showing a generated briefing about soccer pickup and dinner planning -->

> **[Interactive Demo — kinai.family/demo]** The demo lets prospects configure their household type, busyness level, number of kids, and ages. The phone on the right rewrites a personalized morning briefing in real time as selections change — showing exactly what Kin would text them at 6am.

---

## How It Works

The user journey from signup to first briefing takes less than five minutes.

**Step 1 — Sign up at kinai.family.** Create an account with email or Google OAuth. No credit card required for the 7-day trial.

**Step 2 — Connect calendars.** Link Google Calendar for both parents. Kin reads events from personal and work calendars to build the full household picture. One-time setup — Kin stays synced automatically.

**Step 3 — Add family members.** Enter phone numbers for both parents and any caregivers. Tell Kin a few things about how your family operates: who handles pickup by default, what time the briefing should arrive, any recurring logistics.

**Step 4 — Receive your first briefing.** The next morning at 6am, both parents receive a coordinated SMS briefing — today's schedule, any conflicts, anything that needs a decision.

**Step 5 — Text back anytime.** Reply to the briefing, ask follow-up questions, update plans, hand off tasks. Kin responds with full context and follows up throughout the day when something changes.

<!-- Screenshot: kinai.family dashboard — morning briefing card with SMS preview, activity timeline (BRIEF, REPLY, SYNC, ALERT events), weekly calendar with YOU/SAM ownership labels, conflict-resolved card -->

> **[Dashboard — kinai.family/dashboard]** The dashboard displays the morning briefing with an SMS preview, a real-time activity timeline tracking briefs sent, replies received, calendar syncs, and alerts resolved. The right panel shows the weekly calendar with color-coded ownership (YOU, SAM, SHARED) and a "Today's coverage" card confirming who handles each pickup and activity.

---

## Technology Architecture

Kin is built on a modern, production-grade stack designed for reliability, speed, and scalability.

### Application Layer

The web application runs on **Next.js 14** (TypeScript, Tailwind CSS) deployed to **Vercel** with automatic CI/CD from GitHub. Authentication is handled by **Supabase Auth** supporting Google OAuth, phone OTP, and magic link flows.

### Data Layer

**Supabase** provides the Postgres database with Row-Level Security, ensuring data isolation between households. Edge Functions (running on Deno) handle the 6am briefing cron job, inbound SMS webhook processing, and calendar sync operations.

### AI Pipeline

The intelligence layer is powered by **Anthropic Claude** (claude-sonnet-4). The pipeline works as follows:

1. **Calendar sync** — Google Calendar API pulls events from both parents' personal and work calendars on a continuous sync schedule.
2. **Context assembly** — The system aggregates calendar data, household preferences, conversation history, and family-specific rules into a structured context payload.
3. **Briefing generation** — Claude processes the assembled context and generates a personalized, coordination-aware briefing for each parent — identifying conflicts, assigning ownership, and surfacing decisions.
4. **SMS delivery** — **Twilio** delivers the briefing via SMS (A2P 10DLC registered). The same Twilio infrastructure handles inbound replies, routing them back through Claude for contextual responses.

### Billing

**Stripe** handles subscription management, checkout, and webhook processing. The billing model is $39/month per household with a 7-day free trial — no per-seat pricing, no add-ons.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                    PARENT A (SMS)                    │
│                    PARENT B (SMS)                    │
└─────────────────┬───────────────────┬───────────────┘
                  │                   │
                  ▼                   ▼
         ┌────────────────┐  ┌────────────────┐
         │     Twilio      │  │     Twilio      │
         │   (Outbound)    │  │   (Inbound)     │
         └───────┬────────┘  └───────┬────────┘
                 │                   │
                 ▼                   ▼
         ┌─────────────────────────────────┐
         │     Supabase Edge Functions      │
         │  ┌───────────┐ ┌─────────────┐  │
         │  │ 6am Cron  │ │ SMS Webhook │  │
         │  └─────┬─────┘ └──────┬──────┘  │
         │        │              │          │
         │        ▼              ▼          │
         │  ┌─────────────────────────┐    │
         │  │   Context Assembly      │    │
         │  │  (Calendar + History    │    │
         │  │   + Preferences)        │    │
         │  └──────────┬──────────────┘    │
         └─────────────┼───────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  Anthropic Claude│
              │  (Briefing Gen   │
              │   + Conversation)│
              └─────────────────┘
                       │
                       ▼
         ┌─────────────────────────────────┐
         │        Supabase Postgres         │
         │  (Households, Calendars,         │
         │   Conversations, Preferences)    │
         └─────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │  Google   │ │  Stripe  │ │  Vercel  │
   │ Calendar  │ │ Billing  │ │ Frontend │
   │  OAuth    │ │          │ │ (Next.js)│
   └──────────┘ └──────────┘ └──────────┘
```

---

## Competitive Landscape

The family coordination space has two categories of existing products, and Kin sits in neither. It occupies the only empty quadrant: **group-native and channel-native.**

### vs. General AI Assistants (Poke, Airstitch, ChatGPT)

General AI assistants are built for one person at a time. You text them, they do something for you. Poke (backed by General Catalyst at a $300M valuation) and Airstitch are SMS-native — they got the channel right — but they're fundamentally **reactive and individual**. They respond to one person's requests. They don't read both parents' calendars. They don't detect conflicts between two schedules. They don't assign ownership or follow up when coverage breaks.

Kin is **proactive and group-coordinated**. Every briefing is a shared game plan. Both parents are in the loop from the start. The output isn't "here's your to-do" — it's "here's who handles what today, and here's what's at risk."

### vs. Family Apps (Cozi, FamilyWall, OurHome, Skylight)

Family apps understand the group problem but chose the wrong channel. They require both parents to download an app, create accounts, enter data, and check it regularly. The adoption curve kills them — one parent does the work, the other doesn't engage, and the product becomes another chore.

Kin requires **nothing to download**. Both parents receive coordination via SMS. The second parent doesn't need to do anything except read their texts. Zero adoption friction.

### vs. Poke ($300M Valuation, General Catalyst Seed)

Poke is the closest analog in the market and the most instructive comparison. Poke proved that consumers will pay for an AI assistant over SMS. But Poke is built for individuals — it's a personal assistant, not a coordination layer. The moment two people need to be in sync, Poke doesn't have the architecture.

Kin is built for the use case Poke can't serve: **two people sharing a life who need to be coordinated, not just assisted.**

### vs. Airstitch

Airstitch operates in a similar SMS-AI space but, like Poke, focuses on individual assistance. Kin's differentiation is structural: multi-parent coordination, proactive conflict detection, and a briefing model that produces shared game plans rather than personal task lists.

### The Positioning Matrix

|                        | **Individual**       | **Group-Native**      |
|------------------------|---------------------|-----------------------|
| **App-Based**          | ChatGPT, Siri       | Cozi, FamilyWall      |
| **SMS-Native**         | Poke, Airstitch      | **Kin** ← *only one here* |

---

## Business Model

### Pricing

**$39/month per household** — or $299/year ($24.92/month). 7-day free trial, no credit card required to start.

### Why Per-Household Pricing

Kin is priced per household, not per user, because the product only works when both parents are in it. Per-seat pricing would create friction ("why am I paying if my partner already pays?") that undermines the core value proposition. One subscription covers both parents and any caregivers added to the household.

### Why $39/Month Works

At $1.30/day, Kin costs less than a daily coffee — for a product that eliminates the most common source of daily friction in a working-parent household. The pricing is justified by value replacement: families using Kin are effectively replacing 2–3 separate subscriptions (calendar apps, reminder tools, family coordination apps) with one system that does what none of them could do individually.

Comparable signals validate this price point. Cozi charges $49/year for a basic family calendar with no AI. Skylight sells a $169+ hardware calendar. Poke charges $30/month for an individual SMS assistant. Kin delivers more value (group coordination, AI intelligence, conflict detection) at a competitive price.

### Unit Economics

At $39/month, 2,200 paying households reaches $1M ARR. 21,400 households reaches $10M ARR. The US addressable market is approximately 16 million dual-income households with children — a segment that is high-stress, high-spending, and high-willingness-to-pay for solutions that reduce daily friction.

---

## Why Now

Three forces have converged to make Kin possible today in a way that wasn't possible even two years ago.

**AI is finally good enough for real coordination.** Previous-generation language models could send reminders and answer questions. They couldn't read two calendars, detect a conflict between a late-running meeting and a daycare pickup window, assign ownership, and articulate the game plan — all within a 320-character SMS. Claude can. The quality of inference required for useful family coordination crossed the viability threshold in 2025.

**SMS has near-100% engagement.** SMS open rates exceed 95%, compared to ~20% for email and single-digit daily active rates for most consumer apps. For a product whose entire value depends on both parents actually seeing the information, SMS is the only channel that guarantees it.

**Zero-friction onboarding eliminates the adoption death spiral.** Every family app ever built has died from the same cause: requiring both parents to change their behavior. Kin's SMS-native architecture means neither parent needs to download anything, learn anything, or remember to check anything. The coordination arrives in the channel they already use, automatically, every morning.

The category of "family coordination" has existed for 20 years. The combination of AI capability and channel strategy that can actually solve it is new.

---

## The Founding Team

**Jontae Ford** — Strategy, Operations, Business

Jontae brings deep operations expertise from DoorDash (Strategy & Ops) and a career spanning Uber and Uber Eats. She understands how to build systems that detect risk, assign ownership, and coordinate execution across complex, multi-stakeholder operations. At Kin, she owns business strategy, user research, financials, and community. She is also the co-parent who identified the core insight: the coordination burden falls disproportionately on one partner, and the solution can't require that partner to do even more work.

**Austin Ford** — Engineering, Product, Brand

Austin is a Founding CSM at Healia Health (YC-backed) and built the entire Kin technical stack — Next.js web app, Supabase backend, Twilio SMS integration, Claude AI pipeline, Stripe billing, interactive landing page demo — in a 48-hour focused engineering sprint using Claude Code as an AI pair programmer. He owns engineering, product architecture, and growth content.

**Together:** 13 combined years of operations work at Uber, Uber Eats, DoorDash, and a YC-backed startup. Equal partners (50/50 equity). Married, with a 2-year-old son. They are their own first users — they built the product they needed because no existing solution survived contact with their actual mornings.

---

## Contact

**Web:** [kinai.family](https://kinai.family)

**Email:** austin.ford1519@gmail.com

**Entity:** Kin Technologies LLC (Ohio)

---

<div align="center">

*Kin — Because no parent should have to be the air traffic controller.*

</div>
