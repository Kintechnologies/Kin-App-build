"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback, useMemo, forwardRef } from "react";

// ───────── Constants ─────────

const ACCENT = "#7CB87A";

const PARTNER_NAME = "Sarah";
const COPARENT_NAME = "Marcus";
const PARENT_NAME = "Mom";
const AIDE_NAME = "Karen";
const ROOMMATE_1 = "Maya";
const ROOMMATE_2 = "Jamie";

const KID_NAMES: Record<KidAge, string[]> = {
  school: ["Emma", "Liam", "Mia"],
  toddler: ["Ava", "Noah", "Wren"],
  teen: ["Maya", "Jonah", "Theo"],
};

// ───────── Types ─────────

type Persona = "two-parent" | "coparent" | "caregiver" | "roommates";
type BusyLevel = "light" | "moderate" | "packed";
type KidAge = "toddler" | "school" | "teen";

type Config = {
  persona: Persona;
  busyMine: BusyLevel;
  busyOther: BusyLevel;
  kids: { age: KidAge }[];
};

type Reply = { prompt: string; kinReply: string };

type Scenario = {
  briefing: string;
  round1: Reply[];
  round2: Reply[];
  closer: Reply;
};

type ChatItem =
  | { id: string; role: "kin" | "user"; text: string }
  | { id: string; role: "typing" };

type Kid = { age: KidAge; name: string };

// ───────── Helpers ─────────

function assignKidNames(kids: { age: KidAge }[]): Kid[] {
  const counters = { school: 0, toddler: 0, teen: 0 };
  return kids.map((k) => {
    const idx = counters[k.age]++;
    return { age: k.age, name: KID_NAMES[k.age][idx] ?? KID_NAMES[k.age][0] };
  });
}

// ───────── Briefing builders ─────────

// — TWO-PARENT —

function twoParentLead(kid: Kid, p1: BusyLevel, p2: BusyLevel): string {
  if (kid.age === "school") {
    if (p1 === "packed" && p2 !== "packed") {
      return `${kid.name}'s got soccer at 4. You're back-to-back until 4:30 — but ${PARTNER_NAME}'s clear after 3, she could grab pickup. Say the word and I'll loop her in.`;
    }
    if (p1 === "packed" && p2 === "packed") {
      return `${kid.name}'s got soccer at 4. Both of you are slammed — your gap at 4:00 is the cleanest window, ${PARTNER_NAME}'s free 4:15–4:45. One of you covers, I'll work the rest.`;
    }
    if (p1 === "moderate" && p2 === "packed") {
      return `${kid.name}'s got soccer at 4. ${PARTNER_NAME}'s wall-to-wall today, but you wrap your 2:30 by 3:45 — pickup's on you. I'll set the reminder.`;
    }
    if (p1 === "moderate") {
      return `${kid.name}'s got soccer at 4. You've got a 2:30 call but it should wrap clean — pickup's tight but workable.`;
    }
    return `${kid.name}'s got soccer at 4. Your day's open — easy run, no juggling.`;
  }

  if (kid.age === "toddler") {
    if (p1 === "packed" && p2 !== "packed") {
      return `${kid.name}'s daycare pickup is at 5:30. You're slammed all afternoon — ${PARTNER_NAME}'s clear after 4, she's the one. I'll confirm with her.`;
    }
    if (p1 === "packed" && p2 === "packed") {
      return `${kid.name}'s daycare pickup is at 5:30. You're both buried — your 5pm wraps fastest, you've got the best shot. I'll flag at 5:10.`;
    }
    if (p1 === "moderate") {
      return `${kid.name}'s daycare pickup is at 5:30. Your 4pm runs long sometimes — I'll flag at 4:55 if it's still going so you can push your 5:15.`;
    }
    return `${kid.name}'s daycare pickup is at 5:30. Day's open — plenty of room. Nap window's 1–3 if you want quiet hours.`;
  }

  // teen
  if (p1 === "packed" && p2 !== "packed") {
    return `${kid.name}'s got lacrosse 4–6. You're booked through 5:30 — but ${PARTNER_NAME}'s clear after 4, she could swing by and watch the back half.`;
  }
  if (p1 === "moderate") {
    return `${kid.name}'s got lacrosse 4–6. You've got a 5pm call — drop-off's clean, ${kid.name} can ride home with the Petersons.`;
  }
  return `${kid.name}'s got lacrosse 4–6. Your day's clear — go watch the back half if you can, ${kid.name} mentioned wanting you there.`;
}

function twoParentSecondary(kid: Kid, slotIdx: number): string {
  if (kid.age === "school") {
    return slotIdx === 1
      ? `${kid.name}'s got the dentist at 3:30. ${PARTNER_NAME}'s planning to handle that one.`
      : `${kid.name} has a playdate at the Kims' 5–7. ${PARTNER_NAME}'ll do drop-off, you've got pickup.`;
  }
  if (kid.age === "toddler") {
    return slotIdx === 1
      ? `${kid.name}'s nap window is 1–3. ${PARTNER_NAME}'s home — protected hours, no calls scheduled there.`
      : `${kid.name}'s got swim at 4. ${PARTNER_NAME}'s on it, she's bringing snacks.`;
  }
  return slotIdx === 1
    ? `${kid.name}'s SAT prep is 6–8. ${PARTNER_NAME}'s doing the drop, just keep dinner light.`
    : `${kid.name} has driver's ed at 5. ${PARTNER_NAME}'ll handle it.`;
}

function twoParentHeadsUp(c: Config, kids: Kid[]): string {
  const anyPacked = c.busyMine === "packed" || c.busyOther === "packed";
  const allLight = c.busyMine === "light" && c.busyOther === "light";
  if (allLight) {
    return `Heads up: nothing on fire. Quiet day. Want me to slot in something nice — coffee, a walk, the thing you've been putting off?`;
  }
  if (anyPacked && kids.length >= 2) {
    return `Heads up: tight stretch 4–6. I'll watch the seams and flag if anything slides.`;
  }
  if (anyPacked) {
    return `Heads up: dinner's still TBD — you haven't decided since Tuesday. Want a few options?`;
  }
  if (kids.some((k) => k.age === "teen")) {
    return `Heads up: ${kids.find((k) => k.age === "teen")!.name}'s big game is Friday. Calendar's clear if you want to go.`;
  }
  return `Heads up: pickup's the only pressure point today. Otherwise smooth.`;
}

function buildTwoParent(c: Config): Scenario {
  const kids = assignKidNames(c.kids);
  const lines: string[] = [twoParentLead(kids[0], c.busyMine, c.busyOther)];
  if (kids[1]) lines.push(twoParentSecondary(kids[1], 1));
  if (kids[2]) lines.push(twoParentSecondary(kids[2], 2));
  lines.push(twoParentHeadsUp(c, kids));

  const k1 = kids[0];
  const round1: Reply[] = [];
  if (c.busyMine === "packed" && c.busyOther !== "packed") {
    round1.push({
      prompt: `Yes, ask ${PARTNER_NAME} to grab ${k1.name}`,
      kinReply: `On it. Just messaged ${PARTNER_NAME} — she's locked in for 4. I'll send you both a heads-up at 3:45 so neither of you blanks on it.`,
    });
  } else if (c.busyMine === "packed" && c.busyOther === "packed") {
    round1.push({
      prompt: `I'll grab ${k1.name}`,
      kinReply: `Got it — I'll text ${PARTNER_NAME} she's clear. Heads-up: you'll want your 3:30 to wrap by 3:50 to give yourself runway.`,
    });
  } else {
    round1.push({
      prompt: `What time does ${k1.age === "toddler" ? "daycare" : k1.age === "teen" ? "lacrosse" : "soccer"} actually end?`,
      kinReply:
        k1.age === "toddler"
          ? `Daycare closes at 6 sharp — they charge after. ${k1.name}'s usually ready by 5:15 if you want to grab early.`
          : k1.age === "teen"
            ? `6:00 on paper, closer to 6:20 if Coach Devon runs scrimmage. I'll watch and ping if it slips.`
            : `5:15 official, but Coach usually wraps closer to 5:30 if there's a scrimmage. I'll watch and let you know.`,
    });
  }

  if (c.busyMine === "packed" || c.busyMine === "moderate") {
    round1.push({
      prompt: `What about my 3pm meeting?`,
      kinReply: `Pushing it to 3:30 with Marcus would give you a clean 45-min runway before pickup. Want me to draft the reschedule note?`,
    });
  } else {
    round1.push({
      prompt: `Coffee with ${PARTNER_NAME} at 2?`,
      kinReply: `Texted ${PARTNER_NAME} — she said yes. Mercato at 2. Add it to your calendar when you get a sec.`,
    });
  }

  round1.push({
    prompt: `Anything I'm forgetting?`,
    kinReply: kids.find((k) => k.age === "school")
      ? `Permission slip for ${kids.find((k) => k.age === "school")!.name}'s field trip — due Friday. Reminder set for tonight after bedtime so you're not scrambling.`
      : kids.find((k) => k.age === "toddler")
        ? `${kids.find((k) => k.age === "toddler")!.name}'s diapers are running low — I added them to your grocery list and pushed it to ${PARTNER_NAME}.`
        : `${kids[0].name}'s recommendation letter for the summer program — deadline's next Thursday. I drafted three teacher options if you want to look.`,
  });

  const round2: Reply[] = [
    {
      prompt: `Tell ${PARTNER_NAME} I owe her`,
      kinReply: `Done — and she said "you owe me bedtime." I'm on the bedtime reminder for 7:45.`,
    },
    {
      prompt: `What's tomorrow look like?`,
      kinReply:
        c.busyMine === "packed" || c.busyOther === "packed"
          ? `Lighter — ${kids[0].name}'s free, you've got one 9am and a 2pm. ${PARTNER_NAME}'s wall-to-wall but only morning. I'll send the full briefing at 6.`
          : `Calm. ${kids[0].name}'s got ${kids[0].age === "toddler" ? "swim 9am" : "school as usual"}, you've got the afternoon open. Real shot at a slow morning.`,
    },
  ];

  return {
    briefing: "Morning. Here's today —\n\n" + lines.join("\n\n"),
    round1,
    round2,
    closer: { prompt: "Sounds good", kinReply: "I'll keep watch. Talk in a bit." },
  };
}

// — COPARENT —

function buildCoparent(c: Config): Scenario {
  const kids = assignKidNames(c.kids);
  const k1 = kids[0];
  const yours = c.busyMine;
  const theirs = c.busyOther;

  let lead = "";
  if (k1.age === "school") {
    lead = `${k1.name}'s with you this week. Soccer at 4 today — handoff to ${COPARENT_NAME} Friday at 5 still on.`;
    if (yours === "packed" && theirs !== "packed") {
      lead += ` You're slammed till 4:30 — ${COPARENT_NAME}'s clear after 3, he offered to grab pickup if it gets tight. Want me to confirm?`;
    } else if (yours === "packed" && theirs === "packed") {
      lead += ` You're both buried. Coach Devon does carpool drops if you ask by 2 — I can text him.`;
    } else if (yours === "moderate") {
      lead += ` Your 2:30 should wrap clean — pickup's tight but workable.`;
    } else {
      lead += ` Day's open — easy run.`;
    }
  } else if (k1.age === "toddler") {
    lead = `${k1.name}'s with you this week. Daycare pickup at 5:30, handoff to ${COPARENT_NAME} Friday at 5.`;
    if (yours === "packed" && theirs !== "packed") {
      lead += ` ${COPARENT_NAME}'s free after 4 — he can grab pickup if your 5pm runs over. Say the word.`;
    } else if (yours === "packed") {
      lead += ` You're packed but daycare gives 15-min grace — push your 5:15 to 5:45 and you're fine.`;
    } else if (yours === "moderate") {
      lead += ` Manageable. I'll flag at 5:10 if the 4pm meeting is still going.`;
    } else {
      lead += ` Day's open. Nap window's 1–3 if you want quiet hours.`;
    }
  } else {
    lead = `${k1.name}'s with you this week. Lacrosse 4–6, handoff to ${COPARENT_NAME} Friday at 5.`;
    if (yours === "packed") {
      lead += ` You're locked till 5:30 — ${k1.name} can ride home with the Petersons, they offered last week.`;
    } else if (yours === "moderate") {
      lead += ` 5pm call's the only conflict — drop's easy, ${k1.name} can ride home with friends.`;
    } else {
      lead += ` Open day. Worth catching the back half — ${k1.name} mentioned wanting you there.`;
    }
  }

  const lines: string[] = [lead];

  if (kids[1]) {
    const k2 = kids[1];
    if (k2.age === "school") {
      lines.push(`${k2.name}'s got the dentist at 3:30. Already on your calendar, you've got it.`);
    } else if (k2.age === "toddler") {
      lines.push(`${k2.name}'s nap window is 1–3. ${COPARENT_NAME}'s mom's coming by 2 — she knows to keep it quiet.`);
    } else {
      lines.push(`${k2.name}'s SAT prep is 6–8. ${COPARENT_NAME}'s dropping (he picked the tutor).`);
    }
  }
  if (kids[2]) {
    lines.push(`${kids[2].name}'s got swim at 4 — gear bag's in your car already.`);
  }

  if (yours === "packed" || theirs === "packed") {
    lines.push(
      `Heads up: Friday handoff, ${COPARENT_NAME} asked about the soccer schedule. I'll send him the next two weeks tonight so it's not on you.`,
    );
  } else {
    lines.push(
      `Heads up: ${k1.name}'s parent-teacher conference Thursday at 6. ${COPARENT_NAME} confirmed he's coming. Want me to handle dinner logistics?`,
    );
  }

  const round1: Reply[] = [
    {
      prompt:
        yours === "packed" && theirs !== "packed"
          ? `Yes, ask ${COPARENT_NAME} to grab pickup`
          : `What's the handoff Friday?`,
      kinReply:
        yours === "packed" && theirs !== "packed"
          ? `Texted him — locked for 4. I'll send you both a heads-up at 3:45 so neither of you blanks.`
          : `Friday 5pm at his place. You drop ${k1.name}'s soccer bag + the inhaler. He's got dinner. Already on his calendar.`,
    },
    {
      prompt: `Coordinate weekend with ${COPARENT_NAME}`,
      kinReply: `He's got a wedding Saturday, asked if you'd take ${k1.name} extra till Sunday noon. Want me to confirm?`,
    },
    {
      prompt: `Anything I'm forgetting?`,
      kinReply: kids.find((k) => k.age === "school")
        ? `Permission slip for ${kids.find((k) => k.age === "school")!.name}'s field trip — due Friday. ${COPARENT_NAME} signed already, you're up.`
        : `${k1.name}'s pediatrician appt is next Tuesday — both of you have it on calendar, ${COPARENT_NAME}'s taking lead.`,
    },
  ];

  const round2: Reply[] = [
    {
      prompt: `Tell ${COPARENT_NAME} thanks`,
      kinReply: `Sent — he said "anytime, this is what we agreed." Co-parenting energy intact.`,
    },
    {
      prompt: `What's tomorrow look like?`,
      kinReply: `Lighter. ${k1.name} has school as usual. ${COPARENT_NAME}'s taking ${k1.name} for dinner Wed (his idea). Your evening's open.`,
    },
  ];

  return {
    briefing: "Morning. Here's today —\n\n" + lines.join("\n\n"),
    round1,
    round2,
    closer: { prompt: "Sounds good", kinReply: "I'll keep watch. Talk in a bit." },
  };
}

// — CAREGIVER —

function buildCaregiver(c: Config): Scenario {
  const yours = c.busyMine;
  const care = c.busyOther; // light/moderate/packed → Mom's care intensity

  const lines: string[] = [];

  if (care === "packed") {
    lines.push(
      `${PARENT_NAME}'s PT at 2pm — ${AIDE_NAME} is driving. Cardiology follow-up Thursday at 10, paperwork's in your inbox. 8am meds in (insulin, lisinopril, the Eliquis) — evening dose at 6, I'll remind ${AIDE_NAME}.`,
    );
    if (yours === "packed") {
      lines.push(`You're back-to-back until 4 — ${AIDE_NAME}'s solid till 5, no decisions needed from you until tonight.`);
    } else if (yours === "moderate") {
      lines.push(`You've got the 11am with Marcus then a clear afternoon — good window to call Dr. Chen about the sleep changes.`);
    } else {
      lines.push(`Your day's open. Worth swinging by between PT and dinner if you can — she asked about you yesterday.`);
    }
    lines.push(`Heads up: pharmacy refill (Eliquis) needs to clear by Friday. I drafted the request — say the word and I'll send it.`);
  } else if (care === "moderate") {
    lines.push(
      `${PARENT_NAME}'s 9am meds in (insulin, lisinopril). ${AIDE_NAME} arrives 11am, here till 4. Dentist at 1:30 — she's driving.`,
    );
    if (yours === "packed") {
      lines.push(`You're packed today. ${AIDE_NAME} has it covered — only flag from her end is needing your call on the new aide schedule by Wednesday.`);
    } else if (yours === "moderate") {
      lines.push(`You've got room around 2 — good time to call her, she likes mid-afternoon.`);
    } else {
      lines.push(`Light day for you. Worth lunch — ${AIDE_NAME}'s there for the dentist, you'd be free company.`);
    }
    lines.push(`Heads up: she mentioned the stairs feeling harder. Worth a check-in this week before it slides.`);
  } else {
    lines.push(
      `${PARENT_NAME}'s good — meds in, no appointments, ${AIDE_NAME}'s off today (Sunday rotation). She'll be on her own till tomorrow morning.`,
    );
    if (yours === "packed") {
      lines.push(`You're slammed — quick check-in call after lunch is plenty. She's solid solo days.`);
    } else if (yours === "moderate") {
      lines.push(`You've got a clear afternoon — would mean a lot if you stopped by. She made apricot bars yesterday "in case Sarah comes."`);
    } else {
      lines.push(`Light day for both of you. Real shot at a slow afternoon together.`);
    }
    lines.push(`Heads up: pharmacy refills are clean through next week. Nothing on fire.`);
  }

  const round1: Reply[] = [
    {
      prompt: care === "packed" ? `Confirm Eliquis refill` : `Call her this afternoon`,
      kinReply:
        care === "packed"
          ? `Sent — pharmacy will fax Dr. Chen by 11. I'll confirm pickup ready by Friday 4pm and ping you.`
          : `Set for 2pm reminder. I'll pull her latest from ${AIDE_NAME}'s notes so you have something to lead with.`,
    },
    {
      prompt: `What's ${AIDE_NAME}'s schedule this week?`,
      kinReply: `Mon/Wed/Fri 11–4, Tue/Thu 9–2 for dentist + cardiology runs, off Sunday. She's flagged time off Aug 14–18 — we should plan a fill-in.`,
    },
    {
      prompt: `Anything I'm forgetting?`,
      kinReply: `Her birthday's three weeks out (Aug 22). You said you wanted to do something this year — want me to start a list?`,
    },
  ];

  const round2: Reply[] = [
    {
      prompt: `Remind me to send the cardiology forms`,
      kinReply: `Reminder set for tonight 8pm — that's after your meeting wraps. I have the forms saved, I'll surface them.`,
    },
    {
      prompt: `What's tomorrow look like?`,
      kinReply: `${AIDE_NAME} 11–4. No appts. ${PARENT_NAME}'s asked about a haircut — Maria has 2pm Thursday, want me to book?`,
    },
  ];

  return {
    briefing: "Morning. Here's today —\n\n" + lines.join("\n\n"),
    round1,
    round2,
    closer: { prompt: "Sounds good", kinReply: "I'll keep watch. Talk in a bit." },
  };
}

// — ROOMMATES —

function buildRoommates(c: Config): Scenario {
  const yours = c.busyMine;
  const house = c.busyOther; // light=quiet, moderate=balanced, packed=hectic

  const lines: string[] = [];

  if (house === "packed") {
    lines.push(
      `${ROOMMATE_1}'s got people over Saturday 7pm — 8 confirmed. ${ROOMMATE_2}'s out Thu–Sun (work trip), trash rotation falls to you tonight.`,
    );
    lines.push(
      `Gas bill due Friday — your $42 share, Venmo ${ROOMMATE_1}. Internet hit your card again, I'll split-charge them tonight.`,
    );
    if (yours === "packed") {
      lines.push(`You're packed today — none of this needs you before evening. Just don't blank on trash.`);
    } else if (yours === "moderate") {
      lines.push(`You've got a clean afternoon — good time to confirm headcount with ${ROOMMATE_1} and figure out the snack situation.`);
    } else {
      lines.push(`Light day for you. ${ROOMMATE_1} mentioned wanting help prepping Saturday — worth offering, she'd remember it.`);
    }
    lines.push(`Heads up: dishwasher's been making the noise again. Three weeks now — worth flagging the landlord this week.`);
  } else if (house === "moderate") {
    lines.push(
      `Trash night tonight — ${ROOMMATE_2}'s on rotation but they're traveling, so it's you. ${ROOMMATE_1}'s out for dinner with the work crew.`,
    );
    lines.push(`Gas bill due Friday — $42 your share. Internet split-charge going out tonight.`);
    if (yours === "packed") {
      lines.push(`You're slammed — set a 9pm phone reminder for trash, that's all you need to track.`);
    } else if (yours === "moderate") {
      lines.push(`Your evening's clear — quiet apartment night since ${ROOMMATE_1}'s out. Real shot at a slow one.`);
    } else {
      lines.push(`Light day all around. Place'll be empty tonight if you want a quiet evening.`);
    }
    lines.push(`Heads up: ${ROOMMATE_2} flagged the AC not cooling the back room. Worth mentioning to ${ROOMMATE_1} so it's on her radar too.`);
  } else {
    lines.push(
      `Quiet day. No bills due, no events on the calendar, no chores on rotation tonight. ${ROOMMATE_1} and ${ROOMMATE_2} are both out till evening.`,
    );
    if (yours === "packed") {
      lines.push(`You're packed — apartment will be empty when you get home, take the slow evening.`);
    } else if (yours === "moderate") {
      lines.push(`Good window for the things you've been putting off. The grocery run, the haircut, that book.`);
    } else {
      lines.push(`Nothing on fire anywhere. Want me to slot in something nice?`);
    }
    lines.push(`Heads up: lease renewal hits in 60 days. Want me to start the conversation with ${ROOMMATE_1} and ${ROOMMATE_2} this week?`);
  }

  const round1: Reply[] = [
    {
      prompt: house === "packed" ? `Help ${ROOMMATE_1} with Saturday prep` : `Remind me about trash at 9pm`,
      kinReply:
        house === "packed"
          ? `Texted ${ROOMMATE_1} you're in — she said anything from grocery run to setup. I put 4pm Saturday on hold for you.`
          : `Set. I'll buzz at 8:50 so you have a few minutes to roll out the cans before pickup at 7am.`,
    },
    {
      prompt: `Send ${ROOMMATE_1} my Venmo for gas`,
      kinReply: `Done — sent her $42 with the request note "gas, May share." She usually pays end of day.`,
    },
    {
      prompt: `What did I miss this week?`,
      kinReply: `${ROOMMATE_2} mentioned the cleaner asking about a raise. ${ROOMMATE_1} restocked everything except coffee. AC issue still open. Lease renewal coming.`,
    },
  ];

  const round2: Reply[] = [
    {
      prompt: `Loop me in on the lease convo`,
      kinReply: `Started a thread with ${ROOMMATE_1} and ${ROOMMATE_2} — I'll surface their replies and keep you out of the back-and-forth until decisions need you.`,
    },
    {
      prompt: `What's tomorrow look like?`,
      kinReply:
        house === "packed"
          ? `Quieter — ${ROOMMATE_1}'s in the office all day, ${ROOMMATE_2} still traveling. Apartment's yours.`
          : `${ROOMMATE_1} working from home (she likes the kitchen quiet 9–12). Otherwise open.`,
    },
  ];

  return {
    briefing: "Morning. Here's today —\n\n" + lines.join("\n\n"),
    round1,
    round2,
    closer: { prompt: "Sounds good", kinReply: "I'll keep watch. Talk in a bit." },
  };
}

function generateScenario(c: Config): Scenario {
  switch (c.persona) {
    case "two-parent":
      return buildTwoParent(c);
    case "coparent":
      return buildCoparent(c);
    case "caregiver":
      return buildCaregiver(c);
    case "roommates":
      return buildRoommates(c);
  }
}

// ───────── Persona-specific labels ─────────

const PERSONA_OPTIONS: { value: Persona; label: string }[] = [
  { value: "two-parent", label: "Two-parent household" },
  { value: "coparent", label: "Co-parents" },
  { value: "caregiver", label: "Caregiver for aging parent" },
  { value: "roommates", label: "Roommates" },
];

function otherBusyLabel(persona: Persona): string {
  switch (persona) {
    case "two-parent":
      return `How busy is ${PARTNER_NAME}'s typical day?`;
    case "coparent":
      return `How busy is ${COPARENT_NAME}'s typical day?`;
    case "caregiver":
      return `How much care does ${PARENT_NAME} need?`;
    case "roommates":
      return `How active is your household?`;
  }
}

function otherBusyOptions(persona: Persona): { value: BusyLevel; label: string }[] {
  if (persona === "caregiver") {
    return [
      { value: "light", label: "Light" },
      { value: "moderate", label: "Moderate" },
      { value: "packed", label: "Intensive" },
    ];
  }
  if (persona === "roommates") {
    return [
      { value: "light", label: "Quiet" },
      { value: "moderate", label: "Balanced" },
      { value: "packed", label: "Hectic" },
    ];
  }
  return [
    { value: "light", label: "Light" },
    { value: "moderate", label: "Moderate" },
    { value: "packed", label: "Packed" },
  ];
}

const showsKids = (p: Persona) => p === "two-parent" || p === "coparent";

// ───────── Config panel ─────────

function ConfigPanel({
  config,
  onChange,
}: {
  config: Config;
  onChange: (c: Config) => void;
}) {
  const setKidCount = (n: number) => {
    const prev = config.kids;
    let next: { age: KidAge }[];
    if (n === prev.length) next = prev;
    else if (n > prev.length) {
      const additions: { age: KidAge }[] = [];
      for (let i = prev.length; i < n; i++) {
        additions.push({ age: i === 1 ? "toddler" : "teen" });
      }
      next = [...prev, ...additions];
    } else {
      next = prev.slice(0, n);
    }
    onChange({ ...config, kids: next });
  };

  const setKidAge = (idx: number, age: KidAge) => {
    onChange({
      ...config,
      kids: config.kids.map((k, i) => (i === idx ? { age } : k)),
    });
  };

  return (
    <div
      style={{
        width: "100%",
        background: "#141810",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "20px",
        padding: "clamp(20px, 4vw, 28px)",
        boxShadow:
          "-3px -3px 8px rgba(255,255,255,0.025), 4px 4px 18px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <ConfigGroup label="Your household">
        <SegRow>
          {PERSONA_OPTIONS.map((p) => (
            <SegBtn
              key={p.value}
              active={config.persona === p.value}
              onClick={() => onChange({ ...config, persona: p.value })}
              wide
            >
              {p.label}
            </SegBtn>
          ))}
        </SegRow>
      </ConfigGroup>

      <ConfigGroup label="How busy is your typical day?">
        <SegRow>
          {(["light", "moderate", "packed"] as BusyLevel[]).map((lvl) => (
            <SegBtn
              key={lvl}
              active={config.busyMine === lvl}
              onClick={() => onChange({ ...config, busyMine: lvl })}
            >
              {lvl[0].toUpperCase() + lvl.slice(1)}
            </SegBtn>
          ))}
        </SegRow>
      </ConfigGroup>

      <ConfigGroup label={otherBusyLabel(config.persona)}>
        <SegRow>
          {otherBusyOptions(config.persona).map((opt) => (
            <SegBtn
              key={opt.value}
              active={config.busyOther === opt.value}
              onClick={() => onChange({ ...config, busyOther: opt.value })}
            >
              {opt.label}
            </SegBtn>
          ))}
        </SegRow>
      </ConfigGroup>

      {showsKids(config.persona) && (
        <motion.div
          key={`kids-${config.persona}`}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <ConfigGroup label="How many kids?">
            <SegRow>
              {[1, 2, 3].map((n) => (
                <SegBtn
                  key={n}
                  active={config.kids.length === n}
                  onClick={() => setKidCount(n)}
                >
                  {n}
                </SegBtn>
              ))}
            </SegRow>
          </ConfigGroup>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {config.kids.map((k, i) => (
              <ConfigGroup key={i} label={`Kid ${i + 1} age`} inline>
                <SegRow>
                  {(["toddler", "school", "teen"] as KidAge[]).map((age) => (
                    <SegBtn
                      key={age}
                      active={k.age === age}
                      onClick={() => setKidAge(i, age)}
                    >
                      {age === "toddler" ? "Toddler" : age === "school" ? "School-age" : "Teen"}
                    </SegBtn>
                  ))}
                </SegRow>
              </ConfigGroup>
            ))}
          </div>
        </motion.div>
      )}

      <div
        style={{
          marginTop: showsKids(config.persona) ? 22 : 4,
          padding: "12px 14px",
          background: "rgba(124,184,122,0.06)",
          border: "1px solid rgba(124,184,122,0.18)",
          borderRadius: 10,
          fontSize: 12,
          color: "rgba(240,237,230,0.6)",
          lineHeight: 1.5,
          letterSpacing: "-0.1px",
        }}
      >
        <span style={{ color: ACCENT, fontWeight: 500 }}>← Live preview.</span>{" "}
        The phone updates as you change anything. Tap a reply to keep going.
      </div>
    </div>
  );
}

function ConfigGroup({
  label,
  children,
  inline,
}: {
  label: string;
  children: React.ReactNode;
  inline?: boolean;
}) {
  return (
    <div
      style={{
        marginBottom: inline ? 0 : "20px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <span
        style={{
          fontSize: "10.5px",
          fontWeight: 500,
          color: "rgba(240,237,230,0.45)",
          fontFamily: "var(--font-geist-mono), monospace",
          letterSpacing: "1.2px",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function SegRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
      {children}
    </div>
  );
}

function SegBtn({
  active,
  onClick,
  children,
  wide,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      style={{
        flex: wide ? "1 1 calc(50% - 6px)" : "1 1 0",
        minWidth: wide ? "calc(50% - 6px)" : "60px",
        background: active ? "rgba(124,184,122,0.16)" : "#1c211a",
        border: active
          ? "1px solid rgba(124,184,122,0.6)"
          : "1px solid rgba(124,184,122,0.18)",
        borderRadius: "10px",
        padding: wide ? "11px 12px" : "10px 14px",
        fontSize: wide ? "12.5px" : "13px",
        fontWeight: 500,
        color: active ? ACCENT : "rgba(240,237,230,0.85)",
        cursor: "pointer",
        letterSpacing: "-0.1px",
        textAlign: "center" as const,
        transition: "background 180ms ease, border-color 180ms ease, color 180ms ease",
        boxShadow: active
          ? "inset 0 0 0 1px rgba(124,184,122,0.12), 0 0 22px rgba(124,184,122,0.14)"
          : "inset -1px -1px 2px rgba(255,255,255,0.015), inset 1px 1px 2px rgba(0,0,0,0.3)",
      }}
    >
      {children}
    </motion.button>
  );
}

// ───────── Phone (live, reactive to config) ─────────

const BRIEFING_KEY = "briefing-bubble";

function LivePhone({ config }: { config: Config }) {
  const scenario = useMemo(() => generateScenario(config), [config]);

  const [chat, setChat] = useState<ChatItem[]>([]);
  const [stage, setStage] = useState<
    "boot" | "round1" | "round2" | "closer" | "done"
  >("boot");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);
  const isFirstRender = useRef(true);
  const cancelRef = useRef<{ cancelled: boolean } | null>(null);

  const nextId = useCallback(() => `m${idCounter.current++}`, []);

  // Whenever the scenario changes (config changed), reset the chat.
  // First render: typing → briefing animation. Subsequent: snap to briefing.
  useEffect(() => {
    if (cancelRef.current) cancelRef.current.cancelled = true;
    const ctx = { cancelled: false };
    cancelRef.current = ctx;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      (async () => {
        setBusy(true);
        const tid = nextId();
        setChat([{ id: tid, role: "typing" }]);
        await wait(1100);
        if (ctx.cancelled) return;
        setChat([{ id: BRIEFING_KEY, role: "kin", text: scenario.briefing }]);
        await wait(450);
        if (ctx.cancelled) return;
        setStage("round1");
        setBusy(false);
      })();
    } else {
      setBusy(false);
      setChat([{ id: BRIEFING_KEY, role: "kin", text: scenario.briefing }]);
      setStage("round1");
    }
  }, [scenario, nextId]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [chat]);

  const append = useCallback(
    (role: "kin" | "user", text: string) => {
      setChat((prev) => [...prev, { id: nextId(), role, text }]);
    },
    [nextId],
  );

  const onSelect = async (
    reply: Reply,
    nextStage: "round2" | "closer" | "done",
  ) => {
    if (busy) return;
    setBusy(true);
    append("user", reply.prompt);
    await wait(400);
    const tid = nextId();
    setChat((prev) => [...prev, { id: tid, role: "typing" }]);
    await wait(1000);
    setChat((prev) =>
      prev.map((m) =>
        m.id === tid ? { id: tid, role: "kin", text: reply.kinReply } : m,
      ),
    );
    await wait(450);
    setStage(nextStage);
    setBusy(false);
  };

  const currentOptions: Reply[] =
    stage === "round1"
      ? scenario.round1
      : stage === "round2"
        ? scenario.round2
        : stage === "closer"
          ? [scenario.closer]
          : [];

  const advanceTo: "round2" | "closer" | "done" =
    stage === "round1" ? "round2" : stage === "round2" ? "closer" : "done";

  const isMobile = useIsMobile();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
        width: "100%",
      }}
    >
      <div
        style={
          isMobile
            ? {
                width: "100%",
                maxWidth: "420px",
                background: "#0d0d0d",
                borderRadius: "20px",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                height: "min(640px, 78vh)",
                boxShadow:
                  "0 0 0 1px rgba(255,255,255,0.06), 0 0 40px rgba(124,184,122,0.08), 0 16px 40px rgba(0,0,0,0.6)",
                position: "relative",
              }
            : {
                width: "320px",
                aspectRatio: "9 / 19",
                background: "#0a0a0a",
                borderRadius: "40px",
                padding: "9px",
                boxShadow:
                  "0 0 0 2px rgba(255,255,255,0.06), 0 0 60px rgba(124,184,122,0.12), 0 30px 80px rgba(0,0,0,0.7)",
                position: "relative",
              }
        }
      >
        {!isMobile && (
          <div
            style={{
              position: "absolute",
              top: "16px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "92px",
              height: "24px",
              background: "#000",
              borderRadius: "14px",
              zIndex: 5,
            }}
          />
        )}

        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#0d0d0d",
            borderRadius: isMobile ? "0" : "32px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          {!isMobile && (
            <div
              style={{
                padding: "14px 24px 8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "12.5px",
                fontWeight: 600,
                color: "#fff",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <span>6:02</span>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <SignalIcon />
                <WifiIcon />
                <BatteryIcon />
              </div>
            </div>
          )}

          {/* Header */}
          <div
            style={{
              padding: isMobile ? "14px 16px 12px" : "8px 16px 12px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              background: "rgba(20,20,22,0.6)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                background: "rgba(124,184,122,0.14)",
                border: "1px solid rgba(124,184,122,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="17" height="17" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="20" r="8" fill={ACCENT} />
                <circle cx="21.75" cy="37.9" r="9" fill={ACCENT} />
                <circle cx="42.25" cy="37.9" r="9" fill={ACCENT} />
              </svg>
            </div>
            <span
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: "#fff",
                letterSpacing: "-0.1px",
              }}
            >
              Kin
            </span>
            <span
              style={{
                fontSize: "9.5px",
                color: "rgba(255,255,255,0.38)",
                fontFamily: "var(--font-geist-mono), monospace",
                letterSpacing: "0.5px",
              }}
            >
              SMS
            </span>
          </div>

          {/* Chat area */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "14px 12px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              scrollbarWidth: "none",
              minHeight: 0,
            }}
          >
            <div
              style={{
                textAlign: "center",
                fontSize: "9.5px",
                color: "rgba(255,255,255,0.32)",
                margin: "2px 0 10px",
                fontWeight: 500,
              }}
            >
              Today 6:02 AM
            </div>

            <AnimatePresence initial={false}>
              {chat.map((item) => (
                <Bubble key={item.id} item={item} />
              ))}
            </AnimatePresence>
          </div>

          {/* Reply chips */}
          <div
            style={{
              padding: "10px 12px 14px",
              borderTop: "1px solid rgba(255,255,255,0.05)",
              background: "rgba(15,15,17,0.7)",
              minHeight: "60px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            {!busy && currentOptions.length > 0 && stage !== "done" && (
              <motion.div
                key={`${stage}-${scenario.briefing.slice(0, 16)}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28 }}
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.32)",
                    fontFamily: "var(--font-geist-mono), monospace",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    paddingLeft: "4px",
                  }}
                >
                  Tap to reply
                </span>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {currentOptions.map((opt, i) => (
                    <ReplyChip
                      key={`${stage}-${i}`}
                      text={opt.prompt}
                      onClick={() => onSelect(opt, advanceTo)}
                      index={i}
                    />
                  ))}
                </div>
              </motion.div>
            )}
            {stage === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "stretch",
                  gap: "8px",
                  padding: "4px 2px 2px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: "rgba(255,255,255,0.55)",
                    fontStyle: "italic",
                    letterSpacing: "-0.1px",
                    textAlign: "center",
                  }}
                >
                  That&apos;s a real morning with Kin.
                </span>
                <motion.a
                  href="/signup"
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    background: ACCENT,
                    color: "#0C0F0A",
                    padding: "11px 16px",
                    borderRadius: "10px",
                    fontSize: "13.5px",
                    fontWeight: 600,
                    letterSpacing: "-0.15px",
                    textDecoration: "none",
                    animation: "kinPulse 2.4s ease-in-out infinite",
                  }}
                >
                  Start your free 7-day trial →
                </motion.a>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const Bubble = forwardRef<HTMLDivElement, { item: ChatItem }>(function Bubble(
  { item },
  ref,
) {
  if (item.role === "typing") {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        style={{ display: "flex", justifyContent: "flex-start", padding: "2px 0" }}
      >
        <div
          style={{
            background: "#1f1f22",
            borderRadius: "18px 18px 18px 4px",
            padding: "10px 14px",
            display: "flex",
            gap: "4px",
          }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 0.85, 0.3], y: [0, -2, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }}
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.6)",
              }}
            />
          ))}
        </div>
      </motion.div>
    );
  }

  const isKin = item.role === "kin";
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "flex",
        justifyContent: isKin ? "flex-start" : "flex-end",
        padding: "1px 0",
      }}
    >
      <div
        style={{
          background: isKin ? "#1f1f22" : "#34C759",
          color: isKin ? "#F0EDE6" : "#0a1f0a",
          borderRadius: isKin ? "18px 18px 18px 4px" : "18px 18px 4px 18px",
          padding: "9px 14px",
          maxWidth: "82%",
          fontSize: "13.5px",
          lineHeight: 1.42,
          letterSpacing: "-0.1px",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontWeight: isKin ? 400 : 500,
          boxShadow: isKin
            ? "0 1px 2px rgba(0,0,0,0.35)"
            : "0 1px 2px rgba(0,0,0,0.4), 0 0 18px rgba(52,199,89,0.18)",
        }}
      >
        {item.text}
      </div>
    </motion.div>
  );
});

function ReplyChip({
  text,
  onClick,
  index,
}: {
  text: string;
  onClick: () => void;
  index: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.06 }}
      whileTap={{ scale: 0.96 }}
      whileHover={{ y: -1 }}
      onClick={onClick}
      style={{
        background: "rgba(124,184,122,0.1)",
        border: "1px solid rgba(124,184,122,0.35)",
        borderRadius: "16px",
        padding: "7px 12px",
        fontSize: "12.5px",
        color: "#9DD49B",
        cursor: "pointer",
        letterSpacing: "-0.1px",
        fontWeight: 500,
        textAlign: "left",
        lineHeight: 1.3,
      }}
    >
      {text}
    </motion.button>
  );
}

// ───────── Status bar icons ─────────

function SignalIcon() {
  return (
    <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
      {[2, 4, 6, 8].map((h, i) => (
        <rect key={i} x={i * 3.5} y={10 - h} width="2.5" height={h} fill="#fff" rx="0.5" />
      ))}
    </svg>
  );
}
function WifiIcon() {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
      <path d="M7 2.5C9.5 2.5 11.7 3.4 13 4.6L11.5 6.2C10.3 5.2 8.7 4.5 7 4.5C5.3 4.5 3.7 5.2 2.5 6.2L1 4.6C2.3 3.4 4.5 2.5 7 2.5Z" fill="#fff"/>
      <path d="M7 5.5C8.4 5.5 9.6 6 10.4 6.7L8.9 8.1C8.4 7.7 7.7 7.5 7 7.5C6.3 7.5 5.6 7.7 5.1 8.1L3.6 6.7C4.4 6 5.6 5.5 7 5.5Z" fill="#fff"/>
      <circle cx="7" cy="9" r="1" fill="#fff"/>
    </svg>
  );
}
function BatteryIcon() {
  return (
    <svg width="22" height="10" viewBox="0 0 22 10" fill="none">
      <rect x="0.5" y="0.5" width="18" height="9" rx="2" stroke="#fff" strokeOpacity="0.5"/>
      <rect x="2" y="2" width="15" height="6" rx="1" fill="#fff"/>
      <rect x="19.5" y="3" width="1.5" height="4" rx="0.5" fill="#fff" fillOpacity="0.5"/>
    </svg>
  );
}

// ───────── Helpers ─────────

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function useIsMobile(breakpoint = 900) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);
  return isMobile;
}

// ───────── Main exported section ─────────

const DEFAULT_CONFIG: Config = {
  persona: "two-parent",
  busyMine: "packed",
  busyOther: "moderate",
  kids: [{ age: "school" }],
};

export function InteractiveDemo() {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const isMobile = useIsMobile();

  return (
    <section
      id="demo"
      style={{
        padding: "clamp(64px, 10vw, 100px) clamp(16px, 4vw, 40px) 60px",
        maxWidth: "1180px",
        margin: "0 auto",
        position: "relative",
      }}
    >
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, rgba(124,184,122,0.3), transparent)",
          marginBottom: "56px",
          transformOrigin: "center",
        }}
      />

      <div style={{ textAlign: "center", marginBottom: "44px" }}>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "11.5px",
            fontWeight: 600,
            color: ACCENT,
            fontFamily: "var(--font-geist-mono), monospace",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            marginBottom: "20px",
            padding: "5px 12px",
            background: "rgba(124,184,122,0.1)",
            border: "1px solid rgba(124,184,122,0.35)",
            borderRadius: "999px",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              background: ACCENT,
              boxShadow: "0 0 8px rgba(124,184,122,0.7)",
            }}
          />
          Live demo
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontSize: "clamp(28px, 4vw, 38px)",
            fontWeight: 600,
            color: "#F0EDE6",
            letterSpacing: "-0.8px",
            lineHeight: 1.2,
            marginBottom: "16px",
            maxWidth: "640px",
            margin: "0 auto 16px",
          }}
        >
          See your real morning briefing —{" "}
          <span style={{ color: ACCENT }}>watch the phone update as you pick.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            fontSize: "15px",
            color: "rgba(240,237,230,0.72)",
            lineHeight: 1.6,
            maxWidth: "520px",
            margin: "0 auto",
          }}
        >
          Choose your household on the left. The 6am text Kin would actually send
          rewrites itself in real time on the right.
        </motion.p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.05fr) minmax(0, 0.95fr)",
          gap: isMobile ? "32px" : "48px",
          alignItems: "start",
        }}
      >
        <div>
          <ConfigPanel config={config} onChange={setConfig} />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            position: isMobile ? "relative" : "sticky",
            top: isMobile ? undefined : "88px",
          }}
        >
          <LivePhone config={config} />
        </div>
      </div>
    </section>
  );
}
