# Kin AI — Supabase Auth Configuration

## Overview
This document specifies the exact Supabase Auth configuration required for Kin AI's dual-parent household architecture and mobile-first sign-up flow.

## Auth Methods Enabled

### 1. Email / Password
- **Status:** Enabled
- **Purpose:** Primary authentication for both parent accounts
- **Password Requirements:** Enforce Supabase defaults (strong passwords recommended)
- **Email Confirmation:** Required for account security

### 2. Google OAuth
- **Status:** Enabled
- **Scope:** `https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid`
- **Critical:** Do NOT include Google Calendar scope in the auth OAuth grant. Calendar is a separate, explicit OAuth flow managed by the mobile app after sign-in.
- **Client ID:** [Set in Supabase Auth dashboard]
- **Client Secret:** [Set in Supabase Auth dashboard]
- **Purpose:** Alternative sign-in for returning users; optional during onboarding

### 3. Apple Sign-In
- **Status:** Recommend enabling for iOS app store guidelines
- **Scope:** Email only
- **Purpose:** iOS-preferred authentication method
- **Configuration:** [Set bundle ID and team ID in Supabase dashboard]

### 4. Other Providers
- **Status:** Disabled
- **Rationale:** MVP focuses on email and OAuth for broad device support. Add others post-Phase 1 if needed.

## Mobile Deep Linking Configuration

### Expo Deep Link for Mobile App
```
Scheme: kin://
Path: /auth/callback
Full Redirect: kin://auth/callback
```

### Supabase Auth Settings
- **Redirect URL (Production):** `https://kinai.family/auth/callback` (web fallback)
- **Redirect URL (Mobile):** `kin://auth/callback` (Expo deep link)
- **Allowed Redirect URLs:** Both must be configured in Supabase dashboard

### Implementation Flow
1. User clicks "Sign in with Google" in React Native app
2. Opens native browser (via `expo-web-browser`)
3. Completes OAuth at Google
4. Returns to `kin://auth/callback`
5. Deep link handler in app captures `session` from query params
6. Session passed to Supabase JS client via `AsyncStorage`

## JWT Configuration

### Token Expiry
- **Access Token Expiry:** 3600 seconds (1 hour)
- **Refresh Token Rotation:** Enabled
- **Reason:** Frequent refresh prevents stale sessions on mobile; rotation adds security

### Token Storage (React Native)
- **Medium:** AsyncStorage (persisted, encrypted per OS)
- **Auto-Refresh:** Enabled in `@supabase/supabase-js` client
- **On Logout:** Clear all stored tokens immediately

## Email Templates

### Welcome Email
- **Template:** Custom (set in Supabase Email Templates dashboard)
- **Subject:** "Welcome to Kin — your family's AI operating system"
- **Content:** Warm, brief intro to the product. No calendar permissions requested.

### Email Confirmation
- **Required:** Yes
- **Auto-Confirm After 7 Days:** Disabled (user must confirm)

### Password Reset
- **Enabled:** Yes
- **Expiry:** 24 hours
- **Flow:** User receives reset link, completes reset, redirected to app

## Partner Invitation Flow (Non-Auth)

### Not an Auth Method
- Partners do NOT sign up via invite token
- Instead: Invite token pre-populates `householdId` in the standard sign-up form
- Token validated at sign-up time (stored in `partner_invites` table, not auth)

### Invite Flow
1. Partner 1 creates household during sign-up
2. Partner 1 generates invite URL: `kin://accept-invite?token={token}`
3. Partner 2 receives email with link
4. Partner 2 clicks link, opens app with pre-filled token
5. Partner 2 completes sign-up with token + household ID
6. Sign-up flow validates token and links to household

## Security Policies

### Row-Level Security (RLS)
- **Enforcement:** RLS enabled on all tables
- **Parent Authentication:** Users authenticated via Supabase Auth (`auth.uid()`)
- **Household Access:** RLS checks `user_id` against `parents.user_id` to determine household
- **Privacy:** Each parent can ONLY access their own private data + shared household data

### Session Management
- **Session Persistence:** AsyncStorage on mobile (auto-decrypted by OS)
- **Session Refresh:** Automatic via Supabase client when token expires
- **Session Revocation:** On logout, delete from AsyncStorage and clear Supabase session
- **Device Deactivation:** Not yet implemented (Phase 2) — currently assumes one device per parent

### Rate Limiting
- **Supabase Default:** 15 requests per second per IP
- **Sign-Up:** 1 per 10 seconds per email (Supabase default)
- **Monitor:** Watch for suspicious patterns (multiple sign-ups, failed attempts)

## Environment Variables (Mobile)

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key

# Note: Service key is server-side only
# Never expose in mobile app
```

## Post-Auth Flows

### After Sign-Up (Partner 1)
1. Auth user created in `auth.users`
2. Mobile app calls `POST /api/auth/household` with household details
3. Server creates `households` row
4. Server creates `parents` row linking `user_id`
5. Server creates `trial_state` row (7-day free trial)
6. App redirected to onboarding flow

### After Sign-Up (Partner 2 via Invite)
1. Auth user created in `auth.users`
2. Mobile app calls `POST /api/auth/accept-invite` with invite token
3. Server validates token + email match
4. Server creates `parents` row (household_id pre-filled)
5. Server marks `partner_invites.accepted_at`
6. Server creates `trial_state` row
7. App redirected to onboarding flow (skip household creation)

### Calendar OAuth (Separate from Auth)
- Happens AFTER user is logged in
- Uses explicit Google Calendar scope
- Token stored in `calendar_connections` table, encrypted at rest (Supabase Vault in prod)
- Each calendar provider (Google, Apple) has separate connection row
- Users can add/remove calendar connections from settings

## Monitoring & Logging

### Key Metrics to Track
- Sign-up completion rate (total signups vs. email confirmations)
- Google OAuth completion rate
- Sign-in success rate
- Token refresh frequency
- Session persistence issues

### Logging
- Supabase Auth Logs: Available in Supabase dashboard under "Auth" > "Logs"
- App Logging: Log all auth state changes in mobile app (sign-in, sign-out, token refresh)
- Errors: Use Sentry or similar to capture auth flow failures

## Testing

### Test Accounts
```
Email: austin@kinai.family
Password: [set in Supabase]
Household: Ford (test)
Partner: partner@kinai.family

Email: test-google@gmail.com
Authentication: Google OAuth
Purpose: Test OAuth flow
```

### Test Checklist
- [ ] Email/password sign-up works
- [ ] Email confirmation email received
- [ ] Google OAuth sign-in completes
- [ ] Deep link redirect works (kin://auth/callback)
- [ ] Session persists after app restart
- [ ] Token refresh works (wait > 1 hour)
- [ ] Sign-out clears session
- [ ] Partner invite link opens app with pre-filled token
- [ ] Second parent sign-up via invite succeeds

## Troubleshooting

### "Invalid Redirect URI"
- Check that the redirect URL in your app matches exactly what's configured in Supabase
- For mobile: `kin://auth/callback`
- For web: `https://kinai.family/auth/callback`

### Session Lost After App Restart
- Verify AsyncStorage is persisting (check device settings for app storage permissions)
- Verify `autoRefreshToken: true` in Supabase client config

### Google OAuth Not Working
- Verify Google Cloud Project has Supabase OAuth redirect URL whitelisted
- Verify Google Client ID matches in Supabase dashboard
- Check that the app's bundle ID matches Google OAuth configuration

### "User not found" After Sign-Up
- RLS policies may be blocking the query
- Verify `get_my_parent_id()` function returns correct parent_id
- Check that `parents` row was created with correct `user_id`

## Future Enhancements (Phase 2+)

- [ ] Passwordless sign-in (magic links)
- [ ] Biometric auth (Face ID / Touch ID)
- [ ] Multi-device session management
- [ ] Account linking (Google + email on same account)
- [ ] SAML for enterprise (future)
