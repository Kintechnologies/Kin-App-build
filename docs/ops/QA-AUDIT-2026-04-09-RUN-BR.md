# QA & Standards Audit — 2026-04-09 (Run BR)

**Run:** BR (automated QA run)
**Date:** 2026-04-09
**Auditor:** QA & Standards Lead
**Prior QA run:** BN (2026-04-08) — No P0/P1; sole TestFlight gate Austin B2
**Intervening Lead Eng runs:** BO (fixes), BP (verification-only), BQ (verification-only, uncommitted to SPRINT.md)
**HEAD commit at time of audit:** `cdf819e` (feat(marketing): add Pricing component to homepage)
**Commits since BN:** 3 (`5b431e4`, `2c47c6b`, `cdf819e`)
**Working tree:** 2 files modified, uncommitted (`docs/ops/SPRINT.md`, `docs/prompts/trigger-test-log.md`)

---

## ⚠️ P2 FLAG FOR LEAD ENG

**P2-NEW-BR-1** — `PaywallModal.tsx` line 310 hardcodes `"Save $169 vs monthly"` which is arithmetically incorrect. P2-NEW-BN-2 was PARTIALLY fixed: `STATIC_PLANS[1].savings` was updated to `"Save $119 vs monthly"` but the JSX `planSavings` text element (line 310) is a separate hardcoded string that was NOT updated. Correct math: $39 × 12 − $349 = **$119**. This is user-facing and will appear in TestFlight.

---

## Step 1 — Orientation

**What shipped since BN:**

| Commit | Summary |
|--------|---------|
| `5b431e4` | Mobile: RC product IDs corrected (`kin_monthly_39` / `kin_annual_34900`), annual price $349; IE Session 15 prompts committed; Run BN audit committed |
| `2c47c6b` | Run BO fixes: P1-NEW-BN-1 RESOLVED (SPRINT.md B2 updated to new RC IDs); P2-NEW-BN-2 PARTIALLY resolved (PaywallModal $25→$29/mo label fixed — see P2-NEW-BR-1); P2-NEW-BN-1 RESOLVED (Sentry restored in marketing waitlist route); CMO-AGENT-PROMPT.md committed |
| `cdf819e` | Marketing: `apps/marketing/src/components/Pricing.tsx` + `apps/marketing/src/app/page.tsx` (import + placement) |

**Working tree (uncommitted):**
- `docs/ops/SPRINT.md` — Lead Eng BQ verification-only entry added
- `docs/prompts/trigger-test-log.md` — IE Session 16 added (shows IE workspace lacks monorepo access; 3 route wiring checks flagged UNVERIFIABLE)

---

## Step 2 — Architecture Audit

No architectural changes since BN. Carry-forward verifications confirmed.

| Check | Result |
|-------|--------|
| Exactly 3 tabs in `apps/mobile/app/(tabs)/`: `index.tsx`, `chat.tsx`, `settings.tsx` | ✅ PASS |
| No domain tabs (`meals.tsx`, `budget.tsx`, `fitness.tsx`, `family.tsx`) in `(tabs)/` | ✅ PASS |
| `InstrumentSerif-Italic` registered in `apps/mobile/app/_layout.tsx` (line 65) | ✅ PASS |
| `eas.json` present with development / preview / production iOS profiles | ✅ PASS |
| `024_coordination_issues.sql` migration present | ✅ PASS — carry-forward |
| `029_morning_briefing_log.sql` migration present | ✅ PASS — carry-forward |

---

## Step 3 — AI Output Rule Compliance (§5, §7, §8, §12, §16, §23)

No changes to `apps/mobile/app/(tabs)/index.tsx` or any prompt file affecting live output since BN. All carry-forward verifications confirmed clean.

| Check | Result |
|-------|--------|
| §5 — Morning briefing max 4 sentences (`parseBriefingBeats().slice(0,4)`) | ✅ PASS |
| §5 — 1 active OPEN alert at a time (`openIssues[0]`) | ✅ PASS |
| §5 — Check-ins max 2/day (`slice(0,2)` + `.limit(2)`) | ✅ PASS |
| §5 — Check-ins suppressed when High-priority alert OPEN | ✅ PASS |
| §7 — `CleanDayState` renders only when no content | ✅ PASS |
| §7 — No placeholder/spinner in empty state | ✅ PASS |
| §8 — No forbidden openers; all prompts §26-reviewed in Session 15 | ✅ PASS |
| §12 — OPEN: bold, action affordance | ✅ PASS |
| §12 — ACKNOWLEDGED: muted, no re-prompt | ✅ PASS |
| §12 — RESOLVED: closure line + 1400ms+600ms fade | ✅ PASS |
| §16 — Social tone: collaborative, neutral | ✅ PASS |
| §23 — Confidence signaling: LOW = no output, MEDIUM = fallback, HIGH = live | ✅ PASS |

---

## Step 4 — Code Quality Audit (New Commits)

### `apps/mobile/components/paywall/PaywallModal.tsx` (commit `5b431e4`, then `2c47c6b`)

| Check | Line | Finding |
|-------|------|---------|
| Product ID `kin_monthly_39` | 131 | ✅ PASS |
| Product ID `kin_annual_34900` | 132 | ✅ PASS |
| Annual static price label `$29/month` (was `$25`) | STATIC_PLANS[1].price = `"$29"` | ✅ PASS |
| CTA subtext `"Then $349/year"` | 355 | ✅ PASS |
| REVENUECAT_CONFIGURED gate on purchase + restore | 151, 184 | ✅ PASS |
| **Annual savings text** | **310** | ❌ **FAIL — hardcoded `"Save $169 vs monthly"`; should be `"Save $119 vs monthly"` (see P2-NEW-BR-1)** |
| No ungated console.error | — | ✅ PASS |
| No unused imports | — | ✅ PASS |

**Root cause of P2-NEW-BR-1:** `STATIC_PLANS[1].savings` was updated to `"Save $119 vs monthly"` (line 70) but the JSX `planSavings` text at line 310 hardcodes the string separately and was not updated. Fix: `line 310: "Save $119 vs monthly"`.

### `apps/mobile/lib/revenuecat.ts` (commit `5b431e4`)

| Check | Line | Finding |
|-------|------|---------|
| Entitlement ID = `"kin_premium"` | 31 | ✅ PASS |
| Product IDs in comments: `kin_monthly_39`, `kin_annual_34900` | 5–6 | ✅ PASS |
| `REVENUECAT_CONFIGURED` checks non-placeholder key | 23–25 | ✅ PASS |
| `Purchases.purchasePackage(pkg)` called | 89 | ✅ PASS |
| Post-purchase entitlement check on `kin_premium` | 91 | ✅ PASS |
| `userCancelled` handled (no crash, no error shown) | 95–101 | ✅ PASS |
| `restorePurchases()` checks `kin_premium` | 114–115 | ✅ PASS |
| Graceful when `REVENUECAT_CONFIGURED = false` | 66 (getOffering) | ✅ PASS |
| Dead empty if-block removed | — | ✅ PASS |
| Stale Austin TODO replaced with dev-fallback note | — | ✅ PASS |

### `apps/marketing/src/app/api/waitlist/route.ts` (commit `2c47c6b`)

| Check | Line | Finding |
|-------|------|---------|
| `import * as Sentry from "@sentry/nextjs"` restored | 1 | ✅ PASS |
| `Sentry.captureMessage()` for missing env vars (was bare `console.error`) | 58 | ✅ PASS |
| `Sentry.captureException(error)` for Supabase error (was bare `console.error`) | 75 | ✅ PASS |
| `Sentry.captureException(err)` for unhandled error (was bare `console.error`) | 81 | ✅ PASS |
| No ungated `console.error` | — | ✅ PASS |
| P2-NEW-BN-1 RESOLVED | — | ✅ |

### `apps/marketing/src/components/Pricing.tsx` (commit `cdf819e`)

| Check | Finding |
|-------|---------|
| Monthly price: `$39` | ✅ PASS |
| Annual price: `$349` | ✅ PASS |
| Annual savings computed dynamically: `(39 * 12) - 349 = 119` | ✅ PASS — no hardcoded savings value |
| Annual note: `$${(349 / 12).toFixed(0)}/mo` = `$29/mo` | ✅ PASS |
| 8 feature items listed | ✅ PASS |
| CTA links to `#waitlist` | ✅ PASS |
| No unused imports (`motion`, `useState`) | ✅ PASS |
| No TypeScript errors | ✅ PASS (tsc clean) |

Note: Marketing `Pricing.tsx` correctly computes savings dynamically, avoiding the hardcoded-string risk that affects `PaywallModal.tsx` line 310.

---

## Step 5 — RevenueCat / Paywall Checklist

| Check | Result |
|-------|--------|
| `PaywallModal.tsx` product IDs: `kin_monthly_39` + `kin_annual_34900` | ✅ PASS |
| `revenuecat.ts` entitlement: `kin_premium` | ✅ PASS |
| `EXPO_PUBLIC_REVENUECAT_API_KEY` in `apps/mobile/.env` | ✅ PASS — non-placeholder key present |
| `EXPO_PUBLIC_REVENUECAT_API_KEY` in `apps/mobile/.env.example` | ❌ FAIL — no `.env.example` file exists |
| `PaywallModal` shown to non-premium users at gate points | ✅ PASS — `REVENUECAT_CONFIGURED` guard renders correctly in both states |
| Annual plan pricing label shows `$29/month` (was `$25/month`) | ✅ PASS — STATIC_PLANS[1].price = `"$29"` |
| **Annual plan savings text shows `$119`** | ❌ **FAIL — JSX line 310 hardcodes `"Save $169 vs monthly"`** |
| Monthly plan shows `$39/month` | ✅ PASS |
| `Purchases.purchasePackage()` called with correct product object | ✅ PASS |
| On successful purchase, `kin_premium` entitlement checked + premium state updated | ✅ PASS |
| On failed/cancelled purchase, error handled gracefully | ✅ PASS |
| "Restore purchases" option present | ✅ PASS — in PaywallModal footer |
| `Purchases.restorePurchases()` called and entitlement refreshed | ✅ PASS |
| App handles `REVENUECAT_CONFIGURED = false` gracefully | ✅ PASS — static-price fallback; no crash |
| Subscription expiry: user reverts to non-premium state | ✅ PASS — entitlement checked live each time |

**RC checklist result: 2 failures (both P2; no purchase-flow blockers)**

---

## Step 6 — IE Session 16 Working Tree Audit

`docs/prompts/trigger-test-log.md` (uncommitted) adds Session 16 to the log. Key finding from IE:

> **IE workspace lacks monorepo access** — git and route files not mounted. Three route wiring items (checkin `last_surfaced_at`, alert `state = "OPEN"` gate, chat `state` in `open_coordination_issues`) were UNVERIFIABLE in the IE session.

**QA verification (performed this run from monorepo):**

| Item | Expected | Verified Status |
|------|----------|-----------------|
| Checkin route — passes `last_surfaced_at` + `checkins_generated_today` | Route reads + passes both fields | ⏳ NO ROUTE — `/api/checkin/` does not exist; carry-forward from BN |
| Alert route — gates on `state = "OPEN"` before AI call | AI only called during issue creation; deduplication prevents re-generation for OPEN/ACK | ✅ PASS (implicit — `late-schedule-change.ts:258`, `pickup-risk.ts:163`) |
| Chat route — passes `state` in `open_coordination_issues` | `.in("state", ["OPEN", "ACKNOWLEDGED"])` + `state: i.state` in payload | ✅ PASS (`apps/web/src/app/api/chat/route.ts` lines 450, 520) |

**IE ops issue:** IE workspace is not mounted to the monorepo root — it only sees `docs/prompts/`. CoS should address the mount configuration so IE can self-verify route wiring. Not a code bug; an infrastructure concern.

---

## Step 7 — Working Tree Disposition

| File | Contents | Action |
|------|----------|--------|
| `docs/ops/SPRINT.md` | Lead Eng BQ verification-only entry | Commit when Lead Eng next runs; no code risk |
| `docs/prompts/trigger-test-log.md` | IE Session 16 — route wiring verification attempt (BLOCKED) | Commit; informational only |

Neither file contains code changes. Neither blocks TestFlight.

---

## Step 8 — Scope Guard

| Check | Result |
|-------|--------|
| Domain tabs reintroduced | ✅ CLEAN |
| Android targets introduced | ✅ CLEAN |
| Layer 2/3 features in tab screens | ✅ CLEAN |
| Web app UI changes (non-marketing) | ✅ CLEAN — no changes this run |
| New feature screens in `(tabs)/` | ✅ CLEAN |

---

## Step 9 — TestFlight Readiness

| Gate | Status |
|------|--------|
| All P0 items resolved | ✅ CLEAN |
| All P1 items resolved | ✅ CLEAN |
| RC paywall checklist | ⚠️ 2 P2 items (P2-NEW-BR-1: savings text; P2-NEW-BR-2: .env.example) |
| 44/44 tests passing (vitest) | ✅ PASS |
| tsc web clean | ✅ PASS |
| `eas.json` production profile present | ✅ PASS |
| `.env` has all required keys | ✅ PASS |
| No ungated console.errors in mobile production paths | ✅ PASS |
| Offline banner present | ✅ PASS |
| Data deletion option in Settings | ✅ PASS |
| **Austin B2** — RevenueCat iOS app + products created in dashboard | 🔴 **OPEN — sole TestFlight gate** |
| **Austin B4** — Google OAuth verification submitted | 🟡 OPEN |

**TestFlight readiness: BLOCKED on Austin B2 only. All P0/P1 code items resolved. Two P2 polish items remain (savings text + .env.example).**

---

## New Findings

### P2-NEW-BR-1 — Incorrect Savings Text in PaywallModal Annual Plan

**Priority:** P2
**Owner:** Lead Eng
**File:** `apps/mobile/components/paywall/PaywallModal.tsx`, line 310

The annual plan card renders `"Save $169 vs monthly"` via a hardcoded `planSavings` JSX element. This value was not updated when the annual price changed to $349.

Correct math: $39/month × 12 = $468/year. $468 − $349 = **$119** saved.

P2-NEW-BN-2 was reported as RESOLVED in commit `2c47c6b` because `STATIC_PLANS[1].savings` was updated to `"Save $119 vs monthly"` (line 70). However, `STATIC_PLANS[1].savings` is never referenced in the JSX rendering. The `planSavings` text at line 310 is a separate hardcoded string:

```tsx
// line 310 — CURRENT (wrong):
<Text style={styles.planSavings}>Save $169 vs monthly</Text>

// Fix:
<Text style={styles.planSavings}>Save $119 vs monthly</Text>
```

Additionally, consider referencing `STATIC_PLANS[1].savings` to avoid future drift:
```tsx
<Text style={styles.planSavings}>{STATIC_PLANS[1].savings}</Text>
```

Not a purchase blocker. User-facing display error — visible on TestFlight.

---

### P2-NEW-BR-2 — Missing `apps/mobile/.env.example`

**Priority:** P2
**Owner:** Lead Eng
**File:** `apps/mobile/` (missing `.env.example`)

The RC paywall checklist requires `EXPO_PUBLIC_REVENUECAT_API_KEY` to be documented in `.env.example`. No `.env.example` exists in `apps/mobile/`. The key is present in `.env` (real key, not placeholder), so there is no runtime impact. This is a developer onboarding / documentation gap.

**Fix:** Create `apps/mobile/.env.example` with placeholder values for all required keys:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_API_URL=https://kinai.family
EXPO_PUBLIC_REVENUECAT_API_KEY=your_revenuecat_ios_key
```

---

## Carry-Forward Issues (Verified This Run)

| Issue | Check | Status |
|-------|-------|--------|
| B2: Austin — RevenueCat iOS app + products + entitlement | RC key in .env ✅; Austin must create `kin_monthly_39`, `kin_annual_34900`, `kin_premium` in dashboard | 🔴 OPEN (sole TestFlight gate) |
| B4: Austin — Google OAuth verification | No change | 🟡 OPEN (Austin; 4–6 week clock) |
| P2-NEW-BN-2 | **Partially resolved** — see P2-NEW-BR-1 for the remaining savings-text fix | ⚪ PARTIALLY RESOLVED |
| P2-NEW-BK-2: Auth/onboarding font swaps | No change | ⚪ OPEN — P&D verification pending |
| P2-7: `morning-briefing-prompt.md` INPUT FORMAT mismatch | No change | 🟡 OPEN — IE to fix |
| P2-NEW-7: conversation history not filtered by `thread_id` | No change | ⚪ OPEN (post-TF) |
| P2-NEW-BM-1: stale context keys in `household-chat-prompt.md` | No change | ⚪ OPEN — IE to fix |

---

## What Passed Clean

- ✅ Architecture: 3-tab shell, InstrumentSerif-Italic registered, no domain tabs, eas.json
- ✅ RC product IDs: `kin_monthly_39` / `kin_annual_34900` (P1-NEW-BN-1 fully resolved)
- ✅ RC entitlement: `kin_premium` throughout
- ✅ Purchase flow: `purchasePackage` → entitlement check → success / cancel / error all handled
- ✅ Restore purchases: wired and functional
- ✅ REVENUECAT_CONFIGURED fallback: static UI, no crash
- ✅ Marketing waitlist route: Sentry wired, no bare console.errors (P2-NEW-BN-1 resolved)
- ✅ Marketing Pricing.tsx: correct math ($39/$349), dynamic savings computation, 8 features, clean code
- ✅ Annual plan $29/month label (was $25) — P2-NEW-BN-2 partially resolved
- ✅ §5/§7/§8/§12/§16/§23 — all carry-forward from BM/BN
- ✅ chat.tsx: console.error guarded with `__DEV__`, no budget copy, no unused imports
- ✅ index.tsx: offline detection + banner (NetInfo + isOffline state)
- ✅ Settings: `handleDeleteAccount()` calls `api.deleteAccount()` + `Sentry.captureException`
- ✅ IE Session 15 prompt additions: spec-compliant (carry-forward BN)
- ✅ Chat route `open_coordination_issues`: passes `state` field (OPEN/ACKNOWLEDGED)
- ✅ Alert generation: OPEN-state gate implicit via deduplication logic
- ✅ 44/44 vitest tests pass; tsc clean

---

## Open Issues Table (post-Run BR)

| ID | Priority | Owner | Description | Status |
|----|----------|-------|-------------|--------|
| B2 | 🔴 P0 | **Austin** | RevenueCat iOS app + entitlement not configured — sole TestFlight gate. Create products `kin_monthly_39` ($39/mo) and `kin_annual_34900` ($349/yr) + entitlement `kin_premium` in RC dashboard. API key is in `.env`. | OPEN |
| B4 | 🟡 P1 | **Austin** | Google OAuth verification not submitted — 4–6 week review clock | OPEN |
| P2-NEW-BR-1 | ⚪ P2 | **Lead Eng** | `PaywallModal.tsx` line 310: hardcoded `"Save $169 vs monthly"` — should be `"Save $119 vs monthly"` ($39×12−$349=$119). P2-NEW-BN-2 PARTIALLY fixed; savings JSX not updated. | NEW |
| P2-NEW-BR-2 | ⚪ P2 | **Lead Eng** | No `apps/mobile/.env.example` file — RC checklist gap. | NEW |
| P2-NEW-BK-2 | ⚪ P2 | **P&D + Lead Eng** | Auth/onboarding font swaps (CalendarConnectModal/sign-in/sign-up). P&D to verify spec. | OPEN |
| P2-7 | ⚪ P2 | **IE** | `morning-briefing-prompt.md` INPUT FORMAT: `last_surfaced_insight` schema mismatch. | OPEN |
| P2-NEW-7 | ⚪ P2 | **Lead Eng** | Conversation history not filtered by `thread_id` — post-TestFlight. | OPEN (post-TF) |
| P2-NEW-BM-1 | ⚪ P2 | **IE** | Stale context keys in `household-chat-prompt.md` test scenarios. | OPEN |

---

## What Each Agent Does Next

| Agent | Next action |
|-------|-------------|
| **Lead Eng** | (1) Fix `PaywallModal.tsx` line 310: `"Save $169"` → `"Save $119"` (P2-NEW-BR-1). (2) Create `apps/mobile/.env.example` with key placeholders (P2-NEW-BR-2). (3) Commit working tree (`SPRINT.md` + `trigger-test-log.md`). |
| **Austin** | B2: Create RC products `kin_monthly_39` ($39/mo) and `kin_annual_34900` ($349/yr) + entitlement `kin_premium` in RC dashboard → S5.1/S5.2 TestFlight. B4: Submit Google OAuth verification. |
| **IE** | Fix `morning-briefing-prompt.md` INPUT FORMAT (P2-7) + `household-chat-prompt.md` stale context keys (P2-NEW-BM-1). Note: IE workspace must be mounted to monorepo root (`kin/`) to verify route wiring in future sessions. |
| **P&D** | Verify auth/onboarding screen typography (P2-NEW-BK-2). |
| **QA** | Standby for S5.3 TestFlight verification after Austin B2 + Lead Eng S5.2. |
| **CoS** | Update SPRINT.md; add P2-NEW-BR-1/2; note P2-NEW-BN-2 partially resolved → P2-NEW-BR-1 open. Address IE workspace mount issue. |

---

_— QA & Standards Lead, 2026-04-09 (automated run BR)_
