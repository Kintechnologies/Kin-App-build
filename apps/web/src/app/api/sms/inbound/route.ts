/**
 * POST /api/sms/inbound
 * Twilio inbound SMS webhook. Validates signature, then routes the texter:
 *   - Brand-new number → checked against the approved-numbers allowlist. If
 *     approved, mints a profile (phone number IS the auth) and starts the SMS
 *     onboarding conversation. If not, sends a warm waitlist reply and saves
 *     the number to sms_waitlist for an admin to approve later.
 *   - Mid-onboarding profile (step 0–10) → advances the onboarding state machine
 *     in sms-onboarding.ts.
 *   - Onboarded profile (step 11) → conversation-aware Claude Q&A.
 *
 * Pattern: synchronous — Claude reply completes before response is returned.
 * Twilio's webhook timeout is 15s; replies are typically 2–8s. AbortController
 * fires at 12s with a fallback message.
 *
 * Conversation memory:
 *   - Loads the last ~20 SMS exchanges from sms_conversations (this profile only)
 *   - Loads today's morning_briefings row as system context
 *   - Both parents' calendars are folded into the system prompt
 *
 * Security: Twilio signature validation is the first check. Prompt injection
 * defense lives in the SMS system prompt. STOP keywords return empty TwiML.
 */

import { waitUntil } from "@vercel/functions";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient, ANTHROPIC_MODEL } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateTwilioRequest, twimlReply, twimlEmpty } from "@/lib/twilio";
import { buildSmsSystemPrompt } from "@/lib/sms-system-prompt";
import { analyzeConversationForContext } from "@/lib/household-context";
import {
  handleSmsOnboarding,
  createOnboardingProfile,
  type OnboardingProfile,
} from "@/lib/sms-onboarding";
import {
  isNumberApproved,
  recordWaitlistContact,
  WAITLIST_MESSAGE,
} from "@/lib/sms-access";
import {
  findPendingWaitlistReply,
  handleWaitlistReply,
} from "@/lib/waitlist-sms";
import type Anthropic from "@anthropic-ai/sdk";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarEventRow {
  title: string;
  start_time: string;
  end_time: string | null;
}

interface SmsHistoryRow {
  direction: "inbound" | "outbound" | "outbound_failed";
  body: string;
  sent_at: string;
}

// How many recent SMS turns to include as conversation memory.
// 20 covers a full back-and-forth day; older context is dropped to keep tokens reasonable.
const SMS_HISTORY_LIMIT = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string, timezone: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  });
}

/**
 * The texter's local calendar date (YYYY-MM-DD). The morning-briefing edge
 * function fans out at 6am local and stores each briefing under the user's
 * LOCAL date — so the briefing lookup here must resolve "today" in that same
 * timezone. A UTC date misses the row whenever the user's local day differs
 * from UTC at request time. en-CA formats as YYYY-MM-DD.
 */
function getLocalDate(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatCalendar(events: CalendarEventRow[] | null | undefined, timezone: string): string | null {
  if (!events || events.length === 0) return "(no events today)";
  return events.map((e) => `  ${formatTime(e.start_time, timezone)} — ${e.title}`).join("\n");
}

/**
 * One-line description of how fresh the synced calendar is, fed to the system
 * prompt so Kin hedges instead of asserting stale schedule facts. `connRow` is
 * the most-recent calendar_connections row, or null when none is connected.
 */
function describeCalendarFreshness(
  connRow: { last_synced_at: string | null } | null
): string {
  if (!connRow) {
    return (
      "No calendar is connected for this family — you have NO schedule data. " +
      "Do not reference, assume, or invent any events; suggest connecting a calendar instead."
    );
  }
  if (!connRow.last_synced_at) {
    return "A calendar is connected but has not synced yet — treat all schedule data as unconfirmed.";
  }
  const ageMs = Date.now() - new Date(connRow.last_synced_at).getTime();
  const mins = Math.max(0, Math.round(ageMs / 60000));
  let rel: string;
  if (mins < 2) rel = "just now";
  else if (mins < 60) rel = `about ${mins} minutes ago`;
  else if (mins < 60 * 24) {
    const hrs = Math.round(mins / 60);
    rel = `about ${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  } else {
    const days = Math.round(mins / (60 * 24));
    rel = `about ${days} day${days === 1 ? "" : "s"} ago`;
  }
  const staleNote =
    ageMs > 6 * 60 * 60 * 1000
      ? " That is old enough that events may have changed — hedge accordingly."
      : "";
  return `This family's calendar was last synced ${rel}.${staleNote}`;
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // ── 1. Twilio signature validation ─────────────────────────────────────────
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.error("TWILIO_AUTH_TOKEN is not set");
    return new Response("Server configuration error", { status: 500 });
  }

  const rawBody = await request.text();
  const params: Record<string, string> = {};
  new URLSearchParams(rawBody).forEach((v, k) => { params[k] = v; });

  const signature = request.headers.get("x-twilio-signature") ?? "";
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("host") ?? "";
  const webhookUrl = `${proto}://${host}/api/sms/inbound`;

  if (!validateTwilioRequest(signature, webhookUrl, params)) {
    return new Response("Forbidden", { status: 403 });
  }

  const fromNumber = params["From"] ?? "";
  const messageBody = (params["Body"] ?? "").trim();
  // Carrier keyword normalization: STOP/HELP/START variants often arrive with
  // trailing punctuation ("STOP.", "HELP!") or a single trailing word
  // ("stop please"). Twilio's carrier-side opt-out catches the bare token,
  // but our `sms_opted_out_at` stamp only fires on the exact regex below — so
  // a variant lets the user opt out at the carrier without us recording it,
  // and engagement-nudges keeps texting them. Normalize the first whitespace-
  // separated token, stripping trailing punctuation.
  const messageKeyword = messageBody
    .split(/\s+/)[0]
    .replace(/[.,!?;:]+$/, "");
  // Twilio's request UUID. Stable across retries of the same upstream message —
  // used below as the idempotency key for the Claude-bound paths.
  const messageSid = params["MessageSid"] ?? "";

  if (!fromNumber) {
    return twimlReply("Hi! Text us from the number you signed up with.");
  }

  const supabase = createAdminClient();

  // ── 2. Idempotency — Twilio retries (5xx / network failure, default 3
  //    attempts) re-POST with the same MessageSid. STOP / HELP / INFO / START
  //    used to live above this lookup because their DB writes are individually
  //    idempotent — but HELP and START re-emit a billed outbound segment on
  //    every retry. Moving the cache check above the keyword handlers (and
  //    persisting their sid + outbound below) means a Twilio retry of a HELP
  //    or START hits the cache and replays the prior outbound from the DB
  //    instead of generating a new one. ─────────────────────────────────────
  if (messageSid) {
    const { data: priorInbound } = await supabase
      .from("sms_conversations")
      .select("id, profile_id, sent_at")
      .eq("twilio_message_sid", messageSid)
      .eq("direction", "inbound")
      .maybeSingle<{ id: string; profile_id: string | null; sent_at: string }>();

    if (priorInbound) {
      // Find the outbound reply emitted for this turn. Prefer the explicit
      // replied_to_id FK (v5 P2-S2) so two inbound messages within the same
      // second can't mis-pair via time-order; fall back to the legacy
      // sent_at-ordered query for rows written before migration 071.
      const { data: pairedReply } = await supabase
        .from("sms_conversations")
        .select("body")
        .eq("replied_to_id", priorInbound.id)
        .eq("direction", "outbound")
        .order("sent_at", { ascending: true })
        .limit(1)
        .maybeSingle<{ body: string }>();
      if (pairedReply?.body) return twimlReply(pairedReply.body);

      if (priorInbound.profile_id) {
        const { data: cachedReply } = await supabase
          .from("sms_conversations")
          .select("body")
          .eq("profile_id", priorInbound.profile_id)
          .eq("direction", "outbound")
          .gte("sent_at", priorInbound.sent_at)
          .order("sent_at", { ascending: true })
          .limit(1)
          .maybeSingle<{ body: string }>();
        if (cachedReply?.body) return twimlReply(cachedReply.body);
      }
      const { data: sidReply } = await supabase
        .from("sms_conversations")
        .select("body")
        .eq("twilio_message_sid", messageSid)
        .eq("direction", "outbound")
        .maybeSingle<{ body: string }>();
      if (sidReply?.body) return twimlReply(sidReply.body);
      // Inbound logged but no outbound yet (original handler crashed mid-flight,
      // or this is a duplicate of a non-profile-bound flow). Returning empty
      // TwiML is safer than re-running — the original attempt's TwiML response
      // already went back to Twilio on the first delivery, and re-doing the
      // work risks double-charging Claude. ─────────────────────────────────
      return twimlEmpty();
    }
  }

  // ── 2a. STOP guard — Twilio handles unsubscribe at carrier level, but we
  //    honor it in-route too and return empty TwiML (no reply sent) ───────────
  if (/^(STOP|STOPALL|UNSUBSCRIBE|CANCEL|END|QUIT)$/i.test(messageKeyword)) {
    // TCPA: stamp the opt-out on both sides — the waitlist row (so the
    // phone-first marketing flow never re-texts the number) AND the profile
    // (so briefings, nudges, alerts, and check-ins all suppress this user).
    // Both are scoped to rows that are not already opted out so re-sending
    // STOP doesn't refresh the timestamp.
    const optedOutAt = new Date().toISOString();
    try {
      await Promise.all([
        supabase
          .from("waitlist")
          .update({ sms_opted_out_at: optedOutAt })
          .eq("phone", fromNumber)
          .is("sms_opted_out_at", null),
        supabase
          .from("profiles")
          .update({ sms_opted_out_at: optedOutAt })
          .eq("phone_number", fromNumber)
          .is("sms_opted_out_at", null),
      ]);
      // Persist a sid-tagged inbound so the next retry hits the cache and we
      // don't re-run the opt-out update. No outbound row — STOP returns empty
      // TwiML, and the cache-hit path returns empty TwiML when no outbound is
      // found for the sid.
      if (messageSid) {
        await supabase.from("sms_conversations").insert({
          profile_id: null,
          direction: "inbound",
          body: messageBody,
          from_number: fromNumber,
          to_number: process.env.TWILIO_PHONE_NUMBER ?? "",
          twilio_message_sid: messageSid,
        });
      }
    } catch (err) {
      console.error("Failed to record SMS opt-out:", err);
    }
    return twimlEmpty();
  }

  // ── 2b. HELP / INFO — carrier-required keyword response. Onboarding consent
  //    promises these work, and US carriers require an immediate, plain-text
  //    response identifying the program and pointing to the opt-out path. The
  //    inbound + outbound are sid-tagged so a Twilio retry hits the cache
  //    instead of billing a new segment for the same MessageSid.
  if (/^(HELP|INFO)$/i.test(messageKeyword)) {
    const helpReply =
      "Kin Family AI. Daily morning briefing for parents. " +
      "Help: kinai.family · email hello@kinai.family · reply STOP to unsubscribe. " +
      "Msg & data rates may apply.";
    if (messageSid) {
      try {
        const { data: helpInbound } = await supabase
          .from("sms_conversations")
          .insert({
            profile_id: null,
            direction: "inbound",
            body: messageBody,
            from_number: fromNumber,
            to_number: process.env.TWILIO_PHONE_NUMBER ?? "",
            twilio_message_sid: messageSid,
          })
          .select("id")
          .maybeSingle<{ id: string }>();
        await supabase.from("sms_conversations").insert({
          profile_id: null,
          direction: "outbound",
          body: helpReply,
          from_number: process.env.TWILIO_PHONE_NUMBER ?? "",
          to_number: fromNumber,
          twilio_message_sid: messageSid,
          replied_to_id: helpInbound?.id ?? null,
        });
      } catch (err) {
        console.error("Failed to record HELP/INFO turn:", err);
      }
    }
    return twimlReply(helpReply);
  }

  // ── 2c. START / UNSTOP — opt-back-in path. Mirror of STOP: clears
  //    sms_opted_out_at on both waitlist and profiles, then confirms. ─────────
  if (/^(START|UNSTOP)$/i.test(messageKeyword)) {
    const startReply =
      "Welcome back! You've been re-subscribed to Kin messages.";
    try {
      await Promise.all([
        supabase
          .from("waitlist")
          .update({ sms_opted_out_at: null })
          .eq("phone", fromNumber)
          .not("sms_opted_out_at", "is", null),
        supabase
          .from("profiles")
          .update({ sms_opted_out_at: null })
          .eq("phone_number", fromNumber)
          .not("sms_opted_out_at", "is", null),
      ]);
      if (messageSid) {
        const { data: startInbound } = await supabase
          .from("sms_conversations")
          .insert({
            profile_id: null,
            direction: "inbound",
            body: messageBody,
            from_number: fromNumber,
            to_number: process.env.TWILIO_PHONE_NUMBER ?? "",
            twilio_message_sid: messageSid,
          })
          .select("id")
          .maybeSingle<{ id: string }>();
        await supabase.from("sms_conversations").insert({
          profile_id: null,
          direction: "outbound",
          body: startReply,
          from_number: process.env.TWILIO_PHONE_NUMBER ?? "",
          to_number: fromNumber,
          twilio_message_sid: messageSid,
          replied_to_id: startInbound?.id ?? null,
        });
      }
    } catch (err) {
      console.error("Failed to clear SMS opt-out:", err);
    }
    return twimlReply(startReply);
  }

  // ── 2d. In-flight idempotency sentinel (v5 P2-S5) ─────────────────────────
  //    Cache check at step 2 reads sms_conversations for a prior inbound with
  //    this MessageSid, but the row is only inserted after profile lookup +
  //    rate limit + (heavy) onboarding/Claude work. A Twilio retry arriving
  //    during that window sees no prior row and re-runs the work — billing
  //    Claude twice. Pre-insert a sentinel row (profile_id NULL) as soon as
  //    we know we're not a keyword reply; later steps UPDATE it with the
  //    profile_id instead of INSERTing a fresh row. A concurrent retry that
  //    races the sentinel insert hits the partial unique index from migration
  //    062, falls through to the conflict handler, and returns empty TwiML.
  let sentinelInboundId: string | null = null;
  if (messageSid) {
    const sentinel = await supabase
      .from("sms_conversations")
      .insert({
        profile_id: null,
        direction: "inbound",
        body: messageBody,
        from_number: fromNumber,
        to_number: process.env.TWILIO_PHONE_NUMBER ?? "",
        twilio_message_sid: messageSid,
      })
      .select("id")
      .maybeSingle<{ id: string }>();
    if (sentinel.error?.code === "23505") {
      // A concurrent attempt got the sentinel first — the other invocation
      // is doing the work. Return empty TwiML; the caller can retry once the
      // original commits its outbound row.
      return twimlEmpty();
    }
    sentinelInboundId = sentinel.data?.id ?? null;
  }

  // ── 3. Rate limit ──────────────────────────────────────────────────────────
  const rl = await checkRateLimit(fromNumber, "sms");
  if (!rl.allowed) {
    return twimlReply("You're sending messages too fast. Try again in an hour.");
  }

  // ── 4. Profile lookup ──────────────────────────────────────────────────────
  let profileRow: OnboardingProfile | null = null;
  {
    const { data } = await supabase
      .from("profiles")
      .select("id, family_name, household_id, onboarding_step, onboarding_completed, context_notes, partner_phone_pending, timezone, sunday_checkin_sent_at, sunday_checkin_reply_at")
      .eq("phone_number", fromNumber)
      .single<OnboardingProfile>();
    profileRow = data;
  }

  // ── 5. New texter — gate on the approved-numbers allowlist ─────────────────
  // Kin's SMS beta is invite-only. An existing profile means the number was
  // already let in, so it skips this check entirely. A brand-new number must
  // be on the approved list to onboard; anyone else gets a warm waitlist reply
  // and has their number saved to sms_waitlist for an admin to approve later.
  if (!profileRow) {
    // Phone-first kinai.family waitlist reply? Such a signup texts only their
    // phone on the marketing site, gets a confirmation SMS, then replies here
    // with their name + email. They have no profile — this is checked before
    // the SMS-beta allowlist so a waitlist reply isn't mistaken for a cold
    // inbound to the beta.
    const pendingWaitlist = await findPendingWaitlistReply(supabase, fromNumber);
    if (pendingWaitlist) {
      return handleWaitlistReply(supabase, pendingWaitlist, messageBody);
    }

    const approved = await isNumberApproved(supabase, fromNumber);
    if (!approved) {
      await recordWaitlistContact(supabase, fromNumber, messageBody);
      return twimlReply(WAITLIST_MESSAGE);
    }

    // Approved — the phone number IS the auth: no signup form, no password, no
    // OTP. A first text in mints the account.
    profileRow = await createOnboardingProfile(supabase, fromNumber);
    if (!profileRow) {
      return twimlReply(
        "Something went wrong getting you set up. Please try texting again in a minute."
      );
    }
  }

  // ── 6. Stamp inbound with profile_id ───────────────────────────────────────
  // The row was pre-inserted as a sentinel at step 2d (with profile_id NULL)
  // to close the in-flight race window. Update it with the resolved
  // profile_id now that profile lookup is done. The legacy INSERT path is
  // kept for the no-MessageSid case (paranoid: real Twilio inbound always
  // has one, but local tests sometimes don't).
  let inboundRow: { id: string } | null = null;
  if (sentinelInboundId) {
    await supabase
      .from("sms_conversations")
      .update({ profile_id: profileRow.id })
      .eq("id", sentinelInboundId);
    inboundRow = { id: sentinelInboundId };
  } else {
    const inboundInsert = await supabase
      .from("sms_conversations")
      .insert({
        profile_id: profileRow.id,
        direction: "inbound",
        body: messageBody,
        from_number: fromNumber,
        to_number: process.env.TWILIO_PHONE_NUMBER ?? "",
        twilio_message_sid: messageSid || null,
      })
      .select("id")
      .maybeSingle<{ id: string }>();

    if (inboundInsert.error?.code === "23505" && messageSid) {
      const { data: priorInbound } = await supabase
        .from("sms_conversations")
        .select("profile_id, sent_at")
        .eq("twilio_message_sid", messageSid)
        .eq("direction", "inbound")
        .maybeSingle<{ profile_id: string | null; sent_at: string }>();
      if (priorInbound?.profile_id) {
        const { data: cachedReply } = await supabase
          .from("sms_conversations")
          .select("body")
          .eq("profile_id", priorInbound.profile_id)
          .eq("direction", "outbound")
          .gte("sent_at", priorInbound.sent_at)
          .order("sent_at", { ascending: true })
          .limit(1)
          .maybeSingle<{ body: string }>();
        if (cachedReply?.body) return twimlReply(cachedReply.body);
      }
      return twimlEmpty();
    }
    inboundRow = inboundInsert.data;
  }

  // ── 6b. Capture a Sunday check-in reply ───────────────────────────────────
  // If this onboarded user got a weekly Sunday check-in text in the last 24h
  // and hasn't replied to it yet, treat this message as that reply: store it as
  // a context note (TTL'd) so the next morning briefing can fold in whatever
  // they shared about the week ahead. Only the first reply is captured —
  // sunday_checkin_reply_at is the latch. The normal conversation flow below
  // still runs, so Kin also answers warmly.
  if (
    profileRow.onboarding_completed &&
    profileRow.sunday_checkin_sent_at &&
    !profileRow.sunday_checkin_reply_at &&
    Date.now() - new Date(profileRow.sunday_checkin_sent_at).getTime() <
      24 * 60 * 60 * 1000 &&
    messageBody.length > 0
  ) {
    await supabase.from("user_context_notes").insert({
      profile_id: profileRow.id,
      source: "sunday_checkin",
      content: messageBody,
    });
    await supabase
      .from("profiles")
      .update({ sunday_checkin_reply_at: new Date().toISOString() })
      .eq("id", profileRow.id);
  }

  const step = profileRow.onboarding_step ?? 0;
  const profileName = profileRow.family_name ?? "there";

  // ── 7. SMS onboarding (steps 0–10) ────────────────────────────────────────
  // All onboarding happens here over text. step 11 = complete; once there, the
  // texter falls through to conversation-aware Q&A below. handleSmsOnboarding
  // is itself conversational: an off-script question asked mid-flow is answered
  // by the LLM and the current step re-prompted, so the texter never has to
  // wait until onboarding ends to get an answer.
  if (!profileRow.onboarding_completed && step < 11) {
    return handleSmsOnboarding(supabase, profileRow, fromNumber, messageBody, step);
  }

  // ── 8. Resolve partner profile ────────────────────────────────────────────
  let partnerProfileId: string | null = null;
  let partnerName: string | null = null;

  if (profileRow.household_id) {
    // This profile is the partner; the primary IS the partner.
    partnerProfileId = profileRow.household_id;
    const { data: pRow } = await supabase
      .from("profiles")
      .select("family_name")
      .eq("id", profileRow.household_id)
      .single<{ family_name: string | null }>();
    partnerName = pRow?.family_name ?? null;
  } else {
    // This profile is the primary; partner has household_id pointing to us.
    const { data: pRow } = await supabase
      .from("profiles")
      .select("id, family_name")
      .eq("household_id", profileRow.id)
      .single<{ id: string; family_name: string | null }>();
    partnerProfileId = pRow?.id ?? null;
    partnerName = pRow?.family_name ?? null;
  }

  // ── 9. Fetch calendar context, today's briefing, and conversation history ─
  const today = new Date().toISOString().split("T")[0];
  // Today's window in UTC, used for the "events touching today" filter below.
  // Multi-day all-day events (vacations, school breaks, custody weeks) start on
  // their first day and END on the day AFTER the last day (Google's exclusive
  // end.date convention), so we must include any event whose interval overlaps
  // today — not just events whose start_time falls inside today. (audit v4 P0-7)
  const todayStart = `${today}T00:00:00Z`;
  const todayEnd = `${today}T23:59:59Z`;

  // The morning briefing is stored by the edge function under the user's LOCAL
  // date — look it up with the same timezone-resolved date, not the UTC `today`
  // used for the calendar windows. profiles.timezone is NOT NULL DEFAULT 'UTC'.
  const profileTimezone = profileRow.timezone ?? "America/Los_Angeles";
  const briefingDate = getLocalDate(profileTimezone);

  const partnerEventsQuery = partnerProfileId
    ? supabase
        .from("calendar_events")
        .select("title, start_time, end_time")
        .eq("profile_id", partnerProfileId)
        .lte("start_time", todayEnd)
        .or(`end_time.gt.${todayStart},end_time.is.null`)
        .is("deleted_at", null)
        .order("start_time", { ascending: true })
        .limit(10)
        .returns<CalendarEventRow[]>()
    : Promise.resolve({ data: null as CalendarEventRow[] | null });

  const [
    { data: myEvents },
    { data: partnerEvents },
    { data: todaysBriefingRow },
    { data: smsHistory },
    { data: calendarConn },
  ] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("title, start_time, end_time")
      .eq("profile_id", profileRow.id)
      .lte("start_time", todayEnd)
      .or(`end_time.gt.${todayStart},end_time.is.null`)
      .is("deleted_at", null)
      .order("start_time", { ascending: true })
      .limit(10)
      .returns<CalendarEventRow[]>(),
    partnerEventsQuery,
    supabase
      .from("morning_briefings")
      .select("content")
      .eq("profile_id", profileRow.id)
      .eq("briefing_date", briefingDate)
      .maybeSingle<{ content: string }>(),
    // Conversation history: most-recent N rows, then we reverse to chronological.
    // Exclude the just-inserted inbound row so it doesn't appear twice (we add it
    // explicitly as the final user message).
    supabase
      .from("sms_conversations")
      .select("direction, body, sent_at")
      .eq("profile_id", profileRow.id)
      .neq("direction", "outbound_failed")
      .order("sent_at", { ascending: false })
      .limit(SMS_HISTORY_LIMIT + 1)
      .returns<SmsHistoryRow[]>(),
    // Most recent calendar sync — drives the staleness hedge in the system
    // prompt. nullsFirst:false keeps a never-synced connection from outranking
    // a real timestamp.
    supabase
      .from("calendar_connections")
      .select("last_synced_at")
      .eq("profile_id", profileRow.id)
      .order("last_synced_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle<{ last_synced_at: string | null }>(),
  ]);

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // ── 10. Build the polished SMS system prompt ─────────────────────────────
  const systemPrompt = buildSmsSystemPrompt({
    family_name: profileRow.family_name ?? "this",
    speaking_to_name: profileName,
    partner_name: partnerName,
    today_date: dateStr,
    today_calendar: formatCalendar(myEvents, profileTimezone),
    partner_today_calendar: partnerProfileId ? formatCalendar(partnerEvents, profileTimezone) : null,
    morning_briefing: todaysBriefingRow?.content ?? null,
    context_notes: profileRow.context_notes,
    calendar_freshness: describeCalendarFreshness(calendarConn ?? null),
  });

  // ── 11. Build conversation memory ─────────────────────────────────────────
  // sms_conversations stores both directions in one stream. Map to Anthropic
  // alternating user/assistant turns (inbound = user, outbound = assistant).
  // The just-inserted inbound row is the most recent — drop it so we can append
  // the current message explicitly at the end.
  const historyDescending = smsHistory ?? [];
  const historyAscending = [...historyDescending].reverse();

  // Drop trailing inbound rows that match this exact message (defensive — the
  // most recent insert IS the current message; pop while last row matches).
  while (
    historyAscending.length > 0 &&
    historyAscending[historyAscending.length - 1].direction === "inbound" &&
    historyAscending[historyAscending.length - 1].body === messageBody
  ) {
    historyAscending.pop();
  }

  // Trim to last SMS_HISTORY_LIMIT turns.
  const trimmed = historyAscending.slice(-SMS_HISTORY_LIMIT);

  // Anthropic requires alternating roles. Collapse consecutive same-direction
  // rows by joining with newlines so the alternation invariant holds.
  const messages: Anthropic.MessageParam[] = [];
  for (const row of trimmed) {
    const role: "user" | "assistant" =
      row.direction === "inbound" ? "user" : "assistant";
    const last = messages[messages.length - 1];
    if (last && last.role === role) {
      last.content = `${last.content as string}\n${row.body}`;
    } else {
      messages.push({ role, content: row.body });
    }
  }

  // Anthropic requires the first message to be from the user. If our trimmed
  // window starts with an assistant turn (e.g. the morning briefing came first),
  // prepend a synthetic user marker so the API accepts the conversation.
  if (messages.length > 0 && messages[0].role === "assistant") {
    messages.unshift({ role: "user", content: "(start of conversation)" });
  }

  // Append the current inbound message. If the previous message in the window
  // is also "user", merge — otherwise push a new turn.
  const lastMsg = messages[messages.length - 1];
  if (lastMsg && lastMsg.role === "user") {
    lastMsg.content = `${lastMsg.content as string}\n${messageBody}`;
  } else {
    messages.push({ role: "user", content: messageBody });
  }

  // ── 12. Claude reply (12s timeout) ────────────────────────────────────────
  let reply = "I hit a snag — try again in a moment.";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await getAnthropicClient()
      .messages.create(
        {
          model: ANTHROPIC_MODEL,
          max_tokens: 250,
          system: systemPrompt,
          messages,
        },
        { signal: controller.signal }
      )
      .finally(() => clearTimeout(timeout));

    const first = response.content[0];
    if (first?.type === "text") reply = first.text.trim().slice(0, 320);
  } catch (err: unknown) {
    const e = err as { name?: string; message?: string };
    if (e?.name === "AbortError" || e?.message?.includes("abort")) {
      console.warn("Claude timeout for SMS inbound");
    } else {
      console.error("Claude error in SMS inbound:", err);
    }
  }

  // ── 13. Log outbound + return TwiML ───────────────────────────────────────
  // replied_to_id pins this outbound to the inbound it answered, so a Twilio
  // retry of a same-second sibling inbound can't mis-pair via the time-order
  // cache lookup (v5 P2-S2).
  await supabase.from("sms_conversations").insert({
    profile_id: profileRow.id,
    direction: "outbound",
    body: reply,
    from_number: process.env.TWILIO_PHONE_NUMBER ?? "",
    to_number: fromNumber,
    replied_to_id: inboundRow?.id ?? null,
  });

  // ── 14. Learn household context from this exchange ────────────────────────
  // Vercel terminates serverless execution on response return, so a naked
  // `void someAsync()` is killed before the second Claude call lands. waitUntil
  // hands the promise to the platform so it survives past the TwiML response
  // while still adding zero latency to the SMS reply. The function swallows
  // its own errors.
  waitUntil(
    analyzeConversationForContext(
      supabase,
      profileRow.id,
      messageBody,
      reply,
      inboundRow?.id ?? null
    )
  );

  return twimlReply(reply);
}
