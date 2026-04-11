# kin — Product Vision v2.0
### The AI That Knows Your Whole Life

**Kin Technologies LLC · April 2026 · Confidential**
*Written for: AI engineering agents (execution) and Austin Ford (strategy alignment)*

---

## How to Read This Document

This document has two jobs. First, it is the authoritative product specification — everything an AI agent needs to understand what Kin is, what it does, and how to build it correctly. Second, it is Austin's strategic map — the reasoning behind every decision, written so a founder can hold the vision clearly and make good calls when the unexpected happens.

Every section follows the same pattern: **what it is**, **why it matters**, and **exactly what to build**. If you're an agent, the "what to build" sections are your instructions. If you're Austin, the "why it matters" sections are what you explain to investors, journalists, and your early users.

The 2-week build roadmap in Section 6 is aggressive but achievable with parallel agent tracks running around the clock. The critical path is understood and the parallelization is explicit. Don't deviate from the build order — each dependency exists for a reason.

---

## Section 1: The Vision Statement

### What Kin Actually Is

Kin is not a family calendar app. It is not a meal planner. It is not a budgeting tool. It is all of those things and more — but the category it belongs to doesn't exist yet.

Kin is the first AI that knows your entire life.

Every other app in your phone knows one thing. Google Calendar knows your schedule. YNAB knows your budget. Mealime knows your dinners. Waze knows your commute. MyFitnessPal knows your workouts. They are all excellent at the one thing they do. And none of them talk to each other.

So every morning, a parent wakes up and runs a mental simulation that no app can run for them: *Traffic is bad today, I need to leave earlier — but if I leave earlier I skip the gym — but I have a meeting at 9:30 I need to prep for — and my wife has a late meeting so I need to figure out kid pickup — and we're close to budget so dinner should be cheap — and the dog's vet is Thursday.*

That mental simulation happens in the parent's head, alone, every single day. It's called the mental load, and it is exhausting.

Kin runs that simulation for you. Every morning, before you ask. With real data from every domain of your life — your calendar, your commute, your work obligations, your family's logistics, your fitness goals, your budget, your kids' schedules, your dog's vet appointments — synthesized into one briefing that tells you exactly what you need to know and what to do about it.

That is the product. The one brain that has full context across your entire life.

### The Morning Briefing That Proves It

Here is what Kin says when Austin wakes up on a Tuesday in April 2026:

> *"Morning. Leave for the gym by 5:50 — traffic on 315 is heavy, take 670 instead and you'll make it in 18 minutes. Your 9:30 with the product team is in 3 hours — the deck you mentioned in last week's notes is still a draft. Your wife's meeting runs until 6:30, so you've got kid pickup. Practice ends at 7 and bedtime is 8:30 — tight window. You're $23 under grocery budget this week. Chipotle?"*

No app in the world can generate that sentence. Not because the data doesn't exist — it all exists, scattered across six apps. Because no single app has all of it. Kin does.

That briefing is the product's proof of concept. Every domain it touches — commute, fitness, work, family coordination, kids' schedule, budget, dinner — is a separate app in every competitor's world. In Kin's world, they're one sentence.

### Why This Is a $100M+ Opportunity

The US has approximately 35 million dual-income households with children. These families are the highest-stress, highest-spending, highest-willingness-to-pay segment in consumer software. They are:

- Already paying for multiple apps (Cozi, YNAB, Mealime, MyFitnessPal — four subscriptions averaging $120/year combined)
- Deeply frustrated that none of those apps talk to each other
- Actively looking for a better solution (Cozi's 2024 user backlash created a measurable exodus)
- Spending 2–4 hours per week on the mental load that Kin eliminates

At $39/month, Kin captures value from families replacing 3–4 apps and getting something none of those apps could provide individually: connected intelligence. If 1% of the US market subscribes — 350,000 families — that is $163M ARR. If Kin reaches the scale of Cozi (20M users) at even a 5% conversion rate to paid: over $4B in potential ARR.

The beachhead is 79 subscribers. That covers rent. The path from there to $1M ARR is fewer than 2,200 paying families. The path to $10M ARR is 21,400. These are real, achievable numbers for a product that genuinely solves a problem families feel every single day.

### The Competitive Moat

Kin's moat is not any single feature. It is the architecture.

Every competitor is optimized to know one domain deeply. To build what Kin builds, they would need to either acquire or rebuild every adjacent domain — and then solve the hardest problem, which is not building the domains but making them talk to each other intelligently. A calendar app that adds budgeting is still a calendar app. An AI that has always understood both, and has been learning the intersection between them since day one, is categorically different.

The moat compounds over time. Every family that uses Kin for six months has trained it on the intersection of their specific schedule, their specific budget, their specific kids' needs, and their specific preferences. That model of their family life is not exportable. It lives in Kin. The longer they use it, the more it knows, and the more switching costs increase.

The dual private profile architecture — each parent has a private AI thread, private wellness goals, private spending context, unified into a shared household layer — is a structural decision no competitor has made. It is the correct architecture for how dual-income families actually work, and it cannot be bolted onto a shared-account model after the fact.

---

## Section 2: Life Domains — Full Specification

*For each domain: what Kin knows (data inputs), what Kin does (outputs and behaviors), how it connects to other domains, and MVP vs. later.*

---

### Domain A: Daily Schedule & Calendars

**What This Domain Is (Austin's context)**
Kin reads both parents' personal and work calendars — full read/write access to personal calendars (Google, Apple), read-only access to work calendars. It merges them into a unified household view. It knows not just what's on your schedule but what the schedule *means* — this meeting requires prep, this commitment is flexible, this event creates a kid logistics problem.

**What Kin Knows**
- Parent 1 personal calendar (read/write, full sync — Google Calendar API v3 or Apple CalDAV via tsdav)
- Parent 2 personal calendar (read/write, full sync, private by default)
- Parent 1 work calendar (read-only — events visible but not editable)
- Parent 2 work calendar (read-only)
- Kids' school and activity schedules (entered in Kids domain, fed into calendar layer)
- Historical patterns: which days are always busy, which times are typically free, how long the user takes to get to recurring locations

**What Kin Does**
- Morning briefing every day at 6am: today's full schedule for both parents, colored by owner, conflicts flagged
- Conflict detection: "You're both booked Thursday 5:30pm but school pickup is 3:45" — proactive, not reactive
- Schedule optimization: when free windows appear, Kin suggests filling them (workout, errands, meal prep)
- Event prep nudges: 30 minutes before important meetings, Kin prompts review of relevant notes
- Partner coordination triggers: when one parent has a late obligation that affects shared logistics, Kin flags it to the other parent

**Cross-Domain Connections**
- Commute intelligence: calendar events generate departure time calculations based on real-time traffic
- Work awareness: work calendar events trigger meeting prep and email reminders
- Kids domain: school schedules and activities auto-populate onto family calendar
- Date night: free windows on both calendars trigger date night suggestions when criteria are met
- Fitness: free morning windows trigger workout suggestions based on user's fitness goals

**MVP (v1.0)**
- Google Calendar two-way sync per parent (OAuth 2.0, API v3 with webhook push)
- Apple Calendar two-way sync per parent (CalDAV via tsdav, 15-minute poll cycle)
- Read-only work calendar connection (Google Workspace or Exchange/Outlook)
- Merged household view with color-coding per parent and per kid
- Conflict detection on merged view — flag in morning briefing and as push notification
- Privacy rules enforced in Supabase RLS: personal events are per-parent until explicitly shared

**Later (v1.1+)**
- Outlook/Exchange full sync (corporate accounts)
- Siri Shortcuts integration: "Hey Siri, what does Kin say about tonight?"
- Calendar Live Activity: persistent schedule strip in Dynamic Island

---

### Domain B: Partner & Family Coordination

**What This Domain Is**
Kin is the household's coordination layer. Not a messaging app — it doesn't replace texting your partner. It's the intelligence layer that knows when coordination is needed and surfaces the right question at the right time. "Your wife has a late meeting — should you handle pickup?" is more useful than any shared calendar feature any competitor has shipped.

**What Kin Knows**
- Both parents' schedules (from Domain A)
- Kids' pickup and dropoff commitments (from Domain G)
- Historical patterns: who usually does pickup, who makes dinner, who handles the pet
- Shared household to-do list
- Private per-parent to-do lists

**What Kin Does**
- Logistics conflict surfacing: when one parent's schedule creates a gap in shared household responsibilities, Kin identifies the gap and suggests a resolution
- "Whose turn" intelligence: tracks recurring responsibilities and surfaces reminders to the parent who has coverage that day
- Shared to-do list management: household tasks visible to both parents, private tasks per parent
- Pre-emptive coordination nudges: "Your wife has a 6pm meeting tonight — you're on dinner and pickup"
- Partner preference context: Kin maintains private context on each parent; shared decisions are informed by both profiles without exposing private data

**Cross-Domain Connections**
- Calendar sync creates the data that powers coordination intelligence
- Kids domain: activity schedules drive the coordination triggers
- Budget: shared spending decisions ("we're $40 under this week — should we order in?") are coordination moments
- Meals: who is cooking tonight is a coordination decision Kin can inform

**MVP (v1.0)**
- Shared household to-do list with real-time sync between both parents
- Private per-parent to-do list
- Morning briefing includes one coordination prompt per day when applicable: "Your partner has [X] tonight — you've got pickup"
- Partner invite flow (existing in codebase — ensure works in RN mobile app)

**Later (v1.1+)**
- Shared decision tracking: "We decided to X on [date]" — Kin remembers household decisions
- Family chores and recurring tasks with ownership assignment

---

### Domain C: Commute & Traffic Intelligence

**What This Domain Is**
Kin knows where you need to be and when. It tells you when to leave, which route to take, and if conditions change, it updates you. This is not a navigation app — Kin doesn't give turn-by-turn directions. It gives departure intelligence: "leave 5 minutes early, take 670 instead of 315."

This domain requires no new data entry from the user. It infers home location from onboarding (city/region), learns workplace location from work calendar events, and uses real-time traffic data to calculate departure windows.

**What Kin Knows**
- Home location (set during onboarding — zip code or neighborhood)
- Workplace location (inferred from work calendar "in-office" events or set manually)
- Kids' school location (from Kids domain)
- First calendar event of the day (from Domain A)
- Real-time traffic data via Apple Maps or Google Maps API (read-only, no navigation)
- User's historical commute patterns (time to location, preferred routes when known)

**What Kin Does**
- Morning briefing: departure time and route recommendation based on today's first commitment and real-time traffic
- Route alternatives when primary route is congested: "315 is heavy — take 670, add 3 minutes but saves 15"
- Ripple effect alerts: if commute will make a user late to a commitment, Kin flags it proactively
- Departure reminder push notification: timed to ensure on-time arrival with a buffer

**Cross-Domain Connections**
- Calendar: every time-based commitment generates a commute calculation
- Kids: school dropoff creates its own departure window that Kin factors into the morning schedule
- Work awareness: late arrival due to traffic may affect meeting prep time — Kin notes the constraint

**MVP (v1.0)**
- Static commute time calculation using Google Maps Distance Matrix API (no real-time, but accurate average)
- Morning briefing includes calculated departure time based on first calendar event
- Home and work locations set during onboarding or inferred

**v1.1**
- Real-time traffic via Google Maps Routes API (requires API key — estimate $0.005/call, budgeted into Kin's operating cost)
- Route alternative suggestion when primary is congested
- Departure time push notification 15 minutes before optimal leave time

**Later**
- Apple Maps integration as alternative to Google (better privacy positioning, native iOS feel)
- Multi-stop morning routing (gym → school → work)

---

### Domain D: Work Awareness

**What This Domain Is**
Kin is read-only here. It knows your work calendar and nothing else from your professional life. It never reads your work email, your Slack messages, or your internal documents. It uses the work calendar to anticipate what you need to do — prep for meetings, send emails you've mentioned, be on time — without ever touching the private tools your employer controls.

This is a deliberately non-invasive domain. It exists to reduce the friction between the family context and the work context, not to blur the line further.

**What Kin Knows**
- Work calendar (read-only connection — events, times, and titles only)
- Notes the user has attached to calendar events in Kin (user-entered, private)
- User-flagged reminders: "remind me to send the Q2 report before the 9:30"
- Historical patterns: which meetings require prep, how long the user typically prepares

**What Kin Does**
- Pre-meeting prep nudge: 30 minutes before flagged important meetings, Kin surfaces a reminder
- Email reminder: if a user mentions needing to send an email ("I need to send the deck before tomorrow's call"), Kin stores this as a task and reminds at an appropriate time
- Work-schedule-aware planning: Kin knows you have back-to-back calls from 10am–2pm and does not suggest errands, workouts, or non-essential tasks during that window
- Meeting density alerts in morning briefing: "Heavy day — 4 meetings back to back starting at 9:30. Lunch window is 12–12:30 only."

**Cross-Domain Connections**
- Calendar: work events are visible in merged household view as read-only
- Commute: first work commitment drives departure time calculation
- Fitness: work schedule determines available workout windows
- Partner coordination: heavy work days trigger coordination nudges so partner can anticipate coverage needs

**Privacy Rules (Absolute)**
- Kin never reads work email content
- Kin never reads Slack, Teams, or internal communication tools
- Kin never surfaces work calendar event titles to the other parent (only timing/availability status)
- Meeting titles and agendas are private to the parent whose calendar they belong to

**MVP (v1.0)**
- Read-only work calendar connection (separate from personal calendar — user explicitly connects it)
- Morning briefing includes work schedule summary: meeting count, first meeting time, any back-to-back blocks
- User can flag any calendar event as "needs prep" — Kin surfaces reminder 30 min prior
- User can add email/task reminders via chat: "Remind me to send the deck before tomorrow's 9:30"

**Later**
- Outlook/Microsoft 365 work calendar integration
- Meeting prep context cards: user can attach notes to work events, Kin surfaces them pre-meeting

---

### Domain E: Fitness & Health

**What This Domain Is**
Each parent's fitness data is completely private. The other parent cannot see goals, progress, or workout history. Kin is a training assistant that knows your schedule — it finds the windows, respects the plan, and tells you when to deload before your body forces you to.

This domain is not a step counter. It is structured workout tracking — the kind that a serious gym-goer needs: sets, reps, weight, progressive overload, deload cycles. And because Kin knows your entire schedule, it suggests workouts based on what windows you actually have, not theoretical time.

**What Kin Knows**
- Workout goals (user-set: weight loss, muscle building, endurance, general fitness)
- Current weight (user-logged, private — used for goal tracking and nutrition context)
- Target weight and timeline (user-set, private)
- Workout history: exercise, sets, reps, weight, date — entered via chat or quick log UI
- Recovery patterns: days since last training session by muscle group
- Calendar free windows (from Domain A — Kin knows when the user has time to train)
- Sleep quality (optional — user can log, or connected via Apple Health in v1.1)

**What Kin Does**
- Progressive overload tracking: Kin remembers the last weight used on each exercise and prompts an increase when the user has hit the rep target for two consecutive sessions
- Deload recommendations: after 4–6 weeks of consistent training, or when recovery signals suggest fatigue, Kin recommends a deload week with reduced volume
- Workout window suggestions: "You have 45 minutes free Tuesday at 6am before your first call — want to train legs?" based on real calendar data
- Cheat meal timing: if the user is in a calorie deficit for weight loss, Kin can suggest strategic higher-calorie meals on training days — without moralizing, only when relevant
- Weekly training summary: sets completed, progressive overload hits, days trained vs. goal
- Log workouts via chat: "Just did bench — 185 for 3 sets of 8" — Kin parses and stores

**Cross-Domain Connections**
- Calendar/Schedule: free windows drive workout suggestions; heavy work days reduce suggested session length
- Nutrition: training load informs meal suggestions — higher protein on lifting days, recovery meals after heavy sessions
- Budget: Kin can factor gym membership cost into subscription audit if user enters it
- Partner coordination: if one parent's workout window conflicts with shared logistics, Kin flags it

**Privacy Rules**
- All fitness data is strictly private per parent — the other parent cannot query it, see it, or receive it in briefings
- Weight, body composition goals, and personal health metrics are never surfaced in shared household context
- Kin never comments on body weight, BMI, or appearance

**MVP (v1.0)**
- Chat-based workout logging: user describes workout, Kin parses and stores to Supabase (exercise, sets, reps, weight, date)
- Progressive overload tracker: Kin tracks last session's lifts and prompts when to increase weight
- Workout window suggestions in morning briefing: identifies free calendar windows, suggests training if it's a scheduled training day
- Private fitness profile per parent — visible only in that parent's thread

**v1.1**
- Apple Health integration: read step count, active calories, sleep data (with explicit permission)
- Structured workout plans: user can set a 3-day or 4-day split, Kin schedules sessions around the real calendar
- Deload detection: automated deload recommendation based on volume tracking

**Later**
- Integration with fitness hardware (Apple Watch workout data, Garmin via Health sync)
- Recovery metrics from wearable data

---

### Domain F: Nutrition & Meal Planning

**What This Domain Is**
Kin plans the family's meals within their grocery budget, around everyone's schedules, respecting every family member's dietary needs — including severe allergies. In Austin's case, that means every meal plan is dairy-free and egg-free for his son. This is not a preference setting buried in a form — it is baked into the AI's core context, applied automatically to every suggestion, every time.

This domain has been updated from the previous FVM specification. The meal plan is now the second value moment (Day 2 in the trial arc), layered on top of the schedule FVM. The intelligence here is deeper than any standalone meal planning app because Kin knows the family's budget, the schedule for the week (no one wants a 45-minute meal on a Tuesday after practice), and the weight/fitness goals of each parent.

**What Kin Knows**
- Weekly grocery budget (set during onboarding, adjustable anytime)
- Family size and composition (adults + kids)
- Dietary restrictions (household-level: entered during onboarding, permanent context)
- Per-person food allergies (stored in each kid and parent profile — applied automatically to every meal)
- Food preferences and dislikes (household-level, refined through meal ratings over time)
- Current week's schedule (from Domain A — Kin knows which nights are busy, which are open)
- Current budget status (from Domain I — how much grocery budget remains this week)
- Meal ratings history (every meal rated updates future suggestions)
- Parent 1 fitness context (private — informs calorie density suggestions for training days)
- Pantry staples (optional user input — "we always have olive oil, pasta, chicken")

**What Kin Does**
- Weekly meal plan: 7 dinners, budget-aware, schedule-aware (quick meals on busy nights, longer on free evenings), allergy-safe, preference-informed
- Grocery list auto-generation: ingredients from the week's plan, deduplicated, organized by store section
- Meal ratings loop: after each dinner, Kin asks once: "How was the [meal]?" — 1–5 stars — learns over time
- Budget integration: Kin shows estimated weekly grocery cost in the plan; surfaces alert when adding items would exceed budget
- Cheat meal optimization: for parents in a calorie deficit, Kin can suggest a higher-calorie meal on a heavy training day — never preachy, only when the user has activated this goal
- Quick meal mode: "We're slammed tonight — something in 20 minutes" — Kin generates from pantry staples if available, or a fast crowd-pleaser from the family's rating history
- Allergy safety: every meal suggestion, every recipe, every quick suggestion is automatically filtered against all active allergies. No exceptions. No manual checking required.

**Allergy Architecture (Critical)**
Allergies are stored in each family member's profile. Every Anthropic API call for meal generation must include allergy context in the system prompt. The meal planning module must never generate a meal suggestion without first checking all active allergies. This is a safety-critical feature — a dairy or egg suggestion for an allergic child is not a UX bug, it is a health hazard. Build this with zero tolerance for slip-through.

**Cross-Domain Connections**
- Budget: grocery spending is tracked against the food category budget; Kin integrates the two in real time
- Schedule: busy nights → quick meals; free evenings → cook something new
- Kids: kids' allergy profiles and preferences drive meal filtering automatically
- Fitness (private): training day context informs calorie density of personal meal suggestions
- Partner coordination: who is cooking is a coordination signal Kin surfaces based on whose schedule is lighter

**MVP (v1.0)**
- AI meal plan generation (7 dinners per week, Anthropic API)
- Budget-aware planning: Kin estimates cost per meal, tracks against weekly grocery budget
- Allergy-safe filtering: all active allergies applied automatically to every suggestion
- Grocery list auto-generation from the week's plan
- Meal ratings: simple 1–5 star input via chat after each meal
- Quick meal suggestions via chat

**v1.1**
- Pantry tracking: user can maintain a light pantry list; Kin adjusts grocery list to skip items on hand
- Grocery cart push integration (Instacart API — pending approval)
- Recipe cards: full recipe with ingredients, steps, and prep time displayed in-app

**Later**
- Live grocery pricing via API (currently AI-estimated)
- Store-specific recommendations: Kin recommends where to buy each item for best value (Kroger vs. Walmart vs. Costco)

---

### Domain G: Kids

**What This Domain Is**
Every child in the household has a full profile in Kin. Not just a name on a calendar event — a real profile with school schedule, activities, health context, dietary needs, and milestones. Kin knows your kids the way a good nanny knows them. It never needs to be reminded that Mia is lactose intolerant or that soccer practice is Tuesdays and Thursdays.

**What Kin Knows**
- Name, age, school grade
- School schedule (days, hours, school location for commute calculation)
- Extracurricular activities (name, days, times, location, season dates)
- Dietary restrictions and allergies (fed automatically into meal planning domain)
- Food preferences and dislikes (fed into meal suggestions)
- Healthcare appointments (pediatrician, dentist, specialist — user-entered)
- Medications or health notes (private, parent-visible only)
- Milestones (optional — parent can log notable events)

**What Kin Does**
- Activity logistics in morning briefing: "Soccer practice 4:30–6pm today — you need to leave work by 4"
- Health appointment reminders: proactive nudge 48 hours before scheduled appointments
- Medication reminders: if a child is on a course of medication, Kin tracks and prompts at the scheduled time: "Mia's antibiotic — 8pm dose. Mark as given?"
- School schedule feed: all school events auto-populate into the family calendar view
- Pickup logistics: school pickup time + parent schedule = coordination prompt when pickup is at-risk
- Allergy context: every meal suggestion, restaurant recommendation, and grocery item is filtered through all active child allergies without the parent needing to check

**Cross-Domain Connections**
- Calendar: all kids' events populate the family calendar; conflicts with parent schedules trigger coordination prompts
- Meals: allergy profiles and food preferences drive meal planning automatically
- Commute: school location generates departure time calculations for dropoff and pickup
- Partner coordination: kids' logistics drive the majority of partner coordination triggers
- Budget: activity fees and healthcare costs can be logged against the family budget

**MVP (v1.0)**
- Full kid profile: name, age, school, activities (days/times), allergies, food preferences
- School schedule in family calendar view
- Activity reminders in morning briefing: "Soccer today — pickup at 6"
- Allergy context passed to every meal planning API call
- Healthcare appointment entry and reminders

**Later**
- School calendar import: parents can forward school calendar emails to Kin, which auto-creates events
- Milestone journal: parent can log notable moments; Kin surfaces them annually
- Age-appropriate chore tracking with completion confirmation

---

### Domain H: Pets

**What This Domain Is**
The dog gets a profile. This is not a minor feature — for families with pets, the vet schedule, the medications, the feeding routine, and the walking schedule are real logistics that fall through the cracks. Kin handles them.

**What Kin Knows**
- Pet name, species, breed, age
- Vet name and location
- Vaccination schedule (user-entered dates; Kin tracks and reminds)
- Current medications (drug name, dose, schedule, refill date)
- Grooming schedule (last appointment, recurring cadence)
- Feeding schedule (times, portions — optional)
- Walk schedule (optional — can be tracked per day)

**What Kin Does**
- Vaccination reminders: 7 days before a vaccine is due, Kin surfaces a reminder with vet contact info
- Medication prompts: daily or per-dose reminders: "Buddy's heartworm pill is due today. Mark as given?"
- Grooming reminders: based on last grooming date and the pet's typical cadence
- Vet appointment tracking: upcoming vet appointments in morning briefing
- Health notes: parent can flag health concerns ("Buddy was limping yesterday"); Kin stores and reminds the parent to follow up

**Cross-Domain Connections**
- Calendar: vet appointments populate the family calendar
- Partner coordination: "Buddy's vet is Thursday at 2pm — who's taking him?" — triggers a coordination prompt if both parents have conflicting schedules
- Budget: vet costs can be logged against the household budget

**MVP (v1.0)**
- Full pet profile: name, species, breed, age, vet info, vaccination schedule, medications
- Medication reminders with one-tap confirmation
- Vaccination reminders (7 days and 1 day prior)
- Vet appointments in family calendar and morning briefing

**Later**
- Multi-pet support with individual profiles
- Vet search integration: when a reminder fires, Kin can surface nearby vet locations

---

### Domain I: Budget & Financial Awareness

**What This Domain Is**
Kin is not a financial planning tool. It does not give investment advice, analyze your retirement account, or tell you to max your 401(k). It does one thing exceptionally well: keeps the household's day-to-day budget visible, shared, and contextually integrated with every other domain.

"You're $23 under grocery budget this week" in the morning briefing is not a feature — it is the entire point. Budget context, woven into daily decisions, without requiring the user to open a separate finance app.

**What Kin Knows**
- Monthly household budget by category (user-set: groceries, dining, entertainment, subscriptions, household, etc.)
- Transactions (manual entry in v1.0; Plaid bank sync in Phase 3)
- Shared household budget: totals by category, visible to both parents
- Individual spending: each parent's personal transactions are private to them; only category totals are shared
- Subscription list: recurring expenses manually entered or surfaced via Plaid (Phase 3)
- Budget history: month-over-month trends

**What Kin Does**
- Morning briefing budget line: one sentence on budget status: "You're $23 under grocery budget" or "Dining is $12 from limit — cook tonight?"
- Real-time budget context: when a parent asks Kin about dinner, meals, or a purchase, Kin factors in current budget status automatically
- Overspending flag: once per category, Kin surfaces a flag when a category is at 80% of monthly budget: "$88 of $100 dining this month" — never repeated, never shamed
- Subscription audit: once per month, Kin surfaces the household's full subscription list with last-used dates (manual entry v1.0, Plaid-powered in Phase 3): "You're paying $22/month for [service] — when did you last use it?"
- Budget decision support: "Chipotle for dinner?" — Kin answers with budget context: "You're under budget this week — go for it" or "Dining is tight — here's a 20-minute alternative"

**Privacy Rules (Absolute)**
- Each parent's individual transactions are private — the other parent cannot see line items
- Shared view shows only combined totals by category
- Kin will not reveal how much one parent spent to the other parent, under any framing

**Cross-Domain Connections**
- Meals: grocery budget drives meal planning; dining budget drives dinner suggestions
- Kids: activity fees, school expenses, healthcare costs feed into the family budget
- Pets: vet costs and pet supplies are budget-trackable categories
- Date night: dining budget remaining informs date night suggestions

**MVP (v1.0)**
- Category budget setup during onboarding (groceries, dining, entertainment, household, subscriptions, other)
- Manual transaction entry via chat: "Just spent $47 at Kroger — groceries"
- Shared budget view: category totals by month, visible to both parents
- Morning briefing budget line: most relevant budget status for today's decisions
- Overspend flag at 80% of category budget

**Phase 3 (after launch, approval required)**
- Plaid bank sync: automatic transaction import and categorization
- Live subscription detection from bank feed

---

### Domain J: Date Night & Relationship

**What This Domain Is**
Parents lose track of time together. Not because they don't value it — because the logistics are impossible without help. Kin watches both calendars passively and surfaces the next opportunity before 14 days has passed. It doesn't announce that it's tracking this. It just notices.

**What Kin Knows**
- Both parents' schedules (merged view from Domain A)
- Last date night (stored in household profile, updated when a date night is confirmed)
- Date night preferences: cuisine type, activity type, price range (user-set, refined over time)
- Babysitter availability (optional — user can note if a trusted sitter is available on certain dates)
- Dining budget remaining (from Domain I)

**What Kin Does**
- Date night trigger: when (a) both parents have a free evening in the next 7 days AND (b) it has been 14+ days since the last date night, Kin surfaces a suggestion — naturally, in conversation or morning briefing
- Two suggestions: one familiar (a cuisine or activity type they've enjoyed before), one different (something new but aligned with their taste profile)
- Budget-aware: suggestions calibrated to remaining dining budget
- Calendar blocking: Kin offers to block both parents' calendars — but never blocks without explicit confirmation
- Date night tracking: when a date night is confirmed, Kin marks it in the household profile and resets the counter

**Cross-Domain Connections**
- Calendar: both partners' free windows are the prerequisite
- Budget: dining budget remaining informs the type and price of suggestion
- Partner coordination: confirming a date night triggers babysitter logistics if applicable

**MVP (v1.0)**
- Passive date night monitoring: Kin scans both calendars for overlapping free evenings
- 14-day trigger: if no date night logged in 14 days, surface a suggestion on the next free evening
- Two-option suggestion: one familiar, one novel — calibrated to preferences and budget
- Calendar blocking on confirmation

**Later**
- Restaurant recommendations via Yelp or Google Places API
- Reservation link generation

---

### Domain K: Home Management

**What This Domain Is**
The home has its own logistics: maintenance cycles, seasonal tasks, subscription audits, insurance renewals, and the dozens of small things that fall off the radar until they become urgent problems. Kin tracks them so the parents don't have to hold them in their heads.

**What Kin Knows**
- Subscription list (manually entered or Plaid-sourced in Phase 3): service, cost, renewal date
- Home maintenance tasks (user-entered with cadence: HVAC filter every 3 months, gutter clean every fall)
- Insurance renewal dates (user-entered)
- Seasonal reminders (programmable by the user: winterize sprinklers October, turn on sprinklers April)
- Service providers (plumber, electrician, HVAC — names and contact info, user-entered)

**What Kin Does**
- Subscription audit: once per month, proactively: "You're paying $22/month for [service] — you haven't mentioned it in 60 days. Still using it?"
- Maintenance reminders: 7 days before a scheduled maintenance task is due: "HVAC filter is due this week — want me to add it to the to-do list?"
- Renewal alerts: insurance and subscription renewals surfaced 30 days in advance
- Seasonal task reminders: at the appropriate time of year, Kin surfaces seasonal checklist items

**Cross-Domain Connections**
- Budget: subscription costs are line items in the household budget; cancellations reduce monthly spend
- Partner coordination: maintenance tasks can be assigned to either parent via the to-do list
- Calendar: service appointments populate the family calendar

**MVP (v1.0)**
- Subscription list (manual entry): name, cost, renewal date
- Monthly subscription audit prompt (one per month, not more)
- Maintenance task list with cadence reminders
- Seasonal reminder capability (user-defined)

**Later**
- Plaid-powered subscription detection: automatically surface recurring charges from bank feed
- Home warranty tracking and service history log

---

## Section 3: The Daily Experience

*A full day with Kin — based on Austin's real life. Tuesday in April 2026.*

---

**5:47am — The Morning Briefing**

Austin's phone buzzes once. Not an alarm. Not a news notification. A single push from Kin.

He reads it before getting out of bed:

> *"Morning. Leave for the gym by 5:55 — 315 is backed up, take 670 and you'll make it in 19 minutes. You have 48 minutes at the gym before you need to head back to be showered by 8:15. Your 9:30 team sync is 3 hours from now — you flagged the product brief last week as something to review before it. Your wife's 6pm meeting runs late — you've got pickup. Practice ends at 7, bedtime is 8:30. You're $23 under grocery budget. Chipotle?"*

That is eight pieces of information from six separate domains: commute, fitness window, work calendar, work prep, partner schedule, kids' logistics, budget, and a dinner decision. No app in the world could send that message. Kin just did.

**5:55am — Leaving for the Gym**

Austin has 48 minutes. Not a moment wasted. Kin isn't running his workout today — but when he finishes, he'll log it in 10 seconds: "Done. Bench 185x8, 3 sets. Squats 225x5, 4 sets." Kin stores it, notes that he hit the target rep range on bench, and will prompt an increase next session.

**8:00am — Back Home, Kids Waking Up**

Austin's wife checks Kin from her phone. Her briefing is different — private to her:

> *"Morning. Your first call is at 10. You've got a 45-minute window before that. Mia's dairy-free lunch is packed from last night's plan. No school events today. Your 6pm runs until 7:30 — Austin's got the kids. Tonight's dinner is sheet pan chicken — 35 minutes, no dairy or eggs, everything in the fridge."*

Each parent's briefing is their own. Kin doesn't tell Austin his wife's meeting schedule. It tells him what he needs to know from it: you've got pickup.

**9:05am — Meeting Prep**

Austin is at his desk. A push notification from Kin:

> *"Your 9:30 is in 25 minutes. You flagged the product brief — still in your notes from Wednesday."*

He didn't ask. Kin remembered that he flagged it, and surfaced it at exactly the right time. He reviews it for 15 minutes. He's ready.

**12:30pm — Lunch**

Austin opens Kin and types: "What's left for the week on groceries?"

> *"$23 left in groceries, $44 in dining. Tonight is covered — sheet pan chicken from Sunday's plan. You've got Friday to fill — anything you want, or should I suggest?"*

No app-switching. No mental math. One question, one complete answer.

**3:15pm — The Coordination Moment**

Austin gets a push:

> *"Your wife's 6pm just updated — it's running until 7:30. You're on pickup and dinner. Sheet pan chicken is on the plan — everything's in the fridge. Practice ends at 7:05; bedtime is 8:30. Tight but doable."*

His wife didn't text him. She didn't need to. Her calendar updated, Kin saw the implication for household logistics, and surfaced it to Austin directly. This is the feature no other app has. Not a shared calendar. Not a notification. A piece of intelligence: here's what this schedule change means for your night, and here's the plan.

**6:15pm — Dinner with the Kids**

Sheet pan chicken. Dairy-free, egg-free. Austin didn't have to remember the allergy. Kin built the meal plan with it embedded. The recipe is in the app. He follows it.

After dinner, Kin asks once: "How was the sheet pan chicken tonight?" Three stars. "Too dry — any sauce suggestions?" Kin stores the rating and the note. It will not suggest sheet pan chicken again without modifications.

**8:45pm — After Bedtime**

The kids are down. Austin's wife is home. Austin opens Kin:

> *"Nice work tonight. You've both been heads-down the last 16 days. Saturday night you're both free from 6pm on — first time in a while. Want some ideas for date night?"*

Austin didn't ask. Kin noticed. The counter said 16 days. Saturday was open on both calendars. The suggestion appears naturally, not as a feature, not as an alert — as a friend who's been paying attention.

---

## Section 4: iOS App Architecture

### Home Screen & Navigation Model

Kin's iOS app uses a tab-based navigation structure with 5 primary tabs. The design language follows Brand Guide v2 throughout: #0C0F0A background, domain accent colors, Instrument Serif for emotional moments, Geist for functional UI.

**Tab 1: Today (Home)**
The daily command center. Displays:
- Morning briefing card (full text, tappable to expand each domain)
- Today's schedule: time-ordered list of all events (personal + shared family + kids' activities)
- Tonight's dinner card: meal name, prep time, quick-link to recipe
- Budget pulse: one-line status on the most relevant budget category today
- Active alerts: any conflicts, reminders, or coordination prompts for today

This tab is the only tab a user needs to check every day. It is the product's daily retention driver.

**Tab 2: Chat**
The Kin AI conversation interface. This is the primary input method for the app — logging workouts, asking budget questions, requesting meal changes, adding to-dos, or just talking through the week. The chat thread is private per parent. The shared household chat (for family-level requests) is a toggle within this tab.

Kin's voice here matches the System Prompt v1.0 spec: warm, direct, specific, never corporate.

**Tab 3: Family**
The shared household view. Contains:
- Merged family calendar (both parents + kids, color-coded by domain)
- Grocery list (shared, real-time synced)
- Household to-do list (shared)
- Kids' profiles (name, today's schedule, active reminders)
- Pet profile (name, active medications, next vet appointment)

This tab is most relevant to the parent managing household logistics. It gives the full picture of the household in one place.

**Tab 4: Meals**
The meal planning domain. Contains:
- This week's dinner plan (7-day view)
- Grocery list (full version with item details)
- Meal rating history (last 4 weeks)
- Recipe cards for each planned meal

**Tab 5: Profile & Settings**
Private per parent. Contains:
- Personal calendar connections (Google, Apple, work calendar read-only)
- Fitness goals and workout history
- Budget setup and category management
- Subscription and home management settings
- Partner account management
- Billing and subscription settings

### Widget Strategy

Kin's widget strategy is built around delivering value on the home screen and lock screen without requiring the user to open the app. Each widget surfaces the most relevant real-time information for its domain.

**Daily Briefing Widget (Large — Home Screen)**
Displays the morning briefing in full. Updates at 6am daily. The most important widget Kin offers — this is how power users start their day. Tapping opens the Today tab.
Color: Brand green (#7CB87A) on dark background.

**Schedule Strip Widget (Medium — Home Screen)**
Shows the next 3 events for the day: time, title, color-coded by parent. Updates in real time as calendar changes. Tapping opens the Family tab calendar view.
Color: Calendar purple (#A07EC8).

**Budget Pulse Widget (Small — Home Screen)**
Shows the single most relevant budget category for today: "Groceries: $23 left" or "Dining: $12 to limit." Updates when transactions are logged. Tapping opens the Budget section of Profile.
Color: Budget gold (#D4A843).

**Dinner Widget (Small — Home Screen)**
Shows tonight's planned dinner: name, prep time, one-tap link to recipe. Updates each morning with the day's meal. Tapping opens Meals tab.
Color: Brand green (#7CB87A).

**Pet Reminder Widget (Small — Home Screen)**
Active only when a pet reminder is due: medication, vet appointment, grooming. Shows pet name, reminder type, and a "Done" action button. Hidden when no active reminders.
Color: Pet pink (#D4748A).

**Lock Screen Widgets (iOS 16+ — Circular/Rectangular)**
- Schedule: next event time and title
- Budget: daily status, one category
- Dinner: tonight's meal name

### Notification Strategy

Kin's notification philosophy: one notification that matters is worth more than ten that are noise. Notifications should feel like a smart friend texting you something useful — not a service pinging you for engagement.

**Rules**
- Maximum 3 push notifications per parent per day in normal operation
- The morning briefing is always notification 1 — it consolidates all domains into a single push
- Subsequent notifications are triggered only by time-sensitive events (departure reminders, meeting prep nudges, coordination alerts)
- Zero promotional notifications — Kin never sends a push notification to re-engage a user who hasn't opened the app

**Notification Taxonomy**

*Morning Briefing (6am, daily, required)*
The consolidated daily summary. One push, full picture. Never skipped. Time can be customized per parent.

*Departure Alert (triggered, not scheduled)*
Fires when the user needs to leave for a time-sensitive commitment. "Leave in 15 minutes for soccer pickup — traffic is light on 315." Maximum once per day.

*Coordination Alert (triggered)*
When one parent's schedule change creates a logistics gap. "Your partner's 6pm runs late — you've got pickup tonight." Fires when the calendar event is updated, not on a schedule.

*Meeting Prep Nudge (triggered)*
30 minutes before any calendar event flagged as "needs prep." Maximum once per day.

*Pet/Health Reminder (triggered)*
Medication due, vet appointment approaching, vaccination due. Fires on schedule, includes one-tap confirmation action.

*Budget Alert (triggered, monthly cap)*
Fires once when a category hits 80% of monthly budget. Not repeated for the same category in the same month. Maximum one per week across all categories.

*Date Night Suggestion (triggered, max once per 14 days)*
When both parents have a free evening and the 14-day threshold has passed. Natural-language framing, not a system alert.

---

## Section 5: Pricing Strategy

### The Decision: One Tier at $39/Month

**Why one tier wins at launch**

Two tiers create a decision. A decision creates hesitation. Hesitation kills conversions.

The previous Kin pricing had two tiers: $29/month Starter (single parent) and $49/month Family (dual parent). The logic was sound — single parents get a discount, dual-parent households pay more because they get more. But it creates a problem at the moment of conversion: which one am I? What do I get with the expensive one that I don't get with the cheap one? Do I need both? Can I start with the cheap one?

At $39/month, there is no decision. Kin is $39. It includes everything. It works for one parent or two. You pay $39 and you get the full product.

The segmentation logic from the two-tier model was solving for a real problem — Kin has more value for dual-parent households — but at launch, what matters is conversion, not optimization. Simplicity wins.

**The Numbers**

| | Monthly | Annual |
|---|---|---|
| **Customer pays** | $39/month | $299/year |
| **Effective monthly (annual)** | — | $24.92/month |
| **After Apple 15% Small Business cut** | $33.15/month | $254.15/year |
| **Subscribers to cover $2,612/month rent** | **79 monthly** | **124 annual (pays 12.4 months upfront)** |

The rent number is the most important metric for Austin at launch. 79 subscribers is a concrete, human-scale target. It is not a TAM calculation or a growth projection. It is "if 79 people pay us, we're covered for the month." That target should be on the wall.

**Annual Pricing Rationale**

$299/year is $24.92/month effective — a 36% discount versus monthly. This is aggressive but intentional. Annual subscribers churn dramatically less than monthly subscribers (annual churn rates are typically 4x lower than monthly equivalents). For a bootstrapped company, annual subscribers also provide cash upfront: 79 annual subscribers generate $23,621 on day one — covering rent for 9 months.

The annual nudge: at the paywall, present both options with the annual option highlighted as "Best value" and the monthly savings calculation shown explicitly: *"Annual plan saves you $169 — that's 4 months free."*

**App Store Economics**

Apple's Small Business Program (for developers under $1M/year) reduces the App Store commission from 30% to 15%. Kin qualifies at launch. This is a significant advantage — the $39 price point nets $33.15/month after Apple's cut, which is workable.

The strategic rule from the brand guide applies: every user acquired through kinai.family instead of through the App Store saves 15% in fees. The iOS app should include a "Subscribe on the web and save 15%" option in settings — this is legal as of the May 2025 US federal court ruling.

**Web pricing via Stripe: $39/month exactly. No markup needed for web.**

**When to Add Tiers**

Do not add tiers until Kin reaches 1,000 paying subscribers. At that point, the user base is large enough to run pricing experiments and the data will show whether a single-parent cohort exists that would benefit from a lower-tier offering, or whether a power user cohort exists willing to pay for premium add-ons (e.g., bank sync, grocery cart integration).

The trigger for revisiting pricing: when user research reveals a material segment (>15% of signups) churning specifically on price, not on product value.

---

## Section 6: The 2-Week Build Roadmap

### Why 2 Weeks Is Achievable

A solo founder with a single AI agent building sequentially would need 4–6 weeks for this scope. Kin's build model is different: multiple AI agents running parallel build tracks around the clock, with Austin doing coordination, review, and testing rather than hands-on coding. With this model, 2 weeks is achievable — but only if the parallelization is managed correctly and the build order respects dependencies.

The critical insight: most of Kin's domains share infrastructure (Supabase schema, authentication, AI API calls, push notifications) but can be built independently once that infrastructure is in place. The first 3 days establish the foundation. Days 4–14 run in parallel across 4–5 simultaneous agent tracks.

---

### Phase 0: Pre-Build (Before Day 1)

These are prerequisites that should be completed or confirmed before any code is written:

- [ ] Expo SDK 54 project initialized in `apps/mobile` (confirm existing scaffold is current)
- [ ] Supabase project created with production URL and service key
- [ ] Anthropic API key active and rate limits confirmed
- [ ] Google Cloud project with Calendar API v3 enabled, OAuth 2.0 client ID created
- [ ] Apple Developer account active, push notification certificate ready
- [ ] RevenueCat account created, $39/month product configured
- [ ] Stripe account connected to Mercury (routing/account numbers entered in Stripe payout settings)
- [ ] Domain DNS connected: Namecheap → Vercel

---

### Track A: Core Infrastructure (Days 1–3) — BLOCKING ALL OTHER TRACKS

*This track must complete before any other track begins meaningful work. The database schema and auth system are dependencies for everything.*

**Day 1: Supabase Schema + Authentication**

Build the complete Supabase schema in one session. This defines the data model for all 11 domains. Row-Level Security must be configured correctly from the start — retrofitting RLS is more work than building it right the first time.

```
Tables to create:
- households (id, family_name, created_at)
- parents (id, household_id, name, age, email, is_partner_1, created_at)
  → RLS: parent can only read/write their own row
- children (id, household_id, name, age, school_name, school_location, grade, created_at)
  → RLS: both parents in household can read/write
- pets (id, household_id, name, species, breed, age, vet_name, vet_phone, created_at)
  → RLS: both parents in household can read/write
- calendar_connections (id, parent_id, provider [google|apple|work], access_token, refresh_token,
  calendar_id, last_synced_at, sync_status)
  → RLS: parent can only read/write their own row
- calendar_events (id, parent_id, household_id, title, start_at, end_at, is_shared, is_all_day,
  external_id, external_source, location, is_work_event, created_at)
  → RLS: parent sees their own events; both parents see is_shared=true and is_work_event=false events
- household_todos (id, household_id, title, is_complete, assigned_to_parent_id, due_date, created_at)
  → RLS: both parents in household
- parent_todos (id, parent_id, title, is_complete, due_date, created_at)
  → RLS: parent sees only their own rows
- meal_plans (id, household_id, week_start_date, meals jsonb, grocery_list jsonb, estimated_cost, created_at)
  → RLS: both parents in household
- meal_ratings (id, household_id, meal_name, rating int, notes text, rated_at)
  → RLS: both parents in household
- budget_categories (id, household_id, name, monthly_limit, color, created_at)
  → RLS: both parents in household
- transactions (id, parent_id, household_id, amount, category_id, description, date, is_shared, created_at)
  → RLS: parent sees their own transactions; both see household totals via view only
- budget_summary_view (materialized: household_id, category_id, month, total_spent)
  → accessible to both parents in household
- fitness_profiles (id, parent_id, goals text, current_weight, target_weight, target_date, created_at)
  → RLS: strict parent-only
- workout_sessions (id, parent_id, date, exercises jsonb, notes, created_at)
  → RLS: strict parent-only
- pet_medications (id, pet_id, household_id, drug_name, dose, schedule, next_due, refill_date)
  → RLS: both parents in household
- children_allergies (id, child_id, household_id, allergen, severity, created_at)
  → RLS: both parents in household
- children_activities (id, child_id, household_id, activity_name, days_of_week, start_time, end_time,
  location, season_end_date, created_at)
  → RLS: both parents in household
- date_nights (id, household_id, date, activity, logged_at, created_at)
  → RLS: both parents in household
- home_subscriptions (id, household_id, service_name, monthly_cost, renewal_date, last_flagged_at, created_at)
  → RLS: both parents in household
- home_maintenance (id, household_id, task_name, cadence_days, last_done, next_due, created_at)
  → RLS: both parents in household
- kin_memory (id, parent_id, household_id, memory_type [preference|fact|rating|goal], content jsonb,
  created_at, updated_at)
  → RLS: parent sees their own; household memories visible to both
- push_tokens (id, parent_id, expo_push_token, device_id, created_at)
  → RLS: parent sees only their own
```

**Day 2: Authentication + Dual Profile Architecture**

- Email/password auth via Supabase Auth
- Google OAuth social sign-in (single sign-in for personal Google account, separate OAuth scope for Google Calendar — do not conflate these)
- Onboarding flow: Parent 1 creates account → sets up household profile → invites partner → Partner 2 accepts invite and creates their own account → both linked to household
- Partner invite system: generates unique invite link, stores pending invite in households table, resolves on Partner 2 signup
- Session management: each parent has their own auth session; switching between parent sessions is not a feature — each parent logs in from their own device

**Day 3: Core AI Integration + Push Notifications**

- Anthropic API integration: `claude-sonnet-4-20250514` as the AI backbone
- System prompt injection: family context (Layer 1 + Layer 2 as specified in System Prompt v1.0) assembled from Supabase on each API call; conversation history (Layer 3) as messages array
- Context assembly function: builds the `{{family_context}}` block dynamically from the household's Supabase data before every API call
- Chat interface: basic message send/receive working end to end in the React Native mobile UI
- Expo push notifications: APNs certificate installed, `expo-notifications` configured, push token stored in `push_tokens` table on app launch
- Morning briefing scheduler: Expo background task or server-side cron (Supabase Edge Function) that fires at 6am per parent's time zone, assembles the briefing prompt, calls Claude, and sends the result as a push notification

---

### Track B: Onboarding + First Value Moment (Days 3–5, begins after Track A Day 2)

The onboarding is the product's first impression. It must be conversational, fast, and end with a moment of genuine value. Per the FVM pivot (April 2026), the First Value Moment is the daily family schedule — not the meal plan.

**Day 3–4: Conversational Onboarding**

Onboarding is a 4-screen flow, not a form:

Screen 1 — Welcome + Household Setup: Family name, home location (city/zip), basic household type (two-parent / single parent). Fast. 60 seconds max.

Screen 2 — "Tell me about a typical weekday" (The FVM Setup): Kin AI asks this one question. Parent types a free-form description. Kin parses: wake time, gym or workout mentioned, work start, school/activity schedule, typical pickup time, dinner pattern. This becomes the initial schedule scaffold. The response is stored in `kin_memory` and used to pre-populate the calendar and generate the first morning briefing.

*Agent note: The parsing of this free-form input is done via an Anthropic API call with a structured JSON output schema. Extracted fields: wake_time, gym_morning (bool), work_start, first_commitment_time, school_pickup_time, kids_activities_mentioned, typical_dinner_time, any other logistics mentioned. These fields populate the household's baseline schedule pattern.*

Screen 3 — Family Members: Kids (name, age, allergies — this is critical — activities). Pets (name, species, vet schedule). Designed to feel like a conversation ("tell me about your kids"), not a form.

Screen 4 — Budget Setup: One number. "What's your monthly grocery budget?" That's it for now. Other budget categories are set later, in the app.

After Screen 4: Kin generates and displays the **first morning briefing** — a preview of what tomorrow's briefing will look like, based on what was just shared. This is the FVM. A parent sees tomorrow's schedule, the dinner question, and the budget line — and realizes Kin already knows their life after a 3-minute conversation.

**Day 4–5: Calendar Connection**

Immediately after onboarding, Kin prompts calendar connection:

- Google Calendar OAuth flow (personal calendar first — work calendar is a separate, optional step)
- Apple Calendar CalDAV connection (app-specific password flow)
- Read-only work calendar connection (Google Workspace OAuth with read-only calendar scope)

This is optional to complete onboarding but unlocked immediately after the FVM moment. The prompt is: "Connect your calendar so tomorrow's briefing includes your real schedule."

---

### Track C: Domain Builds (Days 4–10, runs parallel to Track B and Track D)

*Each domain below can be built by a separate agent. They share the database schema from Track A. Build agents should be given the schema and their domain spec from Section 2 of this document.*

**Domain Agents — Parallel Build Instructions**

Each agent below receives: (1) the Supabase schema from Track A, (2) the domain specification from Section 2 of this document, (3) the brand and UX standards from Brand Guide v2, and (4) the instruction to build UI in React Native using the Kin design system.

**Calendar Sync Agent (Days 4–6)**
Build two-way Google Calendar sync using the spec in Claude Code Build Brief v1, Section 2. This is the most complex technical build in the entire app. Priority: Google Calendar first (webhook-based, real-time), Apple CalDAV second (15-minute poll cycle). Household calendar merge with conflict detection must be complete before this agent is done.

**Meals Domain Agent (Days 4–7)**
Build the full meals experience as specified in Domain F. Priority order: (1) AI meal plan generation with allergy safety enforcement, (2) grocery list generation and display, (3) meal rating input, (4) budget integration (connects to budget category for groceries). The allergy enforcement check must be hardcoded in the meal generation prompt — never optional.

**Budget Domain Agent (Days 5–7)**
Build the budget experience as specified in Domain I. Priority: (1) category setup, (2) manual transaction entry via chat parsing and via a quick-add UI in the app, (3) shared budget view for both parents, (4) budget summary view surfaced in morning briefing.

**Kids + Pets Agent (Days 4–6)**
Build full kid and pet profiles as specified in Domains G and H. Priority: (1) profile creation and storage, (2) allergy data captured and fed to meals domain, (3) activity schedule fed to calendar domain, (4) pet medication reminders (push notification integration required).

**Fitness Agent (Days 5–8)**
Build the private fitness experience as specified in Domain E. Priority: (1) chat-based workout logging via Claude parsing, (2) progressive overload tracking (last session comparison per exercise), (3) workout window suggestions in morning briefing. All data strictly private per parent — RLS enforcement is critical here.

---

### Track D: Intelligence Layer (Days 6–10)

The intelligence layer is what makes Kin feel magical rather than functional. It requires the domain data from Track C to be partially complete before it can be fully built, but its logic can be built in parallel and integrated as domains complete.

**Morning Briefing Engine (Days 6–8)**

The morning briefing is the product's most important feature. It is assembled from all active domains every morning at 6am. The assembly logic:

1. Pull all domain data for this parent from Supabase (calendar, budget status, meal plan, kids' today activities, pet reminders, fitness next session, commute first event)
2. Assemble the context block in the format defined in System Prompt v1.0
3. Add a briefing-specific instruction to the system prompt: "Generate a 3–6 sentence morning briefing that covers today's schedule, any coordination needs, budget status, and tonight's dinner. Be specific. Use the parent's first name. Sound like a smart friend, not a robot."
4. Call Claude API with the assembled context
5. Send result as push notification via Expo push

The briefing must prioritize: time-sensitive logistics first, coordination needs second, budget/meals third, opportunistic suggestions (date night, workout window) last.

**Commute Intelligence (Days 6–7)**

Per Domain C spec:
- MVP: Google Maps Distance Matrix API for estimated commute time (static, not real-time)
- First event in the day's calendar generates a departure time: event_time - commute_duration - 10min_buffer = leave_by_time
- This leave-by time is passed to the morning briefing engine as a structured data point
- Real-time traffic (v1.1): upgrade to Google Maps Routes API for live conditions

**Work Awareness (Days 7–8)**

Per Domain D spec:
- Work calendar events visible in morning briefing as read-only context
- Meeting count, first meeting time, and back-to-back block detection passed to briefing engine
- User can flag events as "needs prep" via chat: "flag my 9:30 for prep" — Kin sets a prep reminder 30 minutes prior
- Email/task reminders: if user mentions needing to send something, Kin creates a `parent_todos` entry with a due time and triggers a push notification

**Date Night Engine (Days 8–9)**

Per Domain J spec:
- Background job runs daily: check `date_nights` table for last entry, calculate days since
- If days_since > 14 AND both parents have a free evening in next 7 days (calculated from merged calendar view), flag for next briefing
- Date night suggestion is injected as a line in the morning briefing OR surfaced as a chat prompt in evening
- On confirmation: create calendar event for both parents (requires confirmation before creating)

---

### Track E: Billing + App Store (Days 8–12, parallel to Track D)

**RevenueCat Integration (Days 8–9)**

- RevenueCat project configured with two products: `kin_monthly_3999` ($39/month) and `kin_annual_29900` ($299/year)
- `react-native-purchases` installed in Expo app
- Paywall screen built per brand guide: dark background, warm white text, annual option highlighted
- Paywall trigger: fires after 7-day trial — the trial begins on first sign-in, tracked in Supabase
- Trial state: during 7-day trial, all features fully accessible, a subtle trial countdown is visible in settings
- Post-trial: soft paywall (can view but not act), not a hard lock — removes friction, respects the user

**7-Day Trial Arc (Days 9–10)**

This is the retention program that converts trial users to paying subscribers. Each day of the trial should feel like Kin is showing the user something new:

- Day 0: Schedule FVM — the first briefing shows the family's real schedule
- Day 1: First morning briefing (real data, real calendar if connected)
- Day 2: Meals — Kin generates the first weekly meal plan and grocery list
- Day 3: Proactive intelligence — first cross-domain connection surfaced (e.g., budget + dinner, or commute + meeting)
- Day 4: Partner invite nudge — "Kin is smarter with both calendars connected"
- Day 5: Budget — subscription audit prompt or budget summary surfaced
- Day 6: Loss preview — morning briefing includes a subtle note that trial ends tomorrow, and a specific example of what Kin handled this week
- Day 7: Conversion moment — paywall appears with a summary of the week ("This week, Kin planned 5 dinners, reminded you about Buddy's vet, and saved you from a school pickup conflict")

**App Store Submission (Days 10–12)**

- App Store listing: *Kin: Family AI*
- Screenshots: 6 key screens — morning briefing, family calendar, meal plan, chat interface, budget dashboard, pet profile
- Preview video: 30 seconds showing the morning briefing use case
- Privacy policy URL: kinai.family/privacy (already drafted in Kin Legal Documents)
- App description built around the morning briefing example — this is the hook
- App review submission: target Day 12; average review time is 24–48 hours; plan for launch on Day 14

---

### Days 13–14: Integration, Polish, and Launch

**Day 13: End-to-End Testing**

- Full onboarding flow test: both parents, kids, pets, calendar connection
- Morning briefing: verify all domains contribute correctly to the assembled context
- Allergy safety test: confirm dairy/egg suggestions are never generated for allergic profiles
- Budget privacy test: confirm Parent 1 cannot access Parent 2's individual transactions
- Notification delivery: all 7 notification types tested and confirmed
- RevenueCat purchase flow: test monthly and annual purchase, confirm trial state, confirm post-trial paywall
- Edge cases: empty states (no calendar connected), Day 1 user with no data (similar-family intelligence active), single parent (partner not invited)

**Day 14: Launch**

- TestFlight beta to Austin and 5–10 test users
- App Store submission approved (submitted Day 12, approved Day 13–14)
- kinai.family waitlist emails sent via Beehiiv: "Kin is live"
- First TikTok/Instagram content: the morning briefing example — real, Austin's actual life
- Submit Plaid application on launch day (starts the approval clock for Phase 3 bank sync)

---

### Build Roadmap Summary

| Version | Domains Included | Status |
|---|---|---|
| **v1.0 — Launch (2 weeks)** | Schedule + Calendar, Partner Coordination, Commute (static), Work Awareness, Meals + Allergy, Kids, Pets, Budget (manual), Date Night, Fitness (chat-based logging) | Ships Day 14 |
| **v1.1 — Week 3–4** | Real-time commute (Google Routes API), Apple Health integration, Pantry tracking, Home Management (subscriptions + maintenance), Structured workout plans | Post-launch updates |
| **v2.0 — Month 2–3** | Plaid bank sync (pending approval), Grocery cart push (Instacart — pending approval), Apple Watch, Live Activities, Siri Shortcuts, Android | Requires third-party approvals |

**What requires third-party approval (start applications on launch day)**
- Plaid: bank sync — apply on launch day, approval typically 2–4 weeks
- Instacart API: grocery cart push — apply on launch day, timeline uncertain
- Apple Watch target: no approval needed, but requires SwiftUI extension work — target v2.0

---

## Section 7: The "Kin Knows" Competitive Positioning

### Why This Is Defensible

Every competitor in the family app space is facing the same architectural problem: they built deep expertise in one domain and now face the choice of either expanding into adjacent domains (slow, hard, requires completely different product thinking) or staying in their lane and hoping a horizontal player doesn't show up.

Kin is the horizontal player.

Cozi has 20 million users and cannot ship AI, budget tracking, or meal planning because their architecture — a shared family account with a simple calendar — cannot support the dual-profile privacy model or the cross-domain intelligence layer. They can add features on top of their architecture, but they cannot change their architecture. That is a moat.

YNAB has 2 million users and cannot ship family coordination, meals, or calendar sync because they are fundamentally a budgeting methodology company. Their product is a behavior change system, not a daily intelligence layer. That is a different job to be done.

Mealime has 7 million users and cannot ship calendar awareness, commute intelligence, or budget integration because they built a recipe app and a meal scheduling tool. Adding those domains would make Mealime a different product. They would rather be the best meal planning app than try to become an OS for family life.

Kin's moat is not any single feature. It is the decision to build all 11 domains together, connected from day one, with a data model designed for a family of individuals rather than a single-account household. By the time any competitor decides to replicate this architecture, Kin will have 12–18 months of real family data compounding in its model.

### Network Effects

Kin gets measurably better the moment a second parent joins the household. The morning briefing becomes more accurate (both calendars connected), the coordination intelligence activates (partner schedule creates household logistics), the date night engine turns on (needs both calendars), and the budget privacy layer becomes meaningful (both partners have individual contexts).

The invite moment — "Kin works better with both of you connected" — is the product's first network effect. It is not a viral sharing mechanic. It is a genuine product improvement that the inviting parent has already experienced and wants to unlock. That is the most effective kind of referral.

### Switching Costs

A family that uses Kin for 6 months has embedded the following in the app:
- Both parents' full calendar history and sync state
- 24+ weeks of meal ratings and preference refinement
- Complete kid profiles with school schedules, activity calendars, allergy data, and health notes
- Pet vaccination history, medication logs, and vet records
- 6 months of budget history by category
- A fitness log with progressive overload history per exercise
- A persistent AI that knows the family's preferences, patterns, and history

That data is not exportable in any meaningful sense — not because Kin prevents export (it should not, and users should be able to export their data), but because the intelligence that has been built on that data lives in Kin's AI layer. You can export the raw meal ratings, but you cannot export the model that has learned from them. That model is Kin.

### The Data Moat

The most powerful AI applications are not the ones with the best models — Claude, GPT-4, and Gemini are all competitive at the base level. The most powerful applications are the ones with the best context. Context is what makes a generic model feel like a product that knows you.

Kin's context advantage compounds with time. Week one, Kin is using similar-family patterns to fill the gaps. Week twelve, Kin is running almost entirely on this family's specific data — their meal ratings, their budget history, their schedule patterns, their fitness progression, their kids' preferences. The more domains active, the richer the context, and the more irreplaceable Kin becomes.

A new entrant could build the same architecture. They could not replicate 12 months of the Johnson family's data. That is the moat.

---

## Appendix: Key References

| Document | Location | Last Updated |
|---|---|---|
| Brand Guide v2 | `/docs/Kin_Brand_Guide_v2.md` | March 2026 |
| Claude Code Build Brief v1 | `/docs/Kin_ClaudeCode_BuildBrief_v1.md` | March 24, 2026 |
| Competitor Matrix | `/docs/Kin_Competitor_Matrix.md` | March 2026 |
| System Prompt v1.0 | `/docs/Kin_System_Prompt_v1.md` | March 2026 |
| First Value Moment Spec | `kin-ios-first-value-moment-spec.md` | April 2, 2026 |
| iOS Build Plan | `kin-ios-build-plan.md` | April 2, 2026 |
| FVM Pivot (Memory) | `.auto-memory/project_pivot_schedule_fvm.md` | April 2, 2026 |

---

*kin*

*The Mental Load, Handled.*

Kin Technologies LLC · Product Vision v2.0 · April 2026 · Confidential
