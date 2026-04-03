/**
 * C4.7 — Pet Vaccination Reminder Push Notifications
 * GET /api/cron/vax-reminders
 *
 * Runs once per day at 9 AM UTC via Vercel cron.
 * For each pet vaccination with a next_due_date:
 *   — Sends a 7-day-prior reminder if due date is exactly 7 days away
 *     and no 7-day reminder has been sent for this due date yet.
 *   — Sends a 1-day-prior reminder if due date is tomorrow
 *     and no 1-day reminder has been sent for this due date yet.
 *
 * Deduplication is based on storing the due_date against which the
 * reminder was sent (vax_7day_notified_due_date / vax_1day_notified_due_date),
 * so when next_due_date advances after a booster, reminders re-trigger
 * correctly for the new date.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// How many days before due_date to send each reminder
const REMINDER_DAYS = [7, 1] as const;
type ReminderDay = (typeof REMINDER_DAYS)[number];

interface VaccinationRow {
  id: string;
  profile_id: string;
  name: string;
  next_due_date: string | null;
  vax_7day_notified_due_date: string | null;
  vax_1day_notified_due_date: string | null;
  family_member: { name: string } | null;
}

interface PushTokenRow {
  token: string;
}

interface ReminderBatch {
  profileId: string;
  vaccinationId: string;
  vaccinationName: string;
  petName: string;
  nextDueDate: string;
  daysUntilDue: ReminderDay;
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
 * Returns the number of calendar days between today (UTC date) and a future date string.
 * E.g. if today is 2026-04-03 and dateStr is "2026-04-10", returns 7.
 */
function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00Z`);
  return Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
}

/**
 * Formats a date string like "2026-04-10" → "April 10"
 */
function formatDueDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminSupabase();
  const now = new Date();

  // 1. Fetch all vaccinations with a future next_due_date
  const todayStr = now.toISOString().split("T")[0];
  const lookAheadStr = (() => {
    const d = new Date(now);
    d.setDate(d.getDate() + 8); // 7+1 day lookahead is enough
    return d.toISOString().split("T")[0];
  })();

  const { data: vaccinations, error } = await supabase
    .from("pet_vaccinations")
    .select(
      "id, profile_id, name, next_due_date, vax_7day_notified_due_date, vax_1day_notified_due_date, family_member:family_members(name)"
    )
    .not("next_due_date", "is", null)
    .gte("next_due_date", todayStr)
    .lte("next_due_date", lookAheadStr)
    .returns<VaccinationRow[]>();

  if (error || !vaccinations) {
    return NextResponse.json(
      { error: "Failed to fetch vaccinations" },
      { status: 500 }
    );
  }

  if (vaccinations.length === 0) {
    return NextResponse.json({
      sent: 0,
      message: "No vaccinations due in the next 7 days",
      timestamp: now.toISOString(),
    });
  }

  // 2. Determine which reminders need to fire today
  const reminders: ReminderBatch[] = [];

  for (const vax of vaccinations) {
    if (!vax.next_due_date) continue;

    const days = daysUntil(vax.next_due_date);
    const petName = vax.family_member?.name ?? "your pet";

    if (days === 7) {
      // Send 7-day reminder if not already sent for this due date
      if (vax.vax_7day_notified_due_date !== vax.next_due_date) {
        reminders.push({
          profileId: vax.profile_id,
          vaccinationId: vax.id,
          vaccinationName: vax.name,
          petName,
          nextDueDate: vax.next_due_date,
          daysUntilDue: 7,
        });
      }
    } else if (days === 1) {
      // Send 1-day reminder if not already sent for this due date
      if (vax.vax_1day_notified_due_date !== vax.next_due_date) {
        reminders.push({
          profileId: vax.profile_id,
          vaccinationId: vax.id,
          vaccinationName: vax.name,
          petName,
          nextDueDate: vax.next_due_date,
          daysUntilDue: 1,
        });
      }
    }
  }

  if (reminders.length === 0) {
    return NextResponse.json({
      sent: 0,
      message: "No reminders due today",
      timestamp: now.toISOString(),
    });
  }

  // 3. Group reminders by profile to batch pushes
  const byProfile = new Map<string, ReminderBatch[]>();
  for (const r of reminders) {
    const existing = byProfile.get(r.profileId) ?? [];
    existing.push(r);
    byProfile.set(r.profileId, existing);
  }

  let sent = 0;

  for (const [profileId, batch] of Array.from(byProfile.entries())) {
    try {
      // Fetch push tokens
      const { data: pushTokens } = await supabase
        .from("push_tokens")
        .select("token")
        .eq("profile_id", profileId)
        .eq("active", true)
        .returns<PushTokenRow[]>();

      const tokens = (pushTokens ?? []).map((pt) => pt.token);
      if (tokens.length === 0) continue;

      // Send one push per reminder in this batch
      // (different reminders may have different urgency — send separately for clarity)
      for (const reminder of batch) {
        const dueDateFormatted = formatDueDate(reminder.nextDueDate);
        const urgency =
          reminder.daysUntilDue === 1 ? "tomorrow" : "in 7 days";

        const title =
          reminder.daysUntilDue === 1
            ? "Vaccination Due Tomorrow"
            : "Vaccination Coming Up";

        const body = `${reminder.petName}'s ${reminder.vaccinationName} is due ${urgency} — ${dueDateFormatted}.`;

        await sendExpoPush(tokens, title, body, {
          type: "vaccination_reminder",
          screen: "pets",
          vaccinationId: reminder.vaccinationId,
          petName: reminder.petName,
          daysUntilDue: String(reminder.daysUntilDue),
          dueDate: reminder.nextDueDate,
        });

        // Mark this due date as notified
        const updateField =
          reminder.daysUntilDue === 7
            ? { vax_7day_notified_due_date: reminder.nextDueDate }
            : { vax_1day_notified_due_date: reminder.nextDueDate };

        await supabase
          .from("pet_vaccinations")
          .update(updateField)
          .eq("id", reminder.vaccinationId);

        sent++;
      }
    } catch {
      // Non-fatal: continue to next profile
    }
  }

  return NextResponse.json({
    sent,
    timestamp: now.toISOString(),
  });
}
