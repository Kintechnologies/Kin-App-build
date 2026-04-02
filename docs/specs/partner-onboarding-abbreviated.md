# Spec: Partner Abbreviated Onboarding

**Filed by:** Product & Design Lead
**Date:** 2026-04-02
**Priority:** P2 — required for AI personalization to work correctly for partners
**Platform:** Web (Next.js)
**Depends on:** Partner invite flow (98e88f7 — shipped)

---

## Problem

When a partner accepts an invite and creates an account, the current flow does this:

```typescript
// apps/web/src/app/(auth)/signup/page.tsx
if (inviteCode) {
  const res = await fetch(`/api/invite/${inviteCode}/accept`, { method: "POST" });
  if (res.ok) {
    router.push("/dashboard");  // ← skips onboarding entirely
    return;
  }
}
```

The partner is dropped directly on `/dashboard` with **zero profile data**:
- No `family_members` row for the partner (their name is unknown to Kin)
- No dietary preferences set
- No budget context for their household
- The AI chat greeting will say "Good morning, Parent" — the generic fallback — because there is no name

The AI is supposed to know who it's talking to. It won't. That's not a detail — it's the product promise.

---

## Root Cause

The original `partner-invite-flow.md` spec called for a "Reduced Onboarding for Partner" but the Lead Eng implementation shipped without it, choosing the simpler path of going straight to dashboard. This was a reasonable call to keep the PR focused, but it creates a real hole.

---

## User Story

> As a partner who just accepted a household invite, I want to quickly tell Kin my name and a few preferences so that the AI knows who I am without having to set up everything from scratch.

---

## Flow: Partner Mini-Onboarding

### Trigger
After `POST /api/invite/[code]/accept` succeeds, instead of:
```
router.push("/dashboard")
```

Route to a new, abbreviated onboarding path:
```
router.push("/onboarding/partner")
```

### `/onboarding/partner` — 2-Step Flow

**Step 1: Who are you?**
```
┌─────────────────────────────────┐
│  Kin                            │
│                                 │
│  "Welcome to [Family Name]."    │
│                                 │
│  What should Kin call you?      │
│                                 │
│  [  First name input  ]         │
│                                 │
│  (Pre-fill from email if       │
│   possible. Editable.)         │
│                                 │
│  [ Continue → ]                 │
└─────────────────────────────────┘
```

**Step 2: Any dietary needs?**
```
┌─────────────────────────────────┐
│  "Your household already has    │
│   a meal plan set up."          │
│                                 │
│  Any dietary restrictions we    │
│  should know about for you?     │
│                                 │
│  [ Vegetarian ] [ Vegan ]       │
│  [ Gluten-free ] [ Dairy-free ] │
│  [ Nut allergy ] [ Halal ]      │
│  [ Kosher ] [ Other / None ]    │
│                                 │
│  [ Start with Kin → ]           │
└─────────────────────────────────┘
```

Tapping "Start with Kin" completes setup and redirects to `/dashboard`.

---

## What We Skip (and Why)

| Onboarding Step | Skip for partner? | Why |
|----------------|-------------------|-----|
| Family name | ✅ Skip | Already set by primary parent |
| Number of kids | ✅ Skip | Already set |
| Budget / income | ✅ Skip | Primary parent's data already in DB |
| Preferred grocery stores | ✅ Skip | Primary parent already chose |
| Partner invite step | ✅ Skip | They ARE the partner |
| **Partner name (their own)** | ❌ **Keep** | Critical for AI personalization |
| **Dietary restrictions (theirs)** | ❌ **Keep** | Affects meal plan generation |

This brings partner onboarding from ~8 steps to 2 steps. The primary parent already did the heavy lifting.

---

## Data Writes

**Step 1 (name):**
```sql
INSERT INTO family_members (profile_id, name, member_type)
VALUES ($partnerProfileId, $name, 'adult')
ON CONFLICT (profile_id, member_type)
DO UPDATE SET name = EXCLUDED.name;
```

**Step 2 (dietary restrictions):**
Update the partner's row in `onboarding_preferences` (or equivalent) with their selected restrictions:
```sql
UPDATE profiles
SET onboarding_preferences = jsonb_set(
  COALESCE(onboarding_preferences, '{}'),
  '{dietary_restrictions}',
  $restrictions::jsonb
)
WHERE id = $partnerProfileId;
```

These dietary restrictions should be **merged** into the household meal preferences — or at minimum surfaced to the AI in the chat system prompt alongside the primary parent's prefs.

---

## Screens Required

1. `/onboarding/partner` — new page, or new route inside existing onboarding with a `mode=partner` flag
2. Two steps: Name input → Dietary prefs picker → Dashboard
3. Progress indicator: "Step 1 of 2" / "Step 2 of 2"
4. Skip link on Step 2 only: "Skip dietary preferences"

---

## Interactions

| Action | Response |
|--------|----------|
| Name field empty | Continue button disabled |
| Name entered | Continue button enabled (primary green) |
| Dietary pill tapped | Pill toggles highlighted |
| "Start with Kin →" tapped | Writes prefs, redirects to /dashboard |
| "Skip dietary preferences" tapped | Goes to /dashboard without writing prefs |

---

## States

| State | What user sees |
|-------|---------------|
| Landing on `/onboarding/partner` | Step 1 with family name in headline |
| Step 1, no name entered | Continue disabled |
| Step 1, name entered | Continue enabled |
| Step 2 | Dietary pill grid |
| Submitting | Button shows loading state |
| Success | Redirect to /dashboard |
| Error on write | Toast: "Couldn't save — you can update this in Settings" (non-blocking redirect) |

---

## Design Notes

- The headline on Step 1 should feel warm, not functional: *"Welcome to the [Family Name]."* in Instrument Serif Italic
- This is the partner's first impression of Kin — make it feel intentional, not like a form
- Background: standard `#0C0F0A`. No gimmicks. The warmth is in the copy.
- Progress: small "1 of 2" in Geist, warm white/30 — top right of card
- Skip link: `text-warm-white/30`, below the CTA, not a button

---

## Acceptance Criteria

- [ ] Partner accepting an invite via signup is routed to `/onboarding/partner`, not `/dashboard`
- [ ] Step 1 collects partner's first name and writes to `family_members` with `member_type = 'adult'`
- [ ] Step 2 collects dietary restrictions and writes to partner's `onboarding_preferences`
- [ ] Step 2 has a skip option
- [ ] After completing Step 2 (or skipping), partner lands on `/dashboard`
- [ ] Kin chat greets partner by name on first session (verifies `family_members` write was successful)
- [ ] TypeScript: `tsc --noEmit` passes after implementation

---

## Open Question for Austin

Should the partner's dietary restrictions **replace** the household preferences used for meal generation, or **merge** them with the primary parent's? For MVP I'd suggest merge — generate meals that work for both. If the primary parent chose "vegetarian" and the partner adds "nut allergy," the next meal plan generation should respect both. This would require updating the meal generation prompt in `/api/meals/route.ts` to pull preferences from all adult `family_members`, not just the authenticated user.

_— Product & Design Lead, 2026-04-02_
