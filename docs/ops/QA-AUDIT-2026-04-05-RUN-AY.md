# QA Audit — Run AY
**Date:** 2026-04-05
**QA Run:** AY (odd-hour :00, auditing Lead Eng run AX)
**Auditor:** QA & Standards Lead (automated)
**Spec version:** `kin-v0-intelligence-engine.md`

---

## Orientation

**Lead Eng run audited:** Run AX (even-hour :30, 2026-04-05)

Previous QA run AU was logged as "clean: 0 new findings" by CoS (run AV). Lead Eng then ran AX after the last QA cycle.

**Files changed in run AX:**
| File | Change |
|------|--------|
| `apps/web/src/app/api/chat/route.ts` | `HOUSEHOLD_CHAT_SYSTEM_PROMPT` wired from `household-chat-prompt.md` (IE session 13); P2-NEW-2 comment block added |
| `apps/web/src/app/api/morning-briefing/route.ts` | Coordination issues query: `in(["OPEN","ACKNOWLEDGED"])`; state tags added to context; system prompt updated with ACKNOWLEDGED framing + relief selection guide |
| `docs/prompts/household-chat-prompt.md` | Created at correct path (rescued from `docs/prompts/docs/prompts/` where IE had been writing) |
| `docs/prompts/morning-briefing-prompt.md` | Updated at correct path (rescued from wrong path) |

**Important discovery by Lead Eng run AX:** IE has been writing all outputs to `docs/prompts/docs/prompts/` (wrong path) for 13+ sessions due to incorrect working-directory assumption. The household-chat-prompt.md that appeared missing for 13 cycles was being delivered to the wrong path. Lead Eng rescued the file. CoS must fix IE directive. See P2-NEW-5.

---

## Issues Found

### P1 — Must Fix Before TestFlight

---

**P1-NEW-1 — `pickup_assignments` context key: documented in prompt but not sent by route**

- **File:** `docs/prompts/household-chat-prompt.md` line 96 vs `apps/web/src/app/api/chat/route.ts` lines 481–525
- **Spec:** §16, §11 (failure modes — wrong parent assignment, confabulation)
- **Finding:** `household-chat-prompt.md` CONTEXT PROVIDED section (lines 91–100) lists `pickup_assignments: current pickup assignments with status` as a key that "will be included" per message. The `route.ts` context object does NOT include this key — route sends `speaking_to`, `today_events`, `partner_today_events`, `open_coordination_issues`, `recent_schedule_changes`, `partner_recent_schedule_changes`. There is no `pickup_assignments` query anywhere in the route.
- **Risk:** The model is primed to expect structured pickup assignment data it will never receive. Household thread queries like "Who's doing pickup tonight?" — the model will look for `pickup_assignments` in context, find nothing, and either confabulate or return a vague non-answer. Pickup assignment questions are a primary household coordination use case (§3A, §16).
- **Fix required:** Either (a) update `household-chat-prompt.md` CONTEXT PROVIDED section to remove `pickup_assignments` and note that pickup risk is surfaced via `open_coordination_issues` (trigger_type: pickup_risk), OR (b) add a `pickup_assignments` query to `route.ts` and include it in context. Option (a) is the lower-effort fix. IE action: update household-chat-prompt.md. Lead Eng action: verify context is consistent.

---

**P1-NEW-2 — Forbidden opener in §16 ambiguous-responsibility framing example**

- **File:** `docs/prompts/household-chat-prompt.md` lines 61–62, wired in `apps/web/src/app/api/chat/route.ts` `HOUSEHOLD_CHAT_SYSTEM_PROMPT`
- **Spec:** §8 (forbidden openers), §16 (social tone)
- **Finding:** The `HOUSEHOLD_CHAT_SYSTEM_PROMPT` contains contradictory instructions. Lines 47–55 of the system prompt explicitly list "It looks like…" as a forbidden opener. Lines 58–63 (§16 Tone by scenario) then give the following example for ambiguous responsibility: `"It looks like [event] needs a coverage decision."` — which is a complete sentence that opens with the exact forbidden phrase.
- **Risk:** The model receives a direct contradiction between the opener rule and the scenario framing guidance. Both are active in the same system prompt. The model will resolve this ambiguity unpredictably — sometimes producing the forbidden opener, sometimes avoiding it. §8 compliance becomes non-deterministic for ambiguous-responsibility household queries.
- **Literal contradiction in wired prompt:**
  - Line 50 of system prompt: `- "It looks like…"` [in Never open with list]
  - Line 61 of system prompt: `- Ambiguous responsibility → "It looks like [event] needs a coverage decision."` [in Tone by scenario]
- **Fix required:** Update the ambiguous-responsibility framing example to use a non-forbidden opener. Suggested: `"Coverage for [event] is unclear — worth a quick decision between you."` (MEDIUM confidence, coordination prompt, no forbidden opener). IE action: update `docs/prompts/household-chat-prompt.md` and rescue again to correct path. Lead Eng action: re-wire after IE updates.

---

### P2 — Fix Before TestFlight / Pre-Existing

---

**P2-NEW-3 — `household-chat-prompt.md` CONTEXT PROVIDED section does not match route.ts 6 context keys**

- **File:** `docs/prompts/household-chat-prompt.md` lines 91–100
- **Spec:** §16
- **Finding:** Lead Eng run AU commented `P2-NEW-2 resolved: all 6 context keys now documented in household-chat-prompt.md.` But the rescued `household-chat-prompt.md` CONTEXT PROVIDED section (lines 91–100) lists the OLD key set:
  - `household_thread: true` (not in route context object)
  - `today_events` (present, but described as "household events" — route sends only the logged-in parent's events; partner's events are in `partner_today_events`)
  - `pickup_assignments` (not in route — see P1-NEW-1)
  - `open_coordination_issues` (correct)
  - `recent_schedule_changes` (correct, but single-parent only)
  - `conversation_history` (sent as message history, not as a context JSON field)
  Missing from CONTEXT PROVIDED: `speaking_to`, `partner_today_events`, `partner_recent_schedule_changes`.
- **Risk:** Model's understanding of available context keys is inaccurate. Undocumented keys may be ignored or misinterpreted; documented-but-missing keys create false expectations.
- **Fix:** IE updates `household-chat-prompt.md` CONTEXT PROVIDED section to list the 6 actual keys: `speaking_to`, `today_events` (clarify: logged-in parent), `partner_today_events` (omitted when partner has no events), `open_coordination_issues`, `recent_schedule_changes` (logged-in parent), `partner_recent_schedule_changes` (omitted when empty or partner not linked). Note: `conversation_history` is passed as message turns, not a JSON context field. Note: P1-NEW-1 (pickup_assignments) must be resolved alongside this fix.

---

**P2-NEW-4 — SPRINT.md "Last Updated" header not updated by Lead Eng run AX**

- **File:** `docs/ops/SPRINT.md` line 5
- **Finding:** Lead Eng run AX appended a session output section at line 3921+ but did NOT update the `**Last Updated:**` header at line 5. The header still reads "2026-04-05 — CoS Coordinator (odd-hour :20, following QA run AU)." CoS Coordinator will read this stale header and not see that a new Lead Eng session has run.
- **Fix:** Lead Eng must update SPRINT.md `**Last Updated:**` header at the top of the file when completing a session, not just append a section body. (Procedural — Lead Eng action next session.)

---

**P2-NEW-5 — `docs/prompts/docs/` stale directory still present; IE still writing to wrong path**

- **File:** `docs/prompts/docs/` directory
- **Finding:** Austin deleted this directory on 2026-04-04 (B31 resolved). IE has since regenerated it and continues writing outputs there. Lead Eng run AX found that IE has written `household-chat-prompt.md`, `morning-briefing-prompt.md`, and SPRINT.md entries to `docs/prompts/docs/prompts/` across 13+ sessions. The 13-cycle blocker was caused entirely by IE's wrong path assumption.
- **Risk:** IE's future deliveries — including the P1-NEW-1 and P1-NEW-2 fixes — will again be written to the wrong path and not reach Lead Eng.
- **Fix required (CoS action):** Update IE agent directive (`docs/prompts/AGENT-PROMPT-intelligence-engineer.md`) to correct the working directory assumption. Also: Austin should delete `docs/prompts/docs/` again (Austin action) but the IE directive fix is the only durable solution.

---

**P2-NEW-6 (pre-existing) — `supabase/migrations/027_profile_timezone.sql` stub still present**

- **File:** `supabase/migrations/027_profile_timezone.sql`
- **Finding:** This no-op stub was created by Lead Eng run AK to resolve the B33 duplicate-prefix conflict. Austin was asked to delete it before running `supabase db push`. Austin ran `supabase db push` (B29 resolved) but did NOT delete the stub. The stub is harmless (comment-only, no SQL) but creates a confusing duplicate `027_` prefix alongside `027_coordination_issues_severity.sql`.
- **Fix:** Austin to run `rm supabase/migrations/027_profile_timezone.sql`. Pre-existing; non-blocking.

---

**P2-NEW-7 (pre-existing) — Conversation history not filtered by thread_id; elevated impact now household thread is live**

- **File:** `apps/web/src/app/api/chat/route.ts` lines 448–454
- **Finding:** History query: `.eq("profile_id", user.id).limit(50)` — fetches all conversation history for the user regardless of thread_type. Noted in prior QA runs as "low TestFlight risk, post-launch debt." With the household thread now live and active, this has elevated impact: the no-repetition rule in `HOUSEHOLD_CHAT_SYSTEM_PROMPT` checks `conversation_history` before responding, but that history includes personal thread messages. The model may incorrectly determine an issue was "already surfaced in this household thread" when it was surfaced in the personal thread.
- **Fix (post-TestFlight):** Add `.eq("thread_type", thread_type ?? "personal")` to history query. Or filter by a thread ID. Does not block TestFlight but should be scheduled for Launch Week.

---

**P2-NEW-8 — `household-chat-prompt.md` shows future `Last updated` timestamp**

- **File:** `docs/prompts/household-chat-prompt.md` line 4
- **Finding:** File header says `Last updated: 2026-04-06T06:00 (session 13)`. Today is 2026-04-05. Date is 1 day in the future. Likely a timezone artifact in IE's timestamp generation (IE may be using UTC+something and today's session ran late enough that UTC next-day time was written). Non-blocking, cosmetic.

---

## What Passed Clean

### Architecture ✅
- `apps/mobile/app/(tabs)/_layout.tsx`: exactly 3 tabs — `index`, `chat`, `settings`. No domain tabs. ✅
- Domain files confirmed present: `budget.tsx`, `family.tsx`, `fitness.tsx`, `meals.tsx` — not in tab bar ✅
- Scope guard: no Layer 2/3 features (schedule compression, escalation tiers) introduced ✅
- No web app UI changes ✅
- No Android targets ✅
- Migration `024_coordination_issues.sql` present ✅
- Migrations 025–028 all present ✅

### Today Screen — Output Compliance ✅ (confirmed clean from prior QA runs; spot-check clean)
- `parseBriefingBeats()` enforces 4-sentence cap via `.slice(0, 4)` ✅
- 1 active OPEN alert at a time: `openIssues[0] ?? null` ✅
- Check-in suppression when OPEN alert active: `showCheckins = activeOpenAlert === null` ✅
- Check-in daily limit: `.limit(2)` in `loadCheckins()` ✅
- `CleanDayState` renders "Clean day — nothing to stay ahead of." ✅
- `hasContent` gate correctly prevents empty-then-CleanDay false positive during load ✅
- `cleanDayText.fontFamily: "InstrumentSerif-Italic"` — P2-NEW (run AU) fix confirmed ✅
- Alert state machine: OPEN (bold, action affordance ✅), ACKNOWLEDGED (muted, no re-prompt ✅), RESOLVED (closure line → fade at 1400ms + 600ms ✅)
- State persists via Supabase + Realtime subscription ✅
- No `console.error` in `index.tsx` ✅

### Morning Briefing Route — Run AX Changes ✅
- ACKNOWLEDGED issues now included: `.in("state", ["OPEN", "ACKNOWLEDGED"])` ✅
- State tags `[state: OPEN]` / `[state: ACKNOWLEDGED]` passed to model in context ✅
- ACKNOWLEDGED framing guidance in system prompt: softer re-surface language, not full discovery urgency ✅
- Forbidden openers blocked in system prompt ✅
- Relief selection guide present with correct "→ use when" criteria for all 3 phrases ✅
- `console.error` calls gated with `NODE_ENV !== 'production'` (3 instances, all gated) ✅
- No `any` TypeScript types in route ✅
- ESLint clean (Lead Eng reported 0 warnings, 0 errors) ✅

### Chat Route — Run AX Changes ✅ (architecture and code quality; prompt compliance has P1 exceptions above)
- `HOUSEHOLD_CHAT_SYSTEM_PROMPT` now populated (not empty placeholder) ✅
- Thread routing: `thread_type === "household"` → `HOUSEHOLD_CHAT_SYSTEM_PROMPT` ✅
- Context object sends 6 keys: `speaking_to`, `today_events`, `partner_today_events` (conditional), `open_coordination_issues`, `recent_schedule_changes`, `partner_recent_schedule_changes` (conditional) ✅
- Conversation history fetched at `.limit(50)` — satisfies N≥10 requirement ✅
- §16 both-conflicted framing: "You've both got conflicts at that time — [implication]." ✅
- §16 one-parent-caused neutral framing: "A schedule change lands on [event] — [implication]." ✅
- §16 attribution rules: no `[Parent A] caused this problem` language ✅
- §23 confidence: HIGH = direct, MEDIUM = one qualifier, LOW = clarification offer ✅
- No-repetition rule instructs model to check history ✅
- Exact relief language enforced (3 phrases, `→ use when` logic) ✅
- No generic reassurance ("I've got this", "Don't worry") ✅
- No bare `console.error` introduced ✅
- No `any` types introduced ✅

### Failure Modes §11 ✅
- No vague outputs in system prompts (specificity enforced) ✅
- No-repetition rule present in both household and personal prompts ✅
- Attribution framing prevents wrong-parent-assignment in household thread ✅
- Mock response in route.ts: no forbidden openers, coordination-scoped ✅

---

## S4.6 E2E Status

**Not ready to close S4.6.** Two P1 issues in the wired `HOUSEHOLD_CHAT_SYSTEM_PROMPT` prevent §16 compliance sign-off:
- P1-NEW-1: model told to expect `pickup_assignments` context data it won't receive
- P1-NEW-2: forbidden opener example in ambiguous-responsibility framing

**Critical path now:** IE fixes `household-chat-prompt.md` (P1-NEW-1 + P1-NEW-2 + P2-NEW-3) → Lead Eng re-wires → QA audits §16 with corrected prompt → S4.6 closes → Austin B2 → S5.2 TestFlight.

IE must also fix working directory (P2-NEW-5 / CoS action) or the corrected files will again go to the wrong path.

---

## Spec Sections Verified

| Section | Status |
|---------|--------|
| §5 — Output limits | ✅ Verified (4-sentence cap, 1-alert queue, 2-checkin limit) |
| §7 — Silence rules | ✅ Verified (`hasContent` gate + CleanDayState) |
| §8 — Tone (forbidden openers, first-person, relief language) | ✅ Personal thread; ❌ Household thread (P1-NEW-2) |
| §11 — Failure modes | ✅ Verified |
| §12 — Alert state machine | ✅ Verified (OPEN/ACK/RESOLVED + persistence) |
| §16 — Social tone (household balanced framing) | ⚠️ Partially verified — both-conflicted and one-parent-caused framing ✅; ambiguous-responsibility has P1-NEW-2 violation |
| §21 — First-use emotional moment | ✅ Verified (prior QA run U) |
| §23 — Confidence signaling | ✅ Verified |

---

_— QA & Standards Lead, automated run AY, 2026-04-05_
