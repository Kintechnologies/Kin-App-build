# QA Audit — 2026-04-04 (Run AR)

**Date:** 2026-04-04
**Lead Eng Session Audited:** Even-hour :30 run AR
**Scope:** P2-23 household context partner events fix + P2-NEW (AQ) pinnedThreadName font fix
**Auditor:** QA & Standards Lead
**Prior QA audit:** QA-AUDIT-2026-04-04-RUN-AO.md (thread_type routing pre-wire, P2-23 filed)

---

## Orientation

Per SPRINT.md "Last Updated" (run AR), Lead Engineer delivered:

- **P2-23 resolved:** `apps/web/src/app/api/chat/route.ts` — household context block extended to include partner's `calendar_events` (`partner_today_events`). Partner profile resolution logic added; query runs in parallel with existing Promise.all fetches; `partner_today_events` conditionally included in context JSON (omitted when partner has no events).
- **P2-NEW (AQ) resolved:** `apps/mobile/app/(tabs)/chat.tsx` — `pinnedThreadName` StyleSheet entry corrected from `Geist-SemiBold` to `InstrumentSerif-Italic` per `conversations-screen-spec.md` v1.1 §1.
- **tsc --noEmit** web: 0 new errors. Mobile: 0 new errors. ESLint `api/chat/route.ts`: 0 warnings.
- **No open Lead Eng code tasks** (per SPRINT.md).

---

## Files Audited

| File | Reason |
|------|--------|
| `apps/web/src/app/api/chat/route.ts` | P2-23 fix — primary change this session |
| `apps/mobile/app/(tabs)/chat.tsx` | P2-NEW (AQ) fix — pinnedThreadName font |
| `apps/mobile/app/(tabs)/_layout.tsx` | Architecture re-confirmation (3-tab) |
| `supabase/migrations/` | Standing migration inventory check |

---

## Architecture Audit

| Check | Result |
|-------|--------|
| `_layout.tsx` — exactly 3 tabs (`index`, `chat`, `settings`) | ✅ PASS — confirmed lines 13–15, unchanged |
| No domain tabs (meals/budget/fitness/family) in tab bar | ✅ PASS |
| Domain files exist (not deleted): meals.tsx, budget.tsx, fitness.tsx, family.tsx | ✅ PASS |
| `024_coordination_issues.sql` | ✅ PASS |
| `025_chat_thread_types.sql` | ✅ PASS |
| `026_kin_check_ins.sql` | ✅ PASS |
| `027_coordination_issues_severity.sql` | ✅ EXISTS — B29 resolved (Austin ran `supabase db push` 2026-04-04) |
| `028_profile_timezone.sql` | ✅ EXISTS — B29 resolved |
| Scope guard — no domain tabs added back | ✅ PASS |
| Scope guard — no Layer 2/3 features (Schedule Compression, Escalation tiers) | ✅ PASS |

---

## Run AR Code Review — `apps/web/src/app/api/chat/route.ts` (P2-23 fix)

### Partner Profile Resolution ✅

**Lines 262–279:**
```typescript
let partnerProfileId: string | null = null;
if (thread_type === "household") {
  if (speakingTo === "parent_a") {
    const { data: partnerRow } = await supabase
      .from("profiles")
      .select("id")
      .eq("household_id", user.id)
      .single<{ id: string }>();
    partnerProfileId = partnerRow?.id ?? null;
  } else {
    partnerProfileId = primaryId;
  }
}
```

- Resolution is household-thread-only (`if (thread_type === "household")`) ✅
- parent_a (primary): resolves partner as profile where `household_id = user.id` ✅
- parent_b (non-primary): partner is the primary user (`primaryId`) ✅
- No impact on personal thread: `partnerProfileId` remains null outside household context ✅
- Null-safe: `partnerRow?.id ?? null` handles unlinked partner gracefully ✅

### Partner Events Parallel Query ✅

**Lines 282–295:**
```typescript
const partnerEventsQuery = partnerProfileId
  ? supabase
      .from("calendar_events")
      .select("title, start_time, end_time, owner_parent_id")
      .eq("profile_id", partnerProfileId)
      .gte("start_time", `${today}T00:00:00Z`)
      .lte("start_time", `${today}T23:59:59Z`)
      .is("deleted_at", null)
      .order("start_time", { ascending: true })
      .limit(10)
  : Promise.resolve({ data: null as CalendarEventRow[] | null, error: null });
```

- Pre-built query resolves in parallel with all other Supabase fetches in `Promise.all` ✅
- Date range matches logged-in parent's today events query (consistent scope) ✅
- `deleted_at null` filter applied (matches existing event queries) ✅
- No-op fallback (`Promise.resolve({ data: null, ... })`) when `partnerProfileId` is null ✅
- Proper TypeScript type on fallback: `CalendarEventRow[] | null` — no `any` ✅

### Context Block — `partner_today_events` Inclusion ✅

**Lines 381–383:**
```typescript
...(mappedPartnerEvents.length > 0
  ? { partner_today_events: mappedPartnerEvents }
  : {}),
```

- Conditionally spread — `partner_today_events` absent when no partner events exist or partner not linked ✅
- Consistent structure with `today_events` (same field mapping: time, end_time, title, owner_parent_id) ✅
- LLM will see both parents' schedules in household thread when household prompt goes live ✅

### Code Quality ✅

| Check | File | Result |
|-------|------|--------|
| No bare `console.error` | `route.ts` | ✅ Zero console calls of any kind |
| No `any` TypeScript types | `route.ts` | ✅ All types explicit: `CalendarEventRow`, `RecentChangeRow`, `CoordinationIssueRow`, `ConversationRow` |
| No unused imports | `route.ts` | ✅ All imports used |
| Async operations have try/catch | `route.ts` | ✅ Outer try/catch covers all async paths |

---

## Run AR Code Review — `apps/mobile/app/(tabs)/chat.tsx` (P2-NEW AQ fix)

### pinnedThreadName Font Fix ✅

**Lines 984–988:**
```typescript
pinnedThreadName: {
  fontFamily: "InstrumentSerif-Italic",
  fontSize: 18,
  color: c.textPrimary,
},
```

- `fontFamily: "InstrumentSerif-Italic"` ✅ (was `Geist-SemiBold`)
- `fontSize: 18` ✅ (was 15)
- `color: c.textPrimary` ✅ (was absent)
- Spec `conversations-screen-spec.md` v1.1 §1 fully satisfied ✅
- Both thread name renders use `styles.pinnedThreadName`:
  - Line 528: `<Text style={styles.pinnedThreadName}>Kin</Text>` ✅
  - Line 565: `<Text style={styles.pinnedThreadName}>` (Home thread) ✅

### Code Quality ✅

| Check | File | Result |
|-------|------|--------|
| No bare `console.error` | `chat.tsx` | ✅ Line 360: `if (process.env.NODE_ENV !== "production") console.error(...)` — properly gated |
| No `any` TypeScript types | `chat.tsx` | ✅ Unchanged from run AO review |
| Async operations have try/catch | `chat.tsx` | ✅ Unchanged |

---

## ⚠️ NEW FINDING

---

### P2-NEW (AR) — `recent_schedule_changes` in household context is still single-parent only

**File:** `apps/web/src/app/api/chat/route.ts`, lines 325–333

**Issue:**

The P2-23 fix correctly added `partner_today_events` to the household thread context. However, the original P2-23 description (QA run AO) also flagged that **`recent_schedule_changes` is single-parent only**:

> `today_events` and `recent_schedule_changes` are single-parent only. §16 balanced framing requires both schedules in context.

The run AR fix addressed `today_events` (partner events now fetched), but `recent_schedule_changes` remains unextended:

```typescript
// Events updated in the last 24 hours (recent schedule changes)
supabase
  .from("calendar_events")
  .select("title, start_time, end_time")
  .eq("profile_id", user.id)   // ← still single-parent only
  .gte("updated_at", since24h)
  .is("deleted_at", null)
  .order("updated_at", { ascending: false })
  .limit(5),
```

When the household thread uses `household-chat-prompt.md`, Kin will see the partner's calendar for today but will not see if the partner made a recent schedule change that could create a conflict. This is the exact use case §3C (Late Schedule Change) is designed to surface.

**Impact:** Household thread LLM blind to partner's schedule changes in last 24 hours. Could result in §11 failure mode: wrong parent assignment if a conflict arose from a partner-side change.

**Action (Lead Eng):** When extending context for household prompt wiring, also fetch `partner_recent_schedule_changes` using the same `partnerProfileId` pattern established in P2-23. Run in parallel with existing `Promise.all`. Include as `partner_recent_schedule_changes` in context JSON (conditional, mirroring `partner_today_events` pattern).

**Severity:** P2 — does not block TestFlight. Must be addressed before `household-chat-prompt.md` is wired and S4.6 declared complete.

---

## Tone & Output Compliance — Standing Confirmation

No new AI prompt templates or output strings were introduced in run AR. Changes are data-layer only (context extension) and visual-only (font fix). Standing compliance from run AO holds:

| Spec | Section | Status |
|------|---------|--------|
| §5 Output limits | Morning briefing 4-sentence cap, alert 1 sentence, check-ins max 2 | ✅ UNCHANGED |
| §7 Silence rules | Clean-day state renders; no filler | ✅ UNCHANGED |
| §8 Tone | No forbidden openers in chat-prompt.md | ✅ UNCHANGED |
| §11 Failure modes | Addressed in personal prompt | ✅ UNCHANGED |
| §12 Alert state machine | OPEN/ACKNOWLEDGED/RESOLVED | ✅ UNCHANGED |
| §16 Social tone | Household prompt STILL MISSING (IE) | ❌ P1 standing |
| §23 Confidence signaling | High/medium/low in chat-prompt.md | ✅ UNCHANGED |

---

## Standing Open Issues (Status Confirmation)

### P1 — `household-chat-prompt.md` STILL MISSING (IE action, S1.8)
**Path:** `docs/prompts/household-chat-prompt.md`
**Status:** File does not exist. Confirmed missing this run.
**Impact:** Household thread uses personal `chat-prompt.md` as fallback — §16 balanced framing not in effect.
**Owner:** Intelligence Engineer (S1.8)
**Open since:** QA Run R. Now **12+ cycles overdue**.

### P2-7 — INPUT FORMAT mismatch in `morning-briefing-prompt.md` (IE action)
**Status:** Unchanged. Pre-existing open item.
**Owner:** Intelligence Engineer (S1.8)

### B2 — RevenueCat iOS configuration (Austin action)
**Status:** Products created ✅. Still needed: entitlement (e.g. `premium`), both products attached to entitlement, iOS app (bundle ID + ASC), `EXPO_PUBLIC_REVENUECAT_API_KEY` to `.env`. Blocks S5.1/S5.2.
**Owner:** Austin

### B4 — Google OAuth verification (Austin action)
**Status:** Unchanged. Blocks TestFlight.
**Owner:** Austin

### Conversation history not filtered by thread_id
**Status:** Unchanged. Post-launch architectural debt.

---

## What Passed Clean

- Architecture: 3-tab shell confirmed, no domain navigation ✅
- Domain files intact (budget.tsx, family.tsx, fitness.tsx, meals.tsx all present) ✅
- Scope guard: no Layer 2/3 features, no domain tabs, no Android targets ✅
- P2-23 fix: partner profile resolution correct for both parent_a and parent_b ✅
- P2-23 fix: partner events query runs in parallel, no performance regression ✅
- P2-23 fix: `partner_today_events` conditionally included — no null/empty pollution of context ✅
- P2-23 fix: personal thread fully unaffected (partnerProfileId = null outside household) ✅
- P2-NEW (AQ) fix: `pinnedThreadName` → InstrumentSerif-Italic 18px textPrimary confirmed ✅
- Both pinned thread names ("Kin" line 528, "Home" line 565) use corrected style ✅
- Code quality: no bare console.error, no `any` types, no unused imports in either changed file ✅
- CHAT_SYSTEM_PROMPT: §8 forbidden openers absent, §23 confidence tiers present ✅
- HOUSEHOLD_CHAT_SYSTEM_PROMPT: empty placeholder + safe fallback confirmed ✅

---

## Summary

**P0 issues (new):** None

**P1 issues (new):** None

**P1 issues (standing):**
- `household-chat-prompt.md` missing → §16 compliance gap (IE action, S1.8). **12+ cycles overdue.**

**P2 issues (new):**
- P2-NEW (AR): `recent_schedule_changes` not extended to include partner's recent changes. Must address before `household-chat-prompt.md` is wired. Does not block TestFlight.

**P2 issues (standing):**
- P2-7: INPUT FORMAT mismatch in `morning-briefing-prompt.md` (IE action)
- Conversation history not filtered by thread_id (post-launch)

**Austin-blocked:**
- B2: RC entitlement + iOS app config + API key (partially complete — products created ✅; entitlement + bundle ID + key still needed)
- B4: Google OAuth verification

**Lead Eng status:** Zero open code tasks. One new P2 filed (partner recent_schedule_changes — address alongside household prompt wiring).

**Critical path unchanged:** IE delivers `household-chat-prompt.md` (P1, §16, **12+ cycles overdue**) → Lead Eng extends `recent_schedule_changes` context (P2-NEW AR) + wires household prompt into `HOUSEHOLD_CHAT_SYSTEM_PROMPT` → QA audits §16 + context completeness → S4.6 e2e complete → Austin B2 → S5.2 TestFlight.

---

_— QA & Standards Lead, 2026-04-04 run AR_
