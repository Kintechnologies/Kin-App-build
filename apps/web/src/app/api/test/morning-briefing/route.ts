/**
 * Test-only endpoint: fire a single-user morning briefing on demand.
 *
 * Three morning-briefing routes exist; do not confuse them:
 *
 *   /api/morning-briefing           ← user-facing on-demand briefing for the
 *                                     authenticated web dashboard user
 *   /api/cron/morning-briefing      ← legacy Vercel cron fan-out (SMS briefings
 *                                     now fan out from a Supabase edge function
 *                                     in per-user local time)
 *   /api/test/morning-briefing      ← THIS FILE: single-phone dev test, gated
 *                                     by CRON_SECRET, defaults to a dry run
 *
 * Unlike /api/cron/morning-briefing (which fans out to every active user),
 * this targets ONE profile looked up by phone number, and only sends an SMS
 * when `send=true`. The default is a dry run that returns the generated
 * briefing plus a pipeline trace without touching Twilio or the database.
 *
 * Auth: Authorization: Bearer ${CRON_SECRET}
 *
 * GET /api/test/morning-briefing?phone=+1XXXXXXXXXX[&send=true][&persist=true]
 *   phone    — required; target profile's phone_number
 *   send     — "true" to actually deliver the SMS via Twilio
 *   persist  — "true" to write to morning_briefings + sms_conversations
 *
 * Returns the full pipeline trace as JSON.
 *
 * Briefing generator: lib/sms-briefing.ts (same path the cron job uses).
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/twilio";
import { generateSmsBriefing } from "@/lib/sms-briefing";

interface ProfileRow {
  id: string;
  family_name: string | null;
  phone_number: string | null;
  context_notes: string | null;
  household_id: string | null;
  onboarding_step: number | null;
  timezone: string | null;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const phone = url.searchParams.get("phone");
  const send = url.searchParams.get("send") === "true";
  const persist = url.searchParams.get("persist") === "true";

  if (!phone) {
    return NextResponse.json(
      { error: "Missing required query param: phone" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // ── Resolve the target profile by phone number ──────────────────────────
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select(
      "id, family_name, phone_number, context_notes, household_id, onboarding_step, timezone"
    )
    .eq("phone_number", phone)
    .limit(1)
    .maybeSingle<ProfileRow>();

  if (profileErr) {
    return NextResponse.json(
      { error: "Profile lookup failed", detail: profileErr.message },
      { status: 500 }
    );
  }
  if (!profile) {
    return NextResponse.json(
      { error: `No profile found with phone_number ${phone}` },
      { status: 404 }
    );
  }

  const today = new Date().toISOString().split("T")[0];

  // ── Pipeline trace: what data the briefing generator will see ───────────
  // coordination_issues.household_id stores the primary parent's ID.
  const primaryId = profile.household_id ?? profile.id;
  const [{ count: todayEventCount }, { count: openIssueCount }] =
    await Promise.all([
      supabase
        .from("calendar_events")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", profile.id)
        .gte("start_time", `${today}T00:00:00Z`)
        .lte("start_time", `${today}T23:59:59Z`)
        .is("deleted_at", null),
      supabase
        .from("coordination_issues")
        .select("id", { count: "exact", head: true })
        .eq("household_id", primaryId)
        .in("state", ["OPEN", "ACKNOWLEDGED"]),
    ]);

  // ── Generate the briefing (real generateSmsBriefing pipeline) ───────────
  const generationStart = Date.now();
  const briefing = await generateSmsBriefing(supabase, {
    id: profile.id,
    family_name: profile.family_name,
    household_id: profile.household_id,
    context_notes: profile.context_notes,
    timezone: profile.timezone,
  });
  const generationMs = Date.now() - generationStart;

  const trace = {
    target: {
      id: profile.id,
      family_name: profile.family_name,
      phone_number: profile.phone_number,
      onboarding_step: profile.onboarding_step,
      household_id: profile.household_id,
      isActive:
        profile.phone_number != null && (profile.onboarding_step ?? 0) >= 5,
    },
    dataFound: {
      todayEventCount: todayEventCount ?? 0,
      openCoordinationIssues: openIssueCount ?? 0,
    },
    generation: {
      briefingChars: briefing.length,
      durationMs: generationMs,
    },
  };

  // ── Dry run: stop before sending ────────────────────────────────────────
  if (!send) {
    return NextResponse.json({
      dryRun: true,
      trace,
      briefing,
      delivery: { sent: false, persisted: false },
    });
  }

  // ── Send the SMS via Twilio ─────────────────────────────────────────────
  if (!profile.phone_number) {
    return NextResponse.json(
      { error: "Profile has no phone_number — cannot send", trace, briefing },
      { status: 422 }
    );
  }

  try {
    await sendSms(profile.phone_number, briefing);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Twilio send failed",
        detail: err instanceof Error ? err.message : String(err),
        trace,
        briefing,
        delivery: { sent: false, persisted: false },
      },
      { status: 502 }
    );
  }

  // ── Persist for the day (mirrors the cron route) ────────────────────────
  let persisted = false;
  let persistError: string | null = null;
  if (persist) {
    try {
      await supabase.from("morning_briefings").upsert(
        {
          profile_id: profile.id,
          briefing_date: today,
          content: briefing,
          delivery_status: "sent",
          sent_at: new Date().toISOString(),
        },
        { onConflict: "profile_id,briefing_date" }
      );
      await supabase.from("sms_conversations").insert({
        profile_id: profile.id,
        direction: "outbound",
        body: briefing,
        from_number: process.env.TWILIO_PHONE_NUMBER ?? "",
        to_number: profile.phone_number,
      });
      persisted = true;
    } catch (err) {
      persistError = err instanceof Error ? err.message : String(err);
    }
  }

  return NextResponse.json({
    trace,
    briefing,
    delivery: {
      sent: true,
      to: profile.phone_number,
      persisted,
      ...(persistError ? { persistError } : {}),
    },
  });
}
