# QA Audit — Run BE
**Date:** 2026-04-06
**Run:** BE (odd-hour :00, following Lead Eng Run BD)
**Audited by:** QA & Standards Lead
**Prior run reviewed:** Lead Eng Run BD (P2-TYPO-1–4 + P2-NEW-BB-1 resolved)

---

## Orientation

**SPRINT Last Updated:** 2026-04-05 — Lead Eng Run BD
**What Lead Eng changed (Run BD):**
- `apps/mobile/app/(tabs)/index.tsx` — P2-TYPO-1/2/3: displayName (line 865), briefingTitle (line 902), briefingHook (line 929) confirmed/set to InstrumentSerif-Italic
- `apps/mobile/app/(tabs)/chat.tsx` — P2-TYPO-4: listTitle (line 937) changed to InstrumentSerif-Italic
- `apps/web/src/app/api/chat/route.ts` — P2-NEW-BB-1: HOUSEHOLD_CHAT_SYSTEM_PROMPT CONTEXT PROVIDED section synced to source (trigger_type annotation, N≥10 history guidance, Note on pickup assignments)

**Working tree note:** At time of this audit, there are ~15 modified/untracked files in the working tree beyond what Run BD describes. This suggests at least one additional Lead Eng session has run since Run BD without a SPRINT.md update. See P1-NEW-BE-1 below.

---

## Architecture Audit

| Check | Result | Notes |
|-------|--------|-------|
| Exactly 3 tabs in `_layout.tsx` | ✅ PASS | index, chat, settings — confirmed |
| No domain tabs in navigation | ✅ PASS | meals/budget/fitness/family not in layout |
| Domain files still exist | ✅ PASS | All 4 present in `apps/mobile/app/(tabs)/` |
| `coordination_issues` migration exists | ✅ PASS | `supabase/migrations/024_coordination_issues.sql` |

**Scope Guard — nothing triggered.** No domain tabs added back. No web UI changes in mobile files. No Android targets. No Layer 2/3 features built.

---

## Today Screen Output Compliance

### §5 Output Limits
| Check | Result | Location |
|-------|--------|---------|
| Morning briefing max 4 sentences | ✅ PASS | `parseBriefingBeats()` with `.slice(0, 4)` at line 90 |
| 1 active OPEN alert at a time | ✅ PASS | `activeOpenAlert = openIssues[0] ?? null` (line 656) |
| Check-ins max 2/day | ✅ PASS | `.limit(2)` at line 549 |
| Check-ins suppressed when OPEN alert active | ✅ PASS | `showCheckins = activeOpenAlert === null` (line 659) |

### §7 Silence Rules
| Check | Result | Location |
|-------|--------|---------|
| CleanDayState renders when no content | ✅ PASS | Line 837: `!briefingLoading && !hasContent && !firstUseContent` |
| `hasContent` correctly gates content | ✅ PASS | Lines 664–671: all content sources checked |
| No spinner for empty state | ✅ PASS | `CleanDayState` renders text, not loading spinner |
| Acceptable clean-day copy | ✅ PASS | "Clean day — nothing to stay ahead of." (verified earlier audit) |

### §8 Tone — Hardcoded Strings
| Check | Result |
|-------|--------|
| No forbidden openers in index.tsx | ✅ PASS |
| No forbidden openers in morning-briefing-prompt.md | ✅ PASS — listed as "never use" |
| No generic reassurance ("I've got this", "Don't worry") | ✅ PASS |
| RESOLVED closure line in spec | ✅ PASS — "Sorted. I'll flag it if anything changes." (line 157) |

### §12 Alert State Machine
| Check | Result | Location |
|-------|--------|---------|
| OPEN: bold, action affordance present | ✅ PASS | Pressable card with dismiss + tap-to-chat |
| ACKNOWLEDGED: muted, no re-prompt | ✅ PASS | `alertCardAcknowledged` style, content-only |
| RESOLVED: closure line + fade | ✅ PASS | 1400ms delay + 600ms Animated fade (lines 139–150) |
| State persists in Supabase | ✅ PASS | `handleAcknowledge()` writes to `coordination_issues` table |
| Realtime subscription | ✅ PASS — confirmed in prior run C |

---

## Confidence Signaling §23

| Check | Result |
|-------|--------|
| High confidence: direct statement, no framing | ✅ PASS — personal and household prompt both specify this |
| Medium confidence: one qualifier max | ✅ PASS — "looks like", "probably", "worth confirming" specified |
| No double qualifiers | ✅ PASS — explicitly forbidden in prompts |

---

## Social Tone §16 (Household Thread)

| Check | Result | Notes |
|-------|--------|-------|
| Both parents conflicted → collaborative | ✅ PASS | "You've both got conflicts at that time — [implication]." |
| One parent caused conflict → neutral | ✅ PASS | "A schedule change lands on [event]..." |
| Ambiguous → coordination prompt | ✅ PASS | "Coverage for [event] is unclear — worth a quick decision between you." |
| No forbidden opener in ambiguous framing | ✅ PASS | P1-NEW-2 was fixed in Run BA — confirmed |
| Household thread balanced, neither parent called out | ✅ PASS |

---

## Code Quality

### Run BD Changed Files

**`apps/mobile/app/(tabs)/index.tsx`**
| Check | Result |
|-------|--------|
| No bare console.error | ✅ PASS |
| No `any` TypeScript types | ✅ PASS |
| Async operations have try/catch | ✅ PASS |

**`apps/mobile/app/(tabs)/chat.tsx`**
| Check | Result |
|-------|--------|
| No bare console.error | ✅ PASS — gated at line 360: `process.env.NODE_ENV !== "production"` |
| No `any` TypeScript types | ✅ PASS |

**`apps/web/src/app/api/chat/route.ts`**
| Check | Result |
|-------|--------|
| No bare console.error | ✅ PASS |
| No `any` TypeScript types | ✅ PASS — all rows typed via interfaces (CalendarEventRow, CoordinationIssueRow, etc.) |
| Async wrapped in try/catch | ✅ PASS — entire POST handler in try/catch; web search has inner try/catch |

---

## Issues Found

---

### P1-NEW-BE-1 — Font registration/usage inconsistency (working tree, pre-commit)

**Severity:** P1 — must resolve before committing working tree changes. Blocks TestFlight if committed as-is.

**What happened:**
The working tree (beyond Run BD) contains a partial InstrumentSerif-Italic cleanup across the mobile app. The cleanup is logically correct in intent but is **incomplete and internally inconsistent**:

- `apps/mobile/app/_layout.tsx` (working tree): **removes** `"InstrumentSerif-Italic"` from `useFonts()` entirely
- `apps/mobile/app/(tabs)/index.tsx` (working tree = HEAD): **still references** InstrumentSerif-Italic at:
  - Line 865: `displayName` (welcome header)
  - Line 902: `briefingTitle` ("Morning" label in briefing card)
  - Line 929: `briefingHook` (first sentence of briefing — the emotional entry point)
  - Line 1113: `cleanDayText` ("Clean day." silence state)
- `apps/mobile/app/(tabs)/chat.tsx` (working tree): **still references** InstrumentSerif-Italic at:
  - Line 937: `listTitle` ("Conversations" screen title)
  - Line 985: `pinnedThreadName` (pinned thread name in list)

**Impact if committed as-is:** React Native silently falls back when a font is unregistered. All 6 elements above render in the system font, not Instrument Serif. This breaks:
- The briefing card hero moment (P2-TYPO-1/2/3 resolutions from Run BD would be silently undone at runtime)
- The App Store screenshot hero elements (briefingHook is Screenshot 1 and 2)
- The silence state feel (cleanDayText loses its intended italic serif register)

**What the working tree cleanup is doing correctly:**
- `sign-in.tsx` / `sign-up.tsx`: replacing text-based "Kin" logo (InstrumentSerif 48pt) with `KinLogo` component — ✅ correct approach
- `chat.tsx`: reverting `headerTitle`, `emptyTitle`, `inviteTitle` to Geist-SemiBold — ✅ spec-correct (conversations-screen-spec specifies SF Pro Text, not serif, for these elements)
- Domain files (budget, meals, family, fitness): reverting page titles — ✅ acceptable, domain files are data sources not product surface

**Required fix before commit:**
The working tree should **keep the InstrumentSerif-Italic font registration** in `_layout.tsx`. The cleanup of non-spec InstrumentSerif usages (auth logo, conversation view header/empty/invite text, domain page titles) is correct and should be committed. But the font must remain registered for the Today screen hero elements and Conversations screen title that legitimately use it.

Alternatively, if the intent is to fully remove InstrumentSerif: update `index.tsx` lines 865, 902, 929, 1113 and `chat.tsx` lines 937, 985 to Geist alternatives — but this would constitute a design change requiring P&D sign-off (these elements were explicitly set to InstrumentSerif via P2-TYPO-1–4 resolutions).

**Recommended path:** Keep font registration. Commit the non-spec cleanups only. Do NOT commit `_layout.tsx`'s font removal line.

---

### P1-NEW-BE-2 — HEAD has non-spec fonts for chat.tsx headerTitle/emptyTitle/inviteTitle

**Severity:** P1 — committed code (HEAD) has InstrumentSerif-Italic for these elements, contradicting conversations-screen-spec.

**Files:** `apps/mobile/app/(tabs)/chat.tsx`

**Committed state (HEAD):**
- `headerTitle` (line 1143): `"InstrumentSerif-Italic"` — used for conversation view thread title
- `emptyTitle` (line 1200): `"InstrumentSerif-Italic"` — used for "Hey, I'm Kin", "New conversation" etc.
- `inviteTitle` (line 1231): `"InstrumentSerif-Italic"` — used for "Invite your partner"

**Spec requirement (conversations-screen-spec.md):**
- ConversationViewHeader center title: "SF Pro Text 16pt weight 600" → Geist-SemiBold
- EmptyState: body text → Geist
- Invite nudge: 13pt → Geist

The working tree correctly reverts all three to `"Geist-SemiBold"` but these changes are uncommitted.

**Action:** Commit the working tree's Geist-SemiBold reversion for `headerTitle`, `emptyTitle`, and `inviteTitle`. These 3 line changes are correct per spec and should be isolated for commit even if the broader working tree cleanup is paused.

---

### P2-NEW-BE-1 — Untracked `test.tmp` file in `apps/mobile/app/(tabs)/`

**Severity:** P2 — stale artifact, should be removed before TestFlight submission.

**File:** `apps/mobile/app/(tabs)/test.tmp`
**Status:** Untracked (not in git), empty file.

**Action:** `rm apps/mobile/app/(tabs)/test.tmp`

---

### P2-NEW-BE-2 — Working tree contains undocumented Lead Eng session changes

**Severity:** P2 — handoff protocol gap. No runtime risk.

**Observation:** The working tree contains substantial changes beyond Run BD's documented scope:
- New components: `apps/mobile/components/KinLogo.tsx`, `KinMark.tsx` (inferred from import)
- New constants: `apps/mobile/constants/brand.ts` (brand token system)
- Modified: `apps/mobile/app/(auth)/sign-in.tsx`, `sign-up.tsx` (KinLogo replacement)
- Modified: `apps/mobile/app/_layout.tsx` (font registration changes, KinLogo TODO comment)
- Modified: `apps/mobile/constants/colors.ts`, `apps/mobile/components/paywall/PaywallModal.tsx`, `apps/mobile/components/onboarding/` (unknown changes)
- Modified: `apps/web/src/app/api/morning-briefing/route.ts` (ACKNOWLEDGED framing - from Run AX, but uncommitted)

SPRINT.md "Last Updated" header still says Run BD (2026-04-05). If a Lead Eng session ran on 2026-04-06 and produced these changes, the SPRINT header was not updated (P2-NEW-4 pattern repeat).

**Action:** Lead Eng to update SPRINT.md "Last Updated" header and document the new components/constants created. CoS to verify scope before next QA cycle.

---

### P2-NEW-BE-3 — `027_profile_timezone.sql` stub still present in supabase/migrations/

**Severity:** P2 — pre-existing (noted in prior audits). No blocking risk since B29 is resolved.

**File:** `supabase/migrations/027_profile_timezone.sql` (stub / no-op)

Two files with `027_` prefix exist (`027_coordination_issues_severity.sql` and `027_profile_timezone.sql`). Austin's misc task: delete the stub before next `supabase db push`.

---

## What Passed Clean (This Session)

- Architecture: 3-tab shell, domain files intact, migrations present ✅
- Today screen §5, §7, §8, §12 compliance ✅
- HOUSEHOLD_CHAT_SYSTEM_PROMPT §16 social tone compliance ✅
- P1-NEW-1/P1-NEW-2 both confirmed resolved ✅
- P2-TYPO-1/2/3 confirmed in index.tsx working tree (InstrumentSerif present) ✅
- P2-TYPO-4 confirmed in chat.tsx working tree (listTitle InstrumentSerif) ✅
- P2-NEW-BB-1 confirmed: CONTEXT PROVIDED block mirrored to route.ts ✅
- Code quality: no bare console.error, no `any` types in changed files ✅
- Async error handling: all user-facing failures have try/catch ✅

---

## Spec Sections Verified

§5 (Output limits), §7 (Silence rules), §8 (Tone), §11 (Failure modes), §12 (Alert state machine), §16 (Social tone), §23 (Confidence signaling)

---

## Files Audited

- `apps/mobile/app/(tabs)/_layout.tsx` — architecture check
- `apps/mobile/app/(tabs)/index.tsx` — §5/§7/§8/§12 compliance + font audit
- `apps/mobile/app/(tabs)/chat.tsx` — font audit + code quality
- `apps/web/src/app/api/chat/route.ts` — P2-NEW-BB-1 verification + §16 + code quality
- `apps/web/src/app/api/morning-briefing/route.ts` — ACKNOWLEDGED framing + code quality
- `docs/prompts/morning-briefing-prompt.md` — §8 tone compliance
- `docs/design/conversations-screen-spec.md` — spec reference for font audit
- `docs/design/today-screen-spec.md` — spec reference for font audit
- `apps/mobile/constants/brand.ts` — new brand token system review
- `apps/mobile/components/KinLogo.tsx` — new component review
- `supabase/migrations/` — migration inventory

---

## Blocker Summary

| ID | Priority | Owner | Description |
|----|----------|-------|-------------|
| P1-NEW-BE-1 | P1 | **Lead Eng** | Working tree removes InstrumentSerif font registration while index.tsx still uses it — resolve before committing |
| P1-NEW-BE-2 | P1 | **Lead Eng** | Commit Geist-SemiBold reversion for chat.tsx headerTitle/emptyTitle/inviteTitle |
| P2-NEW-BE-1 | P2 | **Lead Eng** | Delete `apps/mobile/app/(tabs)/test.tmp` |
| P2-NEW-BE-2 | P2 | **Lead Eng** | Document new session in SPRINT.md (KinLogo, brand.ts, auth screen changes) |
| P2-NEW-BE-3 | P2 | **Austin** | `rm supabase/migrations/027_profile_timezone.sql` stub (carry-forward) |

**No P0 issues.** Stages 1–4 core compliance remains intact. TestFlight path: P1-BE-1 + P1-BE-2 must resolve, then Austin B2 (RC entitlement) gates S5.2.

---

_— QA & Standards Lead, 2026-04-06, Run BE_
