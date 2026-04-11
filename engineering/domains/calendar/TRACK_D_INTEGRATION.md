# Track D Integration Guide — Calendar Context for Morning Briefing

**For**: Lead Engineer (Track D — Morning Briefing Engine)
**Status**: Ready for integration
**Date**: 2026-04-02

---

## Quick Start

Track C1 provides a single entry point for your morning briefing engine:

```typescript
// In engineering/supabase/functions/morning-briefing/index.ts

import { getTodayCalendarSummary } from '../../../domains/calendar/calendar-context'

export async function generateMorningBriefing(parentId: string): Promise<string> {
  // Get calendar context
  const calendarContext = await getTodayCalendarSummary(parentId)

  // Build your briefing prompt
  const prompt = `
You are Kin, the AI that knows your entire life.

${calendarContext}

[Rest of briefing prompt with other domains...]
  `

  // Pass to Claude and return
  const briefing = await callClaude(prompt)
  return briefing
}
```

---

## What You Get

### 1. Simple Text Summary
```typescript
const summary = await getTodayCalendarSummary(parentId)
// Returns: "Your 9:30 team sync is in 3 hours. You have 3 meetings today..."
```

Ready to inject directly into Claude's prompt. No parsing needed.

### 2. Structured Context (Optional)
```typescript
const context = await getCalendarContextForBriefing(parentId)

// Returns:
{
  todaySummary: "...",
  upcomingEvents: [
    { title: "Team sync", time: "9:30 AM", location?: string, type: "work" | "personal" | "shared" | "kids" }
  ],
  conflicts: [
    { type: "both_unavailable" | "pickup_conflict" | "schedule_overlap", description: "..." }
  ],
  workDayIntensity: "light" | "moderate" | "heavy",
  hasEarlyStart: boolean,
  hasLateEnd: boolean
}
```

Use if you need to build custom briefing logic (e.g., "if workDayIntensity is heavy, mention early start").

---

## Data Included

### Personal Events
- All non-work events for the parent
- Title, time, location
- Shared and private events (filtered by privacy)

### Work Meetings
- Count of meetings today
- First meeting time
- Back-to-back detection
- **Titles NOT included** (work privacy)

### Partner Schedule
- Visible events (shared events only)
- **Work titles NOT shown to partner** (privacy)
- Next event summary

### Kids' Activities
- Activity name, time, location
- Which child has the activity
- Example: "Emma's soccer at 4:30pm"

### Conflict Alerts
- Both parents scheduled at same time
- Parent busy during kid's pickup time
- Suggested resolutions

### Work Day Profile
- Morning intensity (light/moderate/heavy)
- Early start (before 7am)?
- Late end (after 6pm)?

---

## Briefing Examples

### Light Work Day
```
"You have no meetings today. You're free to focus on personal projects.
Sarah has a 3pm doctor appointment.
Kids' soccer is at 4:30pm."
```

### Heavy Work Day with Conflict
```
"You have 5 meetings today (back-to-back) starting at 9:00am.
⚠️ You're booked during Emma's 4:30pm soccer pickup.
Sarah can handle pickup, but confirm with her.
She has a 6pm that might run late."
```

### Partner Late Night
```
"Your 9:30 team sync is in 3 hours.
Sarah's 6pm runs late — you'll need to handle dinner and bedtime.
Kids have no activities today."
```

---

## Privacy Guarantees

Track C1 **never shows**:
- Work event titles to the partner
- Personal private events in household view
- Sensitive details from work calendar

Only times, availability, and non-sensitive details are shared.

---

## Sync Status

The calendar is **real-time updated**:
- **Google Calendar**: Via webhooks (immediate)
- **Apple Calendar**: Via polling (15-minute delay, max)

So the briefing always reflects the latest schedule.

---

## Implementation Notes

1. **Call timing**: Run morning briefing at parent's `briefing_time` (stored in parents table)
2. **Timezone handling**: All events stored as UTC, formatted in parent's timezone
3. **Error handling**: If calendar sync fails, `getTodayCalendarSummary()` returns empty string (graceful degradation)
4. **Parent lookup**: Use `getCurrentParent()` or `parentId` from auth session

---

## Example Implementation

```typescript
// Full morning briefing function using Track C1

import { getCurrentParent } from '../../../lib/auth'
import { getTodayCalendarSummary } from '../../../domains/calendar/calendar-context'
import { getFamilyContext } from '../../../domains/family/family-context'
import { getMealPlanToday } from '../../../domains/meals/meals-context'
import { getTodosForToday } from '../../../domains/tasks/tasks-context'

export async function generateMorningBriefing(): Promise<string> {
  // Get current parent (from JWT)
  const parent = await getCurrentParent()
  if (!parent) throw new Error('Not authenticated')

  // Gather context from all domains in parallel
  const [calendar, family, meals, todos] = await Promise.all([
    getTodayCalendarSummary(parent.id),
    getFamilyContext(parent.household_id),
    getMealPlanToday(parent.household_id),
    getTodosForToday(parent.household_id),
  ])

  // Build briefing prompt
  const briefingPrompt = `
You are Kin, the AI that knows the Ford family's entire life.

It's ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.

SCHEDULE FOR TODAY:
${calendar}

FAMILY CONTEXT:
${family}

MEAL PLAN:
${meals}

TODOS:
${todos}

Generate a brief, conversational morning briefing that:
1. Starts with their most pressing time constraint (meeting in X hours)
2. Calls out any conflicts that need attention
3. Gives them confidence they're prepared
4. Touches on family/meal/todo context if relevant
5. Ends with an encouraging emoji

Keep it to 3-4 sentences. Sound like a smart assistant who knows their life.
  `

  // Call Claude API
  const response = await fetch('https://api.anthropic.com/messages/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: briefingPrompt,
        },
      ],
    }),
  })

  const result = await response.json()
  const briefing = result.content[0].text

  return briefing
}
```

---

## Testing the Integration

```typescript
// Quick test
import { getTodayCalendarSummary } from '../domains/calendar/calendar-context'

const parentId = 'test-parent-id'
const summary = await getTodayCalendarSummary(parentId)

console.log('Calendar Summary:', summary)
// Should print something like:
// "Your 9:30 team sync is in 3 hours. You have 1 meeting today starting at 9:00am..."
```

---

## Troubleshooting

**Empty calendar summary returned?**
- Check that calendars are connected (calendar_connections table has entries)
- Check that events are synced (calendar_events table has events for today)
- Check parent's timezone setting (used for time formatting)

**Work titles showing to partner?**
- This shouldn't happen — privacy filters are in calendar-context.ts
- Verify work events have `is_work_event = true` in database

**Conflicts not detected?**
- Run `detectConflicts()` manually after calendar sync
- Check that kids' activities are in `children_activities` table
- Verify time ranges overlap correctly

---

## What's Next After C1

Once morning briefing is working with calendar context, consider:

1. **Track E** — Task/todo domain (for "TODOS" section)
2. **Track F** — Meal planning domain (for "MEAL PLAN" section)
3. **Track G** — Family insights (for "FAMILY CONTEXT" section)
4. **Smart notifications** — Alert parents of upcoming pickup/conflicts
5. **Commute optimization** — Suggest leave time based on first meeting location

Track C1 is the foundation that makes all of that possible.

---

## Questions?

See `TRACK_C1_STATUS.md` for full Track C1 documentation.

Contact: Lead Engineer (Track C1)
