# Kin AI Morning Briefing System

## Overview

The morning briefing is Kin's most important feature — a personalized daily push notification synthesizing all family data into one warm, actionable message delivered at 6am.

**Example briefing:**
> "Morning. Leave for the gym by 5:55 — 315 is backed up, take 670. Your 9:30 team sync is in 3 hours. Your wife's 6pm runs late — you've got pickup. Practice ends at 7, bedtime is 8:30. You're $23 under grocery budget. Chipotle?"

## Architecture

### Mobile App (`apps/mobile/lib/`)

#### `kin-ai.ts`
TypeScript module for the mobile app that provides three main functions:

- **`assembleFamilyContext(profileId)`** - Queries Supabase for all family data and builds a rich context block for Claude
  - Includes profile, schedule, calendar, children (with allergies), pets, budget, meal plans, and fitness data
  - **CRITICAL**: Always includes allergy context - non-negotiable safety requirement
  - Respects privacy: fitness data only for the requesting parent

- **`kinChat(profileId, message, threadId?)`** - Sends messages to Claude with full family context in system prompt
  - Uses claude-sonnet-4-20250514 via the web API
  - Maintains conversation history and privacy boundaries

- **`generateMorningBriefing(profileId)`** - Generates the daily morning briefing
  - Calls `/api/morning-briefing` endpoint
  - Returns personalized briefing text

#### `push-notifications.ts`
React Native / Expo push notification setup:

- **`registerForPushNotifications()`** - Gets Expo push token and saves to `push_tokens` table
  - Handles permissions requests
  - Saves token via `/api/push-tokens` API route

- **`setupNotificationHandlers()`** - Sets up foreground and background handlers
  - Routes notifications based on type (morning_briefing, medication_reminder, etc.)
  - Navigates to appropriate screens when user taps notification

### Web API Routes (`apps/web/src/app/api/`)

#### `/morning-briefing` route
Generates and stores daily briefings.

**GET** - Returns today's briefing (or generates if not exists)
- Queries calendar events, schedule, children's activities, budget status, pet care
- Uses Claude to generate warm, conversational briefing
- Stores result in `morning_briefings` table
- Returns: `{ content, deliveryStatus }`

**POST** - Forces regeneration of today's briefing
- Deletes existing briefing
- Generates new one
- Useful for user-triggered regeneration

Logic:
1. Query all relevant family data for today
2. Build context block with specific numbers (budget totals, event times, etc.)
3. Pass to Claude with system prompt emphasizing warmth, specificity, and directness
4. Claude generates 30-60 second briefing
5. Store in database with delivery status
6. Return to client

#### `/push-tokens` route
Manages push notification registration.

**POST** - Saves a push token
- Request: `{ token, platform ("ios"|"android"|"web"), device_name? }`
- Upserts to `push_tokens` table
- Returns: `{ success, token_id }`

**GET** - Returns all active push tokens for user
- Returns: `{ tokens: [...] }`

**DELETE** - Deactivates a push token (soft delete)
- Request: `{ token }`
- Sets `active = false`
- Returns: `{ success }`

### Supabase Edge Function (`supabase/functions/morning-briefing/`)

Deno/TypeScript edge function that runs daily to generate and send morning briefings.

**Trigger**: Scheduled job at 6am UTC (deployable per-timezone)

**Process**:
1. Query all profiles with `onboarding_completed = true`
2. For each profile:
   - Check if briefing already sent today (deduplication)
   - Generate briefing via Claude API
   - Fetch user's active push tokens
   - Send via Expo Push API if tokens exist
   - Store in `morning_briefings` table with delivery status
   - Handle errors gracefully (one failure doesn't stop others)

**Environment Variables**:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for admin access)
- `ANTHROPIC_API_KEY` - Anthropic API key
- `EXPO_ACCESS_TOKEN` - Expo push service access token (optional)

**Response**:
```json
{
  "processed": 42,
  "succeeded": 40,
  "failed": 2,
  "errors": ["Error processing profile-id: ..."]
}
```

## Database Schema

### `push_tokens`
```sql
id UUID PRIMARY KEY
profile_id UUID REFERENCES profiles(id)
token TEXT NOT NULL
platform TEXT ('ios' | 'android' | 'web')
device_name TEXT
active BOOLEAN DEFAULT true
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
UNIQUE(profile_id, token)
```

### `morning_briefings`
```sql
id UUID PRIMARY KEY
profile_id UUID REFERENCES profiles(id)
briefing_date DATE DEFAULT CURRENT_DATE
content TEXT NOT NULL
delivery_status TEXT ('generated' | 'sent' | 'failed')
sent_at TIMESTAMPTZ
created_at TIMESTAMPTZ
UNIQUE(profile_id, briefing_date)
```

### `parent_schedules` (already created)
```sql
id UUID PRIMARY KEY
profile_id UUID REFERENCES profiles(id)
raw_description TEXT
structured_data JSONB
home_location TEXT
work_location TEXT
commute_mode TEXT ('drive' | 'transit' | 'walk' | 'bike' | 'remote')
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
UNIQUE(profile_id)
```

Other referenced tables (all created in migrations 013-018):
- `children_details`, `children_allergies`, `children_activities`
- `pet_details`, `pet_medications`, `pet_vaccinations`
- `fitness_profiles`, `workout_sessions`
- `budget_categories`, `budget_summary_view`
- `calendar_events` (existing)

## Kin Voice Rules (Applied in Claude System Prompt)

The briefing generator enforces these rules:

1. **No hedging** - Never use "I think", "perhaps", "you might want to"
2. **Always specific** - "$23 under budget" not "under budget"; "5:55 AM" not "early morning"
3. **One question max** - At the very end, as a warm suggestion (not interrogation)
4. **No corporate language** - No "leverage", "optimize", "synergize"
5. **Warm but direct** - Sound like a smart friend who knows the family
6. **Short by default** - Readable in 30-60 seconds (roughly 4-6 sentences)
7. **Open with "Morning"** - Then immediately the most important thing
8. **No bullet points** - Prose format, conversational

## Privacy & Safety

### Allergy Context
- **CRITICAL**: Allergy information is ALWAYS included in briefings
- This is a non-negotiable safety requirement
- Never omitted even if data is sparse

### Fitness Data
- Strictly private per parent (never shared with household partner)
- Only included when generating briefing for that parent
- Excluded from all shared family contexts

### Budget Data
- Individual spending details are private
- Briefing shows only category totals and limits
- Never shares one parent's line items with the other

### Calendar & Schedule
- Personal (non-shared) calendar events are private
- Only shared household events visible to both parents
- Kids' events always visible to both parents

## Integration with Mobile App

### Setup (in app initialization):
```typescript
import { registerForPushNotifications, setupNotificationHandlers } from './lib/push-notifications'

// On app launch:
const token = await registerForPushNotifications()
setupNotificationHandlers()
```

### Getting Today's Briefing:
```typescript
import { generateMorningBriefing } from './lib/kin-ai'

const briefing = await generateMorningBriefing(profileId)
// Display to user
```

### Chat with Family Context:
```typescript
import { kinChat } from './lib/kin-ai'

const response = await kinChat(profileId, "What should we make for dinner?")
```

## Deployment Checklist

- [ ] All migration files (013-018) applied to Supabase
- [ ] Environment variables set in Supabase Edge Function:
  - `ANTHROPIC_API_KEY`
  - `EXPO_ACCESS_TOKEN` (if using Expo for push)
- [ ] Scheduled job created in Supabase (6am UTC, or per-timezone)
- [ ] Mobile app updated with `kin-ai.ts` and `push-notifications.ts`
- [ ] Mobile app initialized push notifications on startup
- [ ] Web API routes deployed
- [ ] Test end-to-end:
  1. Register for push from mobile app
  2. Call GET `/api/morning-briefing` manually
  3. Verify briefing generated and stored
  4. Test POST to regenerate
  5. Verify token saved in `push_tokens`

## Testing

### Manual briefing generation:
```bash
curl -X GET https://your-domain.com/api/morning-briefing \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Force regeneration:
```bash
curl -X POST https://your-domain.com/api/morning-briefing \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Register push token:
```bash
curl -X POST https://your-domain.com/api/push-tokens \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"token":"EXPO_TOKEN","platform":"ios","device_name":"iPhone 14"}'
```

### Test Edge Function locally:
```bash
supabase functions serve
# Then invoke via POST http://localhost:54321/functions/v1/morning-briefing
```

## Future Enhancements

1. **Per-timezone scheduling** - 6am in user's local timezone, not UTC
2. **AI-driven meal suggestions** - Surface "Chipotle?" if budget allows
3. **Weather integration** - "Take an umbrella — rain until 2pm"
4. **Traffic integration** - Real-time commute times (not hardcoded)
5. **Family notifications** - Joint family briefing for household
6. **Briefing customization** - Let parents choose what's included
7. **A/B testing** - Test different briefing styles/lengths
8. **Analytics** - Track open rates, engagement, feedback
