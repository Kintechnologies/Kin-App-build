# Today Screen — Component Spec
**Owner:** Product & Design
**Status:** Ready for engineering
**Date:** 2026-04-03
**Ref spec:** `kin-v0-product-spec.md` §1

---

## Overview

The Today screen is the launch screen and the primary value surface. It must read as a single coherent briefing — not a dashboard of cards. The user should feel oriented within 3 seconds: what's happening, what Kin has figured out, and whether anything needs their attention.

**Design principle:** The morning briefing card is the hero. Everything else is secondary. The eye must land on the briefing first, then flow down naturally.

---

## Screen Structure (top to bottom)

```
SafeAreaView
└── ScrollView (single-scroll, no pagination)
    ├── Header
    ├── MorningBriefingCard        ← PRIMARY ELEMENT
    ├── ActiveAlertCard            ← conditional, one at a time
    ├── TodayScheduleSection
    └── KinCheckInCards            ← max 2, conditional
```

No bottom nav tab bar is built into this file — that lives in `_layout.tsx`.

---

## Components

---

### 1. Header

**Purpose:** Time-aware greeting + date anchor.

**Props:**
```typescript
interface HeaderProps {
  firstName: string;          // Primary user's first name ("Austin")
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  date: Date;
}
```

**Rendered content:**
- Greeting line: `"Good morning, {firstName}"` — system font, large, warm-white
- Date line: `"Friday, April 3"` — smaller, warm-white/50
- No avatar, no notification bell, no hamburger menu

**Layout notes:**
- Top padding: 16pt above greeting (below safe area)
- Horizontal padding: 20pt both sides
- Greeting: SF Pro Display, 28pt, weight 600
- Date: SF Pro Text, 14pt, weight 400, warm-white/50
- Bottom margin before briefing card: 20pt

**States:**
- Default: resolved name
- Loading: greeting shows without name — `"Good morning"` — never shows empty string or placeholder

---

### 2. MorningBriefingCard

**Purpose:** The primary AI output. One message per user, per day. This is what the user came to see.

**Props:**
```typescript
interface MorningBriefingCardProps {
  content: string | null;
  status: 'generated' | 'sent' | 'failed' | 'none';
  generatedAt: Date | null;
  onTap?: () => void;   // opens conversation thread for this briefing day
}
```

**States:**

**Default (content present):**
- Full-width card, rounded corners (16pt radius)
- Background: slightly elevated surface — `rgba(255,255,255,0.06)` on dark bg, with `1px` border `rgba(255,255,255,0.10)`
- No icon. No header label. The briefing text IS the content.
- Briefing text: SF Pro Text, 17pt, weight 400, warm-white, line-height 26pt
- Subtle visual indicator it's from Kin: small `BRIEFING` label in 10pt caps, warm-white/30, top-left corner of card — not a header, a quiet label
- Bottom of card: timestamp in 11pt warm-white/25 — `"Today at 7:02am"`
- Tap: opens conversation thread for this briefing

**Loading:**
- Card present, same dimensions
- Three lines of animated skeleton text (not spinner)
- Skeleton lines: warm-white/10, pulsing opacity 0.05↔0.15, 2s loop

**Empty / none (no briefing generated yet):**
- Card present at full width
- Single line: `"Your briefing will arrive this morning."` in 15pt, warm-white/40, centered
- If after 9am and no briefing: `"Briefing unavailable today — I'll have one for you tomorrow morning."`

**Failed:**
- Same card, single line: `"Couldn't load your briefing."` + small retry affordance (link-style, warm-white/50)
- No destructive red. Quiet failure.

**Visual dominance rules:**
- Card minimum height: 100pt (prevents it from looking like a chip when content is short)
- Card must be visually distinct from all other cards below it — larger corner radius (16pt vs. 12pt for others), slightly brighter background

**Interaction:**
- Tap anywhere on card → navigates to conversation thread associated with today's briefing
- No swipe-to-dismiss (this is the hero, it stays)
- Long-press: no action

---

### 3. ActiveAlertCard

**Purpose:** A real-time coordination flag. One at a time, dismissible. Visually distinct from the briefing — it's urgent, not ambient.

**Props:**
```typescript
interface ActiveAlertCardProps {
  alert: {
    id: string;
    content: string;            // 1 sentence, per intelligence engine §10
    urgencyLevel: 'standard' | 'high';  // maps to escalation tiers T-2 and T-45
    createdAt: Date;
    issueType: 'pickup_risk' | 'responsibility_shift' | 'schedule_compression' | 'late_change' | 'coverage_gap' | 'transition_risk';
  } | null;
  onDismiss: (alertId: string) => void;
  onTap: (alertId: string) => void;   // opens relevant conversation thread
}
```

**States:**

**Null / no active alert:**
- Renders nothing. No placeholder. Zero height. No "all clear" message here — that lives in the briefing.

**Standard urgency:**
- Full-width card, 12pt radius
- Left border accent (3pt): amber `#D4A843`
- Background: `rgba(212,168,67,0.08)`
- Alert text: SF Pro Text, 15pt, weight 500, warm-white
- Right side: small `✕` dismiss button (24×24pt tap target, warm-white/40)
- Timestamp: 11pt warm-white/30, below text

**High urgency (T-45 tier):**
- Same layout, elevated visual weight
- Left border accent (3pt): rose `#E57373`
- Background: `rgba(229,115,115,0.10)`
- Alert text: SF Pro Text, 15pt, weight 600, warm-white (slightly bolder)
- No dismiss on high-urgency — user must acknowledge via tap → conversation

**Interaction:**
- Tap body → `onTap()` → opens conversation thread for this issue
- Tap ✕ → `onDismiss()` → card slides up and fades out (200ms, spring easing)
- After dismiss: next queued alert surfaces (handled by parent screen state)
- Alert must not overlap or stack with MorningBriefingCard — rendered between briefing and schedule

**Layout notes:**
- Appears between MorningBriefingCard and TodayScheduleSection
- Top margin: 12pt from briefing card
- Bottom margin: 12pt before schedule section

---

### 4. TodayScheduleSection

**Purpose:** Combined view of both parents' calendar events for today, with kids' schedule overlaid. Coordination clarity, not a full calendar.

**Props:**
```typescript
interface TodayScheduleSectionProps {
  events: ScheduleEvent[];
  isLoading: boolean;
  calendarConnected: boolean;
  onEventTap: (event: ScheduleEvent) => void;
  onConnectCalendarTap: () => void;
}

interface ScheduleEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  owner: 'user' | 'partner' | 'kid';  // for color coding
  ownerName: string;
  isPickupWindow?: boolean;
  location?: string;
}
```

**States:**

**Calendar not connected:**
- Section header: `"Today"` in 13pt caps, warm-white/40
- Single row: `"Connect your calendar to see what's coming up"` — SF Pro Text, 14pt, warm-white/40
- Below that: `"Connect Calendar"` — link-style, `#7AADCE` (blue), taps `onConnectCalendarTap()`
- No empty state illustration. Text only.

**Loading:**
- Section header present
- 3 skeleton rows (event-height, warm-white/08, pulsing)

**Events present:**
- Section header: `"Today"` — 13pt caps, warm-white/40, with current date `"Apr 3"` right-aligned in same style
- Each event row:
  - Left edge: 2pt color bar (user = `#7CB87A` green, partner = `#7AADCE` blue, kid = `#D4A843` amber)
  - Time column: `"5:00 – 6:30"` — 12pt, GeistMono, warm-white/50, fixed width 80pt
  - Event title: 14pt SF Pro Text, warm-white, truncated at 1 line
  - Owner label: 11pt, warm-white/40 — `"Austin"` / `"[Partner]"` / `"Liam"`
  - If `isPickupWindow: true`: small pickup badge (amber dot + `"pickup"` in 10pt amber) — only for kid events
  - Row tap → `onEventTap()` — show event detail modal (simple sheet: full title, time, location, owner)

**Empty (calendar connected, no events today):**
- `"Nothing on the calendar today."` in 14pt, warm-white/35, vertically centered in section
- This is a legitimate empty state, not an error

**Max events shown:** 8. If more, append `"+ {n} more"` link in warm-white/40 that expands the list in-place (no nav).

**Layout notes:**
- Section header bottom margin: 8pt before first row
- Row height: 44pt minimum (touch target)
- Row padding: 12pt vertical, 0 horizontal (section handles horizontal padding)
- Divider between rows: 1pt warm-white/05

---

### 5. KinCheckInCards

**Purpose:** Kin-initiated contextual prompts. Gateway to deeper domains without extra tabs. Max 2 per day, only shown when no High-priority coordination issue is active.

**Props:**
```typescript
interface KinCheckInCardsProps {
  cards: KinCheckInCard[];   // 0–2 items
  onCardTap: (card: KinCheckInCard) => void;
  onDismiss: (cardId: string) => void;
}

interface KinCheckInCard {
  id: string;
  content: string;            // e.g. "Dinner's in 2 hours. Want me to pull something quick?"
  domain: 'meals' | 'home' | 'fitness' | 'general';
  actionLabel?: string;       // optional CTA label inside card
  createdAt: Date;
}
```

**States:**

**No cards (0 items):**
- Renders nothing. No empty state. No placeholder.

**1–2 cards:**
- Each card: full-width, 12pt radius
- Background: `rgba(255,255,255,0.04)` — quieter than briefing card
- Border: 1pt `rgba(255,255,255,0.07)`
- Card text: SF Pro Text, 15pt, warm-white/85
- Bottom-right: small `✕` dismiss (24×24pt, warm-white/30)
- If `actionLabel` present: small pill button below text — `#7CB87A` green bg with 10pt opacity, green text, 12pt, taps `onCardTap()`
- If no `actionLabel`: entire card is tappable → `onCardTap()`

**Interaction:**
- Tap card → `onCardTap()` → opens conversation thread with domain context pre-loaded
- Dismiss → `onDismiss()` → card slides out (same animation as alert dismiss)
- Cards should not both dismiss at once — each has independent dismiss

**Layout notes:**
- Section spacing: 24pt top margin from schedule section
- Gap between cards: 10pt
- No section header — check-in cards speak for themselves
- Bottom padding: 32pt (scrollable breathing room)

**Display condition (enforced by parent screen):**
- Hidden when an Active Alert with `urgencyLevel: 'high'` is showing
- Hidden when morning briefing has never loaded (first session, no data yet)

---

## Screen-Level State Management

```typescript
interface TodayScreenState {
  isLoading: boolean;
  profile: {
    firstName: string;
    timeOfDay: 'morning' | 'afternoon' | 'evening';
  };
  briefing: {
    content: string | null;
    status: 'generated' | 'sent' | 'failed' | 'none';
    generatedAt: Date | null;
    threadId: string | null;
  };
  activeAlert: ActiveAlert | null;     // max 1 visible
  alertQueue: ActiveAlert[];           // remaining alerts, surfaced on dismiss
  events: ScheduleEvent[];
  checkInCards: KinCheckInCard[];      // 0–2
  calendarConnected: boolean;
  error: string | null;
}
```

**Load sequence:**
1. On mount: load profile (firstName) → render header immediately
2. Parallel fetch: briefing content + events + active alerts + check-in cards
3. Briefing renders first (above fold) — show skeleton while fetching
4. Events and check-ins render after
5. Pull-to-refresh on ScrollView: re-fetches everything

**Alert queue behavior:**
- On load: fetch all OPEN alerts, sorted by priority (per intelligence engine §5)
- Show only `alertQueue[0]` as `activeAlert`
- On dismiss: `activeAlert = alertQueue[1]`, `alertQueue.shift()`
- On tap: mark alert ACKNOWLEDGED in DB, navigate to thread

---

## Navigation

| Action | Destination |
|--------|-------------|
| Tap briefing card | Conversations screen, thread for today's briefing |
| Tap alert card (body) | Conversations screen, thread for that alert's issue |
| Tap schedule event | EventDetailSheet (presented as bottom sheet) |
| Tap check-in card | Conversations screen, new thread with domain context |
| Tap "Connect Calendar" | Settings → Calendars section |

---

## Static Copy

| Location | Copy |
|----------|------|
| Header greeting | `"Good {timeOfDay}, {firstName}"` |
| Briefing loading | *(skeleton, no text)* |
| Briefing empty | `"Your briefing will arrive this morning."` |
| Briefing late empty | `"Briefing unavailable today — I'll have one for you tomorrow morning."` |
| Briefing failed | `"Couldn't load your briefing."` |
| Schedule label | `"Today"` |
| Calendar not connected | `"Connect your calendar to see what's coming up"` |
| Calendar CTA | `"Connect Calendar"` |
| No events today | `"Nothing on the calendar today."` |

---

## Spacing & Layout (Reference)

| Element | Value |
|---------|-------|
| Screen horizontal padding | 20pt |
| Header top (below safe area) | 16pt |
| Header → briefing card gap | 20pt |
| Briefing card → alert gap | 12pt |
| Alert card → schedule gap | 12pt |
| Schedule section → check-in cards gap | 24pt |
| Bottom padding | 32pt |
| Card border radius (briefing) | 16pt |
| Card border radius (alert, check-in) | 12pt |

---

## What This Screen Is NOT

- Not a dashboard of feature cards (no meals card, no budget card, no grocery card)
- Not a tab menu for other app sections
- Not paginated or horizontally scrollable
- Not an activity feed

The briefing is not a card in a feed — it IS the feed. It should feel like reading a message from someone who was already up thinking about your day.

---

*Spec produced by Product & Design — 2026-04-03*
