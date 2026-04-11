# Track B to Track D Integration Guide

**For:** Track D (Today tab) lead engineer
**Purpose:** How to integrate onboarding flow and receive prepared household context

---

## Quick Start

### 1. Import the Onboarding Navigator

In your app's root navigator or auth flow:

```typescript
// App.tsx or RootNavigator.tsx
import { OnboardingNavigator } from './engineering/screens/onboarding/onboarding-navigator'
import { useAuthStore } from './lib/auth-store'

export function RootNavigator() {
  const userId = useAuthStore((s) => s.userId)
  const parentId = useAuthStore((s) => s.parentId)

  if (!userId) {
    // Show onboarding if not authenticated
    return (
      <OnboardingNavigator
        onComplete={(userId, parentId, householdId) => {
          // User completed onboarding
          // Save to your auth store
          useAuthStore.setState({ userId, parentId, householdId })
          // Navigate to Today tab (Track D)
          // Your app's main navigation will automatically show Today tab
        }}
        onError={(error) => {
          // Handle onboarding error
          console.error('Onboarding failed:', error)
          // Show error alert and let user retry
        }}
      />
    )
  }

  // Show Today tab (Track D) once authenticated
  return <TodayNavigator parentId={parentId} householdId={householdId} />
}
```

---

## What Data Is Available After Onboarding

When `onComplete` is called, the following data is guaranteed to exist in Supabase:

### Household
```typescript
{
  id: string           // householdId
  family_name: string  // e.g. "Ford"
  created_at: string
}
```

### Parent (Current User)
```typescript
{
  id: string                    // parentId
  household_id: string
  user_id: string
  name: string                  // Full name
  email: string
  is_partner_1: true           // First parent to onboard
  home_location: string         // e.g. "Columbus, OH"
  timezone: string              // e.g. "America/New_York"
  briefing_time: string         // e.g. "06:00:00"
  onboarding_complete: true
  created_at: string
}
```

### Children (Zero or More)
```typescript
{
  id: string
  household_id: string
  name: string
  age: number
  grade: string | null          // e.g. "3rd"
  school_name: null             // User didn't enter during onboarding
  school_location: null         // Add in settings later
  created_at: string
}
```

### Children Allergies (Linked to Children)
```typescript
{
  id: string
  child_id: string              // Links to child above
  household_id: string
  allergen: string              // e.g. "dairy", "egg"
  severity: 'avoid'             // Always 'avoid' from onboarding
  notes: null
  created_at: string
}
```

**Example query to get all children with allergies:**
```typescript
// Get all children for household
const { data: children } = await supabase
  .from('children')
  .select('*')
  .eq('household_id', householdId)

// Get all allergies for household
const { data: allergies } = await supabase
  .from('children_allergies')
  .select('*')
  .eq('household_id', householdId)

// Build child-allergy map
const childAllergiesMap = allergies.reduce((acc, allergy) => {
  if (!acc[allergy.child_id]) {
    acc[allergy.child_id] = []
  }
  acc[allergy.child_id].push(allergy.allergen)
  return acc
}, {} as Record<string, string[]>)
```

### Pets (Zero or More)
```typescript
{
  id: string
  household_id: string
  name: string
  species: string              // "dog", "cat", "other"
  breed: string | null         // e.g. "Golden Retriever"
  age_years: null              // User didn't enter during onboarding
  vet_name: string | null      // If user filled it in
  vet_phone: null              // Add in settings later
  vet_location: null           // Add in settings later
  created_at: string
}
```

### Budget Categories
```typescript
{
  id: string
  household_id: string
  name: string                 // e.g. "Groceries", "Dining Out", etc.
  monthly_limit: number        // User's grocery budget for Groceries category
  color: string | null         // e.g. "#D4A843" (budget yellow)
  created_at: string
}
```

**Important:** "Groceries" category's `monthly_limit` is set to the value user entered on Screen 4.

### Schedule Pattern (KIN_MEMORY)
```typescript
{
  id: string
  parent_id: string
  household_id: string
  memory_type: 'fact'
  content: {
    type: 'schedule_pattern'
    data: {
      wake_time: string | null           // e.g. "06:00"
      gym_morning: boolean
      gym_time: string | null
      work_start_time: string | null
      first_meeting_time: string | null
      lunch_break: boolean
      school_pickup_time: string | null
      kids_activities_mentioned: string[]
      typical_dinner_time: string | null
      bedtime_routine_time: string | null
      other_patterns: string[]
      summary: string  // "Early riser — gym at 6, work by 9, pickup at 3:45..."
    }
  }
  created_at: string
  updated_at: string
}
```

### Trial State
```typescript
{
  id: string
  parent_id: string
  trial_started_at: string     // ISO timestamp
  trial_ends_at: string        // 7 days from start
  is_subscribed: false
  revenuecat_customer_id: null
  subscription_plan: null
  subscribed_at: null
  created_at: string
}
```

---

## Recommended Queries for Track D

### Get Parent Profile
```typescript
async function getParentProfile(parentId: string) {
  const { data, error } = await supabase
    .from('parents')
    .select('*')
    .eq('id', parentId)
    .single()

  return data
}
```

### Get Household Context (for briefing)
```typescript
async function getHouseholdContext(householdId: string) {
  // Get household
  const { data: household } = await supabase
    .from('households')
    .select('*')
    .eq('id', householdId)
    .single()

  // Get all children
  const { data: children } = await supabase
    .from('children')
    .select('*')
    .eq('household_id', householdId)

  // Get all allergies
  const { data: allergies } = await supabase
    .from('children_allergies')
    .select('*')
    .eq('household_id', householdId)

  // Get all pets
  const { data: pets } = await supabase
    .from('pets')
    .select('*')
    .eq('household_id', householdId)

  // Get budget categories
  const { data: budgets } = await supabase
    .from('budget_categories')
    .select('*')
    .eq('household_id', householdId)

  // Get schedule pattern
  const { data: scheduleMemory } = await supabase
    .from('kin_memory')
    .select('content')
    .eq('household_id', householdId)
    .eq('memory_type', 'fact')
    .then(r => r.data?.find(m => m.content?.type === 'schedule_pattern'))

  return {
    household,
    children,
    allergies,
    pets,
    budgets,
    schedulePattern: scheduleMemory?.content?.data,
  }
}
```

---

## Critical Details

### Allergy Safety
When Track D generates any meals, recipes, or food suggestions:
- ALWAYS check the allergy list for each child
- NEVER suggest foods containing: dairy, eggs, nuts, gluten, soy, or custom allergens
- This is non-negotiable for liability and UX reasons

### Timezone Handling
Parent's timezone is stored in `parents.timezone`. Use it for:
- Converting briefing time to local time
- Scheduling push notifications
- Calculating "days since" metrics

### Briefing Time
Parent's `briefing_time` (e.g., "06:00:00") is when their morning briefing should be sent.
- Partner 1 defaults to 06:00
- Partner 2 defaults to 06:30
- Users can change in settings

### Trial Window
Check `trial_state.trial_ends_at` to show trial countdown in UI and enforce paywall after 7 days.

### Push Token Registration
After user allows push permissions (requested in Screen 5), Track D should register the device token:
```typescript
// In your push notification setup
import * as Notifications from 'expo-notifications'
import { supabase } from '../../lib/supabase'

async function registerPushToken(parentId: string) {
  const token = (await Notifications.getExpoPushTokenAsync()).data

  const { error } = await supabase.from('push_tokens').insert([
    {
      parent_id: parentId,
      expo_push_token: token,
      device_id: getDeviceId(),
    },
  ])

  if (error) {
    console.warn('Failed to register push token:', error)
  }
}
```

---

## Example: Displaying Today's Briefing in Track D

```typescript
import { generateMorningBriefing } from '../../lib/kin-ai'

export function TodayTab({ parentId }: { parentId: string }) {
  const [briefing, setBriefing] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadBriefing = async () => {
      setLoading(true)
      try {
        const text = await generateMorningBriefing(parentId)
        setBriefing(text)
      } catch (error) {
        console.error('Failed to load briefing:', error)
      } finally {
        setLoading(false)
      }
    }

    loadBriefing()
  }, [parentId])

  if (loading) {
    return <LoadingState />
  }

  if (!briefing) {
    return <ErrorState />
  }

  return (
    <View style={styles.briefingCard}>
      <Text style={styles.briefingText}>{briefing}</Text>
    </View>
  )
}
```

---

## Troubleshooting

### "Parent record not found"
- Check that `completeOnboarding(parentId)` was called in `save-onboarding.ts`
- Verify `onboarding_complete = true` on parent record in Supabase

### "Children query returns empty"
- Check that children were added on Screen 3 before continuing
- Verify `household_id` matches the parent's household

### "Allergies not showing up"
- Confirm allergies were selected on Screen 3 (multi-select)
- Check `children_allergies` table, not `children` table
- Filter by `household_id`, not just `child_id`

### "Schedule pattern is null"
- Check `kin_memory` table for records with `memory_type = 'fact'`
- Look for `content.type = 'schedule_pattern'`
- If missing, user may have skipped Screen 2 (unlikely but possible)

---

## File References

**Onboarding state management:**
- `engineering/screens/onboarding/onboarding-state.ts`

**Data persistence:**
- `engineering/screens/onboarding/save-onboarding.ts`

**UI components:**
- `engineering/screens/onboarding/01-welcome.tsx`
- `engineering/screens/onboarding/02-schedule-intake.tsx`
- `engineering/screens/onboarding/03-family.tsx`
- `engineering/screens/onboarding/04-budget.tsx`
- `engineering/screens/onboarding/05-fvm.tsx`

**Navigation:**
- `engineering/screens/onboarding/onboarding-navigator.tsx`

**Track A dependencies:**
- `engineering/lib/auth.ts` — `signUp()`, `completeOnboarding()`
- `engineering/lib/kin-ai.ts` — `generateMorningBriefing()`
- `engineering/lib/supabase.ts` — Supabase client

---

## Next Steps

1. Import `OnboardingNavigator` in your app's root
2. Connect `onComplete` callback to your auth store
3. Query household context from Supabase using examples above
4. Render briefing and family data in Today tab
5. Test allergy flows end-to-end with Track A's meal generation

That's it. The data is ready.
