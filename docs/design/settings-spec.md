# Settings Screen — Component Spec
**Screen: Settings · Written by: Product & Design Lead · April 3, 2026**

---

## Purpose

Settings is the third and final main tab. It is the configuration layer — not a feature destination. Every section exists to make Kin more accurate, more personal, and more trusted. The screen should feel organized and calm, not overwhelming.

**Section order (non-negotiable, per product spec):**
Profile → Family → Calendars → Kin Memory → Notifications → Subscription → About

---

## Screen Architecture

```
┌─────────────────────────────────────┐
│  Settings                           │  ← Geist-SemiBold, 17pt, #F0EDE6, nav bar
│                                     │
│  ┌── My Profile ───────────────┐    │
│  │  [avatar]  Austin Ford      │    │
│  │           austin@...        │    │
│  └────────────────────────────┘    │
│                                     │
│  ┌── FAMILY ──────────────────┐    │
│  │  Partner                   ›    │
│  │  Kids                      ›    │
│  └────────────────────────────┘    │
│                                     │
│  ┌── CALENDARS ───────────────┐    │
│  │  Google Calendar           ›    │
│  │  Apple Calendar            ›    │
│  └────────────────────────────┘    │
│                                     │
│  ┌── KIN MEMORY ──────────────┐    │
│  │  What Kin knows            ›    │
│  └────────────────────────────┘    │
│                                     │
│  ┌── NOTIFICATIONS ───────────┐    │
│  │  Morning Briefing          ›    │
│  │  Coordination Alerts       ›    │
│  │  Check-ins                 ›    │
│  └────────────────────────────┘    │
│                                     │
│  ┌── SUBSCRIPTION ────────────┐    │
│  │  Trial / Plan status       ›    │
│  └────────────────────────────┘    │
│                                     │
│  ┌── ABOUT ───────────────────┐    │
│  │  App Version                    │
│  │  Privacy Policy            ›    │
│  │  Terms of Service          ›    │
│  │  Send Feedback             ›    │
│  │  Contact Support           ›    │
│  └────────────────────────────┘    │
│                                     │
│  Sign out                           │  ← Geist, 15pt, #E57373, centered, bottom
└─────────────────────────────────────┘
```

---

## Component: SettingsScreen

**File:** `apps/mobile/app/(tabs)/settings.tsx`

**Props:** none (pulls from auth context + Supabase directly)

**Sections:**

Each section is a grouped list (`SectionList` or equivalent). Section headers use `rgba(240,237,230,0.3)` uppercase Geist, 12pt, spaced 16pt above.

---

## Section 1: My Profile

**File sub-component:** `ProfileHeader`

**Props:**
```typescript
interface ProfileHeaderProps {
  name: string;
  email: string;
  avatarUri?: string;
}
```

**Layout:**
- Avatar: 48×48 circle. If `avatarUri` is present, show image. If not, show first initial of first name in `#7CB87A` on `rgba(124,184,122,0.15)` background.
- Name: Geist-SemiBold, 16pt, `#F0EDE6`
- Email: Geist, 13pt, `rgba(240,237,230,0.4)`
- Row is tappable → navigates to `/settings/profile`

**States:**
- Default: name + email shown
- Loading: skeleton shimmer on name/email lines (200ms delay before showing)
- Not logged in: should never reach Settings — handled by auth guard in `_layout.tsx`

**Interaction:** Tapping the row opens a profile edit sheet (name, notification time, tone preference).

---

## Section 2: Family

**Row: Partner**

```typescript
interface PartnerRowProps {
  partnerName?: string;     // if linked
  partnerEmail?: string;    // if pending invite
  status: 'linked' | 'invited' | 'none';
}
```

- `linked`: Shows partner's name + green dot indicator. Tappable → view partner link details + option to unlink.
- `invited`: Shows "Invite pending — [email]". Tappable → resend invite option.
- `none`: Shows "Add Partner" in `#7CB87A`. Tappable → opens invite flow (email input modal).

**Row: Kids**

```typescript
interface KidsRowProps {
  kidCount: number;    // 0 if none added
}
```

- `kidCount > 0`: Shows "[n] kid[s]" as trailing detail. Tappable → list of kids with edit/remove.
- `kidCount === 0`: Shows "Add kids" in `#7CB87A`. Tappable → opens kid add flow.

**Navigation target:** `/settings/family` — full CRUD screen for kids + partner management. (Pre-built in family.tsx — link accordingly.)

---

## Section 3: Calendars

**Row structure:** One row per connected calendar service.

```typescript
interface CalendarRowProps {
  service: 'google' | 'apple' | 'outlook';
  displayName: string;          // e.g. "austin@gmail.com"
  status: 'connected' | 'error' | 'not_connected';
  lastSynced?: Date;
}
```

**States:**
- `connected`: Green status dot (4×4px, `#7CB87A`). Trailing text: "Synced [time]" — Geist, 12pt, `rgba(240,237,230,0.3)`. Tappable → manage (disconnect + calendar selection).
- `error`: Orange dot (`#E8875A`). Trailing text: "Sync error". Tappable → troubleshoot / re-auth.
- `not_connected`: No dot. Row label dimmed. Trailing: "Connect" in `#7CB87A`. Tappable → opens OAuth flow.

**Note:** Minimum one calendar row always visible. "Add another calendar" appears below the list as a text row in `#7CB87A` when fewer than 3 calendars are connected.

---

## Section 4: Kin Memory

**Single row:** "What Kin knows →"

Tappable → navigates to `/settings/memory`

**Memory Screen (sub-screen):**

Displays a structured summary of Kin's household model in plain English. Not raw data — interpreted and human-readable.

Layout:
```
  What Kin knows about your household

  ┌─── Schedule ──────────────────────────┐
  │  Austin leaves by 8am weekdays        │
  │  Partner has standing 5pm Tuesdays    │
  └────────────────────────────────────── ┘

  ┌─── Kids ──────────────────────────────┐
  │  [Child name], school ends 3:15pm     │
  │  Soccer — Thursdays 5–7pm             │
  └────────────────────────────────────── ┘

  ┌─── Defaults ──────────────────────────┐
  │  Austin handles school pickup         │
  │  Partner handles bedtime              │
  └────────────────────────────────────── ┘

  ┌─── Preferences ───────────────────────┐
  │  Trying to cook more on weeknights    │
  │  Remote Fridays                       │
  └────────────────────────────────────── ┘

  [ + Add context ]                        ← opens chat thread to add memory manually
```

**Each item:** Tappable → opens inline edit or opens a chat thread with Kin to correct it. Never raw database editing.

**Empty state:** "Kin is still learning your household. It builds this from your conversations and calendar — it fills in quickly."

---

## Section 5: Notifications

**Three rows:**

```typescript
interface NotificationRowProps {
  label: string;
  subLabel: string;    // brief description of what this covers
  enabled: boolean;
  onToggle: (value: boolean) => void;
}
```

| Row | Label | SubLabel |
|---|---|---|
| Morning Briefing | "Morning Briefing" | "Daily at [delivery time] — tap to change time" |
| Coordination Alerts | "Coordination Alerts" | "Calendar conflicts, pickup changes, responsibility shifts" |
| Check-ins | "Kin Check-ins" | "Proactive prompts — max [n] per day" |

**Toggle:** Standard iOS toggle switch, tint `#7CB87A`.

**Delivery time row** (nested under Morning Briefing when enabled):
- Shows current time: "7:00 AM"
- Tappable → opens `DateTimePicker` (time only)
- Saves to `profiles.briefing_delivery_time`

**Household Thread Notifications:** Additional toggle row:
- Label: "Household Thread"
- SubLabel: "When your partner or Kin sends a message"
- Toggle: same style

**States:**
- All off: Row label dims slightly — Geist, 14pt, `rgba(240,237,230,0.4)` (from `#F0EDE6`)
- Loading: 400ms debounce before saving to Supabase; no UI feedback needed (near-instant)
- Error saving: brief inline toast below the toggle: "Couldn't save — try again"

---

## Section 6: Subscription

**File sub-component:** `SubscriptionSection`

This section has the most states of any Settings section. It must handle all trial/subscription permutations.

```typescript
interface SubscriptionSectionProps {
  subscriptionState: 'trial_active' | 'trial_expired' | 'subscribed_monthly' | 'subscribed_annual' | 'none';
  trialDaysRemaining?: number;    // 0–7
  nextBillingDate?: Date;
  planLabel?: string;             // "Kin Family — $39/month" | "Kin Family — $299/year"
}
```

**State: `trial_active`**

```
  Kin Family — Free Trial
  [============================    ] 5 of 7 days used

  Trial ends in 2 days.                     ← Geist, 13pt, #E8875A if ≤2 days, muted if >2
  Everything's included during your trial.

  [ Subscribe — Keep Everything ]           ← #7CB87A, full width, 44pt height

  Annual plan · $299/year · Save $169       ← Geist, 12pt, muted — tappable to show paywall
```

Progress bar:
- Track: `rgba(240,237,230,0.08)`, height 4pt, rounded, full width
- Fill: `#7CB87A` for days 1–5, `#E8875A` for days 6–7
- Width: `(daysUsed / 7) * 100%`

Trial countdown text color:
- Days 3–7: `rgba(240,237,230,0.4)` (muted)
- Days 1–2: `#E8875A` (warm amber — urgency without panic)

**State: `subscribed_monthly`**

```
  Kin Family — $39/month
  Next billing: May 3, 2026

  [ Manage Subscription ]                   ← links to Stripe customer portal
  Annual plan · $299/year · Save $169       ← upgrade prompt, subtle
```

**State: `subscribed_annual`**

```
  Kin Family — $299/year
  Next billing: April 3, 2027

  [ Manage Subscription ]                   ← links to Stripe customer portal
```

**State: `trial_expired`**

Not reachable via Settings — the user will be shown the hard paywall screen before they can reach Settings. Handled in `_layout.tsx` guard.

**State: `none`**

```
  [ Start Free Trial ]                      ← #7CB87A, full width — shouldn't normally appear
```

---

## Section 7: About

Static content. No interactive rows except links.

```typescript
// Static rows — no props needed, values hardcoded or from app.json
```

| Row | Content | Behavior |
|---|---|---|
| App Version | "Version 1.0.0 (build 1)" — trailing text, not tappable | Display only |
| Privacy Policy | Text row | Opens URL: `https://kinai.family/privacy` via `Linking.openURL` |
| Terms of Service | Text row | Opens URL: `https://kinai.family/terms` |
| Send Feedback | Text row | Opens email compose: `feedback@kinai.family` with subject "Kin Feedback" |
| Contact Support | Text row | Opens email: `support@kinai.family` |

---

## Sign Out

Not a section — a standalone text button below the last section group.

```typescript
interface SignOutButtonProps {
  onSignOut: () => void;
}
```

- Label: "Sign out"
- Font: Geist, 15pt, `#E57373` (warm red — clear but not alarming)
- Position: centered, 32pt below last section group, 32pt above tab bar safe area
- On tap: confirmation alert — "Sign out of Kin? Your data and settings are saved." → [Cancel] [Sign Out]
- On confirm: call `supabase.auth.signOut()`, navigate to sign-in screen

**States:**
- Default: static text
- Loading (after confirm): spinner replaces text, button disabled

---

## Global Spacing Rules

All sections follow standard grouped iOS list conventions adapted for dark mode:

- Section group background: `#141810` (slightly lighter than `#0C0F0A` app background)
- Row height: 52pt (touch target compliant)
- Row horizontal padding: 16pt
- Section header: 12pt uppercase Geist, `rgba(240,237,230,0.3)`, 24pt top margin, 8pt bottom margin
- Separator: `rgba(240,237,230,0.06)`, inset 16pt from left
- Trailing chevron: `›` in SF Symbols (`chevron.right`), `rgba(240,237,230,0.3)`, 16pt

---

## Brand Compliance

- Background: `#0C0F0A`
- Section group surfaces: `#141810`
- Primary text: `#F0EDE6`
- Secondary/muted text: `rgba(240,237,230,0.4)`
- Section headers: `rgba(240,237,230,0.3)`, uppercase, 12pt
- Accent / CTA: `#7CB87A`
- Danger (sign out): `#E57373`
- Warning (trial expiry): `#E8875A`
- Font stack: Geist-SemiBold (labels, values), Geist (sublabels, descriptions)

---

## Navigation

Settings rows that navigate use `router.push('/settings/[target]')`. Targets:

| Target | Screen |
|---|---|
| `/settings/profile` | Profile edit: name, photo, briefing time, tone preference |
| `/settings/family` | Partner + Kids CRUD (existing family.tsx) |
| `/settings/calendars` | Calendar management (OAuth / CalDAV flows) |
| `/settings/memory` | Kin Memory view + edit |
| `/settings/notifications/briefing` | Briefing delivery time picker |

Settings sub-screens use a standard navigation stack with back arrow. No bottom tabs inside sub-screens.

---

## Edge Cases

- **No data loaded yet:** Show skeleton loaders in Profile and Subscription sections. Other sections show their "not connected" / "not configured" states.
- **Network error loading profile:** Show "Couldn't load — pull to refresh" inline text below Profile section.
- **Partner invited but not accepted:** Partner row shows "Invite pending" state; don't show a green dot.
- **Multiple Google accounts connected:** Show each as a separate row under Calendars with the email address as the row label.

---

*kin · The Mental Load, Handled. · Kin Technologies LLC · Confidential*
