# Kin AI — Agent Assembly Line
**Version:** 1.1 (3-tab rebuild — post architectural pivot)
**Updated:** 2026-04-03
**Owner:** CoS Coordinator

---

## The Problem This Solves

Agents communicate through files. Product & Design writes specs → Lead Eng reads them. Intelligence Engineer writes prompts → Lead Eng wires them. Lead Eng writes code → QA audits it. CoS reads everything → updates the sprint board and flags Austin.

Without deliberate sequencing, agents run simultaneously and each one improvises what the previous agent was supposed to provide. This is how Lead Eng ends up building without visual specs, and how tone drift enters the AI layer.

The assembly line enforces the handoff order. Each agent knows what to read before it starts, and what to produce so the next agent can proceed.

---

## The 2-Hour Cycle

```
EVEN HOUR :00 ──────────────────────────────────────────────────────
  ┌─────────────────────┐   ┌─────────────────────────────────┐
  │  Product & Design   │   │     Intelligence Engineer       │
  │  Produces:          │   │  Produces:                      │
  │  - Component specs  │   │  - System prompt drafts/updates │
  │  - Motion specs     │   │  - Drift review                 │
  │  - Silence states   │   │  - Trigger test results         │
  │  Saves to:          │   │  Saves to:                      │
  │  docs/specs/        │   │  docs/prompts/                  │
  └─────────┬───────────┘   └───────────────┬─────────────────┘
            │                               │
EVEN HOUR :30 ─────────────────────────────────────────────────────
            └───────────────┬───────────────┘
                  ┌─────────▼───────────┐
                  │    Lead Engineer    │
                  │  Reads:             │
                  │  - docs/specs/      │
                  │  - docs/prompts/    │
                  │  - SPRINT.md        │
                  │  Builds:            │
                  │  - Next sprint item │
                  │  Updates:           │
                  │  - SPRINT.md        │
                  └─────────┬───────────┘
                            │
ODD HOUR :00 ───────────────────────────────────────────────────────
                  ┌─────────▼───────────┐
                  │   QA & Standards    │
                  │  Reads:             │
                  │  - Latest code      │
                  │  - docs/prompts/    │
                  │  - SPRINT.md        │
                  │  Audits against:    │
                  │  - Intelligence eng │
                  │    spec §5,7,8,11,  │
                  │    §12,§16,§23      │
                  │  Saves to:          │
                  │  - QA-AUDIT-[date]  │
                  └─────────┬───────────┘
                            │
ODD HOUR :20 ───────────────────────────────────────────────────────
                  ┌─────────▼───────────┐
                  │  CoS Coordinator    │
                  │  Reads:             │
                  │  - QA audit         │
                  │  - SPRINT.md        │
                  │  - All role outputs │
                  │  Updates:           │
                  │  - SPRINT.md        │
                  │  - DAILY-STATUS     │
                  │  Flags to Austin:   │
                  │  - Blockers         │
                  │  - Decisions needed │
                  └─────────────────────┘

REPEAT ─────────────────────────────────────────────────────────────
```

**Cycle time: 2 hours**
**Daily capacity: ~12 full cycles**

---

## Agent Schedules

| Agent | Cron | Fires at | Role in cycle |
|-------|------|----------|---------------|
| Product & Design | `0 0,2,4,...,22 * * *` | Even hours :00 | Specs first — Lead Eng waits on this |
| Intelligence Engineer | `0 0,2,4,...,22 * * *` | Even hours :00 | Prompts first — runs parallel with P&D |
| Lead Engineer | `30 0,2,4,...,22 * * *` | Even hours :30 | Builds after P&D + IE have had 30 min |
| QA & Standards | `0 1,3,5,...,23 * * *` | Odd hours :00 | Audits Lead Eng's previous session |
| CoS Coordinator | `20 1,3,5,...,23 * * *` | Odd hours :20 | Reads QA, updates sprint board |
| Daily Briefing | `0 7 * * *` | 7:00 AM daily | Austin's morning read |
| Weekly Report | `0 9 * * 6` | Saturday 9 AM | Week-in-review |

---

## Handoff Protocol

### Product & Design → Lead Engineer

P&D saves component specs to `docs/specs/` using this naming convention:
- `docs/specs/today-screen-spec.md` — Today screen component layout + states
- `docs/specs/alert-card-spec.md` — Alert card visual states (OPEN/ACKNOWLEDGED/RESOLVED)
- `docs/specs/briefing-card-spec.md` — Morning briefing card
- `docs/specs/checkin-card-spec.md` — Check-in card
- `docs/specs/silence-state-spec.md` — Today screen when Kin has nothing to surface
- `docs/specs/conversations-screen-spec.md` — Personal + household thread layout
- `docs/specs/first-use-spec.md` — Day-one emotional moment visual container

**Lead Eng rule:** Do not build any new UI component without a spec file in `docs/specs/`. If no spec exists yet, build the logic/data layer and flag in SPRINT.md that the UI is blocked on spec.

### Intelligence Engineer → Lead Engineer

IE saves system prompts to `docs/prompts/`:
- `docs/prompts/morning-briefing-prompt.md` — System prompt for briefing generation
- `docs/prompts/alert-prompt.md` — System prompt for alert text generation
- `docs/prompts/checkin-prompt.md` — System prompt for check-in card copy
- `docs/prompts/chat-prompt.md` — Main Kin chat system prompt (updates to existing)
- `docs/prompts/closure-prompt.md` — Resolution closure line generation
- `docs/prompts/first-use-prompt.md` — Engineered first-insight generation

**Lead Eng rule:** Wire AI outputs using the prompt in `docs/prompts/` — do not write system prompt copy directly in route.ts. The prompt files are the source of truth; routes reference them or copy them in on build.

### Lead Engineer → QA

Lead Eng updates SPRINT.md with:
- Which files were changed this session
- Which spec files were used (confirms P&D handoff was consumed)
- Any prompt files wired (confirms IE handoff was consumed)
- Any open questions or blockers

**QA rule:** Start each session by reading SPRINT.md "Last Updated" to find what Lead Eng changed, then audit those specific files.

### QA → CoS

QA saves audit to `docs/ops/QA-AUDIT-[date].md` with:
- Issues found (P0/P1/P2)
- Files audited
- Spec sections checked
- What passed clean

**CoS rule:** Read the latest QA audit before updating SPRINT.md. QA findings that are P0 or P1 go directly into the SPRINT.md blockers table.

---

## Current Build Queue (3-Tab Rebuild)

Agents: check this queue to know what to work on next. Mark items **[IN PROGRESS]** when you start, **[DONE]** when complete.

### Stage 1 — Shell + Data Layer
| # | Task | Owner | Needs | Status |
|---|------|-------|-------|--------|
| S1.1 | 3-tab `_layout.tsx` restructure | Lead Eng | Nothing | ✅ DONE — QA Run C verified; 3 tabs only, no domain nav |
| S1.2 | `coordination_issues` Supabase table + migration | Lead Eng | Nothing | ✅ DONE — `024_coordination_issues.sql` verified by QA Run C |
| S1.3 | Pickup Risk detection logic (§3A) | Lead Eng | Nothing | ✅ DONE — `lib/pickup-risk.ts` + `/api/cron/pickup-risk/route.ts`; wired into morning-briefing context |
| S1.4 | Today screen component specs | Product & Design | Nothing | ✅ DONE — `today-screen-spec.md`, `briefing-card-spec.md`, `checkin-card-spec.md` |
| S1.5 | Alert card visual specs (all 3 states) | Product & Design | Nothing | ✅ DONE — `alert-card-spec.md` |
| S1.6 | Silence state design spec | Product & Design | Nothing | ✅ DONE — `silence-state-spec.md` |
| S1.7 | System prompts — briefing + alert + check-in | Intelligence Eng | Nothing | ✅ DONE — All 6 prompts at `docs/prompts/`. `morning-briefing-prompt.md` + `alert-prompt.md` wired in production (Run P). `first-use-prompt.md` wired (Run T). `chat-prompt.md` ready; wiring pending (B30). `checkin-prompt.md` + `closure-prompt.md` delivered; wiring pending architecture decision. |
| S1.8 | Drift review of existing `system-prompt.ts` | Intelligence Eng | Nothing | 🔄 IN PROGRESS — B30 documents drift findings. IE action: author `household-chat-prompt.md` + fix P2-7 (`morning-briefing-prompt.md` INPUT FORMAT). |

### Stage 2 — Today Screen Build
| # | Task | Owner | Needs | Status |
|---|------|-------|-------|--------|
| S2.1 | Briefing card component | Lead Eng | S1.4 + S1.7 | ✅ DONE (static wiring) — `parseBriefingBeats()` + 4-sentence cap in index.tsx; full AI wiring blocked on S1.7 |
| S2.2 | Alert card component (OPEN/ACK/RESOLVED states) | Lead Eng | S1.5 + S1.2 | ✅ DONE — QA Run C verified all 3 states, state machine, Realtime subscription |
| S2.3 | Check-in card component | Lead Eng | S1.4 + S1.7 | ✅ DONE (data layer) — `026_kin_check_ins.sql`, `.limit(2)` in loadCheckins; AI prompt wiring blocked on S1.7 |
| S2.4 | Silence state render | Lead Eng | S1.6 | ✅ DONE — QA Run C verified `CleanDayState` + `hasContent` gating |
| S2.5 | Late Schedule Change detection + push (§3C) | Lead Eng | S1.2 | ✅ DONE — `lib/late-schedule-change.ts` + wired into `lib/calendar/sync.ts` after conflict detection; push notification handler in mobile `push-notifications.ts` updated (run L) |
| S2.6 | QA: architecture audit (3-tab, no domain nav) | QA | S1.1 | ✅ DONE — QA Run C confirmed |
| S2.7 | QA: Today screen output compliance | QA | S2.1–S2.4 | ✅ DONE — QA Run C: §5 output limits, §7 silence, §8 tone, §12 alert state machine all verified |

### Stage 3 — Conversations Screen
| # | Task | Owner | Needs | Status |
|---|------|-------|-------|--------|
| S3.1 | Conversations screen spec (personal + household) | Product & Design | Nothing | ✅ DONE — `conversations-screen-spec.md` |
| S3.2 | Personal thread (existing chat logic, restructured) | Lead Eng | S3.1 | ✅ DONE — pinned Personal thread in chat.tsx, QA Run B verified |
| S3.3 | Household thread (shared, partner-linked) | Lead Eng | S3.1 | ✅ DONE — pinned Home (household) thread, QA Run B verified |
| S3.4 | Partner-not-linked state (invite prompt) | Lead Eng | S3.1 | ✅ DONE — partner invite prompt shown when partner hasn't accepted |
| S3.5 | QA: Conversations screen audit | QA | S3.2–S3.4 | ✅ DONE (covered in QA Run B) — P0-4, P1 issues found and resolved in subsequent Lead Eng session |

### Stage 4 — First-Use Moment + Settings
| # | Task | Owner | Needs | Status |
|---|------|-------|-------|--------|
| S4.1 | First-use emotional moment spec | Product & Design | Nothing | ✅ DONE — `first-use-spec.md` |
| S4.2 | First-use prompt engineering + wiring | Intelligence Eng + Lead Eng | S4.1 | ✅ DONE — `first-use-prompt.md` authored; `/api/first-use` route wired (Run T); `getFirstUseInsight()` in `api.ts`; `index.tsx` first-open gate live. QA Run U: fully verified against §5/§8/§21/§23. |
| S4.3 | First-use moment implementation | Lead Eng | S4.1 + S4.2 | ✅ DONE — Dynamic first-use live (S4.2 complete). |
| S4.4 | Settings screen cleanup (remove domain tab refs) | Lead Eng | Nothing | ✅ DONE — settings.tsx updated in pivot build |
| S4.5 | IE: pre-TestFlight drift review (all prompts) | Intelligence Eng | All prompts done | ✅ DONE — Lead Eng Run T documented drift in B30: `/api/chat/route.ts` uses `buildSystemPrompt` not `chat-prompt.md`. B30 filed; Lead Eng to wire. |
| S4.6 | QA: full e2e flow (onboarding → Today → alert → chat) | QA | All above + B30 resolved | ✅ DONE — QA run BB §16 sign-off complete. P1-NEW-2 resolved, §16 audit passes. P2-NEW-BB-1 filed (non-blocking). |

### Stage 5 — RevenueCat + TestFlight (needs Austin: B1–B3)
| # | Task | Owner | Needs | Status |
|---|------|-------|-------|--------|
| S5.1 | RevenueCat integration with new 3-tab shell | Lead Eng | B1 (Austin commit) | ✅ DONE (uncommitted) — `revenuecat.ts`, `PaywallModal.tsx`, settings.tsx RC init all built; blocked on Austin committing B8 |
| S5.2 | TestFlight build + submission | Lead Eng | B1–B3 resolved | ⬜ — blocked on Austin B1/B2/B3/B8 |
| S5.3 | QA: TestFlight build verification | QA | S5.2 | ⬜ |

---

## Austin's Blockers (agents cannot proceed past these without Austin)

| # | Blocker | Blocks | What Austin does |
|---|---------|--------|-----------------|
| B1 | ~~Commit Step 10 (RevenueCat + #67)~~ | ✅ Resolved | Committed + pushed 2026-04-03 evening. |
| B2 | Create RC products + entitlements in RevenueCat dashboard | S5.1 | ~~Products `kin_monthly_3999` + `kin_annual_29900` created 2026-04-04 ✅.~~ Still needed: create entitlement (e.g. `premium`), attach both products to it, add iOS app (bundle ID + ASC), add `EXPO_PUBLIC_REVENUECAT_API_KEY` to `.env`. |
| B3 | ~~`supabase db push` (migrations 013–026)~~ | ✅ Resolved | Run 2026-04-03 evening. |
| B4 | Google OAuth verification submitted | TestFlight | Logo, homepage/privacy/ToS URLs, `kinai.family` authorized domain → submit verification. |
| B29 | ~~`supabase db push` (migrations 027–028)~~ | ✅ Resolved | Run 2026-04-04. Severity column + profile timezone now live in prod. |
| B31 | ~~Delete `docs/prompts/docs/` stale directory~~ | ✅ Resolved | `rm -rf docs/prompts/docs` run 2026-04-04. |

---

## File Index — Where Agents Read and Write

| Path | Owner | Consumers |
|------|-------|-----------|
| `docs/ops/SPRINT.md` | CoS (updates), Lead Eng (updates) | All agents (read before every session) |
| `docs/ops/ARCH-PIVOT-2026-04-03.md` | CoS | All agents (required reading) |
| `docs/ops/AGENT-PIPELINE.md` | CoS | All agents (this file) |
| `docs/ops/QA-AUDIT-[date].md` | QA | CoS, Lead Eng |
| `docs/ops/DAILY-STATUS-[date].md` | CoS | Austin |
| `docs/specs/[component]-spec.md` | Product & Design | Lead Eng |
| `docs/prompts/[type]-prompt.md` | Intelligence Engineer | Lead Eng |
| `kin-v0-product-spec.md` | Austin | All agents |
| `kin-v0-intelligence-engine.md` | Austin | Lead Eng, IE, QA |

---

_— CoS Coordinator, 2026-04-03. Update when pipeline changes._
