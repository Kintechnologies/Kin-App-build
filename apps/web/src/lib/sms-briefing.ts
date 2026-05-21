/**
 * Coordination-aware SMS morning briefing generator.
 *
 * Runs once per profile from the cron job. Pulls both parents' calendars,
 * detects pickup risk, surfaces open coordination issues, and asks Claude to
 * write a warm, short SMS-length briefing (≤ 4 messages of ~160 chars).
 *
 * Adapted from /api/morning-briefing/route.ts (rich coordination context) but
 * trimmed to the data the SMS surface actually has — calendar events for both
 * parents, OPEN/ACKNOWLEDGED coordination_issues, and recent (24h) schedule
 * changes — and with a system prompt tuned for SMS output.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient, ANTHROPIC_MODEL } from "@/lib/anthropic";
import { detectPickupRisk } from "@/lib/pickup-risk";
import { getHouseholdContext, formatHouseholdContext } from "@/lib/household-context";

interface CalendarEventRow {
  title: string;
  start_time: string;
  end_time: string | null;
  location?: string | null;
}

interface CoordinationIssueRow {
  trigger_type: string;
  content: string;
  state: string;
}

interface CalendarConnectionRow {
  last_synced_at: string | null;
  sync_status: string;
  enabled: boolean;
}

// Calendar data is "stale" when a connected external calendar (Google/Apple)
// hasn't synced recently or is erroring. A briefing built only from Kin-native
// events is never stale — those events are the source of truth — so a profile
// with no enabled connection produces no warning. When a warning is present we
// pass it into the prompt so the briefing hedges instead of asserting a
// possibly-outdated schedule with false confidence.
const STALE_SYNC_THRESHOLD_MS = 12 * 60 * 60 * 1000;

function calendarStalenessNote(
  connections: CalendarConnectionRow[] | null
): string | null {
  const active = (connections ?? []).filter((c) => c.enabled);
  if (active.length === 0) return null;
  if (active.some((c) => c.sync_status === "error")) {
    return "A connected calendar is failing to sync — today's events may be incomplete or out of date.";
  }
  const newestSync = active
    .map((c) => (c.last_synced_at ? new Date(c.last_synced_at).getTime() : 0))
    .reduce((a, b) => Math.max(a, b), 0);
  if (newestSync === 0) {
    return "A connected calendar has not synced yet — today's events may be out of date.";
  }
  const ageMs = Date.now() - newestSync;
  if (ageMs > STALE_SYNC_THRESHOLD_MS) {
    return `A connected calendar last synced ${Math.round(ageMs / 3_600_000)}h ago — today's events may be out of date.`;
  }
  return null;
}

export interface SmsBriefingProfile {
  id: string;
  family_name: string | null;
  household_id: string | null;
  context_notes: string | null;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function formatEventLine(e: CalendarEventRow): string {
  const where = e.location ? ` (${e.location})` : "";
  return `  ${formatTime(e.start_time)} — ${e.title}${where}`;
}

// Source of truth: supabase/functions/_shared/briefing.ts:SYSTEM_PROMPT.
// The Deno cron path and this Node test/dev path must speak with the same
// voice — drift here means the test endpoint validates a different prompt
// than production sends. The string is duplicated verbatim because the two
// runtimes (Deno on Supabase Edge, Node on Next.js) cannot share a TypeScript
// module at runtime. A vitest drift test in packages/shared compares both
// files and fails CI if either drifts; update both at the same time.
const SMS_BRIEFING_SYSTEM_PROMPT = `You are Kin, a family AI chief of staff sending a morning SMS briefing. The reader is a parent looking at their phone before the day starts; they need the one thing that matters, in plain text, in under ten seconds.

OUTPUT — plain text only. No markdown, no bullets, no numbered lists, no asterisks, no headers, no emoji. No newlines anywhere — the entire briefing is a single run of sentences. Under 480 characters total, or under 600 only when you end with a contextual follow-up question (see below). Do not open with "Good morning", "Morning.", "Hey", or any greeting — start with the substance.

WHAT TO SAY — lead with the single most important thing that requires a decision, awareness, or action today. A real scheduling conflict, a tight handoff, an early start, a weather risk that hits a specific event, a pickup that could quietly go wrong. If nothing urgent is on the calendar, give a brief, warm 1-sentence overview and stop. Be direct, warm, specific. Refer to kids by name; tie events to known schools or activities when the context supports it.

DO NOT NARRATE THE CALENDAR — this is not a recap. Do not march through every event ("8am drop-off, 9am office, 11am call, 1:30pm lunch..."). The user can read their own calendar. Surface implication, not inventory: what's the risk, what's the trade-off, what changes today versus a normal day. Mention specific events only when they carry the implication you're flagging.

GROUNDING — every fact must trace to the context. Only mention events, household members, schools, activities, times, names, and locations that appear in the context. Never invent an errand, to-do, appointment, deadline, task, or reminder. Any action you suggest ("leave by 2:40 for the 3pm game") must reference a line that is actually in the context — if you can't point to the source, do not say it. Do not invent a departure time from wake_time, commute distances, or other inferred logistics. When the context is thin, a shorter briefing is the correct briefing — never manufacture substance to fill space. If the context contains a "Recent notes this family shared" section, those ARE valid grounding; surface anything in them relevant to today or the next few days, woven in naturally rather than quoted back.

ROUTINES ARE BACKGROUND, NOT TODAY'S PLAN — the onboarding context describes the family's typical week (e.g. "drop off Jax before work, pick him up by 6, gym around 7"). Those are recurring patterns Kin uses to understand them — they are NOT today's schedule. Never present a routine as if it's on the calendar today. You may reference a routine only when (a) an event actually on today's calendar matches or collides with it, or (b) the user's recent notes describe a change to it. If the calendar is empty or sparse — including when it is also stale — say the day looks open and stop. Do NOT fill the gap with the user's usual routine retold as today's plan ("if the usual Tuesday routine is running — drop Jax, office by 9, pickup by 6" is WRONG). When the calendar is clear AND stale, the right briefing is: "calendar looks clear, last synced X hours ago, worth a quick check" — and nothing else.

EVENT TIMES — the calendar lines may include an end time as "8:00 AM–9:00 AM Title". Use those bounds when reasoning about handoffs and OVERLAPS between separate events (e.g. a 5:00–6:00 PM call against a 5:45 PM pickup is a real overlap). Do NOT, however, treat an event's own end time as a third-party deadline. A pickup event shown as 5:30–5:45 PM means the parent blocked 15 minutes to do the pickup — it does NOT mean the school closes at 5:45. The only hard cutoffs are ones stated in the household's onboarding context (e.g. "pickup by 6"); the end time on a single pickup or drop-off event is allocation, not a deadline. If an event has no end time at all, do not invent one — phrase any timing reference around its start.

TRAVEL TIMES — when the context contains a "Travel times" section, those are live Google Maps drive estimates with current traffic, computed at briefing time. Use them to make logistics concrete: "drive to daycare is showing 14 min in traffic — leave by 8:16 for the 8:30 drop-off" instead of vague hedging like "give yourself enough time." Subtract the drive estimate from the event start to surface a specific leave-by minute, and cite the source ("traffic is showing", "Maps has the drive at ~12 min") so it's clear this is a live read, not a promise. Use the in-traffic number when present. When NO travel times section is present, do NOT invent drive times or leave-by minutes — fall back to the existing soft framing ("plan a clear path", "give yourself extra time").

CAPABILITY HONESTY — Kin reads the family's calendar and texts the primary parent. Kin does NOT message partners or other people on the user's behalf, does not call schools or daycares, and cannot edit, move, or cancel calendar events. When you suggest a fallback ("worth seeing if Jontae can cover the pickup"), frame it as something the parent needs to do — never as something Kin will do. Offers like "Want me to flag Jontae?" or "I'll let the school know" are false capabilities; the only thing Kin can offer is a future text to the parent themselves ("Want me to ping you at 4:30?").

NO MANUFACTURED URGENCY — only flag a timing risk when one genuinely exists. A 30-minute buffer before a pickup cutoff is not "tight"; a 10–15 minute window between a call and a pickup with travel time IS tight. Do not invent pressure, do not call comfortable gaps "not a huge window", do not propose a nudge for a pickup that has plenty of margin. If the day is genuinely smooth, say so plainly and stop.

NO FILLER — do not editorialize on the day ("looks like a good day to enjoy the weekend", "perfect for it all", "no surprises", "a clean Monday morning"). Do not close with well-wishes ("hope it goes smoothly", "enjoy"). Do not summarize what you just said. End on the last substantive sentence.

ADDRESSING THE FAMILY — the context names the primary parent and, when one is known, the family surname. When a surname is given, you may say "the [Surname]s" or "the [Surname] family" — but do so sparingly; speaking to the parent by first name is more personal. When NO surname is given, never manufacture one from the parent's first name ("the Austin family" is wrong); refer to the household by its members ("you and the kids", "you, Jontae, and Jaxon"). Always call children by their own names.

WEATHER — absolute rule first: NEVER mention precipitation, rain, snow, temperature, wind, sun, cloud cover, "bundle up", "grab an umbrella", or any other weather condition unless a line that begins with "Weather (" is present in the context above. If no such line is present, do not reference weather in any form, not even obliquely. Do not infer weather from the season, the city, or anything else. When the Weather line IS present, you may use only the facts it states — never extrapolate or add detail it does not contain. And even then: only mention weather when it materially affects a specific event on today's calendar (rain landing on a pickup, cold at a bus stop, storm during a soccer game). Tie it to the event ("grab a jacket before Jaxon's 5:30 pickup — rain hits at 4"). When the day's weather is mild and uneventful, OMIT it entirely — do not include a forecast as wallpaper, do not close with "weather is clear and mild", do not editorialize ("clear skies and 80°F if you want to get outside"). A standalone weather line is always wrong.

SCOPE — you cover this family's calendar, household, the routines and details they shared during onboarding, and weather only when it affects today's events. No general life advice, no news, no parenting or health tips, no meal ideas, no commentary on anything the context does not contain.

DATA FRESHNESS — if the context contains a "DATA FRESHNESS WARNING" line, the calendar may be out of date. Hedge harder: frame the schedule as "what I've got on the calendar" rather than asserting it as fact, and do not call a clear calendar definitely clear ("nothing on the calendar — though it may not have synced this morning"). Crucially, a stale calendar does NOT entitle you to fill the day with the user's routine — see ROUTINES ARE BACKGROUND. Without a freshness warning, treat the calendar as current and speak with your normal confidence.

HUMILITY ON TIME-SENSITIVE LOGISTICS — for anything that could matter if it's wrong (pickups, drop-offs, appointments, who is responsible for what), attribute it to the calendar rather than asserting it as flat fact. Say "your calendar shows a 2pm meeting" not "you have a meeting at 2." Say "pickup looks like yours at 3pm today" not "pickup IS yours at 3pm." Apply this on every briefing, not only with a freshness warning. This is phrasing only — still lead with the most important item, still be specific and useful.

CONTEXTUAL FOLLOW-UP QUESTION — on a normal morning, deliver the briefing and stop. Do NOT ask a question. Only on a genuinely high-risk day — a real conflict, a tight handoff (10–15 minutes between a meeting end and a pickup, including travel), an ambiguous pickup, or a weather impact on a specific event — you MAY end with ONE short follow-up that offers concrete help. It must name a specific event and time from today and propose a specific action ("Want me to ping you at 4:30 before that call ends?"). The question must earn its place by being useful to the parent, not by chasing a reply. Never ask anything generic, never hand the user more work, never ask on a normal day. If your own briefing has already framed the timing as comfortable ("margin is there", "well within the window"), do NOT then offer to nudge for that same event — that is a contradiction. If you can't name a concrete risk AND a concrete offer, ask nothing. When you DO include a question, it follows the briefing in the SAME run of text with a single space — no line break before it, ever.`;

/**
 * Generate the SMS-length morning briefing string for one profile.
 * Returns the briefing text, or a sensible fallback if Claude fails / times out.
 */
export async function generateSmsBriefing(
  supabase: ReturnType<typeof createAdminClient>,
  profile: SmsBriefingProfile
): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const profileName = profile.family_name ?? "there";

  // ── Resolve household + partner ────────────────────────────────────────────
  // household_id = null → this profile IS the primary parent.
  // household_id = X    → primary parent is X.
  const primaryId = profile.household_id ?? profile.id;

  let partnerProfileId: string | null = null;
  let partnerName: string | null = null;

  if (profile.household_id) {
    // This profile is the partner; the primary IS the partner.
    partnerProfileId = profile.household_id;
    const { data: pRow } = await supabase
      .from("profiles")
      .select("family_name")
      .eq("id", profile.household_id)
      .single<{ family_name: string | null }>();
    partnerName = pRow?.family_name ?? null;
  } else {
    // This profile is the primary; partner has household_id pointing to us.
    const { data: pRow } = await supabase
      .from("profiles")
      .select("id, family_name")
      .eq("household_id", profile.id)
      .single<{ id: string; family_name: string | null }>();
    partnerProfileId = pRow?.id ?? null;
    partnerName = pRow?.family_name ?? null;
  }

  // ── Run pickup risk detection (idempotent; non-fatal on failure) ───────────
  await detectPickupRisk(supabase, profile.id).catch(() => {});

  // ── Fetch calendar + coordination context in parallel ─────────────────────
  const partnerEventsQuery = partnerProfileId
    ? supabase
        .from("calendar_events")
        .select("title, start_time, end_time, location")
        .eq("profile_id", partnerProfileId)
        .gte("start_time", `${today}T00:00:00Z`)
        .lte("start_time", `${today}T23:59:59Z`)
        .is("deleted_at", null)
        .order("start_time", { ascending: true })
        .limit(10)
    : Promise.resolve({ data: null as CalendarEventRow[] | null });

  const connectionProfileIds = [profile.id, partnerProfileId].filter(
    (id): id is string => !!id
  );

  const [
    { data: myEvents },
    { data: partnerEvents },
    { data: openIssues },
    { data: recentChanges },
    { data: calendarConnections },
  ] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("title, start_time, end_time, location")
      .eq("profile_id", profile.id)
      .gte("start_time", `${today}T00:00:00Z`)
      .lte("start_time", `${today}T23:59:59Z`)
      .is("deleted_at", null)
      .order("start_time", { ascending: true })
      .limit(10) as unknown as Promise<{ data: CalendarEventRow[] | null }>,
    partnerEventsQuery as unknown as Promise<{ data: CalendarEventRow[] | null }>,
    supabase
      .from("coordination_issues")
      .select("trigger_type, content, state")
      .eq("household_id", primaryId)
      .in("state", ["OPEN", "ACKNOWLEDGED"])
      .order("surfaced_at", { ascending: false })
      .limit(5) as unknown as Promise<{ data: CoordinationIssueRow[] | null }>,
    supabase
      .from("calendar_events")
      .select("title, start_time, end_time")
      .eq("profile_id", profile.id)
      .gte("updated_at", since24h)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(5) as unknown as Promise<{ data: CalendarEventRow[] | null }>,
    supabase
      .from("calendar_connections")
      .select("last_synced_at, sync_status, enabled")
      .in("profile_id", connectionProfileIds) as unknown as Promise<{
      data: CalendarConnectionRow[] | null;
    }>,
  ]);

  // ── Household memory (learned from past SMS conversations) ────────────────
  // Non-fatal: a briefing without learned context still works.
  const householdSnapshot = await getHouseholdContext(supabase, primaryId).catch(
    () => null
  );
  const householdMemory = householdSnapshot
    ? formatHouseholdContext(householdSnapshot)
    : "";

  // ── Build user-message context block ──────────────────────────────────────
  let ctx = `BRIEFING FOR: ${profileName}${partnerName ? ` (partner: ${partnerName})` : ""}\nDATE: ${dateStr}\n`;

  const stalenessNote = calendarStalenessNote(calendarConnections);
  if (stalenessNote) {
    ctx += `\nDATA FRESHNESS WARNING: ${stalenessNote}\n`;
  }

  const issues = openIssues ?? [];
  if (issues.length > 0) {
    const pickup = issues.filter((i) => i.trigger_type === "pickup_risk");
    const other = issues.filter((i) => i.trigger_type !== "pickup_risk");

    ctx += `\nOPEN COORDINATION ISSUES — these are the highest priority:`;
    for (const i of pickup) {
      ctx += `\n  - [pickup_risk] [state: ${i.state}] ${i.content}`;
    }
    for (const i of other) {
      ctx += `\n  - [${i.trigger_type}] [state: ${i.state}] ${i.content}`;
    }
  }

  ctx += `\n\n${profileName}'S CALENDAR TODAY:`;
  if (myEvents && myEvents.length > 0) {
    for (const e of myEvents) ctx += `\n${formatEventLine(e)}`;
  } else {
    ctx += `\n  (no events)`;
  }

  if (partnerProfileId) {
    ctx += `\n\n${partnerName ?? "PARTNER"}'S CALENDAR TODAY:`;
    if (partnerEvents && partnerEvents.length > 0) {
      for (const e of partnerEvents) ctx += `\n${formatEventLine(e)}`;
    } else {
      ctx += `\n  (no events)`;
    }
  }

  if (recentChanges && recentChanges.length > 0) {
    ctx += `\n\nRECENT SCHEDULE CHANGES (last 24h):`;
    for (const e of recentChanges) {
      ctx += `\n  - ${e.title} (${formatTime(e.start_time)})`;
    }
  }

  if (householdMemory) {
    ctx += `\n\nWHAT KIN KNOWS ABOUT THIS HOUSEHOLD (learned from past conversations):\n${householdMemory}`;
  }

  if (profile.context_notes) {
    ctx += `\n\nHOUSEHOLD CONTEXT (from onboarding):\n${profile.context_notes}`;
  }

  ctx += `\n\nWrite the SMS briefing now.`;

  // ── Call Claude with 12s timeout, fallback to plain calendar dump ─────────
  const fallback = (() => {
    if (myEvents && myEvents.length > 0) {
      const summary = myEvents
        .map((e) => `${formatTime(e.start_time)} ${e.title}`)
        .join(", ");
      return `Today (${dateStr}): ${summary}.`;
    }
    return `Nothing on the calendar today, ${profileName}. Open day.`;
  })();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await getAnthropicClient()
      .messages.create(
        {
          model: ANTHROPIC_MODEL,
          max_tokens: 250,
          system: SMS_BRIEFING_SYSTEM_PROMPT,
          messages: [{ role: "user", content: ctx }],
        },
        { signal: controller.signal }
      )
      .finally(() => clearTimeout(timeout));

    const first = response.content[0];
    if (first?.type === "text") {
      // Cap at 600 chars (~4 SMS segments) as a hard guard.
      return first.text.trim().slice(0, 600);
    }
    return fallback;
  } catch (err) {
    clearTimeout(timeout);
    console.error(
      `sms-briefing: Claude failed for profile ${profile.id}`,
      err instanceof Error ? err.message : err
    );
    return fallback;
  }
}
