# Kin v0 — Week 2 Sprint Review
2026-04-11 (Saturday) — Day 11 of 14

---

## Sprint Progress

| Layer | Status | Notes |
|-------|--------|-------|
| Layer 1: App shell | ✅ Complete | 3-tab architecture clean. EAS config present. `InstrumentSerif-Italic` registered. Light/dark theme tokens. `tsc` + ESLint clean. |
| Layer 2: Today screen | ✅ Complete | Morning briefing (4-sentence cap), alert cards (OPEN/ACKNOWLEDGED/RESOLVED + Realtime), check-ins, clean-day state, schedule section, offline banner, retry on error. All §5/§7/§12 rules enforced. |
| Layer 3: Conversations | ✅ Complete | Personal + household + general threads, thread_type routing, household context block (partner events + partner recent schedule changes), Plus button, spec-compliant typography, §16 compliance verified by QA. |
| Layer 4: Settings | ✅ Complete | Subscription card, paywall modal (Monthly $39/mo, Annual $349/yr, 7-day trial), account deletion with 2-step confirm, theme toggle, sign-out. RevenueCat code fully wired — gated on Austin B2. |
| Layer 5: Real-time + alerts | ✅ Complete | Supabase Realtime for alert state changes, first-use initialization, offline detection (`@react-native-community/netinfo`), coordination issues pipeline, morning briefing log (repeat suppression). |
| RevenueCat integration | 🔄 Code complete / Austin action required | `lib/revenuecat.ts` + `PaywallModal.tsx` QA-clean. Product IDs correct (`kin_monthly_39` / `kin_annual_34900`). Paywall savings label fixed ($119). `.env.example` created. **Gate: Austin must create RC products + iOS app + add API key to `.env`.** |

---

## On Track for Launch?

**⚠️ At Risk**

All code is done. The app is feature-complete, QA-clean, and 55/55 tests pass. The sole remaining gate between now and TestFlight submission is a human task that Austin hasn't completed yet: RevenueCat product configuration (B2). That task is estimated at 15–30 minutes, which means there's still enough runway to hit April 16 — but only if it happens this weekend. Every day B2 slips is a day lost from the TestFlight verification window. If Austin addresses B2 today or Sunday, the April 16 target is achievable. If it waits until mid-week, it becomes a real risk.

There is also one uncommitted patch from the last agent run (Lead Eng BS, April 9): the corrected PaywallModal savings label and `.env.example` file. Austin needs to push those changes from terminal before the EAS build is triggered.

---

## Blockers

| # | Blocker | Owner | Resolution Path |
|---|---------|-------|-----------------|
| B2 | RevenueCat iOS app + products not configured | **Austin** | In RC dashboard: (1) Add iOS app with bundle ID, (2) connect App Store Connect, (3) create `kin_monthly_39` ($39/mo) + `kin_annual_34900` ($349/yr), (4) add `EXPO_PUBLIC_REVENUECAT_API_KEY` to `apps/mobile/.env`. Est. 15–30 min. This is the **sole P0 TestFlight gate**. |
| B4 | Google OAuth verification not submitted | **Austin** | GCP project exists, OAuth consent configured, app published to Production — verification clock running. Still needed: upload 120×120px logo, add homepage/privacy/ToS URLs, add `kinai.family` as authorized domain, submit in Verification Center. Not blocking TestFlight, but calendar OAuth won't work in production until approved (Google SLA: days to weeks). |

---

## Austin's Outstanding Actions

1. **[TODAY — P0]** Complete RevenueCat setup (B2): create RC products, add iOS app, drop API key into `apps/mobile/.env`.
2. **[TODAY]** Commit and push the Run BS fix from terminal: `git add -A && git commit -m "fix(mobile): correct annual savings label + add .env.example" && git push`
3. **[This week]** Submit Google OAuth branding for verification (B4). The clock is already running — the earlier you submit, the less likely calendar features are blocked at launch.
4. **[Optional / cosmetic]** Patch your own Supabase profile row to add `first_name` — the greeting will show "there" until this is done on your personal account.
5. **[Cleanup]** Run `rm -rf docs/prompts/docs` from terminal — stale duplicate directory still present (P2-5).

---

## Next Week's Priority

The sprint ends Day 14 (April 14) and TestFlight targets April 16. With code complete, next week's sole focus is shipping:

- **Austin:** Complete B2 (RC config) → trigger EAS build (`eas build --platform ios --profile preview`) → submit to TestFlight → verify receipt on physical device.
- **Lead Engineer:** Standby for any EAS build errors or last-minute TestFlight fixes. No new feature work until TestFlight is live.
- **QA:** Final pre-submission audit once Austin completes B2 and RC products are live.
- **IE:** Close P2-7 (morning-briefing INPUT FORMAT mismatch) and P2-NEW-BM-1 (stale context keys in household-chat-prompt.md) — neither is blocking TestFlight, but both are pre-production cleanup.
- **CoS:** Update SPRINT.md with TestFlight submission confirmation once done.

---

## Kill List Check

✅ **Clean.** Architecture confirmed: exactly 3 tabs (`index`, `chat`, `settings`). Dead tab files (`meals.tsx`, `budget.tsx`, `fitness.tsx`, `family.tsx`) deleted in run BD (April 6). No meals UI, budget UI, fitness UI, pets, home dashboard, or web UI built into the mobile app. No Android target. Marketing site (`apps/marketing`) is in-scope only for waitlist + pricing — no product UI there either. The scope wall has held for all 14 days of the sprint.
