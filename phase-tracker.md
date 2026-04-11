# Kin AI — Phase Tracker

**Last Updated:** 2026-04-02 (Chief of Staff — Vision v2 rewrite)

---

## Current Phase: 2-Week iOS Launch Sprint

### Phase Timeline

| Phase | Duration | Start | Target End | Status |
|-------|----------|-------|------------|--------|
| **Phase 0: Setup & Planning** | ~2 weeks | Mar 23 | Apr 2 | ✅ Complete |
| **Phase 1: 2-Week iOS Sprint** | 2 weeks | Apr 2 | Apr 16 | 🟡 In progress |
| **Phase 2: Post-Launch Iteration** | Ongoing | Apr 16 | — | ⬜ |

Phase 1 is compressed vs. the original 4-phase plan because:
1. The build is iOS-first with parallel AI agent tracks running around the clock
2. Vision v2 has been defined — scope is clear and requirements are actionable
3. The Supabase schema, Expo scaffold, and existing codebase provide significant head starts
4. Agents don't sleep

---

### Milestone Tracker

| Milestone | Target Date | Status | Notes |
|-----------|------------|--------|-------|
| Vision v2 finalized | Apr 2 | ✅ Done | `kin-product-vision-v2.md` |
| Agent context brief created | Apr 2 | ✅ Done | `agent-context-brief.md` |
| Sprint board updated (v2) | Apr 2 | ✅ Done | `sprint-board.md` |
| Pre-build prerequisites confirmed | Apr 3 | ⬜ | Austin confirms all P1–P8 |
| Track A complete (schema + auth + AI) | Apr 5 | ⬜ | **Critical path gate** |
| Track B complete (onboarding + FVM) | Apr 7 | ⬜ | |
| Calendar sync working (Google) | Apr 8 | ⬜ | |
| Meals + Budget + Kids/Pets complete | Apr 10 | ⬜ | |
| Morning briefing engine live | Apr 11 | ⬜ | **The product's core function** |
| Billing (RevenueCat) working | Apr 12 | ⬜ | |
| App Store submission | Apr 12 | ⬜ | |
| End-to-end QA + quality gates passed | Apr 13–14 | ⬜ | |
| TestFlight build to beta users | Apr 14 | ⬜ | |
| App Store approved | Apr 14–15 | ⬜ | 24–48 hr review |
| **🚀 PUBLIC LAUNCH** | **Apr 16** | ⬜ | Waitlist email + first content |
| 10 paying subscribers | Apr 23 | ⬜ | First week post-launch target |
| 25 paying subscribers | Apr 30 | ⬜ | |
| 50 paying subscribers | May 15 | ⬜ | |
| **79 paying subscribers — RENT COVERED** | **May 31** | ⬜ | **THE NUMBER** |
| 100 paying subscribers | Jun 15 | ⬜ | Growth milestone |
| $10k MRR (256 subscribers) | Aug 31 | ⬜ | Accelerator application threshold |
| $30k MRR (769 subscribers) | Dec 31 | ⬜ | Full-time threshold for Austin |

---

### Financial Targets (Updated for $39/month Single Tier)

| Subscribers | Gross Monthly | Net After Apple 15% | vs. $2,612 Rent |
|------------|--------------|---------------------|-----------------|
| 25 | $975 | $828 | -$1,784 |
| 50 | $1,950 | $1,658 | -$954 |
| **79** | **$3,081** | **$2,619** | **✅ COVERED** |
| 100 | $3,900 | $3,315 | +$703 buffer |
| 150 | $5,850 | $4,973 | +$2,361 buffer |
| 256 | $9,984 | $8,486 | ~$10k MRR |
| 769 | $29,991 | $25,493 | ~$30k MRR target |

*Net figures assume 100% App Store purchases at Apple 15% Small Business rate. Web purchases (Stripe ~3%) net $37.83/month — recommend acquiring users via kinai.family to improve unit economics.*

---

### Post-Launch Phase 2 Roadmap

Once the app is live and the first 79 subscribers are reached, the following become the next priorities:

| Feature | Category | When |
|---------|----------|------|
| Real-time commute (Google Routes API) | Domain upgrade | Week 3–4 post-launch |
| Apple Health integration | Domain upgrade | Week 3–4 post-launch |
| Pantry tracking | Domain upgrade | Week 3–4 post-launch |
| Home Management module | New domain | Week 3–4 post-launch |
| Structured workout plans | Domain upgrade | Week 4–5 post-launch |
| Plaid bank sync | Pending approval | ~4–6 weeks post-launch |
| Instacart grocery cart push | Pending approval | ~6–8 weeks post-launch |
| Apple Watch target | Native extension | Month 2–3 |
| Android support | Platform | Month 2–3 |
| Google for Startups application | Business | When: 25+ paying subscribers |
| Microsoft for Startups application | Business | When: 25+ paying subscribers |
| YC W27 application | Business | When: $10k+ MRR |

---

### Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Track A slips past Day 4 | Medium | Critical — blocks everything | Daily check-in. Escalate immediately if Day 3 EOD shows Track A incomplete. |
| App Store review rejection | Low-Medium | High — delays launch by 3–7 days | Follow Apple guidelines strictly. Submit on Day 12 to allow re-review buffer. |
| RevenueCat products misconfigured | Low | High — no revenue | Test purchase in sandbox on Day 9, not Day 13. |
| Allergy safety failure in QA | Low | Critical — health hazard | QA gate: 20 meal plans for allergic child. Zero tolerance. |
| Privacy wall breach in QA | Low | Critical — product trust destroyed | QA gate: full privacy test before any user gets access. |
| Anthropic API costs exceed projection | Low | Medium | Context compression enforced from Day 3. Monitor per-conversation cost from launch. |
| Mercury/Stripe still not connected | Medium | Medium | Web Stripe can launch without Mercury if needed — address before first real transaction. |
| Austin burnout (2.5 hrs/day cap) | Medium | High | Agents handle everything they can. Austin's time is protected for decisions, content, and approvals only. |

---

*kin · The Mental Load, Handled. · Kin Technologies LLC · Confidential*
