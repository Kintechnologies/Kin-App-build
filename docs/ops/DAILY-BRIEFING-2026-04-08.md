# Kin AI — Daily Briefing
_Head of Ops — 2026-04-08 (updated post-morning commits)_

---

## 🟢 Zero Active P0 Flags. Zero Active P1 Backlog Items.

Best shape the codebase has been in. Everything shipped this morning cleared the board.

---

## What Shipped Today

| Commit | What |
|--------|------|
| `a83a540` | **P0 RESOLVED** — InstrumentSerif-Italic re-registered in `_layout.tsx`; all 6 hero elements now rendering spec typography on device. `morning_briefing_log` reads/writes wired in morning-briefing route (repeat-suppression now live). |
| `1130ef8` | Geist-Light ref removed; microphone audio permission added; EAS config updated. |
| `6f7759f` | Marketing waitlist hardened — anon key → service-role key, Sentry added, Upstash rate limiting (3/hr/IP). |
| `accaffa` + `13ffbb5` | CTO flags + backlog updated to record all resolutions. |

---

## Blockers

🔴 **B2 — RevenueCat (AUSTIN)** — `EXPO_PUBLIC_REVENUECAT_API_KEY` missing from `.env`. This is the **sole gate** to TestFlight. Nothing else is blocking.

🔴 **B4 — Google OAuth Verification (AUSTIN, time-sensitive)** — marketing site is live. Submit verification now. 4–6 week review clock; every day unsubmitted is a day lost post-TestFlight.

---

## Austin's Actions Today

1. **RevenueCat (do this first, ~20 min):**
   - revenuecat.com → Project `kin-ai-492223`
   - Create `premium` entitlement
   - Attach `kin_monthly_3999` + `kin_annual_29900`
   - Add iOS app (bundle ID + App Store Connect)
   - Copy API key → add `EXPO_PUBLIC_REVENUECAT_API_KEY` to `.env` → `git push`
   - This unblocks Lead Eng for S5.1 and TestFlight build

2. **Google OAuth (~30 min):**
   - Submit OAuth verification: logo, homepage, privacy/ToS URLs, `kinai.family` domain
   - Clock starts on submission, not on TestFlight

3. **eas.json cleanup (2 min, can wait):**
   - Fill in `ascAppId` + `appleTeamId` in App Store Connect once iOS app is created

4. **Terminal cleanup (optional):** `rm -rf docs/prompts/docs`

---

## CTO Flags

**None active.** All 6 historical flags resolved (see `cto-flags.md` audit trail).

---

## Launch Timeline

| Stage | Status |
|-------|--------|
| S1–S4 (all code) | ✅ Complete |
| S5.1 — RevenueCat integration | 🔴 Blocked on Austin B2 |
| S5.2 — TestFlight build | ⬜ Queued after B2 |
| S5.3 — TestFlight verification | ⬜ Queued after S5.2 |

**Target: TestFlight by April 18–19.** Achievable — sole gate is Austin's RevenueCat action today.

---

## P0 Launch Checklist

| Item | Status |
|------|--------|
| eas.json with iOS build profiles | ✅ Done |
| Dead tabs deleted (budget/family/meals/fitness) | ✅ Done |
| Offline banner in chat | ✅ Done |
| Data deletion in Settings | ✅ Done |
| chat.tsx cleanup | ✅ Done |
| RevenueCat API key | 🔴 Austin blocker |
| Google OAuth verification | 🔴 Austin blocker |
| Production URLs in mobile build env | ⬜ |
| Today screen calendar events | ⬜ |
| App Store description/keywords/screenshots | ⬜ P1 |

---

_Marketing site: `apps/marketing/` live with homepage, privacy, ToS, waitlist (fully hardened)._
