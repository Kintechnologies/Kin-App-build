// Shared briefing logic for the morning-briefing dispatcher and the
// briefing-audit backstop. Both edge functions import from here so retry,
// graceful degradation, and Slack alerting behave identically across the
// primary 6am send and the 9am-CT audit re-send.
//
// Required edge function secrets:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY,
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_SERVICE_SID,
//   TWILIO_PHONE_NUMBER
// Optional:
//   OPENWEATHER_API_KEY — weather enrichment; absent keys degrade silently.
//   SLACK_WEBHOOK_URL    — reliability alerts; falls back to ADMIN_PHONE SMS.
//   ADMIN_PHONE          — Austin's number; alert fallback when Slack is unset.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY")!;
const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const twilioMessagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID")!;
const twilioFromNumber = Deno.env.get("TWILIO_PHONE_NUMBER")!;
// Optional — weather enrichment is skipped entirely when this is unset.
const openWeatherApiKey = Deno.env.get("OPENWEATHER_API_KEY");
// Optional — reliability alerting. See notifySlack.
const slackWebhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");
const adminPhone = Deno.env.get("ADMIN_PHONE");

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// Timezone helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getLocalHour(timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const h = parts.find((p) => p.type === "hour")?.value ?? "0";
  return parseInt(h, 10) % 24;
}

// The user's local calendar date (YYYY-MM-DD), used as the dedup key. "Today"
// for dedup must mean the user's today, not UTC's: a test send at 9:30pm EDT is
// already the next UTC day, so a UTC key would let that send eat the user's
// real morning slot. en-CA formats as YYYY-MM-DD.
export function getLocalDate(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Pulls a single "label: value" line out of profiles.context_notes — the
// newline-delimited blob of answers SMS onboarding accumulates (see
// sms-onboarding.ts appendNote). Returns null when the note is absent. Used to
// recover the home location for weather now that parent_schedules is dropped.
function getContextNote(notes: string | null, key: string): string | null {
  if (!notes) return null;
  for (const line of notes.split("\n")) {
    const idx = line.indexOf(": ");
    if (idx === -1) continue;
    if (line.slice(0, idx).trim() === key) {
      const value = line.slice(idx + 2).trim();
      return value.length > 0 ? value : null;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Twilio send — with retry
// ─────────────────────────────────────────────────────────────────────────────

// Sent through the A2P 10DLC Messaging Service rather than a bare From number,
// so carrier delivery is tied to the registered A2P campaign. Sending from an
// unregistered long code fails US carrier filtering with error 30034.
async function sendSmsOnce(to: string, body: string): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: to,
      MessagingServiceSid: twilioMessagingServiceSid,
      Body: body,
    }).toString(),
  });
  if (!res.ok) {
    const err = await res.text();
    const e = new Error(`Twilio ${res.status}: ${err}`) as Error & { status?: number };
    e.status = res.status;
    throw e;
  }
}

// A transient failure can succeed on retry; a permanent one (e.g. 21211
// invalid number) never will, so we fail fast rather than burn three attempts.
function isRetryable(status?: number): boolean {
  if (status === undefined) return true; // network / fetch error
  return status === 429 || status >= 500;
}

// 3 attempts, exponential backoff (1s, 2s). Throws the last error only after
// all attempts are exhausted.
export async function sendSmsWithRetry(to: string, body: string): Promise<void> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await sendSmsOnce(to, body);
      return;
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number })?.status;
      if (!isRetryable(status) || attempt === 3) break;
      await sleep(1000 * 2 ** (attempt - 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export async function logSms(
  profileId: string | null,
  direction: "outbound" | "outbound_failed",
  body: string,
  toNumber: string
): Promise<void> {
  await supabase.from("sms_conversations").insert({
    profile_id: profileId,
    direction,
    body,
    from_number: twilioFromNumber,
    to_number: toNumber,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Slack alerting
// ─────────────────────────────────────────────────────────────────────────────

export type Severity = "info" | "warning" | "critical";

// Posts a reliability alert to SLACK_WEBHOOK_URL. If the webhook isn't
// configured yet, falls back to texting ADMIN_PHONE so an alert is never
// silently lost. Never throws — alerting must not be able to break a briefing.
export async function notifySlack(
  message: string,
  severity: Severity = "info"
): Promise<void> {
  const emoji =
    severity === "critical" ? "🔴" : severity === "warning" ? "🟠" : "🔵";
  const text = `${emoji} [briefing/${severity}] ${message}`;

  if (slackWebhookUrl) {
    try {
      const res = await fetch(slackWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) return;
      console.error(`notifySlack: webhook returned ${res.status}`);
    } catch (err) {
      console.error("notifySlack: webhook post failed", err);
    }
  }

  if (adminPhone) {
    try {
      await sendSmsOnce(adminPhone, text.slice(0, 600));
      return;
    } catch (err) {
      console.error("notifySlack: admin SMS fallback failed", err);
    }
  }

  console.error("notifySlack: no delivery channel — alert dropped:", text);
}

// ─────────────────────────────────────────────────────────────────────────────
// Weather enrichment (optional)
// ─────────────────────────────────────────────────────────────────────────────

// Returns a one-line summary for the briefing context, or null on any failure
// — missing key, missing location, API error, or a timezone with no forecast
// blocks today. Never throws: a weather problem must never break a briefing.
async function fetchWeather(
  location: string | null,
  timezone: string
): Promise<string | null> {
  if (!openWeatherApiKey || !location) return null;
  try {
    const url =
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location)}` +
      `&appid=${openWeatherApiKey}&units=imperial`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const list: any[] = Array.isArray(data.list) ? data.list : [];
    if (list.length === 0) return null;

    const dayKey = (d: Date) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(d);
    const hourLabel = (d: Date) =>
      new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric" }).format(d);

    const today = dayKey(new Date());
    const blocks = list.filter((b) => dayKey(new Date(b.dt * 1000)) === today);
    if (blocks.length === 0) return null;

    const temps = blocks
      .map((b) => b.main?.temp)
      .filter((t): t is number => typeof t === "number");
    if (temps.length === 0) return null;

    const high = Math.round(
      Math.max(...blocks.map((b) => b.main?.temp_max ?? b.main?.temp ?? -Infinity))
    );
    const low = Math.round(
      Math.min(...blocks.map((b) => b.main?.temp_min ?? b.main?.temp ?? Infinity))
    );

    const first = blocks[0];
    const currentTemp = Math.round(first.main?.temp ?? temps[0]);
    const currentDesc: string = first.weather?.[0]?.description ?? "clear skies";

    const wet = (b: any) => (b.pop ?? 0) >= 0.3;
    const windows: string[] = [];
    let runStart: any = null;
    let runEnd: any = null;
    let runKind = "rain";
    const flush = () => {
      if (runStart && runEnd) {
        const start = hourLabel(new Date(runStart.dt * 1000));
        const end = hourLabel(new Date((runEnd.dt + 3 * 3600) * 1000));
        windows.push(`${runKind} ${start}–${end}`);
      }
      runStart = null;
      runEnd = null;
    };
    for (const b of blocks) {
      if (wet(b)) {
        if (!runStart) {
          runStart = b;
          runKind = (b.weather?.[0]?.main ?? "Rain").toLowerCase();
        }
        runEnd = b;
      } else {
        flush();
      }
    }
    flush();

    let summary =
      `Weather (${location}): currently ${currentTemp}°F ${currentDesc}, ` +
      `high ${high}°F / low ${low}°F.`;
    if (windows.length > 0) {
      summary += ` Precipitation expected — ${windows.join(", ")}.`;
    }
    return summary;
  } catch (err) {
    console.error("Weather fetch failed:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Briefing generation
// ─────────────────────────────────────────────────────────────────────────────

// The trial payment nudge. Appended verbatim so the LLM's message stays
// focused on the day's substance and the ask is phrased exactly as intended.
const PAYMENT_NUDGE =
  "To keep your daily briefings going, set up your payment here: https://kinai.family/dashboard. " +
  "You can also add other family members or caregivers from there.";

// Calendar data is "stale" when a connected external calendar (Google/Apple)
// hasn't synced recently or is erroring. A briefing built only from Kin-native
// events is never stale — those events are the source of truth — so a profile
// with no enabled connection produces no warning. When a warning is present we
// pass it into the prompt so the briefing hedges instead of asserting a
// possibly-outdated schedule with false confidence.
const STALE_SYNC_THRESHOLD_MS = 12 * 60 * 60 * 1000;

interface CalendarConnectionRow {
  last_synced_at: string | null;
  sync_status: string;
  enabled: boolean;
}

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

const SYSTEM_PROMPT = `You are Kin, a family AI chief of staff sending a morning SMS briefing. Output plain text only — no bullet points, no markdown, no newlines. The entire message must be under 480 characters — or under 600 if (and only if) you end with a contextual follow-up question, see below. Lead with the single most important thing that requires a decision or action today. If nothing is urgent, give a warm 1-sentence schedule overview. Be direct, warm, and specific. You are given this family's household members and everything Kin learned about them during onboarding — kids' names and ages, schools, activities, weekly routines, wake time, special needs. Use it so the briefing feels like you know them: refer to kids by name, tie a calendar event to a known school or activity, and flag it when today's schedule collides with one of their routines. Never invent a detail that isn't in the context, and never read the context back as a list. Do not start with "Good morning" or "Morning." — just the substance. If a weather line is present in the context, weave it in naturally only when it actually affects the day — tie it to a specific event rather than reporting it ("grab umbrellas before the 3pm soccer game", "it'll be 40°F at the bus stop, bundle the kids up"). Omit weather entirely when it is mild and uneventful; never include a standalone forecast.

ADDRESSING THE FAMILY — the context names the primary parent (the person reading this) and, when one is known, the family surname. When a surname is given, you may refer to the household as "the [Surname]s" or "the [Surname] family". When NO surname is given, never manufacture a family name from the parent's first name — writing "the [first name] family" (e.g. "the Austin family") is wrong and impersonal. Instead, speak to the parent directly by their first name and refer to the household by its actual members: "you and the kids", "you, Jontae, and Jaxon", "your family". Always call children by their own names. The briefing should sound like you know this household, not like you are reading a name field.

GROUNDING — every fact must trace to the context. Only mention events, household members, schools, activities, times, names, and locations that appear in the context below. Never invent an errand, to-do, appointment, deadline, task, or reminder. Any action you suggest ("leave by 2:40 for the 3pm game") must reference an event that is actually in the context — if you cannot point to the line it came from, do not say it. When the context is thin, a shorter briefing is the correct briefing; never manufacture substance to fill space.

SCOPE — you cover this family's calendar, household, the routines and details they shared during onboarding, and weather only insofar as it affects today's events. Do not give general life advice, news, parenting or health tips, meal ideas, or commentary on anything the context does not contain. If today is genuinely quiet, say so briefly and stop — do not drift into topics you have no data for.

DATA FRESHNESS — if the context contains a "DATA FRESHNESS WARNING" line, the calendar may be out of date. In that case, hedge: frame the schedule as "what I've got on the calendar" rather than asserting it as certain fact, and do not present a clear calendar as definitely clear (e.g. "nothing on the calendar — though it may not have synced yet"). Without that warning, treat the calendar as current and speak with normal confidence; do not hedge needlessly.

CONTEXTUAL FOLLOW-UP QUESTION: On a normal morning, deliver the briefing and stop — do NOT ask a question. Only on a genuinely high-risk day — a real scheduling conflict, tight back-to-back timing between events, or an ambiguous pickup that could quietly go wrong — you MAY end with ONE short follow-up question that offers concrete help the user actually wants. It must name a specific event and time from today and propose a specific action you can take: a reminder, a nudge, a heads-up. Example: "Both your 5pm and Jaxon's 6pm pickup are tight today. Want me to ping you at 4:30 so it doesn't sneak up?" The question must earn its place by being useful to the user, not to chase a reply. Never ask a generic question, never hand the user more work, and never ask anything on a normal day. If you can't name a concrete risk and a concrete offer, ask nothing.`;

interface BriefingContext {
  ctx: string;
  events: { time: string; title: string; location?: string | null }[];
  dateLabel: string;
  parentFirstName: string | null;
}

// SMS onboarding asks only for a first name ("What should I call you? First
// name's perfect."), so profiles.family_name almost always holds just that —
// "Austin", not "Ford" or "the Ford family". Feeding that straight into the
// prompt as the family's name produced "the Austin family", which reads like a
// database field. We split the stored value: a single token is the parent's
// first name with no surname; a multi-word value ("Sarah Ford") yields both.
// When there is no surname the briefing addresses the household by its members
// instead of inventing a family name.
interface FamilyNaming {
  parentFirstName: string | null;
  surname: string | null;
}

function resolveFamilyNaming(rawName: string | null): FamilyNaming {
  const cleaned = (rawName ?? "").trim();
  if (!cleaned || cleaned.toLowerCase() === "family") {
    return { parentFirstName: null, surname: null };
  }
  const tokens = cleaned.split(/\s+/);
  if (tokens.length === 1) {
    return { parentFirstName: tokens[0], surname: null };
  }
  return { parentFirstName: tokens[0], surname: tokens.slice(1).join(" ") };
}

async function buildBriefingContext(
  profileId: string,
  familyName: string | null,
  timezone: string
): Promise<BriefingContext> {
  const today = new Date().toISOString().split("T")[0];

  // Resolve the household and onboarding context first — the family_members
  // query below is scoped by household id. household_id = the primary parent's
  // profile id; COALESCE(profiles.household_id, profiles.id).
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("context_notes, household_id")
    .eq("id", profileId)
    .maybeSingle();
  const contextNotes: string | null = profileRow?.context_notes ?? null;
  const householdId: string = profileRow?.household_id ?? profileId;

  const [
    { data: todayEvents },
    { data: familyMembers },
    { data: calendarConnections },
  ] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("title, start_time, location")
      .eq("profile_id", profileId)
      .gte("start_time", `${today}T00:00:00Z`)
      .lte("start_time", `${today}T23:59:59Z`)
      .order("start_time", { ascending: true }),
    // Household members — kids, partners, pets. SMS onboarding inserts kids
    // with profile_id set; the conversation-learning layer writes household_id
    // too. Match either column so members from neither source are missed.
    supabase
      .from("family_members")
      .select("name, age, member_type, relationship")
      .or(`profile_id.eq.${profileId},household_id.eq.${householdId}`),
    supabase
      .from("calendar_connections")
      .select("last_synced_at, sync_status, enabled")
      .eq("profile_id", profileId),
  ]);

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const events = (todayEvents ?? []).map((e: any) => ({
    time: new Date(e.start_time).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
    title: e.title,
    location: e.location,
  }));

  const naming = resolveFamilyNaming(familyName);
  let ctx = "";
  if (naming.parentFirstName) {
    ctx += `Primary parent (the person reading this briefing): ${naming.parentFirstName}\n`;
  }
  if (naming.surname) {
    ctx += `Family surname: ${naming.surname}\n`;
  } else {
    ctx += "Family surname: not on file — address the household by its members, not a made-up family name\n";
  }
  ctx += `Date: ${dateLabel}\n\n`;

  const stalenessNote = calendarStalenessNote(calendarConnections);
  if (stalenessNote) {
    ctx += `DATA FRESHNESS WARNING: ${stalenessNote}\n\n`;
  }

  if (events.length > 0) {
    ctx += "Today's calendar:\n";
    for (const e of events) {
      ctx += `  ${e.time} ${e.title}${e.location ? ` @ ${e.location}` : ""}\n`;
    }
  } else {
    ctx += "Today's calendar: clear\n";
  }

  if (familyMembers && familyMembers.length > 0) {
    ctx += "\nHousehold members:\n";
    for (const m of familyMembers as any[]) {
      const descriptors = [m.relationship?.trim() || m.member_type];
      if (m.age != null) descriptors.push(`age ${m.age}`);
      ctx += `  ${m.name} (${descriptors.join(", ")})\n`;
    }
  }

  if (contextNotes && contextNotes.trim()) {
    ctx +=
      "\nWhat Kin learned about this family during onboarding " +
      "(kids' schools, activities, weekly routines, wake time, special needs):\n" +
      `${contextNotes.trim()}\n`;
  }

  const weather = await fetchWeather(getContextNote(contextNotes, "home_location"), timezone);
  if (weather) ctx += `\n${weather}\n`;

  return { ctx, events, dateLabel, parentFirstName: naming.parentFirstName };
}

// Calls Claude with 3 attempts and exponential backoff. Throws if all fail.
async function callAnthropicWithRetry(ctx: string): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicApiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 200,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: ctx }],
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        const e = new Error(`Anthropic ${res.status}: ${err}`) as Error & {
          status?: number;
        };
        e.status = res.status;
        throw e;
      }
      const data = await res.json();
      const text: string =
        data.content?.[0]?.type === "text" ? data.content[0].text : "";
      if (!text.trim()) throw new Error("Anthropic returned empty content");
      return text.trim();
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number })?.status;
      if (!isRetryable(status) || attempt === 3) break;
      await sleep(1000 * 2 ** (attempt - 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

// Plaintext fallback when the AI call fails after retries. No summary — just a
// simple, useful list of the day's calendar so the user still gets something.
function buildPlaintextBriefing(c: BriefingContext): string {
  const greeting = c.parentFirstName ? `Good morning, ${c.parentFirstName}.` : "Good morning.";
  if (c.events.length === 0) {
    return `${greeting} Nothing on the calendar today — an open day.`;
  }
  const parts: string[] = [`${greeting} Here's ${c.dateLabel}:`];
  parts.push(
    c.events
      .map((e) => `${e.time} ${e.title}${e.location ? ` at ${e.location}` : ""}`)
      .join("; ") + "."
  );
  return parts.join(" ").slice(0, 600);
}

export interface GeneratedBriefing {
  text: string;
  degraded: boolean;
}

// Generates the briefing for one profile. If the AI call fails after retries,
// degrades gracefully to a plaintext calendar list rather than giving up.
export async function generateBriefing(
  profileId: string,
  familyName: string | null,
  timezone: string,
  appendPaymentNudge: boolean
): Promise<GeneratedBriefing> {
  const context = await buildBriefingContext(profileId, familyName, timezone);

  let text: string;
  let degraded = false;
  try {
    // 600-char cap leaves room for an optional high-risk follow-up question.
    text = (await callAnthropicWithRetry(context.ctx)).slice(0, 600);
  } catch (err) {
    degraded = true;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`generateBriefing: AI failed for ${profileId}, using plaintext fallback:`, msg);
    await notifySlack(
      `AI briefing generation failed for ${familyName ?? profileId} (${profileId}) after retries — sent plaintext fallback. ${msg}`,
      "warning"
    );
    text = buildPlaintextBriefing(context);
  }

  return {
    text: appendPaymentNudge ? `${text}\n\n${PAYMENT_NUDGE}` : text,
    degraded,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Delivery
// ─────────────────────────────────────────────────────────────────────────────

export interface BriefingProfile {
  id: string;
  family_name: string | null;
  phone_number: string;
  timezone: string | null;
  created_at: string | null;
  subscription_status: string | null;
  billing_exempt: boolean | null;
}

export interface DeliveryResult {
  status: "sent" | "failed";
  degraded?: boolean;
  error?: string;
}

// Generates and delivers a briefing to one profile, with Twilio retry, AI
// fallback, audit logging, and Slack alerting on total failure. Used by both
// the morning-briefing cron and the briefing-audit backstop.
export async function deliverBriefing(
  profile: BriefingProfile,
  briefingDate: string,
  source: string
): Promise<DeliveryResult> {
  const tz = profile.timezone ?? "America/Los_Angeles";

  // Trial payment nudge: append the payment prompt once a profile is 7+ days
  // old, but only while they're still on the trial. Paid, past-due, and
  // canceled accounts don't get it, and billing-exempt profiles never do.
  let daysSinceCreated = 0;
  if (profile.created_at) {
    daysSinceCreated = Math.floor(
      (Date.now() - new Date(profile.created_at).getTime()) / 86_400_000
    );
  }
  const appendPaymentNudge =
    !profile.billing_exempt &&
    profile.subscription_status === "trial" &&
    daysSinceCreated >= 7;

  try {
    const { text, degraded } = await generateBriefing(
      profile.id,
      profile.family_name,
      tz,
      appendPaymentNudge
    );

    await sendSmsWithRetry(profile.phone_number, text);
    await logSms(profile.id, "outbound", text, profile.phone_number);

    await supabase.from("morning_briefings").upsert(
      {
        profile_id: profile.id,
        briefing_date: briefingDate,
        content: text,
        delivery_status: "sent",
        sent_at: new Date().toISOString(),
      },
      { onConflict: "profile_id,briefing_date" }
    );

    console.log(`[${source}] Sent briefing to ${profile.family_name} (${profile.id})`);
    return { status: "sent", degraded };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[${source}] Failed for ${profile.id}:`, msg);

    await logSms(
      profile.id,
      "outbound_failed",
      `[briefing delivery failed: ${msg}]`,
      profile.phone_number
    ).catch(() => {});
    await supabase.from("morning_briefings").upsert(
      {
        profile_id: profile.id,
        briefing_date: briefingDate,
        content: "",
        delivery_status: "failed",
      },
      { onConflict: "profile_id,briefing_date" }
    );

    await notifySlack(
      `Briefing failed all retries for ${profile.family_name ?? profile.id} ` +
        `(${profile.id}, source: ${source}): ${msg}`,
      "critical"
    );

    return { status: "failed", error: msg };
  }
}
