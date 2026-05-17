/**
 * POST /api/sms/inbound
 * Twilio inbound SMS webhook. Validates signature, then routes the texter:
 *   - Brand-new number → mints a profile (phone number IS the auth) and starts
 *     the SMS onboarding conversation.
 *   - Mid-onboarding profile (step 0–8) → advances the onboarding state machine
 *     in sms-onboarding.ts.
 *   - Onboarded profile (step 9) → conversation-aware Claude Q&A.
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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function formatCalendar(events: CalendarEventRow[] | null | undefined): string | null {
  if (!events || events.length === 0) return "(no events today)";
  return events.map((e) => `  ${formatTime(e.start_time)} — ${e.title}`).join("\n");
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

  if (!fromNumber) {
    return twimlReply("Hi! Text us from the number you signed up with.");
  }

  // ── 2. STOP guard — Twilio handles unsubscribe at carrier level, but we
  //    honor it in-route too and return empty TwiML (no reply sent) ───────────
  if (/^(STOP|STOPALL|UNSUBSCRIBE|CANCEL|END|QUIT)$/i.test(messageBody)) {
    return twimlEmpty();
  }

  // ── 3. Rate limit ──────────────────────────────────────────────────────────
  const rl = await checkRateLimit(fromNumber, "sms");
  if (!rl.allowed) {
    return twimlReply("You're sending messages too fast. Try again in an hour.");
  }

  const supabase = createAdminClient();

  // ── 4. Profile lookup ──────────────────────────────────────────────────────
  let profileRow: OnboardingProfile | null = null;
  {
    const { data } = await supabase
      .from("profiles")
      .select("id, family_name, household_id, onboarding_step, onboarding_completed, context_notes, partner_phone_pending")
      .eq("phone_number", fromNumber)
      .single<OnboardingProfile>();
    profileRow = data;
  }

  // ── 5. New texter — create their profile and start SMS onboarding ──────────
  // The phone number IS the auth: no signup form, no password, no OTP. A
  // first text in mints the account.
  if (!profileRow) {
    profileRow = await createOnboardingProfile(supabase, fromNumber);
    if (!profileRow) {
      return twimlReply(
        "Something went wrong getting you set up. Please try texting again in a minute."
      );
    }
  }

  // ── 6. Log inbound (capture row id for household-context provenance) ───────
  const { data: inboundRow } = await supabase
    .from("sms_conversations")
    .insert({
      profile_id: profileRow.id,
      direction: "inbound",
      body: messageBody,
      from_number: fromNumber,
      to_number: process.env.TWILIO_PHONE_NUMBER ?? "",
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  const step = profileRow.onboarding_step ?? 0;
  const profileName = profileRow.family_name ?? "there";

  // ── 7. SMS onboarding (steps 0–9) ─────────────────────────────────────────
  // All onboarding happens here over text. step 10 = complete; once there, the
  // texter falls through to conversation-aware Q&A below. handleSmsOnboarding
  // is itself conversational: an off-script question asked mid-flow is answered
  // by the LLM and the current step re-prompted, so the texter never has to
  // wait until onboarding ends to get an answer.
  if (!profileRow.onboarding_completed && step < 10) {
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

  const partnerEventsQuery = partnerProfileId
    ? supabase
        .from("calendar_events")
        .select("title, start_time, end_time")
        .eq("profile_id", partnerProfileId)
        .gte("start_time", `${today}T00:00:00Z`)
        .lte("start_time", `${today}T23:59:59Z`)
        .is("deleted_at", null)
        .order("start_time", { ascending: true })
        .limit(10)
    : Promise.resolve({ data: null as CalendarEventRow[] | null });

  const [
    { data: myEvents },
    { data: partnerEvents },
    { data: todaysBriefingRow },
    { data: smsHistory },
  ] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("title, start_time, end_time")
      .eq("profile_id", profileRow.id)
      .gte("start_time", `${today}T00:00:00Z`)
      .lte("start_time", `${today}T23:59:59Z`)
      .is("deleted_at", null)
      .order("start_time", { ascending: true })
      .limit(10) as unknown as Promise<{ data: CalendarEventRow[] | null }>,
    partnerEventsQuery as unknown as Promise<{ data: CalendarEventRow[] | null }>,
    supabase
      .from("morning_briefings")
      .select("content")
      .eq("profile_id", profileRow.id)
      .eq("briefing_date", today)
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
      .limit(SMS_HISTORY_LIMIT + 1) as unknown as Promise<{ data: SmsHistoryRow[] | null }>,
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
    today_calendar: formatCalendar(myEvents),
    partner_today_calendar: partnerProfileId ? formatCalendar(partnerEvents) : null,
    morning_briefing: todaysBriefingRow?.content ?? null,
    context_notes: profileRow.context_notes,
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
  await supabase.from("sms_conversations").insert({
    profile_id: profileRow.id,
    direction: "outbound",
    body: reply,
    from_number: process.env.TWILIO_PHONE_NUMBER ?? "",
    to_number: fromNumber,
  });

  // ── 14. Learn household context from this exchange ────────────────────────
  // Fire-and-forget so it adds zero latency to the SMS reply. Awaiting a second
  // Claude call here would risk Twilio's 15s webhook timeout.
  // analyzeConversationForContext swallows all of its own errors.
  void analyzeConversationForContext(
    supabase,
    profileRow.id,
    messageBody,
    reply,
    inboundRow?.id ?? null
  );

  return twimlReply(reply);
}
