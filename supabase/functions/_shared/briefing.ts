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
//   OPENWEATHER_API_KEY        — weather enrichment; absent keys degrade silently.
//   GOOGLE_MAPS_API_KEY        — Distance Matrix lookups for live drive times in
//                                the briefing. The key must have the Distance
//                                Matrix API enabled in Google Cloud Console.
//                                Absent or failing keys degrade silently — the
//                                briefing falls back to its existing soft hedging
//                                on logistics.
//   SLACK_BRIEFING_WEBHOOK_URL — reliability alerts; falls back to ADMIN_PHONE SMS.
//   ADMIN_PHONE                — Austin's number; alert fallback when Slack is unset.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";
import {
  QUALITY_PASS_THRESHOLD,
  quickQualityCheck,
  scoreBriefing,
} from "./briefing-quality.ts";
import { ensureStopFooterMonthly } from "./sms-utils.ts";

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
const slackWebhookUrl = Deno.env.get("SLACK_BRIEFING_WEBHOOK_URL");
const adminPhone = Deno.env.get("ADMIN_PHONE");

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// Timezone helpers
// ─────────────────────────────────────────────────────────────────────────────

// Optional `at` lets the caller pin a single UTC instant across many calls —
// the fan-out loop captures `new Date()` once and passes it in for every
// profile, so a profile that gets processed at 6:59:58 and one at 7:00:02 do
// not disagree on whether "now" is still the 6am hour.
export function getLocalHour(timezone: string, at: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const h = parts.find((p) => p.type === "hour")?.value ?? "0";
  return parseInt(h, 10) % 24;
}

// The user's local calendar date (YYYY-MM-DD), used as the dedup key. "Today"
// for dedup must mean the user's today, not UTC's: a test send at 9:30pm EDT is
// already the next UTC day, so a UTC key would let that send eat the user's
// real morning slot. en-CA formats as YYYY-MM-DD. `at` is the same pinned
// instant used by getLocalHour.
export function getLocalDate(timezone: string, at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
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

// Posts a reliability alert to SLACK_BRIEFING_WEBHOOK_URL. If the webhook isn't
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
      // P2-M1 (audit v6): cap to 600 chars to keep the admin SMS to a
      // bounded ~5 segments, but append an ellipsis when we actually
      // chopped — otherwise the message looks like it ended mid-sentence
      // and someone has to grep the briefing log to find the rest.
      const capped =
        text.length > 600 ? text.slice(0, 597) + "..." : text;
      await sendSmsOnce(adminPhone, capped);
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
//
// Quota distinction (v6 P1-C2): a 403/429 from Google means we've hit billing
// or QPS limits and drive times will keep failing until ops acts. A 5s
// AbortError or transient network failure is harmless. Capture the former to
// Sentry as a critical signal so founders see the quota wall before users do;
// degrade the latter silently.
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
    if (!res.ok) {
      if (res.status === 403 || res.status === 429) {
        await reportQuotaExhaustion(
          `HTTP ${res.status} from Distance Matrix`,
          await safeReadBody(res)
        );
      }
      return null;
    }
    const data = await res.json();
    if (data.status !== "OK") {
      // Distance Matrix encodes quota errors in the top-level `status` field
      // with HTTP 200. OVER_QUERY_LIMIT / REQUEST_DENIED / RESOURCE_EXHAUSTED
      // all indicate the API key has stopped working.
      if (
        data.status === "OVER_QUERY_LIMIT" ||
        data.status === "REQUEST_DENIED" ||
        data.status === "RESOURCE_EXHAUSTED"
      ) {
        await reportQuotaExhaustion(
          `Distance Matrix status=${data.status}`,
          typeof data.error_message === "string" ? data.error_message : null
        );
      }
      return null;
    }
    const el = data.rows?.[0]?.elements?.[0];
    if (!el || el.status !== "OK") return null;
    return {
      description,
      durationText: el.duration?.text ?? "?",
      inTrafficText: el.duration_in_traffic?.text ?? null,
      distanceText: el.distance?.text ?? null,
    };
  } catch (err) {
    // AbortError (5s timeout) and generic network failures degrade silently —
    // the briefing simply omits drive times. Don't Sentry-spam on these.
    console.error(
      "fetchTravelTime failed:",
      err instanceof Error ? err.message : String(err)
    );
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function safeReadBody(res: Response): Promise<string | null> {
  try {
    return (await res.text()).slice(0, 400);
  } catch {
    return null;
  }
}

// Distance Matrix quota-exhaustion alert. Slack is the durable channel here —
// we do NOT capture to Sentry from inside the Deno edge function. The prior
// comment claimed a "best-effort dynamic Sentry import" but no such import
// existed (P1-M2 audit v7). When trend-tracking lands it should live in a
// dedicated module with the Sentry SDK pinned in import_map.json, not as a
// dynamic best-effort import inside this hot path.
//
// Per-hour re-arm (audit V7 P2-M2): the dedup state used to be a single
// boolean that latched for the lifetime of the warm function instance — a
// long warm cycle would silence the alert for hours during a sustained
// quota outage. Track the last-alert wall-clock instead and re-arm every
// hour so an outage that drags past one hour gets a fresh ping.
const QUOTA_REARM_WINDOW_MS = 60 * 60 * 1000;
let lastQuotaAlertAt: number | null = null;
async function reportQuotaExhaustion(
  reason: string,
  detail: string | null
): Promise<void> {
  const now = Date.now();
  if (
    lastQuotaAlertAt !== null &&
    now - lastQuotaAlertAt < QUOTA_REARM_WINDOW_MS
  ) {
    return;
  }
  lastQuotaAlertAt = now;
  console.error(
    `fetchTravelTime quota exhaustion: ${reason}${detail ? ` — ${detail}` : ""}`
  );
  try {
    await notifySlack(
      `Distance Matrix quota exhausted (${reason}). Drive-time legs in today's briefings will degrade until the quota recovers.`,
      "critical"
    );
  } catch {
    /* notify is best-effort */
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
  // P2-C4 (audit v6): provider lets the staleness note name *which*
  // connection failed so the user knows whether to re-auth Google or
  // re-issue an Apple app-specific password.
  provider?: string | null;
}

function providerLabel(provider: string | null | undefined): string {
  if (provider === "google") return "Google Calendar";
  if (provider === "apple") return "Apple Calendar";
  return "A connected calendar";
}

function calendarStalenessNote(
  connections: CalendarConnectionRow[] | null
): string | null {
  const active = (connections ?? []).filter((c) => c.enabled);
  if (active.length === 0) return null;

  // P2-C4: report the specific provider that's failing instead of the
  // ambiguous "a connected calendar." Multi-provider households need to
  // know which side to fix.
  //
  // P1-C1 (audit v7): a connection in state `needs_reconnect` (revoked
  // refresh_token, expired channel — migration 066) used to fall through.
  // If it had synced within threshold before revocation the briefing was
  // built from a structurally-stale calendar with no warning. Treat
  // needs_reconnect identically to error, with copy that nudges the user
  // toward the reconnect button.
  const erroring = active.find((c) => c.sync_status === "error");
  if (erroring) {
    return `${providerLabel(erroring.provider)} is failing to sync — today's events may be incomplete or out of date.`;
  }
  const needsReconnect = active.find((c) => c.sync_status === "needs_reconnect");
  if (needsReconnect) {
    return `${providerLabel(needsReconnect.provider)} needs to be reconnected — today's events may be incomplete or out of date.`;
  }
  const newestSync = active
    .map((c) => (c.last_synced_at ? new Date(c.last_synced_at).getTime() : 0))
    .reduce((a, b) => Math.max(a, b), 0);
  if (newestSync === 0) {
    // Single connection? Name it. Multiple? Stay generic.
    if (active.length === 1) {
      return `${providerLabel(active[0].provider)} has not synced yet — today's events may be out of date.`;
    }
    return "A connected calendar has not synced yet — today's events may be out of date.";
  }
  const ageMs = Date.now() - newestSync;
  if (ageMs > STALE_SYNC_THRESHOLD_MS) {
    // Identify the stalest provider (the one whose last_synced_at is the
    // oldest among connections that have synced at least once).
    const synced = active.filter((c) => c.last_synced_at);
    if (synced.length === 1) {
      return `${providerLabel(synced[0].provider)} last synced ${Math.round(ageMs / 3_600_000)}h ago — today's events may be out of date.`;
    }
    return `A connected calendar last synced ${Math.round(ageMs / 3_600_000)}h ago — today's events may be out of date.`;
  }
  return null;
}

const SYSTEM_PROMPT = `You are Kin, a family AI chief of staff sending a morning SMS briefing. The reader is a parent looking at their phone before the day starts; they need the one thing that matters, in plain text, in under ten seconds.

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

ADDRESSING THE FAMILY — the context names the primary parent and, when one is known, the family surname. When a surname is given, you may say "the [Surname]s" or "the [Surname] family" — but do so sparingly; speaking to the parent by first name is more personal. When NO surname is given, never manufacture one from the parent's first name ("the Austin family" is wrong); refer to the household by its members ("you and the kids", "you, Jontae, and Jaxon"). Always call children by their own names. When the context contains NO partner calendar section, do not invent a partner — this household has a single parent, and phrasing like "your partner" or "the other parent" must never appear.

WEATHER — absolute rule first: NEVER mention precipitation, rain, snow, temperature, wind, sun, cloud cover, "bundle up", "grab an umbrella", or any other weather condition unless a line that begins with "Weather (" is present in the context above. If no such line is present, do not reference weather in any form, not even obliquely. Do not infer weather from the season, the city, or anything else. When the Weather line IS present, you may use only the facts it states — never extrapolate or add detail it does not contain. And even then: only mention weather when it materially affects a specific event on today's calendar (rain landing on a pickup, cold at a bus stop, storm during a soccer game). Tie it to the event ("grab a jacket before Jaxon's 5:30 pickup — rain hits at 4"). When the day's weather is mild and uneventful, OMIT it entirely — do not include a forecast as wallpaper, do not close with "weather is clear and mild", do not editorialize ("clear skies and 80°F if you want to get outside"). A standalone weather line is always wrong.

SCOPE — you cover this family's calendar, household, the routines and details they shared during onboarding, and weather only when it affects today's events. No general life advice, no news, no parenting or health tips, no meal ideas, no commentary on anything the context does not contain.

DATA FRESHNESS — if the context contains a "DATA FRESHNESS WARNING" line, the calendar may be out of date. Hedge harder: frame the schedule as "what I've got on the calendar" rather than asserting it as fact, and do not call a clear calendar definitely clear ("nothing on the calendar — though it may not have synced this morning"). Crucially, a stale calendar does NOT entitle you to fill the day with the user's routine — see ROUTINES ARE BACKGROUND. Without a freshness warning, treat the calendar as current and speak with your normal confidence.

HUMILITY ON TIME-SENSITIVE LOGISTICS — for anything that could matter if it's wrong (pickups, drop-offs, appointments, who is responsible for what), attribute it to the calendar rather than asserting it as flat fact. Say "your calendar shows a 2pm meeting" not "you have a meeting at 2." Say "pickup looks like yours at 3pm today" not "pickup IS yours at 3pm." Apply this on every briefing, not only with a freshness warning. This is phrasing only — still lead with the most important item, still be specific and useful.

CONTEXTUAL FOLLOW-UP QUESTION — on a normal morning, deliver the briefing and stop. Do NOT ask a question. Only on a genuinely high-risk day — a real conflict, a tight handoff (10–15 minutes between a meeting end and a pickup, including travel), an ambiguous pickup, or a weather impact on a specific event — you MAY end with ONE short follow-up that offers concrete help. It must name a specific event and time from today and propose a specific action ("Want me to ping you at 4:30 before that call ends?"). The question must earn its place by being useful to the parent, not by chasing a reply. Never ask anything generic, never hand the user more work, never ask on a normal day. If your own briefing has already framed the timing as comfortable ("margin is there", "well within the window"), do NOT then offer to nudge for that same event — that is a contradiction. If you can't name a concrete risk AND a concrete offer, ask nothing. When you DO include a question, it follows the briefing in the SAME run of text with a single space — no line break before it, ever.`;

interface BriefingContext {
  ctx: string;
  events: {
    time: string;
    endTime: string | null;
    title: string;
    location?: string | null;
  }[];
  dateLabel: string;
  parentFirstName: string | null;
  // Whether the household has a co-parent on file. Derived from family_members
  // rows directly so the sole-parent quality guard has reliable ground truth
  // independent of how the LLM-facing context string is formatted. (V7 P0-3)
  hasPartner: boolean;
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
  // Prefer the dedicated last_name column. Without it, only attempt a split
  // for an unambiguous two-token "First Last" form (v5 P2-E4: the prior
  // "first word + everything else" fallback Western-ized longer names like
  // "Mary Smith Johnson" or CJK family-first ordering, inventing a surname
  // the user never typed). Three+ tokens with no explicit surname → leave
  // null and let the briefing layer's no-surname fallback handle it.
  let surname: string | null = explicitSurname;
  if (!surname && tokens.length === 2) {
    surname = tokens[1];
  }
  // P2-M2 (audit v6): downstream behavior when surname stays null — the
  // briefing layer in buildBriefingContext drops the "the X family"
  // construction and falls back to a member-name listing ("you and the
  // kids", "you, Jontae, and Jax") instead of guessing a surname from an
  // ambiguous 3+ token name. This is intentional: an invented surname
  // ("Mary Smith Johnson" → "the Johnson family") embarrasses the user
  // and contradicts their explicit profile data. Better to fall back.
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
    { data: coordinationIssueRows },
  ] = await Promise.all([
    // Today's events — anything whose [start, end) interval overlaps the user's
    // local day. A `start_time` window alone would miss multi-day all-day events
    // (vacations, school breaks, custody weeks) on every day after the first:
    // Google stores `end.date` exclusive, so a Mon–Wed event has start_time =
    // Mon noon UTC and end_time = Thu noon UTC; on Tue the start is outside
    // today, but the event still spans today. (audit v4 P0-7)
    supabase
      .from("calendar_events")
      .select("title, start_time, end_time, location, visibility")
      .eq("profile_id", profileId)
      .lt("start_time", endUtc)
      .or(`end_time.gt.${startUtc},end_time.is.null`)
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
      .select("last_synced_at, sync_status, enabled, provider")
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
    // Live coordination issues — pickup-risk windows and late schedule changes
    // the 30-minute cron has already materialized into the household's queue.
    // OPEN + ACKNOWLEDGED (not RESOLVED), windows that touch today or have no
    // window. The deleted apps/web/src/lib/sms-briefing.ts was the only path
    // surfacing these; without this query the briefing can't even mention a
    // RED pickup window the rest of the system has detected. (audit v5 P1-B1)
    supabase
      .from("coordination_issues")
      .select("trigger_type, content, event_window_start, event_window_end, state")
      .eq("household_id", householdId)
      .in("state", ["OPEN", "ACKNOWLEDGED"])
      .or(
        `event_window_start.is.null,and(event_window_start.lt.${endUtc},event_window_end.gt.${startUtc})`
      )
      // Newest first (audit V7 P2-M1): LLM recency bias means later items
      // in the context window get less attention, so put the fresh
      // pickup-risk window / late schedule change at the top where the
      // model is more likely to surface it. Old issues still arrive within
      // the LIMIT below.
      .order("surfaced_at", { ascending: false })
      // V6 P1-M3: raised from 8 — a household on a chaotic week can produce
      // 10+ open issues that all genuinely touch today (back-to-back pickup
      // risks + late schedule changes + a responsibility shift), and the LLM
      // needs the full set to pick the most urgent. 20 is empirical headroom;
      // beyond that we Slack-warn so we notice if truncation actually bites.
      .limit(20),
  ]);

  if (
    coordinationIssueRows &&
    Array.isArray(coordinationIssueRows) &&
    coordinationIssueRows.length >= 20
  ) {
    notifySlack(
      `Coordination-issues query hit the 20-row limit for household ${householdId} — raise the cap or investigate why this household has so many open issues.`,
      "warning"
    ).catch(() => {});
  }

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
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
    });
  const events = (todayEvents ?? []).map((e: any) => {
    const isPrivate =
      e.visibility === "private" || e.visibility === "confidential";
    return {
      time: fmtTime(e.start_time),
      // End time tells the model where a meeting actually finishes, so it
      // can spot real handoff squeezes (call ends 5:30, pickup is 5:30) vs
      // comfortable gaps. Without it the model would have to guess durations
      // and we saw it fabricate end times for 1:1s and investor calls.
      endTime: e.end_time ? fmtTime(e.end_time) : null,
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
      const when = e.endTime ? `${e.time}–${e.endTime}` : e.time;
      ctx += `  ${when} ${e.title}${e.location ? ` @ ${e.location}` : ""}\n`;
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

  // Live coordination issues — pickup-risk and late-schedule-change rows the
  // background cron has already qualified. These are concrete, materialized
  // findings (not the LLM's inference) and they should drive the briefing's
  // lead-with-the-most-important-thing rule.
  const issues = (coordinationIssueRows ?? []) as {
    trigger_type: string;
    content: string;
    event_window_start: string | null;
    event_window_end: string | null;
    state: string;
  }[];
  if (issues.length > 0) {
    ctx +=
      "\nLIVE COORDINATION ISSUES — these are materialized findings from " +
      "Kin's background detectors, not inferences from the calendar. Treat them " +
      "as authoritative facts; if one is present, lead with the most urgent:\n";
    const labelFor = (t: string) =>
      ({
        pickup_risk: "Pickup risk",
        late_schedule_change: "Late schedule change",
        schedule_compression: "Schedule compression",
        responsibility_shift: "Responsibility shift",
        budget_overspend: "Budget overspend",
        other: "Coordination issue",
      })[t] ?? "Coordination issue";
    for (const i of issues) {
      const when = i.event_window_start
        ? `${fmtTime(i.event_window_start)}${
            i.event_window_end ? `–${fmtTime(i.event_window_end)}` : ""
          }`
        : "today";
      ctx += `  [${labelFor(i.trigger_type)} · ${i.state} · ${when}] ${i.content.trim()}\n`;
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

  // Partner detection for the sole-parent quality guard (V7 P0-3). The
  // conversation-learning layer writes relationship labels like
  // "partner"/"spouse"/"co-parent"/"husband"/"wife"; check those rather than
  // re-scanning the formatted ctx string for substrings that may never appear.
  const hasPartner = (familyMembers ?? []).some((m: { relationship?: string | null }) => {
    const rel = (m.relationship ?? "").toLowerCase();
    return /\b(partner|spouse|co[-\s]?parent|husband|wife)\b/.test(rel);
  });

  return {
    ctx,
    events,
    dateLabel,
    parentFirstName: naming.parentFirstName,
    hasPartner,
  };
}

// Calls Claude with 3 attempts and exponential backoff. Throws if all fail.
//
// Per-attempt 30s timeout via AbortController: without this, a stalled socket
// (not a 5xx — actually hanging) can sit on the platform's TCP timeout
// (60–120s) per attempt, chaining a single bad connection into multi-minute
// blocks inside the morning-briefing fan-out loop. Bounded worst case is now
// ~90s (3 × 30s) regardless of upstream behavior.
const ANTHROPIC_TIMEOUT_MS = 30_000;

// Default writer model. Override via BRIEFING_WRITER_MODEL (v5 P2-B4) when
// rolling to a newer Sonnet or A/B testing a different model.
//
// V6 P1-M1: explicit date suffix so we don't break silently the day Anthropic
// deprecates the bare `claude-sonnet-4-6` alias. The scorer was already
// date-pinned (briefing-quality.ts); both halves of the pipeline now match.
const WRITER_MODEL =
  Deno.env.get("BRIEFING_WRITER_MODEL") ?? "claude-sonnet-4-6-20250930";

async function callAnthropicWithRetry(ctx: string): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ANTHROPIC_TIMEOUT_MS);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicApiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: WRITER_MODEL,
          max_tokens: 200,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: ctx }],
        }),
        signal: controller.signal,
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
      // SMS surface — the prompt forbids newlines but the model still inserts
      // them between the body and a trailing follow-up question. Collapse any
      // whitespace run into a single space so the briefing renders as one
      // line regardless of carrier handling.
      return text.replace(/\s+/g, " ").trim();
    } catch (err) {
      lastErr = err;
      const aborted =
        (err as { name?: string })?.name === "AbortError" ||
        controller.signal.aborted;
      if (aborted) {
        lastErr = new Error(
          `Anthropic request aborted after ${ANTHROPIC_TIMEOUT_MS}ms`
        );
      }
      const status = (err as { status?: number })?.status;
      // Treat AbortError as retryable — a stalled socket on attempt 1 may
      // succeed on attempt 2 against a different upstream node.
      if ((!isRetryable(status) && !aborted) || attempt === 3) break;
      await sleep(1000 * 2 ** (attempt - 1));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

// Plaintext fallback when the AI call fails after retries. No summary — just a
// simple, useful list of the day's calendar so the user still gets something.
// Leads with substance, never a greeting or a meta-intro — the SYSTEM_PROMPT
// forbids "Good morning" / "here's your day" openings on the AI path, and the
// fallback must obey the same rule. The very first token is an event time so
// the user immediately sees what they need.
function buildPlaintextBriefing(c: BriefingContext): string {
  if (c.events.length === 0) {
    return toGsm7Safe(
      `Nothing on the calendar today, open day. (${c.dateLabel})`
    );
  }
  const list = c.events
    .map((e) => `${e.time} ${e.title}${e.location ? ` at ${e.location}` : ""}`)
    .join("; ");
  return toGsm7Safe(`${list}. (${c.dateLabel})`).slice(0, 600);
}

export interface GeneratedBriefing {
  text: string;
  degraded: boolean;
  // The prompt context fed to the generator. Surfaced so the runtime quality
  // checks can ground-check the briefing against the same facts the writer saw.
  context: string;
  // Surfaced so quickQualityCheck can run the phantom-partner guard against
  // structured ground truth rather than a regex against the rendered ctx
  // string. (V7 P0-3)
  hasPartner: boolean;
}

// Total SMS budget across body + optional payment nudge. 600 chars ≈ 4 Twilio
// segments (160 chars/segment). Appending the trial payment nudge unconditionally
// after a 600-char slice pushed trial briefings to ~760 chars — a fifth segment
// of cost on every trial-user send. The cap now covers the whole message; the
// body is shortened to fit when the nudge is appended.
const TOTAL_SMS_CAP = 600;
// Two newlines between body and nudge.
const NUDGE_SEPARATOR = "\n\n";

// ── GSM-7 normalization ─────────────────────────────────────────────────────
// SMS segments are 160 chars in GSM-7 encoding but only 70 chars in UCS-2.
// A single non-GSM-7 character (em-dash, curly quote, é, fancy ellipsis from
// an LLM output, …) flips the whole message into UCS-2, turning the assumed
// 4-segment cap into 9 billed segments. `.slice(0, 600)` counts UTF-16 code
// units, not segments, so the cap is silently wrong for any briefing that
// contains a smart character.
//
// Normalize aggressively: ASCII-equivalent the common offenders and strip the
// rest. Output is GSM-7 safe at the cost of "Sarah's" → "Sarah's" (already
// ASCII) and "—" → "-". Briefings stay legible; we stay at 4 segments. The
// SMS extension chars (|^€{}[]~\) cost 2 chars each in GSM-7, so we also map
// those to safer single-char ASCII where possible. (audit v5 P1-B3)
function toGsm7Safe(s: string): string {
  return s
    // Quote-flavored Unicode → ASCII
    .replace(/[‘’‚′ʼ]/g, "'")
    .replace(/[“”„″]/g, '"')
    // Dashes
    .replace(/[–—―]/g, "-")
    // Ellipsis
    .replace(/…/g, "...")
    // Non-breaking & similar spaces
    .replace(/[     ]/g, " ")
    // Bullets & arrows we sometimes see in LLM output
    .replace(/[•·]/g, "-")
    .replace(/[→➜]/g, "->")
    // Common accented letters → ASCII (briefings are en-US; preserve names
    // best-effort but accept that "café" → "cafe" is better than 9 segments).
    .replace(/[àáâãäå]/g, "a")
    .replace(/[ÀÁÂÃÄÅ]/g, "A")
    .replace(/[èéêë]/g, "e")
    .replace(/[ÈÉÊË]/g, "E")
    .replace(/[ìíîï]/g, "i")
    .replace(/[ÌÍÎÏ]/g, "I")
    .replace(/[òóôõöø]/g, "o")
    .replace(/[ÒÓÔÕÖØ]/g, "O")
    .replace(/[ùúûü]/g, "u")
    .replace(/[ÙÚÛÜ]/g, "U")
    .replace(/[ñ]/g, "n")
    .replace(/[Ñ]/g, "N")
    .replace(/[ç]/g, "c")
    .replace(/[Ç]/g, "C")
    // Anything still outside basic Latin / GSM-7 default gets dropped.
    // Permissive enough for the briefing output set; aggressive enough to
    // keep segment math honest.
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
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

  // Reserve room for the nudge so body + separator + nudge fits the cap.
  const bodyCap = appendPaymentNudge
    ? TOTAL_SMS_CAP - PAYMENT_NUDGE.length - NUDGE_SEPARATOR.length
    : TOTAL_SMS_CAP;

  let text: string;
  let degraded = false;
  try {
    // Normalize the AI output to GSM-7 before slicing — Claude routinely
    // emits em-dashes and curly quotes that would otherwise force the message
    // into UCS-2 and blow past our 4-segment cap.
    text = toGsm7Safe(await callAnthropicWithRetry(context.ctx)).slice(0, bodyCap);
  } catch (err) {
    degraded = true;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`generateBriefing: AI failed for ${profileId}, using plaintext fallback:`, msg);
    // PII: identify profiles by UUID only. V6 P0-5 closed four sibling sites in
    // this file; this call site was missed and re-opened as V7 P0-2. family_name
    // and any user-supplied identifier must never appear in Slack alert bodies.
    await notifySlack(
      `AI briefing generation failed for profile ${profileId} after retries — sent plaintext fallback. ${msg}`,
      "warning"
    );
    text = buildPlaintextBriefing(context).slice(0, bodyCap);
  }

  return {
    text: appendPaymentNudge ? `${text}${NUDGE_SEPARATOR}${PAYMENT_NUDGE}` : text,
    degraded,
    context: context.ctx,
    hasPartner: context.hasPartner,
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
  // TCPA: non-NULL means the user replied STOP — never auto-send.
  sms_opted_out_at: string | null;
}

export interface DeliveryResult {
  status: "sent" | "failed" | "skipped";
  degraded?: boolean;
  error?: string;
  reason?: string;
}

// Generates and delivers a briefing to one profile, with Twilio retry, AI
// fallback, audit logging, and Slack alerting on total failure. Used by both
// the morning-briefing cron and the briefing-audit backstop.
export async function deliverBriefing(
  profile: BriefingProfile,
  briefingDate: string,
  source: string
): Promise<DeliveryResult> {
  // TCPA hard gate: a profile that replied STOP must never receive an
  // automated briefing. The hourly + audit fan-outs already filter this
  // column at query time; this check is the last line of defense for any
  // caller (manual invocation, future code path) that forgets to.
  if (profile.sms_opted_out_at) {
    console.log(
      `[${source}] Skipping ${profile.id} — opted out at ${profile.sms_opted_out_at}`
    );
    return { status: "skipped", reason: "sms_opted_out" };
  }

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
    const { text, degraded, context, hasPartner } = await generateBriefing(
      profile.id,
      profile.family_name,
      profile.last_name,
      tz,
      appendPaymentNudge
    );

    // Quick guard runs synchronously before send — it's pure regex against
    // the generated text and the writer's context, so latency is negligible.
    // The degraded plaintext fallback is a known-good template; running these
    // checks on it would just be noise (it intentionally opens with "Good
    // morning", for one). Anything it flags is a prompt-honesty bug worth a
    // critical Slack ping immediately. We never block delivery on it.
    if (!degraded) {
      const quickIssues = quickQualityCheck(text, context, { hasPartner });
      if (quickIssues.length > 0) {
        const summary = quickIssues.map((i) => `${i.type}: ${i.detail}`).join(" | ");
        console.error(
          `[${source}] quickQualityCheck failed for ${profile.id}: ${summary}`
        );
        // PII: Slack payloads identify users by profile.id UUID only. family_name
        // and other user-supplied identifiers must never appear in alert bodies —
        // the channel has broader access than the database.
        //
        // P1-M3 (audit v7): the body used to be included for triage convenience
        // ("Briefing: ${text.slice(0, 200)}…"). Briefings carry kid names,
        // school names, partner names, and locations — the most sensitive
        // surface of paying-family life — and a SLACK_BRIEFING_WEBHOOK_URL
        // leak would have exposed the corpus. Body now lives only in the
        // RLS-scoped morning_briefings.content row + the per-row
        // quality_issues JSONB. Ops can paste the profile id into the debug
        // tool to fetch the body when they need it.
        await notifySlack(
          `Briefing failed quick quality guard for profile ${profile.id} ` +
            `(source: ${source}). issues: ${quickIssues.length} (${summary})`,
          "critical"
        );
      }
    }

    // Score in parallel with SMS send so the Haiku call (~1s) never adds
    // latency to delivery. Plaintext fallback skips scoring for the same
    // reason quickQualityCheck does. scoreBriefing returns null on any
    // failure; we treat that as "could not score" and proceed.
    let scorerThrew = false;
    const scorePromise = degraded
      ? Promise.resolve(null)
      : scoreBriefing(text, context).catch((err) => {
          scorerThrew = true;
          console.error(
            "deliverBriefing: scoreBriefing threw",
            err instanceof Error ? err.message : String(err)
          );
          return null;
        });

    // V8 P0-1: A2P 10DLC carrier-audit standards require recurring outbound
    // messages to carry opt-out instructions. The briefing system prompt
    // forbids closing language, so the footer is appended at the send site
    // (idempotent — no-op if the body already mentions STOP). The persisted
    // morning_briefings.content row matches what was actually delivered.
    // Scaled to monthly cadence — the footer lands once per 30 days per
    // recipient instead of on every briefing, since carrier audits only
    // require periodic re-disclosure of the opt-out instruction.
    const textWithFooter = await ensureStopFooterMonthly(
      supabase,
      profile.phone_number,
      text
    );
    await sendSmsWithRetry(profile.phone_number, textWithFooter);
    await logSms(profile.id, "outbound", textWithFooter, profile.phone_number);

    const score = await scorePromise;

    if (score) {
      console.log(
        `[${source}] Quality ${score.grade} (${score.score}) for ${profile.id}` +
          (score.issues.length > 0 ? ` — ${score.issues.length} issue(s)` : "")
      );
      if (!score.pass) {
        // P1-M3 (audit v7): never include the briefing body in Slack alerts.
        // The body carries kid + school + partner names + locations and
        // would leak the corpus on any SLACK_BRIEFING_WEBHOOK_URL exposure.
        // The body is already persisted on morning_briefings.content for ops
        // lookup via the debug tool keyed on profile_id.
        await notifySlack(
          `Briefing scored ${score.grade} (${score.score}/100, threshold ${QUALITY_PASS_THRESHOLD}) for ` +
            `profile ${profile.id} (source: ${source}). ` +
            `issues: ${score.issues.length} (${score.issues.slice(0, 3).join(" | ") || "none returned"})`,
          "warning"
        );
      }
    }

    await supabase.from("morning_briefings").upsert(
      {
        profile_id: profile.id,
        briefing_date: briefingDate,
        content: textWithFooter,
        delivery_status: "sent",
        sent_at: new Date().toISOString(),
        quality_score: score?.score ?? null,
        quality_grade: score?.grade ?? null,
        quality_issues: score?.issues ?? null,
      },
      { onConflict: "profile_id,briefing_date" }
    );

    // Detect sustained scorer outages. A Haiku timeout or quota issue can wipe
    // the quality_score column across many briefings without ever surfacing —
    // the trend dashboard degrades invisibly. When the just-persisted briefing
    // is null-scored and the four immediately-prior briefings are also null
    // (and the 5th-back IS scored, marking the boundary so we alert exactly
    // once per outage), fire an info-level Slack ping. (audit v3 P1-B3)
    if (!degraded && (score === null || scorerThrew)) {
      try {
        const { data: recent } = await supabase
          .from("morning_briefings")
          .select("quality_score")
          .eq("delivery_status", "sent")
          .order("sent_at", { ascending: false })
          .limit(6);
        const rows = recent ?? [];
        const topFiveAllNull =
          rows.length >= 5 &&
          rows.slice(0, 5).every((r) => r.quality_score === null);
        const sixthScored = rows.length >= 6 && rows[5].quality_score !== null;
        const onlyFiveExist = rows.length === 5;
        if (topFiveAllNull && (sixthScored || onlyFiveExist)) {
          await notifySlack(
            `Briefing quality scorer (Haiku) has returned null on the last 5 briefings — trend dashboard is degrading silently. Check Anthropic status.`,
            "info"
          ).catch(() => {});
        }
      } catch (err) {
        console.error("scorer-streak check failed", err instanceof Error ? err.message : err);
      }
    }

    // PII: edge-function logs are viewable by anyone with the Supabase project
    // role — broader access than Slack. Identify profiles by UUID only. (V7 P0-2)
    console.log(`[${source}] Sent briefing to profile ${profile.id}`);
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
      `Briefing failed all retries for profile ${profile.id} ` +
        `(source: ${source}): ${msg}`,
      "critical"
    );

    return { status: "failed", error: msg };
  }
}
