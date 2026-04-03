/**
 * C4.6 — Pet Medication Daily Push Notification
 * GET /api/cron/med-reminders
 *
 * Runs once per day at 8 AM UTC via Vercel cron.
 * For each user with active pet medications, sends a consolidated
 * push notification listing all medications due today.
 * Max one push per medication per calendar day.
 *
 * The notification includes a deep link to the pets screen
 * where the user can confirm each medication with one tap.
 * Confirmation updates last_confirmed_at on the medication row.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface MedicationRow {
  id: string;
  profile_id: string;
  name: string;
  dosage: string | null;
  time_of_day: string[] | null;
  med_notified_date: string | null;
  family_member: { name: string } | null;
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
 * Formats a time string like "08:00:00" → "8:00 AM"
 */
function formatTime(t: string): string {
  const [hourStr, minuteStr] = t.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr ?? "00";
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute} ${period}`;
}

/**
 * Builds a human-readable medication line for one medication.
 * Examples:
 *   "Buddy — Rimadyl (25mg) at 8:00 AM and 6:00 PM"
 *   "Luna — Apoquel"
 */
function buildMedLine(med: MedicationRow): string {
  const petName = med.family_member?.name ?? "your pet";
  const dosageStr = med.dosage ? ` (${med.dosage})` : "";
  const timeStr =
    med.time_of_day && med.time_of_day.length > 0
      ? ` at ${med.time_of_day.map(formatTime).join(" and ")}`
      : "";
  return `${petName} — ${med.name}${dosageStr}${timeStr}`;
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

  let profilesNotified = 0;
  let medsMarked = 0;

  // 1. Fetch all active medications not yet notified today
  const { data: medications, error } = await supabase
    .from("pet_medications")
    .select(
      "id, profile_id, name, dosage, time_of_day, med_notified_date, family_member:family_members(name)"
    )
    .eq("active", true)
    .or(`med_notified_date.is.null,med_notified_date.neq.${todayStr}`)
    .returns<MedicationRow[]>();

  if (error || !medications) {
    return NextResponse.json(
      { error: "Failed to fetch medications" },
      { status: 500 }
    );
  }

  if (medications.length === 0) {
    return NextResponse.json({
      profilesNotified: 0,
      medsMarked: 0,
      message: "No medications to notify",
      timestamp: now.toISOString(),
    });
  }

  // 2. Group medications by profile_id
  const byProfile = new Map<string, MedicationRow[]>();
  for (const med of medications) {
    const existing = byProfile.get(med.profile_id) ?? [];
    existing.push(med);
    byProfile.set(med.profile_id, existing);
  }

  // 3. For each profile, fetch push tokens and send one consolidated notification
  for (const [profileId, meds] of Array.from(byProfile.entries())) {
    try {
      const { data: pushTokens } = await supabase
        .from("push_tokens")
        .select("token")
        .eq("profile_id", profileId)
        .eq("active", true)
        .returns<PushTokenRow[]>();

      const tokens = (pushTokens ?? []).map((pt) => pt.token);
      if (tokens.length === 0) continue;

      // Build notification body
      const medLines = meds.map(buildMedLine);
      const title =
        meds.length === 1
          ? "Medication Reminder"
          : `${meds.length} Medication Reminders`;

      const body =
        meds.length === 1
          ? medLines[0]
          : medLines.slice(0, 3).join(" · ") +
            (meds.length > 3 ? ` + ${meds.length - 3} more` : "");

      await sendExpoPush(tokens, title, body, {
        type: "medication_reminder",
        screen: "pets",
        medCount: String(meds.length),
      });

      // 4. Mark all medications for this profile as notified today
      const medIds = meds.map((m: MedicationRow) => m.id);
      await supabase
        .from("pet_medications")
        .update({ med_notified_date: todayStr })
        .in("id", medIds);

      profilesNotified++;
      medsMarked += medIds.length;
    } catch {
      // Non-fatal: continue to next profile
    }
  }

  return NextResponse.json({
    profilesNotified,
    medsMarked,
    timestamp: now.toISOString(),
  });
}
