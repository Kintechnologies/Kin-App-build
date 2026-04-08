# QA Audit — 2026-04-04 (Run AO)

**Date:** 2026-04-04
**Lead Eng Session Audited:** Even-hour :30 run AN
**Scope:** Household chat routing pre-wire (S4.6 infrastructure)
**Auditor:** QA & Standards Lead
**Prior QA audit:** QA-AUDIT-2026-04-04-RUN-AK.md (settings.tsx P2 fixes, all clean)

---

## Orientation

Per SPRINT.md "Last Updated" (run AN), Lead Engineer delivered:

- **S4.6 household chat wiring pre-wire:** `HOUSEHOLD_CHAT_SYSTEM_PROMPT` placeholder + thread_type routing added to `/api/chat/route.ts`. Routing infrastructure is live; IE need only deliver `household-chat-prompt.md` and paste the prompt block into `HOUSEHOLD_CHAT_SYSTEM_PROMPT`. No further architectural work required.
- **Mobile API update:** `api.chat()` in `apps/mobile/lib/api.ts` now accepts optional `threadType` param and forwards it as `thread_type` in the POST body.
- **Chat screen update:** `apps/mobile/app/(tabs)/chat.tsx` passes `thread.thread_type` into `api.chat()` at message send.
- **tsc --noEmit** web: 0 new errors. Mobile: 0 new errors. **ESLint** `api/chat/route.ts`: 0 warnings.
- **Lead Eng has zero open code tasks after this session.**

---

## Files Audited

| File | Reason |
|------|--------|
| `apps/web/src/app/api/chat/route.ts` | Household routing pre-wire — primary change this session |
| `apps/mobile/lib/api.ts` | `threadType` param added to `chat()` |
| `apps/mobile/app/(tabs)/chat.tsx` | `thread.thread_type` pass at line 420 |
| `apps/mobile/app/(tabs)/_layout.tsx` | Architecture re-confirmation (3-tab) |
| `supabase/migrations/` | Standing migration inventory check |
| `docs/prompts/household-chat-prompt.md` | P1 standing status check |

---

## Architecture Audit

| Check | Result |
|-------|--------|
| `_layout.tsx` — exactly 3 tabs (index, chat, settings) | ✅ PASS — unchanged since run AK |
| No domain tabs (meals/budget/fitness/family) in tab bar | ✅ PASS |
| Domain files exist (not deleted): meals.tsx, budget.tsx, fitness.tsx, family.tsx | ✅ PASS |
| `024_coordination_issues.sql` | ✅ PASS |
| `025_chat_thread_types.sql` | ✅ PASS |
| `026_kin_check_ins.sql` | ✅ PASS |
| `027_coordination_issues_severity.sql` | ✅ EXISTS — pending Austin `supabase db push` (B29) |
| `027_profile_timezone.sql` | ✅ Now a no-op stub (B33 resolved run AK) — pending deletion |
| `028_profile_timezone.sql` | ✅ Correct rename (B33 resolved run AK) |
| Domain tabs (scope guard) — no meals/budget/fitness/family added back | ✅ PASS |
| Layer 2/3 intelligence features introduced? (scope guard) | ✅ PASS — pre-wire only, no Schedule Compression / Escalation tiers |

---

## Run AN Code Review — `/api/chat/route.ts`

### thread_type Routing Logic ✅

**Lines 226, 239–242:**
```typescript
const { message, thread_type } = await request.json();
// ...
const activeSystemPrompt =
  thread_type === "household" && HOUSEHOLD_CHAT_SYSTEM_PROMPT.trim()
    ? HOUSEHOLD_CHAT_SYSTEM_PROMPT
    : CHAT_SYSTEM_PROMPT;
```

- Route correctly extracts `thread_type` from request body ✅
- Routing condition is safe: empty `HOUSEHOLD_CHAT_SYSTEM_PROMPT.trim()` evaluates falsy — personal prompt is used as fallback ✅
- No risk of null/undefined `HOUSEHOLD_CHAT_SYSTEM_PROMPT` causing runtime error ✅
- Invalid or missing `thread_type` values fall through to personal prompt (safe default) ✅

### HOUSEHOLD_CHAT_SYSTEM_PROMPT Placeholder ✅

**Line 155:**
```typescript
const HOUSEHOLD_CHAT_SYSTEM_PROMPT = ``;
```

- Clearly commented as placeholder; IE instructions precise and actionable ✅
- Fallback logic confirmed: household thread remains functional in dev (routes to personal prompt) ✅
- No hardcoded §16-violating content in placeholder ✅

### Code Quality ✅

| Check | File | Result |
|-------|------|--------|
| No bare `console.error` | `route.ts` | ✅ Zero console calls of any kind |
| No `any` TypeScript types | `route.ts` | ✅ All types explicit (interface CalendarEventRow, RecentChangeRow, CoordinationIssueRow, ConversationRow) |
| No unused imports | `route.ts` | ✅ All 6 imports used (NextResponse, createClient, getAuthenticatedUser, getAnthropicClient, ANTHROPIC_MODEL, Anthropic, Sentry) |
| Async operations have try/catch | `route.ts` | ✅ Outer try/catch at lines 225/443 covers all async paths |

---

## Run AN Code Review — `apps/mobile/lib/api.ts`

### `chat()` threadType Parameter ✅

**Lines 44–48:**
```typescript
chat: (message: string, imageBase64?: string, threadType?: string) =>
  apiRequest<{ response: string }>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message, image: imageBase64, thread_type: threadType }),
  }),
```

- `threadType` is optional — backward-compatible with any callers that don't pass it ✅
- Passed as `thread_type` snake_case in body, matching route.ts `request.json()` destructure ✅
- No type narrowing needed — string is sufficient for routing gate in route.ts ✅
- No `any` types ✅
- No console calls ✅

---

## Run AN Code Review — `apps/mobile/app/(tabs)/chat.tsx`

### thread_type Pass at Message Send ✅

**Line 420:**
```typescript
const { response } = await api.chat(messageText, selectedImage ?? undefined, thread.thread_type);
```

- `thread.thread_type` is typed as `ThreadType` = `"personal" | "household" | "general"` (line 64) ✅
- Passes correctly through `api.chat()` → route.ts ✅
- Already inside try/catch block (lines 419/434) ✅
- `thread` is guaranteed non-null at this point (line 403 guard: `if (!thread) return`) ✅

### Code Quality ✅

| Check | File | Result |
|-------|------|--------|
| No bare `console.error` | `chat.tsx` | ✅ Line 360: `if (process.env.NODE_ENV !== "production") console.error(...)` — properly gated |
| No `any` TypeScript types | `chat.tsx` | ✅ All types explicit (ThreadType union, ChatThread interface, ChatView type) |
| No unused imports | `chat.tsx` | ✅ All imports used (confirmed by Lead Eng ESLint pass) |
| Async operations have try/catch | `chat.tsx` | ✅ handleSend try/catch at lines 419/444 |

### Prior P2 Fixes — Spot-Check Confirmation ✅

| P2 | Fix | Verified |
|----|-----|---------|
| P2-17 | sectionLabel text → "RECENT" | ✅ Line 593: `<Text style={styles.sectionLabel}>RECENT</Text>` |
| P2-18 | sectionLabel `marginTop: 4` | ✅ Line 1053: `marginTop: 4` |

---

## ⚠️ NEW FINDING

---

### P2-NEW — Household context block is single-parent only — must extend before household prompt goes live

**File:** `apps/web/src/app/api/chat/route.ts`, lines 270–338

**Issue:**
The coordination context block assembled per message fetches:
- `today_events` → `calendar_events WHERE profile_id = user.id` (single parent only)
- `open_coordination_issues` → `coordination_issues WHERE household_id = primaryId` (household-scoped ✅)
- `recent_schedule_changes` → `calendar_events WHERE profile_id = user.id` (single parent only)

When the household thread uses `CHAT_SYSTEM_PROMPT` (current state — IE placeholder active), this gap is acceptable: the personal prompt only needs one parent's schedule context. However, per §16, the household thread is designed to surface "coordination conflicts involving both parents." When IE delivers `household-chat-prompt.md` and the household routing goes live:

- The LLM will only see the logged-in parent's `today_events` and `recent_schedule_changes`
- The partner's calendar events will be absent from context
- The household prompt cannot surface "both parents conflicted" (§16 — collaborative tone trigger) without seeing both schedules

`open_coordination_issues` IS household-scoped and will surface pre-detected conflicts — this partially mitigates the gap. But the household chat prompt will need raw event-level data for both parents to handle ambiguous or new coordination questions in real time.

**Action required (Lead Eng):** Before wiring `household-chat-prompt.md`, extend the context block to also fetch partner calendar events when `thread_type === "household"`. Pattern: resolve partner's `profile_id` from `profiles WHERE household_id = primaryId AND id != user.id`, then fetch their `calendar_events` for today. Merge into context as `partner_today_events`.

**Note:** This is NOT blocking current TestFlight prep — the household prompt is a placeholder and household thread functions on personal prompt (acceptable dev behavior). This must be resolved before S4.6 full e2e is declared complete.

**Severity:** P2 — must fix before household-chat-prompt.md is wired. Does not block TestFlight (household route is placeholder today).

---

## Tone & Output Compliance — Standing Confirmation

No new AI prompt templates or output strings were introduced in run AN. The pre-wire adds routing infrastructure only — no new system prompt text (except the empty placeholder). Standing compliance from run AK holds:

| Spec | Section | Status |
|------|---------|--------|
| §5 Output limits | Morning briefing: 4-sentence cap, alert: 1 sentence, check-ins: max 2 | ✅ UNCHANGED — no Today screen changes |
| §7 Silence rules | Clean-day state renders; no filler observations | ✅ UNCHANGED |
| §8 Tone | No forbidden openers in chat-prompt.md (personal thread) | ✅ UNCHANGED |
| §11 Failure modes | No vague outputs, no repeated insights, no wrong parent assign | ✅ UNCHANGED in prompt |
| §12 Alert state machine | OPEN/ACKNOWLEDGED/RESOLVED all present | ✅ UNCHANGED |
| §16 Social tone | Household prompt STILL MISSING (IE) | ❌ P1 standing |
| §23 Confidence signaling | High/medium/low tiers in chat-prompt.md | ✅ UNCHANGED |

---

## Standing Open Issues (Status Confirmation)

### P1 — `household-chat-prompt.md` STILL MISSING (IE action, S1.8)
**Path:** `docs/prompts/household-chat-prompt.md`
**Status:** File does not exist. Confirmed missing this run.
**Impact:** Household thread uses personal `chat-prompt.md` instead of §16 balanced framing.
**Owner:** Intelligence Engineer (S1.8)
**Open since:** QA Run R. Now **11+ cycles overdue**.
**Note:** The run AN routing infrastructure is fully ready. IE can now deliver the prompt and Lead Eng wiring is a one-step paste operation per the route.ts comment.

### P2-7 — INPUT FORMAT mismatch in `morning-briefing-prompt.md` (IE action)
**Status:** Unchanged. Pre-existing open item.
**Owner:** Intelligence Engineer (S1.8)

### B31/P2-5 — Stale `docs/prompts/docs/` directory (Austin action)
**Status:** Unchanged. `rm -rf docs/prompts/docs` still required from terminal.
**Owner:** Austin

### B29 — `supabase db push` (migrations 027–028) (Austin action)
**Status:** Unchanged. `027_coordination_issues_severity.sql` and `028_profile_timezone.sql` both exist. `027_profile_timezone.sql` stub is no-op — safe to push. Austin clear to push per run AL CoS note.
**Owner:** Austin

### Conversation history not filtered by thread_id (architecture debt)
**Status:** Unchanged. Pre-existing P2 standing post-launch cleanup. Now more visible with household routing pre-wired but not blocking.
**Owner:** Lead Eng (post-launch)

---

## What Passed Clean

- Architecture: 3-tab shell confirmed, no domain navigation ✅
- Domain files intact (budget.tsx, family.tsx, fitness.tsx, meals.tsx all present) ✅
- Scope guard: no Layer 2/3 features introduced ✅
- `route.ts`: thread_type routing logic correct; fallback safe; no bare console.error, no `any`, no unused imports, outer try/catch present ✅
- `api.ts`: threadType optional param, snake_case forwarding, backward-compatible ✅
- `chat.tsx`: thread.thread_type passed at send, inside try/catch, non-null guarded ✅
- P2-17 (sectionLabel text "RECENT") — confirmed resolved ✅
- P2-18 (sectionLabel marginTop: 4) — confirmed resolved ✅
- CHAT_SYSTEM_PROMPT (personal thread): §8 forbidden openers absent, §23 confidence tiers present, §11 failure modes addressed ✅
- HOUSEHOLD_CHAT_SYSTEM_PROMPT: empty placeholder — correct; fallback to personal prompt confirmed ✅

---

## Summary

**P0 issues (new):** None

**P1 issues (new):** None

**P1 issues (standing):**
- `household-chat-prompt.md` missing → §16 compliance gap (IE action, S1.8). Open since run R — now **11+ cycles overdue**.

**P2 issues (new):**
- `route.ts` household context block: only logs-in parent's events fetched. Must extend to fetch partner's calendar events before household-chat-prompt.md is wired (Lead Eng). Does not block TestFlight.

**P2 issues (standing):**
- P2-7: INPUT FORMAT mismatch in `morning-briefing-prompt.md` (IE action)
- B31/P2-5: Stale `docs/prompts/docs/` directory (Austin action)
- Conversation history not filtered by thread_id (post-launch architectural debt)

**Austin-blocked:**
- B29: `supabase db push` for migrations 027–028 — clear to run (per run AM note)
- B31: `rm -rf docs/prompts/docs`

**Lead Eng status:** Zero open code tasks. One new P2 filed (household context extension — address before IE delivers household prompt, not before TestFlight).

**Critical path unchanged:** IE must deliver `household-chat-prompt.md` (P1, §16, **11+ cycles overdue**). After IE delivers → QA audits §16 + context completeness → Lead Eng extends context block + wires prompt → S4.6 e2e complete → Austin B2 (RC iOS app + products) → S5.2 TestFlight.

---

_— QA & Standards Lead, 2026-04-04 run AO_
