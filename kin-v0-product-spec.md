# Kin v0 — Product Spec
### The Family Intelligence Layer

**Version:** 0.1
**Date:** April 3, 2026
**Principle:** Fewer screens. Deeper intelligence. Every output should feel like it was written by someone who understands your life.

---

## Product Thesis

Kin v0 is not a life OS. It's the smartest member of your household — one that remembers everything you've told it, watches both parents' calendars in real time, and surfaces what matters before you think to ask.

The product succeeds when users say:
> *"Wait — it already figured that out."*

---

## Navigation Structure

Three tabs. Executed perfectly.

```
[ Today ]   [ Conversations ]   [ Settings ]
```

---

## 1. Today Screen

The home screen. Dynamic, dual-parent, and updated by Kin — both automatically and in response to chat.

### Layout (top to bottom)

**Header**
- "Good morning, [Name]" — personalized, time-aware
- Date + day of week
- Weather line if relevant to day (optional at v0)

**Morning Briefing Card**
- The flagship feature. One AI-generated message per user, per day.
- Combines: both calendars + kids' schedules + household memory
- Written in plain language — implications, not data
- Updates daily. Generates fresh each morning.
- Example:
  > *"Morning. Your partner's 5pm runs long — pickup's yours. Practice ends at 6:30, dinner at 8 gets tight. Worth eating something before you leave."*

**Active Alerts**
- Real-time coordination flags that surface throughout the day
- Triggered by: calendar changes, conflicts detected, time-sensitive coordination needs
- Dismissible. One at a time, not a feed.
- Example:
  > *"Your partner's 6pm just moved to 7:30 — you've got pickup tonight."*

**Today's Schedule**
- Combined view: both parents' events, color-coded by person
- Kids' schedule overlaid (school end time, activities)
- Clean list format — time + event + who
- Tappable to see full event detail
- Updates in real time as calendars change

**Kin Check-ins (Light Touch Domains)**
- Kin-initiated contextual prompts, surfaced as cards
- These are the gateway to all other domains — no extra screens needed
- Examples:
  - *"Dinner's in 2 hours. Want me to pull something quick?"* → tap → opens a conversation
  - *"You mentioned trying to cook more on weekdays — you've got a 45-min window at 6."*
  - *"It's been a few weeks since you mentioned the HVAC filter — remind you this weekend?"*
- Maximum 1–2 cards per day. Never overwhelming.

### How Chat Updates Today

When a user tells Kin something in chat that affects their day, Kin updates the Today screen to reflect it — and confirms it did.

**Example flow:**
- User in chat: *"Actually I'll handle pickup tonight, my partner got a conflict"*
- Kin: *"Got it, I've updated your afternoon. I'll remind you at 5:15 to head out."*
- Today screen: Alert clears, schedule reflects the change, reminder queued

This makes the Today screen a living document, not a static dashboard.

---

## 2. Conversations

A list of conversations — personal and household — with Kin. Structured like Claude or ChatGPT's conversation history, but with context and intent baked in.

### Conversation List

- Scrollable list of recent conversations
- Auto-titled by Kin based on topic (e.g., "Pickup coverage — Tuesday", "Dinner ideas for the week", "Partner schedule conflict")
- Last message preview + timestamp
- Unread badge when Kin has initiated or responded
- Pinned threads (e.g., always-on household thread)
- New conversation button (+ icon)

### Conversation Types

**Personal** *(private to you)*
- Just you and Kin
- Kin has full context of your calendar, your memory, your preferences
- Use for: asking questions, updating Kin on your life, planning, quick checks
- Examples:
  - *"Can you remind me to call the school tomorrow morning?"*
  - *"What does my afternoon look like if I push my 3pm?"*
  - *"I'm thinking about meal prepping Sunday — what would work given next week?"*

**Household** *(shared with partner)*
- Both parents + Kin in one thread
- Kin can reference both calendars and mediate coordination
- Thread is visible to both partners
- Use for: decisions that require both people, logistics, shared context
- Examples:
  - Partner sends: *"Who has pickup Thursday?"*
  - Kin: *"Austin has a clear afternoon Thursday — [Partner], you've got a 4pm. Austin's got it."*

### How Kin Initiates Conversations

Kin doesn't wait to be asked. When something is worth a conversation, Kin starts one.

- Calendar conflict detected → new conversation in list: *"Conflict flagged — Thursday pickup"*
- Check-in card tapped on Today → opens a conversation thread
- Morning briefing follow-up → Kin may open a thread if something needs a decision

Initiated conversations appear in the list like any other — they're just Kin going first.

### Chat Behavior

- Kin always has full context: calendar, memory, household data, time of day
- Kin speaks in plain language — not assistant-speak
- Kin can push updates to the Today screen from within chat (confirmed in-thread)
- Kin references memory naturally: *"You mentioned you usually cook Mondays — that still the case?"*
- Responses are concise. One clear message, not a wall of text.

---

## 3. Settings

Everything needed to configure, connect, and personalize Kin.

### My Profile
- Name, photo
- Notification preferences (time, frequency)
- Briefing delivery time (default: 7:00am)
- Kin tone preference: Warm / Direct / Balanced

### Family
- **Partner** — invite by email or phone, link accounts, shared household thread enabled on accept
- **Kids** — name, school, school end time, activities (day + time + location), pickup default (who handles it)
- Edit / remove family members

### Calendars
- Connected calendars per person (user + partner once linked)
- **Google Calendar** — OAuth connect, select which calendars to include
- **Apple Calendar** — iCloud auth, select calendars
- Sync status indicator (last synced, any errors)
- Option to add additional calendars (Outlook, etc. — future)

### Kin Memory
- View what Kin knows about your household (structured summary)
- Edit or correct memory items
- Add context manually: *"I work from home Fridays"*
- This is what makes the briefing feel personal — users should feel in control of it

### Notifications
- Morning briefing: on/off + delivery time
- Coordination alerts (calendar conflicts): on/off
- Kin check-ins (proactive prompts): on/off + max per day
- Household thread activity: on/off

### Subscription
- Current plan: Kin Family — $39/month
- Next billing date
- Manage / cancel (links to Stripe portal)
- Annual plan option: $299/year (shown as "Save $169/year")
- 7-day free trial status if applicable

### About
- App version
- Privacy policy, Terms of service
- Send feedback
- Contact support

---

## Intelligence Layer (Memory)

Memory is what separates Kin from a calendar app. Every fact Kin learns — from onboarding, from chat, from patterns — becomes context that makes outputs more specific and more useful.

### What Kin Remembers

**From Onboarding**
- Typical weekday structure per parent
- Kids' schedules (school, activities, pickup windows)
- Who handles what by default (pickup, dinner, bedtime routine)
- Any recurring commitments mentioned

**From Chat**
- Explicit updates: *"My schedule changed — I'm now remote Thursdays"*
- Preferences: *"I'm trying to cook more, not order delivery"*
- One-offs: *"I've got a dentist thing next Tuesday afternoon"*
- Corrections: *"Actually my partner handles Wednesday pickup"*

**From Patterns (Over Time)**
- Calendar habits (always free Friday mornings, meetings tend to run late)
- Used to improve briefing specificity over time

### How Memory Is Used

- **Morning briefing** — primary driver of specificity
- **Proactive check-ins** — triggered by memory + time context
- **Chat responses** — Kin references memory naturally in conversation
- **Today screen** — alerts and schedule view informed by household context

---

## Feature Domains — v0 Approach

All domains are accessible through intelligence, not screens. No extra tabs required at launch.

| Domain | v0 Delivery | Screen Required? |
|---|---|---|
| Calendar / Schedule | Full — both parents, real-time | Today + Settings |
| Partner Coordination | Full — alerts, household chat, shared briefing | Today + Conversations |
| Kids | Full — school, activities, pickup logic in briefing | Settings (input only) |
| Meals | Light touch — Kin check-in card, opens conversation | No |
| Home management | Light touch — memory-triggered reminders | No |
| Fitness | Light touch — schedule-aware suggestions in chat | No |
| Budget | Out of scope v0 | — |
| Pets | Out of scope v0 | — |
| Subscriptions | Out of scope v0 | — |

---

## Explicitly Out of Scope (v0)

Do not build. Do not partially implement.

- Meal planning tab or meal tracking screen
- Budget or financial integration (Plaid, etc.)
- Fitness tracking or health data
- Pet profiles or pet management
- Home management tab
- Subscription / recurring expense tracker
- Deep to-do or task management system
- Third-party integrations beyond Google + Apple calendar

These are v1+ features, unlocked after establishing revenue and validating the core intelligence loop.

---

## Success Criteria (First 100 Users)

- Users open the app daily for the morning briefing
- Users explicitly say: *"This is actually useful"* or *"It figured something out I didn't think about"*
- 30–40% of users rely on it within 3 days of onboarding
- Partner invite conversion > 50% (one partner invites the other)
- Push notification open rate > 40% on coordination alerts

---

## Build Philosophy

**Intelligence before features.** Every new domain added before the coordination engine is dialed in just gives AI more surface area to be mediocre on.

**Win one moment before expanding scope.** That moment is:
> *"I don't have to think about coordination anymore."*

**If forced to choose between more features and better insights, always choose better insights.**

---

*v0 spec — Kin AI, April 2026*
