# Kin v0 — Agent Pipeline & Build Queue
**Updated:** 2026-04-04

This is the assembly line. Each agent reads this file at the start of every session to find their next unchecked task. Mark tasks `[x]` when complete, add blocker notes inline.

---

## PIPELINE STAGES

### S1 — Shell + Data Layer
**Goal:** 3-tab shell live, coordination_issues table ready, Pickup Risk wired, P&D specs drafted, IE prompts drafted.

**Lead Engineer**
- [ ] S1-LE-01: Restructure `apps/mobile/app/(tabs)/_layout.tsx` to 3 tabs (today, conversations, settings)
- [ ] S1-LE-02: Remove domain tabs from navigation (meals, budget, fitness, family remain as data files only)
- [ ] S1-LE-03: Create Supabase migration for `coordination_issues` table
- [ ] S1-LE-04: Wire Pickup Risk detection logic (§3A) — read calendar/schedule data, write to coordination_issues on trigger
- [ ] S1-LE-05: Scaffold `/api/morning-briefing` route (data layer only — no AI wiring until IE prompts exist)
- [ ] S1-LE-06: Scaffold Today screen layout shell (no content yet — wait for P&D specs)

**Product & Design**
- [ ] S1-PD-01: `today-screen-spec.md` — overall layout, scroll behavior, component order
- [ ] S1-PD-02: `briefing-card-spec.md` — loading skeleton, content state, typography
- [ ] S1-PD-03: `alert-card-spec.md` — all 3 states (OPEN, ACKNOWLEDGED, RESOLVED)
- [ ] S1-PD-04: `checkin-card-spec.md` — observation + optional prompt, dismissible
- [ ] S1-PD-05: `silence-state-spec.md` — calm, intentional, never empty or broken

**Intelligence Engineer**
- [x] S1-IE-01: `morning-briefing-prompt.md` — system prompt for `/api/morning-briefing` ✓ 2026-04-04; updated S3: `last_surfaced_insight` input field added (Lead Eng: needs persistence layer)
- [x] S1-IE-02: `alert-prompt.md` — coordination issue text generation ✓ 2026-04-04
- [x] S1-IE-03: `checkin-prompt.md` — check-in card copy ✓ 2026-04-04; updated S3: `last_surfaced_at` input field added (Lead Eng: needs persistence layer); prompt field tone fixed
- [x] S1-IE-04: `chat-prompt.md` — main Kin chat system prompt (personal thread only) ✓ 2026-04-04
- [x] S1-IE-05: `closure-prompt.md` — resolution closure lines (§24) ✓ 2026-04-04
- [x] S1-IE-06: `first-use-prompt.md` — engineered first-insight (§21) ✓ 2026-04-04
- [x] S1-IE-07: `trigger-test-log.md` — §3A + §3C scenario tests ✓ 2026-04-04; updated S3: 8/8 pass
- [x] S1-IE-08: `household-chat-prompt.md` — household thread system prompt (§16 social tone) ✓ 2026-04-04 S3 (gap identified and closed; Lead Eng: wire household thread to THIS prompt, not chat-prompt.md)

**QA**
- [ ] S1-QA-01: Architecture audit — tab count, domain files, migration existence
- [ ] S1-QA-02: Prompt file review — tone compliance (§8), output limits (§5), confidence rules (§23)

---

### S2 — Today Screen
**Goal:** Briefing card, alert cards, check-in cards, silence state all rendered and wired.

**Lead Engineer**
- [ ] S2-LE-01: Briefing card — fetch `/api/morning-briefing`, loading skeleton, render
- [ ] S2-LE-02: Alert cards — read `coordination_issues`, render OPEN/ACKNOWLEDGED/RESOLVED states
- [ ] S2-LE-03: Check-in cards — max 2/day, suppressed when High-priority OPEN alert exists
- [ ] S2-LE-04: Silence state — "Clean day — nothing to stay ahead of." or ambient empty state
- [ ] S2-LE-05: Wire `/api/morning-briefing` to `morning-briefing-prompt.md` system prompt
- [ ] S2-LE-06: Wire alert generation to `alert-prompt.md` system prompt
- [ ] S2-LE-07: Wire check-in cards to `checkin-prompt.md` system prompt

**QA**
- [ ] S2-QA-01: Output limits audit (§5) — briefing max 4 sentences, alert 1 sentence, check-in format
- [ ] S2-QA-02: Tone audit (§8) — no forbidden openers in any rendered output
- [ ] S2-QA-03: Alert state machine (§12) — all 3 states render correctly, persist in Supabase
- [ ] S2-QA-04: Silence rules (§7) — Today never renders filler
- [ ] S2-QA-05: Confidence signaling (§23) — High: no qualifiers; Medium: exactly one; Low: silence

---

### S3 — Conversations Screen
**Goal:** Personal and household threads live, partner invite prompt wired.

**Product & Design**
- [ ] S3-PD-01: `conversations-screen-spec.md` — thread list, personal vs. household visual distinction, partner-not-linked state

**Lead Engineer**
- [ ] S3-LE-01: Conversations screen thread list (personal + household)
- [ ] S3-LE-02: Thread detail / chat view — wire to existing `lib/kin-ai.ts`
- [ ] S3-LE-03: Household thread — partner not linked → show invite prompt
- [ ] S3-LE-04: Personal thread wired to `chat-prompt.md` system prompt

**QA**
- [ ] S3-QA-01: Social tone audit (§16) — clear responsibility = direct; both conflicted = collaborative
- [ ] S3-QA-02: Household thread balance — neither parent singled out
- [ ] S3-QA-03: Partner invite prompt renders when partner not linked

---

### S4 — First-Use Moment + Settings Cleanup
**Goal:** Day-one experience spec-compliant, Settings cleaned of domain tab references.

**Product & Design**
- [ ] S4-PD-01: `first-use-spec.md` — visual container, animation, first-insight framing (§21)

**Lead Engineer**
- [ ] S4-LE-01: Wire first-use moment to `first-use-prompt.md`
- [ ] S4-LE-02: Settings cleanup — remove domain tab references
- [ ] S4-LE-03: Wire `closure-prompt.md` to RESOLVED alert state fade

**QA**
- [ ] S4-QA-01: First-use output review — does it feel earned and specific? (§21)
- [ ] S4-QA-02: Closure line renders and fades correctly (§24)

---

### S5 — RevenueCat + TestFlight
**Status: BLOCKED — waiting on Austin (B1, B2, B3)**

- [ ] S5-01: RevenueCat integration (blocked on B1: Austin to run Step 10 commands)
- [ ] S5-02: RC products configured in RevenueCat dashboard (blocked on B2: Austin)
- [ ] S5-03: Supabase migrations 013–023 applied (blocked on B3: Austin)
- [ ] S5-04: TestFlight build submission
- [ ] S5-05: Google OAuth verification submitted (B4: 4–6 week lead time — start ASAP)

---

## P0 BLOCKERS
| ID | Blocker | Owner | Status |
|----|---------|-------|--------|
| B1 | RevenueCat commit (Step 10 commands) | Austin | Open |
| B2 | RC products not configured in RC dashboard | Austin | Open |
| B3 | Supabase migrations 013–023 not applied | Austin | Open |
| B4 | Google OAuth verification not submitted (4–6wk lead time) | Austin | Open |
