# Date Night Suggestion UI — iOS Spec
**Domain J · Written by: Product & Design Lead · April 3, 2026**

---

## What This Is

Domain J: Date Night & Relationship. Kin monitors elapsed time since the last logged date night, detects a free window in both parents' calendars within the next 7–10 days, and surfaces a date night suggestion proactively. The user doesn't ask for this — it just appears, at the right moment, in the right place.

This spec covers three surfaces:
1. **Morning briefing card integration** — how date night appears on the home screen
2. **Date Night suggestion card** — the standalone UI when a suggestion is active
3. **Booking / calendar block confirmation** — what happens when the user says yes

---

## Trigger Logic (Backend — for Lead Engineer)

```
IF days_since_last_date_night >= 14
  AND both_parents_have_free_window_in_next_10_days
  AND suggestion_not_already_surfaced_in_last_7_days
THEN generate_date_night_suggestion()
```

**Free window detection:** a 3+ hour block where neither parent has calendar events between 5pm–11pm on a non-worknight (Fri/Sat preferred, weeknight acceptable).

**Generation:** Call Claude with the couple's free windows, budget context (from budget categories), kids' schedule (from activities/bedtimes so they know coverage is handled), location (city from onboarding), and any date night preferences from onboarding. Return exactly two options — not one, not five.

---

## Surface 1: Morning Briefing Card Integration

The date night suggestion appears as the **last beat** in the morning briefing when a suggestion is active.

**Briefing beat copy format:**
> "Saturday evening looks free for both of you — 14 days since your last date night. Chipotle's full?"

No, that's wrong. Kin's voice is warm and specific:
> "Saturday night is clear for both of you. 14 days since your last date — Kin found 2 ideas."

The beat links to the Date Night card. In the morning briefing component (`renderBriefingBeats`), the last beat renders with a different treatment when `type === "date_night"`:

```tsx
// In renderBriefingBeats — if the last beat has type "date_night"
{beat.type === "date_night" ? (
  <Pressable
    style={styles.briefingDateNightBeat}
    onPress={() => router.push("/(tabs)/chat?context=date_night")}
  >
    <View style={styles.briefingBeatDot} />
    <Text style={[styles.briefingBeatText, styles.briefingDateNightText]}>
      {beat.text}
    </Text>
    <ChevronRight size={12} color="#D4748A" />
  </Pressable>
) : (
  // default beat render
)}
```

**Beat dot color:** `#D4748A` (relationship domain color) instead of the default green dot.
**Text color:** `rgba(212, 116, 138, 0.9)` — warm pink, subtle, not alarming.

---

## Surface 2: Date Night Suggestion Card

When a date night suggestion is active, a card appears on the home screen between the Morning Briefing card and the "Today" section. It is **not** inside the briefing card — it's its own card.

**Trigger:** `dateNightSuggestion !== null && !dateNightDismissed`

**Card layout:**

```
┌─────────────────────────────────────────────────────┐
│  ✦  Date Night                       [×]            │  ← dismiss (swipe or tap X, resets 7-day cooldown)
│                                                     │
│  Saturday, April 12 · 7pm–10pm                      │  ← Geist-SemiBold, 13pt, rgba(240,237,230,0.5)
│  Both of you are free.                              │  ← Geist, 13pt, same
│                                                     │
│  ┌──────────────────────┐ ┌──────────────────────┐  │
│  │  Option 1            │ │  Option 2            │  │  ← side-by-side cards
│  │  Dinner at Plank     │ │  Sunset hike + food  │  │
│  │  ~ $80               │ │  ~ $30 + dinner      │  │
│  └──────────────────────┘ └──────────────────────┘  │
│                                                     │
│  [  Block Saturday on Calendar  ]                   │  ← #D4748A CTA (not green — relationship domain)
│                                                     │
│  or ask Kin for different ideas →                   │  ← small, muted link to chat
└─────────────────────────────────────────────────────┘
```

**Card styles:**
```tsx
dateNightCard: {
  backgroundColor: "#141810",
  borderRadius: 20,
  padding: 20,
  marginBottom: 24,
  borderWidth: 1,
  borderColor: "rgba(212, 116, 138, 0.2)",  // relationship domain color
  shadowColor: "#D4748A",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 12,
},
dateNightLabel: {
  fontFamily: "InstrumentSerif-Italic",
  fontSize: 18,
  color: "#D4748A",
  marginBottom: 4,
},
dateNightWindow: {
  fontFamily: "Geist-SemiBold",
  fontSize: 13,
  color: "#F0EDE6",
  marginBottom: 2,
},
dateNightWindowSub: {
  fontFamily: "Geist",
  fontSize: 13,
  color: "rgba(240, 237, 230, 0.4)",
  marginBottom: 16,
},
dateNightOptionsRow: {
  flexDirection: "row",
  gap: 10,
  marginBottom: 16,
},
dateNightOption: {
  flex: 1,
  backgroundColor: "rgba(212, 116, 138, 0.06)",
  borderRadius: 14,
  padding: 14,
  borderWidth: 1,
  borderColor: "rgba(212, 116, 138, 0.12)",
},
dateNightOptionSelected: {
  borderColor: "rgba(212, 116, 138, 0.4)",
  backgroundColor: "rgba(212, 116, 138, 0.1)",
},
dateNightOptionName: {
  fontFamily: "Geist-SemiBold",
  fontSize: 14,
  color: "#F0EDE6",
  marginBottom: 4,
},
dateNightOptionCost: {
  fontFamily: "GeistMono-Regular",
  fontSize: 12,
  color: "rgba(240, 237, 230, 0.35)",
},
dateNightCTA: {
  backgroundColor: "#D4748A",  // relationship domain — NOT green CTA
  borderRadius: 14,
  paddingVertical: 14,
  alignItems: "center",
  marginBottom: 10,
},
dateNightCTAText: {
  fontFamily: "Geist-SemiBold",
  fontSize: 14,
  color: "#0C0F0A",
},
dateNightAltLink: {
  alignItems: "center",
},
dateNightAltLinkText: {
  fontFamily: "Geist",
  fontSize: 13,
  color: "rgba(240, 237, 230, 0.25)",
},
```

**Option selection:** Tapping an option card highlights it (selected state). The CTA text updates to reflect the selected option: "Block Saturday · Dinner at Plank" — specific, not generic.

**Dismiss behavior (the [×] button):**
- Sets `dateNightDismissed: true` in local state + writes `date_night_dismissed_until: 7_days_from_now` to `onboarding_preferences`
- Does NOT delete the suggestion — it resurfaces after 7 days if not acted on
- Haptic: `Haptics.impactAsync(ImpactFeedbackStyle.Light)`

---

## Surface 3: Calendar Block Confirmation

When the user taps the CTA, Kin doesn't just close the card. It confirms the action and shows what it did.

**Flow:**
1. User taps "Block Saturday · Dinner at Plank"
2. Haptic: `ImpactFeedbackStyle.Heavy`
3. Card animates out (fade + scale down)
4. A confirmation toast appears at the top of the screen for 3 seconds:
   > "Saturday blocked. Enjoy your night."
5. The event is created in the household calendar (Google or Apple, whichever is connected) via the calendar sync API — title: "Date Night 💕", duration: 3 hours from the detected window start, private: false (household event, both see it)
6. `last_date_night: today` is written to `onboarding_preferences` (resets the 14-day trigger)

**If calendar isn't connected:**
CTA changes to "Save to Kin Calendar" — blocks the window in Kin's internal schedule view only. Same confirmation copy.

**Toast style:**
```tsx
confirmToast: {
  position: "absolute",
  top: 60,
  left: 20,
  right: 20,
  backgroundColor: "#141810",
  borderRadius: 14,
  padding: 14,
  borderWidth: 1,
  borderColor: "rgba(212, 116, 138, 0.25)",
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  zIndex: 100,
  shadowColor: "#D4748A",
  shadowOpacity: 0.15,
  shadowRadius: 16,
},
confirmToastText: {
  fontFamily: "Geist-SemiBold",
  fontSize: 14,
  color: "#F0EDE6",
}
```

---

## Data Model (Supabase)

Two new fields on `onboarding_preferences`:
```sql
last_date_night         date          -- when they last went on a date (manually updated by Kin after calendar block)
date_night_dismissed_until  date      -- cooldown: don't resurface until this date
```

One new table (or extension of `morning_briefings`):
```sql
date_night_suggestions (
  id                uuid PRIMARY KEY,
  household_id      uuid REFERENCES households(id),
  generated_at      timestamptz,
  free_window_start timestamptz,
  free_window_end   timestamptz,
  option_1_name     text,
  option_1_cost_est text,
  option_2_name     text,
  option_2_cost_est text,
  status            text DEFAULT 'pending'  -- 'pending' | 'accepted' | 'dismissed'
)
```

---

## What the Chat Context Does (date_night intent)

When the user taps "ask Kin for different ideas →" or arrives at chat with `?context=date_night`, the chat opens with a pre-seeded system context that includes:
- The current free window
- The two options already shown (so Kin doesn't repeat them)
- Budget context
- Kids' schedule for that evening

Pre-filled suggestion chip: "I want different ideas for Saturday night"

Kin's first response generates 3 new options, different from the ones shown on the card.

---

## Where to Build This

**New files:**
- `apps/mobile/components/home/DateNightCard.tsx` — the card component
- `apps/mobile/lib/date-night.ts` — generation logic, free window detection

**Edits:**
- `apps/mobile/app/(tabs)/index.tsx` — add `dateNightSuggestion` state, fetch from `date_night_suggestions` table, render `<DateNightCard />` between briefing card and "Today" section
- `apps/mobile/app/api/date-night/generate+api.ts` — new API route to generate suggestions via Claude
- `supabase/migrations/` — new migration for the two `onboarding_preferences` fields + `date_night_suggestions` table

**Reads for Lead Engineer:**
- Morning briefing generation function (`kin-ai.ts`) — add date night beat to briefing when suggestion is active
- Calendar sync implementation — to understand how to create events programmatically

---

## Copy Rules for Kin's Voice

Date night copy must feel warm, not transactional. Examples:

✅ "Saturday night is clear for both of you."
✅ "14 days since your last date — you're due."
✅ "Enjoy your night."
✅ "Dinner at Plank or a sunset hike — your call."

❌ "A date night opportunity has been detected."
❌ "Your schedule has a compatible window."
❌ "Consider scheduling a date night event."
❌ "Option A" / "Option B"

The two options should have real names — "Dinner at Posto" not "Italian restaurant". If Kin doesn't know what's nearby, it uses category names with personality: "Nice dinner out" not "Restaurant dining."

---

## What Austin Needs to Provide

Nothing blocking for this spec — Lead Engineer can build from here. But Kin will produce better suggestions once:
- Location (city) is captured in onboarding preferences
- Date night preferences field exists in onboarding survey ("any vibe preferences? — chill, adventurous, romantic, new experience")
- At least one calendar is connected (for real free window detection vs. guessed)

---

*kin · The Mental Load, Handled. · Kin Technologies LLC · Confidential*
