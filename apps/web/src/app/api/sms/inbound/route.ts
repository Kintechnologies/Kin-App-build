/**
 * POST /api/sms/inbound
 * Twilio inbound SMS webhook. Validates signature, looks up profile by phone
 * number, assembles calendar context, and replies via TwiML.
 *
 * Pattern: synchronous — Claude call completes before response is returned.
 * Twilio's webhook timeout is 15 seconds; Claude SMS replies are typically
 * 2–8 seconds. If Claude times out, a fallback TwiML message is returned.
 *
 * Security: Twilio signature validation is the first check. Any request that
 * fails validation gets 403 before any database work happens.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient, ANTHROPIC_MODEL } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateTwilioRequest, twimlReply } from "@/lib/twilio";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarEventRow {
  title: string;
  start_time: string;
  end_time: string | null;
}

interface ProfileRow {
  id: string;
  family_name: string | null;
  household_id: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────��───────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

async function buildCalendarContext(
  supabase: ReturnType<typeof createAdminClient>,
  profileId: string,
  partnerProfileId: string | null,
  profileName: string,
  partnerName: string | null
): Promise<string> {
  const today = new Date().toISOString().split("T")[0];

  const queries: Promise<{ data: CalendarEventRow[] | null }>[] = [
    supabase
      .from("calendar_events")
      .select("title, start_time, end_time")
      .eq("profile_id", profileId)
      .gte("start_time", `${today}T00:00:00Z`)
      .lte("start_time", `${today}T23:59:59Z`)
      .is("deleted_at", null)
      .order("start_time", { ascending: true })
      .limit(10) as any,
  ];

  if (partnerProfileId) {
    queries.push(
      supabase
        .from("calendar_events")
        .select("title, start_time, end_time")
        .eq("profile_id", partnerProfileId)
        .gte("start_time", `${today}T00:00:00Z`)
        .lte("start_time", `${today}T23:59:59Z`)
        .is("deleted_at", null)
        .order("start_time", { ascending: true })
        .limit(10) as any
    );
  }

  const results = await Promise.all(queries);
  const myEvents = results[0]?.data ?? [];
  const partnerEvents = partnerProfileId ? (results[1]?.data ?? []) : [];

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  let ctx = `Today is ${dateStr}.\n\n`;

  if (myEvents.length > 0) {
    ctx += `${profileName}'s schedule:\n`;
    for (const e of myEvents) {
      ctx += `  ${formatTime(e.start_time)} — ${e.title}\n`;
    }
  } else {
    ctx += `${profileName}'s calendar is clear today.\n`;
  }

  if (partnerProfileId && partnerName) {
    ctx += "\n";
    if (partnerEvents.length > 0) {
      ctx += `${partnerName}'s schedule:\n`;
      for (const e of partnerEvents) {
        ctx += `  ${formatTime(e.start_time)} — ${e.title}\n`;
      }
    } else {
      ctx += `${partnerName}'s calendar is clear today.\n`;
    }
  }

  return ctx;
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // ── 1. Twilio signature validation (must be first) ─────────────────────────
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

  // ── 2. Rate limit by phone number ─────────────────────────────────────────
  const rl = await checkRateLimit(fromNumber, "sms");
  if (!rl.allowed) {
    return twimlReply("You're sending messages too fast. Try again in an hour.");
  }

  const supabase = createAdminClient();

  // ── 3. Profile lookup by phone number ─────────────────────────────────────
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("id, family_name, household_id")
    .eq("phone_number", fromNumber)
    .single<ProfileRow>();

  // ── 4. Log inbound message ─────────────────────────────────────────────────
  await supabase.from("sms_conversations").insert({
    profile_id: profileRow?.id ?? null,
    direction: "inbound",
    body: messageBody,
    from_number: fromNumber,
    to_number: process.env.TWILIO_PHONE_NUMBER ?? "",
  });

  // ── 5. Unknown sender ──────────────────────────────────────────────────────
  if (!profileRow) {
    const reply =
      "Hi! This is Kin. Sign up at kinai.family to connect your family calendar and get your daily briefing.";
    await supabase.from("sms_conversations").insert({
      profile_id: null,
      direction: "outbound",
      body: reply,
      from_number: process.env.TWILIO_PHONE_NUMBER ?? "",
      to_number: fromNumber,
    });
    return twimlReply(reply);
  }

  // ── 6. Build context and call Claude ──────────────────────────────────────
  const primaryId = profileRow.household_id ?? profileRow.id;
  const profileName = profileRow.family_name ?? "You";

  // Resolve partner profile ID
  let partnerProfileId: string | null = null;
  let partnerName: string | null = null;

  if (profileRow.household_id) {
    // This user is partner_b — primary is household_id
    partnerProfileId = profileRow.household_id;
  } else {
    // This user is partner_a — find partner_b
    const { data: partnerRow } = await supabase
      .from("profiles")
      .select("id, family_name")
      .eq("household_id", profileRow.id)
      .single<{ id: string; family_name: string | null }>();
    partnerProfileId = partnerRow?.id ?? null;
    partnerName = partnerRow?.family_name ?? null;
  }

  // If we found partner_a's partner above, use their name; else look it up
  if (!partnerName && partnerProfileId) {
    const { data: pRow } = await supabase
      .from("profiles")
      .select("family_name")
      .eq("id", partnerProfileId)
      .single<{ family_name: string | null }>();
    partnerName = pRow?.family_name ?? "your partner";
  }

  let calendarContext = "";
  try {
    calendarContext = await buildCalendarContext(
      supabase,
      profileRow.id,
      partnerProfileId,
      profileName,
      partnerName
    );
  } catch (err) {
    console.error("Calendar context fetch failed:", err);
  }

  // ── 7. Generate Claude reply (12s timeout guard) ──────────────────────────
  let reply = "I hit a snag — try again in a moment.";

  try {
    const systemPrompt = `You are Kin, a family AI chief of staff. You are replying to an SMS message from ${profileName}. Reply in 1–3 sentences, plain text only, no bullet points or markdown. Be direct, warm, and specific. Focus on family coordination — schedules, pickups, logistics. Do not answer questions outside family coordination.`;

    const userMessage = calendarContext
      ? `[SCHEDULE CONTEXT]\n${calendarContext}\n\n[MESSAGE]\n${messageBody}`
      : messageBody;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await getAnthropicClient()
      .messages.create(
        {
          model: ANTHROPIC_MODEL,
          max_tokens: 150,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        },
        { signal: controller.signal }
      )
      .finally(() => clearTimeout(timeout));

    const first = response.content[0];
    if (first?.type === "text") {
      reply = first.text.trim().slice(0, 480);
    }
  } catch (err: any) {
    if (err?.name === "AbortError" || err?.message?.includes("abort")) {
      console.warn("Claude timeout for SMS inbound, using fallback reply");
    } else {
      console.error("Claude error in SMS inbound:", err);
    }
  }

  // ── 8. Log outbound and return TwiML ─────────────────────────────────────
  await supabase.from("sms_conversations").insert({
    profile_id: profileRow.id,
    direction: "outbound",
    body: reply,
    from_number: process.env.TWILIO_PHONE_NUMBER ?? "",
    to_number: fromNumber,
  });

  return twimlReply(reply);
}
