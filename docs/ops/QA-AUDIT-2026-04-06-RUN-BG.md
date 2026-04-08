# QA Audit — Run BG
**Date:** 2026-04-06
**Run:** BG (odd-hour :00, following QA Run BF)
**Audited by:** QA & Standards Lead
**Prior run reviewed:** QA Run BF (3 P1s open: P1-NEW-BE-1, P1-NEW-BE-2, P1-NEW-BF-1)

---

## Orientation

**SPRINT Last Updated:** 2026-04-06 — QA & Standards Run BF
**New Lead Eng session since Run BF:** None. Working tree unchanged from Run BF.
**New commits since Run BF:** None (`git log --since="2026-04-06"` returns nothing new beyond last merge).

No new code to audit this run. This is a carry-forward verification: confirm P1s still open, confirm architecture clean, confirm no scope violations.

---

## Step 2 — Architecture Audit

| Check | Result | Notes |
|-------|--------|-------|
| Exactly 3 tabs in `_layout.tsx` | ✅ PASS | `index`, `chat`, `settings` — confirmed, no change since BF |
| No domain tabs in navigation | ✅ PASS | `meals`, `budget`, `fitness`, `family` absent from `<Tabs>` block |
| Domain files still exist | ✅ PASS | All 4 present: `apps/mobile/app/(tabs)/{meals,budget,fitness,family}.tsx` |
| `coordination_issues` migration exists | ✅ PASS | `supabase/migrations/024_coordination_issues.sql` present |

**Scope Guard — nothing triggered.** No domain tabs, no web UI mobile changes, no Android targets, no Layer 2/3 features.

---

## Step 3–7 — P1 Carry-Forward Status

### P1-NEW-BE-1 — Font registration gap (STILL OPEN)

**Status:** Unchanged. No Lead Eng session since filed. Still blocking commit.

`apps/mobile/app/_layout.tsx` (working tree) — `useFonts()` registers: `Geist`, `Geist-Medium`, `Geist-SemiBold`, `Geist-Bold`, `GeistMono`, `GeistMono-Regular` only. `InstrumentSerif-Italic` is absent.

`apps/mobile/app/(tabs)/index.tsx` (working tree = HEAD) still references `InstrumentSerif-Italic` at:
- Line 865: `displayName` — welcome header
- Line 902: `briefingTitle` — "Morning" label on briefing card
- Line 929: `briefingHook` — briefing hero sentence
- Line 1113: `cleanDayText` — "Clean day." silence state

**Risk:** Committing `_layout.tsx` as-is will cause all 4 serif elements to fall back to system font at runtime. Briefing card hero and silence-state text break. TestFlight screenshot blockers.

**Resolution path:** Lead Eng must either (a) restore `InstrumentSerif-Italic` registration to `_layout.tsx`, or (b) update all 4 `index.tsx` references to a registered font before committing. Do NOT commit `_layout.tsx` without resolving this.

---

### P1-NEW-BE-2 — chat.tsx Geist-SemiBold fix uncommitted (STILL OPEN)

**Status:** Unchanged. Fix correct in working tree; not committed.

Working tree diff confirms 3 font changes in `apps/mobile/app/(tabs)/chat.tsx`:
- `headerTitle`: `InstrumentSerif-Italic` → `Geist-SemiBold` (working tree)
- `emptyTitle`: `InstrumentSerif-Italic` → `Geist-SemiBold` (working tree)
- `inviteTitle`: `InstrumentSerif-Italic` → `Geist-SemiBold` (working tree)

HEAD still has `InstrumentSerif-Italic` for these three. Working tree is correct per `conversations-screen-spec.md` (SF Pro Text / Geist-SemiBold specified, not Instrument Serif Italic).

**Resolution path:** Lead Eng should commit the Geist-SemiBold changes for `headerTitle`/`emptyTitle`/`inviteTitle` in the same commit that resolves P1-NEW-BE-1 (coordinated font commit so the registration and references are consistent).

---

### P1-NEW-BF-1 — morning-briefing route missing `last_surfaced_insight` (STILL OPEN)

**Status:** Unchanged. No implementation since filed.

`docs/prompts/morning-briefing-prompt.md` specifies `last_surfaced_insight` as a required input field (line 56) with full repeat suppression logic (line 59). Multiple scenarios test this behavior (Scenarios 4, 5, 6).

`apps/web/src/app/api/morning-briefing/route.ts` — zero occurrences of `last_surfaced_insight`, `briefing_log`, `briefing_surfaced_at`, or `last_briefing_surfaced_at`. The model prompt includes the suppression rule; the route never provides the field. The suppression rule can never fire.

**Impact:** Same as Run BF — §7/§11 violation. Repeated morning briefings possible on consecutive days with no coordination change.

**Blocker:** This requires a data model decision from Austin before Lead Eng can implement. Options remain:
- Add `last_briefing_surfaced_at` column to `coordination_issues` table
- Create a new `morning_briefing_log` table

Austin must decide where "last surfaced briefing insight" is stored. No code resolution is possible without that decision.

---

## Step 6 — Code Quality Check (morning-briefing route, spot check)

No new changes since BF. Carry-forward results:

| Check | Status | Notes |
|-------|--------|-------|
| `console.error` gating | ✅ PASS | All 3 instances gated: `if (process.env.NODE_ENV !== "production")` at lines 454, 499, 539 |
| No `any` TypeScript types | ✅ PASS (BF carry) | No new code introduced |
| Async error handling | ✅ PASS (BF carry) | try/catch in all 3 handlers |

---

## Today Screen Output Compliance — Carry-Forward

No changes to `index.tsx` since Run BF. All checks carry forward clean.

| Section | Status |
|---------|--------|
| §5 Output limits | ✅ PASS — unchanged |
| §7 Silence rules | ✅ PASS (pending P1-NEW-BF-1 resolution for repeat suppression) |
| §8 Tone / hardcoded strings | ✅ PASS — unchanged |
| §12 Alert state machine | ✅ PASS — unchanged |
| §16 Social tone / HOUSEHOLD_CHAT | ✅ PASS — unchanged |
| §23 Confidence signaling | ✅ PASS — unchanged |

---

## P2 Carry-Forward Status

| ID | Status | Notes |
|----|--------|-------|
| P2-NEW-BE-1 (`test.tmp` untracked) | **OPEN** — `apps/mobile/app/(tabs)/test.tmp` still present |
| P2-NEW-BE-2 (undocumented session not in SPRINT) | **OPEN** — Lead Eng has not documented working tree session origin |
| P2-NEW-BE-3 (`028_profile_timezone.sql` untracked) | **OPEN** — both 027 stub and 028 actual migration still untracked |
| B2 (Austin RC entitlement + bundle + API key) | **OPEN** — Austin action |
| B4 (Austin OAuth branding) | **OPEN** — Austin action |
| P2-7 (IE INPUT FORMAT) | **OPEN** — IE action |

---

## Issues Found This Run

**No new P0 or P1 issues found.** All 3 open P1s carry forward from prior runs unchanged.

| ID | Priority | Owner | Description |
|----|----------|-------|-------------|
| **P1-NEW-BE-1** | P1 | Lead Eng | `_layout.tsx` removes InstrumentSerif-Italic; `index.tsx` still uses it at 4 lines — do not commit until resolved |
| **P1-NEW-BE-2** | P1 | Lead Eng | `chat.tsx` headerTitle/emptyTitle/inviteTitle Geist-SemiBold fix in working tree but not committed |
| **P1-NEW-BF-1** | P1 | Lead Eng + **Austin** | morning-briefing route missing `last_surfaced_insight` — repeat suppression non-functional; **blocked on Austin data model decision** |

**3 P1s open. No P0s.**

---

## What Passed Clean

- Architecture: 3-tab shell, domain files intact, core migrations present ✅
- Scope guard: no domain tabs, no Layer 2/3, no Android targets ✅
- Today screen §5, §7, §8, §12 compliance ✅ (unchanged)
- HOUSEHOLD_CHAT_SYSTEM_PROMPT §16 social tone compliance ✅ (unchanged)
- morning-briefing route console.error gating ✅ (all 3 gated)
- P1-NEW-BE-1, P1-NEW-BE-2, P1-NEW-BF-1 confirmed still open — no unexpected regression or accidental partial fix

---

## Files Audited This Run

- `apps/mobile/app/(tabs)/_layout.tsx` — architecture check, tab count
- `apps/mobile/app/_layout.tsx` — P1-BE-1 font registration status
- `apps/mobile/app/(tabs)/index.tsx` — P1-BE-1 font reference check, §5/§7/§8/§12 carry
- `apps/mobile/app/(tabs)/chat.tsx` — P1-BE-2 git diff status
- `apps/web/src/app/api/morning-briefing/route.ts` — P1-BF-1 status + code quality spot check
- `docs/prompts/morning-briefing-prompt.md` — P1-BF-1 spec confirmation
- `supabase/migrations/` — migration inventory carry-forward
- `git status --short` — untracked and modified file inventory

---

## Spec Sections Verified

§5 (Output limits), §7 (Silence/repeat rules), §8 (Tone), §11 (Failure modes), §12 (Alert state machine), §16 (Social tone), §23 (Confidence signaling)

---

_— QA & Standards Lead, 2026-04-06, Run BG_
