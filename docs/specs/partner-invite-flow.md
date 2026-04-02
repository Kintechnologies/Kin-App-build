# Spec: Partner Invite Flow

**Status:** Ready for Lead Engineer
**Priority:** P1 — required before Task #9 can be tested
**Filed by:** Product & Design Lead — 2026-04-02
**Sprint Task:** #9 — Test partner invite flow on web (Join link, dual profile creation)

---

## Problem

The onboarding Step 3 (`StepPartnerInvite`) collects a partner's email address but does nothing with it. There is no API endpoint, no `household_invites` table, and no household-linkage mechanism between two profiles. Task #9 cannot be tested until this backend infrastructure exists.

The `/join/[code]` page uses `referral_code` from `profiles` — this is the **referral** flow, not the partner invite flow. These are distinct.

---

## User Story

> As a parent completing onboarding, I want to invite my partner by email so that we share a household and can both see our family's meals, budget, and calendar.

> As the invited partner, I want to click a link in my email and land in Kin with our household already connected, so I don't have to re-enter everything my partner already set up.

---

## Flow: Primary Parent (Inviter)

### Onboarding Step 3 — Invite Partner
1. Parent enters partner's email in `StepPartnerInvite`
2. On submit:
   - Call `POST /api/invite` with `{ partnerEmail: string }`
   - API creates a row in `household_invites` table with a unique `invite_code` (UUID or short random string)
   - API sends an email via Supabase (or Resend/Loops.so) with a link: `https://kinai.family/join/invite/[invite_code]`
3. Onboarding continues normally (no blocking)
4. Success state: "Invite sent to [email]. They'll be connected once they sign up."
5. Skip state: If parent skips, still continues. They can invite later from Settings.

---

## Flow: Partner (Invitee)

### Landing Page — `/join/invite/[code]`
1. Partner clicks link from email
2. Page looks up `household_invites` by `invite_code`
3. If code is valid (not expired, not already accepted):
   - Show: "[Family name] has invited you to Kin"
   - CTA: "Join your household"
4. If code is expired (>7 days) or already used:
   - Show: "This invite has expired. Ask [name] to send a new one."
5. If code is invalid:
   - Show generic error, CTA to sign up normally

### Sign Up / Sign In
1. CTA routes to `/signup?invite=[code]` (if no account) or `/signin?invite=[code]` (if existing account)
2. After auth completes, the invite code is consumed:
   - `household_invites` row marked `accepted = true`, `accepted_at = now()`
   - Partner's `profile.household_id` set to inviter's profile ID (or inviter's profile updated with `partner_id`)
   - Partner is redirected to `/dashboard`
3. Dashboard shows the shared household data immediately (meals, budget, etc.)

### Reduced Onboarding for Partner
Partners who accept an invite should see a shortened onboarding:
- ✅ Step 1: Confirm their name (pre-filled if from email)
- ✅ Step 2: Add their own dietary prefs (merged with household)
- ❌ Skip: Family name, family members, stores, budget — already set by primary parent
- Show: "You've joined the [Family name] household. You can update preferences anytime in Settings."

---

## Data Model

### New Table: `household_invites`

```sql
CREATE TABLE household_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  accepted BOOLEAN NOT NULL DEFAULT false,
  accepted_by_profile_id UUID REFERENCES profiles(id),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invites_code ON household_invites(invite_code);
CREATE INDEX idx_invites_inviter ON household_invites(inviter_profile_id);
```

### Profiles Update

```sql
-- Add household linkage to profiles
ALTER TABLE profiles ADD COLUMN household_id UUID REFERENCES profiles(id);
-- household_id = NULL means "primary" (or only) parent
-- household_id = [other profile's id] means "partner"
```

---

## API Routes

### `POST /api/invite`
- Auth required
- Body: `{ partnerEmail: string }`
- Creates `household_invites` row
- Sends invite email
- Returns: `{ success: true }`

### `GET /api/invite/[code]`
- No auth required
- Validates code, returns invite metadata (inviter name, family name, expiry)
- Used by landing page to personalize content

### `POST /api/invite/[code]/accept`
- Auth required
- Marks invite as accepted, links profiles
- Returns: `{ success: true }`

---

## States

| State | What user sees |
|-------|---------------|
| Loading invite | Pulse animation on `/join/invite/[code]` |
| Valid invite | Family name + "Join your household" CTA |
| Already accepted | "You're already connected to this household" |
| Expired invite | "This invite has expired" + instructions |
| Invalid code | Generic error + link to sign up |
| Already in a household | "You're already in a household — contact support to merge" |

---

## Onboarding: Skip Behavior

If the primary parent skips the partner invite step:
- No invite is sent
- `StepPartnerInvite` shows a "Skip for now" link under the CTA
- Settings → Family section will offer "Invite partner" post-onboarding

---

## Screens Required

1. `/join/invite/[code]` — new landing page (similar to referral page, different copy)
2. `/api/invite` — POST endpoint
3. `/api/invite/[code]` — GET endpoint
4. `/api/invite/[code]/accept` — POST endpoint
5. Update `StepPartnerInvite` to actually call `/api/invite`
6. Migration: `012_household_invites.sql`
7. Partner onboarding: shortened flow on first load after invite acceptance

---

## Acceptance Criteria

- [ ] Primary parent can enter partner email in onboarding and receive confirmation that invite was sent
- [ ] Partner receives an email with a valid join link
- [ ] Partner lands on `/join/invite/[code]` and sees the household name and "Join" CTA
- [ ] Partner can sign up or sign in and be linked to the household on completion
- [ ] After joining, partner sees shared household data on dashboard (same meal plan, budget)
- [ ] Invite link expires after 7 days; expired links show a clear error
- [ ] Already-used invite links show a clear message rather than an error
- [ ] Primary parent who skips invite step can still invite later from Settings
- [ ] TypeScript: `tsc --noEmit` passes after implementation

---

## Email Copy (for Loops / Supabase email)

**Subject:** [First Name] invited you to join their Kin household

**Body:**
> [First Name] is using Kin to manage your family's meals, budget, and schedule — and they want you in.
>
> Click below to join the [Family Name] household. Takes 2 minutes.
>
> [Join our household →]
>
> This link expires in 7 days.

---

## Implementation Notes

- Keep invite code simple: `nanoid(10)` or UUID is fine. No need for custom short codes.
- Email sending: use Supabase built-in email (simple setup) for MVP. Can migrate to Loops/Resend in Phase 2 for better deliverability.
- The `household_id` on profiles is the simplest linkage model for MVP — one primary, one partner. Multi-parent (blended) can be revisited in Phase 2.
- Do not add RLS complexity: the invitee needs to read the invite without being authenticated. Use a server-side route, not a direct Supabase query from the client.

_— Product & Design Lead, 2026-04-02_
