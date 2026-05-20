# Kin message quality — state of the art

This is the canonical inventory of every message Kin sends, the prompt or
template that shapes it, and the bar we evaluate it against. The morning
briefing is the highest-volume LLM surface and where most of the prompt
calibration work has happened; intra-day SMS alerts are template-driven and
share the briefing's voice.

---

## 1. Message surfaces

| Surface | Trigger | Voice source | Live? |
| --- | --- | --- | --- |
| Morning briefing | Hourly cron, fans out at user's local 6am | LLM — `supabase/functions/_shared/briefing.ts` `SYSTEM_PROMPT` | Yes |
| Briefing audit backstop | Daily 14:00 UTC, force-sends any missed briefing | Same prompt as morning briefing | Yes |
| Pickup-risk alert | Every 30 min, fires ~30 min before a pickup with no coverage | Template — `apps/web/src/lib/pickup-risk.ts` | Yes |
| Late-schedule-change alert | Calendar webhook, only between 10am–6pm local | Template — `apps/web/src/lib/late-schedule-change.ts` | Yes |
| SMS inbound Q&A | User SMS reply | LLM — `apps/web/src/lib/sms-system-prompt.ts` `buildSmsSystemPrompt` | Yes |
| SMS onboarding off-script | User asks a question mid-onboarding | LLM — `apps/web/src/lib/sms-onboarding.ts` `ONBOARDING_QA_SYSTEM_PROMPT` | Yes |
| Sunday check-in | Sunday 2pm local | Hardcoded template | Yes |
| Engagement nudges | Various lifecycle moments | Hardcoded templates | Yes |
| In-app alert card | Coordination issue detected | LLM — `apps/web/src/lib/generate-alert-content.ts` (JSON response, distinct from the SMS body) | Yes |

---

## 2. Evaluation rubric (1–5 each)

Every LLM-generated message gets scored on:

1. **Accuracy** — every fact traces to context; no fabricated events, times,
   commitments, or capabilities. No invented event durations when only start
   times are present.
2. **Tone** — warm, direct, specific. Reads like a trusted coordinator who
   knows the family. Not corporate, not cheesy, not a parenting blog, not a
   greeting card.
3. **Structure** — leads with implication, not inventory. Scannable in under
   10 seconds. No narration of the calendar, no recap, no filler closings.
4. **Actionability** — surfaces what the parent needs to *do* or *be aware
   of*. If a fallback is needed, frames it as the parent's action
   (never Kin's — Kin doesn't message third parties).
5. **Edge handling** — graceful when data is thin, stale, empty, or
   ambiguous. Routines stay background; calendar staleness produces
   appropriate hedging, never invented schedule.

Bar: average ≥ 4.5/5 across a 9–12 scenario eval, with no scenario below 4.

---

## 3. Briefing prompt — what we learned

Five iterations against a 9-scenario eval (`scripts/briefing-eval/eval.mjs`)
took the average from ~3.4/5 to ~4.7/5. The failure modes worth knowing about:

- **Standalone weather lines** — the model wants to report weather even when
  mild and uneventful. The fix is explicit non-examples in the prompt plus a
  hard rule that a standalone weather line is always wrong.
- **Routines presented as today's plan** — when the calendar is empty or
  sparse, the model fills the gap with what it knows from onboarding
  ("usual Tuesday: drop, office, pickup, gym"). The fix is a dedicated
  `ROUTINES ARE BACKGROUND` rule and a concrete wrong-example.
- **Fabricated event end times** — the original briefing query only
  selected `start_time`, so the model would invent durations ("the 1:1
  wraps at 4:30"). The fix is to select `end_time` from `calendar_events`
  and render events as `8:00 AM–9:00 AM Title`.
- **Pickup event duration misread as a cutoff** — once end times are
  shown, the model sees a 15-min pickup event and concludes "the school
  closes at 5:45". The fix is to teach the prompt that an event's own end
  time is the parent's allocated time, not a third-party deadline.
- **False capabilities** — "Want me to flag Jontae?" implies Kin can
  message third parties. The fix is a `CAPABILITY HONESTY` rule: Kin only
  offers to text the primary parent themselves; fallbacks involving other
  people are framed as the parent's coordination work.
- **Newlines before follow-up questions** — the model kept putting the
  follow-up question on its own line even with the no-newlines rule. Fixed
  both in the prompt (explicit "single space, no line break ever") and as
  a code-side safety net (`text.replace(/\s+/g, " ").trim()` in
  `callAnthropicWithRetry`).
- **Manufactured urgency** — calling a 30-minute pickup buffer "tight" and
  offering a pre-emptive ping. Fix is `NO MANUFACTURED URGENCY` plus a
  concrete threshold (~10–15 min for a real tight handoff).
- **Filler closings** — "no surprises", "perfect for it all", "looks like
  a good day to enjoy". Fix is an explicit `NO FILLER` rule with examples.

---

## 4. Sample outputs at the v5 quality bar

These come from `scripts/briefing-eval/baseline-v5.md`. All are within the
480-char target unless the briefing earned a follow-up question (up to 600).

### Packed weekday — tight evening, rain coming
> Rain moves in around 5pm, right when your calendar shows Jaxon's pickup at Balanced Family Academy at 5:30 — worth grabbing his jacket and a spare for yourself before you head out. Your Eng 1:1 with Priya wraps at 4:00, so you have a solid window before the pickup, no timing pressure there.

### Saturday — nothing on the calendar
> Calendar looks clear for you, Jontae, and Jaxon today.

### Real conflict — investor call vs daycare pickup
> Your Sequoia call runs 5:00–6:00 PM and Jaxon's pickup at Balanced Family Academy looks like it's at 5:45 — those overlap, and your onboarding notes say pickup is by 6, so the margin is thin if the call runs long. Worth confirming now whether Jontae can cover the 5:45 pickup, or whether you need to step off the call early. Want me to ping you at 5:30 as a heads-up?

### Calendar clear but stale
> Calendar looks clear for today, though it last synced about 26 hours ago so it may not reflect what's actually on your plate — worth a quick check before you head out.

### Sunday-check-in note about Wednesday
> Your 5:30 pickup for Jaxon at Balanced Family Academy looks like it could be tight against a 9-to-5 at the office — with no buffer built in between end of work and pickup, it's worth making sure you're out the door by 5 to have any margin. Wednesday looks like a solo drop-off day for you with Jontae's doctor's appointment, so worth keeping that on your radar as the week builds.

### Two overlapping meetings
> Your 10am Lightspeed sync and the 10:30am pricing review overlap by 30 minutes — your calendar shows both running at the same time, so one of those likely needs to move or you'll need to decide which takes priority before you get to the office. Everything else today looks straightforward, with Jaxon's pickup on your calendar at 5:30pm well inside the 6pm window.

---

## 5. Intra-day alert SMS — tightened voice

Templates in `pickup-risk.ts` and `late-schedule-change.ts` were updated to
match the briefing voice: lead with the conflict, end with the implication,
no "Heads up." preamble, no corporate phrasing like "line up coverage."

Before:
> Your 5pm Sequoia call overlaps with Jaxon's 5:30pm pickup. Heads up — no backup on this one.

After:
> Your 5pm Sequoia call runs into Jaxon's 5:30pm pickup — there's no backup on this one.

Before (late-schedule-change):
> Your 3pm All-hands just hit the calendar — it overlaps with Leo's 3:15pm pickup. Heads up.

After:
> Your 3pm All-hands just landed on the calendar and runs into Leo's 3:15pm pickup — worth confirming coverage.

---

## 6. How to re-evaluate

Run the local harness from the repo root. It reads `SYSTEM_PROMPT` verbatim
from `supabase/functions/_shared/briefing.ts`, so the eval never drifts from
production.

```bash
# All scenarios, one rep each
node scripts/briefing-eval/eval.mjs > scripts/briefing-eval/run-$(date +%Y%m%d).md

# One scenario, three reps for stability
node scripts/briefing-eval/eval.mjs --reps 3 tight-pickup

# Available scenarios
#   packed, empty-weekend, stale-calendar, calendar-clear-but-stale,
#   tight-pickup, rain-on-pickup, no-surname, sunday-checkin-reply,
#   private-event, new-user-thin-context, back-to-back-conflict, early-start
```

Env: `ANTHROPIC_API_KEY` (auto-loaded from `apps/web/.env.local`).

---

## 7. Known limitations / TODO

- **Test-endpoint drift.** `apps/web/src/app/api/test/morning-briefing` and
  `apps/web/src/lib/sms-briefing.ts` use a DIFFERENT prompt
  (`SMS_BRIEFING_SYSTEM_PROMPT`) than the live edge function. The test
  endpoint is therefore not testing what production sends. Either fold
  `lib/sms-briefing.ts` into the production path or have the test endpoint
  hit the edge function with a dry-run flag. Tracked as a follow-up.
- **No travel-time grounding.** The briefing doesn't know how long Land-Grant
  → Harrison West actually takes. It will say "make sure you have a clear
  path" but can't quote a real ETA. Adding a Google Distance Matrix lookup
  for known recurring routes would tighten "tight handoff" detection.
- **Sunday-week-ahead notes.** Live notes from the Sunday check-in are
  surfaced, but the model sometimes prioritizes today's logistics over a
  bigger week-ahead item (e.g. Wednesday solo-duty). Acceptable today; could
  be tuned with a `LIVE NOTES PRIORITY` rule if it ever feels like a miss.
- **Thin-context new users.** With no household members and no onboarding
  notes, the briefing still occasionally references "the kids". Resolution
  is fine in practice because the morning-briefing cron only fans out to
  `onboarding_completed = true` profiles, who will always have household
  members loaded — but the prompt itself doesn't enforce it.
- **Engagement nudges and the Sunday check-in are hardcoded templates.**
  They're fine for their job (low frequency, single-purpose), but they
  don't share the briefing's tone calibration. If the brand voice ever
  drifts in a major way, revisit those strings.
