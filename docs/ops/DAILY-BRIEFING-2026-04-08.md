# Kin AI — Daily Briefing
_CoS automated run — 2026-04-08 07:00_

---

📅 **Day 8 of 14 — April 8, 2026**

**SPRINT STATUS**
S1–S4 (all code stages) complete. S5 (RC + TestFlight) blocked on Austin B2 — RevenueCat iOS app and API key not configured. Lead Eng has an unresolved P0 font regression (P0-NEW-BH-1) to clear independently.

**TODAY'S PRIORITY**
Complete B2: configure RevenueCat — create `premium` entitlement, attach `kin_monthly_3999` + `kin_annual_29900`, add iOS app (bundle ID + App Store Connect), and add `EXPO_PUBLIC_REVENUECAT_API_KEY` to `.env`. This is the sole gate to TestFlight.

**BLOCKERS**
- 🔴 **B2 (Austin)** — `EXPO_PUBLIC_REVENUECAT_API_KEY` missing from `.env`; S5.1 commit and TestFlight build cannot proceed.
- 🔴 **P0-NEW-BH-1 (Lead Eng)** — `InstrumentSerif-Italic` not registered in `_layout.tsx`; 6 hero elements fall back to system font on device. Wrong-fix pattern detected in working tree (P2-NEW-BJ-1) — must be corrected before TestFlight.

**AUSTIN'S ACTIONS NEEDED**
1. **RevenueCat (B2, P0):** revenuecat.com → Project `kin-ai-492223` → create `premium` entitlement → attach both products → add iOS app → copy API key → add `EXPO_PUBLIC_REVENUECAT_API_KEY` to `.env` → `git push`
2. **Google OAuth (B4, time-sensitive):** marketing site is live — submit OAuth verification now (logo, homepage, privacy/ToS, `kinai.family` domain). 4–6 week clock; every day unsubmitted is a day lost post-TestFlight.
3. **eas.json (P2):** fill in `ascAppId` and `appleTeamId` in App Store Connect once app is created.
4. **Terminal cleanup (P2):** `rm -rf docs/prompts/docs`

**AGENTS WORKING ON**
- **Lead Eng:** Fix P0-NEW-BH-1 (restore 1-line font registration to `_layout.tsx`; revert wrong working-tree font swaps). Then wire `morning_briefing_log` in morning-briefing route (P1-CARRY-BF-1). Then commit `rate-limit.ts` + 3 routes atomically (P2-NEW-BH-1). Standby for Austin B2 → S5.1 uncommit RC integration → S5.2 TestFlight build.
- **QA:** Standby for Lead Eng P0 fix, then P1-CARRY-BF-1 wiring. S5.3 TestFlight verification queued after Austin B2 + S5.2.

---

_Target: TestFlight by April 18–19. Achievable — sole gate is Austin B2._
