# Kin AI Calendar Domain — File Index & Quick Navigation

**Last Updated**: 2026-04-02

---

## For Different Users

### If you're building Track D (Morning Briefing)
1. Start: `TRACK_D_INTEGRATION.md`
2. API: `calendar-context.ts` → `getTodayCalendarSummary()`
3. Code: Look at examples in `TRACK_D_INTEGRATION.md`

### If you're doing Product/Design
1. Start: `README.md`
2. UI Screens: `CalendarConnectScreen.tsx` and `FamilyCalendarScreen.tsx`
3. Colors/Brand: Each component has BRAND constants at top

### If you're engineering backend/infrastructure
1. Start: `TRACK_C1_STATUS.md`
2. Core: `google-calendar.ts`, `apple-calendar.ts`, `work-calendar.ts`
3. Webhooks: `google-webhook-handler.ts`
4. Database: See schema requirements in `README.md`

### If you're testing/QA
1. Start: `TRACK_C1_STATUS.md` → Testing Checklist
2. Components: `CalendarConnectScreen.tsx`, `FamilyCalendarScreen.tsx`
3. Conflicts: `household-calendar.ts` → `detectConflicts()`

---

## File Guide

### Core Integration Modules

| File | Purpose | Key Functions |
|------|---------|----------------|
| `google-calendar.ts` | Google Calendar API v3 | `initiateGoogleCalendarOAuth()`, `importGoogleEvents()`, `pushEventToGoogle()`, `registerGoogleWebhook()` |
| `apple-calendar.ts` | Apple iCloud CalDAV | `storeAppleCalendarConnection()`, `pollAppleCalendar()`, `pushEventToApple()`, `scheduleApplePolling()` |
| `work-calendar.ts` | Read-only work calendar | `connectWorkCalendar()`, `getWorkEventTimes()`, `hasWorkConflict()`, `getWorkDaySummary()` |
| `household-calendar.ts` | Merged household view | `getHouseholdCalendar()`, `detectConflicts()`, `resolveConflict()` |
| `calendar-context.ts` | **Track D API** | `getTodayCalendarSummary()`, `getCalendarContextForBriefing()` |
| `google-webhook-handler.ts` | Webhook handler | `handleGoogleWebhook()` (Supabase Edge Function) |

### UI Components

| File | Purpose | Key Components |
|------|---------|-----------------|
| `CalendarConnectScreen.tsx` | Onboarding + settings | Connect Google, Apple, Work calendars |
| `FamilyCalendarScreen.tsx` | Family tab view | Week view, day view, conflict alerts |

### Documentation

| File | Purpose |
|------|---------|
| `README.md` | Overview, quick start, schema |
| `TRACK_C1_STATUS.md` | Complete technical documentation |
| `TRACK_D_INTEGRATION.md` | Integration guide for morning briefing |
| `INDEX.md` | This file — navigation guide |

---

## Function Quick Reference

### For Getting Calendar Data

```typescript
// For morning briefing (Track D)
import { getTodayCalendarSummary } from './calendar-context'
const summary = await getTodayCalendarSummary(parentId)

// For detailed context
import { getCalendarContextForBriefing } from './calendar-context'
const context = await getCalendarContextForBriefing(parentId)

// For household view
import { getHouseholdCalendar } from './household-calendar'
const events = await getHouseholdCalendar(householdId, startDate, endDate)

// For conflicts
import { detectConflicts } from './household-calendar'
const conflicts = await detectConflicts(householdId, dateStr)
```

### For Connecting Calendars

```typescript
// Google personal calendar
import { initiateGoogleCalendarOAuth } from './google-calendar'
const result = await initiateGoogleCalendarOAuth(parentId, false)

// Google work calendar
import { connectWorkCalendar } from './work-calendar'
const result = await connectWorkCalendar(parentId)

// Apple calendar
import { storeAppleCalendarConnection } from './apple-calendar'
const result = await storeAppleCalendarConnection(parentId, email, password)
```

### For Syncing

```typescript
// Google sync
import { syncFromGoogle } from './google-calendar'
await syncFromGoogle(connectionId)

// Apple sync
import { pollAppleCalendar } from './apple-calendar'
await pollAppleCalendar(connectionId)
```

---

## Architecture Map

```
┌─ UI Layer
│  ├─ CalendarConnectScreen.tsx (onboarding)
│  └─ FamilyCalendarScreen.tsx (family view)
│
├─ Data Layer
│  ├─ google-calendar.ts (OAuth + sync)
│  ├─ apple-calendar.ts (CalDAV + polling)
│  ├─ work-calendar.ts (privacy filters)
│  ├─ household-calendar.ts (merge + conflicts)
│  └─ google-webhook-handler.ts (real-time)
│
├─ API Layer (for Track D)
│  └─ calendar-context.ts (getTodayCalendarSummary)
│
└─ Database
   ├─ calendar_connections (OAuth tokens)
   └─ calendar_events (all events)
```

---

## Key Concepts

### Privacy Model
- Work event titles: Hidden from partner (shows as "Busy")
- Private personal events: Not in household view
- Kids' activities: Always visible to both parents

### Sync Strategy
- **Google**: Real-time via webhooks (expires every 7 days)
- **Apple**: Polling every 15 minutes (no webhook API)

### Conflict Detection
1. Both parents unavailable at same time
2. Parent busy during kid's activity time
3. General schedule overlaps

### Color Coding
- Parent 1: `#7CB87A` (green)
- Parent 2: `#A07EC8` (purple)
- Kids: `#E07B5A` (orange)

---

## Common Tasks

### Add new sync source (e.g., Outlook)
1. Create `outlook-calendar.ts` (copy structure from `google-calendar.ts`)
2. Add to `calendar_connections` table provider enum
3. Update `household-calendar.ts` merge logic
4. Add connection card to `CalendarConnectScreen.tsx`

### Modify conflict detection
1. Edit `household-calendar.ts` → `detectConflicts()`
2. Add new conflict type to ConflictAlert interface
3. Update conflict alert display in `FamilyCalendarScreen.tsx`

### Change privacy rules
1. Edit `work-calendar.ts` → `getPartnerVisibleEvents()`
2. Update title/location filtering logic
3. Test with sample household

### Adjust briefing format
1. Edit `calendar-context.ts` → `getTodayCalendarSummary()`
2. Change string formatting
3. Update examples in `TRACK_D_INTEGRATION.md`

---

## Dependencies

### Required Database Tables
- `calendar_connections` — OAuth tokens
- `calendar_events` — All calendar events
- `parents` — Parent profiles
- `households` — Family groupings
- `children_activities` — Kids' activities

### Required Environment Variables
- `EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Required Libraries
- `@supabase/supabase-js` (client)
- React Native (for UI)
- TypeScript (for types)

### Optional Libraries
- `xml2js` (better CalDAV parsing)
- `ical.js` (better .ics parsing)
- `date-fns` (date utilities)

---

## Testing Checklist

See `TRACK_C1_STATUS.md` for detailed testing checklist.

Quick checks:
- [ ] Google OAuth connects (personal + work)
- [ ] Apple CalDAV connects
- [ ] Events import correctly
- [ ] Webhooks trigger sync
- [ ] Apple polling runs every 15 min
- [ ] Conflicts detect correctly
- [ ] Work titles hidden in partner view
- [ ] Morning briefing text generates
- [ ] UI matches Brand Guide v2
- [ ] All touch targets 44x44+

---

## FAQ

**Q: Where do I add a new event source?**
A: Create a new module like `google-calendar.ts`, implement sync functions, add provider to schema.

**Q: How do I test the webhook?**
A: Use `google-webhook-handler.ts` as reference, test locally via ngrok or cloud endpoint.

**Q: Why are work titles hidden?**
A: Privacy—partner shouldn't see work meeting details, but should see when you're busy.

**Q: Can I create events from the UI?**
A: Not yet—FAB is placeholder. Implement in Track C2.

**Q: How do conflicts get resolved?**
A: `resolveConflict()` in `household-calendar.ts` has placeholder. Implement resolution logic in Track C2.

**Q: Where does the morning briefing call the calendar?**
A: `getTodayCalendarSummary()` in `calendar-context.ts` — see `TRACK_D_INTEGRATION.md`

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-04-02 | 1.0 | Initial release of Track C1 |

---

**Last Updated**: 2026-04-02
**Status**: Complete ✅
**Maintainer**: Lead Engineer (Track C1)
