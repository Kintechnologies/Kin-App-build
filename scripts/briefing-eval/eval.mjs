// Local harness: exercises the PRODUCTION morning-briefing system prompt
// (supabase/functions/_shared/briefing.ts) against synthetic context fixtures
// so we can iterate on prompt wording without touching Twilio, the database,
// or live cron infrastructure.
//
// Run:
//   node scripts/briefing-eval/eval.mjs            # all scenarios
//   node scripts/briefing-eval/eval.mjs packed     # one scenario by id
//   node scripts/briefing-eval/eval.mjs --reps 3   # multiple samples
//
// Env: ANTHROPIC_API_KEY (loaded from apps/web/.env.local if not set)

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const BRIEFING_TS = path.join(
  REPO_ROOT,
  "supabase/functions/_shared/briefing.ts"
);

// ── env loading ─────────────────────────────────────────────────────────────
function loadDotenv(p) {
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}
loadDotenv(path.join(REPO_ROOT, "../.env.local")); // monorepo root
loadDotenv(path.join(REPO_ROOT, "apps/web/.env.local"));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error("Missing ANTHROPIC_API_KEY");
  process.exit(1);
}

// ── pull SYSTEM_PROMPT from the production source ───────────────────────────
// The prompt is a single template literal assigned to SYSTEM_PROMPT. We
// extract it verbatim so we never drift between this harness and the live
// edge function.
function loadSystemPrompt() {
  const src = fs.readFileSync(BRIEFING_TS, "utf8");
  const m = src.match(/const SYSTEM_PROMPT = `([\s\S]*?)`;/);
  if (!m) throw new Error("Could not find SYSTEM_PROMPT in briefing.ts");
  return m[1];
}
const SYSTEM_PROMPT = loadSystemPrompt();

// ── Anthropic call (same params as production: claude-sonnet-4-6, 200 tok) ──
async function callAnthropic(systemPrompt, userContext) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 200,
      system: systemPrompt,
      messages: [{ role: "user", content: userContext }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.content?.[0]?.type === "text" ? data.content[0].text : "";
}

// ── scenario fixtures ────────────────────────────────────────────────────────
// Each scenario describes what the production buildBriefingContext WOULD
// produce as the user-message payload. The shape mirrors what briefing.ts
// concatenates: parent + surname + date + freshness + events + members +
// onboarding notes + live notes + weather.

const AUSTIN_BASE = {
  parentFirstName: "Austin",
  surname: "Ford",
  contextNotes: `kids: Jaxon (2)
schools: Balanced family academy in harrison west
wake_time: Normally I try to wake up at 6 am on the weekdays
home_location: 43222
partner: none / solo
recurring_commitments: I have to be at the office by 9 am. 35 n. 4th st. Columbus oh. And I have to drop off jax before I get to work and I have to pick him up by 6. Also gym around 7 after dropping him off at home for dinner. Jontae works from home`,
  household: [
    { name: "Jaxon", descriptor: "child, age 2" },
    { name: "Jontae", descriptor: "partner" },
  ],
};

function renderContext({
  parentFirstName,
  surname,
  dateLabel,
  freshnessNote,
  events,
  household,
  contextNotes,
  liveNotes,
  weather,
}) {
  let ctx = "";
  if (parentFirstName)
    ctx += `Primary parent (the person reading this briefing): ${parentFirstName}\n`;
  if (surname) ctx += `Family surname: ${surname}\n`;
  else
    ctx +=
      "Family surname: not on file — address the household by its members, not a made-up family name\n";
  ctx += `Date: ${dateLabel}\n\n`;
  if (freshnessNote) ctx += `DATA FRESHNESS WARNING: ${freshnessNote}\n\n`;
  if (events && events.length > 0) {
    ctx += "Today's calendar:\n";
    for (const e of events) {
      const when = e.endTime ? `${e.time}–${e.endTime}` : e.time;
      ctx += `  ${when} ${e.title}${e.location ? ` @ ${e.location}` : ""}\n`;
    }
  } else {
    ctx += "Today's calendar: clear\n";
  }
  if (household && household.length > 0) {
    ctx += "\nHousehold members:\n";
    for (const m of household) ctx += `  ${m.name} (${m.descriptor})\n`;
  }
  if (contextNotes && contextNotes.trim()) {
    ctx +=
      "\nWhat Kin learned about this family during onboarding " +
      "(kids' schools, activities, weekly routines, wake time, special needs):\n" +
      `${contextNotes.trim()}\n`;
  }
  if (liveNotes && liveNotes.length > 0) {
    ctx +=
      "\nRecent notes this family shared directly with Kin (e.g. their reply to " +
      "Kin's Sunday check-in about the week ahead):\n";
    for (const n of liveNotes) ctx += `  ${n}\n`;
  }
  if (weather) ctx += `\n${weather}\n`;
  return ctx;
}

const SCENARIOS = [
  {
    id: "packed",
    title: "Packed weekday — work + Jax routine + tight evening",
    build: () =>
      renderContext({
        ...AUSTIN_BASE,
        dateLabel: "Wednesday, May 20",
        events: [
          { time: "8:00 AM", endTime: "8:30 AM", title: "Drop Jaxon at Balanced Family Academy", location: "Harrison West" },
          { time: "9:00 AM", endTime: "9:30 AM", title: "All-hands standup", location: "35 N 4th St" },
          { time: "11:00 AM", endTime: "11:30 AM", title: "Investor call — pre-seed update" },
          { time: "1:30 PM", endTime: "2:30 PM", title: "Lunch w/ Maya (designer candidate)", location: "Fox in the Snow" },
          { time: "3:30 PM", endTime: "4:00 PM", title: "Eng 1:1 — Priya" },
          { time: "5:30 PM", endTime: "5:45 PM", title: "Pickup Jaxon @ Balanced Family Academy", location: "Harrison West" },
          { time: "7:00 PM", endTime: "8:00 PM", title: "Gym — Lifetime", location: "Easton" },
        ],
        weather:
          "Weather (43222): currently 64°F partly cloudy, high 76°F / low 58°F. Precipitation expected — rain 5pm–9pm.",
      }),
  },
  {
    id: "empty-weekend",
    title: "Saturday — no events, mild weather",
    build: () =>
      renderContext({
        ...AUSTIN_BASE,
        dateLabel: "Saturday, May 23",
        events: [],
        weather: "Weather (43222): currently 71°F clear skies, high 80°F / low 59°F.",
      }),
  },
  {
    id: "stale-calendar",
    title: "Calendar last synced 18h ago",
    build: () =>
      renderContext({
        ...AUSTIN_BASE,
        dateLabel: "Thursday, May 21",
        freshnessNote:
          "A connected calendar last synced 18h ago — today's events may be out of date.",
        events: [
          { time: "8:00 AM", endTime: "8:30 AM", title: "Drop Jaxon", location: "Balanced Family Academy" },
          { time: "9:30 AM", endTime: "10:30 AM", title: "Team review" },
          { time: "5:30 PM", endTime: "5:45 PM", title: "Pickup Jaxon", location: "Balanced Family Academy" },
        ],
        weather: "Weather (43222): currently 58°F overcast, high 67°F / low 52°F.",
      }),
  },
  {
    id: "calendar-clear-but-stale",
    title: "Looks clear but calendar may be stale",
    build: () =>
      renderContext({
        ...AUSTIN_BASE,
        dateLabel: "Tuesday, May 19",
        freshnessNote:
          "A connected calendar last synced 26h ago — today's events may be out of date.",
        events: [],
      }),
  },
  {
    id: "tight-pickup",
    title: "Late meeting threatens Jax 6pm pickup",
    build: () =>
      renderContext({
        ...AUSTIN_BASE,
        dateLabel: "Monday, May 18",
        events: [
          { time: "8:00 AM", endTime: "8:30 AM", title: "Drop Jaxon", location: "Balanced Family Academy" },
          { time: "9:00 AM", endTime: "5:00 PM", title: "Office", location: "35 N 4th St" },
          { time: "2:00 PM", endTime: "3:00 PM", title: "Board prep" },
          { time: "5:00 PM", endTime: "6:00 PM", title: "Investor call — Sequoia partner sync" },
          { time: "5:45 PM", endTime: "6:00 PM", title: "Pickup Jaxon", location: "Balanced Family Academy" },
        ],
        weather: "Weather (43222): currently 72°F clear skies, high 78°F / low 60°F.",
      }),
  },
  {
    id: "rain-on-pickup",
    title: "Outdoor pickup, rain incoming",
    build: () =>
      renderContext({
        ...AUSTIN_BASE,
        dateLabel: "Friday, May 22",
        events: [
          { time: "8:00 AM", endTime: "8:30 AM", title: "Drop Jaxon", location: "Balanced Family Academy" },
          { time: "9:00 AM", endTime: "4:00 PM", title: "Quarterly planning offsite", location: "Land-Grant" },
          { time: "5:30 PM", endTime: "5:45 PM", title: "Pickup Jaxon", location: "Balanced Family Academy" },
        ],
        weather:
          "Weather (43222): currently 66°F cloudy, high 70°F / low 58°F. Precipitation expected — rain 4pm–8pm.",
      }),
  },
  {
    id: "no-surname",
    title: "Family with no surname on file",
    build: () => {
      const base = { ...AUSTIN_BASE, surname: null };
      return renderContext({
        ...base,
        dateLabel: "Wednesday, May 20",
        events: [
          { time: "8:00 AM", endTime: "8:30 AM", title: "Drop Jaxon", location: "Balanced Family Academy" },
          { time: "5:30 PM", endTime: "5:45 PM", title: "Pickup Jaxon", location: "Balanced Family Academy" },
        ],
        weather: "Weather (43222): 70°F clear, high 78°F / low 56°F.",
      });
    },
  },
  {
    id: "sunday-checkin-reply",
    title: "User has shared a Sunday check-in plan for the week",
    build: () =>
      renderContext({
        ...AUSTIN_BASE,
        dateLabel: "Monday, May 18",
        events: [
          { time: "8:00 AM", endTime: "8:30 AM", title: "Drop Jaxon", location: "Balanced Family Academy" },
          { time: "9:00 AM", endTime: "5:00 PM", title: "Office", location: "35 N 4th St" },
          { time: "5:30 PM", endTime: "5:45 PM", title: "Pickup Jaxon", location: "Balanced Family Academy" },
        ],
        liveNotes: [
          "Jontae has a doctor's appointment Wednesday morning — I'll be on solo duty for the drop-off that day.",
          "Trying to hit the gym Tue/Thu this week.",
        ],
        weather: "Weather (43222): 72°F clear, high 80°F / low 58°F.",
      }),
  },
  {
    id: "private-event",
    title: "Calendar contains a private/confidential event",
    build: () =>
      renderContext({
        ...AUSTIN_BASE,
        dateLabel: "Wednesday, May 20",
        events: [
          { time: "8:00 AM", endTime: "8:30 AM", title: "Drop Jaxon", location: "Balanced Family Academy" },
          { time: "10:00 AM", endTime: "11:30 AM", title: "Private event" },
          { time: "5:30 PM", endTime: "5:45 PM", title: "Pickup Jaxon", location: "Balanced Family Academy" },
        ],
        weather: "Weather (43222): 68°F clear, high 74°F / low 56°F.",
      }),
  },
  // ── Edge cases added for v4+ ────────────────────────────────────────────
  {
    id: "new-user-thin-context",
    title: "Brand new user — minimal onboarding context",
    build: () =>
      renderContext({
        parentFirstName: "Sam",
        surname: null,
        dateLabel: "Tuesday, May 19",
        events: [
          { time: "9:00 AM", endTime: "10:00 AM", title: "Team standup" },
          { time: "3:00 PM", endTime: "3:30 PM", title: "1:1 with Jordan" },
        ],
        household: [],
        contextNotes: null,
      }),
  },
  {
    id: "back-to-back-conflict",
    title: "Two overlapping meetings on the calendar",
    build: () =>
      renderContext({
        ...AUSTIN_BASE,
        dateLabel: "Thursday, May 21",
        events: [
          { time: "8:00 AM", endTime: "8:30 AM", title: "Drop Jaxon", location: "Balanced Family Academy" },
          { time: "10:00 AM", endTime: "11:00 AM", title: "Investor sync — Lightspeed" },
          { time: "10:30 AM", endTime: "11:30 AM", title: "Pricing review" },
          { time: "5:30 PM", endTime: "5:45 PM", title: "Pickup Jaxon", location: "Balanced Family Academy" },
        ],
      }),
  },
  {
    id: "early-start",
    title: "Unusually early 6:30am meeting",
    build: () =>
      renderContext({
        ...AUSTIN_BASE,
        dateLabel: "Wednesday, May 20",
        events: [
          { time: "6:30 AM", endTime: "7:30 AM", title: "Call with London team" },
          { time: "8:00 AM", endTime: "8:30 AM", title: "Drop Jaxon", location: "Balanced Family Academy" },
          { time: "9:00 AM", endTime: "5:00 PM", title: "Office", location: "35 N 4th St" },
          { time: "5:30 PM", endTime: "5:45 PM", title: "Pickup Jaxon", location: "Balanced Family Academy" },
        ],
      }),
  },
];

// ── runner ──────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  let reps = 1;
  let filter = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--reps") reps = parseInt(args[++i], 10) || 1;
    else if (args[i].startsWith("--")) continue;
    else filter = args[i];
  }

  const scenarios = filter ? SCENARIOS.filter((s) => s.id === filter) : SCENARIOS;
  if (scenarios.length === 0) {
    console.error(`Unknown scenario id: ${filter}`);
    console.error("Available:", SCENARIOS.map((s) => s.id).join(", "));
    process.exit(1);
  }

  const out = [];
  out.push(`# Briefing eval — ${new Date().toISOString()}`);
  out.push("");
  out.push(`SYSTEM_PROMPT length: ${SYSTEM_PROMPT.length} chars`);
  out.push("");

  for (const s of scenarios) {
    const userCtx = s.build();
    out.push(`## ${s.id} — ${s.title}`);
    out.push("");
    out.push("### Context");
    out.push("```");
    out.push(userCtx);
    out.push("```");
    out.push("");
    for (let r = 0; r < reps; r++) {
      const start = Date.now();
      let text;
      try {
        text = (await callAnthropic(SYSTEM_PROMPT, userCtx)).trim();
      } catch (err) {
        text = `[ERROR] ${err.message}`;
      }
      const ms = Date.now() - start;
      out.push(`### Output (rep ${r + 1}, ${text.length} chars, ${ms}ms)`);
      out.push("```");
      out.push(text);
      out.push("```");
      out.push("");
    }
  }

  const md = out.join("\n");
  process.stdout.write(md);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
