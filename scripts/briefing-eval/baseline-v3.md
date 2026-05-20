# Briefing eval — 2026-05-20T16:30:19.081Z

SYSTEM_PROMPT length: 7147 chars

## packed — Packed weekday — work + Jax routine + tight evening

### Context
```
Primary parent (the person reading this briefing): Austin
Family surname: Ford
Date: Wednesday, May 20

Today's calendar:
  8:00 AM Drop Jaxon at Balanced Family Academy @ Harrison West
  9:00 AM All-hands standup @ 35 N 4th St
  11:00 AM Investor call — pre-seed update
  1:30 PM Lunch w/ Maya (designer candidate) @ Fox in the Snow
  3:30 PM Eng 1:1 — Priya
  5:30 PM Pickup Jaxon @ Balanced Family Academy @ Harrison West
  7:00 PM Gym — Lifetime @ Easton

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

### Output (rep 1, 296 chars, 3414ms)
```
Rain moves in around 5pm, right as Jaxon's pickup is scheduled at 5:30 — worth grabbing his jacket and yours before you leave for Balanced Family Academy. The Eng 1:1 with Priya wraps at 4:30 on your calendar, so you'd have about an hour before pickup, which is a comfortable window to get there.
```

### Output (rep 2, 404 chars, 7155ms)
```
Rain moves in around 5pm, which lands right on Jaxon's 5:30 pickup at Balanced Family Academy — worth grabbing a jacket or extra layer for him before you head out. Your Eng 1:1 with Priya wraps at 4:30, so you've got a reasonable window to get to Harrison West, but the weather will be rolling in by then. Want me to ping you at 4:15 when Priya's call is wrapping up so you have time to get out the door?
```

### Output (rep 3, 440 chars, 4711ms)
```
Rain moves in around 5pm, which lands right on Jaxon's 5:30 pickup at Balanced Family Academy — worth grabbing a jacket or spare clothes for him before you head out. Your Eng 1:1 with Priya shows ending at 4:30, so you'd have about an hour to get to Harrison West, which is plenty of runway, but the weather will be active by then. Want me to ping you at 4:15 as the Priya call wraps so you have time to get out the door before it gets wet?
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

### Output (rep 1, 58 chars, 2661ms)
```
The calendar looks clear for you, Jontae, and Jaxon today.
```

### Output (rep 2, 58 chars, 1742ms)
```
The calendar looks clear for you, Jontae, and Jaxon today.
```

### Output (rep 3, 58 chars, 1740ms)
```
The calendar looks clear for you, Jontae, and Jaxon today.
```

## stale-calendar — Calendar last synced 18h ago

### Context
```
Primary parent (the person reading this briefing): Austin
Family surname: Ford
Date: Thursday, May 21

DATA FRESHNESS WARNING: A connected calendar last synced 18h ago — today's events may be out of date.

Today's calendar:
  8:00 AM Drop Jaxon @ Balanced Family Academy
  9:30 AM Team review
  5:30 PM Pickup Jaxon @ Balanced Family Academy

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

### Output (rep 1, 316 chars, 3481ms)
```
The calendar may be a day behind since it last synced 18 hours ago, so worth a quick check before you head out. What I have shows Jaxon's drop-off at Balanced Family Academy at 8 and pickup at 5:30 — that 5:30 pickup gives you a comfortable window before the 6pm cutoff, so no squeeze there as long as the day holds.
```

### Output (rep 2, 311 chars, 3585ms)
```
The calendar may be a day behind, so worth a quick check, but what's on it shows Jaxon's pickup at 5:30 PM at Balanced Family Academy — that's within your 6 PM window and should be comfortable. The 9:30 AM team review is what I've got for the workday, which puts the morning mostly in your hands after drop-off.
```

### Output (rep 3, 435 chars, 4404ms)
```
The calendar may be a day behind, so treat this as a heads-up rather than confirmed: what I have shows Jaxon's pickup at Balanced Family Academy at 5:30 PM, which keeps you well inside your 6 PM window. The main thing to watch is whether anything shifted on your end since the last sync — Jontae is listed as a household member but your onboarding noted you're solo on school logistics, so that 5:30 pickup looks like yours to confirm.
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

### Output (rep 1, 175 chars, 2350ms)
```
Calendar looks clear for today, though it last synced about 26 hours ago so something may have slipped through since then — worth a quick check before you head out with Jaxon.
```

### Output (rep 2, 164 chars, 2359ms)
```
Calendar looks clear today, Austin, though it last synced about 26 hours ago so something may have come in since — worth a quick check before you head out with Jax.
```

### Output (rep 3, 278 chars, 3172ms)
```
Calendar shows clear for today, though it last synced 26 hours ago so something may have come in since. If the usual Tuesday routine is running — drop Jax at Balanced Family Academy, office by 9, pickup by 6 — that's what I'd plan around until you can confirm nothing's changed.
```

## tight-pickup — Late meeting threatens Jax 6pm pickup

### Context
```
Primary parent (the person reading this briefing): Austin
Family surname: Ford
Date: Monday, May 18

Today's calendar:
  8:00 AM Drop Jaxon @ Balanced Family Academy
  9:00 AM Office @ 35 N 4th St
  2:00 PM Board prep
  5:00 PM Investor call — Sequoia partner sync
  5:45 PM Pickup Jaxon @ Balanced Family Academy

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

### Output (rep 1, 363 chars, 4285ms)
```
Your Sequoia call at 5:00 PM runs right into Jaxon's pickup at 5:45 PM at Balanced Family Academy — that's only 45 minutes, so if the call runs long at all you'll be cutting it close on getting to Harrison West by 6:00. Worth having a plan now for whether Jontae can cover pickup if that call stretches. Want me to flag you at 5:30 so you can wrap and get moving?
```

### Output (rep 2, 366 chars, 4333ms)
```
Your Sequoia call runs 5–6pm on the calendar, but Jaxon's pickup at Balanced Family Academy shows as 5:45pm — those overlap by at least 15 minutes, and if the call runs long you're past the 6pm cutoff. Worth confirming now whether Jontae can handle the 5:45 pickup so you're not in a bind mid-call. Want me to flag you at 5:30 as a hard reminder to wrap or hand off?
```

### Output (rep 3, 335 chars, 4287ms)
```
Your Sequoia call runs 5–6pm on the calendar, but Jaxon's pickup at Balanced Family Academy shows at 5:45 — that's a real overlap. You'll want to confirm Jontae can cover the pickup, or plan to step off the call by 5:40 to make it there in time. Want me to set a reminder at 5:35 to give you a heads-up before the pickup window closes?
```

## rain-on-pickup — Outdoor pickup, rain incoming

### Context
```
Primary parent (the person reading this briefing): Austin
Family surname: Ford
Date: Friday, May 22

Today's calendar:
  8:00 AM Drop Jaxon @ Balanced Family Academy
  9:00 AM Quarterly planning offsite @ Land-Grant
  5:30 PM Pickup Jaxon @ Balanced Family Academy

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

### Output (rep 1, 268 chars, 3168ms)
```
Rain moves in around 4pm, so Jaxon's 5:30 pickup at Balanced Family Academy will be wet — worth grabbing a jacket or umbrella before you head out. The offsite at Land-Grant runs all day, so just keep an eye on when you're wrapping up to make sure you're clear by 5:30.
```

### Output (rep 2, 337 chars, 4082ms)
```
Rain moves in around 4pm, so Jaxon's 5:30 pickup at Balanced Family Academy will be wet — worth having his rain gear ready and grabbing an umbrella before you head out. The offsite at Land-Grant runs most of the day, so just keep an eye on the clock as 5:30 approaches. Want me to send you a reminder before you need to leave for pickup?
```

### Output (rep 3, 382 chars, 4426ms)
```
Rain moves in around 4pm and Jaxon's pickup is at 5:30, so you'll want a jacket or change of clothes for him when you head to Balanced Family Academy. The offsite at Land-Grant looks like your main anchor today — just make sure you're clear by 5 to get to Harrison West with a little buffer before the rain picks up. Want me to ping you at 4:45 so you can wrap and head out in time?
```

## no-surname — Family with no surname on file

### Context
```
Primary parent (the person reading this briefing): Austin
Family surname: not on file — address the household by its members, not a made-up family name
Date: Wednesday, May 20

Today's calendar:
  8:00 AM Drop Jaxon @ Balanced Family Academy
  5:30 PM Pickup Jaxon @ Balanced Family Academy

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

### Output (rep 1, 152 chars, 2457ms)
```
Drop-off at 8 and pickup at 5:30 are both on your calendar today for Jaxon at Balanced Family Academy, which lines you up well ahead of your 6pm cutoff.
```

### Output (rep 2, 190 chars, 2763ms)
```
Drop-off looks straightforward this morning with Jaxon at Balanced Family Academy before your 9am office start. Your calendar shows 5:30pm pickup, which keeps you well within the 6pm window.
```

### Output (rep 3, 218 chars, 2868ms)
```
Drop-off at 8 and pickup at 5:30 are both on the calendar for Jaxon at Balanced Family Academy today, which gives you a clean window to get to the office by 9 and keeps you well ahead of the 6pm cutoff on the back end.
```

## sunday-checkin-reply — User has shared a Sunday check-in plan for the week

### Context
```
Primary parent (the person reading this briefing): Austin
Family surname: Ford
Date: Monday, May 18

Today's calendar:
  8:00 AM Drop Jaxon @ Balanced Family Academy
  9:00 AM Office @ 35 N 4th St
  5:30 PM Pickup Jaxon @ Balanced Family Academy

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

### Output (rep 1, 375 chars, 3902ms)
```
Drop-off and pickup both look like yours today, Austin — your calendar shows Jaxon at Balanced Family Academy at 8am and pickup at 5:30pm, well within the 6pm cutoff. The office start at 9am lines up cleanly after drop-off. Heads up for later in the week: Wednesday morning is solo drop-off since Jontae has that doctor's appointment, so worth keeping that on your radar now.
```

### Output (rep 2, 367 chars, 3591ms)
```
Today looks straightforward — your calendar shows the standard drop-off at Balanced Family Academy at 8, office by 9, and Jaxon's pickup at 5:30, well before the 6pm cutoff. One heads-up for later in the week: with Jontae's doctor appointment Wednesday morning, drop-off looks like it'll fall on you solo that day, so worth keeping the Wednesday morning window clear.
```

### Output (rep 3, 365 chars, 3670ms)
```
Your calendar shows the regular Jaxon drop-off at 8am and pickup at Balanced Family Academy at 5:30pm, with your office day in between — nothing unusual today. Worth keeping in mind for the week: Wednesday drop-off is all yours since Jontae has a morning doctor's appointment, and you mentioned aiming for the gym Tuesday and Thursday rather than your usual rhythm.
```

## private-event — Calendar contains a private/confidential event

### Context
```
Primary parent (the person reading this briefing): Austin
Family surname: Ford
Date: Wednesday, May 20

Today's calendar:
  8:00 AM Drop Jaxon @ Balanced Family Academy
  10:00 AM Private event
  5:30 PM Pickup Jaxon @ Balanced Family Academy

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

### Output (rep 1, 181 chars, 2560ms)
```
Your calendar shows Jaxon's drop-off at 8am at Balanced Family Academy and pickup at 5:30pm — both look straightforward today with no apparent conflicts against what I have on file.
```

### Output (rep 2, 233 chars, 2763ms)
```
Your calendar shows Jaxon's pickup at 5:30 PM at Balanced Family Academy — that's a half hour ahead of your usual 6 PM cutoff, so worth keeping front of mind if the 10 AM private event runs or anything else pushes into the afternoon.
```

### Output (rep 3, 226 chars, 2459ms)
```
Your calendar shows drop-off at 8 and pickup at 5:30 for Jaxon at Balanced Family Academy today, with a private event at 10am in between. The 5:30 pickup gives you comfortable margin before the 6pm cutoff, so no squeeze there.
```
