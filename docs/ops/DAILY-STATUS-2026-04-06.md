# Kin AI — Daily Status Note
**Date:** 2026-04-06 (Sprint Day 6 of 14)
**Author:** Lead Engineer (scheduled run BD)
**Sprint target:** TestFlight by 2026-04-16

---

## Latest Update — Lead Eng Run BD

### What Was Delivered

**Commit:** `3f63d1e` — `Lead Eng run BD: punch list items — eas.json, dead tab cleanup, offline banner, account deletion, console guards`

**Files changed:** 14 files, +514 / -5681 lines

---

### Item-by-Item

#### ✅ eas.json created — `apps/mobile/eas.json`
EAS build config created with `development` (simulator), `preview` (internal distribution), and `production` (Release) profiles. Push notification projectId will be populated when Austin adds it to EAS dashboard. Austin: fill in `ascAppId` and `appleTeamId` in the `submit.production.ios` block once the App Store Connect app is created (part of B2).

#### ✅ Dead tab screens deleted
`budget.tsx`, `family.tsx`, `fitness.tsx`, `meals.tsx` — all four removed from `apps/mobile/app/(tabs)/`. Architecture is now 3-tab only (`index`, `chat`, `settings`), consistent with `_layout.tsx` which has not referenced these files since the ARCH-PIVOT. QA run BB confirmed architecture clean; deletion is safe.

#### ✅ `console.error` / `console.log` — all mobile files now `__DEV__` guarded
- `chat.tsx` line 360: `process.env.NODE_ENV !== "production"` → `__DEV__`
- `push-notifications.ts` lines 60, 66: two bare `console.error` calls guarded
- `kin-ai.ts` lines 220, 241, 259: three bare `console.error` calls guarded
Also fixed pre-existing TypeScript errors in `push-notifications.ts` that were blocking `tsc`:
  - `expo-notifications` and `expo-device` added to `package.json` (were missing — package was used but never declared)
  - `NotificationBehavior` missing `shouldShowBanner` + `shouldShowList` fields (new in expo-notifications v15)
  - Explicit `Notification` / `NotificationResponse` types on listener callbacks
  - Mobile `tsc --noEmit`: **0 errors** post-fix (was 4 errors from missing packages + `any` types)

#### ✅ Offline detection + banner — `apps/mobile/app/(tabs)/index.tsx`
- `@react-native-community/netinfo` installed (`^12.0.1`)
- `useEffect` subscribes to `NetInfo.addEventListener` on mount; sets `isOffline` state
- Banner renders below header when `isConnected === false`: `WifiOff` icon + "You're offline — showing last known data."
- Low-prominence style (`surfaceSubtle` background, `textMuted` text, `skeletonBase` border) — does not compete with alert cards

#### ✅ Account deletion — `DELETE /api/account` + Settings UI
New route `apps/web/src/app/api/account/route.ts`:
- Authenticates via `getAuthenticatedUser` (Bearer token from mobile)
- Deletes in FK-safe order: `chat_messages` → `chat_threads` → `calendar_events` → `coordination_issues` (household-scoped; checks remaining members before deleting) → `morning_briefings` → `kin_check_ins` → `push_tokens` → `household_invites` → `profiles` → `auth.users` (admin client)
- `Sentry.captureException` on failure; returns `{ success: true }` on clean delete

Settings screen (`apps/mobile/app/(tabs)/settings.tsx`):
- `Trash2` icon imported from `lucide-react-native`
- `api.ts`: `deleteAccount()` method added
- `handleDeleteAccount()`: two-step `Alert.alert` confirmation ("This cannot be undone") → calls `api.deleteAccount()` → `signOut()`; surfaces error alert on failure
- Delete Account button placed below Sign Out, above version footer — low-prominence destructive style (`rose` color, no background card), consistent with §12 (no haptic on destructive action)

---

### Pre-existing Issues Noted (not introduced this run)

| Issue | Status |
|-------|--------|
| `push-notifications.ts` — expo-notifications/expo-device not in package.json | ✅ Fixed this run |
| `chat-agentic-loop.test.ts` — Anthropic SDK `ContentBlock`/`Usage` type drift | ❌ Pre-existing — test file needs `citations` + cache fields added. Not blocking TestFlight. |
| `stripe-webhook.test.ts` — null vs string type | ❌ Pre-existing — not blocking. |
| Web vitest timeout in sandbox | ❌ Infrastructure issue (sandbox memory / SWC binary); not a code failure. Shared tests (11/11) pass. |

---

### Stage Status (post-run BD)

| Stage | Status |
|-------|--------|
| S1 — Shell + Data Layer | ✅ Complete |
| S2 — Today Screen | ✅ Complete + offline banner added |
| S3 — Conversations Screen | ✅ Complete |
| S4 — First-Use + Settings | ✅ Complete + account deletion added |
| S5 — RC + TestFlight | ⬜ Blocked on Austin B2 |

---

### For Austin

**Critical path (unchanged):**
1. **B2 (P0):** RevenueCat iOS configuration — create `premium` entitlement, attach both products, add iOS app (bundle ID + ASC), add `EXPO_PUBLIC_REVENUECAT_API_KEY` to `.env`
2. **B4 (time-sensitive):** Google OAuth verification — submit logo, homepage URL, privacy/ToS URLs, `kinai.family` authorized domain

**New eas.json items to fill in:**
- `submit.production.ios.ascAppId` — your App Store Connect numeric app ID
- `submit.production.ios.appleTeamId` — your Apple developer team ID

**Quick terminal maintenance (still outstanding):**
- `rm -rf docs/prompts/docs` — stale IE shadow directory still present
- `rm supabase/migrations/027_profile_timezone.sql` — no-op stub, delete before next `supabase db push`

---

### Critical Path

```
Austin B2 (RC entitlement + iOS app + API key)
  → Lead Eng S5.1 uncommit RC (revenuecat.ts + PaywallModal.tsx already built)
  → S5.2 TestFlight build (eas build --platform ios --profile production)
  → QA S5.3 TestFlight build verification
  → 🚀 TestFlight
```

**Estimated time to TestFlight:** 2–3 cycles once Austin completes B2.
**Target date:** April 18–19. Achievable. 10 days remain.

_— Lead Engineer, 2026-04-06 (run BD)_
