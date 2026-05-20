# Briefing eval — 2026-05-20T16:37:31.113Z

SYSTEM_PROMPT length: 8645 chars

## packed — Packed weekday — work + Jax routine + tight evening

### Context
```
Primary parent (the person reading this briefing): Austin
Family surname: Ford
Date: Wednesday, May 20

Today's calendar:
  8:00 AM–8:30 AM Drop Jaxon at Balanced Family Academy @ Harrison West
  9:00 AM–9:30 AM All-hands standup @ 35 N 4th St
  11:00 AM–11:30 AM Investor call — pre-seed update
  1:30 PM–2:30 PM Lunch w/ Maya (designer candidate) @ Fox in the Snow
  3:30 PM–4:00 PM Eng 1:1 — Priya
  5:30 PM–5:45 PM Pickup Jaxon @ Balanced Family Academy @ Harrison West
  7:00 PM–8:00 PM Gym — Lifetime @ Easton

Household members:
  Jaxon (child, age 2)
  Jontae (partner)

What Kin learned about this family during onboarding (kids' schools, activities, weekly routines, wake time, special needs):
kids: Jaxon (2)
schools: Balanced family academy in harrison west
wake_time: Normally I try to wake up at 6 am on the weekdays
home_location: 43222
partner: none / solo
recurring_commitments: I have to be at the office by 9 am. 35 n. 4th st. Columbus oh. And I have to drop off jax before I get to work and I have to pick him up by 6. Also gym around 7 after dropping him off at home for dinner. Jontae works from home

Weather (43222): currently 64°F partly cloudy, high 76°F / low 58°F. Precipitation expected — rain 5pm–9pm.

```

### Output (rep 1, 291 chars, 4838ms)
```
Rain moves in around 5pm, right when your calendar shows Jaxon's pickup at Balanced Family Academy at 5:30 — worth grabbing his jacket and a spare for yourself before you head out. Your Eng 1:1 with Priya wraps at 4:00, so you have a solid window before the pickup, no timing pressure there.
```

### Output (rep 2, 269 chars, 3341ms)
```
Rain moves in around 5pm, right as your calendar shows Jaxon's pickup at 5:30 at Balanced Family Academy — worth grabbing an umbrella and a jacket for him before you head out. Your Eng 1:1 with Priya wraps at 4:00, so you've got a comfortable window before that pickup.
```

## empty-weekend — Saturday — no events, mild weather

### Context
```
Primary parent (the person reading this briefing): Austin
Family surname: Ford
Date: Saturday, May 23

Today's calendar: clear

Household members:
  Jaxon (child, age 2)
  Jontae (partner)

What Kin learned about this family during onboarding (kids' schools, activities, weekly routines, wake time, special needs):
kids: Jaxon (2)
schools: Balanced family academy in harrison west
wake_time: Normally I try to wake up at 6 am on the weekdays
home_location: 43222
partner: none / solo
recurring_commitments: I have to be at the office by 9 am. 35 n. 4th st. Columbus oh. And I have to drop off jax before I get to work and I have to pick him up by 6. Also gym around 7 after dropping him off at home for dinner. Jontae works from home

Weather (43222): currently 71°F clear skies, high 80°F / low 59°F.

```

### Output (rep 1, 54 chars, 2472ms)
```
Calendar looks clear for you, Jontae, and Jaxon today.
```

### Output (rep 2, 45 chars, 1741ms)
```
Calendar looks clear for you and Jaxon today.
```

## stale-calendar — Calendar last synced 18h ago

### Context
```
Primary parent (the person reading this briefing): Austin
Family surname: Ford
Date: Thursday, May 21

DATA FRESHNESS WARNING: A connected calendar last synced 18h ago — today's events may be out of date.

Today's calendar:
  8:00 AM–8:30 AM Drop Jaxon @ Balanced Family Academy
  9:30 AM–10:30 AM Team review
  5:30 PM–5:45 PM Pickup Jaxon @ Balanced Family Academy

Household members:
  Jaxon (child, age 2)
  Jontae (partner)

What Kin learned about this family during onboarding (kids' schools, activities, weekly routines, wake time, special needs):
kids: Jaxon (2)
schools: Balanced family academy in harrison west
wake_time: Normally I try to wake up at 6 am on the weekdays
home_location: 43222
partner: none / solo
recurring_commitments: I have to be at the office by 9 am. 35 n. 4th st. Columbus oh. And I have to drop off jax before I get to work and I have to pick him up by 6. Also gym around 7 after dropping him off at home for dinner. Jontae works from home

Weather (43222): currently 58°F overcast, high 67°F / low 52°F.

```

### Output (rep 1, 278 chars, 3684ms)
```
Calendar shows Jaxon's drop-off at 8 and your team review from 9:30 to 10:30 — that stretch looks fine. The one thing worth a check: pickup is showing as 5:30, and with the calendar last synced 18 hours ago, it's worth confirming nothing shifted today before you're mid-commute.
```

### Output (rep 2, 285 chars, 3176ms)
```
Calendar may be out of date since it last synced about 18 hours ago, so worth a quick check before you head out — but what's showing looks like a normal Thursday for the Fords, with Jaxon's drop-off at 8 and pickup around 5:30 at Balanced Family Academy, and a team review mid-morning.
```

## calendar-clear-but-stale — Looks clear but calendar may be stale

### Context
```
Primary parent (the person reading this briefing): Austin
Family surname: Ford
Date: Tuesday, May 19

DATA FRESHNESS WARNING: A connected calendar last synced 26h ago — today's events may be out of date.

Today's calendar: clear

Household members:
  Jaxon (child, age 2)
  Jontae (partner)

What Kin learned about this family during onboarding (kids' schools, activities, weekly routines, wake time, special needs):
kids: Jaxon (2)
schools: Balanced family academy in harrison west
wake_time: Normally I try to wake up at 6 am on the weekdays
home_location: 43222
partner: none / solo
recurring_commitments: I have to be at the office by 9 am. 35 n. 4th st. Columbus oh. And I have to drop off jax before I get to work and I have to pick him up by 6. Also gym around 7 after dropping him off at home for dinner. Jontae works from home

```

### Output (rep 1, 167 chars, 2460ms)
```
Calendar looks clear for today, though it last synced about 26 hours ago so it may not reflect what's actually on your plate — worth a quick check before you head out.
```

### Output (rep 2, 156 chars, 2761ms)
```
Calendar looks clear for today, but it last synced 26 hours ago so it may not have caught anything new — worth a quick check before you head out with Jaxon.
```

## tight-pickup — Late meeting threatens Jax 6pm pickup

### Context
```
Primary parent (the person reading this briefing): Austin
Family surname: Ford
Date: Monday, May 18

Today's calendar:
  8:00 AM–8:30 AM Drop Jaxon @ Balanced Family Academy
  9:00 AM–5:00 PM Office @ 35 N 4th St
  2:00 PM–3:00 PM Board prep
  5:00 PM–6:00 PM Investor call — Sequoia partner sync
  5:45 PM–6:00 PM Pickup Jaxon @ Balanced Family Academy

Household members:
  Jaxon (child, age 2)
  Jontae (partner)

What Kin learned about this family during onboarding (kids' schools, activities, weekly routines, wake time, special needs):
kids: Jaxon (2)
schools: Balanced family academy in harrison west
wake_time: Normally I try to wake up at 6 am on the weekdays
home_location: 43222
partner: none / solo
recurring_commitments: I have to be at the office by 9 am. 35 n. 4th st. Columbus oh. And I have to drop off jax before I get to work and I have to pick him up by 6. Also gym around 7 after dropping him off at home for dinner. Jontae works from home

Weather (43222): currently 72°F clear skies, high 78°F / low 60°F.

```

### Output (rep 1, 367 chars, 4629ms)
```
Your Sequoia call runs 5:00–6:00 PM and Jaxon's pickup at Balanced Family Academy looks like it's at 5:45 — those overlap, and your onboarding notes say pickup is by 6, so the margin is thin if the call runs long. Worth confirming now whether Jontae can cover the 5:45 pickup, or whether you need to step off the call early. Want me to ping you at 5:30 as a heads-up?
```

### Output (rep 2, 434 chars, 4386ms)
```
Your Sequoia call runs 5:00–6:00 PM and Jaxon's pickup is on the calendar at 5:45 — those overlap, and pickup by 6 is your hard cutoff. If the call runs even a few minutes long, you're cutting it very close. Worth figuring out before the day starts whether Jontae can do the 5:45 pickup, or whether you can push your leave time to step out of the call by 5:40. Want me to ping you at 5:30 as a reminder to wrap up or confirm coverage?
```

## rain-on-pickup — Outdoor pickup, rain incoming

### Context
```
Primary parent (the person reading this briefing): Austin
Family surname: Ford
Date: Friday, May 22

Today's calendar:
  8:00 AM–8:30 AM Drop Jaxon @ Balanced Family Academy
  9:00 AM–4:00 PM Quarterly planning offsite @ Land-Grant
  5:30 PM–5:45 PM Pickup Jaxon @ Balanced Family Academy

Household members:
  Jaxon (child, age 2)
  Jontae (partner)

What Kin learned about this family during onboarding (kids' schools, activities, weekly routines, wake time, special needs):
kids: Jaxon (2)
schools: Balanced family academy in harrison west
wake_time: Normally I try to wake up at 6 am on the weekdays
home_location: 43222
partner: none / solo
recurring_commitments: I have to be at the office by 9 am. 35 n. 4th st. Columbus oh. And I have to drop off jax before I get to work and I have to pick him up by 6. Also gym around 7 after dropping him off at home for dinner. Jontae works from home

Weather (43222): currently 66°F cloudy, high 70°F / low 58°F. Precipitation expected — rain 4pm–8pm.

```

### Output (rep 1, 360 chars, 3684ms)
```
Your offsite at Land-Grant runs until 4:00 PM, and rain moves in right at 4 — that overlap means you may be heading out into it just as the day wraps. More importantly, your calendar shows Jaxon's pickup at 5:30 PM, so make sure you have a clear path from Land-Grant back to Balanced Family Academy by then. Want me to ping you at 3:45 before the offsite ends?
```

### Output (rep 2, 367 chars, 4505ms)
```
Your offsite at Land-Grant runs until 4:00 PM, and rain is expected starting at 4 — that lines up right as you're wrapping up and heading to Balanced Family Academy for Jaxon's 5:30 pickup, so plan to leave with a jacket or umbrella. The timing between the offsite end and pickup looks comfortable, but it's worth confirming Jontae can cover if the offsite runs long.
```

## no-surname — Family with no surname on file

### Context
```
Primary parent (the person reading this briefing): Austin
Family surname: not on file — address the household by its members, not a made-up family name
Date: Wednesday, May 20

Today's calendar:
  8:00 AM–8:30 AM Drop Jaxon @ Balanced Family Academy
  5:30 PM–5:45 PM Pickup Jaxon @ Balanced Family Academy

Household members:
  Jaxon (child, age 2)
  Jontae (partner)

What Kin learned about this family during onboarding (kids' schools, activities, weekly routines, wake time, special needs):
kids: Jaxon (2)
schools: Balanced family academy in harrison west
wake_time: Normally I try to wake up at 6 am on the weekdays
home_location: 43222
partner: none / solo
recurring_commitments: I have to be at the office by 9 am. 35 n. 4th st. Columbus oh. And I have to drop off jax before I get to work and I have to pick him up by 6. Also gym around 7 after dropping him off at home for dinner. Jontae works from home

Weather (43222): 70°F clear, high 78°F / low 56°F.

```

### Output (rep 1, 165 chars, 2741ms)
```
Drop-off looks like yours at 8am at Balanced Family Academy, and pickup shows 5:30pm — well inside your 6pm window, so today looks straightforward for you and Jaxon.
```

### Output (rep 2, 136 chars, 2585ms)
```
Drop-off looks like yours at 8am and pickup at 5:30pm, both at Balanced Family Academy — a normal day with no conflicts on the calendar.
```

## sunday-checkin-reply — User has shared a Sunday check-in plan for the week

### Context
```
Primary parent (the person reading this briefing): Austin
Family surname: Ford
Date: Monday, May 18

Today's calendar:
  8:00 AM–8:30 AM Drop Jaxon @ Balanced Family Academy
  9:00 AM–5:00 PM Office @ 35 N 4th St
  5:30 PM–5:45 PM Pickup Jaxon @ Balanced Family Academy

Household members:
  Jaxon (child, age 2)
  Jontae (partner)

What Kin learned about this family during onboarding (kids' schools, activities, weekly routines, wake time, special needs):
kids: Jaxon (2)
schools: Balanced family academy in harrison west
wake_time: Normally I try to wake up at 6 am on the weekdays
home_location: 43222
partner: none / solo
recurring_commitments: I have to be at the office by 9 am. 35 n. 4th st. Columbus oh. And I have to drop off jax before I get to work and I have to pick him up by 6. Also gym around 7 after dropping him off at home for dinner. Jontae works from home

Recent notes this family shared directly with Kin (e.g. their reply to Kin's Sunday check-in about the week ahead):
  Jontae has a doctor's appointment Wednesday morning — I'll be on solo duty for the drop-off that day.
  Trying to hit the gym Tue/Thu this week.

Weather (43222): 72°F clear, high 80°F / low 58°F.

```

### Output (rep 1, 380 chars, 4094ms)
```
Your 5:30 pickup for Jaxon at Balanced Family Academy looks like it could be tight against a 9-to-5 at the office — with no buffer built in between end of work and pickup, it's worth making sure you're out the door by 5 to have any margin. Wednesday looks like a solo drop-off day for you with Jontae's doctor's appointment, so worth keeping that on your radar as the week builds.
```

### Output (rep 2, 375 chars, 4407ms)
```
Your calendar shows a 9-to-5 at the office today, with Jaxon's drop-off at 8 and pickup at 5:30 — that's a clean setup with no overlaps, and the weather is a non-factor. Worth keeping in mind that Wednesday is coming up fast: Jontae has a doctor's appointment that morning, so drop-off will be on you solo, and it's worth confirming now that your office start isn't affected.
```

## private-event — Calendar contains a private/confidential event

### Context
```
Primary parent (the person reading this briefing): Austin
Family surname: Ford
Date: Wednesday, May 20

Today's calendar:
  8:00 AM–8:30 AM Drop Jaxon @ Balanced Family Academy
  10:00 AM–11:30 AM Private event
  5:30 PM–5:45 PM Pickup Jaxon @ Balanced Family Academy

Household members:
  Jaxon (child, age 2)
  Jontae (partner)

What Kin learned about this family during onboarding (kids' schools, activities, weekly routines, wake time, special needs):
kids: Jaxon (2)
schools: Balanced family academy in harrison west
wake_time: Normally I try to wake up at 6 am on the weekdays
home_location: 43222
partner: none / solo
recurring_commitments: I have to be at the office by 9 am. 35 n. 4th st. Columbus oh. And I have to drop off jax before I get to work and I have to pick him up by 6. Also gym around 7 after dropping him off at home for dinner. Jontae works from home

Weather (43222): 68°F clear, high 74°F / low 56°F.

```

### Output (rep 1, 294 chars, 3685ms)
```
Your calendar shows a private event from 10–11:30 AM, so the middle of your morning is blocked — just worth keeping in mind if anything runs long before your afternoon opens up. Drop for Jaxon looks like 8 AM at Balanced Family Academy, and pickup shows as 5:30 PM, well inside the 6 PM window.
```

### Output (rep 2, 281 chars, 3378ms)
```
Your calendar shows a private event from 10 to 11:30 this morning, so the bulk of your day looks open outside of that and Jaxon's pickups. Drop-off at Balanced Family Academy is on the calendar for 8 and pickup shows at 5:30, well within the 6 o'clock window — nothing tight there.
```

## new-user-thin-context — Brand new user — minimal onboarding context

### Context
```
Primary parent (the person reading this briefing): Sam
Family surname: not on file — address the household by its members, not a made-up family name
Date: Tuesday, May 19

Today's calendar:
  9:00 AM–10:00 AM Team standup
  3:00 PM–3:30 PM 1:1 with Jordan

```

### Output (rep 1, 189 chars, 2456ms)
```
Your day looks lighter than usual — the calendar just shows a team standup this morning and a 1:1 with Jordan at 3:00. Nothing flagged for the kids, no pickups, no handoffs on the schedule.
```

### Output (rep 2, 157 chars, 2768ms)
```
Your day looks light — just the standup this morning and a 1:1 with Jordan at 3:00 on the calendar. Nothing flagged that needs a decision or a handoff today.
```

## back-to-back-conflict — Two overlapping meetings on the calendar

### Context
```
Primary parent (the person reading this briefing): Austin
Family surname: Ford
Date: Thursday, May 21

Today's calendar:
  8:00 AM–8:30 AM Drop Jaxon @ Balanced Family Academy
  10:00 AM–11:00 AM Investor sync — Lightspeed
  10:30 AM–11:30 AM Pricing review
  5:30 PM–5:45 PM Pickup Jaxon @ Balanced Family Academy

Household members:
  Jaxon (child, age 2)
  Jontae (partner)

What Kin learned about this family during onboarding (kids' schools, activities, weekly routines, wake time, special needs):
kids: Jaxon (2)
schools: Balanced family academy in harrison west
wake_time: Normally I try to wake up at 6 am on the weekdays
home_location: 43222
partner: none / solo
recurring_commitments: I have to be at the office by 9 am. 35 n. 4th st. Columbus oh. And I have to drop off jax before I get to work and I have to pick him up by 6. Also gym around 7 after dropping him off at home for dinner. Jontae works from home

```

### Output (rep 1, 364 chars, 3889ms)
```
Your 10am Lightspeed sync and the 10:30am pricing review overlap by 30 minutes — your calendar shows both running at the same time, so one of those likely needs to move or you'll need to decide which takes priority before you get to the office. Everything else today looks straightforward, with Jaxon's pickup on your calendar at 5:30pm well inside the 6pm window.
```

### Output (rep 2, 461 chars, 4928ms)
```
Your 10am Investor sync with Lightspeed and your 10:30am Pricing review overlap by 30 minutes — your calendar shows both running at the same time, so one of those likely needs to move or you'll need to step out of one mid-meeting. Worth sorting that before you head into the office. Pickup looks like yours at 5:30 at Balanced Family Academy, and your onboarding notes say Jaxon needs to be out by 6, so that window is fine as long as the afternoon stays clear.
```

## early-start — Unusually early 6:30am meeting

### Context
```
Primary parent (the person reading this briefing): Austin
Family surname: Ford
Date: Wednesday, May 20

Today's calendar:
  6:30 AM–7:30 AM Call with London team
  8:00 AM–8:30 AM Drop Jaxon @ Balanced Family Academy
  9:00 AM–5:00 PM Office @ 35 N 4th St
  5:30 PM–5:45 PM Pickup Jaxon @ Balanced Family Academy

Household members:
  Jaxon (child, age 2)
  Jontae (partner)

What Kin learned about this family during onboarding (kids' schools, activities, weekly routines, wake time, special needs):
kids: Jaxon (2)
schools: Balanced family academy in harrison west
wake_time: Normally I try to wake up at 6 am on the weekdays
home_location: 43222
partner: none / solo
recurring_commitments: I have to be at the office by 9 am. 35 n. 4th st. Columbus oh. And I have to drop off jax before I get to work and I have to pick him up by 6. Also gym around 7 after dropping him off at home for dinner. Jontae works from home

```

### Output (rep 1, 398 chars, 4290ms)
```
Your London call runs 6:30–7:30, which lands right in the window you'd normally be getting Jaxon ready for his 8:00 drop-off at Balanced Family Academy — so the handoff from that call to out-the-door with a 2-year-old is going to be quick. On the back end, your calendar shows pickup at 5:30, and the office block runs to 5:00, so you've got solid margin there as long as the workday wraps on time.
```

### Output (rep 2, 332 chars, 4403ms)
```
Your London call runs 6:30–7:30, which should still leave enough time to get Jaxon to Balanced Family Academy for the 8:00 drop-off — but that's a tight turnaround if the call runs long, so worth keeping an eye on the clock around 7:25. The pickup at 5:30 looks fine against your 9–5 office day with a 6pm hard cutoff at the school.
```
