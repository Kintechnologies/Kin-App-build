# QA Audit — Run BF
**Date:** 2026-04-06
**Run:** BF (odd-hour :00, following QA Run BE)
**Audited by:** QA & Standards Lead
**Prior run reviewed:** QA Run BE (2 P1s open: P1-NEW-BE-1, P1-NEW-BE-2)

---

## Orientation

**SPRINT Last Updated:** 2026-04-06 — QA & Standards Run BE (11:19 AM)
**New Lead Eng session since Run BE:** None committed. Working tree unchanged from Run BE.

**What's in the working tree (unchanged from Run BE):**
- Font cleanup (sign-in/sign-up KinLogo replacement, domain file titles, settings.tsx badge/haptic, chat.tsx headerTitle/emptyTitle/inviteTitle → Geist-SemiBold) — uncommitted
- `_layout.tsx` removes InstrumentSerif-Italic from font registration — uncommitted (P1-NEW-BE-1)
- `apps/mobile/lib/api.ts` — threadType parameter added to `api.chat()` — uncommitted
- `apps/web/src/app/api/morning-briefing/route.ts` — ACKNOWLEDGED state + state field — uncommitted
- `docs/prompts/morning-briefing-prompt.md` — repeat suppression + Scenario 4 — uncommitted (session 13, 2026-04-06T06:00)
- Spec updates: alert-card v1.1, briefing-card, conversations-screen v1.2 — uncommitted
- `028_profile_timezone.sql` — untracked (B33 carry-forward)
- `apps/mobile/app/(tabs)/test.tmp` — untracked

This run adds one new P1 (P1-NEW-BF-1) found in the morning-briefing prompt/route gap.

---

## Architecture Audit

| Check | Result | Notes |
|-------|--------|-------|
| Exactly 3 tabs in `_layout.tsx` | ✅ PASS | index, chat, settings — confirmed |
| No domain tabs in navigation | ✅ PASS | meals/budget/fitness/family not in layout |
| Domain files still exist | ✅ PASS | All 4 present in `apps/mobile/app/(tabs)/` |
| `coordination_issues` migration exists | ✅ PASS | `supabase/migrations/024_coordination_issues.sql` |

**Scope Guard — nothing triggered.** No domain tabs. No web UI changes in mobile. No Android targets. No Layer 2/3 (Schedule Compression, Escalation tiers) features.

---

## Open P1s from Run BE — Status Check

### P1-NEW-BE-1 — Font registration gap (STILL OPEN)

**Status:** Unchanged. Still blocked.

`apps/mobile/app/_layout.tsx` working tree removes `"InstrumentSerif-Italic"` from `useFonts()`. Confirmed: `useFonts()` block no longer contains the `"InstrumentSerif-Italic": require(...)` line.

`apps/mobile/app/(tabs)/index.tsx` (HEAD and working tree are identical) still references `InstrumentSerif-Italic` at:
- Line 865: `displayName` (welcome header)
- Line 902: `briefingTitle` ("Morning" label)
- Line 929: `briefingHook` (briefing hero sentence)
- Line 1113: `cleanDayText` ("Clean day." silence state)

If working tree is committed as-is, all four elements fall back to system font at runtime. TestFlight screenshots blocked. **Do not commit `_layout.tsx`'s font removal line until index.tsx serif references are resolved.**

### P1-NEW-BE-2 — chat.tsx Geist-SemiBold fix uncommitted (STILL OPEN)

**Status:** Unchanged. Fix is in working tree, not committed.

Working tree `chat.tsx` correctly has `Geist-SemiBold` for `headerTitle` (line 1143), `emptyTitle` (line 1200), `inviteTitle` (line 1231) — all correct per conversations-screen-spec.md. HEAD still has `InstrumentSerif-Italic` for these three. Conversations-screen-spec v1.2 confirms `pinnedThreadName` (line 937, 985) should remain `InstrumentSerif-Italic`. The three headerTitle/emptyTitle/inviteTitle fixes should be isolated and committed.

---

## New P1 Found This Run

### P1-NEW-BF-1 — morning-briefing route missing `last_surfaced_insight` — repeat suppression non-functional

**Severity:** P1 — §7/§11 behavioral violation. Must resolve before TestFlight.

**What happened:**
`docs/prompts/morning-briefing-prompt.md` was updated in session 13 (2026-04-06T06:00) to include:
1. A new `last_surfaced_insight` input field: `{ issue_id: string, surfaced_at: ISO timestamp } | null`
2. A **Repeat suppression** rule: if the same issue is the primary insight today with no change since yesterday, return `null`
3. New Scenario 4 example demonstrating the suppression

`apps/web/src/app/api/morning-briefing/route.ts` (working tree) implements the ACKNOWLEDGED state change correctly (queries `OPEN + ACKNOWLEDGED`, passes `state` to model context). However, it does **not** fetch or pass `last_surfaced_insight` to the model.

**Impact:** The model's prompt specifies "If `last_surfaced_insight` refers to the same coordination issue that would be your primary_insight today, and nothing about that issue has changed since `surfaced_at`, return null." Without this field in the context, the model always receives an absent/undefined value and the repeat suppression rule can never fire. This means the same morning briefing insight can be surfaced on consecutive days with no change — a direct §7 failure mode ("No repeated insight within 24 hours without change" — §11 check).

**Route implementation note in the prompt:** `> Route implementation note (for Lead Eng, S2-LE-05): The route must pass state for each item...` — the state field is now passed, but `last_surfaced_insight` is not yet fetched.

**What's needed:**
- Query the most recent `coordination_issues` row that was surfaced in a briefing (likely needs a `last_surfaced_at` or `briefing_surfaced_at` column on `coordination_issues`, or a separate `briefing_log` table)
- Pass the result as `last_surfaced_insight` in the briefing context string
- If no tracking mechanism exists, Lead Eng must determine storage approach (options: add `last_briefing_surfaced_at` to `coordination_issues` table, or add a `morning_briefing_log` table)

**Flag for Austin:** This feature requires a data model decision — where is the "last surfaced briefing insight" stored? Lead Eng cannot implement without this decision.

---

## New Working Tree Changes Audited (Not in Run BE Scope)

These files are part of the undocumented session first flagged as P2-NEW-BE-2. Audited this run:

### `apps/mobile/app/(tabs)/settings.tsx`

| Check | Result | Notes |
|-------|--------|-------|
| pageTitle font: InstrumentSerif-Italic → Geist-SemiBold | ✅ PASS | Part of font cleanup; blocked by P1-BE-1 before commit |
| Badge styling: surfaceSubtle bg, textFaint, borderRadius 20 | ✅ PASS | Matches settings-screen-spec.md line 342 exactly |
| Haptic removed from sign-out destructive action | ✅ PASS | Comment references spec §12 |
| Unused imports removed (Palette, Globe, Lock, Heart) | ✅ PASS | Code quality improvement |
| No bare console.error | ✅ PASS | |
| No `any` TypeScript types | ✅ PASS | |

### `apps/mobile/lib/api.ts`

| Check | Result | Notes |
|-------|--------|-------|
| `threadType?: string` added to `chat()` | ✅ PASS | Correctly optional |
| `thread_type: threadType` in request body | ✅ PASS | Key name matches route expectation |
| JSDoc comments added | ✅ PASS | Accurate; matches route behavior |
| Wired correctly in chat.tsx | ✅ PASS | Line 420: `api.chat(messageText, selectedImage ?? undefined, thread.thread_type)` |
| No `any` types introduced | ✅ PASS | |

### `apps/web/src/app/api/morning-briefing/route.ts`

| Check | Result | Notes |
|-------|--------|-------|
| ACKNOWLEDGED state: `.in("state", ["OPEN", "ACKNOWLEDGED"])` | ✅ PASS | Correct change from `.eq("state", "OPEN")` |
| `state` field added to select | ✅ PASS | `.select("trigger_type, content, state")` |
| Type annotations updated for `state: string` | ✅ PASS | All 4 filter callbacks updated |
| State passed in context string | ✅ PASS | `[state: ${i.state}]` prefix on each issue |
| Framing instruction added ("OPEN = discovery; ACKNOWLEDGED = softer") | ✅ PASS | Correct prompt engineering |
| `last_surfaced_insight` NOT implemented | ⚠️ GAP | → See P1-NEW-BF-1 |
| No bare console.error | ✅ PASS | All 3 gated: `process.env.NODE_ENV !== "production"` |
| No `any` TypeScript types | ✅ PASS | |
| Async error handling | ✅ PASS | try/catch in all 3 handlers |

### Spec file updates

**alert-card-spec.md v1.1:**
- Removed "HEADS UP" label (was P2-3 deviation) — ✅ implementation already has no label (amber dot only)
- Removed P2-5 deviation flag about closure text — ✅ closure text confirmed in index.tsx line 156: `"Sorted. I'll flag it if anything changes."` — P2-5 is resolved

**briefing-card-spec.md:**
- Accepted `c.skeletonBase` (0.07) for all skeleton elements — ✅ spec/implementation alignment, no gap

**conversations-screen-spec.md v1.2:**
- `pinnedThreadName` P2-RESOLVED (InstrumentSerif-Italic) — ✅ confirmed in working tree chat.tsx line 985
- Avatar orb design update (Sparkles icon) — documentation only, no new gap found
- ⚠️ Spec still shows "P2 deviation: Implementation uses Geist-SemiBold for pinnedThreadName" — this is a stale note that contradicts the v1.2 changelog resolution. No action needed; the v1.2 changelog says P2-RESOLVED, and the working tree confirms InstrumentSerif-Italic is present. The "P2 deviation" section appears to be a v1.1 remnant not fully cleaned up. Low concern.

---

## Today Screen Output Compliance

No changes to `index.tsx` since Run BE. All checks carry forward clean.

| Section | Status |
|---------|--------|
| §5 Output limits | ✅ PASS — unchanged |
| §7 Silence rules | ✅ PASS — unchanged |
| §8 Tone / hardcoded strings | ✅ PASS — unchanged |
| §12 Alert state machine | ✅ PASS — unchanged |

**P2-5 closure text confirmed resolved:** Line 156 and 778 both read `"Sorted. I'll flag it if anything changes."` ✅

---

## Confidence Signaling §23

No changes to prompt files affecting §23. Carries forward clean. ✅

---

## Social Tone §16

`HOUSEHOLD_CHAT_SYSTEM_PROMPT` unchanged. Carries forward clean. ✅

---

## Migration Inventory — Updated Assessment

| File | Status | Action |
|------|--------|--------|
| `024_coordination_issues.sql` | Committed ✅ | — |
| `027_coordination_issues_severity.sql` | Committed ✅ | — |
| `027_profile_timezone.sql` | Modified (no-op stub) | Commit stub; Austin deletes before db push |
| `028_profile_timezone.sql` | **Untracked** | Commit — contains actual `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone TEXT` |

`028_profile_timezone.sql` was not called out in Run BE's P2-NEW-BE-3 (Run BE noted only the 027 stub). This is the actual migration that was created to resolve B33. Both the stub modification and the 028 file need to be committed together. Austin must delete the 027 stub before running `supabase db push` (per B33 comment in 028 file).

---

## Issues Found

| ID | Priority | Owner | Description |
|----|----------|-------|-------------|
| **P1-NEW-BE-1** | P1 | Lead Eng | `_layout.tsx` removes InstrumentSerif-Italic; index.tsx still uses it — do not commit |
| **P1-NEW-BE-2** | P1 | Lead Eng | chat.tsx headerTitle/emptyTitle/inviteTitle Geist-SemiBold fix not committed |
| **P1-NEW-BF-1** | P1 | Lead Eng + Austin | morning-briefing route missing `last_surfaced_insight` — repeat suppression non-functional; needs data model decision |
| P2-NEW-BE-1 | P2 | Lead Eng | Delete `apps/mobile/app/(tabs)/test.tmp` |
| P2-NEW-BE-2 | P2 | Lead Eng | Document undocumented session in SPRINT.md (settings badge, api.ts threadType, briefing route ACKNOWLEDGED, prompt session 13) |
| P2-NEW-BE-3 | P2 | Lead Eng + Austin | Commit `028_profile_timezone.sql` + commit stub changes to `027_`; Austin deletes 027 before db push |

**3 P1s open. No P0s.** Architecture and Today screen core compliance remain intact.

---

## What Passed Clean (This Run)

- Architecture: 3-tab shell, domain files intact, core migrations present ✅
- Today screen §5, §7, §8, §12 compliance ✅ (unchanged)
- P2-5 closure text "Sorted. I'll flag it if anything changes." ✅ confirmed resolved
- HOUSEHOLD_CHAT_SYSTEM_PROMPT §16 social tone compliance ✅
- P1-NEW-BE-1/P1-NEW-BE-2 status confirmed (still open; no regression)
- settings.tsx badge styling: spec-compliant (settings-screen-spec.md §8) ✅
- settings.tsx haptic removal, unused import cleanup ✅
- api.ts threadType parameter: correct; wired correctly in chat.tsx ✅
- morning-briefing route ACKNOWLEDGED state implementation: correct ✅
- morning-briefing-prompt.md ACKNOWLEDGED framing + Scenario 4: correct ✅
- No bare console.error in any file audited ✅
- No `any` TypeScript types in modified working tree code ✅
- Async error handling present in all user-facing failure paths ✅

---

## Spec Sections Verified

§5 (Output limits), §7 (Silence/repeat rules), §8 (Tone), §11 (Failure modes), §12 (Alert state machine), §16 (Social tone), §23 (Confidence signaling)

---

## Files Audited

- `apps/mobile/app/(tabs)/_layout.tsx` — architecture check
- `apps/mobile/app/(tabs)/index.tsx` — §5/§7/§8/§12 + font reference check
- `apps/mobile/app/(tabs)/chat.tsx` — P1-BE-2 status + font audit
- `apps/mobile/app/(tabs)/settings.tsx` — new working tree changes
- `apps/mobile/app/_layout.tsx` — P1-BE-1 status (font registration)
- `apps/mobile/lib/api.ts` — threadType parameter
- `apps/web/src/app/api/morning-briefing/route.ts` — ACKNOWLEDGED state + P1-BF-1
- `docs/prompts/morning-briefing-prompt.md` — session 13 changes + repeat suppression
- `docs/specs/alert-card-spec.md` — v1.1 update review
- `docs/specs/briefing-card-spec.md` — skeleton token update review
- `docs/specs/conversations-screen-spec.md` — v1.2 update review
- `supabase/migrations/` — migration inventory (028 file identified)

---

_— QA & Standards Lead, 2026-04-06, Run BF_
