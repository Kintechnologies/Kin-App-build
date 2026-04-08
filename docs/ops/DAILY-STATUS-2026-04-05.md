# Kin AI — Daily Status Note
**Date:** 2026-04-05 (Sprint Day 5 of 14)
**Author:** CoS Coordinator (scheduled run AS)
**Sprint target:** TestFlight by 2026-04-16

---

## Latest Update — CoS Run AS (odd-hour :20, following QA Run AR)

### Sprint Pulse — Day 5 Morning

**P2-NEW (AR) ✅ resolved by Lead Eng run AS.** After QA Run AR filed the finding at 16:23 today, Lead Eng extended `route.ts` at 16:26 to add `partner_recent_schedule_changes` to the household context block. The fetch mirrors the `partner_today_events` pattern established in P2-23: uses `partnerProfileId` resolution, runs in parallel in the existing `Promise.all`, and conditionally includes `partner_recent_schedule_changes` in the context JSON (omitted when empty or partner not linked). This ensures that when `household-chat-prompt.md` goes live, the LLM will see both parents' calendar changes in the last 24 hours — addressing the §3C Late Schedule Change use case and preventing the §11 wrong-parent-assignment failure mode.

**Lead Eng now has zero open code tasks.** Both P2-23 and P2-NEW (AR) are resolved. The household context block is fully prepared for prompt wiring. All Lead Eng needs from here is IE's `household-chat-prompt.md` — a one-step paste into `HOUSEHOLD_CHAT_SYSTEM_PROMPT` in `route.ts`.

**IE `household-chat-prompt.md` is now 12+ consecutive even-hour cycles overdue.** This was escalated to Austin in CoS run AH. No delivery has occurred across 12+ even-hour windows. The household thread continues to use `chat-prompt.md` as a safe fallback (§16 balanced framing not enforced), meaning S4.6 household thread e2e cannot be declared complete. The routing infrastructure (run AN), the context extension (P2-23 + P2-NEW AR), and the wiring hook (empty `HOUSEHOLD_CHAT_SYSTEM_PROMPT` constant in `route.ts`) are all ready.

**QA audit gap.** No QA audit has been filed today yet. The most recent audit is QA Run AR (filed at ~16:23 on 2026-04-04). QA should pick up `route.ts` `partner_recent_schedule_changes` implementation in QA Run AS (next odd-hour :00).

**Sprint remains ~8 days ahead of schedule.** TestFlight target of 2026-04-16 is achievable with current velocity. The sole stage blocker is IE delivery.

---

### What Lead Eng Run AS Delivered

**File changed:** `apps/web/src/app/api/chat/route.ts`

- `partnerRecentChangesQuery` pre-built alongside `partnerEventsQuery` — resolves to no-op `Promise.resolve` when `partnerProfileId` is null (household-thread-only, same pattern as P2-23)
- `{ data: partnerRecentChanges }` destructured from `Promise.all` result
- `partner_recent_schedule_changes` conditionally spread into context JSON — omitted when result is empty, mirrors `partner_today_events` pattern exactly
- Addresses QA Run AR §3C concern: LLM will now see partner's calendar changes in the last 24 hours in household thread context when household prompt goes live

**tsc / ESLint status:** Not independently verified this run (same patterns as P2-23 fix, which passed 0 errors in run AR). QA to verify in QA Run AS.

---

### Pipeline Health (post-CoS Run AS)

| Check | Status |
|-------|--------|
| P&D specs current | ✅ 11 v0 specs current |
| IE prompts at correct path | ✅ 6 prompts at `docs/prompts/` |
| IE new deliverable needed | 🔴 `household-chat-prompt.md` — **12+ cycles overdue. ESCALATED to Austin in run AH.** |
| Lead Eng open code tasks | ✅ Zero (P2-NEW AR resolved run AS) |
| P&D open spec tasks | ✅ None |
| QA cadence | ⚠️ Gap — no audit today yet. Last: QA Run AR (16:23, 2026-04-04). QA Run AS should audit route.ts P2-NEW AR fix. |
| Scope violations | ✅ None — 3-tab architecture clean |
| B29 — supabase db push | 🟢 UNBLOCKED — Austin can run now. Applies migrations 027 + 028. |
| P2-5 / B31 | ❌ Stale `docs/prompts/docs/` still present — Austin must delete from terminal (`rm -rf docs/prompts/docs`) |
| P2-7 | ❌ IE: `morning-briefing-prompt.md` INPUT FORMAT mismatch still open |
| Check-in AI wiring (S2.3) | ❌ Awaiting Austin direction (cron vs inline architecture) |

---

### Stage Status (post-CoS Run AS)

| Stage | Status |
|-------|--------|
| Stage 1 — Shell + Data Layer | ✅ Complete (IE: `household-chat-prompt.md` + P2-7 still pending — non-blocking for TestFlight) |
| Stage 2 — Today Screen | ✅ Functionally complete (check-in AI wiring pending Austin S2.3 direction) |
| Stage 3 — Conversations | ✅ Complete |
| Stage 4 — First-Use + Settings | ✅ Personal thread e2e verified. Settings spec-compliant. Household context fully extended (P2-23 + P2-NEW AR ✅). **Household thread e2e (S4.6): blocked on IE** (12+ cycles overdue — escalated). |
| Stage 5 — RC + TestFlight | ⬜ Blocked on Austin B2 (RC entitlement + iOS bundle ID + API key) |

---

### Active Blockers (post-CoS Run AS)

| # | Priority | Owner | Description |
|---|----------|-------|-------------|
| `household-chat-prompt.md` | 🔴 P1 | **IE / Austin** | **ESCALATION (run AH). 12+ cycles overdue.** Household thread uses personal chat prompt — §16 balanced-framing not enforced. S4.6 household thread e2e blocked. All infrastructure ready — IE needs only to deliver prompt text. |
| B2 | 🔴 P0 | **Austin** | RevenueCat iOS app + products not yet configured. RC project `kin-ai-492223` created. Still needed: entitlement (e.g. `premium`), both products attached, iOS app (bundle ID + ASC), `EXPO_PUBLIC_REVENUECAT_API_KEY` in `.env`. Blocks S5.1/S5.2 TestFlight. |
| B4 | 🟡 P1 | **Austin** | OAuth branding incomplete — verification clock running. Logo + homepage/privacy/ToS URLs + authorized domain + submit still needed. Every day not submitted is a day lost on the 4–6 week clock. |
| B21 | 🟡 P1 | **Austin** | Patch `first_name` for existing Supabase `profiles` row in dashboard. |
| B29 | 🟢 UNBLOCKED | **Austin** | `supabase db push` — clear since run AL. Applies `027_coordination_issues_severity.sql` + `028_profile_timezone.sql`. Severity writes from alert-prompt are failing silently in prod until this runs. Also delete `027_profile_timezone.sql` stub file. |
| B31 / P2-5 | 🟡 P2 | **Austin** | Stale `docs/prompts/docs/` directory still present (AGENT-PIPELINE.md marked resolved but directory still exists). Run `rm -rf docs/prompts/docs` from terminal. |
| P2-7 | 🟡 P2 | **IE** | `morning-briefing-prompt.md` INPUT FORMAT describes structured JSON that route never sends. Fix: update prompt file to reflect actual text input, or refactor route to send structured JSON. |

---

### Critical Path

```
IE delivers household-chat-prompt.md (P1 — 12+ cycles overdue)
  → Lead Eng pastes prompt into HOUSEHOLD_CHAT_SYSTEM_PROMPT in route.ts (1-step wire)
  → QA audits §16 balanced framing + context completeness (partner_today_events + partner_recent_schedule_changes)
  → S4.6 e2e declared complete
  → Austin B2: RC entitlement + iOS app + API key
  → S5.2: TestFlight build + submission
  → QA: S5.3 TestFlight build verification
```

**Estimated remaining if IE delivers next cycle:** 3–4 more cycles to TestFlight.

---

_— CoS Coordinator, 2026-04-05 (run AS)_

---

## Latest Update — CoS Run AV (odd-hour :20, following QA Run AU)

### Sprint Pulse — Day 5 Evening

**QA run AU returned zero new findings.** The run audited Lead Eng run AU (2026-04-05): `cleanDayText` font fix in `index.tsx`, context key comment block in `route.ts`, and SPRINT.md annotation. All three P2s from QA run AR confirmed resolved and fully spec-compliant. Code quality clean across both files. Architecture re-confirmed (3 tabs, domain files intact, no scope violations). QA cadence is healthy.

**Lead Eng velocity remains strong.** Zero open code tasks entering this cycle — both font fixes (run AR + run AU) and both documentation items (P2-NEW-1, P2-NEW-2) are done. The codebase is correctly staged for household prompt wiring.

**IE `household-chat-prompt.md` escalation remains active.** Confirmed absent from `docs/prompts/` this run. Now **13+ consecutive even-hour cycles overdue** since first filed in QA run R. Every context key IE needs is documented in `route.ts` lines 155–172 with explicit IE instructions. The wiring step is a single paste. No further blockers exist on the agent side. Escalation to Austin standing since run AH.

**No new blockers introduced this cycle.**

---

### Pipeline Health (Day 5 Evening)

| Check | Status |
|-------|--------|
| P&D specs | ✅ 12/12 approved and current |
| IE prompts (delivered) | ✅ 6 prompts present |
| `household-chat-prompt.md` | 🔴 MISSING — 13+ cycles overdue — escalation active |
| Lead Eng open tasks | ✅ Zero |
| QA cadence | ✅ QA run AU filed — healthy |
| Scope guard | ✅ Clean |

---

### Stage Status

| Stage | Status |
|-------|--------|
| S1 Shell + Data Layer | ✅ Complete |
| S2 Today Screen | ✅ Complete (silence state fully spec-compliant post-run AU) |
| S3 Conversations Screen | ✅ Complete |
| S4 First-Use + Settings | ⬜ S4.6 e2e blocked on IE `household-chat-prompt.md` |
| S5 RC + TestFlight | ⬜ Blocked on Austin B2 |

---

### For Austin

**What's blocking TestFlight — two items, both Austin-owned:**

1. **B2 (critical path):** RevenueCat iOS app configuration. RC project `kin-ai-492223` exists. Still needed:
   - Create entitlement (e.g. `premium`) in RC dashboard
   - Attach both products (`kin_monthly_3999`, `kin_annual_29900`) to the entitlement
   - Add iOS app (bundle ID + App Store Connect connection)
   - Add `EXPO_PUBLIC_REVENUECAT_API_KEY` to `.env`

2. **B4 (time-sensitive clock):** Google OAuth verification not yet submitted. This triggers a 4–6 week review by Google — the longer it goes unsubmitted, the more it pushes the post-TestFlight window. Submit: logo, homepage URL, privacy/ToS URLs, `kinai.family` as authorized domain.

**IE escalation (flagged to Austin since run AH):** The `household-chat-prompt.md` prompt has not been delivered by the Intelligence Engineer in 13+ even-hour cycles. The prompt is a P1 item and the sole remaining blocker on S4.6 (full e2e). If the IE agent has an unresolved issue, Austin may need to intervene.

**Quick maintenance items:**
- `rm supabase/migrations/027_profile_timezone.sql` (no-op stub — delete before next `supabase db push`)

---

### Critical Path

```
IE delivers household-chat-prompt.md  ← ESCALATED (13+ cycles overdue)
  → Lead Eng wires (1 paste)
  → QA §16 audit
  → S4.6 complete
  → Austin B2 (RC entitlement + iOS app + key)
  → S5.2 TestFlight
```

**Estimated time to TestFlight:** 3–4 cycles after IE delivers + B2 resolved.
**Target date:** April 18–19 — achievable at current velocity.

_— CoS Coordinator, 2026-04-05 (run AV)_

---

## Latest Update — CoS Run AZ (odd-hour :20, following QA Run AY)

### Sprint Pulse — Day 5 Late Evening

**Major progress in Lead Eng run AX, but S4.6 not yet closed.** The 13-cycle `household-chat-prompt.md` mystery is now solved: IE has been delivering all outputs to `docs/prompts/docs/prompts/` (wrong path) due to a relative-path assumption. Lead Eng run AX discovered this, rescued the household prompt and an updated morning-briefing prompt, wired both into their respective routes, and filed the root cause. The `HOUSEHOLD_CHAT_SYSTEM_PROMPT` is no longer empty — §16 framing is now active in the household thread.

**QA run AY found 2 P1s in the wired prompt.** The rescued `household-chat-prompt.md` contains authoring errors that prevent §16 compliance sign-off:
- **P1-NEW-1:** Prompt documents a `pickup_assignments` context key that `route.ts` never sends. For pickup-related household queries, the model will look for data that isn't there and either confabulate or produce a vague non-answer. This is a primary Kin household use case (§3A).
- **P1-NEW-2:** The ambiguous-responsibility framing example literally opens with "It looks like…" — a phrase explicitly forbidden in the opener rule in the same prompt. §8 compliance becomes non-deterministic.

**CoS fixed the IE path issue (P2-NEW-5).** The IE agent directive (`docs/prompts/AGENT-PROMPT-intelligence-engineer.md`) has been updated with a prominent, explicit path rule explaining the correct (repo-root-relative) vs. incorrect (relative-within-docs) pattern. This is the durable fix. Future IE sessions should deliver to `docs/prompts/` correctly. Austin should also run `rm -rf docs/prompts/docs` from terminal to clear the stale shadow directory.

---

### For Austin

**Two items still on your critical path:**

1. **B2 (critical path — TestFlight):** RevenueCat iOS app configuration. RC project `kin-ai-492223` created. Still needed:
   - Create entitlement (e.g. `premium`) in RC dashboard
   - Attach both products (`kin_monthly_3999`, `kin_annual_29900`) to the entitlement
   - Add iOS app (bundle ID + App Store Connect connection)
   - Add `EXPO_PUBLIC_REVENUECAT_API_KEY` to `.env`

2. **B4 (time-sensitive):** Google OAuth verification not yet submitted. The 4–6 week Google review clock starts when you submit — every day unsubmitted is a day lost. Submit: logo, homepage URL, privacy/ToS URLs, `kinai.family` as authorized domain.

**Quick maintenance:**
- `rm supabase/migrations/027_profile_timezone.sql` — no-op stub, delete before next `supabase db push`
- `rm -rf docs/prompts/docs` — IE regenerated this stale directory. CoS has fixed the root cause in the IE directive, but clean up the directory manually.

**IE status update:** The 13-cycle blocker was a path bug, not a capability failure. IE has been delivering `household-chat-prompt.md` to the wrong directory every session. The rescued prompt has authoring errors that need to be fixed (P1-NEW-1: wrong context key; P1-NEW-2: forbidden opener in example). After CoS's directive fix, IE's next session should deliver the corrected file to the right place. No Austin intervention needed unless IE still misfires next cycle.

---

### Stage Status (end of Day 5)

| Stage | Status |
|-------|--------|
| S1 — Shell + Data Layer | ✅ Complete |
| S2 — Today Screen | ✅ Complete (ACKNOWLEDGED briefing framing live after run AX) |
| S3 — Conversations Screen | ✅ Complete |
| S4 — First-Use + Settings | ⬜ **S4.6 blocked** — household prompt wired but has P1 errors. IE to fix → Lead Eng re-wire → QA §16 audit → close |
| S5 — RC + TestFlight | ⬜ Blocked on Austin B2 |

---

### Critical Path

```
IE delivers corrected household-chat-prompt.md (P1-NEW-1 + P1-NEW-2 + P2-NEW-3)
  → to docs/prompts/ at repo root (directive fix in place)
  → Lead Eng re-wires HOUSEHOLD_CHAT_SYSTEM_PROMPT (1 paste)
  → QA audits §16 + CONTEXT PROVIDED accuracy
  → S4.6 declared complete
  → Austin B2 (RC entitlement + iOS app + API key)
  → S5.2 TestFlight build
  → QA S5.3 verification
```

**Estimated time to TestFlight:** 3–4 cycles after IE delivers + Austin completes B2.
**Target date:** April 18–19.

_— CoS Coordinator, 2026-04-05 (run AZ)_

---

## Latest Update — CoS Run BC (odd-hour :20, following QA Run BB + P&D Run BB)

### Sprint Pulse — Day 5 Night (21:27)

**All four build stages are complete.** QA Run BB signed off §16 — S4.6 is done. The household thread social tone is compliant: forbidden openers gone, balanced framing for both-conflicted and one-parent-caused scenarios verified, pickup-risk surfacing documented correctly. No P0 or P1 issues remain anywhere in the codebase.

**The sole TestFlight gate is Austin's B2.** RevenueCat iOS app setup — create a `premium` entitlement, attach both products (`kin_monthly_3999`, `kin_annual_29900`), add the iOS app (bundle ID + App Store Connect), and add `EXPO_PUBLIC_REVENUECAT_API_KEY` to `.env`. Once that's done, Lead Eng can uncommit the RC integration (already fully built in `revenuecat.ts` and `PaywallModal.tsx`) and submit the TestFlight build.

**Lead Eng has 5 P2s, all non-blocking.** P&D Run BB's deviation audit found that four Instrument Serif Italic placements are built as Geist SemiBold — `briefingHook`, `briefingTitle`, `displayName`, and `listTitle`. Each is a one-line fix. Not required for TestFlight, but needed before App Store screenshots where the briefing card is the hero moment. Also on Lead Eng: P2-NEW-BB-1 (sync the wired `HOUSEHOLD_CHAT_SYSTEM_PROMPT` CONTEXT PROVIDED section to fully mirror the source file — 3 annotations missing).

**QA cadence strong.** Run BB filed this cycle, targeting §16 compliance — the primary outstanding audit target. No gaps.

---

### For Austin

**Two items blocking or time-sensitive:**

1. **B2 (P0 — critical path):** RevenueCat iOS app configuration. Steps:
   - In RC dashboard (`app.revenuecat.com`): create entitlement named `premium`
   - Attach both products (`kin_monthly_3999`, `kin_annual_29900`) to the `premium` entitlement
   - Add iOS app: bundle ID + App Store Connect connection
   - Add `EXPO_PUBLIC_REVENUECAT_API_KEY` to `.env` in the repo

2. **B4 (time-sensitive clock):** Google OAuth verification — the 4–6 week review clock starts when you submit. Submit: logo, homepage URL, privacy/ToS URLs, `kinai.family` as an authorized domain. Every day unsubmitted is a day lost post-TestFlight.

**Quick terminal maintenance:**
- `rm -rf docs/prompts/docs` — stale IE shadow directory is still present (confirmed this run)
- `rm supabase/migrations/027_profile_timezone.sql` — no-op stub, delete before next `supabase db push`

---

### Stage Status

| Stage | Status |
|-------|--------|
| S1 — Shell + Data Layer | ✅ Complete |
| S2 — Today Screen | ✅ Complete |
| S3 — Conversations Screen | ✅ Complete |
| S4 — First-Use + Settings | ✅ **Complete** — S4.6 §16 sign-off by QA Run BB |
| S5 — RC + TestFlight | ⬜ Blocked on Austin B2 |

---

### Critical Path

```
Austin B2 (RC entitlement + iOS app + API key)
  → Lead Eng S5.1 commit + S5.2 TestFlight build
  → QA S5.3 TestFlight verification
  → 🚀 TestFlight
```

**Estimated time to TestFlight:** 3–4 cycles once Austin completes B2.
**Target date:** April 18–19. Achievable. 11 days remain.

_— CoS Coordinator, 2026-04-05 (run BC)_
