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
//   OPENWEATHER_API_KEY  — weather enrichment; absent keys degrade silently.
//   GOOGLE_MAPS_API_KEY  — Distance Matrix lookups for live drive times in the
//                          briefing. The key must have the Distance Matrix API
//                          enabled in Google Cloud Console. Absent or failing
//                          keys degrade silently — the briefing falls back to
//                          its existing soft hedging on logistics.
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
// Optional — Google Distance Matrix enrichment is skipped entirely when unset,
// and the briefing falls back to soft hedging on drive times.
const googleMapsApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
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

// The timezone applied when a profile has none on file, or an unrecognized
// one. See resolveTimezone.
const DEFAULT_TIMEZONE = "America/Los_Angeles";

// Validates an IANA timezone name, falling back to DEFAULT_TIMEZONE when it is
// missing or unrecognized. Intl throws a RangeError on an unknown zone — and
// getLocalHour runs in the hourly fan-out loop *before* the per-profile
// try/catch in deliverBriefing, so an unguarded throw there takes down the
// whole morning-briefing batch (every user then misses the 6am send and only
// gets the 9am-CT audit backstop). Every place that feeds profiles.timezone
// into a date API must route through here first.
export function resolveTimezone(timezone: string | null | undefined): string {
  if (timezone) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezone });
      return timezone;
    } catch {
      console.error(
        `resolveTimezone: unrecognized timezone "${timezone}" — using ${DEFAULT_TIMEZONE}`
      );
    }
  }
  return DEFAULT_TIMEZONE;
}

// Offset of `timezone` from UTC at instant `at`, in milliseconds, signed so
// that utcInstant + offset = local wall-clock. EDT (UTC-4) yields -14_400_000.
function tzOffsetMs(timezone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const p: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") p[part.type] = parseInt(part.value, 10);
  }
  const asUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour % 24,
    p.minute,
    p.second
  );
  return asUtc - at.getTime();
}

// The UTC instant range [startUtc, endUtc) spanning the user's local calendar
// day. calendar_events.start_time is stored in UTC (Google Calendar's native
// format), so filtering on a UTC-date window pulls the wrong slice: for an EDT
// user it runs 8pm-yesterday to 8pm-today, dropping tonight's events and
// pulling in last night's. Anchoring the window to the user's timezone keeps
// "today" meaning their today.
export function localDayRangeUtc(timezone: string): {
  startUtc: string;
  endUtc: string;
} {
  const localDate = getLocalDate(timezone);
  // Midnight of the local date read naively as a UTC instant is off by exactly
  // the zone offset; subtracting it lands on the true local midnight.
  const naiveMidnight = new Date(`${localDate}T00:00:00Z`);
  const offsetMs = tzOffsetMs(timezone, naiveMidnight);
  const startUtc = new Date(naiveMidnight.getTime() - offsetMs);
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
  return { startUtc: startUtc.toISOString(), endUtc: endUtc.toISOString() };
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
// Travel time enrichment (optional)
// ─────────────────────────────────────────────────────────────────────────────
//
// Without live drive times, the LLM hedges ("plan a clear path"); with them it
// can land an actionable leave-by minute ("daycare drop is 14 min in traffic,
// leave by 8:16"). This module pulls Google Distance Matrix estimates for the
// chain of today's events, anchored at home_location when present. Absence is
// silent — a missing key or a failed lookup just leaves the briefing in its
// pre-existing soft-hedging mode.

interface KnownLocation {
  label: string;
  address: string;
  keywords: string[];
}

interface TravelTime {
  description: string;
  durationText: string;
  inTrafficText: string | null;
  distanceText: string | null;
}

// Parses profiles.context_notes into a home address plus any other labelled
// anchors with address-like values (street numbers, street-type tokens). Skips
// lines whose value is too vague to route — e.g. "Harrison West area" — since
// sending neighborhood-only strings to Distance Matrix yields imprecise drive
// times. home_location is pulled out separately so the caller can use it as the
// origin of the day's first leg.
function parseKnownLocations(
  notes: string | null
): { home: string | null; anchors: KnownLocation[] } {
  if (!notes) return { home: null, anchors: [] };
  let home: string | null = null;
  const anchors: KnownLocation[] = [];
  for (const line of notes.split("\n")) {
    const idx = line.indexOf(": ");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 2).trim();
    if (!key || !value) continue;
    if (key.toLowerCase() === "home_location") {
      home = value;
      continue;
    }
    const looksLikeAddress =
      /\d/.test(value) ||
      /\b(st|street|ave|avenue|rd|road|blvd|dr|drive|ln|lane|way|pkwy|hwy|highway)\b/i.test(
        value
      );
    if (!looksLikeAddress) continue;
    const keywords = key
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 4);
    anchors.push({ label: key, address: value, keywords });
  }
  return { home, anchors };
}

// Calendar event "locations" that aren't physical places — videoconferencing
// links, "Online", "TBD" — must not be sent to Distance Matrix or it will
// geocode them into something nonsensical.
function isVirtualLocation(loc: string): boolean {
  const lower = loc.toLowerCase().trim();
  if (lower.startsWith("http")) return true;
  if (lower.startsWith("zoom") || lower.startsWith("google meet")) return true;
  if (lower.startsWith("microsoft teams") || lower.startsWith("teams ")) return true;
  if (lower.startsWith("webex") || lower.startsWith("skype")) return true;
  return ["online", "virtual", "remote", "tbd", "teams", "phone", "call"].includes(lower);
}

// If the raw calendar location already reads as a real street address, trust
// it. Otherwise try to match it into a known anchor by keyword (e.g. an event
// titled "Daycare pickup" with location "Balanced Family Academy" maps to the
// daycare anchor's address). Falls back to the raw string when neither rule
// matches — Distance Matrix can usually geocode a known place name on its own.
function resolveEventAddress(raw: string, anchors: KnownLocation[]): string {
  if (/\d{1,5}\s+\w/.test(raw)) return raw;
  const lower = raw.toLowerCase();
  for (const a of anchors) {
    if (a.keywords.some((k) => lower.includes(k))) return a.address;
  }
  return raw;
}

// One Distance Matrix call per leg. departure_time=now opts into current-
// traffic durations (duration_in_traffic) — without it Google only returns the
// free-flow estimate, which underestimates rush-hour drives. 5s timeout so a
// hung Google API can never block a briefing.
async function fetchTravelTime(
  origin: string,
  destination: string,
  description: string
): Promise<TravelTime | null> {
  if (!googleMapsApiKey) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const url = new URL(
      "https://maps.googleapis.com/maps/api/distancematrix/json"
    );
    url.searchParams.set("origins", origin);
    url.searchParams.set("destinations", destination);
    url.searchParams.set("mode", "driving");
    url.searchParams.set("departure_time", "now");
    url.searchParams.set("units", "imperial");
    url.searchParams.set("key", googleMapsApiKey);
    const res = await fetch(url.toString(), { signal: ctrl.signal });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== "OK") return null;
    const el = data.rows?.[0]?.elements?.[0];
    if (!el || el.status !== "OK") return null;
    return {
      description,
      durationText: el.duration?.text ?? "?",
      inTrafficText: el.duration_in_traffic?.text ?? null,
      distanceText: el.distance?.text ?? null,
    };
  } catch (err) {
    console.error(
      "fetchTravelTime failed:",
      err instanceof Error ? err.message : String(err)
    );
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Cap legs so an unusually busy day can't fan out into 20 Distance Matrix
// calls. 8 covers a normal day (home → drop-off → office → pickup → activity →
// home) with headroom.
const MAX_TRAVEL_LEGS = 8;

// Builds the chain of legs we'll price and resolves each through Google.
// Returns the (possibly empty) list of successful lookups; partial success is
// fine — the LLM just gets the legs we could resolve.
async function fetchTravelTimes(
  rawEvents: any[] | null,
  contextNotes: string | null,
  timezone: string
): Promise<TravelTime[]> {
  if (!googleMapsApiKey) return [];
  if (!rawEvents || rawEvents.length === 0) return [];

  const { home, anchors } = parseKnownLocations(contextNotes);

  const usable = rawEvents
    .filter((e) => {
      const isPrivate =
        e.visibility === "private" || e.visibility === "confidential";
      if (isPrivate) return false;
      const loc = (e.location ?? "").trim();
      if (!loc) return false;
      if (isVirtualLocation(loc)) return false;
      return true;
    })
    .map((e) => ({
      time: new Date(e.start_time).toLocaleTimeString("en-US", {
        timeZone: timezone,
        hour: "numeric",
        minute: "2-digit",
      }),
      title: e.title,
      address: resolveEventAddress((e.location as string).trim(), anchors),
    }));

  if (usable.length === 0) return [];

  const legs: { origin: string; destination: string; description: string }[] = [];
  if (home) {
    legs.push({
      origin: home,
      destination: usable[0].address,
      description: `Home → ${usable[0].time} ${usable[0].title}`,
    });
  }
  for (let i = 1; i < usable.length && legs.length < MAX_TRAVEL_LEGS; i++) {
    if (usable[i].address === usable[i - 1].address) continue;
    legs.push({
      origin: usable[i - 1].address,
      destination: usable[i].address,
      description: `${usable[i - 1].time} ${usable[i - 1].title} → ${usable[i].time} ${usable[i].title}`,
    });
  }
  if (legs.length === 0) return [];

  const results = await Promise.all(
    legs.map((l) => fetchTravelTime(l.origin, l.destination, l.description))
  );
  return results.filter((t): t is TravelTime => t !== null);
}

function formatTravelTimes(travelTimes: TravelTime[]): string {
  if (travelTimes.length === 0) return "";
  let out =
    "\nTravel times (live drive estimates from Google Maps, current traffic):\n";
  for (const t of travelTimes) {
    const main = t.inTrafficText ?? t.durationText;
    const trafficLabel = t.inTrafficText ? " in current traffic" : "";
    const distance = t.distanceText ? `, ${t.distanceText}` : "";
    out += `  ${t.description}: ${main}${trafficLabel}${distance}\n`;
  }
  return out;
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

GROUNDING — every fact must trace to the context. Only mention events, household members, schools, activities, times, names, and locations that appear in the context below. Never invent an errand, to-do, appointment, deadline, task, or reminder. Any action you suggest ("leave by 2:40 for the 3pm game") must reference an event that is actually in the context — if you cannot point to the line it came from, do not say it. When the context is thin, a shorter briefing is the correct briefing; never manufacture substance to fill space. If the context contains a "Recent notes this family shared" section, those are reminders, plans, and deadlines the family told Kin directly — they ARE valid grounding, so you SHOULD surface anything in them relevant to today or the days just ahead, weaving it in naturally rather than quoting it back.

SCOPE — you cover this family's calendar, household, the routines and details they shared during onboarding, and weather only insofar as it affects today's events. Do not give general life advice, news, parenting or health tips, meal ideas, or commentary on anything the context does not contain. If today is genuinely quiet, say so briefly and stop — do not drift into topics you have no data for.

DATA FRESHNESS — if the context contains a "DATA FRESHNESS WARNING" line, the calendar may be out of date. In that case, hedge harder still: frame the schedule as "what I've got on the calendar" rather than asserting it as certain fact, and do not present a clear calendar as definitely clear (e.g. "nothing on the calendar — though it may not have synced yet"). Without that warning, treat the calendar as current — but still follow the HUMILITY guidance below; do not over-hedge the existence of the schedule itself.

HUMILITY ON TIME-SENSITIVE LOGISTICS — Kin is an assistant, not the source of truth, and a parent may act on this briefing in ways that genuinely matter: a daycare pickup, a medication time, a custody handoff. For anything time-sensitive — pickups, drop-offs, appointment times, who is responsible for what — attribute it to the calendar rather than stating it as flat fact, and frame it as something the parent should confirm. Say "your calendar shows a 2pm meeting," not "you have a meeting at 2." Say "pickup looks like yours at 3pm today," not "pickup IS yours at 3pm." This is a matter of phrasing only: still lead with the most important item, still be specific and warm and useful — just don't sound categorically authoritative about logistics that could have quietly changed. Apply this on every briefing, not only when a freshness warning is present.

TRAVEL TIMES — when the context contains a "Travel times" section, those are live Google Maps drive estimates with current traffic, computed at briefing time. Use them to make logistics concrete: "drive to daycare is showing 14 min in traffic — leave by 8:16 for the 8:30 drop-off" instead of vague hedging like "give yourself enough time." Subtract the drive estimate from the event start to surface a specific leave-by minute, and cite the source ("traffic is showing", "Maps has the drive at ~12 min") so it's clear this is a live read, not a promise. Use the in-traffic number when present. When NO travel times section is present, do NOT invent drive times or leave-by minutes — fall back to the existing soft framing ("plan a clear path", "give yourself extra time").

CONTEXTUAL FOLLOW-UP QUESTION: On a normal morning, deliver the briefing and stop — do NOT ask a question. Only on a genuinely high-risk day — a real scheduling conflict, tight back-to-back timing between events, or an ambiguous pickup that could quietly go wrong — you MAY end with ONE short follow-up question that offers concrete help the user actually wants. It must name a specific event and time from today and propose a specific action you can take: a reminder, a nudge, a heads-up. Example: "Both your 5pm and Jaxon's 6pm pickup are tight today. Want me to ping you at 4:30 so it doesn't sneak up?" The question must earn its place by being useful to the user, not to chase a reply. Never ask a generic question, never hand the user more work, and never ask anything on a normal day. If you can't name a concrete risk and a concrete offer, ask nothing.`;

interface BriefingContext {
  ctx: string;
  events: { time: string; title: string; location?: string | null }[];
  dateLabel: string;
  parentFirstName: string | null;
}

// profiles.family_name holds the primary parent's FIRST name — SMS onboarding
// asks "What should I call you? First name's perfect." Feeding it into the
// prompt as the family's name produced "the Austin family", which reads like a
// database field. The dedicated last-name onboarding step fills profiles.last_name
// when the texter gives one; the briefing prefers that for the surname. For
// profiles created before last_name existed we still split a multi-word
// family_name ("Sarah Ford") as a fallback. When there is no surname at all the
// briefing addresses the household by its members instead of inventing a name.
interface FamilyNaming {
  parentFirstName: string | null;
  surname: string | null;
}

function resolveFamilyNaming(
  rawName: string | null,
  lastName: string | null
): FamilyNaming {
  const explicitSurname = (lastName ?? "").trim() || null;
  const cleaned = (rawName ?? "").trim();
  if (!cleaned || cleaned.toLowerCase() === "family") {
    return { parentFirstName: null, surname: explicitSurname };
  }
  const tokens = cleaned.split(/\s+/);
  // Prefer the dedicated last_name column; fall back to a multi-word
  // family_name for profiles created before that column existed.
  const surname =
    explicitSurname ?? (tokens.length > 1 ? tokens.slice(1).join(" ") : null);
  return { parentFirstName: tokens[0], surname };
}

async function buildBriefingContext(
  profileId: string,
  familyName: string | null,
  lastName: string | null,
  timezone: string
): Promise<BriefingContext> {
  // The day window is anchored to the user's timezone, not UTC — see
  // localDayRangeUtc. calendar_events.start_time is UTC, so a UTC-date filter
  // would straddle two of the user's local days.
  const { startUtc, endUtc } = localDayRangeUtc(timezone);

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
    { data: contextNoteRows },
  ] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("title, start_time, location, visibility")
      .eq("profile_id", profileId)
      .gte("start_time", startUtc)
      .lt("start_time", endUtc)
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
    // Live context notes — e.g. the weekly Sunday check-in reply about the
    // week ahead. expires_at is a TTL; drop anything past it.
    supabase
      .from("user_context_notes")
      .select("content")
      .eq("profile_id", profileId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const dateLabel = new Date().toLocaleDateString("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Private/confidential events (Google visibility) keep their time slot but
  // lose every identifying detail — title, description, location. A morning
  // briefing can be read by anyone in the household, so a therapy appointment
  // or job interview must show only as a blocked slot, never by name.
  const events = (todayEvents ?? []).map((e: any) => {
    const isPrivate =
      e.visibility === "private" || e.visibility === "confidential";
    return {
      time: new Date(e.start_time).toLocaleTimeString("en-US", {
        timeZone: timezone,
        hour: "numeric",
        minute: "2-digit",
      }),
      title: isPrivate ? "Private event" : e.title,
      location: isPrivate ? null : e.location,
    };
  });

  const naming = resolveFamilyNaming(familyName, lastName);
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

  const liveNotes = (contextNoteRows ?? []) as { content: string }[];
  if (liveNotes.length > 0) {
    ctx +=
      "\nRecent notes this family shared directly with Kin (e.g. their reply to " +
      "Kin's Sunday check-in about the week ahead):\n";
    for (const n of liveNotes) {
      if (n.content && n.content.trim()) ctx += `  ${n.content.trim()}\n`;
    }
  }

  // Weather + travel-time enrichment run in parallel — both are best-effort
  // network calls that must never block or break a briefing. Either failing
  // just leaves its section out and the prompt's fallback guidance kicks in.
  const [weather, travelTimes] = await Promise.all([
    fetchWeather(getContextNote(contextNotes, "home_location"), timezone),
    fetchTravelTimes(todayEvents ?? null, contextNotes, timezone),
  ]);
  if (weather) ctx += `\n${weather}\n`;
  ctx += formatTravelTimes(travelTimes);

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
  lastName: string | null,
  timezone: string,
  appendPaymentNudge: boolean
): Promise<GeneratedBriefing> {
  const context = await buildBriefingContext(profileId, familyName, lastName, timezone);

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
  last_name: string | null;
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
  const tz = resolveTimezone(profile.timezone);

  // Trial payment nudge: append the payment prompt once a profile is 14+ days
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
    daysSinceCreated >= 14;

  try {
    const { text, degraded } = await generateBriefing(
      profile.id,
      profile.family_name,
      profile.last_name,
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
