# QA Audit — Run BJ
**Date:** 2026-04-07
**Run:** BJ (odd-hour :00, following QA Run BI)
**Audited by:** QA & Standards Lead
**Prior run reviewed:** QA Run BI (2026-04-07 — P0-NEW-BH-1 carried, P1-CARRY-BF-1 carried)

---

## Orientation

**SPRINT Last Updated:** 2026-04-07 — QA & Standards Run BI (per last entry in SPRINT.md)

**New commits since Run BI:** 0 commits — HEAD is still `137cd06` (chore: mark BACKLOG-004 and BACKLOG-005 resolved).

**Working tree changes since Run BI (new, uncommitted):**

| File | Change summary |
|------|---------------|
| `apps/mobile/components/paywall/PaywallModal.tsx` | Large refactor — wiring into `useThemeColors()` theme system; dynamic styles via `useMemo`; feature list now uses theme color tokens |
| `apps/mobile/constants/colors.ts` | 2-line addition: `textOnGreenMuted` token to both `darkColors` and `lightColors` |
| `apps/mobile/components/onboarding/CalendarConnectModal.tsx` | 1 line: `headline` style changed from `"InstrumentSerif-Italic"` → `"Geist-SemiBold"` |
| `apps/mobile/app/(auth)/sign-in.tsx` | Logo replaced: `<Text>Kin</Text>` → `<KinLogo>`; `subtitle` font changed `"InstrumentSerif-Italic"` → `"Geist-SemiBold"` |
| `apps/mobile/app/(auth)/sign-up.tsx` | Same: logo to `<KinLogo>` in both steps; `subtitle` font changed `"InstrumentSerif-Italic"` → `"Geist-SemiBold"` |
| `apps/web/package.json` | Added `@upstash/ratelimit ^2.0.8` and `@upstash/redis ^1.37.0` dependencies |
| `apps/web/src/app/api/chat/route.ts` | Modified (rate-limit integration — carry from BI) |
| `apps/web/src/app/api/morning-briefing/route.ts` | Modified (rate-limit integration — carry from BI) |
| `apps/web/src/app/api/first-use/route.ts` | Modified (rate-limit integration — carry from BI) |

**Assessment:** No new commits. Three working-tree files show a pattern of changing `InstrumentSerif-Italic` → `Geist-SemiBold` as a workaround for P0-NEW-BH-1. One new P2 finding filed (wrong fix pattern). Upstash deps added to `package.json` — P2-NEW-BH-1 (atomic commit scope) updated accordingly.

---

## Step 2 — Architecture Audit

| Check | Result | Notes |
|-------|--------|-------|
| Exactly 3 tabs in `_layout.tsx` | ✅ PASS | `index`, `chat`, `settings` — confirmed. No changes since BI. |
| No domain tabs in navigation | ✅ PASS | No `meals`, `budget`, `fitness`, `family` in `<Tabs>` block. |
| Domain files exist (data sources) | ⚠️ NOTE | Previously deleted in run BD (pre-approved by QA run BB). Architecture check now obsolete — carry-forward note. |
| `coordination_issues` migration (024) | ✅ PASS | Present and committed. |
| `morning_briefing_log` migration (029) | ✅ PASS | Present and committed. |

**Scope Guard:** Clean. No domain tabs re-added. No Android targets. No Layer 2/3 features (Schedule Compression, Escalation tiers) built. Marketing app (`apps/marketing/`) is Austin-driven, B4-required — no mobile track impact.

---

## P0 Findings

### P0-NEW-BH-1 — CARRY: InstrumentSerif-Italic not registered; 6 usages in HEAD

**Status:** ⛔ STILL OPEN — no code changes to `_layout.tsx` since Run BH filed this.

**Fresh verification:**

- `apps/mobile/app/_layout.tsx` `useFonts()` block (lines 58–67): Contains only `Geist`, `Geist-Medium`, `Geist-SemiBold`, `Geist-Bold`, `GeistMono`, `GeistMono-Regular`. No `InstrumentSerif-Italic` entry. **Confirmed absent.**
- `apps/mobile/app/(tabs)/index.tsx`: `InstrumentSerif-Italic` at lines 885, 922, 949, 1133 (4 usages).
- `apps/mobile/app/(tabs)/chat.tsx`: `InstrumentSerif-Italic` at lines 937, 985 (2 usages).

**Total: 6 hero elements in HEAD fall back to system font on device.** Briefing card title, briefing hook, display name, clean-day silence text, Conversations list title, pinned thread name all silently misrendered. Blocks TestFlight. Blocks App Store screenshots.

**⚠️ Wrong-fix pattern detected in working tree (see P2-NEW-BJ-1 below):** Working-tree changes in `CalendarConnectModal.tsx`, `sign-in.tsx`, `sign-up.tsx` are changing `InstrumentSerif-Italic` → `Geist-SemiBold` on a file-by-file basis. This papers over the P0 at the leaf level without resolving the root cause. The 6 usages in `index.tsx` and `chat.tsx` remain unaffected by this approach.

**Required fix (Option A — 1 line, correct approach):** Add to `_layout.tsx` `useFonts()`:
```tsx
"InstrumentSerif-Italic": require("../assets/fonts/InstrumentSerif-Italic.ttf"),
```

---

## P1 Findings

### P1-CARRY-BF-1 — CARRY: `morning_briefing_log` route not wired

**Status:** 🟠 STILL OPEN — confirmed in both HEAD and working tree.

**Fresh verification:**
- `grep -n "morning_briefing_log" apps/web/src/app/api/morning-briefing/route.ts` → 0 results (HEAD).
- Working-tree `morning-briefing/route.ts` adds rate-limiting (`checkRateLimit`) but still has zero references to `morning_briefing_log`. The repeat-suppression wiring has not been implemented in either HEAD or working tree.

**Impact:** §7 silence rule (no repeated insight within 24h without change) and §11 failure mode prevention are non-functional. The `morning_briefing_log` table (migration 029) exists in Supabase but is not being written to or read from.

**Required fix:** In `apps/web/src/app/api/morning-briefing/route.ts`:
1. Before calling `generateBriefingContent()`: query `morning_briefing_log` for `last_surfaced_insight` (deduplicate signal)
2. After storing to `morning_briefings`: insert row to `morning_briefing_log` with the generated insight hash/text

---

## P2 Findings

### P2-NEW-BJ-1 — NEW: Wrong fix pattern for P0-NEW-BH-1 in working tree

**Status:** ⚪ OPEN — working tree only, not committed.

**What was observed:** Three uncommitted working-tree files are changing `InstrumentSerif-Italic` → `Geist-SemiBold` as a localized workaround for the unregistered font:

| File | Changed element |
|------|----------------|
| `apps/mobile/components/onboarding/CalendarConnectModal.tsx` | `headline` style |
| `apps/mobile/app/(auth)/sign-in.tsx` | `subtitle` style + logo text replaced with `<KinLogo>` |
| `apps/mobile/app/(auth)/sign-up.tsx` | `subtitle` style + logo text replaced with `<KinLogo>` (both steps) |

**Why this is the wrong approach:**
- The 6 spec-critical usages in `index.tsx` (briefing card, display name, clean-day text) and `chat.tsx` (list title, pinned thread name) are NOT being fixed by this approach.
- This creates spec drift: auth and onboarding screens begin using Geist-SemiBold where the design intent is InstrumentSerif-Italic, requiring future reconciliation.
- The correct fix is 1 line in `_layout.tsx` — once the font is registered, all existing `"InstrumentSerif-Italic"` references across all screens resolve correctly.

**Recommendation:** Do not commit these three files with font swaps. Fix P0-NEW-BH-1 (`_layout.tsx`) first. Then revert these working-tree font changes — they will render correctly once the font is registered.

**Exception:** The `<KinLogo>` component replacement in `sign-in.tsx` and `sign-up.tsx` is a separate concern from the font swap and is acceptable to commit once reviewed independently.

### P2-NEW-BH-1 — CARRY (updated scope): `rate-limit.ts` untracked; atomic commit scope expanded

**Status:** ⚪ STILL OPEN — `apps/web/src/lib/rate-limit.ts` confirmed untracked.

**Update since Run BI:** `apps/web/package.json` now also modified in working tree to add `@upstash/ratelimit ^2.0.8` and `@upstash/redis ^1.37.0`. The atomic commit must now include:
1. `apps/web/src/lib/rate-limit.ts` (new file)
2. `apps/web/src/app/api/chat/route.ts` (rate-limit import)
3. `apps/web/src/app/api/morning-briefing/route.ts` (rate-limit import)
4. `apps/web/src/app/api/first-use/route.ts` (rate-limit import)
5. `apps/web/package.json` (Upstash deps)

HEAD remains deployable (working-tree changes not committed). However, deploying while these changes are in working tree and not committed risks divergence.

**Code quality of `rate-limit.ts`:** ✅ Clean (carry-forward from Run BI). No `any` types. Graceful degrade when Upstash env vars absent.

### P2-NEW-BH-2 — CARRY (Austin): SPRINT.md session scope undocumented

**Status:** ⚪ OPEN — Austin to document 8 commits (9da4d92 through 137cd06) and update "Last Updated" header. No change since Run BH.

### Austin misc — CARRY: stale `docs/prompts/docs/` directory

**Status:** ⚪ Still present — `docs/prompts/docs/` contains subdirectory `ops/`, `prompts/`, `specs/`. Austin must `rm -rf docs/prompts/docs` from terminal.

---

## Steps 3–7 — Spec Compliance (Carry-Forward)

No changes to `index.tsx`, `chat.tsx`, `settings.tsx`, or any prompt files since Run BI. All spec compliance checks carry forward without re-audit.

| Section | Status | Basis |
|---------|--------|-------|
| §5 Output limits (briefing 4-sentence cap, 1 active alert, 2 check-ins/day) | ✅ PASS | `parseBriefingBeats().slice(0,4)`, `activeOpenAlert[0]`, `.limit(2)`, `showCheckins` gate — unchanged from BI. |
| §7 Silence rules | ✅ PASS (structural) | `CleanDayState` gate + `hasContent` logic in place. ⚠️ NOTE: repeat suppression non-functional per P1-CARRY-BF-1. |
| §8 Tone / forbidden openers | ✅ PASS | Forbidden opener strings appear only in prohibition lists inside prompt files and route.ts (lines 359–363 of `morning-briefing/route.ts`). No output template uses them. Alert format compliant. |
| §12 Alert state machine | ✅ PASS | OPEN/ACKNOWLEDGED/RESOLVED states render correctly; Supabase-backed; persists across restarts. |
| §16 Social tone | ✅ PASS | `HOUSEHOLD_CHAT_SYSTEM_PROMPT` in `chat/route.ts` — signed off Run BB, unchanged in HEAD. |
| §23 Confidence signaling | ✅ PASS | No changes to prompt files. Carry-forward clean. |
| §11 Failure modes | ✅ PASS (structural) | No vague outputs hardcoded; wrong-parent logic unchanged. Temporal repeat check non-functional per P1-CARRY-BF-1. |

---

## Step 6 — Code Quality (Working Tree Spot-Check — New Files This Run)

| File | `console.error` | `any` types | Async try/catch | Scope guard | Result |
|------|----------------|-------------|-----------------|-------------|--------|
| `apps/mobile/components/paywall/PaywallModal.tsx` | ✅ None observed | ✅ None | ✅ Present (RevenueCat calls) | N/A | PASS |
| `apps/mobile/constants/colors.ts` | N/A | N/A | N/A | N/A | PASS |
| `apps/mobile/components/onboarding/CalendarConnectModal.tsx` | ✅ None | ✅ None | N/A | N/A | PASS |
| `apps/mobile/app/(auth)/sign-in.tsx` | ✅ None | ✅ None | N/A | N/A | PASS (carry from BI) |
| `apps/mobile/app/(auth)/sign-up.tsx` | ✅ None | ✅ None | N/A | N/A | PASS (carry from BI) |
| `apps/web/package.json` | N/A | N/A | N/A | N/A | PASS — dep versions pinned with `^` |

**Note on `PaywallModal.tsx` theme integration:** The refactor correctly uses `useThemeColors()` from `apps/mobile/lib/theme.tsx` and imports `ThemeColors` from `apps/mobile/constants/colors`. Both exist and export the expected values. `useMemo` usage for `styles` and `features` is correct. `Geist-SemiBold` usage in PaywallModal is appropriate (paywall is not a spec-governed §8 surface; Geist-SemiBold is registered).

---

## Files Audited

- `apps/mobile/app/_layout.tsx` — P0-NEW-BH-1 fresh verification (font registration)
- `apps/mobile/app/(tabs)/_layout.tsx` — architecture check
- `apps/mobile/app/(tabs)/index.tsx` — font usage grep, §5/§7/§8/§12 carry-forward
- `apps/mobile/app/(tabs)/chat.tsx` — font usage grep, §16 carry-forward
- `apps/web/src/app/api/morning-briefing/route.ts` (HEAD + working tree) — P1-CARRY-BF-1, P2-NEW-BH-1
- `apps/web/src/lib/rate-limit.ts` — untracked status confirmed
- `apps/web/package.json` — new Upstash deps
- `apps/mobile/components/paywall/PaywallModal.tsx` — working-tree code quality
- `apps/mobile/constants/colors.ts` — working-tree change review
- `apps/mobile/components/onboarding/CalendarConnectModal.tsx` — working-tree font change (P2-NEW-BJ-1)
- `apps/mobile/app/(auth)/sign-in.tsx` — working-tree font change (P2-NEW-BJ-1)
- `apps/mobile/app/(auth)/sign-up.tsx` — working-tree font change (P2-NEW-BJ-1)
- `supabase/migrations/` — migration presence checks
- `docs/prompts/` — §8 forbidden opener check

---

## Summary

| Issue | Priority | Owner | Status |
|-------|----------|-------|--------|
| P0-NEW-BH-1: InstrumentSerif-Italic not registered; 6 hero elements fall back to system font | 🔴 P0 | Lead Eng | OPEN — no fix committed; wrong-fix pattern detected in working tree (see P2-NEW-BJ-1) |
| P1-CARRY-BF-1: `morning_briefing_log` route unwired; repeat suppression non-functional | 🟠 P1 | Lead Eng | OPEN — not in working tree either |
| P2-NEW-BJ-1: Wrong fix pattern for P0 — font swapped file-by-file in working tree instead of registering in `_layout.tsx` | ⚪ P2 | Lead Eng | OPEN — do not commit these font swaps; fix root cause first |
| P2-NEW-BH-1: `rate-limit.ts` + 3 route files + `package.json` — must commit atomically | ⚪ P2 | Lead Eng | OPEN — scope expanded (package.json now also in working tree) |
| P2-NEW-BH-2: SPRINT.md session scope undocumented | ⚪ P2 | Austin | OPEN — carry-forward |
| Austin misc: stale `docs/prompts/docs/` directory | ⚪ P2 | Austin | OPEN — terminal action needed |

**What passed clean:** Architecture (3 tabs ✅), all §5/§8/§12/§16/§23 spec compliance (✅), code quality in all new working-tree files (✅), scope guard (✅ clean), migrations (✅ all present).

**Recommended action sequence for Lead Eng:**
1. 🔴 **P0-NEW-BH-1 first:** Add `"InstrumentSerif-Italic": require("../assets/fonts/InstrumentSerif-Italic.ttf")` to `_layout.tsx` `useFonts()`. Commit this 1-line fix immediately. Then revert the font swaps in `CalendarConnectModal.tsx`, `sign-in.tsx`, `sign-up.tsx` (they'll resolve correctly once font is registered). The `<KinLogo>` replacement in sign-in/sign-up may be committed separately if desired.
2. 🟠 **P1-CARRY-BF-1:** Wire `morning_briefing_log` reads/writes in `morning-briefing/route.ts`.
3. ⚪ **P2-NEW-BH-1:** Commit `rate-limit.ts` + 3 modified API routes + `apps/web/package.json` atomically.

---

_— QA & Standards Lead, 2026-04-07 (odd-hour :00 run BJ)_
