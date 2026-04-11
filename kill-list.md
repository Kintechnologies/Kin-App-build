# Kin AI — Kill List

**Week of:** April 1, 2026
**Reviewed by Austin:** ⬜ Pending

---

## Kill List Criteria

A feature or task goes on the Kill List if it:
1. Doesn't directly contribute to the current phase's goal
2. Adds complexity without proportional user value
3. Depends on a third-party approval not yet received
4. Is a "nice to have" consuming time that could go to a "must have"
5. Was planned before we learned something that changed the calculus
6. Would delay the First Value Moment (meal plan) for any user

---

## This Week's Recommendations

| # | Item | Why It's Here | Recommendation | Impact of Cutting |
|---|------|--------------|----------------|-------------------|
| 1 | Calendar sync (Google + Apple) | Depends on Google OAuth approval + Apple CalDAV testing. Complex integration. Not needed for FVM. | **Defer to Phase 2** | Saves 2+ weeks of build time. FVM (meal plan) ships faster. |
| 2 | Voice input (expo-speech) | Nice UX enhancement but not core. Chat works fine with text. | **Defer to Phase 2** | Removes a dependency and testing surface. |
| 3 | Referral program | Blueprint says "after 50 paying families." Zero paying families today. | **Defer to Phase 3** | Focus stays on getting TO 50 families, not growing FROM 50. |
| 4 | Advanced budget analytics | Current budget flow (income → 50/30/20) delivers value. Deeper analytics can wait. | **Defer to Phase 2** | Keeps budget scope tight for MVP. |
| 5 | Cron cleanup route (`/api/cron/cleanup`) | Premature optimization. No data to clean up yet. | **Defer until needed** | One less thing to configure and monitor. |

---

## Previously Killed

_No prior kills — this is the first Kill List._

---

## Austin's Decision

- [ ] Approved all recommendations
- [ ] Approved with changes: ___
- [ ] Rejected: ___
