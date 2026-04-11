# Kin AI Engineering — Setup Guide

Complete setup guide for developers working on the Kin AI family OS backend and mobile integration.

## Prerequisites

- **Node.js 20+** ([nodejs.org](https://nodejs.org/))
- **npm** or **yarn** (comes with Node)
- **Expo CLI**: `npm install -g expo-cli`
- **Supabase CLI**: `npm install -g supabase`
- **Git** (for version control)

## Project Structure

```
engineering/
  ├── supabase/
  │   ├── migrations/
  │   │   ├── 001_initial_schema.sql       # Core tables
  │   │   ├── 002_rls_policies.sql         # Privacy & security
  │   │   └── 003_views.sql                # Aggregated views
  │   ├── functions/
  │   │   └── morning-briefing/
  │   │       └── index.ts                 # Edge function for briefings
  │   ├── seed.sql                         # Test data (Austin's family)
  │   └── auth-config.md                   # Auth setup documentation
  ├── lib/
  │   ├── supabase.ts                      # Supabase client (React Native)
  │   ├── auth.ts                          # Authentication module
  │   ├── kin-ai.ts                        # AI context & briefing generation
  │   └── push-notifications.ts            # Expo push notification setup
  ├── types/
  │   └── index.ts                         # TypeScript interfaces (all tables)
  ├── env.example                          # Environment variable template
  └── README.md                            # This file
```

## Step 1: Environment Setup

Copy the environment template and fill in your values:

```bash
cp env.example .env.local
```

Get the following from your services:

**Supabase:**
- Project URL: Supabase Dashboard > Settings > API
- Anon Key: Supabase Dashboard > Settings > API > `anon` (public key)
- Service Key: Supabase Dashboard > Settings > API > `service_role` (server-side only)

**Anthropic:**
- API Key: [console.anthropic.com](https://console.anthropic.com/)

**Google OAuth:**
- Create a project at [Google Cloud Console](https://console.cloud.google.com/)
- Create OAuth 2.0 credentials (type: Web application)
- Add redirect URIs:
  - `https://your-project.supabase.co/auth/v1/callback`
  - `kin://auth/callback` (mobile deep link)

**RevenueCat:**
- Public Key: [RevenueCat Dashboard](https://app.revenuecat.com/) > Projects > iOS

## Step 2: Supabase Database Setup

Initialize Supabase locally (optional, for local development):

```bash
# Link to your Supabase project
supabase projects list                    # See all projects
supabase link --project-ref your-ref-id  # Link to a project

# Or create a local Supabase instance
supabase start
```

### Run Migrations (in order)

```bash
# Push migrations to your Supabase project
supabase db push

# Or manually apply each SQL file via Supabase Dashboard > SQL Editor:
# 1. Copy contents of 001_initial_schema.sql and run
# 2. Copy contents of 002_rls_policies.sql and run
# 3. Copy contents of 003_views.sql and run
# 4. Copy contents of seed.sql and run (for test data)
```

**Important:** Migrations must be run in order. The schema must exist before RLS policies can reference it.

### Verify RLS is Enabled

After running migrations, verify that RLS is enabled on all tables:

```sql
-- Check RLS status in Supabase SQL Editor
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

All tables should show `rowsecurity = true`.

### Test Auth

Create a test user in Supabase Dashboard > Authentication > Users:

```
Email: austin@kinai.family
Password: [secure password]
```

## Step 3: Google Calendar OAuth

Set up Google Calendar API for syncing parent calendars:

1. **Google Cloud Console:**
   - Create a new project or select existing
   - Enable "Google Calendar API"
   - Create OAuth 2.0 credentials (type: Web application)
   - Add redirect URIs (as listed in Step 1)

2. **In your app:**
   - Users will authorize calendar access after sign-in
   - Store credentials in `calendar_connections` table (encrypted)
   - Sync happens automatically at scheduled intervals

## Step 4: Expo Push Notifications

Set up EAS and push notifications:

```bash
# Initialize EAS (one time per project)
eas init

# Submit app to EAS for building (creates signing certificates)
eas build --platform ios --profile preview
```

This generates the certificates needed for APNs (Apple Push Notification service).

Store the EAS project ID in your `.env.local`:

```env
EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id
```

## Step 5: Supabase Edge Functions

Deploy the morning briefing function to Supabase:

```bash
# Deploy function
supabase functions deploy morning-briefing

# Test the function locally
supabase functions serve

# Then in another terminal:
curl -X POST http://localhost:54321/functions/v1/morning-briefing \
  -H "Authorization: Bearer your-service-key"
```

### Schedule the Briefing Cron

In Supabase Dashboard > Edge Functions > morning-briefing > Settings:

- **Cron expression:** `0 6 * * *` (6am every day in UTC — adjust for timezones)
- Note: The function itself handles timezone-aware scheduling per parent

Or use a more frequent schedule (e.g., every 5 mins) and let the function decide when to send:
- **Cron expression:** `*/5 * * * *` (every 5 minutes)

## Step 6: Run the Mobile App

```bash
# Install dependencies
npm install

# or
yarn install

# Start Expo
npx expo start

# Scan QR code with Expo Go (iOS/Android) or press:
# - i (iOS Simulator)
# - a (Android Emulator)
# - w (Web)
```

## Testing Checklist

Before considering the foundation complete, test:

### RLS & Privacy

- [ ] Sign in as Austin (parent 1)
  - [ ] Can see household data (children, pets, budget)
  - [ ] Can see own fitness profile
  - [ ] Cannot see partner's fitness profile
  - [ ] Cannot see partner's transactions (only budget totals)

- [ ] Sign in as Partner (parent 2)
  - [ ] Can see same household data
  - [ ] Can see own fitness profile
  - [ ] Cannot see Austin's fitness profile

### Allergy Safety

- [ ] Fetch `allergy_summary_by_household` returns "dairy, egg" for Ford household
- [ ] When generating a meal suggestion, Claude refuses any recipe with dairy or eggs
- [ ] Test with multiple children and allergies

### Auth Flow

- [ ] Email/password sign-up works
- [ ] Email confirmation email received
- [ ] Partner 1 can generate invite link
- [ ] Partner 2 can sign up with invite token (household_id pre-filled)
- [ ] After both sign-ups, they share the same household

### Push Notifications

- [ ] Register for push notifications returns token
- [ ] Token stored in `push_tokens` table
- [ ] Morning briefing function sends notification at scheduled time
- [ ] Notification received on device shows briefing text

### Morning Briefing Generation

- [ ] Call `generateMorningBriefing(parentId)` returns valid text
- [ ] Briefing includes: commute (if applicable), meetings, family context, budget, meal
- [ ] Briefing respects allergies (no dairy/egg suggestions for Mia)
- [ ] Briefing is 3-6 sentences, warm tone, specific numbers

### Views

- [ ] `budget_summary` shows totals by category, not individual transactions
- [ ] `calendar_summary_today` returns today's events in order
- [ ] `allergy_summary_by_household` returns correct allergen list
- [ ] `date_night_status` shows days since last date night

## Troubleshooting

### "Missing environment variables"
- Ensure `.env.local` exists and all required vars are set
- Reload terminal/editor after creating `.env.local`

### RLS blocking all queries
- Check `parents.user_id` matches `auth.users.id`
- Verify RLS policies were applied: `SELECT * FROM information_schema.enabled_roles`
- Try querying as service role to bypass RLS (for debugging only)

### Push notifications not being sent
- Verify `push_tokens` table has tokens for the parent
- Check Expo project ID in `.env.local`
- Run edge function locally to see logs: `supabase functions serve`

### Claude API errors
- Verify `ANTHROPIC_API_KEY` is set and valid
- Check that model name is correct: `claude-sonnet-4-20250514`
- Review API usage in Anthropic console

### Supabase Auth not persisting
- Ensure `AsyncStorage` is writable (check device settings)
- Verify `autoRefreshToken: true` in supabase client config
- Check browser console (web) or device logs (mobile) for errors

## Development Workflow

### Adding a New Table

1. Create migration: `supabase migration new add_xyz_table`
2. Write schema in migration file
3. Run migration: `supabase db push`
4. Add TypeScript interface in `types/index.ts`
5. Add RLS policies in `002_rls_policies.sql` equivalent
6. Test RLS: sign in as parent, verify policy works

### Updating RLS Policies

1. Update policies in `002_rls_policies.sql`
2. Apply to Supabase: copy SQL and run in dashboard SQL Editor
3. Test as both parents: verify access is correct
4. Never add a table without RLS — it's a security vulnerability

### Testing AI Integration

```typescript
// In a test file or console:
import { kinChat, generateMorningBriefing } from './lib/kin-ai'

const briefing = await generateMorningBriefing('00000000-0000-0000-0001-000000000001')
console.log(briefing)

const response = await kinChat(
  '00000000-0000-0000-0001-000000000001',
  [{ role: 'user', content: 'What should we have for dinner?' }],
  '00000000-0000-0000-0000-000000000001'
)
console.log(response)
```

## Security Reminders

1. **Never commit `.env.local`** — it contains secrets
2. **Service key is server-side only** — never in client app or frontend
3. **RLS is the privacy wall** — test it rigorously
4. **Allergies are safety-critical** — always validate in every AI prompt
5. **Push tokens are sensitive** — handle with same care as auth tokens

## Next Steps (Track B: Onboarding)

Track B depends on Track A completing:

- [ ] Schema is correct and indexed
- [ ] RLS policies are complete and tested
- [ ] Auth flows (sign-up, sign-in, partner invite) work end-to-end
- [ ] Push notifications are registered and ready
- [ ] Morning briefing generation works locally
- [ ] Allergy safety is verified
- [ ] TypeScript types are complete

Once these are verified, Track B can begin building:
- Onboarding UI (household creation, partner invite, child/allergy entry)
- Calendar OAuth grant flow
- Mobile app screens and navigation

## Support

For issues or questions:
- Check Supabase logs: Dashboard > Logs
- Check function logs: `supabase functions serve`
- Check mobile app logs: Expo console output
- Review migrations: `supabase db remote set` to see applied migrations

---

**Built with:** Supabase + Anthropic Claude + Expo + React Native
**Last Updated:** 2026-04-02
**Status:** Track A Foundation Complete
