# Kin AI — iOS Build Plan

**Version 1.0 · April 2, 2026 · Engineering Reference**

This document is the technical blueprint for building Kin's iOS app. It drives all engineering agent work. Every section is written to be actionable — not aspirational.

---

## 1. Framework Decision

### The Three Options

**Option A: React Native / Expo (SDK 54)**

Expo is the managed React Native toolchain. Kin already has an `apps/mobile` directory with Expo SDK 54 scaffolded (auth, 5-tab layout, onboarding survey, chat, meals, budget, settings, theme system). The existing Next.js web app uses TypeScript and React — the mental model transfers directly.

Strengths for Kin:
- Code sharing with the web app (shared types, validation, API client, business logic in `packages/shared`)
- Expo SDK 54 supports iOS widgets (via expo-widget), Live Activities, and Apple Watch targets through config plugins
- Supabase has first-class JS/TS SDKs — `@supabase/supabase-js` works identically on web and mobile
- Push notifications via `expo-notifications` with APNs support built in
- EAS Build + EAS Submit handles CI/CD and App Store submission without Xcode
- Claude Code and AI coding tools are strongest with TypeScript/React — this is the language pair with the deepest training data and best autocomplete
- OTA updates via `expo-updates` — push bug fixes without App Store review cycles
- Existing mobile scaffolding means weeks of boilerplate already done

Weaknesses:
- Widgets, Live Activities, and Watch apps require Swift bridging code — Expo config plugins help but you still write Swift for the extension targets
- Native feel requires extra work (navigation transitions, haptics, scroll physics) — React Native defaults feel slightly off to discerning iOS users
- Debugging native module issues means dropping into Xcode anyway
- App binary size is larger (~15-25MB overhead from the JS runtime)

**Option B: Swift / SwiftUI (Native)**

Pure Apple stack. Best possible iOS integration and performance. SwiftUI is Apple's declarative UI framework — feels like React but compiles to native.

Strengths for Kin:
- Best-in-class iOS integration: widgets, Live Activities, StandBy, Watch, Siri Shortcuts, App Clips all work natively with no bridging
- Performance ceiling is highest — 60fps everywhere, instant launch, smallest binary
- SwiftUI's declarative model is actually similar to React (state-driven UI, component composition)
- App Store reviewers see native apps favorably — no framework detection issues
- Apple's own sample code and WWDC sessions are all SwiftUI — you're building exactly what Apple recommends

Weaknesses:
- Zero code sharing with the Next.js web app — the Supabase client, API layer, types, and all UI must be rewritten
- Supabase has a Swift SDK but it's less mature than the JS SDK (fewer examples, smaller community, some features lag behind)
- Claude Code's Swift/SwiftUI training data is good but not as deep as TypeScript/React — expect more iteration cycles
- No OTA updates — every fix requires App Store review (1-3 day turnaround)
- Austin and his AI agents have no Swift experience — the ramp-up cost is real
- Building the same features twice (web + iOS) doubles the maintenance surface permanently

**Option C: Flutter (Dart)**

Google's cross-platform framework. Good performance, single codebase for iOS and Android.

Strengths for Kin:
- Near-native performance with custom rendering engine (Skia/Impeller)
- Strong widget system and animation primitives
- Single codebase covers iOS and Android

Weaknesses:
- Dart is a niche language — smallest ecosystem of the three options, worst AI coding tool support
- Zero code sharing with the existing TypeScript/Next.js web app
- Supabase has a Dart SDK but it's the least mature of all three
- iOS-specific features (widgets, Live Activities, Watch) still require Swift bridging — same as React Native but with a less common bridge pattern
- Would require discarding the existing Expo mobile scaffolding entirely
- Flutter apps can trigger extra App Store scrutiny around UI consistency with iOS conventions

### Recommendation: React Native / Expo

**Use Expo SDK 54. This is not close.**

The reasoning, ranked by impact:

1. **You've already started.** The `apps/mobile` directory has auth, navigation, onboarding, chat, and theming built. Switching frameworks means discarding weeks of work for zero user-facing benefit.

2. **TypeScript everywhere.** The web app, the mobile app, the shared packages, the API client, the Supabase types — all TypeScript. One language across the entire stack means Austin's AI agent team writes code in one paradigm. SwiftUI would split the codebase into two languages that can never share logic.

3. **AI coding tool effectiveness.** Claude Code is measurably better at TypeScript/React than Swift/SwiftUI. For a team that builds entirely through AI agents, this isn't a preference — it's a force multiplier. Faster iteration, fewer hallucinated APIs, better autocomplete on Supabase patterns.

4. **Supabase compatibility.** `@supabase/supabase-js` is battle-tested with React Native. Auth, Realtime subscriptions, Row-Level Security, and Storage all work identically to the web app. The Swift SDK works but has fewer production examples and a smaller community for debugging edge cases.

5. **OTA updates.** When a critical bug ships (and it will), `expo-updates` lets you push a fix in minutes. SwiftUI means waiting 1-3 days for App Store review. For a two-person bootstrapped team, this is survival-grade infrastructure.

6. **iOS-native features are achievable.** Expo's config plugins and native modules make widgets, Live Activities, and Watch targets possible. They require Swift code in the extension targets — but that's a bounded problem (small, well-defined Swift files) rather than building the entire app in Swift.

The premium feel concern is real but solvable. Use `react-native-reanimated` for gesture-driven animations, `react-native-haptic-feedback` for tactile responses, and invest in custom navigation transitions. Apps like Coinbase and Discord ship React Native and feel indistinguishable from native to most users.

**The one scenario where Swift wins:** if Kin's core differentiator were a Watch app or a widget-first experience. It's not — the core differentiator is AI-powered family coordination, which lives in the main app experience where React Native excels.

---

## 2. Architecture

### 2.1 System Overview

```
┌─────────────────────────────────────────────────────┐
│                    iOS App (Expo)                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ React    │  │ Widget   │  │ Notification       │  │
│  │ Native   │  │ Extension│  │ Service Extension  │  │
│  │ App      │  │ (Swift)  │  │ (Swift)            │  │
│  └────┬─────┘  └────┬─────┘  └────────┬───────────┘  │
│       │              │                 │              │
│  ┌────┴──────────────┴─────────────────┴───────────┐ │
│  │           Shared API Client (TypeScript)         │ │
│  │   @supabase/supabase-js + custom API layer      │ │
│  └──────────────────────┬──────────────────────────┘ │
└─────────────────────────┼────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│                   Supabase Backend                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Postgres │  │ Auth     │  │ Realtime          │  │
│  │ + RLS    │  │ (email + │  │ (partner sync,    │  │
│  │          │  │  Apple)  │  │  grocery lists)   │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Edge     │  │ Storage  │  │ Database          │  │
│  │ Functions│  │ (avatars,│  │ Webhooks          │  │
│  │ (AI,     │  │  recipes)│  │ (push triggers)   │  │
│  │  push)   │  │          │  │                   │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
         ┌────────┐ ┌─────────┐ ┌──────────┐
         │Anthropic│ │ APNs    │ │RevenueCat│
         │Claude   │ │ (Push)  │ │(Payments)│
         │API      │ │         │ │          │
         └────────┘ └─────────┘ └──────────┘
```

### 2.2 API Layer Design

**Do not build a custom API server.** The existing architecture — Supabase direct from client + Edge Functions for server-side logic — is correct for this stage. Adding an Express/Fastify API layer introduces deployment complexity, another failure point, and maintenance overhead that a two-person team cannot afford.

The API layer has three tiers:

**Tier 1: Direct Supabase Client (most operations)**
```typescript
// packages/shared/src/api/client.ts
import { createClient } from '@supabase/supabase-js'
import { Database } from './types' // generated from Supabase schema

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: AsyncStorage, // React Native
      autoRefreshToken: true,
      persistSession: true,
    },
    realtime: { params: { eventsPerSecond: 10 } },
  }
)
```

RLS policies handle authorization. The client talks directly to Postgres for reads and writes on: events, todos, grocery items, meal plans, budget entries, family profiles. This is 80% of all operations.

**Tier 2: Supabase Edge Functions (server-side logic)**

Edge Functions handle operations that require secrets, external API calls, or server-side processing:

| Function | Purpose | Trigger |
|----------|---------|---------|
| `ai-chat` | Streams Claude API responses with family context | Client POST |
| `calendar-sync` | Google/Apple calendar sync with OAuth tokens | Cron (15min) + webhook |
| `send-push` | Formats and sends APNs notifications | Database webhook |
| `daily-briefing` | Generates morning/evening briefing content | Cron (7am/8pm per timezone) |
| `partner-invite` | Sends invite email, creates pending household link | Client POST |
| `stripe-webhook` | Handles Stripe events (for web subscribers) | Stripe webhook |
| `revenucat-webhook` | Handles RevenueCat subscription events | RevenueCat webhook |

**Tier 3: Shared Business Logic (packages/shared)**

Platform-agnostic TypeScript that both web and mobile import:

```
packages/shared/
├── src/
│   ├── types/          # Supabase DB types (auto-generated)
│   ├── api/            # Supabase client factory + query helpers
│   ├── validation/     # Zod schemas for all data models
│   ├── constants/      # Plan tiers, category lists, limits
│   ├── utils/          # Date math, conflict detection, formatting
│   └── ai/             # System prompt builder, context compression
```

### 2.3 Real-Time Sync Between Partners

Supabase Realtime handles partner sync. When Parent 1 checks off a grocery item, Parent 2 sees it move to the bottom of the list within ~200ms.

**Implementation:**

```typescript
// Subscribe to household changes
const channel = supabase
  .channel(`household:${householdId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'grocery_items',
    filter: `household_id=eq.${householdId}`,
  }, (payload) => {
    // Update local state optimistically
    updateGroceryList(payload)
  })
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'events',
    filter: `household_id=eq.${householdId}`,
  }, (payload) => {
    updateCalendar(payload)
  })
  .subscribe()
```

Tables that need Realtime subscriptions: `events`, `grocery_items`, `todo_items`, `meal_plans`, `budget_entries`. All filtered by `household_id`.

Realtime is connection-based. Handle reconnection gracefully — when the app returns from background, re-subscribe and do a quick full fetch to catch anything missed.

### 2.4 Offline Support

**Phase 1: Optimistic UI, not full offline.**

Full offline-first with conflict resolution (CRDTs, sync queues) is a 3-4 week engineering effort that does not move the needle for launch. Instead:

- Use React Query (TanStack Query) for client-side caching. Reads are cached and served instantly. Stale data refetches in the background.
- Writes are optimistic — the UI updates immediately, then the Supabase mutation fires. On failure, revert the optimistic update and show an error toast.
- Store the last-fetched schedule in AsyncStorage so the app shows *something* when opened offline (read-only, clearly marked as "last updated X minutes ago").
- AI chat requires network — show a clear "Kin needs internet to chat" message.

**Phase 3: True offline (post-launch)**

If user feedback demands it, add a write-ahead log with background sync. But don't build this before you have 70 paying subscribers.

### 2.5 Push Notification Infrastructure

**APNs via Supabase Edge Functions + expo-notifications**

```
User action or cron trigger
        │
        ▼
Supabase Edge Function (send-push)
        │
        ├── Fetches user's APNs device token from `device_tokens` table
        ├── Builds notification payload (title, body, data, category)
        ├── Signs with APNs auth key (.p8 from Apple Developer)
        └── Sends HTTP/2 POST to api.push.apple.com
                │
                ▼
        APNs delivers to device
                │
                ▼
        expo-notifications handler
        (foreground: in-app banner)
        (background: system notification)
```

**Device token registration:**

On app launch and on auth state change, register the device token:

```typescript
import * as Notifications from 'expo-notifications'

const token = await Notifications.getExpoPushTokenAsync({
  projectId: EAS_PROJECT_ID
})
// Or for direct APNs:
const deviceToken = await Notifications.getDevicePushTokenAsync()

// Store in Supabase
await supabase.from('device_tokens').upsert({
  parent_id: user.id,
  token: deviceToken.data,
  platform: 'ios',
  updated_at: new Date().toISOString()
})
```

**Notification categories for Kin:**

| Category | Trigger | Content Example |
|----------|---------|-----------------|
| `morning_briefing` | Cron, 7:00 AM local | "Good morning, Austin. 3 events today, soccer pickup is at 4:30." |
| `evening_briefing` | Cron, 8:00 PM local | "Tomorrow: dentist at 9am, partner has a late meeting. Dinner idea: slow cooker chili." |
| `schedule_conflict` | Real-time, on event create/edit | "Heads up — you and [partner] are both booked Thursday at 5pm." |
| `partner_update` | Real-time | "[Partner] added 'School play' to Friday at 6pm." |
| `grocery_reminder` | Geofence or time-based (Phase 2) | "You're near Kroger — 8 items on your list." |
| `ai_insight` | Edge Function, contextual | "This week looks packed. Want me to find a dinner shortcut for Wednesday?" |

**Rich notifications:** Use Notification Content Extension (Swift) to show the mini-schedule directly in the notification. This requires a native extension target — add via Expo config plugin.

### 2.6 AI Chat Architecture (Streaming)

**The chat must stream.** A 3-5 second blank wait for a complete response feels broken on mobile. Streaming token-by-token feels alive.

**Flow:**

```
Mobile App                    Edge Function              Claude API
    │                              │                         │
    ├── POST /ai-chat ────────────►│                         │
    │   { message, familyContext } │                         │
    │                              ├── Build system prompt   │
    │                              │   + compress context     │
    │                              │                         │
    │                              ├── POST /messages ──────►│
    │                              │   { stream: true }      │
    │                              │                         │
    │   ◄── SSE: delta tokens ─────┤◄── SSE stream ─────────┤
    │   ◄── SSE: delta tokens ─────┤◄── SSE stream ─────────┤
    │   ◄── SSE: delta tokens ─────┤◄── SSE stream ─────────┤
    │   ◄── SSE: [DONE] ──────────┤◄── [DONE] ─────────────┤
    │                              │                         │
    │                              ├── Save to messages table│
    │                              │   (complete response)   │
    │                              │                         │
```

**On the client:** Use `fetch` with `ReadableStream` or the Anthropic SDK's streaming helper. Append each token to the displayed message. Show a typing indicator before the first token arrives.

**Context management:** The system prompt + family context (profiles, recent events, preferences) must fit within a reasonable token budget. The Edge Function handles context compression:
- Always include: family member names, today's schedule, recent conversation summary
- Include on demand: full week schedule, meal plan, budget status (only when relevant to the query)
- Never include: raw chat history beyond the last 10 messages — summarize older history

**Cost control:** Track tokens per conversation. Set a soft limit (e.g., 50 messages/day on Starter plan). Use `claude-haiku-4-5-20251001` for simple queries (grocery list additions, yes/no questions) and `claude-sonnet-4-20250514` for complex reasoning (meal planning, conflict resolution, schedule optimization).

---

## 3. iOS-Specific Features Plan

### 3.1 Home Screen Widgets (WidgetKit)

**Today's Schedule Widget — the single most important iOS feature after the main app.**

Parents glance at their phone 80+ times a day. A widget that shows today's schedule without opening the app delivers value passively. This is how Kin becomes indispensable.

**Implementation:**

Widgets are a separate Swift target. Data flows from the main app to the widget via App Groups (shared UserDefaults or a shared SQLite/JSON file).

```
Main App (React Native)
    │
    ├── On schedule change, write to App Group shared container
    │   (JSON: today's events, sorted by time)
    │
    ▼
Widget Extension (SwiftUI + WidgetKit)
    │
    ├── TimelineProvider reads from App Group shared container
    ├── Renders schedule entries with family member colors
    └── Updates timeline on schedule change (via WidgetCenter.reloadAllTimelines())
```

**Widget sizes and content:**

| Size | Content |
|------|---------|
| Small (2×2) | Next event + time. "Soccer pickup · 4:30 PM" |
| Medium (4×2) | Next 3 events with times and family member color dots |
| Large (4×4) | Full day timeline with all events, meal plan dinner, and a "Kin says" one-liner |

**Expo integration:** Use `expo-widget` or a custom config plugin to add the widget target to the Xcode project. The widget UI itself is pure SwiftUI — this is one of those bounded Swift problems.

### 3.2 Lock Screen Widgets

Same WidgetKit infrastructure, different presentation. Lock Screen widgets are small and circular/rectangular.

| Type | Content |
|------|---------|
| Circular | Number of events remaining today ("4") |
| Rectangular | Next event name + time |
| Inline | "Next: Soccer @ 4:30" (single line) |

Ship Lock Screen widgets in Phase 2. They use the same data pipeline as Home Screen widgets — the incremental effort is just the SwiftUI layout.

### 3.3 StandBy Mode

StandBy mode (iPhone on its side, charging) displays widgets in a large format. WidgetKit widgets automatically work in StandBy if they support the `.systemSmall` and `.systemMedium` families. No additional code required beyond building the Home Screen widgets correctly.

The medium widget showing the day's timeline is the ideal StandBy display — a family can place their iPhone on a kitchen stand and see the day's schedule at a glance. This is the kind of ambient utility that makes Kin feel like infrastructure rather than an app.

### 3.4 Live Activities

**Show the current and next event on the Dynamic Island and Lock Screen.**

Live Activities are ideal for Kin. When a family event is happening, the Dynamic Island shows "Soccer practice · ends 5:30 PM · next: Dinner prep." When the event ends, the next one appears.

**Implementation:**

```swift
// ActivityAttributes define the static and dynamic data
struct KinScheduleAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var currentEventName: String
        var currentEventEndTime: Date
        var nextEventName: String?
        var nextEventTime: Date?
        var familyMemberColor: String
    }
    var householdName: String
}
```

**Trigger from React Native:** Use a native module (via Expo Modules API) to start/update/end Live Activities. The main app calculates when to start a Live Activity based on the schedule, and uses `ActivityKit` through the native bridge.

**Phase:** Ship in Phase 2. Live Activities require careful state management (what happens when events are edited while a Live Activity is running?) and the UX must be polished. Get the core app right first.

### 3.5 Apple Watch Complication + App

**Phase 3 feature.** The Watch complication shows:
- Next event name and time
- "Whose turn" indicator (e.g., "Your pickup" vs "Partner's pickup")
- Number of unchecked grocery items (glanceable errand awareness)

The Watch app (not just a complication) could show:
- Today's schedule scrollable on wrist
- Grocery list with checkboxes (tap to check off at the store)
- Quick reply to Kin AI ("Running 10 min late" → Kin notifies partner)

**Implementation:** WatchKit app with SwiftUI, communicating with the iPhone app via Watch Connectivity framework. The Watch app is a separate target — build it after the core iOS experience is proven.

### 3.6 Haptic Feedback Design

Haptics make the app feel physically responsive. Use `react-native-haptic-feedback`:

| Action | Haptic Type | Why |
|--------|------------|-----|
| Check off grocery/todo item | `impactLight` | Satisfying "done" feeling |
| Pull to refresh | `impactMedium` | Confirms the gesture registered |
| Schedule conflict detected | `notificationWarning` | Draws attention without being alarming |
| Partner joined household | `notificationSuccess` | Celebration moment |
| Delete/destructive action | `impactHeavy` | Weight implies consequence |
| Tab switch | `selection` | Subtle orientation cue |
| AI response starts streaming | `impactLight` | "Kin is thinking" → "Kin is responding" transition |

Don't overdo it. Every haptic should feel intentional. If users can't articulate why the app "feels good," the haptics are calibrated correctly.

### 3.7 Siri Shortcuts

Expose key actions as Siri Shortcuts so users can trigger them by voice:

| Shortcut | Phrase | Action |
|----------|--------|--------|
| "What's on the schedule today?" | "Hey Siri, Kin schedule" | Reads today's events aloud |
| "Add to grocery list" | "Hey Siri, add milk to Kin" | Adds item via Shortcut parameter |
| "What's for dinner?" | "Hey Siri, Kin dinner" | Reads tonight's meal plan |

**Implementation:** Use the Intents framework via a native module. Define custom intents in the Xcode project, handle them in an Intents Extension (Swift), and donate shortcuts from the React Native layer when users perform the corresponding actions in-app.

**Phase:** Phase 3. Siri Shortcuts are delightful but not essential for the first 70 subscribers.

### 3.8 App Clips

**Don't build an App Clip.** App Clips are for transactional, location-based experiences (ordering food, renting a scooter). Kin is a relationship app — users need the full onboarding experience and an account. An App Clip that shows a partial schedule to a non-authenticated user adds engineering cost with no conversion benefit. Revisit only if a specific distribution opportunity arises (e.g., a daycare partnership where parents scan a code to sync school schedules).

---

## 4. Build Phases with Timeline

### Context for Estimates

Austin works ~2.5 hours/day on Kin. Claude Code agents handle the majority of implementation. Based on the existing pace (web app built in ~2 weeks of agent work, mobile scaffolding done in ~1 week), these estimates assume consistent agent productivity with Austin doing architecture decisions, testing, and App Store logistics.

### Phase 1: Core App (3 weeks — April 7 to April 27)

**Goal:** A functional iOS app on TestFlight that one family can use daily.

| Week | Build | Details |
|------|-------|---------|
| **Week 1** | **Auth + Onboarding + Navigation** | Supabase auth with Apple Sign-In and email. Conversational AI onboarding (Kin asks questions, builds family profile through chat — not forms). Tab navigation: Schedule, Chat, Lists, Settings. Deep link handling. |
| **Week 1** | **Daily Schedule (core screen)** | The primary screen. Shows today's events in a timeline view. Color-coded by family member. Tap to view/edit event. FAB to add event. Pull to refresh. This is the first value moment — it must be flawless. |
| **Week 2** | **AI Chat** | Streaming chat interface. Family-context-aware responses. Conversation persistence. Chat can create events ("Add soccer practice Thursday 4-5:30pm"), add grocery items, suggest meals. Typing indicator, smooth scroll, keyboard avoidance. |
| **Week 2** | **Partner Invite** | One parent invites the other via email/SMS link. Deep link opens the app (or App Store if not installed). Second parent creates account, auto-joins household. Both parents see shared data immediately via Realtime. |
| **Week 3** | **Push Notifications** | APNs integration. Morning briefing (7am): today's schedule summary. Evening briefing (8pm): tomorrow preview + any open items. Conflict alerts in real-time. Device token registration and management. |
| **Week 3** | **Subscription (RevenueCat)** | RevenueCat SDK integration. Starter ($29/mo) and Family ($49/mo) plans configured in App Store Connect. Paywall screen. 7-day free trial. Restore purchases. Receipt validation. |

**Phase 1 exit criteria:** Two parents can sign up, see a shared schedule, chat with Kin, get morning/evening push notifications, and subscribe. This is the TestFlight build.

### Phase 2: Polish + Widgets (2 weeks — April 28 to May 11)

**Goal:** App Store submission quality. The app feels premium.

| Week | Build | Details |
|------|-------|---------|
| **Week 4** | **Home Screen Widget** | Small + Medium Today's Schedule widget. App Group data bridge. SwiftUI widget UI with Kin's color palette. Timeline updates on schedule changes. |
| **Week 4** | **Grocery + Todo Lists** | Shared grocery list with real-time sync. Check-off animation. Auto-sort checked items. Private + shared todo lists. Swipe actions (delete, complete). |
| **Week 5** | **UI Polish Pass** | Navigation transitions (shared element transitions for schedule → detail). Loading skeletons. Error states. Empty states with Kin personality. Dark mode refinement. Typography audit. Safe area handling across all iPhone sizes. Accessibility pass (VoiceOver, Dynamic Type). |
| **Week 5** | **App Store Submission Prep** | Screenshots (6.7" and 6.1" required). App Preview video (optional but high-impact). App Store description and metadata. Privacy nutrition label. App Review information. Submit for review. |

**Phase 2 exit criteria:** App approved on App Store. Home Screen widget working. Lists feature complete. UI feels Apple-grade.

### Phase 3: Advanced Features (3 weeks — May 12 to June 1)

| Week | Build | Details |
|------|-------|---------|
| **Week 6** | **Calendar Sync** | Google Calendar OAuth + 2-way sync (per Build Brief spec). Apple Calendar CalDAV sync. Conflict detection on merged household view. |
| **Week 7** | **Live Activities + Lock Screen Widgets** | Dynamic Island showing current/next event. Lock Screen widget (rectangular: next event). Live Activity state management. |
| **Week 7** | **Meal Planning + Budget** | AI meal planning through chat. Recipe display. Recipe → grocery list push. Budget dashboard with manual entry. |
| **Week 8** | **Watch App (basic)** | Complication showing next event. Scrollable today view. Grocery list with check-off. Watch Connectivity bridge. |

### What Ships as App Store v1.0?

**Phase 1 + Phase 2 = v1.0.** Specifically:

- Conversational AI onboarding
- Daily schedule management (create, edit, view events)
- AI chat with family context
- Morning + evening push notification briefings
- Partner invite and real-time household sync
- Home Screen widgets (Today's Schedule)
- Grocery list + todo lists with real-time sync
- Subscription management (RevenueCat)
- Premium dark UI

**What's NOT in v1.0:** Calendar sync with Google/Apple (ship in v1.1), Live Activities (v1.2), Watch app (v1.3), meal planning (v1.1), budget tracking (v1.2), Siri Shortcuts (v1.3).

This is a deliberate choice. The first value moment is the daily schedule + AI assistant + push briefings. Calendar sync is important but complex — shipping it in v1.0 risks delaying launch by 2+ weeks for a feature that can be added in the first update. Parents can manually add events in v1.0. They'll sync external calendars in v1.1.

---

## 5. App Store Strategy

### 5.1 App Store Optimization (ASO)

**App Name:** Kin — Family Organizer

The name must include the primary keyword. "Family Organizer" is the highest-volume search term in this category (ahead of "family calendar", "family planner", "family app"). Apple allows 30 characters for the name.

**Subtitle (30 chars):** "AI-Powered Family Schedule"

**Keywords field (100 chars):** `family,calendar,schedule,planner,organizer,meal,grocery,list,couples,parents,household,AI,assistant`

Note: Separate with commas, no spaces after commas. Don't repeat words that appear in the app name or subtitle — Apple already indexes those.

**Category:** Primary: **Productivity**. Secondary: **Lifestyle**.

Productivity ranks Kin alongside calendars and task managers, which is the comparison that favors Kin's feature set. Lifestyle is too broad and puts Kin alongside dating apps and habit trackers.

### 5.2 Screenshots and Preview Strategy

**Screenshots (required):**

Apple requires screenshots for 6.7" (iPhone 15 Pro Max / 16 Pro Max) and 6.1" (iPhone 15 Pro / 16 Pro). Design 6 screenshots in this order:

1. **Daily Schedule** — Hero shot. Clean timeline view, events color-coded by family member. Headline: "Your family's day, at a glance."
2. **AI Chat** — Kin responding to "What's happening this week?" with a smart summary. Headline: "An AI that knows your family."
3. **Push Briefing** — Lock screen showing the morning briefing notification. Headline: "Start every morning informed."
4. **Partner Sync** — Split view showing both parents' apps with a shared grocery list. Headline: "Finally, on the same page."
5. **Home Screen Widget** — iPhone home screen with the Kin schedule widget. Headline: "Your schedule, without opening an app."
6. **Onboarding** — The conversational onboarding screen. Headline: "Set up in 2 minutes. No forms."

**App Preview Video (30 seconds, highly recommended):**

Show the morning flow: wake up → glance at widget → open app → see schedule → ask Kin "what should we have for dinner?" → get answer → check off grocery item. Record on a real device. Use screen recording with `ReplayKit` or QuickTime.

### 5.3 App Review Process

**Expected timeline:** 1-3 business days for initial review. First submissions sometimes take longer.

**Common rejection risks for Kin and mitigations:**

| Risk | Mitigation |
|------|-----------|
| **Guideline 3.1.1 — In-App Purchase** | All subscriptions through StoreKit 2 / RevenueCat. No external payment links. No mention of pricing on web. |
| **Guideline 5.1.2 — Data Use and Sharing** | Privacy nutrition label must be accurate. Declare all data types collected. AI chat data is processed by Anthropic — disclose in privacy policy. |
| **Guideline 4.0 — Design (minimum functionality)** | v1.0 must have enough features to not feel like a shell. Schedule + Chat + Lists + Notifications is sufficient. |
| **Guideline 2.3.1 — Hidden Features** | Don't hide subscription management. Settings → Subscription must be accessible. |

**Before submission checklist:**
- Privacy policy URL (host at kinai.family/privacy)
- Terms of service URL (host at kinai.family/terms)
- Support URL (host at kinai.family/support)
- Sign in with Apple implemented (required if any third-party login is offered)
- App Tracking Transparency prompt if any tracking (likely not needed for v1)
- All test/demo accounts removed
- No placeholder content in the app

### 5.4 In-App Purchase: RevenueCat vs. Native StoreKit 2

**Use RevenueCat.** Here's why:

| Factor | RevenueCat | StoreKit 2 Native |
|--------|-----------|-------------------|
| Implementation time | 1-2 days | 3-5 days |
| Receipt validation | Handled server-side automatically | You build and maintain validation logic |
| Analytics | Dashboard with MRR, churn, trial conversion | You build analytics from scratch |
| Cross-platform | Same SDK works if you ever ship Android | iOS only |
| Webhook to Supabase | Built-in webhook on subscription events | You build a server to process App Store Server Notifications |
| Price testing | A/B test prices from dashboard | Requires App Store Connect experiments |
| Stripe coordination | Can unify web (Stripe) + mobile (App Store) subscriber data | You build custom logic to reconcile |
| Cost | Free under $2.5k MRR, then 1% of tracked revenue | Free |

RevenueCat's 1% fee above $2.5k MRR is trivially cheap compared to the engineering time saved. And critically, RevenueCat provides a single source of truth for subscriber status across web (Stripe) and mobile (App Store) — you'll need this when users sign up on web and then switch to the iOS app.

### 5.5 Pricing and Apple's Cut

Apple takes 30% of all in-app subscription revenue in Year 1, dropping to 15% in Year 2 for subscribers who stay >12 months. Apple also reduced the cut to 15% for developers earning under $1M/year (Small Business Program) — Kin qualifies.

**So Apple takes 15%, not 30%, from day one** as long as Kin is enrolled in the App Store Small Business Program. Enroll via App Store Connect → Agreements.

**Pricing math:**

| Plan | App Store Price | Apple's 15% Cut | Net to Kin | vs. Web (Stripe 2.9%) |
|------|----------------|-----------------|------------|----------------------|
| Starter | $29.99/mo | $4.50 | $25.49 | $28.13 (web) |
| Family | $49.99/mo | $7.50 | $42.49 | $48.55 (web) |

The ~$2.50-$6 difference per subscriber vs. web is the cost of iOS distribution. It's worth it — App Store subscribers have higher retention than web subscribers because cancellation requires navigating iOS Settings, and the trust signal of "I got this from the App Store" reduces churn.

**Price point notes:**
- App Store prices must match Apple's price tier grid. $29.99 and $49.99 are standard tiers.
- Consider a $99.99/year annual option (effectively ~$8.33/mo) — annual plans have 60-80% lower churn and Apple takes 15% on year 1.
- The annual plan is a strong upsell: show it on the paywall as "Save 72%" next to the monthly price.

---

## 6. Development Workflow

### 6.1 AI Coding Tools with Expo/React Native

Claude Code works exceptionally well with Expo/React Native because the entire stack is TypeScript. Specific strengths:

**What Claude Code handles well (agent tasks):**
- Generating React Native components from design descriptions
- Writing Supabase queries with proper TypeScript types
- Building navigation stacks and screen layouts
- Implementing Realtime subscriptions
- Writing Zod validation schemas
- Building the AI chat streaming interface
- RevenueCat SDK integration
- Push notification registration and handling
- Writing unit tests with Jest + React Native Testing Library
- Generating App Store metadata (descriptions, keywords)

**What requires human judgment (Austin tasks):**
- Architecture decisions (this document)
- App Store Connect configuration (certificates, provisioning profiles, screenshots)
- Apple Developer Program setup (APNs keys, App Groups, entitlements)
- Design review — does this *feel* premium?
- Testing on a physical device (no substitute for this)
- User-facing copy review (AI can draft, Austin approves)
- Subscription pricing decisions
- Privacy policy content (legal implications)

**What requires bounded Swift code (agent-assisted, human-reviewed):**
- Widget Extension (SwiftUI, ~200 lines)
- Notification Service Extension (~100 lines)
- Live Activities (SwiftUI, ~150 lines)
- Watch App (SwiftUI, ~500 lines)
- Siri Intents Extension (~200 lines)

These Swift files are small, well-documented by Apple, and Claude Code can generate them with guidance. Austin reviews and tests on device.

### 6.2 CI/CD Pipeline

**Use EAS Build + EAS Submit. Do not set up Fastlane.**

Fastlane is powerful but complex — it requires Ruby, Bundler, and extensive configuration. EAS (Expo Application Services) handles the same workflow with zero local setup:

```
Developer pushes code
        │
        ▼
EAS Build (cloud)
├── Builds iOS binary (.ipa)
├── Signs with distribution certificate (managed by EAS)
├── Runs on Expo's macOS build servers (no Mac needed for CI)
        │
        ▼
EAS Submit
├── Uploads to TestFlight (for internal testing)
├── Or uploads to App Store Connect (for review)
        │
        ▼
TestFlight
├── Internal testers get build automatically
├── External testers get build after brief Apple review
```

**Configuration:**

```json
// eas.json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "preview": {
      "distribution": "internal",
      "ios": { "buildConfiguration": "Release" }
    },
    "production": {
      "ios": { "buildConfiguration": "Release" }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "austin.ford1519@gmail.com",
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",
        "appleTeamId": "YOUR_TEAM_ID"
      }
    }
  }
}
```

**Build triggers:**
- `eas build --platform ios --profile preview` → TestFlight build (run after each phase milestone)
- `eas build --platform ios --profile production` + `eas submit --platform ios` → App Store submission

### 6.3 Testing Strategy

| Layer | Tool | What to Test | When |
|-------|------|-------------|------|
| **Unit** | Jest + React Native Testing Library | Business logic (conflict detection, context compression, date formatting), component rendering, state management | Every PR / agent task |
| **Integration** | Jest + MSW (Mock Service Worker) | Supabase query helpers, AI chat message formatting, push notification payload construction | Weekly |
| **E2E** | Maestro | Full flows: sign up → onboarding → create event → see on schedule → get push notification. Partner invite flow. Subscription flow. | Before each TestFlight build |
| **Device** | Physical iPhone (Austin) | Haptics feel right, animations are smooth, widgets render correctly, push notifications arrive, battery impact is acceptable | Before each TestFlight build |
| **Performance** | Xcode Instruments (via EAS dev build) | App launch time <2s, screen transition <300ms, scroll at 60fps, memory under 150MB | Before App Store submission |

**Maestro** is the recommended E2E framework for React Native. It's YAML-based, doesn't require writing test code, and works reliably with React Native (unlike Detox, which has persistent flakiness issues):

```yaml
# maestro/flows/onboarding.yaml
appId: family.kinai.app
---
- launchApp
- tapOn: "Get Started"
- assertVisible: "Tell me about your family"
- tapOn: "input-field"
- inputText: "We're a family of 4 with two kids"
- tapOn: "Send"
- assertVisible: "Schedule" # navigated to main app
```

### 6.4 Estimated Agent vs. Human Task Split

| Category | Agent (Claude Code) | Human (Austin) |
|----------|-------------------|----------------|
| **UI Components** | 90% — generate, style, wire up | 10% — review feel, approve design |
| **API / Data Layer** | 95% — Supabase queries, Edge Functions, types | 5% — review RLS policies |
| **Navigation** | 85% — stack setup, deep links | 15% — test transitions on device |
| **Push Notifications** | 70% — code implementation | 30% — APNs cert setup, test on device |
| **Widgets (Swift)** | 60% — generate SwiftUI code | 40% — test on device, debug Xcode |
| **RevenueCat** | 80% — SDK integration | 20% — App Store Connect config, pricing |
| **App Store Submission** | 30% — generate metadata, descriptions | 70% — screenshots, review, submit |
| **Testing** | 80% — write tests, run CI | 20% — device testing, UX judgment |

**Overall split: ~75% agent, ~25% Austin.** The 25% is mostly decisions, device testing, and Apple ecosystem configuration that can't be done from a terminal.

---

## 7. What to Reuse from Web

### 7.1 100% Reusable (No Changes)

| Asset | Location | Notes |
|-------|----------|-------|
| **Supabase schema** | Supabase dashboard / migrations | All tables, columns, relationships. The schema is app-agnostic. |
| **Row-Level Security policies** | Supabase dashboard | RLS policies enforce authorization at the database layer. The iOS app uses the same `supabase-js` client with the same anon key — RLS works identically. |
| **Supabase Edge Functions** | `supabase/functions/` | AI chat, calendar sync, partner invite — all are HTTP endpoints the mobile app calls the same way the web app does. |
| **Supabase Auth configuration** | Supabase dashboard | Email auth works. Add Apple Sign-In as a new provider (required for iOS). Google OAuth already configured for web — add the iOS client ID. |
| **AI system prompt** | `Kin_System_Prompt_v1.md` | The family context model, personality, and response patterns are platform-agnostic. |
| **Stripe webhook handler** | Edge Function | Web subscribers still pay through Stripe. The handler doesn't change. |
| **Environment variables** | Supabase secrets | Same Anthropic key, same Google Calendar credentials, same Stripe keys. |

### 7.2 Reusable with Adaptation (packages/shared)

| Asset | What Changes |
|-------|-------------|
| **TypeScript types** | Generated from Supabase schema — identical. May need to extract into `packages/shared/types/` if not already there. |
| **Validation schemas (Zod)** | Identical logic, just need to be importable from the shared package. |
| **Business logic** | Conflict detection, date math, context compression, meal plan generation logic — all pure TypeScript functions that work anywhere. Move to `packages/shared/utils/`. |
| **API client** | The Supabase client factory needs platform-specific storage config (`AsyncStorage` for React Native vs. `localStorage` for web). Create a factory function that accepts a storage adapter. |
| **Constants** | Plan tiers, category names, limits, feature flags — extract to `packages/shared/constants/`. |

### 7.3 Must Rebuild for Native

| Component | Why It Can't Be Reused | iOS Approach |
|-----------|----------------------|-------------|
| **All UI components** | Next.js uses HTML/CSS/Tailwind. React Native uses `<View>`, `<Text>`, `StyleSheet`. Zero overlap in rendering layer. | Rebuild with React Native components + `react-native-reanimated` for animations. Use the same design tokens (colors, spacing, typography scale) extracted into `packages/shared/theme/`. |
| **Navigation** | Next.js uses file-based routing (`app/` directory). | React Navigation with native stack navigator. Define stack and tab navigators in `apps/mobile/navigation/`. |
| **Auth flow UI** | Web auth uses Next.js pages with Tailwind forms. | Rebuild with React Native components. Add Apple Sign-In button (required for App Store). Supabase auth *logic* is reusable — only the UI changes. |
| **Push notifications** | Web has no push notification infrastructure. | Build from scratch: `expo-notifications`, APNs registration, device token storage, Edge Function for sending. |
| **Storage/caching** | Web uses browser localStorage/sessionStorage. | `@react-native-async-storage/async-storage` for local persistence. React Query for server state caching. |
| **Payments UI** | Web uses Stripe Checkout (redirect-based). | RevenueCat SDK with native paywall UI. Completely different payment UX. |

### 7.4 Brand Assets and Design Tokens

**Extract these into `packages/shared/theme/` for cross-platform use:**

```typescript
// packages/shared/theme/colors.ts
export const colors = {
  // Core palette (from Brand Guide v2)
  background: '#0A0A0F',      // Deep dark
  surface: '#141420',          // Card backgrounds
  surfaceElevated: '#1E1E2E', // Modals, sheets
  primary: '#6366F1',          // Indigo — primary actions
  primaryLight: '#818CF8',     // Hover/active states
  accent: '#F59E0B',           // Amber — highlights, warnings
  textPrimary: '#F8FAFC',      // White-ish body text
  textSecondary: '#94A3B8',    // Muted text
  textTertiary: '#64748B',     // Timestamps, labels
  success: '#10B981',          // Confirmations
  error: '#EF4444',            // Errors, destructive
  // Family member colors
  parent1: '#6366F1',          // Indigo
  parent2: '#EC4899',          // Pink
  child1: '#14B8A6',           // Teal
  child2: '#F97316',           // Orange
  shared: '#8B5CF6',           // Purple — household events
}

// packages/shared/theme/spacing.ts
export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48
}

// packages/shared/theme/typography.ts
export const typography = {
  // Use SF Pro (system font) on iOS — no custom font files needed
  sizes: { caption: 12, body: 16, title: 20, headline: 28, hero: 34 },
  weights: { regular: '400', medium: '500', semibold: '600', bold: '700' },
}
```

**Assets to transfer:**
- App icon (1024×1024 required for App Store, Expo generates all sizes)
- Kin logo (SVG for splash screen)
- Onboarding illustrations (if any exist — otherwise generate for mobile)
- Any Lottie animations from the web app

---

## Appendix: Quick Reference

### Key Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Expo SDK 54 (React Native) | Existing scaffolding, TS everywhere, best AI tool support |
| Backend | Supabase (keep as-is) | Already built, RLS works, no API server needed |
| Payments (mobile) | RevenueCat | Receipt validation, analytics, Stripe unification |
| Payments (web) | Stripe (keep as-is) | Already integrated |
| Push notifications | expo-notifications + APNs | Direct APNs for control, Expo for convenience |
| CI/CD | EAS Build + EAS Submit | No Fastlane/Ruby complexity, cloud builds |
| E2E testing | Maestro | YAML-based, reliable with RN, no Detox flakiness |
| State management | React Query + Zustand | Server state (RQ) + client state (Zustand), minimal boilerplate |
| Offline | Optimistic UI + cached reads | Full offline deferred to post-launch |
| Calendar sync | v1.1 (not v1.0) | Complex, can delay launch. Manual events are fine for v1.0. |

### Critical Path to App Store v1.0

```
Week 1: Auth + Onboarding + Schedule Screen
Week 2: AI Chat + Partner Invite
Week 3: Push Notifications + RevenueCat
Week 4: Widgets + Lists
Week 5: Polish + App Store Submission
       ─────────────────────────────────
       Target: App Store v1.0 live by May 11, 2026
```

### Austin's Weekly Time Allocation (2.5 hrs/day)

| Day | Focus |
|-----|-------|
| Mon | Review weekend agent output. Architecture decisions for the week. |
| Tue–Thu | Test on device. Review PRs. Approve AI-generated code. Fix issues found in testing. |
| Fri | App Store prep (screenshots, metadata, TestFlight distribution). Week review. |
| Sat–Sun | Agent runs longer tasks (full feature implementation). Austin reviews Sunday evening. |

---

*Kin Technologies LLC · kinai.family · Confidential*
*This document drives engineering agent work. Treat all product details as confidential.*
