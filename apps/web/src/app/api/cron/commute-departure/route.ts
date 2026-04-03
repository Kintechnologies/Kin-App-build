/**
 * D4 — Commute Departure Push Notification
 * GET /api/cron/commute-departure
 *
 * Runs every 5 minutes via Vercel cron.
 * For each user with a home + work location set, calculates the leave-by time
 * for their first upcoming calendar event today. If the current time falls
 * within the 15-minute departure window AND no push has been sent today,
 * sends an Expo push notification and records the send date.
 *
 * Send window: [leave_by_time - 20 min, leave_by_time - 10 min]
 * This window is wide enough to guarantee the 5-minute cron catches it.
 * Max one departure notification per user per calendar day.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  fetchCommuteDuration,
  calculateLeaveByTime,
} from "@/lib/commute";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// Departure window: send the push between 20 and 10 minutes before leave-by time
const WINDOW_EARLY_MINUTES = 20;
const WINDOW_LATE_MINUTES = 10;

interface ParentScheduleRow {
  profile_id: string;
  home_location: string | null;
  work_location: string | null;
  commute_mode: string | null;
  commute_departure_notified_date: string | null;
}

interface CalendarEventRow {
  start_time: string;
  title: string;
  location?: string;
}

interface PushTokenRow {
  token: string;
}

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string>
): Promise<void> {
  if (tokens.length === 0) return;

  const messages = tokens.map((token) => ({
    to: token,
    sound: "default",
    title,
    body,
    data,
    priority: "high",
  }));

  await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });
}

/**
 * Returns true if `nowMs` falls within [leaveByMs - earlyMs, leaveByMs - lateMs].
 */
function isInDepartureWindow(
  nowMs: number,
  leaveByMs: number
): boolean {
  const windowStart = leaveByMs - WINDOW_EARLY_MINUTES * 60 * 1000;
  const windowEnd = leaveByMs - WINDOW_LATE_MINUTES * 60 * 1000;
  return nowMs >= windowStart && nowMs <= windowEnd;
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminSupabase();
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const nowMs = now.getTime();

  let notified = 0;
  let skipped = 0;

  // 1. Fetch all parent schedules with locations configured
  const { data: schedules, error: schedulesError } = await supabase
    .from("parent_schedules")
    .select(
      "profile_id, home_location, work_location, commute_mode, commute_departure_notified_date"
    )
    .not("home_location", "is", null)
    .not("work_location", "is", null)
    .returns<ParentScheduleRow[]>();

  if (schedulesError || !schedules) {
    return NextResponse.json(
      { error: "Failed to fetch schedules" },
      { status: 500 }
    );
  }

  for (const schedule of schedules) {
    try {
      // 2. Skip if already notified today
      if (schedule.commute_departure_notified_date === todayStr) {
        skipped++;
        continue;
      }

      // 3. Skip if commute mode is remote (no travel needed)
      if (schedule.commute_mode === "remote") {
        skipped++;
        continue;
      }

      // 4. Get the next upcoming calendar event today
      const { data: events } = await supabase
        .from("calendar_events")
        .select("start_time, title, location")
        .eq("profile_id", schedule.profile_id)
        .gte("start_time", now.toISOString()) // only future events
        .lte("start_time", `${todayStr}T23:59:59Z`)
        .order("start_time", { ascending: true })
        .limit(1)
        .returns<CalendarEventRow[]>();

      if (!events || events.length === 0) {
        skipped++;
        continue;
      }

      const firstEvent = events[0];

      // 5. Calculate commute duration
      const commuteResult = await fetchCommuteDuration(
        schedule.home_location!,
        schedule.work_location!,
        schedule.commute_mode
      );

      if (!commuteResult) {
        skipped++;
        continue;
      }

      // 6. Calculate leave-by timestamp
      const leaveByStr = calculateLeaveByTime(
        firstEvent.start_time,
        commuteResult.durationSeconds
      );
      if (!leaveByStr) {
        skipped++;
        continue;
      }

      // Reconstruct the leave-by Date object from the event start minus commute + buffer
      const eventStart = new Date(firstEvent.start_time);
      const leaveByMs =
        eventStart.getTime() -
        (commuteResult.durationSeconds + 5 * 60) * 1000;

      // 7. Check if we're in the departure window
      if (!isInDepartureWindow(nowMs, leaveByMs)) {
        skipped++;
        continue;
      }

      // 8. Fetch push tokens for this user
      const { data: pushTokens } = await supabase
        .from("push_tokens")
        .select("token")
        .eq("profile_id", schedule.profile_id)
        .eq("active", true)
        .returns<PushTokenRow[]>();

      const tokens = (pushTokens ?? []).map((pt) => pt.token);

      if (tokens.length === 0) {
        skipped++;
        continue;
      }

      // 9. Build notification text
      const eventTime = eventStart.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      const modeLabel =
        schedule.commute_mode === "transit"
          ? "transit"
          : schedule.commute_mode === "walk"
          ? "walk"
          : schedule.commute_mode === "bike"
          ? "bike"
          : "drive";

      const notifTitle = "Time to Leave";
      const notifBody = `Leave now — ${commuteResult.durationText} ${modeLabel} to your ${eventTime} ${firstEvent.title}.`;

      // 10. Send push notification
      await sendExpoPush(tokens, notifTitle, notifBody, {
        type: "commute_departure",
        eventTitle: firstEvent.title,
        leaveBy: leaveByStr,
      });

      // 11. Mark as notified today
      await supabase
        .from("parent_schedules")
        .update({ commute_departure_notified_date: todayStr })
        .eq("profile_id", schedule.profile_id);

      notified++;
    } catch {
      // Non-fatal: skip this user and continue
      skipped++;
    }
  }

  return NextResponse.json({
    notified,
    skipped,
    timestamp: now.toISOString(),
  });
}
