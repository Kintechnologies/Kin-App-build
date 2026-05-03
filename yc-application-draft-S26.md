# Kin AI — YC Summer 2026 Application Draft

**Submission deadline:** May 4, 2026, 8:00pm PT
**Founders:** Austin Ford & Jontae Ford
**Status:** DRAFT — for Jontae's review

---

## How to use this document

1. Read top to bottom. Each section corresponds to a YC application question.
2. Anywhere you see **[JONTAE: ...]**, that's a question or decision that needs your input before we can finalize.
3. Anywhere you see **[VERIFY]**, double-check the number or claim before submitting.
4. Anywhere you see **[OPTIONAL]**, the section is good but not required — keep, cut, or rewrite.
5. Comments at the bottom of each section explain why I drafted it that way, so we can argue with the choice if you disagree.
6. We finalize together at the Sunday review (May 3) and submit Monday May 4 by 5pm PT (3-hour buffer before the 8pm deadline).

---

# SECTION 0: TECH, BUILD, AND COFOUNDER QUESTIONS

## Who writes code, or does other technical work on your product? Was any of it done by a non-founder?

**Austin writes all the code, partnered with Claude Code as an AI pair programmer. No code on Kin has been written by anyone outside the founding team.**

The full Kin stack — Next.js web app, Supabase Postgres schema and edge functions, Twilio SMS integration (inbound webhook + outbound), Anthropic Claude integration for briefing generation and SMS conversation handling, Stripe billing, Google Calendar OAuth, the interactive landing-page demo — was built by Austin in 48 hours of focused engineering with Claude Code as the AI partner.

Austin's engineering velocity comes from leveraging AI coding tools, not from a separate engineering team. He uses Claude Code daily at his current role at Healia Health for production code (account health summary tooling, custom workflow automation), and he's been doing the same on Kin since the November 2025 build started. The 48-hour pivot rebuild is the clearest demonstration of what one operator with Claude Code can ship.

## Are you looking for a cofounder?

**No. We are a complete two-person founding team.**

Austin owns engineering, product architecture, brand voice, and growth content. Jontae owns operations, business, financials, user research, and community. The division of responsibility is documented and operational.

---

## Tech stack (including AI models and AI coding tools)

**Application:**
- Frontend: Next.js 14, TypeScript, Tailwind CSS
- Backend: Supabase (Postgres + Auth + Row-Level Security + Edge Functions on Deno)
- Hosting: Vercel (auto-deploy from GitHub on merge to main)
- Auth: Supabase Auth (Google OAuth, phone OTP, magic link)

**Product surface:**
- SMS: Twilio (10DLC, A2P registration submitted, currently pending carrier approval)
- LLM: Anthropic Claude (claude-sonnet-4) for morning briefing generation and SMS conversation responses
- Calendar: Google Calendar API (OAuth + read access for both parents)
- Payments: Stripe Checkout, Stripe Subscriptions, webhook handling
- Push notifications: not used in current SMS-first product (deferred from previous mobile build)

**AI coding tools:**
- **Claude Code** (primary) — used for the entire 48-hour SMS-first build, ongoing engineering, and architectural decisions
- **Custom GPTs** — used for specific repetitive workflows (briefing prompt iteration, system prompt tuning)
- Austin uses both daily at Healia Health for production work, and the same workflow runs on Kin

---

## Optional: Coding agent session export

**THIS IS A MAJOR OPPORTUNITY. ATTACH ONE.**

YC explicitly says this is an experimental question for S26 to give applicants "a chance to show off their skills with AI coding tools." This is a direct signal that they're hunting for AI-native operators. You are exactly that.

**What to export:**

In Claude Code, run `/export` in any session. Export it as `.md` or `.txt`. Pick a session that demonstrates:
- Real engineering depth (not just "write me a hello world")
- Architectural judgment (you pushing back, asking the right questions, refining)
- A meaningful piece of Kin work shipping at the end
- AI partnership (you guiding Claude Code, not Claude Code driving you)

**Best candidates from your work:**

1. **Best option — a session from the 48-hour SMS pivot build.** If you have any Claude Code session export from April 26-29 that shows the SMS infrastructure being built, the inbound webhook being wired, the briefing edge function being adapted from push-notification to Twilio — that's the gold. Specifically the session where you wired Twilio to the existing morning-briefing edge function or built the inbound SMS routing logic.

2. **Second best — a session from the production debug work.** When you fixed the env vars / OAuth redirect / route 500s and got the production system live. That session shows debugging fluency, which partners value as much as building fluency.

3. **Third best — a session showing the AI/UX audit you ran (the 488-line audit mentioned in the 48-hour update).** That's an operator using Claude Code to audit prompts and user experience, not just write code. Rare and impressive.

**Don't export:**
- A session that's just "build this feature" with thin context
- A session where Claude Code did most of the thinking and you mostly approved
- A session from before April 26 if it covers the pivoted-away product (the partner reading it would see you working on the wrong product)

**How to find the right one:**
```bash
# Claude Code stores sessions locally. Find recent ones:
ls -lt ~/.claude/projects/-Users-austin-Projects-kin/ | head -20

# Or use the export command in any active session:
/export
```

**Action:** Tonight or Friday, pull up Claude Code, look at your recent sessions, find the one you're proudest of, export it, save the file. Then upload it Sunday with the rest.

**Strategic note:** This question alone could move you from Tier 3 to Tier 2 if you submit a great session. Most applicants will skip this question (it's optional). The ones who attach a strong session are signaling exactly what YC is hunting for in S26: founders who ship at AI-augmented velocity. Don't skip it.

---

# SECTION 1: COMPANY

## Company name
**Kin**

> Comment: Short, distinctive, already the brand. Keep.

## Company URL
**https://kinai.family**

## What does your company do? (50 characters max)
**SMS coordination layer for two-parent households.** (50 chars)

> Comment: Repositioned to lead with the coordination-layer category, not the assistant category. Important after Poke/Airstitch — those are SMS AI assistants for individuals; Kin is something different.
>
> Alternates if you prefer:
> - "Texts both parents what today actually looks like." (50) — current functional version
> - "AI that coordinates both parents over SMS." (43)
> - "Built for two parents. Lives in your texts." (43)
> - "Coordination AI for households, by SMS." (39)

## Demo (separate field, 3 minutes / 100MB max)

YC's demo field is separate from the founder video. Limits: **3 minutes max, 100 MB max.** Use as much of the 3 minutes as you actually need — don't pad, but don't rush either.

**What to record (90-180 seconds is the sweet spot):**

A screen recording of the actual Kin SMS thread on your phone — the real production system delivering and receiving messages. Format:

- **0:00–0:10** — Brief voice intro: "This is the actual SMS thread between us and Kin from this week. A2P 10DLC is pending carrier approval, so we're showing this through Twilio's test environment / our own verified household." (Adjust based on what's working at recording time.)
- **0:10–0:50** — Open the thread. Scroll up to a recent morning briefing. Let the partner read it on screen for 5-7 seconds. Show one full briefing.
- **0:50–1:30** — Type a real question ("What does tomorrow look like?" or "Who has pickup Thursday?"). Send. Wait for the actual reply. Don't fake the timing.
- **1:30–2:00** — Show one or two more exchanges to demonstrate the conversation is ongoing, not just one query.
- **2:00–2:30** — Optional: brief shot of the interactive demo on kinai.family showing how new families experience the product on the landing page.
- **2:30–2:45** — Close with current status: "Live at kinai.family. 3 households in beta. A2P pending. Stripe wired."

**Recording tools:**
- iOS built-in screen recording (Control Center → screen record button)
- Loom for upload (free, partners are used to it)
- No music, no graphics, no transitions

## Link to the product
**https://kinai.family**

## Login credentials (if any)
**Not required.** The landing page and interactive demo are public. The actual product (SMS) requires sign-up, which YC partners can do themselves at kinai.family if they want — though sign-up creates a real Stripe customer and starts a 7-day trial, so most partners will likely just review the demo materials and the landing page.

## Describe what your company does in more detail (300-500 chars)
**Kin is a coordination layer for households that runs over SMS. It reads both parents' calendars, watches for conflicts and risks (pickup gaps, double-bookings, late-running meetings), and texts each parent a daily game plan with ownership clearly assigned. Parents reply by SMS to ask, update, or hand off. Unlike general AI assistants, Kin is built for groups — both people are coordinated, not just one. Live at kinai.family.**

> Comment: 466 characters. Updated to lead with the coordination-layer framing and the for-groups differentiation (vs. general AI assistants like Poke / Airstitch). Adds the "watches" verb to land the proactive-system feel without resorting to B2B jargon.

## Where do you live now, and where will the company be based after YC?

**Format YC asks for:** "City A, Country A / City B, Country B"

**Answer to paste:** Columbus, OH, USA / San Francisco Bay Area, USA

## Explain your decision regarding location.

We'll relocate to the Bay Area for the batch and return to Columbus afterward. Columbus is home — our 2-year-old, family nearby, lower cost of living that lets us bootstrap longer. We're committed to being in person for the full batch.

---

# SECTION 2: PROGRESS

## How long have you been working on this idea? Months full-time? Side project?

**6 months as a side project. We started in November 2025 with the original product concept (a family OS mobile app). We pivoted to the SMS-first model on April 26, 2026 after recognizing the core insight: every family app dies because of the behavior change required to open another app. We rebuilt the entire system as SMS-native in 48 hours and launched the production system on April 29, 2026.**

> Comment: This is the truth. The pivot story is a strength, not a weakness — it shows you update on evidence. YC partners specifically respect founders who pivot fast and ship faster.

## How far along are you?

**Kin is live at kinai.family. Three households are actively using it in beta. Five more are on a waitlist, waiting on full SMS delivery once Twilio A2P/10DLC clears (resubmitted; pending carrier approval).**

The end-to-end product works: a parent signs up, completes a 4-step SMS onboarding flow, connects Google Calendar, and starts receiving a coordination-aware morning briefing at 6am the next day. The briefing pulls from both parents' calendars, surfaces conflicts (pickup gaps, double-bookings, late-running meetings), and assigns ownership for the day. Parents reply throughout the day; Kin responds with full household context and follows up when something is at risk.

**What's built:** Next.js web app, Stripe checkout ($39/mo, $299/yr, 7-day trial), Google Calendar OAuth, Twilio SMS (inbound webhook + outbound), Supabase backend (Postgres + RLS + Edge Functions for the 6am cron), and Anthropic Claude for both the morning briefing generator and the SMS reply handler with 20-turn conversation memory. Plus an interactive landing-page demo that lets prospects experience the briefing flow without signing up.

48 hours of focused engineering produced the production rebuild after the SMS pivot. The system has been live since April 29.

## Do you have revenue? How much?

**Pre-revenue.** First paid household expected within 5 days, upon A2P approval. Charging starts at $39/month or $299/year per household.

> Comment: Don't try to inflate this. YC respects honest pre-launch founders who know exactly where they are.

## How many users do you have? How many active users? What's your growth rate?

**3 households actively testing, plus 5+ on a waitlist who have explicitly asked to try the product. The limiting factor on user count right now is Twilio carrier approval, not demand. We expect to be at 10+ households within a week of A2P clearing.**

## Are people using your product?

**Yes** — 3 households are actively using Kin in beta.

## Do you have revenue?

**No** — pre-revenue. First paid household expected within 5 days of A2P approval.

## If you are applying with the same idea as a previous batch, did anything change? If you applied with a different idea, why did you pivot and what did you learn from the last idea?

This is our first YC application. We did pivot during the build itself, which is worth disclosing here:

We spent 5 months (November 2025 – April 2026) building Kin as a comprehensive Family OS — meals, budget, calendar, AI chat, kids/pets tracking, fitness — as a polished mobile app on Expo / React Native. We pivoted on April 26, 2026, after recognizing the core failure mode every family app shares: nobody opens another app at 6am with a screaming toddler. We had bought a Skylight Calendar (the leading paid product in this category) ourselves and abandoned it within weeks, despite being exactly the target customer. That was the data point that broke the original premise.

We deleted the mobile app and rebuilt the product as SMS-native in 48 hours.

What we learned: in this category, the channel IS the product. Not features, not UX, not visualization. The constraint is behavior change. SMS removes it.

The version we're submitting is the one that has a chance of being used.

## If you have already participated or committed to participate in an incubator, accelerator, or pre-accelerator program, please tell us about it.

**No.** We have not participated in or committed to any accelerator or pre-accelerator program. Austin is currently Founding CSM at Healia Health, a YC-backed company, but he is an employee of that company, not a participant in YC.

## What's the most important thing you've learned in the last month?

**Family apps die because of behavior change, not product quality. We learned this from being our own customer first.**

We spent 5 months building the original Kin as a polished mobile app — meals, budget, calendar, AI chat, the whole platform. Every parent we showed it to said "this is amazing." None of them downloaded it.

We had also already done the customer experiment on ourselves without realizing it. We bought a Skylight Calendar (the leading paid product in the family-coordination category, $169+ hardware) and watched ourselves abandon it within weeks — even though we are exactly the target customer. The realization: the constraint isn't features, isn't visualization, isn't price. It's that nobody changes their behavior at 6am with a screaming toddler.

We deleted the original app entirely and rebuilt the product to live where parents already are — their text messages. Production rebuilt in 48 hours. The version we shipped is dramatically simpler than the one we spent 5 months on, and it's the version that has a chance of being used.

---

# SECTION 3: IDEA

## Why did you pick this idea to work on? Do you have domain expertise? How do you know people need it?

We built Kin for ourselves. We're a married couple with a 2-year-old, both working in calendar-heavy roles (Austin: Founding CSM at a YC-backed healthcare benefits company; Jontae: Strategy & Ops contract at DoorDash). The coordination problem is constant and specific:

> *"We don't know who's picking up our son from daycare until the last minute."*

That's not a hypothetical. That's a real Tuesday in our house. The product we built is the product we needed.

We bought a Skylight Calendar — the leading paid product in this category — and abandoned it. We're exactly the target customer, and it still didn't survive contact with our actual mornings. That's the data point that pushed us to SMS: any product that requires a parent to look somewhere new fails for the same structural reason.

Five other dual-income households we've talked to have the same setup and the same friction, with one parent (typically the woman) silently carrying the mental load. Three of them asked to join our beta before we'd written a line of code. The pattern extends past nuclear families: co-parents managing custody schedules, adult children coordinating care for aging parents, roommates sharing logistics — same coordination-failure shape, same air-traffic-controller bottleneck. We're starting with the version of the problem we live (two-parent household, young kid), but the underlying need is broader.

Domain expertise: between us, 13 years of operations work at Uber, Uber Eats, DoorDash, and a YC-backed startup. We've spent our careers building systems that detect risk, assign ownership, and coordinate execution across teams. Doing the same for households is the same job, smaller surface area.

## What's new about what you're making?

Two things that don't exist together anywhere else: **a coordination layer built for groups instead of individuals, delivered through SMS instead of an app.**

Today there are two kinds of products in this space, and both miss:

- **Family apps (Cozi, OurHome, FamilyWall, Skylight)** are built for groups, but require everyone to open them. They die from non-use. Skylight even built a $169 hardware device because they knew an app wouldn't work, and the device still requires you to look at it.
- **General AI assistants over SMS (Poke, Airstitch)** are in the right channel, but built for individuals. You text them, they do something for you. They don't coordinate between two people, watch for conflicts, or assign ownership.

Kin is the first product that's *both* group-native and channel-native. It reads both parents' calendars, watches for risks (pickup gaps, conflicts, late meetings), assigns ownership, and follows up — entirely over SMS. The output of every Kin briefing is a shared game plan, not a personal to-do.

What makes it possible now: AI can finally do real coordination inference inside a 320-character SMS reply, not just send reminders. Two-parent calendar sync is reliable. The problem has existed for 20 years; the combination of channel + AI capability that solves it this way is recent.

## Who are your competitors? Who might become competitors? Who do you fear most?

**Family apps:** Cozi (15M+ users on paper, classic adoption decay), OurHome, FamilyWall, Skylight ($169+ hardware — proves families will pay for coordination help, doesn't solve the channel; we bought one and abandoned it ourselves).

**General AI assistants over SMS:** Poke, Airstitch. Right channel, wrong shape — built for one user at a time. They're great at "remind me to..." or "book me a..." but they don't watch both parents' calendars, surface conflicts between them, or assign ownership. The output of those products is personal. The output of Kin is shared.

**Indirect:** Google Calendar / iCloud Family Sharing — solve visibility, not coordination. The real status quo is ad-hoc texting between partners with one carrying the load.

**Who we fear most:** A well-funded consumer AI company (Anthropic, Google, OpenAI) deciding "household coordination" is a feature of a general assistant. The surface area is small enough that a large team could clone the core in a few months. Less likely than it sounds, because most large AI teams aren't thinking in terms of multi-user coordination — they're optimizing for individual assistance.

**Why we have a window:** Companies that understand SMS consumer behavior aren't thinking about family coordination. Companies thinking about family coordination aren't building for SMS. The two assistant companies in the channel (Poke, Airstitch) are building for individuals, not groups. We're in the only quadrant of the matrix that's still empty.

**Why this is a startup, not a feature:** The morning briefing is the wedge, not the ceiling. Once a family routes coordination through Kin, the natural extension is everything that flows from shared logistics — recurring routines, kid handoffs, school logistics, shared task assignment, default-pickup rules, automated check-ins when something might break. Over time, Kin becomes the household's system of record for who handles what and when. That depth is hard to retrofit into a horizontal AI assistant. It compounds with use, in a category where switching costs grow the longer the product knows your family.

## What do you understand about your business that others don't get?

The real pain isn't missing calendar visibility. It's one partner carrying the coordination burden by default.

Every other product in this space treats family coordination as a productivity problem — better calendars, better lists, better reminders. The actual problem is a fairness problem. In dual-income households, one parent (statistically the woman) ends up as the household's air traffic controller. When the system breaks — a missed pickup, a double-booked evening, a surprise at 5pm — the consequence isn't a product feedback ticket. It's friction inside the marriage.

That reframe changes a few things in practice:

- **Pricing:** $39/month per household is reasonable for something that reduces a real source of friction between two people. It's expensive for a calendar app.
- **Retention:** Churn isn't "switched to a competitor." It's "went back to the old dynamic." That's a stickier hold than feature-driven retention.
- **Word of mouth:** Parents talk to other parents about coordination problems. They don't recommend each other calendar apps.

Every product in this category that's failed has treated coordination as a scheduling problem. We think it's a relationship one.

## How will you make money? How much could you make?

Subscription. $39/month or $299/year per household, 7-day free trial.

We charge per household because both parents need to be in the product for it to work. Pricing the household removes the "why should I pay when my partner already pays" friction.

Roughly 16 million dual-income households with kids in the US. Globally, the number is larger and the underlying problem is the same. Our focus right now is proving retention and willingness to pay in the initial US wedge — if we get that right, the market is big enough.

Comparable scale signals: Cozi claims 15M+ users on a $49/year plan. Skylight built a multi-hundred-million-dollar category around a $169 hardware device for the same problem. Both prove families pay for coordination help; neither has cracked the channel.

Near-term targets, US only:
- 30 days post-A2P: 10 paying households
- 90 days: 100 paying households (~$4K MRR)
- 12 months: 2,000 paying households (~$78K MRR)

## Which category best applies to your company?

**Consumer / B2C — Family & Productivity. AI Assistants.**

(YC's category dropdown varies. Pick the closest match. Most likely "Consumer" with a sub-category of "Productivity" or "AI Assistants" depending on the dropdown options.)

## If you had any other ideas you considered applying with, please list them.

We did not seriously consider other ideas. The daycare-pickup coordination problem is the one that wakes us up at night. Every other "what if we built X" conversation we've had over the past year ended with us coming back to this.

The closest adjacent idea — and the version of Kin we built and shipped first before pivoting — was a comprehensive Family OS covering meals, budget, calendar, kids and pets, fitness, and AI chat. We invested 5 months of nights and weekends into that version. We deleted it after recognizing the channel constraint.

If we had to apply with anything else, it would be **operations tooling for two-sided marketplaces** — applying our combined Uber, DoorDash, and Uber Eats experience to the post-sale operations problems we have spent our careers solving. We may build that next, but only if Kin doesn't work. Kin is the priority.

## How will you get your first 100 customers?

**First 10:** direct founder outreach to the families who've already asked to try it. We text them, not email, because the product is a text.

**Next 25:** referrals from those first households. Coordination problems are something parents talk to other parents about, in a way they don't talk about calendar apps.

**Next 50-75:** Jontae in working-parent communities (Reddit's r/workingmoms, r/beyondthebump, dual-income parenting Facebook groups) plus short-form video from Austin on the mental-load topic. We will test these in parallel and double down on whichever channel produces actual trials, not just engagement.

The unique distribution insight: the product is a text. The fastest way to sell it is also a text. We're not running ads at a landing page and hoping for conversion. We're texting people who have already told us they have the problem.

---

# SECTION 4: EQUITY & LEGAL

## Have you formed any legal entity yet?

**Yes. Kin Technologies LLC, incorporated in Ohio (USA).**

We are aware that YC's investment is structured for Delaware C-Corps. We will convert from Ohio LLC to Delaware C-Corp if accepted into the batch — Clerky or Stripe Atlas can complete the conversion in 2-3 business days. We are intentionally waiting until acceptance to avoid the conversion overhead and fees during the application phase.

## What's the equity split between founders?

**50/50.**

Equal partners. Both bringing complementary, irreplaceable skill sets — Austin (technical, product, engineering velocity, brand voice) and Jontae (operations, data, marketplace expertise, business mechanics). Both leaving market opportunity on the table to pursue this together. The split reflects that.

## Have you taken any investment yet?

**No.**

## Are you currently fundraising?

**No.** We are bootstrapped. We have not started a fundraising process and are not in active conversations with investors. Total spend on Kin to date is under $200 in infrastructure and tooling.

## Have you raised any money? How much, from whom?

**No. Bootstrapped.**

Total spent to date is under $200 — Vercel hobby tier, Supabase free tier, Twilio number provisioning, Stripe account. The Kin Technologies LLC is funded by personal capital from the founders.

## If you're applying to YC, what would you do with the funding?

**The standard YC investment is $500K total ($125K post-money SAFE for 7% + $375K MFN SAFE).** We would deploy it as:

- **Founder runway (12 months, both founders full-time):** Allows both Austin and Jontae to leave their day jobs and dedicate 100% time to Kin. ~$200K.
- **A2P/10DLC scaling, Twilio costs, Anthropic API spend:** ~$50K for the first 1,000 paying households.
- **Marketing experiments (paid + influencer):** ~$50K. We will not deploy paid acquisition until organic content has validated message-market fit, but we want budget available when it's time.
- **First two hires:** A second engineer (to unblock Austin from solo eng) and a senior CS / community manager (to scale Jontae's community work). ~$150K loaded.
- **Legal, ops, compliance buffer:** ~$50K. Delaware C-Corp conversion, attorney reviews, A2P compliance work, accountant.

The unlock from YC funding is not "build more features." It's "both founders go full-time, and we have 12 months to find PMF without survival pressure."

---

# SECTION 5: FOUNDERS

## Founder 1: Austin Ford

**Email:** austin.ford1519@gmail.com
**LinkedIn:** linkedin.com/in/austin-ford-903906a8
**Phone:** (626) 676-2222
**Location:** Columbus, OH
**Role at Kin:** Co-Founder, CEO / Technical (engineering, product, brand, growth)

**Bio:**
Two-time Founding CSM. 8 years building post-sale operations from zero at marketplace and SaaS startups.

Currently Founding CSM at Healia Health, a YC-backed healthcare benefits platform — sole CS hire owning a $4M ARR portfolio, drove 150% NRR on renewing accounts in 2025. Previously Founding CSM at Burq (Seed → Series A), built and managed a 3-person team. Earlier: Strategic Partner Manager at DoorDash, Account Manager and Market Lead at Uber Eats (Columbus + Chicago launches), Senior Program Manager at Upwork.

Already deploys Claude and custom GPTs in production at Healia. Built the entire Kin SMS-first stack in 48 hours after the pivot.

**Most impressive thing you've built or achieved:**
At Healia Health, drove 150% NRR on the renewing account base in 2025 as the sole CS hire — growing renewing ARR from $500K to $750K in a single year while owning a 35-account portfolio worth $4M. Did it by deploying Claude and custom GPTs to do the account coverage work that would normally require a 3-person team — the same operating pattern (one operator + AI leverage) that's now running on Kin.

Earlier, at Burq Inc (Seed → Series A), built and managed the entire CS org from zero — hired and led a 3-person team, built the playbooks and frameworks, owned ~$1M ARR. The pattern across both is the same: build the function before the function exists, run it lean, instrument it for leverage. Kin is the third time I'm doing it.

## Founder 2: Jontae Ford

**Email:** jontaebford@gmail.com
**LinkedIn:** linkedin.com/in/jontae-ford-4a4127147
**Phone:** (626) 676-1832
**Location:** Columbus, OH
**Role at Kin:** Co-Founder, COO / Operations & Strategy (operations, business, user research, community)

**Bio:**
SMB & Marketplace Operations Leader. 8 years at Uber and DoorDash building post-sale operations, sales QA, and AI-augmented operational systems at scale.

Currently Strategy & Operations (Contract) at DoorDash — owns SMB alcohol enablement as DRI. Built an AI data pipeline (Granola.ai + Google Gemini) that turns unstructured call transcripts into structured metrics across 16+ tracked data points per call. Lifted SSIO integration completion rate from 29% to 44%.

Previously Senior Program Manager, Merchant Scaled Acquisitions at Uber: drove 60% conversion lift and +14% CSAT through a Growth Consultation Pilot, cut lead qualification costs ~50% across a 1,000+ agent BPO program. Founded Uber's first Sales QA program and Closed Lost taxonomy.

**Most impressive thing you've built or achieved:**
At Uber, identified that 19% of merchant acquisition opportunities were being misclassified into vague "Other" buckets, then built the system that fixed it — rebuilt Salesforce taxonomy, founded the Sales QA program, and used the resulting clean data to launch a Growth Consultation Pilot that drove 60% conversion lift across a 1,000+ agent BPO program. She didn't improve the program. She built the program. That same instinct — see the system, build the system — is what she brings to running Kin.

## How long have the founders known each other and how did you meet?

We met in 2013. Married in 2019. Have a 2-year-old.

For most of those 13 years we've worked in adjacent corners of the same ecosystem — Uber, Uber Eats, DoorDash, Upwork, Burq, Healia. We've been talking the same operational language professionally the entire time we've known each other.

Thirteen years together. Seven years married. We are not figuring out how to work together. Building Kin is the next decision in a long line of decisions we've made together.

## Are you all going to work full-time on the startup?

**Both founders will go full-time on Kin upon YC investment.**

Currently:
- Austin is full-time at Healia Health (Founding CSM). He will give Healia 4 weeks' transition notice upon YC funding.
- Jontae is on a Strategy & Operations contract at DoorDash (started August 2025). The contract structure means she has more flexibility than a W-2 role — she can transition off within 2 weeks.

If YC does not fund us, we both continue building Kin part-time around our day jobs (current cadence: Austin ~17.5 hours/week, Jontae ~12 hours/week, plus shared review time on weekends). We will continue scaling the product, growing the user base, and revisiting funding (YC again next batch, or seed investors directly) at the next milestone.

**Note on Jontae's DoorDash contract:** Jontae's contract has no restrictions on competing work and a flexible offboarding window. She can transition off within 2 weeks of YC investment.

## What's the source of your unfair advantage?

**Three things, compounding:**

1. **We are the target user, not approximating it.** Most family-tech founders are single, child-free engineers building for a customer they imagine. We are dual-income parents of a 2-year-old, in the exact household configuration the product serves, living the failure mode every Tuesday morning. Every product decision tests against our own use first.

2. **Marketplace operations DNA, both founders.** Together we have 13 years across Uber, Uber Eats, DoorDash, Upwork, Burq, and Healia. Family coordination is operationally identical to two-sided marketplace coordination — high-frequency, two-sided, intolerant of delay, dependent on trust. We have spent our careers building the systems that make those marketplaces work.

3. **We move unusually fast as a two-person AI-native team.** Austin can ship production software with Claude Code at the velocity of a small team — the SMS-first stack went from idea to live system in 48 hours. Jontae turns messy human workflows into repeatable systems (Sales QA at Uber, AI data pipelines at DoorDash). Together that's a learn-and-rebuild loop most consumer teams in this category don't have. When the evidence said our first version was wrong, we deleted it and shipped the new one in two days. Most teams couldn't.

## Have you worked together before?

**Yes — we co-operate our household, which is the product. Every design decision in Kin comes from a real coordination failure we've had. The morning briefing example — pickup conflict, practice ending at 6:30, dinner at 8 being tight — that's a real Tuesday in our house, not a marketing hypothetical.**

**Beyond the household, we've been working in adjacent layers of the same gig-economy ecosystem since 2016.** Austin started at Uber Eats in November 2016 in market launch operations. Jontae started at Uber in July 2016 at the Greenlight Hub. We've both been on the merchant/operator side of marketplaces our entire careers, spent two of those years simultaneously at the same company (DoorDash, 2021-2023), and shipped real numbers in adjacent functions. We've been talking the same professional language for almost a decade before deciding to build together.

## What convinced you to apply to Y Combinator? Did someone encourage you to apply? Have you been to any YC events?

After the SMS pivot last week, what was a side project became something we believe could be a meaningful company. Once that was clear, applying to YC was the obvious next step.

Austin is Founding CSM at Healia Health, a YC-backed company, and has been inside the YC ecosystem since June 2025 — close enough to have a direct view of what the program produces. We've also been long-time consumers of Garry Tan's content, the Lightcone podcast, Paul Graham's essays, and Startup School.

No one specifically encouraged us to apply. We have not attended any YC events in person yet.

## How did you hear about Y Combinator?

Austin works at Healia Health, a YC-backed company, as Founding CSM. He has been inside the YC ecosystem since June 2025. We have also been long-time consumers of Garry Tan's content (Lightcone podcast, Startup School videos), Paul Graham's essays, Hacker News, and the broader YC startup community for several years before this application.

## What batch are you applying for?

**Summer 2026.**

## Anything else you want us to know?

Three things worth flagging:

1. **The pivot.** This is the second major version of Kin. The first (Nov 2025 – Apr 2026) was a polished mobile app covering meals, budget, calendar, kids tracking, fitness, and AI chat. We shipped something we were proud of, watched families not use it, and realized we were solving the wrong problem. We deleted it and rebuilt the product as SMS-native in 48 hours. Deleting five months of work when the evidence demanded it is the most honest signal we can give about how we'll operate inside the batch.

2. **We bought the leading paid competitor and abandoned it ourselves.** We are not theorizing about this category. We bought a Skylight Calendar, the closest premium product, and stopped using it within weeks. The channel insight came from being the customer, not from market research.

3. **Why this can become a big company.** The morning briefing is the wedge. Used daily, Kin learns who handles what, when, and why — the routines, the defaults, the recurring decisions a household makes without thinking about them. Over time, that becomes a system of record for how a family runs. That creates retention and switching costs that grow with use.

---

# SECTION 6: VIDEO (60 seconds, both founders, no script)

## YC's actual instructions

From ycombinator.com/video:
- 1 minute long
- **Only the founders talking — nothing else.** No props, no demo, no product on screen.
- Both founders in the video (or screen-recorded video call if you can't be in the same room — but you can be, so this doesn't apply)
- **Do not recite a written script. Use bullet points. Just talk spontaneously as you would to a friend.**
- "Reading a written script doesn't help your application or convey communication skills."
- The video is about how you communicate, not about pitching the product. There's a separate place for the product demo elsewhere in the application.

YC's recommended example videos: Campus Job (W15), Flip (W15), Zenefits (W13), Teespring (W13). Watch all four together for ~15 minutes Saturday morning before recording. They're old, they're rough, they're unpolished. That's the calibration.

## Setup

- **Location:** Your living room or kitchen. Comfortable, real, where you'd actually have a conversation.
- **Lighting:** Daytime, natural window light. Don't shoot at night.
- **Frame:** Both of you in shot from the chest up. Sit or stand close, the way you'd actually sit on a couch together.
- **Camera:** Phone on a tripod or stable surface, in landscape (16:9). Lens at chest height. About 4-6 feet away.
- **Audio:** Avoid echoey rooms. A standard phone mic at 4-6 feet is fine.
- **NO PROPS.** No Skylight. No phone showing the product. No notes visible. Just the two of you talking.
- **NO SCRIPT.** This is the most important part. Bullet points only. Talk like you're explaining Kin to a friend at a dinner party.

## Bullet points to hit (memorize these, do NOT memorize sentences)

Each of you should know the bullets. Don't divide them rigidly — overlap is fine, you can finish each other's thoughts. That's married-couple authenticity, which is exactly the signal.

**The five things to land in 60 seconds:**

1. **Who you are**
   - Austin and Jontae, married, 2-year-old
   - Both work in tech operations
   - Live in Columbus, OH

2. **The specific problem**
   - "Most mornings, we don't know who's picking up our son from daycare until last minute"
   - Two calendars, two careers, one toddler
   - Constant coordination, mostly via reactive texts

3. **What you tried**
   - Bought a Skylight Calendar — abandoned it
   - Tried family apps — neither of us opened them
   - Realized: every family product fails because someone has to open it

4. **What Kin is**
   - SMS-based AI that texts both parents the morning briefing at 6am
   - Reads both calendars, surfaces conflicts in plain English
   - You reply throughout the day, no app, no dashboard
   - Built it in 48 hours, live now, three families testing

5. **Why you two**
   - 13 years between you at Uber, DoorDash, Uber Eats
   - You've spent your careers coordinating marketplaces — same operational pattern, applied to families
   - You're the customer. You built the product you needed.

## How to actually shoot this

The trap is performing the bullets. Don't.

The way to do this is:

1. **Watch the four YC example videos together** Saturday morning before any cameras come out. Pay attention to how relaxed they are. None of them are polished. None of them are rehearsed. They're founders explaining their company to people they want to work with.

2. **Talk it through off-camera 3-4 times.** Cup of coffee, no camera, just the two of you. Each time, hit the five points. Each time, let it come out differently.

3. **Then turn the camera on and have a conversation.** Not a pitch. A conversation between the two of you about your company, with the camera as a third person in the room. Look at each other sometimes. Look at the camera sometimes. React to each other's points. Disagree on a small thing if it comes up naturally — partners will love it.

4. **Aim for 5-7 takes.** First take is throwaway warm-up. Takes 2-4 are where the real ones come from. After take 5, energy starts to drop and the takes get worse, not better. Don't push past 7.

5. **Pick the take where you sound most like yourselves**, not the take that hits every bullet perfectly. If you miss bullet #3 in your best take, that's fine. Better to be real and miss a point than be wooden and hit them all.

## Things to avoid (per YC's explicit rules)

- ❌ Reading from a script (visible looking down, eyes scanning, stiff cadence)
- ❌ Showing the product on screen (no phone, no mockup, no website)
- ❌ Music, transitions, graphics, lower-thirds, logos
- ❌ Voice-over while showing footage
- ❌ Sitting at a desk like a corporate video
- ❌ Just one of you talking with the other silent
- ❌ Going over 60 seconds (be willing to cut a bullet rather than rush)

## What "good" sounds like for you two specifically

You have a unique advantage: you're a married couple, in a real house, with a real 2-year-old, who actually live this problem. The video should feel like a YC partner is sitting in your living room and asking "so what's Kin?" and the two of you are answering, not pitching.

The energy to aim for: warm, slightly tired, specific, honest, occasionally laughing at the absurdity of your own mornings. The opposite of a SaaS demo.

If your kid wanders into frame for 1-2 seconds during a take and one of you smiles and keeps going — keep that take. That's the most YC-positive thing that can happen in this video.

## The recording plan (Saturday)

| Time | What |
|---|---|
| 0:00 — 0:15 | Watch the 4 example YC videos together |
| 0:15 — 0:25 | Coffee and conversation. Talk through the 5 bullets together off-camera. |
| 0:25 — 0:30 | Set up: phone on tripod, find the right spot, lighting check |
| 0:30 — 1:00 | Takes 1-5 |
| 1:00 — 1:15 | Watch playback together. Pick a take. |
| 1:15 — 1:30 | Pickup take if needed |

Total ~90 minutes, same block.

---

# SECTION 7: SUBMISSION CHECKLIST

Items that must be done before May 4, 5pm PT:

## ADMIN: YC profile completion (DO TODAY)

The YC application form shows **"errorProfile incomplete"** for both founders. This blocks submission. Both Austin and Jontae need to complete their individual profiles in the YC system before any of the application content matters.

- [ ] **Austin** — log in to apply.ycombinator.com, complete profile (LinkedIn, bio, education, work history, role at Kin)
- [ ] **Jontae** — create YC account, get added as cofounder via Austin's "+ Add a co-founder" link, complete her profile (LinkedIn, bio, education, work history, role at Kin)
- [ ] Refresh the application page after both profiles are complete to clear the error flag

Once both profiles are complete, the application form unblocks for submission.

## Founders to do together (by Sunday May 3):
- [ ] Read this draft top to bottom together
- [ ] Approve all answers (or flag changes for one final revision pass)
- [ ] Watch the 4 example YC videos (Campus Job, Flip, Zenefits, Teespring)
- [ ] Record founder video Saturday morning (90 min block, no script, bullet points only)
- [ ] Record demo Saturday morning (real Kin SMS thread, 90-180 sec)
- [ ] Export Claude Code session and save .md/.txt file
- [ ] Sunday read-through together (10am)
- [ ] Submit by 2pm PT Sunday May 3

**Resolved (no longer open):**
- ✅ Marriage timeline: met 2013, married 2019, 2-year-old now
- ✅ Skylight evidence: bought, abandoned, became the channel insight
- ✅ gstack used to validate the pivot: removed from final draft per ChatGPT polish pass — the deleted-and-rebuilt outcome is the signal, not the framework
- ✅ Austin's UC Berkeley Marketing Cert: added to bio
- ✅ Single current employer (Healia only): corrected throughout
- ✅ Bay Area relocation for the YC batch: confirmed yes
- ✅ Jontae's LinkedIn: linkedin.com/in/jontae-ford-4a4127147
- ✅ DoorDash contract: no restrictions, 2-week transition window
- ✅ Video script: rewritten as bullet points (per YC's actual instructions, no script reciting)
- ✅ Demo: 3 minutes / 100MB allowed (separate from founder video)
- ✅ All YC application questions covered (verified against actual application PDF)
- ✅ Coding agent session export plan documented
- ✅ Equity split: 50/50
- ✅ Market sizing corrected: 16M US, 60M+ developed world (not US-only thinking)
- ✅ Delaware C-Corp: deferred to post-acceptance, intent disclosed in application

## Austin to do solo (by Saturday May 2):
- [ ] Verify Healia LLC partnership disclosure (anything we need to disclose to Healia about Kin? Confirm with their CEO if needed)
- [ ] Verify A2P approval status with Twilio. If not approved by May 3, plan to submit application stating "A2P pending — currently in carrier review"
- [ ] Pull the actual demo SMS thread from this week's beta households for the video (with permission) or use our own
- [ ] Confirm kinai.family is accessible from the YC partners' likely IPs (no IP allowlists, no auth-walled landing page)
- [ ] Have a clean repo state and a demo URL ready in case partners want to look at the product directly

## Jontae to do solo (by Saturday May 2):
- [ ] Confirm DoorDash contract has no restrictions on competing work or required notice
- [ ] Confirm LinkedIn URL is current and the title says "Co-Founder, Kin AI" (or equivalent) by submission day
- [ ] Reach out to 2-3 of the beta families and ask if they'd be willing to be a reference if YC wants one
- [ ] Confirm date/duration of marriage and key timeline facts for the application

## Submission (Monday May 4):
- [ ] Open YC application form by 4pm PT
- [ ] Paste each section in
- [ ] Upload video
- [ ] Submit by 5pm PT (3-hour buffer before deadline)
- [ ] Take screenshots of submission confirmation
- [ ] Celebrate, then go back to building

---

# APPENDIX: Strategic notes from the office hours session

These are the framings we landed on during the /office-hours design session that should appear consistently across the application:

1. **The hero sentence:** "We don't know who's picking up our 2-year-old from daycare until last minute." This is the YC opener. It appears in Q3 of the application, in the video, and should be the first sentence of any pitch we ever do.

2. **The reframe:** "Kin isn't competing with Cozi. It's competing with resentment." This appears in "What do you understand about your business that others don't?" — the most differentiating answer in the application.

3. **The channel insight:** "The product is the channel." Every family app failed because of behavior change. SMS removes it. This appears in "What's new about what you're making?"

4. **The founder narrative:** "We are not approximating the user. We are the user." Both founders, both parents, both marketplace operators. This appears in Section 5 throughout.

5. **The honest pivot:** "We deleted 5 months of polished mobile app and rebuilt SMS-first in 48 hours when the evidence demanded it." Appears in "What did you learn this month?" and "Anything else?" — demonstrates we update on evidence and ship fast.

6. **The Skylight evidence:** We bought the leading paid product in the family-coordination category and abandoned it ourselves. That's stronger competitive analysis than any feature comparison — we are the customer, we paid the money, and the leading solution still failed. Use this in "Why did you pick this idea" and "Who are your competitors."

---

**End of draft.**

*Comments, edits, and disagreements welcome. The strongest version of this application is the one we both fully believe in. — Austin*
