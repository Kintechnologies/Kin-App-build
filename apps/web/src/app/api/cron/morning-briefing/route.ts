/**
 * GET /api/cron/morning-briefing
 * Runs daily at 11:00 UTC (6am EST / 7am EDT).
 * Sends a coordination-aware SMS briefing to every active user who has
 * completed SMS onboarding.
 *
 * Active = phone_number set + onboarding_step >= 5.
 *
 * Briefing generator: lib/sms-briefing.ts
 *   - Pulls BOTH parents' calendars
 *   - Detects pickup risk and surfaces OPEN/ACKNOWLEDGED coordination_issues
 *   - Includes recent (24h) schedule changes
 *   - Writes 2–4 sentence warm SMS-length briefing via Claude
 *
 * Each briefing is also persisted to morning_briefings (deduped by date) so the
 * SMS inbound handler can reference it as conversation context for the day.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/twilio";
import { generateSmsBriefing, type SmsBriefingProfile } from "@/lib/sms-briefing";

interface ProfileRow extends SmsBriefingProfile {
  phone_number: string;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  // Fetch all active users
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, family_name, phone_number, context_notes, household_id")
    .not("phone_number", "is", null)
    .gte("onboarding_step", 5)
    .returns<ProfileRow[]>();

  if (error || !profiles?.length) {
    console.error("morning-briefing: no profiles or query error", error);
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;
  let failed = 0;

  for (const profile of profiles) {
    try {
      const briefing = await generateSmsBriefing(supabase, {
        id: profile.id,
        family_name: profile.family_name,
        household_id: profile.household_id,
        context_notes: profile.context_notes,
      });

      await sendSms(profile.phone_number, briefing);

      // Persist briefing for the day so the SMS handler can reference it.
      // Upsert by (profile_id, briefing_date) — table has a unique constraint.
      // Non-fatal: if persistence fails, the SMS still went out.
      try {
        await supabase
          .from("morning_briefings")
          .upsert(
            {
              profile_id: profile.id,
              briefing_date: today,
              content: briefing,
              delivery_status: "sent",
              sent_at: new Date().toISOString(),
            },
            { onConflict: "profile_id,briefing_date" }
          );
      } catch (persistErr) {
        console.error(
          `morning-briefing: persist failed for ${profile.id}`,
          persistErr
        );
      }

      // Log outbound SMS for audit + conversation history.
      await supabase.from("sms_conversations").insert({
        profile_id: profile.id,
        direction: "outbound",
        body: briefing,
        from_number: process.env.TWILIO_PHONE_NUMBER ?? "",
        to_number: profile.phone_number,
      });

      sent++;
    } catch (err) {
      console.error(`morning-briefing: failed for profile ${profile.id}`, err);
      failed++;
    }
  }

  console.log(`morning-briefing: sent=${sent} failed=${failed} date=${today}`);
  return NextResponse.json({ sent, failed, date: today });
}
