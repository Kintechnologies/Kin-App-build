# Kin AI — Daily Briefing
_Head of Ops — 2026-04-11 (Saturday, 7am)_

---

## 🔴 ONE NEW P0 — eas.json MISSING (Regression)

**P0-NEW-BU-1:** `eas.json` is gone. It was present in a prior sandbox session but was never committed to git and got wiped on reset. QA confirmed this morning. **TestFlight cannot build without it.**

**Who fixes it:** Lead Eng — recreate with iOS profiles (development, preview, production). Simple file, ~20 lines. Should be committed immediately.

---

## Austin's Actions Today

| # | Task | Time | Urgency |
|---|------|------|---------|
| **B2** | **RevenueCat** — Create iOS app + products + entitlement in RC dashboard | ~20 min | 🔴 TestFlight blocker |
| **B4** | **Google OAuth** — Submit verification (logo, homepage, privacy URL) | ~30 min | 🟡 Clock hasn't started |

Both of these are the same blockers from Apr 8. Nothing has unlocked B2 or B4. B4 is time-sensitive (4–6 week review) — every day unsubmitted is a day lost post-TestFlight.

---

## What Shipped Since Apr 8

| Commit | What |
|--------|------|
| `2c47c6b` | **P1 resolved** — RC product IDs corrected (`kin_monthly_39`, `kin_annual_34900`); console guards + pricing fixes |
| `5b431e4` | RevenueCat product IDs + pricing updated in mobile; IE session 15 prompts committed |
| `5d35704` | Marketing: removed bad Sentry import from waitlist route (hotfix) |
| `054cf93` | Marketing prototype updated to current design |
| `cdf819e` | Marketing: Pricing component added to homepage |

---

## Uncommitted Working Tree (Ready to Commit)

QA run BU verified these are clean and safe:
- `apps/mobile/app/(tabs)/index.tsx` — Sentry added to 4 catch blocks
- `apps/mobile/app/(tabs)/chat.tsx` — Sentry added to 2 catch blocks
- `apps/mobile/components/paywall/PaywallModal.tsx` — Savings label fixed ($119)
- `apps/mobile/.env.example` — new file, documents all EXPO_PUBLIC_ vars

**Suggested commit (Lead Eng or Austin):**
```bash
git add -A && git commit -m "feat(mobile): add Sentry integration to error handlers; fix paywall annual savings label" && git push
```

---

## CTO Flags

**None active.** All 6 historical flags resolved. No new flags from runs BT or BU.

---

## Launch Checklist — P0 (Before TestFlight)

| Item | Status |
|------|--------|
| eas.json with iOS build profiles | 🔴 **MISSING — Lead Eng must recreate** |
| Today screen shows calendar events | ✅ Done |
| 4 dead tabs deleted | ✅ Done |
| RevenueCat API key configured | 🔴 **Austin B2 — OPEN** |
| Google OAuth verification | 🟡 **Austin B4 — OPEN** |

---

## Launch Timeline

| Stage | Status |
|-------|--------|
| S1–S4 (all code) | ✅ Complete |
| S5.1 — RevenueCat integration | 🔴 Blocked on Austin B2 |
| S5.2 — EAS TestFlight build | 🔴 Also blocked on eas.json |
| S5.3 — TestFlight verification | ⬜ Queued |

**Previous target: TestFlight April 18–19.** Still achievable if eas.json is recreated today and Austin completes B2 this weekend. Two parallel blockers, both resolvable today.

---

## No P1 Backlog Items

All 15 backlog items resolved. P1 slate is clean.

---

_— Head of Ops, automated 7am run_
