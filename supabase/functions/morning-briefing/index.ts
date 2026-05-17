// Morning briefing cron — runs hourly (0 * * * *) and fans out to users
// whose local time is 6:00am–6:59am in their timezone.
//
// CRON SCHEDULE CHANGE REQUIRED in Supabase dashboard:
//   Old: 0 13 * * *  (fixed 6am PT only)
//   New: 0 * * * *   (hourly fan-out — checks each user's local hour)
//
// Required edge function secrets (set via Supabase dashboard → Edge Functions → Secrets):
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_SERVICE_SID, TWILIO_PHONE_NUMBER
// Optional:
//   OPENWEATHER_API_KEY — when set, briefings are enriched with a local
//   weather forecast. Absent or invalid keys degrade silently (no weather).

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
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

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

function getLocalHour(timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const h = parts.find((p) => p.type === "hour")?.value ?? "0";
  return parseInt(h, 10) % 24;
}

// Sent through the A2P 10DLC Messaging Service rather than a bare From number,
// so carrier delivery is tied to the registered A2P campaign. Sending from an
// unregistered long code fails US carrier filtering with error 30034
// ("message from an unregistered number").
async function sendSms(to: string, body: string): Promise<void> {
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
    throw new Error(`Twilio ${res.status}: ${err}`);
  }
}

async function logSms(
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

// Optional weather enrichment. Returns a one-line summary for the briefing
// context, or null on any failure — missing key, missing location, API error,
// or a timezone with no forecast blocks today. Never throws: a weather problem
// must never be able to break a briefing.
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

    // Forecast blocks are UTC; bucket them into the user's local calendar day.
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

    // Group consecutive 3-hour blocks with >=30% precipitation into windows.
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

// The day-7 payment nudge. Appended verbatim to the briefing so the LLM's
// 480-char message stays focused on the day's substance, and the ask is always
// phrased exactly as intended.
const PAYMENT_NUDGE =
  "It's been a week with Kin! Hope your mornings have been smoother. To keep your briefings going, " +
  "set up your payment here: kinai.family/dashboard. You can also add other family members or caregivers from there.";

async function generateBriefing(
  profileId: string,
  familyName: string,
  timezone: string,
  appendPaymentNudge: boolean
): Promise<string> {
  const today = new Date().toISOString().split("T")[0];

  const [
    { data: todayEvents },
    { data: activities },
    { data: petMeds },
    { data: schedule },
  ] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("title, start_time, location")
      .eq("profile_id", profileId)
      .gte("start_time", `${today}T00:00:00Z`)
      .lte("start_time", `${today}T23:59:59Z`)
      .order("start_time", { ascending: true }),
    supabase
      .from("children_activities")
      .select("name, start_time, day_of_week, family_member:family_members(name)")
      .eq("profile_id", profileId)
      .eq("active", true),
    supabase
      .from("pet_medications")
      .select("name, frequency, family_member:family_members(name)")
      .eq("profile_id", profileId)
      .eq("active", true),
    supabase
      .from("parent_schedules")
      .select("home_location")
      .eq("profile_id", profileId)
      .maybeSingle(),
  ]);

  const todayDayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayActivities = (activities ?? []).filter((a: any) =>
    (a.day_of_week ?? []).includes(todayDayName)
  );

  let ctx = `Family: ${familyName}\nDate: ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}\n\n`;

  if (todayEvents && todayEvents.length > 0) {
    ctx += "Today's calendar:\n";
    for (const e of todayEvents) {
      const t = new Date(e.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      ctx += `  ${t} ${e.title}${e.location ? ` @ ${e.location}` : ""}\n`;
    }
  } else {
    ctx += "Today's calendar: clear\n";
  }

  if (todayActivities.length > 0) {
    ctx += "\nKids' activities:\n";
    for (const a of todayActivities) {
      const t = a.start_time
        ? new Date(`2000-01-01T${a.start_time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
        : "time TBD";
      ctx += `  ${(a.family_member as any)?.name}: ${a.name} @ ${t}\n`;
    }
  }

  if (petMeds && petMeds.length > 0) {
    ctx += "\nPet medications due today:\n";
    for (const m of petMeds) {
      ctx += `  ${(m.family_member as any)?.name}: ${m.name} (${m.frequency})\n`;
    }
  }

  const weather = await fetchWeather(schedule?.home_location ?? null, timezone);
  if (weather) {
    ctx += `\n${weather}\n`;
  }

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
      system: `You are Kin, a family AI chief of staff sending a morning SMS briefing. Output plain text only — no bullet points, no markdown, no newlines. The entire message must be under 480 characters. Lead with the single most important thing that requires a decision or action today. If nothing is urgent, give a warm 1-sentence schedule overview. Be direct, warm, and specific. Do not start with "Good morning" or "Morning." — just the substance. If a weather line is present in the context, weave it in naturally only when it actually affects the day — tie it to a specific event rather than reporting it ("grab umbrellas before the 3pm soccer game", "it'll be 40°F at the bus stop, bundle the kids up"). Omit weather entirely when it is mild and uneventful; never include a standalone forecast.`,
      messages: [{ role: "user", content: ctx }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text: string = data.content?.[0]?.type === "text" ? data.content[0].text : "";
  const briefing = text.trim().slice(0, 480);
  return appendPaymentNudge ? `${briefing}\n\n${PAYMENT_NUDGE}` : briefing;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const today = new Date().toISOString().split("T")[0];

  // Fan-out: only profiles whose local hour is 6:xx and have a phone number
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, family_name, phone_number, timezone, created_at")
    .not("phone_number", "is", null)
    .eq("onboarding_completed", true);

  if (profileError) {
    console.error("Failed to fetch profiles:", profileError.message);
    return new Response(JSON.stringify({ error: profileError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!profiles || profiles.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const results = { processed: 0, sent: 0, skipped: 0, failed: 0, errors: [] as string[] };

  for (const profile of profiles) {
    const tz = profile.timezone ?? "America/Los_Angeles";
    const localHour = getLocalHour(tz);

    // Only send during the 6am hour in the user's timezone
    if (localHour !== 6) {
      results.skipped++;
      continue;
    }

    // Dedup guard: skip if already sent today
    const { data: existing } = await supabase
      .from("morning_briefings")
      .select("id, delivery_status")
      .eq("profile_id", profile.id)
      .eq("briefing_date", today)
      .single();

    if (existing?.delivery_status === "sent") {
      console.log(`Already sent to ${profile.id} today, skipping`);
      results.skipped++;
      continue;
    }

    results.processed++;

    // Day-7 trial nudge: once a profile is 7+ days old, append the payment
    // prompt. It runs day 7 onward (not just exactly day 7) so users who never
    // set up payment keep seeing the ask until they convert or churn.
    let daysSinceCreated = 0;
    if (profile.created_at) {
      daysSinceCreated = Math.floor(
        (Date.now() - new Date(profile.created_at).getTime()) / 86_400_000
      );
    }
    const appendPaymentNudge = daysSinceCreated >= 7;

    try {
      const briefingText = await generateBriefing(
        profile.id,
        profile.family_name ?? "Family",
        tz,
        appendPaymentNudge
      );

      await sendSms(profile.phone_number, briefingText);
      await logSms(profile.id, "outbound", briefingText, profile.phone_number);

      await supabase.from("morning_briefings").upsert(
        {
          profile_id: profile.id,
          briefing_date: today,
          content: briefingText,
          delivery_status: "sent",
          sent_at: new Date().toISOString(),
        },
        { onConflict: "profile_id,briefing_date" }
      );

      results.sent++;
      console.log(`Sent briefing to ${profile.family_name} (${profile.id})`);
    } catch (err) {
      results.failed++;
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`${profile.id}: ${msg}`);
      console.error(`Failed for ${profile.id}:`, msg);

      // Log the failure so we have an audit trail
      await logSms(profile.id, "outbound_failed", `[briefing generation failed: ${msg}]`, profile.phone_number).catch(() => {});
      await supabase.from("morning_briefings").upsert(
        {
          profile_id: profile.id,
          briefing_date: today,
          content: "",
          delivery_status: "failed",
        },
        { onConflict: "profile_id,briefing_date" }
      );
    }
  }

  console.log("Morning briefing batch:", results);
  return new Response(JSON.stringify(results), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
