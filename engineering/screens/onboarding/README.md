# Kin AI — Track B: Onboarding Flow

**Complete implementation of the 5-screen onboarding flow for iOS Kin app**

---

## Overview

Track B implements Kin's first-run experience: a 4-screen conversational onboarding that collects essential family data and delivers a personalized morning briefing preview within 3 minutes.

**Key moments:**
1. **Welcome** — Family name + home location (10 seconds)
2. **Schedule Intake** — Free-form weekday description + AI parsing (60 seconds)
3. **Family** — Children, pets, allergies (90 seconds)
4. **Budget** — Monthly grocery budget (15 seconds)
5. **FVM** — Briefing preview + account creation (60 seconds)

The First Value Moment briefing is the proof that Kin works — it's warm, specific, and generated from the user's real family data in real-time.

---

## Architecture

```
onboarding-state.ts
  └─ Zustand store (single source of truth for all onboarding data)
     └─ Shared across all 5 screens, persists in-memory until Screen 5

onboarding-navigator.tsx
  └─ React Navigation stack
     ├─ 01-welcome.tsx          (Screen 1)
     ├─ 02-schedule-intake.tsx  (Screen 2)
     ├─ 03-family.tsx           (Screen 3)
     ├─ 04-budget.tsx           (Screen 4)
     └─ 05-fvm.tsx              (Screen 5)

save-onboarding.ts
  └─ Atomic write to Supabase at end of Screen 5
     ├─ Create household
     ├─ Create parent
     ├─ Insert children + allergies
     ├─ Insert pets
     ├─ Insert budget categories
     ├─ Insert schedule pattern (kin_memory)
     ├─ Create trial state
     └─ Mark onboarding_complete = true
```

---

## Screens

### Screen 1: Welcome + Household Setup (`01-welcome.tsx`)

**What it does:**
- Collects family name ("Ford", "Martinez", etc.)
- Collects home location ("Columbus, OH", "94301", etc.)
- Subtle fade-in animation on mount
- Advance to Screen 2 on continue

**Design:**
- Wordmark: "kin" in Instrument Serif italic (54px)
- Tagline: "The Mental Load, Handled." (secondary text)
- Two text inputs: family name, home location
- Continue button: full-width primary green
- Privacy note: "7-day free trial · No credit card needed"

**Data saved to state:**
- `familyName`
- `homeLocation`

---

### Screen 2: Conversational Schedule Intake (`02-schedule-intake.tsx`)

**What it does:**
- Core of the FVM: user describes typical weekday in their own words
- Claude API parses freeform text into structured schedule pattern
- Shows confirmation summary for user to verify
- "Let me fix that" flow allows correction before proceeding

**Design:**
- Header: "Tell me about a typical weekday." (Instrument Serif italic)
- Subtext: guidance ("Start with when you wake up...")
- Multi-line textarea (min 4 lines, max 10 visible, scrollable)
- Loading state: Kin wordmark with "Building your schedule profile..."
- Confirmation: parsed summary in green-bordered card
- Buttons: "That's right →" and "Let me fix that"

**API Call:**
- Model: `claude-opus-4-1-20250805`
- Prompt: Structured JSON extraction (wake time, gym, work start, first meeting, pickup, etc.)
- Returns: `ParsedSchedulePattern` object with 11 fields + warm summary

**Data saved to state:**
- `weekdayDescription` (raw user input)
- `schedulePattern` (parsed JSON from Claude)

---

### Screen 3: Family Members (`03-family.tsx`)

**What it does:**
- Collects children (name, age, grade, **allergies**)
- Collects pets (name, species, breed, vet name)
- Multi-add interface: inline forms for each child/pet
- Allergy handling: **CRITICAL** — multi-select checkboxes (each allergen independent)

**Allergy Details:**
- 6 preset options: Dairy, Eggs, Nuts, Gluten, Soy, Other
- Multi-select: both dairy AND egg can be selected
- Selected allergies render as badges on child cards
- "Other" shows text input for custom allergen
- Saved as array per child: `['dairy', 'egg']`

**Design:**
- Header: "Who's in your family?" (Instrument Serif italic)
- Subtext: explains purpose (meals, activities, etc.)
- Two sections: Children and Pets
- Each saved item shows as compact card with remove button
- Add buttons: "+ Add a child" and "+ Add a pet"
- Inline forms slide in when adding
- Continue button: active even with zero children/pets
- Skip option: "Skip for now" text link

**Data saved to state:**
- `children` array (OnboardingChild[])
  - name, age, grade, allergies
- `pets` array (OnboardingPet[])
  - name, species, breed, vetName

---

### Screen 4: Budget Baseline (`04-budget.tsx`)

**What it does:**
- Single question: "$___ /month on groceries"
- Large, centered input (40px Geist SemiBold)
- Defaults to $720 if user leaves empty
- No validation errors — graceful handling

**Design:**
- Header: "One quick money question." (Instrument Serif italic)
- Subtext: explains how Kin uses budget
- Currency input: dollar sign + number field + "/month on groceries" suffix
- Note: "You can set budgets for other categories later."
- Button: "I'm ready →"
- Privacy note: explains partner sees totals only

**Data saved to state:**
- `groceryBudget` (number, defaults to 720)

---

### Screen 5: First Value Moment (`05-fvm.tsx`)

**What it does:**
- Generates real briefing using Claude API
- Shows briefing preview in green-bordered card
- **Defers account creation** until AFTER showing value (Apple HIG compliance)
- Requests push notification permission in-context after account creation
- Saves all data to Supabase atomically

**The Briefing Generation:**
- Takes: family name, location, schedule summary, children (with allergies), pets, budget
- Claude prompt: generates 3–5 sentence morning briefing
- Example: "Morning. Wake at 6, gym by 6:45, first meeting at 9:30. Mia needs egg-free lunch today. Pickup at 3:45. You've got $412 left this month. Chipotle?"
- Displayed in #141810 card with green (#7CB87A) left border

**Account Creation Flow:**
- Name, email, password inputs
- Password minimum 8 characters
- Google OAuth button (deferred to future sprint)
- Sign-in link for existing users
- All inputs have labels, dark backgrounds, green focus rings

**Data Persistence:**
- `signUp()` creates Supabase auth user + parent record + trial state
- `saveOnboardingData()` saves:
  - Update household with family_name
  - Insert children + allergies (CRITICAL: separate table inserts)
  - Insert pets
  - Insert budget categories (6 defaults, Groceries = user's budget)
  - Insert schedule pattern to kin_memory
  - Mark onboarding_complete = true

**Push Notifications:**
- Contextual framing: "So Kin can send you this briefing every morning"
- Requested immediately after account creation
- iOS system dialog fires only after user sees value

**Error Handling:**
- Graceful degradation: logs errors but continues
- Returns `SaveOnboardingResult` with success flag and error array
- Does not crash on individual table insert failures

---

## State Management

**Zustand store:** `onboarding-state.ts`

```typescript
interface OnboardingState {
  // Screen 1
  familyName: string
  homeLocation: string

  // Screen 2
  weekdayDescription: string
  schedulePattern: ParsedSchedulePattern | null
  scheduleParsingInProgress: boolean

  // Screen 3
  children: OnboardingChild[]
  pets: OnboardingPet[]

  // Screen 4
  groceryBudget: number

  // Screen 5
  briefingPreviewInProgress: boolean
  briefingPreview: string | null
  briefingError: string | null

  // Actions
  setFamilyName, setHomeLocation, setWeekdayDescription, setSchedulePattern,
  addChild, removeChild, addPet, removePet, setGroceryBudget,
  setBriefingPreviewInProgress, setBriefingPreview, setBriefingError,
  reset()
}
```

**Design principle:** Single source of truth across all screens. No database writes until Screen 5. Allows user to navigate back (if added in future) without losing data.

---

## Data Flow

```
User fills Screen 1 → Zustand store
   ↓
User fills Screen 2 → Parse with Claude → Zustand store
   ↓
User adds children/pets → Zustand store
   ↓
User enters budget → Zustand store
   ↓
User creates account → signUp() creates auth user
   ↓
Generate briefing with Claude → Display preview
   ↓
User approves → saveOnboardingData()
   ↓
Atomic write to Supabase:
   - household: family_name
   - parent: home_location, onboarding_complete=true
   - children: name, age, grade
   - children_allergies: allergen (SEPARATE INSERTS)
   - pets: name, species, breed, vet_name
   - budget_categories: 6 defaults (Groceries = user's budget)
   - kin_memory: schedule pattern (memory_type='fact')
   - trial_state: 7-day trial
   ↓
Request push permissions
   ↓
onComplete() callback → Navigate to Track D (Today tab)
```

---

## Design System Compliance

**All components follow Brand Guide v2:**

**Colors:**
- Background: `#0C0F0A` (dark, warm black)
- Cards: `#141810` (slightly lighter for depth)
- Primary CTA: `#7CB87A` (sage green)
- Text: `#F0EDE6` (warm white)
- Secondary text: `rgba(240, 237, 230, 0.6)` (muted warm white)
- Accents: `#D4A843` (budget/money yellow), `#E07B5A` (kids/error)

**Typography:**
- Headline: Instrument Serif italic (28–54px)
- Body: Geist Regular (13–16px)
- Bold: Geist SemiBold (labels, buttons)
- Mono: Geist Mono (system labels, timestamps)

**Spacing:**
- All spacing: multiples of 8px (8, 16, 24, 32, 48px)
- Padding in cards: 16px minimum
- Touch targets: minimum 44x44pt (Apple HIG)

**Radius:**
- Cards: 16px
- Inputs: 12px
- Buttons: 100px (full pill)

---

## Critical Implementation Notes

### Allergy Handling (Bulletproof)
- Multi-select by design (Set-based state)
- Each allergen independently checkable
- Persisted as string array per child
- Saved to separate `children_allergies` table (not children table)
- Test case: "Mia with dairy + egg" saves as `['dairy', 'egg']`

### FVM Briefing Authenticity
- Never generic (uses family name, real schedule times, child names)
- Respects all allergies (never suggests forbidden foods)
- Includes budget context ("$23 under" or "running close")
- 3–5 sentences, reads like a text from a smart friend
- Generated in real-time from user's actual data

### Account Creation Deferral
- User sees briefing BEFORE creating account
- Creates psychological anchor: "I'm buying this because I just saw it work"
- Increases conversion rate vs. asking for account upfront
- Follows Apple HIG for first-run experience

### Performance
- Loading states on API calls (Screen 2, Screen 5)
- Artificial 1.5–2 second delay on FVM generation (UX: feels earned)
- Smooth animations (fade, slide, pulse)
- No blocking reads — all data in-memory until atomic save

---

## Testing Checklist

**Allergy Flow:**
- [ ] Single allergy saves correctly
- [ ] Multiple allergies (e.g., dairy + egg) save as array
- [ ] Custom "Other" allergy saves with text
- [ ] Briefing never suggests forbidden foods

**Schedule Parsing:**
- [ ] 15-char input shows validation state
- [ ] Typical schedule parses to correct fields
- [ ] "Let me fix that" returns to input
- [ ] Summary reads naturally

**Family Members:**
- [ ] Add child with name + age
- [ ] Add child with allergies (single and multiple)
- [ ] Remove child from list
- [ ] Add pets with species
- [ ] Skip section (zero children/pets valid)

**Budget:**
- [ ] Empty input defaults to $720
- [ ] Custom budget saves correctly
- [ ] Budget categories created with user's value

**Account Creation:**
- [ ] Email validation works
- [ ] Password < 8 chars shows error
- [ ] Creates auth user, parent, household
- [ ] Trial state created (7-day expiry)
- [ ] onboarding_complete = true marked

**Data Persistence:**
- [ ] All children inserted with household_id
- [ ] Allergies inserted as separate records
- [ ] Pets inserted with household_id
- [ ] Budget categories: Groceries = user's amount
- [ ] Schedule pattern in kin_memory (memory_type='fact')

---

## Integration with Track D

Track D receives:
- `userId` — Auth user ID
- `parentId` — Parent record ID
- `householdId` — Household ID
- All child/pet/budget/schedule data pre-populated in Supabase

Track D should query:
- `parents` → parent profile (timezone, briefing_time)
- `children` + `children_allergies` → family context
- `pets` → household pets
- `budget_categories` → budget baseline
- `kin_memory` → schedule pattern (for first briefing)

See `INTEGRATION_GUIDE.md` for detailed setup.

---

## Files

```
engineering/screens/onboarding/
├── README.md                    (This file)
├── TRACK_B_STATUS.md            (Comprehensive status & assumptions)
├── INTEGRATION_GUIDE.md         (How Track D consumes onboarding data)
├── onboarding-state.ts          (Zustand store)
├── save-onboarding.ts           (Supabase persistence)
├── onboarding-navigator.tsx     (React Navigation stack)
├── 01-welcome.tsx               (Screen 1)
├── 02-schedule-intake.tsx       (Screen 2 + Claude integration)
├── 03-family.tsx                (Screen 3 + allergy UI)
├── 04-budget.tsx                (Screen 4)
└── 05-fvm.tsx                   (Screen 5 + account creation)
```

---

## Dependencies

**Track A (already built):**
- `engineering/lib/supabase.ts` — Supabase client
- `engineering/lib/auth.ts` — `signUp()`, `completeOnboarding()`
- `engineering/lib/kin-ai.ts` — `generateMorningBriefing()` (for future)
- `engineering/types/index.ts` — TypeScript interfaces

**External:**
- React Navigation (stack navigator)
- Zustand (state management)
- Reanimated (animations)
- Anthropic SDK (Claude API)
- Expo Notifications (push permissions)

---

## Environment Variables

Required in `.env.local`:
```
EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
EXPO_PUBLIC_ANTHROPIC_API_KEY=<your-anthropic-api-key>
```

---

## Summary

Track B delivers a frictionless 3-minute onboarding that:
1. Collects minimal critical data (name, location, schedule, family, budget)
2. Proves value immediately with a real morning briefing
3. Handles allergies bulletproof (multi-select, persisted, used in briefing)
4. Defers account creation until after showing value (Apple HIG best practice)
5. Saves all data atomically to Supabase
6. Hands a fully-prepared household context to Track D

The FVM briefing is the moment a skeptic becomes a believer. It's warm, specific, and demonstrably valuable in under 3 minutes from first tap.

Ready for Track D integration.
