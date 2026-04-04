# Kin v0 — Week 1 Sprint Review
2026-04-04 (Saturday) — Day 4 of 14

---

## Sprint Progress

| Layer | Status | Notes |
|-------|--------|-------|
| Layer 1: App shell | ✅ | 3-tab pivot complete (Today / Conversations / Settings). All migrations 013–027 created; 013–026 live in prod. Migration 027 (severity column) created but Austin must run `supabase db push`. |
| Layer 2: Today screen | 🔄 | Functionally complete: Morning Briefing card, Alert cards (OPEN/ACKNOWLEDGED/RESOLVED), Check-in cards, realtime subscription, silence rule, first-use moment — all built and QA-verified. Check-in AI wiring (S2.3) is paused pending Austin's architecture decision (cron vs inline). |
| Layer 3: Conversations | ✅ | Personal + Household pinned threads, general threads, partner invite prompt, alert tap prefill all shipped. QA-verified full personal thread e2e (run X). Household thread e2e gated on IE delivering `household-chat-prompt.md`. |
| Layer 4: Settings | ✅ | Settings screen shipped and cleaned up (S4.4). First-use spec, prompt, and API route complete (S4.1–S4.3). |
| Layer 5: Real-time + alerts | ✅ | Pickup Risk detection (S1.3) + Late Schedule Change detection (S2.5) both live in web calendar sync. Alert prompt wired via `generate-alert-content.ts`. Push notification routing active. One open edge case: after-6pm changes silently dropped (P2-2 — awaiting Austin decision). |
| RevenueCat integration | 🔄 | RC project `kin-ai-492223` created. `EXPO_PUBLIC_REVENUECAT_API_KEY` is present in `apps/mobile/.env` (key confirmed). **Blocked:** iOS app not yet added in RC dashboard, `kin_monthly_3999` and `kin_annual_29900` products not created, paywall not wired with real key. This is B2 — a P0 blocker for TestFlight (S5.2). |

---

## On Track for Launch?

**Yes — and significantly ahead of schedule.** The sprint is approximately 8 days ahead of the 14-day plan. Stages 1–4 (personal thread) are functionally complete after 4 days. The AI layer is guided, QA-verified, and scope-clean.

The risk is not the build — it's Austin's action queue. **B2 (RevenueCat iOS setup) is the only true P0 blocker for TestFlight.** Google OAuth verification (B4) has a 4–6 week external clock that started this week but Austin hasn't yet completed the branding submission, which means the clock hasn't formally started. These are both weekend tasks that cannot be delegated.

---

## Blockers

| # | Priority | Owner | Description | Resolution Path |
|---|----------|-------|-------------|-----------------|
| B2 | 🔴 P0 | **Austin** | RevenueCat iOS app + products not configured in RC dashboard. Blocks TestFlight S5.2. | In RC dashboard: add iOS app (bundle ID + App Store Connect link), create `kin_monthly_3999` ($39/mo) and `kin_annual_29900` ($299/yr), copy the resulting API key into `.env`. Lead Eng can wire paywall immediately after. |
| B4 | 🟡 P1 | **Austin** | Google OAuth branding incomplete — verification not formally submitted. | Upload 120×120px logo, add homepage/privacy/ToS URLs, add `kinai.family` as authorized domain in GCP, then submit in Verification Center. Clock doesn't start until submitted. 4–6 week wait begins from submission. |
| B21 | 🟡 P1 | **Austin** | Existing Supabase `profiles` row missing `first_name` — greeting shows "there" for Austin's account. | Patch row manually in Supabase dashboard. Onboarding flow now captures `first_name` for new users. |
| B29 | 🟡 P1 | **Austin** | Migration `027_coordination_issues_severity.sql` created but not applied in prod. Alert-prompt wiring is live and inserting `severity` — writes silently fail without this column. | Run `supabase db push` from terminal. |
| P2-7 | 🟡 P2 | **IE** | `morning-briefing-prompt.md` INPUT FORMAT describes structured JSON that `route.ts` never actually sends (sends plain text `briefingContext`). Spec and implementation diverge. | IE S1.8: update INPUT FORMAT section to reflect actual text input format. |
| B31 | 🟡 P2 | **Austin** | Stale `docs/prompts/docs/` directory exists with duplicate prompt files at wrong path. No functional impact, but creates risk of future IE edits going to wrong location. | Run `rm -rf docs/prompts/docs` from terminal. AI sandbox cannot delete (read-only mount). |

*No P1 blockers remain for Lead Engineer. All B32/P2-11/P2-12/P2-13/P2-14/P2-15 resolved in run AA (Friday evening).*

---

## Austin's Outstanding Actions

These are things only Austin can do — listed in priority order:

1. **B2 (this weekend, P0):** Open RevenueCat dashboard → add iOS app → create two products (`kin_monthly_3999` at $39/mo, `kin_annual_29900` at $299/yr) → drop the API key into `apps/mobile/.env`. This is the gate for the entire TestFlight submission.

2. **B29 (today, 2 minutes):** Run `supabase db push` from the `kin` directory. Migration 027 adds the `severity` column to `coordination_issues`. Alert wiring is writing severity values in production right now and they're silently failing without this column.

3. **B4 (this weekend, P1):** Finish the OAuth branding page in GCP. The verification clock hasn't meaningfully started — you've published to Production but the branding form isn't submitted. This is a 4–6 week external gate. Every day of delay is a day of TestFlight risk on the back end.

4. **B21 (2 minutes):** Patch `first_name` for your Supabase profiles row in the dashboard. The greeting will show "there" on your device until this is done.

5. **S2.3 decision (architectural):** Should check-in AI generation be (a) cron/event-triggered via `/api/generate-checkin`, or (b) inline at Today-screen load? Lead Eng cannot wire `checkin-prompt.md` without this call. Check-in cards are currently static.

6. **P2-2 decision:** After-6pm late schedule changes currently drop silently — no record created for next morning's briefing. Ship as-is for TestFlight, or queue for next morning?

7. **B31 (cleanup):** `rm -rf docs/prompts/docs` from terminal when you have a moment.

---

## Next Week's Priority

| Agent | Top Priority |
|-------|-------------|
| **Lead Engineer** | Wire RevenueCat paywall with real API key once Austin completes B2. Then: check-in wiring (S2.3) after Austin's architecture decision. TestFlight build prep (S5.3). |
| **Intelligence Engineer** | Deliver `household-chat-prompt.md` — balanced framing, both-parent visibility, §16 compliance. Unblocks household thread e2e (S4.6 full). Then: P2-7 INPUT FORMAT fix in `morning-briefing-prompt.md`. |
| **QA & Standards** | Household thread e2e audit once IE delivers `household-chat-prompt.md`. TestFlight pre-submission audit. Verify `supabase db push` resolved B29 if Austin runs it. |
| **Product & Design** | All 10 specs current — no new spec work required. Prepare App Store screenshots spec for TestFlight submission assets (`docs/specs/app-store-screenshots-spec.md` already exists — verify currency). |
| **CoS Coordinator** | Track Austin B2/B4 completion as critical path. Update SPRINT.md when B29 is applied. Stage 5 pipeline management (RC → TestFlight → App Store). |

---

## Kill List Check

**Clean.** No out-of-scope features were built this week.

- `meals.tsx` — confirmed data-layer stub only; not in navigation (B7/Austin decision April 3)
- `budget.tsx` — confirmed data-layer stub only; not in navigation (B14/Austin decision)
- `family.tsx` — confirmed data-layer stub only; not in navigation
- `fitness.tsx` — confirmed data-layer stub only; not in navigation
- Web UI — not being built; no web screens in scope
- Android — not referenced anywhere in codebase
- No budget UI, fitness UI, pet UI, or home UI built or wired

The 3-tab navigation (`_layout.tsx`) exposes exactly: Today, Conversations, Settings. No domain tabs visible to users.

Note: The kill list from April 1 (calendar sync, voice input, referral program, advanced budget analytics, cron cleanup) has **not yet been formally reviewed by Austin** (`Reviewed by Austin: ⬜ Pending`). Worth a 5-minute sign-off.

---

*Generated by CoS Coordinator — automated Saturday sprint review, 2026-04-04*
