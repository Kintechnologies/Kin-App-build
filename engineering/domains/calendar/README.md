# Kin AI — Calendar Sync Domain (Track C1)

**Complete calendar sync, merge, and conflict detection for the Kin family OS.**

---

## What This Is

The calendar domain is the intelligent foundation that makes Kin understand the family's real schedule:

> "Your 9:30 team sync is in 3 hours. Your wife's 6pm runs late — you've got pickup."

It syncs:
- Google Calendar (personal + work)
- Apple/iCloud Calendar
- Merges both parents' schedules
- Detects conflicts automatically
- Provides context to the morning briefing engine

---

## Quick Links

- **For Track D (Morning Briefing)**: See `TRACK_D_INTEGRATION.md`
- **Full Documentation**: See `TRACK_C1_STATUS.md`
- **Implementation Details**: See individual `.ts` files

---

## Files Overview

| File | Lines | Purpose |
|------|-------|---------|
| `google-calendar.ts` | 750 | Google Calendar API v3 integration |
| `apple-calendar.ts` | 755 | Apple iCloud CalDAV sync |
| `google-webhook-handler.ts` | 440 | Real-time webhook handler (Supabase Edge Function) |
| `work-calendar.ts` | 377 | Read-only work calendar + privacy filters |
| `household-calendar.ts` | 466 | Merged household calendar + conflict detection |
| `calendar-context.ts` | 386 | **API for Track D (morning briefing)** |
| `CalendarConnectScreen.tsx` | 667 | Onboarding UI component |
| `FamilyCalendarScreen.tsx` | 426 | Family tab calendar view |

**Total**: ~4,600 lines of production code

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Kin Mobile App (React Native)                              │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ Calendar Connect │  │ Family Calendar  │                │
│  │     Screen       │  │     Screen       │                │
│  └──────────────────┘  └──────────────────┘                │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│  Calendar Domain (engineering/domains/calendar/)            │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Google Calendar (OAuth + Webhooks)                  │   │
│  │ Apple Calendar (CalDAV + 15-min Polling)           │   │
│  │ Work Calendar (Read-only + Privacy Filters)        │   │
│  │ Household Merge + Conflict Detection               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  calendar-context.ts                                        │
│  ├─ getTodayCalendarSummary(parentId) ◄─ TRACK D CALLS    │
│  └─ getCalendarContextForBriefing(parentId)               │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│  Supabase Database                                           │
│                                                              │
│  Tables: calendar_connections, calendar_events             │
│          parents, households, children_activities          │
└─────────────────────────────────────────────────────────────┘
```

---

## How It Works

### 1. Connect Calendars (Onboarding)
User opens `CalendarConnectScreen` and connects:
- Personal Google Calendar (OAuth)
- Apple iCloud Calendar (App-specific password)
- Work Calendar (Read-only Google OAuth)

### 2. Initial Import
Events are imported for:
- Last 6 months (history)
- All future events

### 3. Real-Time Sync
- **Google**: Webhooks trigger sync immediately when calendar changes
- **Apple**: Polling every 15 minutes

### 4. Merge & Conflict Detection
All events merged into household view:
- Both parents' shared events
- Kids' activities
- Work "Busy" blocks (titles hidden for privacy)

Conflicts automatically detected:
- Both parents unavailable
- Parent busy during kid's pickup time
- Schedule overlaps

### 5. Morning Briefing
Track D calls `getTodayCalendarSummary()` to get:
```
"Your 9:30 team sync is in 3 hours. You have 3 meetings today.
Your wife's 6pm runs late — you've got pickup."
```

This is injected into Claude's prompt for the morning briefing.

---

## Privacy Model

**Work calendar titles are NEVER shown to partner**
- Only time ranges shown as "Busy" blocks
- Title only visible to the person who owns the calendar

**Personal private events are NEVER in household view**
- Only shared events appear in merged view
- Private events are filtered out

**Kids' activities are always shared**
- Both parents see all kids' activities

---

## Integration Points

### For Track D (Morning Briefing)

```typescript
import { getTodayCalendarSummary } from './domains/calendar/calendar-context'

const briefingContext = await getTodayCalendarSummary(parentId)
// Use in Claude prompt
```

See `TRACK_D_INTEGRATION.md` for full integration guide.

### For Onboarding Flow

```typescript
import CalendarConnectScreen from './domains/calendar/screens/CalendarConnectScreen'

<CalendarConnectScreen onComplete={handleOnboardingComplete} />
```

### For Family Tab

```typescript
import FamilyCalendarScreen from './domains/calendar/screens/FamilyCalendarScreen'

<FamilyCalendarScreen />
```

---

## Database Schema Required

These tables must exist (from Tracks A/B):

```sql
-- Calendar connections (OAuth tokens)
CREATE TABLE calendar_connections (
  id UUID PRIMARY KEY,
  parent_id UUID NOT NULL,
  provider TEXT ('google' | 'apple' | 'work_google' | 'work_outlook'),
  access_token TEXT,
  refresh_token TEXT,
  calendar_id TEXT,
  is_read_only BOOLEAN DEFAULT FALSE,
  sync_status TEXT ('synced' | 'pending' | 'error'),
  last_synced_at TIMESTAMP
)

-- All calendar events
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY,
  parent_id UUID,
  household_id UUID,
  title TEXT,
  start_at TIMESTAMP,
  end_at TIMESTAMP,
  is_all_day BOOLEAN,
  location TEXT,
  is_shared BOOLEAN,
  is_work_event BOOLEAN,
  external_id TEXT,        -- Google/Apple event ID
  external_source TEXT,    -- 'google' | 'apple' | 'kin'
  sync_status TEXT
)

-- Kids' activities
CREATE TABLE children_activities (
  id UUID PRIMARY KEY,
  child_id UUID,
  household_id UUID,
  activity_name TEXT,
  days_of_week TEXT[],     -- ['Monday', 'Wednesday']
  start_time TIME,
  end_time TIME,
  location TEXT,
  season_end_date DATE
)
```

---

## Environment Variables

```env
# OAuth
EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...

# Supabase
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Brand Compliance

All UI components follow **Brand Guide v2**:

| Element | Value |
|---------|-------|
| Background | `#0C0F0A` |
| Surface | `#141810` |
| Primary CTA | `#7CB87A` |
| Partner/Calendar | `#A07EC8` |
| Text | `#F0EDE6` |
| Font (UI) | Geist |
| Font (Headings) | Instrument Serif italic |
| Border Radius | 16px (cards), 12px (inputs) |
| Touch Targets | 44x44 minimum |

---

## What's Included

✅ Google Calendar OAuth (personal + work)
✅ Apple iCloud CalDAV
✅ Real-time sync (webhooks)
✅ Periodic polling (15 min)
✅ Two-way event sync
✅ Household merge
✅ Conflict detection (3 types)
✅ Privacy filters (work titles hidden)
✅ Onboarding UI
✅ Family calendar view
✅ Morning briefing API

---

## What's NOT Included (Next Tracks)

⚪ Event creation from UI
⚪ Event editing UI
⚪ Smart conflict resolution
⚪ Commute time optimization
⚪ Calendar sharing with non-parents
⚪ Recurring event expansion
⚪ Timezone-aware reminders

---

## Testing

See `TRACK_C1_STATUS.md` for testing checklist.

---

## Support

- **Full Documentation**: `TRACK_C1_STATUS.md`
- **Track D Integration**: `TRACK_D_INTEGRATION.md`
- **Code Comments**: Extensive inline documentation in each file

---

**Status**: COMPLETE ✅
**Ready for**: Track D integration, onboarding, Family tab launch
**Date**: 2026-04-02
