# Kin AI — Architectural Pivot Brief
**Date:** 2026-04-03
**Issued by:** CoS Coordinator
**Authority:** Austin Ford (confirmed April 3, 2026)
**Status:** 🔴 ACTIVE — all agents must read before next session

---

## The Decision

Austin has confirmed: **rebuild the mobile app to the 3-tab architecture defined in `kin-v0-product-spec.md` before TestFlight.**

The current 7-tab build (`home / chat / meals / budget / family / fitness / settings`) ships the wrong product. The v0 spec defines Kin as a **coordination intelligence engine** — not a feature-tab app. Domain data (meals, budget, fitness, family) is input to the engine. It is not the product surface.

This is not a polish gap. It is an architectural mismatch that would cause beta users to form expectations around a product that does not reflect Kin's core value proposition.

**Reference docs (read both before building):**
- `kin-v0-product-spec.md` — what users see
- `kin-v0-intelligence-engine.md` — how Kin decides what to say

---

## What Kin v0 Actually Is

Kin is the person in the household who is always paying attention. Its job is to detect when household coordination is required and surface the implication — before the user thinks about it.

**Every output must either change what the user does, or confirm they're on track. If it does neither, it does not surface.**

The product has three screens:

| Tab | What It Does |
|-----|-------------|
| **Today** | Morning briefing card. Alert cards (pickup risk, schedule changes). Check-in cards. Max 2 check-ins/day. Silence when nothing is worth saying. |
| **Conversations** | Thread list + detail. This is where users talk to Kin and where Kin proactively surfaces insights that need dialogue. |
| **Settings** | Account, partner link, notification preferences, calendar connections. |

That is the entire product surface for v0.

---

## What Changes, What Stays

### 🔴 RETIRE from navigation (do NOT delete files)
These files are no longer top-level tabs. Remove them from `apps/mobile/app/(tabs)/_layout.tsx`. Their code and Supabase queries remain — they become data sources for the intelligence layer.

| File | New role |
|------|----------|
| `meals.tsx` | Data source — `assembleFamilyContext()` uses meal plan data |
| `budget.tsx` | Data source — budget context feeds coordination insights |
| `fitness.tsx` | Data source — schedule context |
| `family.tsx` | Data source — children/pet data feeds pickup risk detection |

### ✅ KEEP as-is (backend is correct)
The entire data and intelligence layer stays. This work was not wasted — it is the engine.

| File/Area | Status |
|-----------|--------|
| `lib/kin-ai.ts` — `assembleFamilyContext()`, `kinChat()`, `generateMorningBriefing()` | ✅ Keep — core intelligence |
| `/api/morning-briefing` | ✅ Keep — feeds Today screen briefing card |
| `lib/push-notifications.ts` + `/api/push-tokens` | ✅ Keep — powers alert delivery |
| `/api/budget/check-overspend` | ✅ Keep — triggers budget alert |
| `lib/commute.ts`, `lib/date-night.ts` | ✅ Keep — coordination signal sources |
| All Supabase tables (migrations 001–022) | ✅ Keep — data layer is correct |
| `lib/revenuecat.ts` + `PaywallModal.tsx` | ✅ Keep — billing still needed |
| `components/paywall/` | ✅ Keep |
| All web app files | ✅ Keep — web app is separate track |

### 🏗️ BUILD (the pivot work)
| What | Spec reference |
|------|---------------|
| Today screen — briefing card component | §10 Morning Briefing Structure |
| Today screen — alert card component with OPEN/ACKNOWLEDGED/RESOLVED state | §12 State Management |
| Today screen — check-in card component (max 2/day) | §10 Check-in Card Structure |
| Conversations screen — thread list + Kin chat detail | existing `chat.tsx` logic, restructured |
| Updated `_layout.tsx` — 3 tabs only | — |
| Alert state persistence (issue state per user in Supabase) | §12 Issue States |
| Pickup Risk detection logic | §3A |
| Late Schedule Change detection + real-time alert | §3C |
| First-use emotional moment (day-one insight engineering) | §21 |

---

## Agent-by-Agent Directives

---

### Lead Engineer

**Stop immediately:** Task #11 (physical device test of 7-tab build) is on hold. Do not test the current architecture.

**Your next session, in order:**

**Step 1 — Restructure the tab shell**
- Remove `meals`, `budget`, `fitness`, `family` from `apps/mobile/app/(tabs)/_layout.tsx`
- The tab bar should have exactly 3 entries: Today, Conversations, Settings
- Rename/create the Today screen at `apps/mobile/app/(tabs)/index.tsx` (or `today.tsx`)
- Rename/rewire `chat.tsx` → Conversations screen

**Step 2 — Build the Today screen**

The Today screen has three component layers, rendered in order:

**Layer 1: Morning Briefing Card**
- Fetches from `/api/morning-briefing`
- Displays: time-aware opener + primary coordination insight + optional supporting detail
- Max 4 sentences total (spec §10)
- Loading state: skeleton card
- Empty/silent state: render nothing (do not show a placeholder)

**Layer 2: Alert Cards**
- Each active coordination issue renders as a card
- Three visual states:
  - `OPEN` — bold, prominent, with an action affordance (dismiss button or tap-to-chat)
  - `ACKNOWLEDGED` — muted/greyed, no repeated prompt
  - `RESOLVED` — show closure line (1 sentence, spec §24), then fade/remove after 1–2 seconds
- Max 1 active (non-acknowledged) alert visible at a time. Queue others.
- Alert card content follows §10 Alert Structure: `[What changed] — [Implication]`. One sentence.
- Issue state persists in Supabase (new table: `coordination_issues` — see schema note below)

**Layer 3: Check-in Cards**
- Max 2 per day
- Only render if no High-priority coordination insight is active
- Format: `[Observation] + [Optional prompt]` (spec §10)
- Dismissible

**Issue state schema (new Supabase table):**
```sql
coordination_issues (
  id uuid primary key,
  household_id uuid references households,
  trigger_type text, -- 'pickup_risk' | 'late_schedule_change' | 'schedule_compression' | etc.
  state text default 'OPEN', -- 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'
  content text, -- the surfaced output text
  event_window_start timestamptz,
  event_window_end timestamptz,
  surfaced_at timestamptz default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  last_escalation_tier text -- 'T6' | 'T2' | 'T45'
)
```

**Step 3 — Implement Pickup Risk detection (§3A)**
- Query: for each child with a known pickup window, check parent calendar coverage
- Red: both parents have events during window → create OPEN coordination issue
- Yellow: default handler unavailable, other parent free → create OPEN coordination issue
- Clear: coverage confirmed → no issue created
- Wire to morning briefing generation so pickup risk is the primary insight when detected

**Step 4 — Implement Late Schedule Change alerts (§3C)**
- Calendar webhook already exists — extend it
- On any calendar event created/modified: check if it creates a coordination dependency
- If yes: create OPEN issue → trigger push notification (real-time)
- Timing rules: before 10am → queue for briefing; 10am–6pm → push now; after 6pm for tomorrow → queue for morning

**Step 5 — First-use emotional moment (§21)**
- On first app open after onboarding: generate engineered first insight
- Structure: acknowledge orientation → insight → closing relief line ("I'll remind you when it's time to leave" / "I'll keep an eye on it" / "I'll flag it if anything changes")
- If coordination data is available: use it. If thin: use onboarding fallback sequence (spec §13)
- This fires once, on first Today screen render post-onboarding

**What NOT to build in this session:**
- Schedule Compression (§3B) — Layer 2
- Responsibility Shift (§3D) — Layer 2
- Escalation tiers T-6/T-2/T-45 (§15) — Layer 2
- Forced WOW fallback (§6) — Layer 2
- Dismissal suppression (§14) — Layer 3

Build Layer 1 only. Ship it working and spec-compliant. Layers 2–3 follow post-TestFlight.

---

### QA & Standards Lead

**Previous scope audit is superseded.** The P0 flags about `fitness.tsx` and `meals.tsx` being out-of-scope tabs are now confirmed as correctly identified — those tabs are being retired. Close P0-1 and P0-2 from QA-AUDIT-2026-04-03.md.

**P1 bugs (P1-1 through P1-4) are still valid** — Lead Eng should fix them even though those files are being retired from navigation. Clean code in data-layer files still matters.

**Your new audit charter for the pivot build:**

After Lead Eng delivers the 3-tab shell, audit against these criteria:

**Architecture audit:**
- [ ] Exactly 3 tabs in `_layout.tsx` (Today, Conversations, Settings)
- [ ] No domain tabs (meals, budget, fitness, family) reachable from tab bar
- [ ] Domain files still exist (not deleted) — they're data sources

**Today screen — output limits (spec §5):**
- [ ] Morning briefing: 1 primary insight + max 1 supporting detail. Never more than 4 sentences.
- [ ] Alert cards: 1 active alert visible at a time. Queue enforced.
- [ ] Check-in cards: max 2 per day. None rendered when High-priority alert is active.

**Today screen — tone audit (spec §8):**
- [ ] No output starts with "Based on your calendar…", "It looks like…", "You may want to consider…", "Just a heads up…", "I noticed that…"
- [ ] Lead with implication, not data
- [ ] Alert cards: exactly one sentence in `[What changed] — [Implication]` format
- [ ] No hedged output surfaced (medium/low confidence language used only when appropriate per §23)

**Alert state machine (spec §12):**
- [ ] OPEN state: bold, actionable
- [ ] ACKNOWLEDGED state: muted, no re-prompt
- [ ] RESOLVED state: closure line renders, then card removes
- [ ] State persists across app restarts (Supabase-backed)

**Silence rules (spec §7):**
- [ ] Today screen renders no content when no insight is worth surfacing (not even a placeholder)
- [ ] Option B clean-day confirmation is acceptable: "Clean day — nothing to stay ahead of."
- [ ] No filler observations surfaced to justify showing up

**Failure modes to watch (spec §11):**
- [ ] No vague outputs ("Looks like you have a busy evening")
- [ ] No repeated insight within 24 hours without a change
- [ ] No wrong parent assignment (verify routing logic in household awareness layer)

---

### Product & Design

**Your flag was correct.** The 3-tab rebuild is happening per your recommendation. Thank you for catching this before TestFlight.

**Your directives for this pivot:**

1. **Component spec for Today screen** — Define the visual treatment of the three layers:
   - Briefing card: layout, typography hierarchy, loading skeleton
   - Alert card: OPEN (bold, action affordance), ACKNOWLEDGED (muted), RESOLVED (closure + fade)
   - Check-in card: layout, dismiss interaction
   - Empty/silent state: what does Today look like when Kin has nothing to say? (Should feel intentional, not broken)

2. **Conversations screen** — Review the existing `chat.tsx` structure. Define whether the thread list is needed in v0 (only one thread: Kin) or if Conversations goes directly to the chat detail view.

3. **Settings screen** — Confirm which settings remain in v0. Remove any navigation items pointing to retired domain tabs.

4. **First-use emotional moment (§21)** — Review the engineered day-one insight spec and confirm the visual container for this. It likely renders on the Today screen on first open and deserves specific visual attention.

5. **Silence state design** — This is a distinctive product moment. When Kin has nothing to surface, the Today screen should feel calm and intentional — not empty or broken. Define this state explicitly so Lead Eng doesn't improvise it.

---

### Brand & Growth

**No change to brand direction.** The 3-tab architecture actually *strengthens* the product positioning — Kin as an intelligence engine, not a feature-tab app, is a more defensible and differentiated story.

**One action:**

Update any marketing copy, waitlist page messaging, or screenshot concepts that show or imply a multi-tab feature app. The product story is: "Kin pays attention so you don't have to." Features are not the headline. Coordination intelligence is.

---

### Business Ops

**TestFlight timeline:** Adjusting for the rebuild. With ~4 days of sprint buffer remaining (after accounting for the pivot work), TestFlight is now targeting **April 18–19** instead of April 16. This is a 2–3 day slip, not a week. Keep the App Store submission window intact.

**RevenueCat:** Austin's Step 10 commit actions (B1) still apply — the billing layer works with the new 3-tab shell without changes. Do not deprioritize.

**Supabase migrations:** B3 still applies — run `supabase db push` for migrations 013–023. A new migration for `coordination_issues` table will be added by Lead Eng this session. Include it.

---

## What This Is Not

- This is not a full rewrite. The backend is correct. Only the navigation shell and primary screen surfaces change.
- This is not a scope reduction. 11 domains still feed the engine. They just don't surface as tabs.
- This is not a delay. It is a correction that makes TestFlight users worth having.

---

## Conversations Screen — DECIDED ✅

**Decision (Austin, 2026-04-03):** Two threads per user — personal thread (individual, private) + household thread (shared, both parents visible).

**Lead Eng: build both.** The Conversations screen shows a thread list with two entries:
- **Kin** (personal) — individual insights, private nudges, personal memory-based outputs. Only the logged-in parent sees this.
- **Home** or **[Family name]** (household) — coordination conflicts involving both parents, ambiguous responsibility, resolution confirmations. Both parents see and can respond here.

This matches §18 routing logic exactly:
- Private insights → personal thread
- Unresolved coordination conflicts + ambiguity + resolution closures → household thread

The household thread requires the partner to be linked (post-invite). If partner hasn't linked yet, household thread shows an invitation prompt, not an empty state.

---

_— CoS Coordinator, 2026-04-03. Pivot brief issued on Austin's authority._
