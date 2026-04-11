# Kin AI — Founding Team Blueprint

**Kin Technologies LLC · kinai.family · Confidential**

Version 1.0 · April 2026

---

## Purpose

Austin Ford is a solo founder building Kin AI while working a full-time 9-to-5. This document defines the operating structure of a founding team composed primarily of AI agents, with Austin as the sole decision-maker and human operator. The goal is to run a tighter, faster, more disciplined operation than most 10-person startups — by being explicit about who does what, what requires human judgment, and where agents can operate autonomously.

This is not a hypothetical org chart. It is a working blueprint. Every role has a mandate, a daily rhythm, defined decision authority, and clear boundaries between what agents handle and what Austin must do himself.

---

## Operating Philosophy

Three principles govern this team:

**1. Apple-level quality bar, everywhere.** Every screen, every email, every social post, every document. If it wouldn't pass review at a company obsessed with craft, it doesn't ship. Agents are held to this standard. Austin is held to this standard.

**2. Question everything, ship fast.** The Lead Engineer and Chief of Staff have standing authority to challenge any feature, any process, any assumption. The default question is always: "Do we actually need this, or are we building it because it feels productive?" Complexity is the enemy. Simplicity ships.

**3. No money moves without Austin.** Period. Every dollar spent — tools, services, ads, contractors — requires explicit founder approval. Agents surface spending recommendations. Austin approves or kills them.

---

## The Founding Team

Seven roles. Each maps to a critical function. In a traditional startup these would be seven hires. Here, they are a combination of AI agent workflows and focused human time from Austin (and eventually contracted specialists).

| # | Role | Primary Operator |
|---|------|-----------------|
| 1 | Chief of Staff / Operations | Agent + Austin review |
| 2 | Lead Engineer | Agent (Claude Code) + Austin review |
| 3 | Brand & Growth Lead | Human (Austin) + Agent assist |
| 4 | Product & Design Lead | Agent + Austin approval |
| 5 | Business Operations Lead | Agent + Austin approval |
| 6 | QA & Standards Lead | Agent + Austin review |
| 7 | Intelligence Engineer | Agent + Austin approval |

---

## Role 1: Chief of Staff / Operations

### Mandate

The operational brain of Kin. Responsible for keeping every other role coordinated, surfacing decisions that need Austin's attention, maintaining the project timeline, and ensuring nothing falls through the cracks. This role is the connective tissue — it sees across all functions and flags conflicts, delays, and misaligned priorities before they become problems.

**Built-in mandate: Challenge assumptions.** The Chief of Staff has standing authority to question whether any task, feature, or initiative is actually necessary. If something can be cut to ship faster with higher quality, the CoS is expected to recommend the cut.

### Daily Tasks

| Task | Assignment | Time Est. | Notes |
|------|-----------|-----------|-------|
| Generate daily briefing for Austin | AGENT | — | Summary of: yesterday's progress, today's priorities, blockers, decisions needed. Delivered by 7am. |
| Review all role outputs from prior day | AGENT | — | Check that deliverables from Engineering, Growth, Product, and Business Ops meet quality bar. Flag anything substandard. |
| Prioritize and sequence today's work across roles | AGENT | — | Ensure no role is blocked waiting on another. Reorder if dependencies shift. |
| Surface 1–3 decisions requiring Austin's input | AGENT | — | Clear framing: what's the decision, what are the options, what does CoS recommend, what's the deadline. |
| Austin reviews briefing and makes decisions | HUMAN (Austin) | 15 min | Morning check-in. Read briefing, approve/reject/redirect. This is the single most important 15 minutes of the day. |

### Weekly Tasks

| Task | Assignment | Time Est. | Notes |
|------|-----------|-----------|-------|
| Weekly progress report | AGENT | — | Metrics vs. targets, completed milestones, upcoming blockers, updated timeline. |
| Run the "Kill List" review | AGENT + APPROVAL | 20 min | Identify features, tasks, or processes that should be cut, simplified, or deferred. Austin approves cuts. |
| Update project timeline and phase tracking | AGENT | — | Adjust dates based on actual velocity. Flag any phase that's falling behind. |
| Coordination sync across all roles | AGENT | — | Ensure Engineering knows what Product needs, Growth knows what's shipping, Business Ops has current numbers. |
| Austin weekly strategy review | HUMAN (Austin) | 30 min | Review weekly report, adjust priorities, make strategic calls. Sunday evening or Monday morning. |

### Monthly Tasks

| Task | Assignment | Time Est. | Notes |
|------|-----------|-----------|-------|
| Monthly operating review | AGENT + APPROVAL | 45 min | Full assessment: what shipped, what didn't, what changed, what we learned. Austin reviews and sets next month's direction. |
| Process optimization | AGENT | — | Identify bottlenecks in the operating model. Recommend changes to workflows, cadences, or role responsibilities. |
| Investor-ready update draft | AGENT + APPROVAL | 30 min | Even before raising, maintain a monthly update in investor-update format. Builds the habit and the data trail. |

### Key Deliverables

- Daily briefing (every morning, 7am)
- Weekly progress report (every Sunday)
- Monthly operating review (1st of each month)
- Updated project timeline (continuously maintained)
- Kill List recommendations (weekly)

### Decision Authority

| Autonomous | Needs Austin's Approval |
|-----------|------------------------|
| Reprioritize daily task order across roles | Cut or defer any feature or initiative |
| Flag quality issues and request revisions | Change project phase timelines |
| Generate reports and briefings | Any communication to external parties |
| Recommend process changes | Approve spending of any kind |

### Quality Bar

The daily briefing must be actionable in under 5 minutes. No filler. No "everything is on track" when it isn't. If something is behind, say it's behind and say why. The weekly report should be something Austin could forward to an investor without editing.

---

## Role 2: Lead Engineer

### Mandate

Build and maintain the Kin product. Responsible for all code — web app (Next.js), mobile app (React Native), backend (Supabase), AI integration (Anthropic API), payments (Stripe/RevenueCat), and infrastructure (Vercel). The Lead Engineer operates primarily through Claude Code, with Austin reviewing pull requests and approving architectural decisions.

**Built-in mandate: Fight for simplicity.** The Lead Engineer has standing authority to push back on any feature request that adds complexity without proportional user value. The question is always: "Can we ship this simpler?" If a feature can be cut to a simpler version that delivers 80% of the value, the Lead Engineer is expected to recommend that path.

### Sub-Agent Structure

The Lead Engineer coordinates specialized sub-agents for distinct feature domains:

| Sub-Agent | Domain | Scope |
|-----------|--------|-------|
| Auth & Onboarding Agent | Authentication, onboarding flow, partner invite | Supabase Auth, 5-question onboarding, dual profile setup |
| AI Chat Agent | Kin AI conversation engine | Anthropic API integration, context management, system prompt, conversation memory |
| Meals Agent | Meal planning + grocery intelligence | Meal plan generation, grocery list builder, store recommendations, rating loop |
| Budget Agent | Financial tracking | Manual entry, category management, subscription audit, spending alerts |
| Calendar Agent | Schedule coordination | Google Calendar API, Apple CalDAV, dual-parent merge, conflict detection |
| Infrastructure Agent | DevOps, deployment, monitoring | Vercel deployment, Supabase config, error tracking, performance |

### Daily Tasks

| Task | Assignment | Time Est. | Notes |
|------|-----------|-----------|-------|
| Execute highest-priority build tasks from sprint | AGENT (Claude Code) | — | Work through the prioritized task list. Write code, run tests, deploy to staging. |
| Run automated test suite | AGENT | — | All tests must pass before any deploy. No exceptions. |
| Code quality review (self-review) | AGENT | — | Check for: unused code, console.logs, hardcoded values, missing error handling, accessibility gaps. |
| Deploy to staging for review | AGENT | — | Every meaningful change goes to staging first. Never direct to production. |
| Austin reviews staging + approves deploy | HUMAN (Austin) | 15–30 min | Test the actual app. Click through flows. Approve production deploy or flag issues. |

### Weekly Tasks

| Task | Assignment | Time Est. | Notes |
|------|-----------|-----------|-------|
| Sprint planning (next week's priorities) | AGENT + APPROVAL | 20 min | Agent proposes sprint based on phase goals. Austin approves or adjusts. |
| Technical debt review | AGENT | — | Identify and document tech debt. Recommend what to address now vs. defer. |
| Dependency and security audit | AGENT | — | Check for outdated packages, known vulnerabilities, breaking changes in dependencies. |
| Performance check | AGENT | — | Page load times, API response times, Anthropic API costs per conversation. Flag anything degrading. |
| Architecture review for upcoming features | AGENT + APPROVAL | 15 min | Before building any new feature, review the proposed approach with Austin. Prevent over-engineering. |

### Monthly Tasks

| Task | Assignment | Time Est. | Notes |
|------|-----------|-----------|-------|
| Full codebase health assessment | AGENT | — | Test coverage, bundle size, database query performance, API cost trends. |
| Supabase usage and cost review | AGENT | — | Monitor database size, auth usage, storage. Flag if approaching paid tier thresholds. |
| Infrastructure cost report | AGENT + APPROVAL | 15 min | Total hosting/API/infra costs. Projections based on user growth. Austin reviews. |

### Key Deliverables

- Working, tested code deployed to staging (daily)
- Sprint plan (weekly)
- Technical health report (monthly)
- Production deploys (as approved by Austin)

### Decision Authority

| Autonomous | Needs Austin's Approval |
|-----------|------------------------|
| Implementation details (how to build it) | What to build (feature scope and priority) |
| Code structure, naming, file organization | Architectural decisions that affect future flexibility |
| Bug fix prioritization (critical = fix now) | Any new third-party service or dependency |
| Staging deployments | Production deployments |
| Recommend simpler alternatives to requested features | Cutting or changing a planned feature |

### Quality Bar

Every screen must match the brand guide. Dark theme (#0C0F0A background), correct typography (Instrument Serif for emotion, Geist for function, Geist Mono for system), correct color domain rules. No generic-looking UI. The app should feel like a premium product from the first tap. Code must be clean, typed (TypeScript strict), and tested. No "we'll fix it later" shortcuts on user-facing flows.

### Review Gates (Where Lead Engineer Pushes Back)

1. **Before building any feature:** "Is this necessary for the current phase? Can it be simpler?"
2. **Before adding any dependency:** "Can we build this without a new library? What's the maintenance cost?"
3. **Before any API integration:** "What happens when this third-party goes down? Is the fallback graceful?"
4. **Before any database schema change:** "Is this schema flexible enough for the next 2 phases, or are we painting ourselves into a corner?"

---

## Role 3: Brand & Growth Lead

### Mandate

Own the Kin brand voice, content strategy, and user acquisition funnel. This is the most human-intensive role because authentic content creation, community engagement, and brand judgment require a human touch that agents cannot fully replicate today.

Austin's sales and marketing background is Kin's unfair advantage. This role leverages it.

### Daily Tasks

| Task | Assignment | Time Est. | Notes |
|------|-----------|-----------|-------|
| Create and post 1 short-form video (TikTok/Reels/Shorts) | HUMAN (Austin) + AGENT ASSIST | 30–45 min | Austin records screen + voiceover. Agent can draft scripts, suggest hooks, edit captions. But the voice and judgment must be Austin's. |
| Engage in 2–3 Reddit/Facebook communities | HUMAN (Austin) | 15–20 min | Genuine answers to real questions. Mention Kin only when naturally relevant. Agent can surface relevant threads; Austin writes the replies. |
| Draft and schedule social captions | AGENT + APPROVAL | 5 min | Agent drafts captions following brand voice guide. Austin approves or edits before posting. |
| Monitor and respond to comments/DMs | HUMAN (Austin) | 10 min | Early-stage community building requires the founder's voice. Can be partially delegated after 500+ followers. |

### Weekly Tasks

| Task | Assignment | Time Est. | Notes |
|------|-----------|-----------|-------|
| Plan next week's content calendar | AGENT + APPROVAL | 15 min | Agent proposes 5–6 videos mapped to value props (Monday=Meals, Tuesday=Budget, etc.). Austin approves themes and hooks. |
| Write 1 email to the waitlist/subscriber list | HUMAN (Austin) + AGENT ASSIST | 20 min | Agent drafts; Austin rewrites in his voice. These emails must feel personal, not automated. |
| Review growth metrics | AGENT | — | Waitlist signups, video views, engagement rates, trial starts by source. Surfaced in weekly report. |
| Identify and reach out to 2–3 micro-influencers | HUMAN (Austin) + AGENT ASSIST | 15 min | Agent can research and shortlist. Austin sends the DM. Authenticity matters — this cannot be automated. |

### Monthly Tasks

| Task | Assignment | Time Est. | Notes |
|------|-----------|-----------|-------|
| Content performance review | AGENT | — | Which videos performed, which hooks worked, which platforms drove trials. Data-driven recommendations for next month. |
| Brand consistency audit | AGENT | — | Review all published content against brand guide. Flag any drift in voice, visuals, or messaging. |
| Competitive content scan | AGENT | — | What are Cozi, Monarch, YNAB, Mealime doing in content? Any trends to adopt or avoid? |
| Newsletter partnership outreach | HUMAN (Austin) | 30 min | After real member results exist: pitch 3–5 parenting newsletters. Agent researches targets; Austin writes pitches. |

### Key Deliverables

- 5–6 short-form videos per week (during first 90 days)
- Weekly email to list
- Growing waitlist/follower counts (tracked weekly)
- Content calendar (maintained weekly)
- Influencer outreach pipeline

### Decision Authority

| Autonomous (Agent) | Needs Austin's Judgment |
|-----------|------------------------|
| Draft scripts, captions, email copy | Final approval on all published content |
| Research influencers and newsletter targets | Any outreach message sent from Kin's accounts |
| Analyze content performance metrics | Brand voice decisions and creative direction |
| Propose content calendar | Paid advertising spend (any amount) |
| Surface trending formats and hooks | Partnerships or collaborations |

### Quality Bar

Every piece of content must feel like it came from a real parent who built something they're proud of — not a SaaS marketing playbook. The brand voice is warm, direct, specific, and human. No jargon, no passive voice, no "leverage AI-powered insights." If a video doesn't make a tired parent stop scrolling in the first 3 seconds, it doesn't ship.

---

## Role 4: Product & Design Lead

### Mandate

Own the user experience, visual design, and interaction quality of the Kin product. Responsible for translating Kin's vision into specific, buildable requirements that the Lead Engineer can execute — covering both UX flows (what the user does) and visual design (what the user sees). Every screen, every component state, every motion moment must meet the Apple-quality bar before it ships to users.

This role has two equally weighted functions: **product specification** (feature logic, flows, edge cases) and **visual design specification** (color, typography, spacing, shape, static vs. fluid behavior). Neither function is subordinate to the other. A screen that works correctly but looks wrong is not done. A screen that looks beautiful but behaves confusingly is not done.

**Built-in mandate: Own the seam between spec and build.** Product & Design is responsible for what falls between "what we decided to build" and "what Lead Eng implemented." That seam is where visual quality gets lost. This role closes it by producing component specs specific enough that Lead Eng has no visual decisions to make independently.

### Daily Tasks

| Task | Assignment | Time Est. | Notes |
|------|-----------|-----------|-------|
| Review staging builds against design specs | AGENT | — | Compare what was built to what was specified. Flag deviations in layout, spacing, typography, color, component state rendering, and motion behavior. |
| Write feature specs for upcoming sprint items | AGENT + APPROVAL | 10 min | Detailed specs: what the user sees, what happens on tap, edge cases, error states. Austin reviews for alignment with vision. |
| Prioritize bug reports by user impact | AGENT | — | Categorize: blocks core flow (P0), degrades experience (P1), cosmetic (P2). P0s go to Lead Engineer immediately. |

### Weekly Tasks

| Task | Assignment | Time Est. | Notes |
|------|-----------|-----------|-------|
| User flow audit | AGENT | — | Walk through every core flow as a new user. Document friction points. For v0: onboarding → Today screen → alert interaction → Conversations → Settings. |
| Component spec delivery | AGENT + APPROVAL | 20 min | Before Lead Eng builds any new screen or component: produce a full visual spec. Spec must include: layout, color tokens, typography scale, spacing, all component states (default, loading, empty, error, interactive), and motion behavior (static vs. fluid, easing, duration). Austin approves before build begins. |
| Competitive UX + visual review | AGENT | — | Screenshot and analyze one competitor's UX and visual design each week. What do they do well? What's broken? What can Kin learn? |
| Feature prioritization for next sprint | AGENT + APPROVAL | 15 min | Recommend what to build next based on: phase goals, user feedback (once live), and complexity. Austin approves. |
| Design system maintenance | AGENT | — | Ensure all components follow brand guide. Document any new patterns that emerge from new screens. |

### Monthly Tasks

| Task | Assignment | Time Est. | Notes |
|------|-----------|-----------|-------|
| Full UX + visual audit against brand guide | AGENT | — | Every screen checked against typography, color, spacing, interaction standards, and motion behavior. Includes checking for visual regressions introduced by engineering sessions. |
| User feedback synthesis (post-launch) | AGENT + APPROVAL | 20 min | Aggregate all user feedback. Identify top 3 pain points and top 3 loved features. Austin reviews and sets direction. |
| Feature roadmap update | AGENT + APPROVAL | 20 min | Revise the roadmap based on what's shipped, what's changed, and what users are asking for. |
| App Store visual asset planning | AGENT + APPROVAL | 30 min | Beginning 3–4 weeks before App Store submission: produce specs for screenshots (5 required), app preview video storyboard, and icon refinement. These are purpose-built marketing artifacts, not app screenshots — they must sell Kin in 3 seconds to a stranger. Austin approves direction before production. |

### Key Deliverables

- Feature specs (before any feature is built)
- **Component visual specs** — layout, color tokens, typography, spacing, all states, motion behavior (before any component is built)
- **Interaction design specs** — static vs. fluid decisions, easing curves, transition timing for all state changes (OPEN → ACKNOWLEDGED → RESOLVED, screen transitions, skeleton loading)
- **Silence state design** — explicit spec for what Today looks like when Kin has nothing to surface (must feel intentional, not empty)
- **First-use emotional moment visual spec** — the day-one Today screen deserves specific visual attention before Lead Eng builds it
- UX audit reports (weekly)
- Prioritized backlog (maintained continuously)
- Design system documentation
- App Store visual assets (pre-submission)

### Decision Authority

| Autonomous | Needs Austin's Approval |
|-----------|------------------------|
| Spec out implementation details of approved features | New feature additions to the roadmap |
| Flag UX or visual quality issues and request revisions | Changes to core flows (onboarding, FVM, checkout) |
| Prioritize bug fixes by severity | Removing or significantly changing an existing feature |
| Maintain design system consistency | Any UX or visual pattern that deviates from brand guide |
| **Block a build from starting without a component spec** | Changes to brand color system or typography scale |
| Define motion and interaction behavior | App Store asset direction |

### Quality Bar

The Today screen is the most important screen in the product. Every component on it — the briefing card, alert cards in all three states, check-in cards, the silence state — must be visually intentional and spec-compliant before Lead Eng touches it.

Visual design specifications must go beyond layout. They must answer: What is the exact easing on this transition? Is this element static or does it respond to interaction? What does the ACKNOWLEDGED state look like versus OPEN — and is the difference immediately legible without a label? What does the user see in the 1.5 seconds before the briefing card loads?

If a screen looks like it could belong to any app, it's not done. If a component state was improvised by the engineer because no spec existed, that's a process failure. Kin's dark theme, warm typography, and domain-specific color system must be evident in every interaction — and Product & Design is responsible for ensuring Lead Eng never has to guess at any of it.

---

## Role 5: Business Operations Lead

### Mandate

Own the financial, legal, and administrative infrastructure of Kin. Responsible for tracking revenue, managing subscriptions, monitoring costs, maintaining legal compliance, and preparing the business for investor conversations and accelerator applications.

### Daily Tasks

| Task | Assignment | Time Est. | Notes |
|------|-----------|-----------|-------|
| Monitor Stripe dashboard (post-launch) | AGENT | — | New subscribers, churns, failed payments, MRR. Surfaced in daily briefing. |
| Track trial-to-paid conversion metrics | AGENT | — | Who started trials, who's on day 3, who's on day 6, who converted. |
| Flag any failed payments or billing issues | AGENT | — | Immediate alert to Austin for anything that needs manual intervention. |

### Weekly Tasks

| Task | Assignment | Time Est. | Notes |
|------|-----------|-----------|-------|
| Weekly financial summary | AGENT | — | MRR, new members, churned members, trial conversion rate, revenue by plan. |
| Cost tracking | AGENT | — | Anthropic API spend, Vercel, Supabase, tools, any other costs. Projected monthly burn. |
| Accelerator/investor readiness check | AGENT | — | Are we at the metrics threshold for the next target application? If yes, flag it. |

### Monthly Tasks

| Task | Assignment | Time Est. | Notes |
|------|-----------|-----------|-------|
| Full P&L report | AGENT + APPROVAL | 15 min | Revenue, costs, margin. Austin reviews. |
| Legal compliance check | AGENT + APPROVAL | 15 min | Privacy policy up to date? Terms of service current? Ohio LLC annual requirements? Apple/Google compliance? |
| Tax and accounting prep | HUMAN + AGENT ASSIST | 30 min | Agent organizes transactions and receipts. Austin (or accountant) reviews for quarterly estimates. |
| Accelerator application drafts | AGENT + APPROVAL | 30 min | When metrics hit thresholds: draft applications for Google for Startups, Microsoft for Startups, The Brandery, YC. Austin reviews and submits. |

### Key Deliverables

- Daily revenue snapshot (in daily briefing)
- Weekly financial summary
- Monthly P&L
- Accelerator application drafts (as milestones are hit)
- Legal compliance documentation

### Decision Authority

| Autonomous | Needs Austin's Approval |
|-----------|------------------------|
| Generate financial reports and projections | Any spending decision (any amount) |
| Monitor and flag billing issues | Pricing changes |
| Draft legal documents and applications | Signing any legal document or agreement |
| Track and project costs | Tax filings and financial commitments |
| Recommend cost optimizations | Changing any vendor or service provider |

### Quality Bar

Financial numbers must be exact — no rounding, no estimates where actuals exist. Reports should be investor-presentable at all times. Legal documents must be reviewed by Austin before any external use. Cost projections must include both current state and projected state at 100, 500, and 1,000 members.

---

## Role 6: QA & Standards Lead

### Mandate

Own quality assurance across the entire operation — not just code, but content, documents, communications, and process. This role exists because maintaining Apple-level quality requires dedicated attention. The QA Lead is the last line of defense before anything reaches a user, an investor, or the public.

### Daily Tasks

| Task | Assignment | Time Est. | Notes |
|------|-----------|-----------|-------|
| Test staging builds before production deploy | AGENT | — | Full regression on core flows: onboarding, meal plan, grocery list, budget, calendar, chat. |
| Review outgoing content for brand consistency | AGENT | — | Check video captions, emails, social posts against brand voice and visual standards. |
| Cross-device testing (post-mobile launch) | AGENT | — | Web, iOS, Android. Ensure parity and no platform-specific regressions. |

### Weekly Tasks

| Task | Assignment | Time Est. | Notes |
|------|-----------|-----------|-------|
| End-to-end user journey test | AGENT | — | New user signup → onboarding → meal plan → grocery list → budget → calendar → partner invite. Document any break. |
| Performance benchmarking | AGENT | — | Page load times, time-to-first-meal-plan, API response times. Compare to prior week. |
| Accessibility audit | AGENT | — | Color contrast, screen reader compatibility, touch target sizes. |
| Security review | AGENT | — | Check for exposed API keys, insecure endpoints, data leakage between parent profiles. The dual-profile privacy model must be bulletproof. |

### Monthly Tasks

| Task | Assignment | Time Est. | Notes |
|------|-----------|-----------|-------|
| Full regression suite across all features | AGENT | — | Every feature tested. Every edge case documented. |
| Quality metrics report | AGENT | — | Bug count by severity, time-to-fix, user-reported issues vs. internally caught. |
| Standards documentation update | AGENT | — | Keep the quality checklist current as new features ship. |

### Key Deliverables

- Test results before every production deploy
- Weekly quality report
- Monthly regression results
- Maintained quality checklist and test suite

### Decision Authority

| Autonomous | Needs Austin's Approval |
|-----------|------------------------|
| Block a production deploy if tests fail | Shipping a known bug (even minor) |
| File and prioritize bug reports | Relaxing any quality standard |
| Run any test at any time | Changes to the quality checklist |
| Flag brand inconsistencies in content | — |

### Quality Bar

The QA Lead holds everyone else to the quality bar. If the QA Lead wouldn't use the feature themselves, it doesn't ship. Zero tolerance for: broken core flows, data leaking between parent profiles, incorrect financial calculations, brand-inconsistent content.

---

## Role 7: Intelligence Engineer

### Mandate

Own the AI behavior layer. Translate the coordination intelligence engine spec (`kin-v0-intelligence-engine.md`) into working system prompts and validate that Kin's actual outputs conform to the spec before they reach users. This role sits between Product & Design (what Kin should say) and Lead Engineering (how Kin is built) — it owns the quality of what the model actually produces.

Without this role, the intelligence engine spec is a document. With it, the spec is enforced in every briefing, alert, and check-in card that surfaces to a real user.

**Built-in mandate: Zero tolerance for soft drift.** Every output template — briefing copy, alert text, check-in card, closure line — must pass the §26 validation test before it ships. "Good enough for now" on tone is never acceptable. Tone debt compounds faster than technical debt.

### Sub-Agent Structure

| Sub-Agent | Domain | Scope |
|-----------|--------|-------|
| Prompt Architect | System prompts for all output types | Briefing, alert, check-in, chat, closure, first-use moment |
| Output Validator | Spec compliance testing | Tone rules, silence rules, confidence signaling, output limits |
| Trigger Test Agent | Intelligence engine scenario testing | Pickup risk, late schedule change, all §3 trigger conditions |

### Daily Tasks

| Task | Assignment | Time Est. | Notes |
|------|-----------|-----------|-------|
| Review any new AI output templates against §26 (soft drift) | AGENT | — | Before any new prompt or copy ships, run the validation test: "Would this feel helpful to a busy, slightly stressed user?" If not a clear yes: cut or tighten. |
| Test active system prompts against §11 failure modes | AGENT | — | Check for: false alarms, vague outputs, wrong parent assignment, repetition, noise overload. Flag any failure mode detected. |
| Validate tone compliance in staged outputs | AGENT | — | No prohibited phrases (§8), output limits enforced (§5), confidence signaling correct (§23). |

### Weekly Tasks

| Task | Assignment | Time Est. | Notes |
|------|-----------|-----------|-------|
| Full drift review before sprint ships | AGENT + APPROVAL | 15 min | Audit all output templates that shipped or changed this week against §26 patterns. Flag: unnecessary preamble, stacked hedges, generic reassurance, insights that change nothing, over-explained silence. Austin approves any template with a marginal call. |
| Trigger scenario test suite | AGENT | — | Run standard household scenarios against Pickup Risk (§3A) and Late Schedule Change (§3C) detection logic. Verify correct output for: Red conflict, Yellow responsibility, Clear coverage. |
| Prompt refinement log | AGENT | — | Document what changed in any system prompt, why, and what output quality improvement was achieved. Maintains a version trail for confidence calibration later. |
| Social tone calibration audit (§16) | AGENT | — | Check that outputs involving both parents use collaborative tone correctly. Direct vs. collaborative vs. ambiguous routing (§16) must be applied consistently. |

### Monthly Tasks

| Task | Assignment | Time Est. | Notes |
|------|-----------|-----------|-------|
| Full spec compliance review | AGENT + APPROVAL | 30 min | Every active output type checked against its spec section. Briefing vs. §10, alerts vs. §10, check-ins vs. §10, closures vs. §24, recovery vs. §25, confidence signaling vs. §23. Austin reviews any deviations. |
| Confidence threshold calibration | AGENT + APPROVAL | 20 min | Post-launch: use dismissal signal data (§14) and correction patterns (§9) to assess whether High/Medium/Low thresholds are correctly tuned. Recommend adjustments. Austin approves. |
| First-use emotional moment audit (§21) | AGENT | — | Verify the engineered day-one insight is landing correctly. Check: specificity to the user's life, relief framing, closing relief line, correct timing. |
| Layer 2 readiness assessment | AGENT + APPROVAL | 15 min | Evaluate whether Schedule Compression (§3B), Responsibility Shift (§3D), and Escalation tiers (§15) are ready to ship. Must pass trigger test suite and drift review before going live. |

### Key Deliverables

- System prompts for every Kin output type (briefing, alert, check-in card, chat response, closure line, failure recovery)
- Trigger detection test scenarios (maintained and run weekly)
- Drift review report (before every sprint ship)
- Monthly spec compliance report
- Prompt version log (continuously maintained)

### Decision Authority

| Autonomous | Needs Austin's Approval |
|-----------|------------------------|
| Update system prompts to fix drift or tone issues | Changes to confidence thresholds (§4) |
| Block any output template that fails §26 validation | Changes to silence rules (§7) — affects what users see |
| File and prioritize output quality bugs | Adding any new output type or surface |
| Run trigger test scenarios at any time | Relaxing any spec constraint |
| Flag Lead Engineer if detected logic violates spec | Shipping any first-use moment (§21) copy |

### Quality Bar

Every output that reaches a user must pass the §26 test: "Would this feel helpful to a busy, slightly stressed user?" No exceptions, no provisional approvals. The specific failure modes in §11 are treated as critical bugs — if any appears in testing, it blocks the ship.

The first-use emotional moment (§21) is the highest-stakes output in the product. It must be tested with real onboarding data before every TestFlight build. A generic day-one insight is a product failure.

The Intelligence Engineer holds the model to the same standard the QA Lead holds the code. Both roles have veto authority over their domain. Neither yields to schedule pressure.

---

## Human vs. Agent Assignment — Full Summary

### Assignment Categories

- **AGENT**: Fully autonomous. No human input needed. Agent executes and reports results.
- **AGENT + APPROVAL**: Agent does the work. Austin reviews and approves before it goes live or takes effect.
- **HUMAN (Austin)**: Must be done by Austin personally. Cannot be delegated to an agent or contractor today.
- **HUMAN + AGENT ASSIST**: Human leads the task. Agent supports with research, drafts, analysis, or tooling.

### What Agents Do Well Today

Agents excel at: code generation and testing, data analysis and reporting, document drafting, content scheduling, metrics monitoring, competitive research, spec writing, quality auditing, task coordination, and pattern-based decision-making.

### What Agents Cannot Do Well Today

Agents struggle with: authentic community engagement (Reddit, Facebook groups), creative brand judgment (does this *feel* right?), founder-voice content (emails, DMs, pitches that must sound like Austin), relationship building (influencer outreach, investor conversations), strategic pivots (when the data says one thing but instinct says another), and anything requiring real-time human interaction (user interviews, demo calls).

### Austin's Daily Time Budget

Target: 2–3 hours per day, executed in focused blocks around the 9-to-5.

| Block | Time | Tasks |
|-------|------|-------|
| Morning (7:00–7:30am) | 30 min | Review daily briefing. Make decisions. Approve/reject. Review staging. |
| Lunch (12:00–12:30pm) | 30 min | Community engagement (Reddit/Facebook). Respond to DMs/comments. |
| Evening (7:00–9:00pm) | 90–120 min | Record video content. Write/approve emails. Review weekly reports. Sprint planning. Strategic thinking. |

**Total: ~2.5 hours/day, 7 days/week during pre-launch and launch phases.**

### Tasks That Can Be Contracted Out (Post-Revenue)

Once Kin generates revenue, these tasks can move from Austin to a contracted specialist:

| Task | When to Contract | Est. Cost | Role |
|------|-----------------|-----------|------|
| Video editing (polish, captions, formatting) | After 500 followers or $1k MRR | $300–500/mo | Freelance editor |
| Community management (responding to comments) | After 1,000 followers | $500–800/mo | Part-time VA |
| Customer support (post-launch) | After 100 paying members | $500–800/mo | Part-time VA |
| Bookkeeping and tax prep | After $5k MRR | $200–400/mo | Bookkeeper |
| Legal review (terms, privacy, compliance) | As needed | $200–500/review | Attorney |

---

## The "Question Everything" Culture

### The Standing Mandate

The Lead Engineer and Chief of Staff have a permanent, non-negotiable mandate to challenge assumptions across the entire operation. This is not optional — it is a core job function. If either role is not regularly pushing back, something is wrong.

### What They Challenge

1. **Feature necessity.** "Do users actually need this, or are we assuming they do?"
2. **Complexity.** "Can this be built in half the time with 80% of the value?"
3. **Sequencing.** "Should this be built now, or is it a Phase 3 item we're pulling forward?"
4. **Quality.** "Does this meet the bar, or are we shipping it because we're tired of working on it?"
5. **Spending.** "Do we need this tool/service, or can we use what we already have?"

### Review Gates

These are the specific moments where pushback is expected and welcomed:

| Gate | When | Who Challenges | What They Ask |
|------|------|---------------|---------------|
| Feature Proposal | Before any new feature enters a sprint | Lead Engineer | "Is this the simplest version? What can we cut?" |
| Sprint Planning | Weekly | Chief of Staff | "Are these the highest-impact items? What's not on this list that should be?" |
| Pre-Deploy | Before every production push | QA Lead + Lead Engineer | "Does this meet the bar? Would we be proud to show this to a user? To an investor?" |
| Content Publish | Before any content goes live | Chief of Staff | "Does this match brand voice? Is this something our target user would share?" |
| Spend Request | Before any purchase | Chief of Staff + Business Ops | "Is there a free alternative? Can we defer this? What's the ROI?" |
| Monthly Review | First of each month | All roles | "What did we build this month that we shouldn't have? What should we have built instead?" |

### The Kill List Framework

Every week, the Chief of Staff generates a "Kill List" — a recommendation of things to cut, simplify, or defer. Austin reviews and approves.

**Kill List criteria — a feature or task goes on the Kill List if:**

1. It doesn't directly contribute to the current phase's goal.
2. It adds complexity without proportional user value.
3. It depends on a third-party approval that hasn't been received.
4. It's a "nice to have" that's consuming time that could go to a "must have."
5. It was planned before we learned something that changed the calculus.
6. It would delay the First Value Moment (meal plan) for any user.

**Kill List format:**

| Item | Why It's on the List | Recommendation | Impact of Cutting |
|------|---------------------|----------------|-------------------|
| [Feature/task] | [Reason] | Cut / Simplify / Defer to Phase X | [What we gain: time, focus, simplicity] |

Austin reviews weekly. Approved cuts are permanent unless explicitly reversed.

---

## Coordination & Communication Model

### How Roles Coordinate

No meetings. No Slack channels. All coordination happens through structured async artifacts managed by the Chief of Staff.

| Artifact | Cadence | Owner | Consumers |
|----------|---------|-------|-----------|
| Daily Briefing | Every morning, 7am | Chief of Staff | Austin (primary), all roles (reference) |
| Sprint Board | Updated continuously | Lead Engineer | Product, QA, Chief of Staff |
| Content Calendar | Updated weekly | Brand & Growth (Austin) | Chief of Staff |
| Financial Dashboard | Updated daily (post-launch) | Business Ops | Chief of Staff, Austin |
| Quality Report | Updated weekly | QA Lead | Lead Engineer, Product, Austin |
| Kill List | Generated weekly | Chief of Staff | Austin (approver) |

### Decision Flow to Austin

All decisions follow the same path:

1. **Role identifies** a decision that needs Austin's input.
2. **Role frames** the decision: context, options, recommendation, deadline.
3. **Chief of Staff includes** it in the daily briefing (or escalates immediately if urgent).
4. **Austin decides** during his morning review (or immediately if escalated).
5. **Chief of Staff distributes** the decision to affected roles.

### How Dispatch Fits In

Dispatch (the Cowork agent environment) serves as the command center where Austin interfaces with all roles. It is the single pane of glass:

- Austin opens Dispatch to receive his daily briefing.
- Austin uses Dispatch to issue directives, approve decisions, and review outputs.
- All agent roles report through Dispatch.
- Dispatch maintains the project's persistent memory — context that carries across sessions.

### Escalation Paths

| Severity | Example | Escalation |
|----------|---------|-----------|
| **Critical (P0)** | Production is down. Data breach. Payment system broken. | Immediate alert to Austin. All other work stops until resolved. |
| **High (P1)** | Core flow broken on staging. Security vulnerability found. User-facing bug affecting conversion. | In daily briefing, flagged as top priority. Addressed in Austin's morning review. |
| **Medium (P2)** | Non-critical bug. Suboptimal UX. Minor brand inconsistency. | In weekly report. Addressed in sprint planning. |
| **Low (P3)** | Cosmetic issue. Minor optimization. Documentation update. | Logged. Addressed when capacity allows. |

### Cadence Summary

| Cadence | What | Austin's Time |
|---------|------|---------------|
| Daily | Review briefing, approve decisions, review staging | 15–30 min (morning) |
| Daily | Content creation, community engagement | 45–60 min (lunch + evening) |
| Weekly | Strategy review, sprint approval, Kill List review | 60–90 min (Sunday/Monday) |
| Monthly | Operating review, financial review, roadmap update | 2–3 hours |

---

## Budget & Spending Controls

### The Rule

**No money is spent without Austin's explicit, documented approval.** No exceptions. No "we'll expense it later." No "it's only $10/month." Every dollar is approved before it's committed.

### How Spending Requests Work

1. Any role identifies a need that requires spending.
2. The role creates a Spending Request with: what it is, why it's needed, the cost (monthly and annual), alternatives considered (including free alternatives), and expected ROI.
3. The Chief of Staff includes the request in the daily briefing.
4. Austin approves, rejects, or defers.
5. Approved spending is logged in the monthly P&L.

### Expected Cost Categories

| Category | Examples | Current Monthly | At 100 Members | At 1,000 Members |
|----------|---------|----------------|-----------------|-------------------|
| **Infrastructure** | Vercel, Supabase, domain | $0–20 | $20–50 | $100–300 |
| **AI / API** | Anthropic API usage | $0–50 | $200–500 | $2,000–5,000 |
| **Payments** | Stripe fees (2.9% + $0.30) | $0 | ~$150 | ~$1,500 |
| **Mobile** | Apple Developer ($99/yr), Google Play ($25) | ~$10 | ~$10 | ~$10 |
| **Email** | Beehiiv, Google Workspace | $0–15 | $15–30 | $30–100 |
| **Analytics** | PostHog | $0 | $0 | $0–50 |
| **Marketing** | Paid ads, influencer payments | $0 | $0–500 | $1,000–3,000 |
| **Contractors** | Video editing, VA, bookkeeper | $0 | $0–500 | $1,000–2,500 |
| **Legal** | Attorney reviews, filings | $0 | $0–200 | $200–500 |
| **TOTAL** | | **$0–95** | **$395–1,940** | **$4,830–12,960** |

### Spending Principles

1. Free tier everything until free tiers are exhausted.
2. Annual billing only when monthly commitment is proven (3+ months of use).
3. No marketing spend until organic content proves the message works.
4. No contractor spend until Austin's time is clearly the bottleneck.
5. Every cost must be justifiable to an investor asking "where did the money go?"

---

## Priority Zero: Path to $2,600/Month Net Profit

This is the single most important financial milestone. $2,600/month net profit covers Austin's rent. Until this number is hit, nothing else matters — not feature expansion, not accelerator applications, not hiring. Every decision filters through: "Does this get us to $2,600 net faster?"

### The Math: Subscribers Needed

Revenue per subscriber depends on plan mix and payment method. Here's the realistic breakdown.

**Assumptions:**
- Web signups (Stripe): 3% processing fee
- App Store signups: 15% fee (Small Business Program)
- Estimated split: 60% web / 40% App Store (aggressively pushing web checkout via "save 15%" messaging)
- Plan mix estimate: 30% Starter ($29) / 70% Family ($49) — families are the core audience, most will want dual profiles

**Net revenue per subscriber (blended):**

| Channel | Starter ($29) | Family ($49) | Fee | Net Starter | Net Family |
|---------|--------------|-------------|-----|-------------|------------|
| Web (Stripe, 60%) | $29 | $49 | 3% | $28.13 | $47.53 |
| App Store (40%) | $33 | $57 | 15% | $28.05 | $48.45 |

**Blended net per subscriber** (30% Starter / 70% Family, 60/40 web/app split): **~$41.50/month**

### Monthly Expenses by Subscriber Count

| Expense | 0 subs (building) | 25 subs | 50 subs | 75 subs | 100 subs |
|---------|-------------------|---------|---------|---------|----------|
| Vercel (hosting) | $0 | $0 | $20 | $20 | $20 |
| Supabase | $0 | $0 | $25 | $25 | $25 |
| Anthropic API | $10 | $75 | $150 | $225 | $300 |
| Google Workspace | $7 | $7 | $7 | $7 | $7 |
| Beehiiv | $0 | $0 | $0 | $0 | $42 |
| Domain (annual/12) | $3 | $3 | $3 | $3 | $3 |
| Apple Developer (annual/12) | $8 | $8 | $8 | $8 | $8 |
| Google Play (one-time, amortized) | $2 | $0 | $0 | $0 | $0 |
| PostHog | $0 | $0 | $0 | $0 | $0 |
| RevenueCat | $0 | $0 | $0 | $0 | $0 |
| **Total Monthly Burn** | **$30** | **$93** | **$213** | **$288** | **$405** |

**Notes on API costs:** Anthropic API is the biggest variable. Estimated at ~$3/subscriber/month for moderate chat usage (context compression, efficient prompting). This is conservative — could be $2–5 depending on conversation depth. The Lead Engineer's mandate to optimize context management directly impacts margin.

### The Break-Even Table

| Subscribers | Gross Revenue (blended) | Expenses | Net Profit | vs. $2,600 Target |
|-------------|------------------------|----------|------------|-------------------|
| 25 | $1,038 | $93 | **$945** | -$1,655 |
| 50 | $2,075 | $213 | **$1,862** | -$738 |
| 63 | $2,615 | $255 | **$2,360** | -$240 |
| 68 | $2,822 | $272 | **$2,550** | -$50 |
| **70** | **$2,905** | **$278** | **$2,627** | **TARGET HIT** |
| 75 | $3,113 | $288 | **$2,825** | +$225 buffer |
| 100 | $4,150 | $405 | **$3,745** | +$1,145 buffer |

**The number: 70 paying subscribers at blended pricing covers rent.** Not 100. Seventy.

This changes the launch psychology. The "first 100 members" goal from the launch plan is the growth milestone. But the survival milestone — rent covered, pressure off — is 70 subscribers.

### Realistic Timeline to $2,600 Net

Based on the 30-day launch playbook, mapped to the financial model:

| Week | Milestone | Cumulative Paying Members | Net Profit |
|------|-----------|--------------------------|------------|
| Week 1–3 | Building. No revenue. | 0 | -$30/mo burn |
| Week 4 | Founding 50 offer ($29 locked). Beta opens. | 10–20 | $387–$797 |
| Week 5 | Trial wave 1 converts. | 25–35 | $945–$1,338 |
| Week 6 | Trial wave 2. Word of mouth starting. | 40–50 | $1,468–$1,862 |
| Week 7 | Product Hunt launch. Referral program. | 55–65 | $2,118–$2,482 |
| **Week 8** | **Organic growth + referrals compounding.** | **70+** | **$2,627+** |

**Realistic estimate: 8 weeks from launch day (not from today — from the day trials open) to hit $2,600 net.** Conservative estimate: 10–12 weeks. If content hits and a video goes viral, it could happen in 5–6 weeks.

Total timeline from today: Phase 0 (1–2 weeks) + Phase 1 build (3–4 weeks) + launch to $2,600 net (8 weeks) = **roughly 12–14 weeks, or mid-July 2026.**

### Levers to Get There Faster

Ranked by impact and feasibility:

**1. Maximize Family plan adoption (highest impact, no cost)**
Every subscriber who picks Family ($49) instead of Starter ($29) is worth $20/month more. At 70% Family mix, you need 70 subscribers. At 50% Family mix, you'd need 78. The onboarding flow, pricing page, and trial emails should all make the Family plan the obvious choice for any household with two parents. The "Invite your partner" prompt after the FVM is the conversion mechanism.

**2. Push web signups aggressively (saves 12% per subscriber)**
Every subscriber acquired through kinai.family instead of the App Store saves ~$5–6/month in platform fees. The "Subscribe on web — save 15%" button in the iOS app is not optional — it's a margin lever. At 70 subscribers, moving from 60/40 web/app to 80/20 saves ~$80/month.

**3. Annual plan conversion ($290/$490 upfront)**
Offering 2 months free on annual plans ($290 Starter, $490 Family) means less revenue per month but cash upfront. If 20% of subscribers go annual, that's 14 subscribers × ~$400 average = $5,600 in immediate cash. This doesn't change the monthly net calculation but provides a cash buffer that buys time.

**4. Founding member pricing as urgency tool**
The "$29/month locked forever" founding offer creates FOMO and accelerates early conversions. Limit it to 50 spots. When it fills, the next cohort pays full price. The locked price means lower LTV per founding member, but the speed of acquisition matters more than per-member margin right now.

**5. Reduce API costs through context compression**
The Lead Engineer's #1 cost optimization lever. Techniques: summarize conversation history before sending to API, cache common responses (meal plan templates, grocery pricing data), use shorter system prompts, implement conversation turn limits before summarization kicks in. Reducing per-subscriber API cost from $3 to $2 saves $70/month at 70 subscribers — not huge, but it compounds.

**6. Content velocity — one viral video changes everything**
The launch plan calls for 5–6 videos/week. If even one video hits 100k+ views in the parenting niche, it can drive 200+ trial starts in 48 hours. The cost is Austin's time (already allocated). The upside is asymmetric. Focus on the hooks that name the pain directly: "It's 5pm. Nobody knows what's for dinner. Again."

**7. Reddit/Facebook community seeding (free, high-conversion)**
One authentic, helpful comment in r/Mommit or r/daddit that naturally mentions Kin can drive 50 trial starts in 24 hours. This is Austin's time, but it's the highest-ROI marketing channel at zero cost.

### What NOT to Spend Money On Before $2,600 Net

- Paid ads (TikTok, Instagram, Facebook) — organic first, prove the message works
- Premium tools or SaaS upgrades — free tiers until they break
- Contractors (video editing, VA) — Austin does it all until rent is covered
- Influencer payments — offer free access only, no cash until revenue supports it
- Conference tickets, networking events, or co-working spaces
- Any tool that costs more than $20/month without a direct line to revenue

---

## Phase Mapping

### Phase 0: Setup & Planning (Current)

**Duration:** 1–2 weeks
**Goal:** All infrastructure in place. Team blueprint operational. Ready to build.

| Role | Focus | Activity Level |
|------|-------|---------------|
| Chief of Staff | Stand up the operating model. Daily briefings begin. | ●●●●● |
| Lead Engineer | Dev environment setup. Supabase project created. Repo initialized. CI/CD configured. | ●●●●○ |
| Brand & Growth | First 3 videos drafted. Waitlist page live. Content calendar for month 1. | ●●●○○ |
| Product & Design | Feature specs for Phase 1 MVP. Onboarding flow designed. FVM screen designed. | ●●●●○ |
| Business Ops | Stripe configured. Financial tracking set up. Legal docs reviewed. | ●●●○○ |
| QA & Standards | Quality checklist created. Test plan for Phase 1 defined. | ●●○○○ |

**Phase 0 exit criteria:** Daily briefing is running. Sprint backlog for Phase 1 is defined and approved. Waitlist is collecting signups. All accounts and infrastructure are configured.

---

### Phase 1: Build Sprint — Core App (Weeks 1–4)

**Duration:** 3–4 weeks
**Goal:** Fully functional MVP on web. Core flows working: onboarding → meal plan → grocery list → budget → dual profiles → partner invite → Stripe checkout.

| Role | Focus | Activity Level |
|------|-------|---------------|
| Chief of Staff | Daily coordination. Ensure build stays on track. Kill List active. | ●●●●● |
| Lead Engineer | **Primary focus.** Building the entire MVP. This is where 80% of agent compute goes. | ●●●●● |
| Brand & Growth | Content production begins. 5–6 videos/week. Community seeding. Waitlist growth. | ●●●●○ |
| Product & Design | Real-time spec refinement as build progresses. Staging review daily. | ●●●●○ |
| Business Ops | Monitor infrastructure costs. Stripe testing. Trial flow validation. | ●●○○○ |
| QA & Standards | Testing every staging deploy. Building regression suite as features ship. | ●●●●○ |

**Phase 1 exit criteria:** A real family (Austin's household) can sign up, complete onboarding, receive a personalized meal plan, view a grocery list, enter budget data, and invite a partner. Stripe checkout works. 7-day free trial works.

---

### Phase 2: Beta & Polish (Weeks 5–7)

**Duration:** 2–3 weeks
**Goal:** Product is beta-ready. Real users testing. Bugs fixed. UX polished. Mobile build begins.

| Role | Focus | Activity Level |
|------|-------|---------------|
| Chief of Staff | Manage beta feedback pipeline. Triage issues. Update priorities based on real usage. | ●●●●● |
| Lead Engineer | Bug fixes from beta. Polish. React Native mobile build kicks off. Performance optimization. | ●●●●● |
| Brand & Growth | **Accelerating.** Content showcasing real product. "Day in my Kin trial" videos. Waitlist push. | ●●●●● |
| Product & Design | User feedback synthesis. UX improvements based on real behavior. Mobile UX specs. | ●●●●● |
| Business Ops | Track beta conversion signals. Prepare for launch financials. Accelerator app prep. | ●●●○○ |
| QA & Standards | **Critical phase.** Every fix retested. Regression on every deploy. Cross-browser testing. | ●●●●● |

**Phase 2 exit criteria:** Beta users complete the full flow without assistance. NPS collected. Top 10 bugs fixed. Mobile build in progress. Launch emails drafted.

---

### Phase 3: Launch & First 100 Members (Weeks 8–12)

**Duration:** 4–5 weeks
**Goal:** 100 paying families. $4,900+ MRR. Referral program running.

| Role | Focus | Activity Level |
|------|-------|---------------|
| Chief of Staff | **War room mode.** Real-time monitoring. Rapid escalation. Daily metrics. | ●●●●● |
| Lead Engineer | Hot fixes. Performance under real load. Mobile app submission. | ●●●●○ |
| Brand & Growth | **Maximum intensity.** Daily content. Product Hunt launch. Email sequences. Community push. Influencer activation. | ●●●●● |
| Product & Design | Real-time UX adjustments based on conversion data. Onboarding optimization. | ●●●●○ |
| Business Ops | **Revenue tracking is live.** Daily MRR. Conversion funnels. Churn analysis. Accelerator applications submitted. | ●●●●● |
| QA & Standards | Production monitoring. User-reported bug triage. App Store review compliance. | ●●●●○ |

**Phase 3 exit criteria:** 100 paying members. MRR at or above $4,900. Month-2 retention above 80%. At least 10 member interviews completed. Referral program launched. Google for Startups and Microsoft for Startups applications submitted.

---

### Phase 4: Growth & Optimization (Months 4–6)

**Duration:** Ongoing
**Goal:** Scale to 300+ members. Hit $15k MRR. Deepen product. Prepare for accelerator acceptance and seed conversations.

| Role | Focus | Activity Level |
|------|-------|---------------|
| Chief of Staff | Operational maturity. Process optimization. Preparing for scale. | ●●●●○ |
| Lead Engineer | React Native polish. Push notifications. Apple Watch. Phase 2 integrations (Plaid, calendar sync). | ●●●●● |
| Brand & Growth | Paid acquisition testing ($500–1k). Newsletter partnerships. Second Product Hunt launch (mobile app). Podcast outreach. | ●●●●● |
| Product & Design | Depth features: meal rating loop, advanced budget analytics, proactive notifications. | ●●●●● |
| Business Ops | Investor materials. Pitch deck. Financial projections for seed raise. Contract first VA/support. | ●●●●○ |
| QA & Standards | Automated testing expansion. Performance at scale testing. Security audit before Plaid integration. | ●●●●○ |

**Phase 4 exit criteria:** 300+ members. $15k+ MRR. First contractor hired. Accelerator accepted or in final rounds. Product includes push notifications and at least one live integration. Investor update cadence established.

---

## Appendix: The Operator's Checklist

A quick-reference for Austin's daily and weekly rhythms.

**Every morning (7:00am, 15 min):**
- [ ] Read daily briefing
- [ ] Make pending decisions (approve/reject/redirect)
- [ ] Review staging if new deploy is waiting

**Every lunch (12:00pm, 15–20 min):**
- [ ] Engage in 2–3 community threads (Reddit/Facebook)
- [ ] Respond to any DMs or comments

**Every evening (7:00–9:00pm, 90–120 min):**
- [ ] Record 1 video (30–45 min)
- [ ] Review and approve content drafts (10 min)
- [ ] Write or approve 1 email if scheduled (20 min)
- [ ] Review any escalated items
- [ ] Strategic thinking / roadmap review (remaining time)

**Every Sunday (60–90 min):**
- [ ] Review weekly progress report
- [ ] Approve next week's sprint
- [ ] Review Kill List — approve cuts
- [ ] Review financial summary
- [ ] Set top 3 priorities for the week

**First of each month (2–3 hours):**
- [ ] Review monthly operating report
- [ ] Review P&L
- [ ] Review and update roadmap
- [ ] Assess accelerator/investor readiness
- [ ] Update investor-format monthly update

---

**kin**

*The Mental Load, Handled.*

Kin Technologies LLC · April 2026 · Confidential
