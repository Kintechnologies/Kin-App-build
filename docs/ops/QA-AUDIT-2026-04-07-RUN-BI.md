# QA Audit — Run BI
**Date:** 2026-04-07
**Run:** BI (odd-hour :00, following QA Run BH)
**Audited by:** QA & Standards Lead
**Prior run reviewed:** QA Run BH (2026-04-07 — P0-NEW-BH-1 filed, P1-CARRY-BF-1 carried)

---

## Orientation

**SPRINT Last Updated:** 2026-04-07 — QA & Standards Run BH (per line 5 header)

**New commits since Run BH:** 1 commit only

| Commit | Description |
|--------|-------------|
| `137cd06` | chore(ops): mark BACKLOG-004 and BACKLOG-005 resolved in CTO backlog |

**Assessment:** This is an ops-only documentation commit. No application code changed since Run BH. All findings from this run are carry-forward confirmations + working-tree state observations.

---

## Step 2 — Architecture Audit

| Check | Result | Notes |
|-------|--------|-------|
| Exactly 3 tabs in `_layout.tsx` | ✅ PASS | `index`, `chat`, `settings` — confirmed. Lines 13–15. |
| No domain tabs in navigation | ✅ PASS | `meals`, `budget`, `fitness`, `family` absent from `<Tabs>` block. |
| Domain files exist (data sources) | ⚠️ NOTE | Previously deleted in run BD (pre-approved by QA run BB). Architecture check now obsolete — data sourced from Supabase. Not a violation. |
| `coordination_issues` migration | ✅ PASS | `supabase/migrations/024_coordination_issues.sql` present. |
| `029_morning_briefing_log.sql` | ✅ PASS | Present and committed. Table structure correct. |

**Scope Guard:** Clean. No domain tabs re-added. No Android targets. No Layer 2/3 features (Schedule Compression, Escalation tiers). Marketing app (`apps/marketing/`) is Austin-driven, B4-required. No mobile track impact.

---

## P0 Findings

### P0-NEW-BH-1 — CARRY: InstrumentSerif-Italic not registered; 6 usages in HEAD

**Status:** ⛔ STILL OPEN — no code changes since Run BH filed this.

**Verification:**
- `apps/mobile/app/_layout.tsx` `useFonts()` block (lines 58–67): no `InstrumentSerif-Italic` entry. Confirmed.
- `apps/mobile/app/(tabs)/index.tsx`: 4 usages confirmed at lines 885, 922, 949, 1133.
- `apps/mobile/app/(tabs)/chat.tsx`: 2 usages confirmed at lines 937, 985.

**Impact:** All 6 hero elements fall back to system font on device. Briefing card, display name, silence state, Conversations title, pinned thread name all silently misrendered. Blocks TestFlight. Blocks App Store screenshots.

**Required fix (Option A — preferred):** Restore 1 line to `_layout.tsx` `useFonts()`:
```tsx
"InstrumentSerif-Italic": require("../assets/fonts/InstrumentSerif-Italic.ttf"),
```

---

## P1 Findings

### P1-CARRY-BF-1 — CARRY: `morning_briefing_log` route not wired

**Status:** 🟠 STILL OPEN — confirmed in both HEAD and working tree.

**Verification (HEAD):** `grep -n "morning_briefing_log" apps/web/src/app/api/morning-briefing/route.ts` → 0 results.

**Verification (working tree):** Working-tree version of `morning-briefing/route.ts` adds rate-limiting (`checkRateLimit`) but still has zero references to `morning_briefing_log`. The repeat-suppression wiring (query log before generating, write log after generating) has not been implemented.

**Impact:** §7 silence rule (no repeated insight within 24h without change) and §11 failure mode prevention are non-functional. The `morning_briefing_log` table (migration 029) exists in Supabase but is not being written to or read from.

**Required fix:** In `apps/web/src/app/api/morning-briefing/route.ts`:
1. Before calling `generateBriefingContent()`: query `morning_briefing_log` for `last_surfaced_insight` (deduplicate signal)
2. After storing to `morning_briefings`: insert row to `morning_briefing_log` with the generated insight hash/text

---

## P2 Findings

### P2-NEW-BH-1 — CARRY: `rate-limit.ts` untracked; 3 working-tree routes import it

**Status:** ⚪ STILL OPEN — `apps/web/src/lib/rate-limit.ts` confirmed untracked (`git status` shows `?? apps/web/src/lib/rate-limit.ts`).

**Working-tree routes that import rate-limit:**
- `apps/web/src/app/api/chat/route.ts` (modified)
- `apps/web/src/app/api/morning-briefing/route.ts` (modified)
- `apps/web/src/app/api/first-use/route.ts` (modified)

**HEAD is still deployable** (working-tree route changes are not committed; HEAD routes do not import rate-limit). However: `rate-limit.ts` must be committed atomically with the 3 route files to avoid a broken deployment.

**Code quality of `rate-limit.ts`:** ✅ Clean. No `any` types. Proper TypeScript. Graceful degrade when Upstash env vars absent. Correct `NextResponse` usage.

**Code quality of working-tree `morning-briefing/route.ts`:** ✅ Clean. All 3 `console.error` calls properly gated (`if (process.env.NODE_ENV !== "production")`). Rate-limit integration uses correct pattern.

### P2-NEW-BH-2 — CARRY (Austin): SPRINT.md session scope undocumented

**Status:** ⚪ OPEN — Austin to document 8 commits (9da4d92 through 137cd06) and update "Last Updated" header. No change since Run BH.

### Austin misc — CARRY: stale `docs/prompts/docs/` directory

**Status:** ⚪ Still present — `git status` confirms `?? docs/prompts/docs/`. Austin must `rm -rf docs/prompts/docs` from terminal.

---

## Steps 3–7 — Spec Compliance (Carry-Forward)

No changes to `index.tsx`, `chat.tsx`, `settings.tsx`, or any prompt files since Run BH. All spec compliance checks carry forward without re-audit.

| Section | Status | Basis |
|---------|--------|-------|
| §5 Output limits (briefing 4-sentence cap, 1 active alert, 2 check-ins/day) | ✅ PASS | `parseBriefingBeats().slice(0,4)`, `activeOpenAlert[0]`, `.limit(2)`, `showCheckins` gate — unchanged from Run BH. |
| §7 Silence rules | ✅ PASS (structural) | `CleanDayState` gate + `hasContent` logic in place. ⚠️ NOTE: repeat suppression logic (morning_briefing_log) is still not wired — see P1-CARRY-BF-1. Structural silence rule passes; temporal rule non-functional. |
| §8 Tone / forbidden openers | ✅ PASS | No forbidden opener strings in index.tsx, chat.tsx, or prompt files. Alert format compliant. |
| §12 Alert state machine | ✅ PASS | OPEN/ACKNOWLEDGED/RESOLVED states render correctly; Supabase-backed; persists across restarts. |
| §16 Social tone | ✅ PASS | `HOUSEHOLD_CHAT_SYSTEM_PROMPT` in chat/route.ts — signed off Run BB, unchanged in HEAD. |
| §23 Confidence signaling | ✅ PASS | No changes to prompt files. Carry-forward clean. |
| §11 Failure modes | ✅ PASS (structural) | No vague outputs hardcoded; wrong-parent assignment logic unchanged. Temporal repeat check non-functional per P1-CARRY-BF-1. |

---

## Step 6 — Code Quality (Working Tree Spot-Check)

Working-tree files with significant changes checked:

| File | `console.error` | `any` types | Async try/catch | Result |
|------|----------------|-------------|-----------------|--------|
| `apps/web/src/app/api/morning-briefing/route.ts` | ✅ All 3 gated | ✅ None observed | ✅ Present | PASS |
| `apps/web/src/lib/rate-limit.ts` | N/A | ✅ None | ✅ N/A (sync init, async method) | PASS |
| `apps/mobile/app/(auth)/sign-in.tsx` | ✅ None | ✅ None observed | N/A | PASS |
| `apps/mobile/app/(auth)/sign-up.tsx` | ✅ None | ✅ None observed | N/A | PASS |

---

## Files Audited

- `apps/mobile/app/_layout.tsx` — font registration (P0-NEW-BH-1 confirmation)
- `apps/mobile/app/(tabs)/_layout.tsx` — architecture check
- `apps/mobile/app/(tabs)/index.tsx` — font usage, §5/§7/§8/§12 carry-forward
- `apps/mobile/app/(tabs)/chat.tsx` — font usage, §16 carry-forward
- `apps/web/src/app/api/morning-briefing/route.ts` (HEAD + working tree) — P1-CARRY-BF-1, P2-NEW-BH-1
- `apps/web/src/lib/rate-limit.ts` — code quality (new file, untracked)
- `apps/mobile/app/(auth)/sign-in.tsx` — code quality spot-check
- `apps/mobile/app/(auth)/sign-up.tsx` — code quality spot-check
- `docs/ops/SPRINT.md` — orientation, blockers
- `supabase/migrations/` — migration presence checks

---

## Summary

| Issue | Priority | Owner | Status |
|-------|----------|-------|--------|
| P0-NEW-BH-1: InstrumentSerif-Italic not registered; 6 hero elements fall back to system font | 🔴 P0 | Lead Eng | OPEN — no fix committed since BH |
| P1-CARRY-BF-1: `morning_briefing_log` route unwired; repeat suppression non-functional | 🟠 P1 | Lead Eng | OPEN — not in working tree either |
| P2-NEW-BH-1: `rate-limit.ts` untracked; must commit before 3 modified routes | ⚪ P2 | Lead Eng | OPEN — commit atomically |
| P2-NEW-BH-2: SPRINT.md session scope undocumented | ⚪ P2 | Austin | OPEN — carry-forward |
| Austin misc: stale `docs/prompts/docs/` directory | ⚪ P2 | Austin | OPEN — terminal action needed |

**What passed clean:** Architecture (3 tabs ✅), §5/§8/§12/§16/§23 compliance (all ✅), code quality in all inspected files (✅), scope guard (✅ clean).

**Recommended action sequence for Lead Eng:**
1. 🔴 P0-NEW-BH-1 first: restore `"InstrumentSerif-Italic"` to `_layout.tsx` `useFonts()` — 1-line fix, commit immediately.
2. 🟠 P1-CARRY-BF-1: wire `morning_briefing_log` reads/writes in `morning-briefing/route.ts`.
3. ⚪ P2-NEW-BH-1: commit `rate-limit.ts` atomically with the 3 modified working-tree routes (chat, morning-briefing, first-use).

---

_— QA & Standards Lead, 2026-04-07 (odd-hour :00 run BI)_
