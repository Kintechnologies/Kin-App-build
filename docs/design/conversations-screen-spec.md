# Conversations Screen — Component Spec
**Owner:** Product & Design
**Status:** Ready for engineering
**Date:** 2026-04-03
**Ref spec:** `kin-v0-product-spec.md` §2

---

## Overview

The Conversations screen is the user's history with Kin — and with their household. It is a list of threads (personal + household), each representing an ongoing relationship with a topic, a day, or a coordination issue. It should feel like the Claude sidebar or a Messages app: familiar, clean, and navigable without explanation.

The screen has two modes:
1. **List view** — scrollable thread list (default)
2. **Conversation view** — open thread (replaces list view, full screen)

---

## Navigation Model

```
ConversationsScreen
├── ConversationList (default)
│   └── ConversationRow → taps to → ConversationView
│       └── ConversationView (full screen, back button returns to list)
└── NewConversationButton (+) → opens new blank ConversationView
```

No nested navigation tabs. The list and conversation view are the two states of this screen.

---

## Components — List View

---

### 1. ConversationsListHeader

**Purpose:** Screen title + new conversation button.

**Props:**
```typescript
interface ConversationsListHeaderProps {
  onNewConversation: () => void;
}
```

**Rendered content:**
- Title: `"Conversations"` — SF Pro Display, 28pt, weight 600, warm-white
- Right side: `+` button — 44×44pt tap target, `+` icon in warm-white/70, no border, no background
- `+` tap → `onNewConversation()` — opens blank ConversationView, Kin responds with context-aware opener

**Layout:**
- Horizontal padding: 20pt
- Top padding: 16pt (below safe area)
- Title + button are vertically centered in a 44pt tall row
- Bottom margin before list: 12pt

---

### 2. ConversationRow

**Purpose:** Single thread item in the list. Scannable at a glance.

**Props:**
```typescript
interface ConversationRowProps {
  thread: {
    id: string;
    title: string;             // auto-titled by Kin, e.g. "Pickup coverage — Tuesday"
    lastMessage: string;       // truncated preview of last message
    lastMessageAt: Date;
    isPrivate: boolean;        // false = household thread (shared)
    hasUnread: boolean;        // Kin has responded since last read
    initiatedByKin: boolean;   // Kin started this thread
  };
  onTap: (threadId: string) => void;
  onSwipeDelete?: (threadId: string) => void;
}
```

**Layout:**
```
[ indicator ] [ title + preview ] [ timestamp ]
```

- Row height: 68pt
- Horizontal padding: 20pt
- Vertical padding: 12pt top + bottom

**Left indicator (8pt wide):**
- Private thread (lock icon): no indicator
- Household thread (globe icon): 2pt amber `#D4A843` vertical bar on left edge
- This is the only visual distinction between private and household threads — not a label, a color signal

**Center content:**
- Title row: thread title in 15pt SF Pro Text weight 600, warm-white, 1 line truncated
  - If `hasUnread`: blue dot (6pt) left of title — `#7AADCE`
  - If `initiatedByKin`: no special label — the title makes it clear (e.g., "Conflict flagged — Thursday pickup")
- Preview row: last message in 13pt SF Pro Text weight 400, warm-white/45, 1 line truncated
  - If last message is from Kin: prefix `"Kin: "` in warm-white/30, then content

**Right content:**
- Timestamp: relative time — `"9:04am"`, `"Yesterday"`, `"Mon"` — 12pt SF Pro Text, warm-white/35
- Vertically aligned to title row

**States:**

**Unread:**
- Title weight: 600 (no change — always 600 for clarity)
- Blue unread dot visible

**Read:**
- No dot

**Pinned (household thread):**
- Amber left bar visible
- Row background: `rgba(212,168,67,0.04)` — very subtle warm tint

**Interaction:**
- Tap → `onTap()` → transition to ConversationView (slide left, standard iOS push)
- Swipe left → reveal delete action (soft red, `"Delete"` label) — confirmation required before delete

---

### 3. PinnedSection

**Purpose:** The household thread (shared with partner) is always surfaced first — it's the coordination hub.

**Props:**
```typescript
interface PinnedSectionProps {
  householdThread: ConversationThread | null;
  partnerLinked: boolean;
  onTap: (threadId: string) => void;
  onInvitePartner: () => void;
}
```

**States:**

**Partner linked, thread active:**
- Small section label: `"HOUSEHOLD"` — 11pt caps, warm-white/35
- The household ConversationRow (amber bar, shared indicator)
- 12pt divider below before personal threads

**Partner not linked:**
- Small nudge row (not a full card): `"Invite your partner to enable household coordination"` in 13pt, warm-white/40
- Right side: `"Invite →"` in `#7AADCE`, 13pt
- Taps `onInvitePartner()` → Settings → Family section
- 12pt divider below

---

### 4. ConversationListView (Screen)

**Full structure:**
```
SafeAreaView
└── View
    ├── ConversationsListHeader
    ├── PinnedSection (household thread or invite nudge)
    ├── FlatList (personal threads, sorted by lastMessageAt desc)
    │   └── ConversationRow × n
    └── EmptyState (if no personal threads yet)
```

**EmptyState:**
- Center of list area (not full screen)
- `"No conversations yet."` in 15pt, warm-white/35
- Below: `"Tap + to start talking with Kin."` in 13pt, warm-white/25
- No illustration

**Loading:**
- 4 skeleton ConversationRow placeholders (title line + preview line, warm-white/08, pulsing)

---

## Components — Conversation View

---

### 5. ConversationViewHeader

**Purpose:** Back button + thread title + thread type indicator.

**Props:**
```typescript
interface ConversationViewHeaderProps {
  title: string;
  isHousehold: boolean;
  onBack: () => void;
}
```

**Rendered content:**
- Back button: `"‹"` chevron + `"Conversations"` label, warm-white/70, 15pt — iOS standard back button style
- Center: thread title, SF Pro Text 16pt weight 600, warm-white, 1 line truncated
- Right: if household thread, small amber `"household"` pill (10pt, warm-white, amber/20 bg) — otherwise nothing

**Layout:**
- Standard iOS navigation bar height (44pt + safe area)
- Background: matches screen bg (no separate header bg)

---

### 6. MessageBubble

**Purpose:** Individual message in the conversation.

**Props:**
```typescript
interface MessageBubbleProps {
  message: {
    id: string;
    role: 'user' | 'assistant';  // 'assistant' = Kin
    content: string;
    createdAt: Date;
    senderName?: string;          // for household threads with multiple humans
  };
}
```

**User message:**
- Right-aligned
- Background: `#7CB87A` with 20% opacity — `rgba(124,184,122,0.20)`, 1pt border `rgba(124,184,122,0.25)`
- Text: 15pt SF Pro Text, warm-white, line-height 22pt
- Border radius: 18pt, bottom-right corner 4pt (speech bubble shape)
- Max width: 78% of screen width

**Kin message:**
- Left-aligned
- Background: `rgba(255,255,255,0.06)`, 1pt border `rgba(255,255,255,0.09)`
- Text: 15pt SF Pro Text, warm-white, line-height 22pt
- Border radius: 18pt, bottom-left corner 4pt
- Max width: 85% of screen width (Kin gets slightly more room — messages can be 2 sentences)
- No avatar. No "Kin" label prefix. The visual alignment is sufficient.

**Timestamp:**
- Shown once per group (messages within 5 min of each other = one group)
- Centered, 11pt, warm-white/25
- Format: `"9:14 AM"` — not relative for in-conversation messages

**Household sender label:**
- Only in household threads, for human messages
- Small label above bubble: sender's first name, 11pt warm-white/35
- Kin messages in household threads have no label (Kin is Kin)

---

### 7. MessageInput

**Purpose:** Text input + send. No voice (deferred). No image attachment (deferred).

**Props:**
```typescript
interface MessageInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  isLoading: boolean;
  placeholder: string;
}
```

**Layout:**
```
[ TextInput (grows) ] [ SendButton ]
```

- Background: `rgba(255,255,255,0.06)`, 1pt border `rgba(255,255,255,0.09)`, 22pt border radius
- TextInput: SF Pro Text 15pt, warm-white, multiline, scrollable, max 6 lines before scroll
- SendButton: 36×36pt, filled circle `#7CB87A`, arrow-up icon white
  - Disabled state (empty input): button opacity 0.35, not tappable
  - Loading state (waiting for Kin): button shows circular progress indicator, not tappable
- Keyboard avoidance: `KeyboardAvoidingView` with `behavior="padding"` on iOS
- Safe area inset: respects bottom safe area (iPhone home bar)

**Placeholder text:**
- Personal thread: `"Message Kin…"`
- Household thread: `"Message Kin and {partnerName}…"`

---

### 8. KinTypingIndicator

**Purpose:** Shows while Kin is generating a response.

**Props:**
```typescript
interface KinTypingIndicatorProps {
  visible: boolean;
}
```

**Rendered content:**
- Left-aligned (matches Kin bubble position)
- Three animated dots, staggered fade/scale: `•  •  •`
- Background: same as Kin bubble (`rgba(255,255,255,0.06)`)
- Width: 56pt (just wide enough for three dots)
- Appears with 150ms fade-in after send; disappears when first token arrives

---

### 9. ConversationView (Screen)

**Full structure:**
```
SafeAreaView
└── KeyboardAvoidingView
    ├── ConversationViewHeader
    ├── FlatList (messages, inverted — newest at bottom)
    │   ├── MessageBubble × n
    │   └── KinTypingIndicator (at bottom when loading)
    └── MessageInput
```

**Scroll behavior:**
- FlatList inverted: newest messages at bottom, scrolls up for history
- Auto-scroll to bottom on new message
- No "jump to latest" button — list stays anchored to bottom by default

**Empty state (new conversation):**
- No "hello" message, no welcome prompt
- Single Kin message appears automatically: context-aware opener based on time of day + any active coordination context
- Example: `"What's on your mind?"` — only if no coordination context available
- If coordination context exists: Kin opens with relevant info first

---

## Quick Reply Chips (Conversation View Only)

Shown only when the conversation is new (< 3 messages) and there's no current input text.

**Purpose:** Reduce friction for common conversation openers. Not an evergreen UI element.

**Max 3 chips.** Selected based on time of day + current household state:

| Time / Context | Chips |
|---|---|
| Morning + active alert | `"Tell me more"`, `"I've got it"`, `"Check with my partner"` |
| Morning, no alert | `"What does today look like?"`, `"Who has pickup today?"`, `"What should I know?"` |
| Afternoon | `"Anything I should know before I leave?"`, `"How's the evening looking?"` |
| Evening | `"What's the plan for tonight?"`, `"What do I need to sort before tomorrow?"` |

**Styling:**
- Horizontal scroll row, below FlatList, above MessageInput
- Each chip: `rgba(255,255,255,0.07)` bg, 1pt border `rgba(255,255,255,0.10)`, 20pt radius, 12pt horizontal padding, 8pt vertical
- Text: 13pt SF Pro Text, warm-white/75
- Tap: populates MessageInput with chip text, focuses input (user confirms before sending — chips are suggestions, not auto-sends)
- Chips disappear after 3rd message in thread

---

## Static Copy

| Location | Copy |
|----------|------|
| Screen title | `"Conversations"` |
| New thread button | `"+"` |
| Empty state | `"No conversations yet."` |
| Empty state sub | `"Tap + to start talking with Kin."` |
| Invite nudge | `"Invite your partner to enable household coordination"` |
| Invite CTA | `"Invite →"` |
| Message placeholder (personal) | `"Message Kin…"` |
| Message placeholder (household) | `"Message Kin and {partnerName}…"` |
| Household section label | `"HOUSEHOLD"` |

---

## Spacing & Layout

| Element | Value |
|---------|-------|
| Screen horizontal padding | 20pt |
| List header top | 16pt |
| Row height | 68pt |
| Row internal padding | 12pt top/bottom |
| Thread list → input | grows to fill |
| Message horizontal padding | 16pt |
| Bubble max width (user) | 78% screen |
| Bubble max width (Kin) | 85% screen |
| Bubble spacing | 8pt between same-sender, 16pt between sender switch |
| Input container padding | 10pt vertical, 12pt horizontal |
| Input bottom safe area | env(safe-area-inset-bottom) |

---

## What This Screen Is NOT

- Not a support chat widget (no "how can I help you?" opener every time)
- Not a feature menu (no chips for "meals", "budget", "fitness" — those domains surface through Kin's intelligence, not UI shortcuts)
- Not a chatbot (no avatar, no personality branding, no "Hi! I'm Kin!")
- Not a notification inbox (Kin-initiated conversations appear here, but they look like regular threads — not push alerts rendered as messages)

The feel should be: this is where I talk to the person in my household who knows everything. Clean, private-feeling, and fast.

---

*Spec produced by Product & Design — 2026-04-03*
