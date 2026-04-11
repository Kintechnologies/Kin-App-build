# Trial Arc — UX & Copy Spec
**Track E · Written by: Product & Design Lead · April 3, 2026**

---

## What This Document Is

The 7-day trial arc is the conversion program. Each day of the trial should feel like Kin is revealing something new — not a feature gate opening, but a capability the user hasn't seen yet. This spec defines exactly what the user experiences on each day of the trial, what Kin says, how it's surfaced, and what happens on Day 7 when the trial ends.

**Do not surface more than one arc-triggered element per day.** The trial arc supplements the normal Kin experience — it does not override it.

---

## Trial State Architecture

### Where Trial State Lives

**Supabase:** Add a `trial_started_at` timestamp column to `profiles` table. Set when the user taps "Start Free Trial" in the paywall sheet (on `Purchases.purchasePackage` success callback).

```sql
ALTER TABLE profiles ADD COLUMN trial_started_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN trial_day INTEGER GENERATED ALWAYS AS (
  LEAST(7, EXTRACT(DAY FROM NOW() - trial_started_at)::INTEGER)
) STORED;
```

**RevenueCat:** `customerInfo.entitlements.active['kin_premium']` is the source of truth for subscription status. Trial state is inferred from this + `trial_started_at`.

**App state:**

```typescript
interface TrialState {
  status: 'none' | 'trial_active' | 'trial_expired' | 'subscribed';
  trialStartedAt: string | null;   // ISO timestamp
  trialDay: number | null;         // 0–7, null if not in trial
  daysRemaining: number | null;    // 7 - trialDay, null if not in trial
}
```

Load on app start in `_layout.tsx`, store in a context or Zustand slice. Re-check on `AppState` foreground event.

---

## Day-by-Day Arc

### Day 0 — Schedule FVM (Triggered at Onboarding End)

**Trigger:** Onboarding completes (user finishes step 5 of `OnboardingSurvey.tsx`).

**What happens:**
1. FVM briefing preview appears inside onboarding (already built in B5).
2. Immediately after: `CalendarConnectModal` appears (already built in B6).
3. If calendar is connected: Kin generates a real, calendar-aware briefing within the session.
4. If calendar not connected: Kin generates a briefing from onboarding data alone, acknowledges the gap naturally.

**Kin output (FVM preview):**
Follow the first-insight structure from §21 of the intelligence engine — specific to their data, ends with a holding signal:
> *"Got your week. [Specific insight from their schedule]. I'll flag you before anything needs handling."*

**No arc-specific UI on Day 0 beyond what B5 already handles.** This day is entirely about the first output quality — no banners, no "Day 1 of your trial" messaging.

---

### Day 1 — First Morning Briefing

**Trigger:** Morning cron fires for the first time. `trial_day === 1`.

**What happens:**
- User receives a push notification with their morning briefing (normal briefing behavior).
- **One addition:** The briefing push notification on Day 1 uses a slightly more welcoming opening.

**Push notification copy (Day 1 only):**
> "Morning. Kin's been watching your week — here's what you need to know."

Then the full briefing loads in-app as normal. No banner, no special UI.

**In-app:** Normal Today screen. No Day 1–specific callouts. The briefing IS the experience.

**Do not add:** "Day 1 of your trial", celebratory graphics, or anything that makes this feel like a feature tour.

---

### Day 2 — Meals Domain Reveal

**Trigger:** `trial_day === 2`. Morning briefing OR first app open of Day 2.

**Surface:** Check-in card on Today screen (slotted as the daily check-in, replacing or deferring any generic check-in).

**Card copy:**
> "You've got your week sorted. Want me to plan dinners around it — no repeats, no dairy for [child's name]?"

**Card behavior:**
- Tap → opens a new Conversations thread with title "Meal plan for the week"
- First message in thread (Kin-initiated):
  > "Here's what makes sense this week — I've built it around your evenings and kept it dairy and egg-free for [child's name]."
  > [Meal plan renders inline — 5 weeknight dinners]
  > "Grocery list is ready too — want me to add anything?"
- This triggers Kin to generate the full weekly meal plan using the `/api/meals` route.

**If no kids with allergies:** Card copy simplifies to:
> "Week's looking manageable. Want me to plan dinners while I have your schedule in front of me?"

**If Meals domain not yet prompted (user hasn't set up any preferences):** Still show the card. Kin generates a default plan from the family's budget and any dietary preferences in memory.

---

### Day 3 — Proactive Cross-Domain Intelligence

**Trigger:** `trial_day === 3`. Fires in the morning briefing, not as a separate card.

**What happens:** The morning briefing on Day 3 must include at least one cross-domain connection — an insight that couldn't come from a single-domain app. The briefing generation prompt should be flagged on `trial_day === 3` to prioritize cross-domain insights even when a lower-priority single-domain insight might otherwise be chosen.

**Examples of qualifying cross-domain connections:**
- Calendar + Budget: *"You've got a free evening tonight and you're under grocery budget this week — good window for a proper dinner."*
- Calendar + Kids: *"Practice runs until 7 and bedtime is 8:30 — you'll want something quick for dinner. I've flagged it."*
- Commute + Meeting: *"Traffic on 315 is usually heavy on Wednesdays — your 9am means leaving by 8:10."*

**No special UI.** This lands entirely in the briefing text itself. The user shouldn't know it's "Day 3 of the trial reveal" — they should just think *"it figured something out."*

---

### Day 4 — Partner Invite Nudge

**Trigger:** `trial_day === 4` AND `partner.status === 'none'` (no partner linked).

**Surface:** One-time check-in card on Today screen.

**Card copy:**
> "Kin is smarter with both calendars. Add your partner — I'll start catching coordination gaps neither of you would spot alone."

**Card behavior:**
- Tap → opens partner invite modal (email input)
- Dismiss → suppresses the card for the rest of the trial (do not resurface)

**If partner is already linked:** Skip Day 4 arc entirely. No substitute card. Let the day run normally.

**Note:** Do not surface this card if there is an active OPEN coordination alert. The alert takes priority (§5 priority rules).

---

### Day 5 — Budget Surface

**Trigger:** `trial_day === 5` AND user has at least one `budget_categories` row with spend > 0.

**Surface:** Check-in card on Today screen.

**Card copy (if categories exist and have spend):**
> "Quick budget check — you've got [X] left in [top category] this week. Anything you want me to flag before the month ends?"

**Card copy (if no spend logged yet):**
> "Budgeting is one of the things I track — want to tell me roughly what you spend on groceries, dining, and utilities? I'll start watching the right categories."

**Card behavior:**
- Tap with spend data → opens Conversations thread: "Budget — this week"
- Tap with no data → opens a lightweight budget setup flow (category entry)
- Dismiss → suppresses for the rest of the trial

**If budget domain has zero activity (no categories, no spend):** Show the no-spend version of the card. Still counts as Day 5 reveal.

---

### Day 6 — Loss Preview in Morning Briefing

**Trigger:** `trial_day === 6`. Fires in the morning briefing via the cron job.

**What happens:** The morning briefing on Day 6 includes a final paragraph — a "this is what you'd lose" summary. This is not a separate push or card. It's the last item in the briefing, after the normal content.

**Implementation:** In the morning briefing prompt for `trial_day === 6`, inject a final instruction:

```
At the end of this briefing, add one final paragraph (2 sentences max) that:
1. Notes the trial ends tomorrow (factual, not dramatic).
2. References one specific, concrete thing Kin handled this week — a real coordination moment, meal plan, or insight — using the user's actual data.
Do NOT use generic language. Pull from the user's actual week.
```

**Example output (end of briefing):**

> *"One thing — trial ends tomorrow. This week I caught the Thursday pickup conflict before it became a problem and planned 5 dinners around your son's allergies. Worth keeping."*

**Copy rules (enforced by prompt):**
- Must reference a REAL event from the user's week — never fabricate
- Maximum 2 sentences
- "Trial ends tomorrow" must appear, not "subscription starts soon" or "your trial period concludes"
- The second sentence is a specific callback — never generic ("Kin helped you a lot")
- Final 3 words: *"Worth keeping."* — exactly this phrasing, always

**If no real events to reference:** Fall back to the most concrete thing in memory — the child's allergy safe meals, the schedule Kin learned, etc. Never omit the second sentence entirely.

---

### Day 7 — Conversion Moment

**Trigger:** `trial_day === 7` (the morning the trial expires). Fires BEFORE the morning briefing is delivered.

**What happens:** Instead of the normal morning briefing, the user receives a special conversion briefing followed by the hard paywall.

**Step 1 — Conversion Briefing (push notification + Today screen)**

The morning briefing push on Day 7 delivers a summary of the week, not the day:

**Push copy:**
> "Trial's up. Here's what Kin handled this week."

**In-app briefing card (Today screen, shown before paywall fires):**

```
  This week, Kin:

  · Caught [N] coordination moments
  · Planned [N] dinners ([child's name]-safe)
  · Reminded you about [specific event from week]
  · Flagged [specific insight] before it mattered

  Worth $39/month?
```

This card replaces the normal morning briefing card. It is the last thing the user sees before the paywall.

**Generation:** The morning briefing cron on Day 7 must query the week's data to populate this card:
- `coordination_moments`: count of RESOLVED pickup/conflict events this week
- `meal_plans`: count of dinners in most recent meal plan
- `push_notifications`: the most recent coordination push copy (for the "reminded you about" line)
- `morning_briefings`: the most specific insight from Day 1–5 briefings (for the "flagged X before it mattered" line)

If any of these are empty: omit that bullet. Minimum 2 bullets required. If the user had a very low-activity week, the card still shows a 2-bullet minimum using whatever is true.

**Step 2 — Hard Paywall (fires 3 seconds after briefing card loads)**

Full-screen paywall modal (`PaywallScreen.tsx` — see `revenuecat-paywall-spec.md`). Non-dismissible. Back navigation disabled.

**Paywall copy on Day 7 (differs from spec baseline):**

```
  kin

  Your trial ended.

  Everything you set up is still here.     ← existing copy
  Subscribe to keep going.                 ← existing copy

  [ Subscribe — Keep Everything ]          ← existing CTA copy

  Restore purchase
```

No changes to the paywall layout — just confirm the copy matches exactly. No day-count references on the paywall itself. Keep it about what they have, not what they're losing.

---

## Trial Countdown in Settings

During `trial_active` state, the Subscription section of Settings shows a progress bar and countdown.

**Progress bar:** Fills left-to-right over 7 days.
- Color: `#7CB87A` (days 1–5), `#E8875A` (days 6–7)
- Width: `(daysUsed / 7) * 100%`
- Track: `rgba(240,237,230,0.08)`, height 4pt, fully rounded

**Countdown text:**
- Days 3–7: "[N] days left in your trial" — `rgba(240,237,230,0.4)`, Geist, 13pt
- Days 1–2: "[N] days left in your trial" — `#E8875A`, Geist-SemiBold, 13pt

The countdown is visible in Settings ONLY — not on the Today screen, not in the tab bar. The trial experience is delivered through content, not countdown anxiety.

---

## Arc Suppression Rules

The trial arc never overrides the coordination intelligence. If a High-priority coordination alert is active (Pickup Risk, Coverage Gap — OPEN state), the day's arc element is deferred to the following app open or dropped entirely.

Arc elements also follow the standard output limits:
- Maximum 1 check-in card per day (arc card counts toward the 2/day max)
- Arc cards are dismissible; dismissed cards do not reappear
- Arc cards respect the 3-Strike Rule (§14 of intelligence engine) — though in practice, within a 7-day arc, 3 strikes won't accumulate for any single trigger type

---

## Implementation Checklist

**Supabase:**
- [ ] `trial_started_at` column on `profiles`
- [ ] `trial_day` computed column (or derived in app from `trial_started_at`)

**Morning briefing cron (`supabase/functions/morning-briefing/index.ts`):**
- [ ] Inject `trial_day` into briefing assembly context
- [ ] On Day 1: use welcoming push title (hardcoded in cron)
- [ ] On Day 3: flag prompt to prioritize cross-domain insight
- [ ] On Day 6: inject loss-preview paragraph instruction into prompt
- [ ] On Day 7: generate week summary card instead of daily briefing

**Today screen (`apps/mobile/app/(tabs)/index.tsx`):**
- [ ] Check `trial_day` on screen load
- [ ] Conditionally render arc check-in card (Days 2, 4, 5) using `TrialArcCard` component
- [ ] On Day 7: render conversion briefing card (`TrialSummaryCard`) instead of normal briefing card

**New components:**
- [ ] `TrialArcCard` — generic check-in card with Kin-initiated copy (different from standard check-in card only in that copy is injected, not AI-generated at runtime)
- [ ] `TrialSummaryCard` — Day 7 week summary card with dynamic bullet list

**Settings (`apps/mobile/app/(tabs)/settings.tsx`):**
- [ ] `SubscriptionSection` renders trial progress bar + countdown (per settings-spec.md)
- [ ] Progress bar color logic: `daysUsed >= 6 ? '#E8875A' : '#7CB87A'`

**`_layout.tsx`:**
- [ ] On app start: check `trial_day`. If `trial_day === 7` AND `!hasActiveSubscription`: redirect to `PaywallScreen` before rendering tabs.
- [ ] On `AppState` foreground: re-check (handles overnight trial expiry)

---

## Tone Consistency (Arc Copy Review)

All arc-triggered copy follows §8 and §19 of the intelligence engine:

| Arc moment | Copy rule |
|---|---|
| FVM preview | Opens with "Got your week." — exactly. No alternatives. |
| Day 1 push | "Morning. Kin's been watching your week…" — factual, not excited |
| Day 2 card | Opens with observation ("You've got your week sorted"), not a question |
| Day 4 card | States the value directly ("Kin is smarter with both calendars"), not "Would you like to…" |
| Day 5 card | Specific dollar amount, not "You might want to check your budget" |
| Day 6 briefing close | "Worth keeping." — exactly this. Two words. Present tense. |
| Day 7 push | "Trial's up." — not "Your trial has ended" or "Subscription required" |

---

*kin · The Mental Load, Handled. · Kin Technologies LLC · Confidential*
