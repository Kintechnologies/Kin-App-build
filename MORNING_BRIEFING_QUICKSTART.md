# Morning Briefing System - Quick Start

## What Was Built

A complete end-to-end morning briefing system that generates personalized daily push notifications synthesizing all family data into one warm, actionable message.

**Example Output:**
> "Morning. Leave for the gym by 5:55 — 315 is backed up, take 670. Your 9:30 team sync is in 3 hours. Your wife's 6pm runs late — you've got pickup. Practice ends at 7, bedtime is 8:30. You're $23 under grocery budget. Chipotle?"

## Files Created

### Mobile App
- **`apps/mobile/lib/kin-ai.ts`** (7.5KB)
  - `assembleFamilyContext()` - Gathers all family data
  - `kinChat()` - Chat with Claude using family context
  - `generateMorningBriefing()` - Gets today's briefing

- **`apps/mobile/lib/push-notifications.ts`** (3.7KB)
  - `registerForPushNotifications()` - Registers device
  - `setupNotificationHandlers()` - Routes tap events

- **`apps/mobile/lib/api.ts`** (MODIFIED)
  - Added `getMorningBriefing()` endpoint
  - Added `registerPushToken()` endpoint

### Web API
- **`apps/web/src/app/api/morning-briefing/route.ts`** (11KB)
  - GET: Returns today's briefing or generates new
  - POST: Forces regeneration

- **`apps/web/src/app/api/push-tokens/route.ts`** (3.9KB)
  - GET: Fetch active tokens
  - POST: Register new token
  - DELETE: Deactivate token

### Backend
- **`supabase/functions/morning-briefing/index.ts`** (12KB)
  - Deno edge function
  - Runs at 6am daily
  - Generates + sends briefings to all users

- **`supabase/functions/morning-briefing/deno.json`**
  - Runtime configuration

- **`supabase/config.toml`** (NEW)
  - Supabase project config

### Documentation
- **`docs/MORNING_BRIEFING_SYSTEM.md`** - Complete technical documentation
- **`BRIEFING_SYSTEM_FILES.txt`** - File inventory

## Database Schema

Uses existing migrations (013-018) for:
- `push_tokens` - Device registration
- `morning_briefings` - Briefing storage + delivery status
- `parent_schedules` - User schedule (private)
- `children_allergies` - CRITICAL SAFETY feature
- `budget_categories` + `get_budget_summary()` RPC function
- `fitness_profiles` - Private per parent

## Key Architecture

```
Mobile App
  ├─ registerForPushNotifications() → API POST /push-tokens
  ├─ setupNotificationHandlers() → Routes taps
  └─ generateMorningBriefing() → API GET /morning-briefing

API (Next.js)
  ├─ GET /morning-briefing → Generate or return cached
  │  └─ Uses Claude to create warm briefing
  ├─ POST /morning-briefing → Force regeneration
  ├─ POST /push-tokens → Save device token
  ├─ GET /push-tokens → List user's tokens
  └─ DELETE /push-tokens → Deactivate token

Scheduled Job (Deno Edge Function)
  └─ 6am daily: Generate + send briefings to all users via Expo
```

## Integration Checklist

- [ ] **Database**: Apply migrations 013-018
  ```bash
  supabase db push
  ```

- [ ] **Edge Function Setup**
  ```bash
  supabase functions deploy morning-briefing
  ```

  Then set environment variables:
  - `ANTHROPIC_API_KEY`
  - `EXPO_ACCESS_TOKEN` (Expo push service)

- [ ] **Schedule Edge Function**: 6am UTC daily via Supabase dashboard

- [ ] **Mobile App**: Import new modules
  ```typescript
  import { generateMorningBriefing } from './lib/kin-ai'
  import { registerForPushNotifications, setupNotificationHandlers } from './lib/push-notifications'
  ```

- [ ] **App Startup**: Initialize push notifications
  ```typescript
  useEffect(() => {
    registerForPushNotifications()
    setupNotificationHandlers()
  }, [])
  ```

## Testing

### Manual briefing generation
```bash
curl -X GET https://your-domain.com/api/morning-briefing \
  -H "Authorization: Bearer TOKEN"
```

### Register push token
```bash
curl -X POST https://your-domain.com/api/push-tokens \
  -H "Authorization: Bearer TOKEN" \
  -d '{"token":"EXPO_TOKEN","platform":"ios"}'
```

### Test edge function locally
```bash
supabase functions serve
curl -X POST http://localhost:54321/functions/v1/morning-briefing
```

## Key Features

✓ **Safety**: Allergies ALWAYS included (non-negotiable)
✓ **Privacy**: Fitness data per-parent, budget totals only
✓ **Voice**: Warm, specific, direct — no corporate jargon
✓ **Speed**: 30-60 second read time
✓ **Reliability**: Graceful error handling, deduplication

## Kin Voice Rules

The briefing generator enforces:
1. No hedging ("I think", "perhaps")
2. Always specific numbers ($23, not "around $20")
3. One question max at the end
4. Warm, direct, human tone
5. Opens with "Morning."
6. Covers: schedule, calendar, kids, budget, pets
7. No bullet points or lists

## Troubleshooting

**Briefing not generating?**
- Check Anthropic API key in edge function env vars
- Verify user has completed onboarding
- Check morning_briefings table for errors

**Push not sending?**
- Verify push tokens are saved in push_tokens table
- Check EXPO_ACCESS_TOKEN is set
- Check delivery_status in morning_briefings (should be "sent")

**Edge function not running?**
- Verify edge function is deployed: `supabase functions list`
- Check environment variables are set
- Review function logs in Supabase dashboard

## Next Steps

1. **Deploy**: Follow integration checklist above
2. **Test**: Run manual tests with curl/Postman
3. **Monitor**: Check logs for errors during 6am run
4. **Iterate**: Gather user feedback on tone/content
5. **Enhance**: Add weather, traffic, meal suggestions

## Files Reference

| File | Size | Purpose |
|------|------|---------|
| `kin-ai.ts` | 7.5K | Mobile: family context + briefing |
| `push-notifications.ts` | 3.7K | Mobile: push setup |
| `api.ts` | Updated | Mobile: API methods |
| `morning-briefing/route.ts` | 11K | API: briefing generation |
| `push-tokens/route.ts` | 3.9K | API: token management |
| `morning-briefing/index.ts` | 12K | Edge: scheduled job |
| `MORNING_BRIEFING_SYSTEM.md` | 4K | Full documentation |

## Questions?

See `docs/MORNING_BRIEFING_SYSTEM.md` for complete technical documentation.
