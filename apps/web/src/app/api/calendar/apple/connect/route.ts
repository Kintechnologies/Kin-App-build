import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/api-auth";
import { getAppleCalDAVClient, listAppleCalendars } from "@/lib/calendar/apple";
import { syncCalendarForConnection } from "@/lib/calendar/sync";
import { encryptToken } from "@/lib/calendar/token-crypto";
import { isSameOrigin } from "@/lib/csrf";
import type { DAVCalendar } from "tsdav";
import * as Sentry from "@sentry/nextjs";

// POST /api/calendar/apple/connect — connect Apple Calendar via app-specific password
export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createClient();

  const { appleId, appPassword } = await request.json();

  if (!appleId || !appPassword) {
    return NextResponse.json(
      { error: "Apple ID and app-specific password are required" },
      { status: 400 }
    );
  }

  try {
    // Verify credentials by listing calendars
    const calendars = await listAppleCalendars(appleId, appPassword);

    if (!calendars.length) {
      return NextResponse.json(
        { error: "No calendars found for this Apple ID" },
        { status: 404 }
      );
    }

    // Use the first calendar (usually the default)
    const primaryCalendar = calendars[0];

    // P2-C2 (audit v6): listAppleCalendars only proves the credentials are
    // valid — it doesn't prove the primary calendar URL is queryable.
    // Some iCloud accounts list calendars that fetchCalendarObjects then
    // 403s on (shared calendars where access was revoked, "Hidden Holidays
    // and Other" calendars). Without this check, the failure surfaces only
    // during the first morning briefing — by then the user thinks the
    // connection worked. Pilot fetch with a tight window so it's fast.
    try {
      const pilotClient = await getAppleCalDAVClient(appleId, appPassword);
      const now = new Date();
      const twentyFourHoursOut = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      await pilotClient.fetchCalendarObjects({
        calendar: { url: primaryCalendar.url } as DAVCalendar,
        timeRange: {
          start: now.toISOString(),
          end: twentyFourHoursOut.toISOString(),
        },
      });
    } catch (pilotErr) {
      Sentry.captureException(pilotErr);
      return NextResponse.json(
        {
          error:
            "Your Apple Calendar credentials worked, but Kin couldn't read events from your default calendar. Try a different Apple ID or re-issue the app-specific password.",
        },
        { status: 400 }
      );
    }

    // Store connection. Migration 067 dropped the full UNIQUE (profile_id,
    // provider) and replaced it with a partial unique index on
    // (profile_id, provider) WHERE provider = 'apple'. PostgreSQL won't infer
    // a partial index from a bare ON CONFLICT (profile_id, provider) without
    // the matching WHERE clause, so the legacy upsert silently overwrote or
    // errored. Handle the conflict explicitly: update if a row exists for this
    // profile/provider, else insert.
    // P1-C4 (audit v7): both the Apple ID and app-specific password are
    // sensitive — store them encrypted. The decrypt helper transparently
    // handles already-encrypted legacy values during the migration window.
    const baseRow = {
      profile_id: user.id,
      provider: "apple" as const,
      access_token: encryptToken(appleId),
      refresh_token: encryptToken(appPassword),
      caldav_url: primaryCalendar.url,
      sync_status: "idle" as const,
      enabled: true,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from("calendar_connections")
      .select("id")
      .eq("profile_id", user.id)
      .eq("provider", "apple")
      .maybeSingle();

    let connection;
    if (existing) {
      const { data, error: dbError } = await supabase
        .from("calendar_connections")
        .update(baseRow)
        .eq("id", existing.id)
        .select()
        .single();
      if (dbError) throw dbError;
      connection = data;
    } else {
      const { data, error: dbError } = await supabase
        .from("calendar_connections")
        .insert(baseRow)
        .select()
        .single();
      if (dbError) throw dbError;
      connection = data;
    }

    // Trigger initial sync
    await syncCalendarForConnection(connection.id);

    return NextResponse.json({
      success: true,
      calendar: primaryCalendar.displayName,
      calendars: calendars.map((c) => ({
        url: c.url,
        name: c.displayName,
      })),
    });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json(
      { error: "Failed to connect Apple Calendar. Check your credentials." },
      { status: 400 }
    );
  }
}

// DELETE /api/calendar/apple/connect — disconnect Apple Calendar
//
// Targets a specific connection by id when provided so multi-account profiles
// (migration 067 + v6 P1-C4) can disconnect one account at a time. Falls back
// to "all Apple connections for the user" for legacy callers without an id.
export async function DELETE(request: Request) {
  // CSRF defense-in-depth (audit V7 P2-A2): a drive-by site could otherwise
  // trigger a DELETE that disconnects the victim's calendar.
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get("connection_id");

  // P1-C2 (audit v7): when a specific connection is targeted we must scope
  // the events soft-delete to events from THAT connection — otherwise
  // disconnecting one Apple account nukes events from every other Apple
  // calendar on the profile. We look up the caldav_url first and use it as
  // the external_calendar_id key. Without a connection_id (legacy callers)
  // we still soft-delete all Apple events, matching the route's historical
  // "disconnect everything Apple" behavior.
  let caldavUrl: string | null = null;
  if (connectionId) {
    const { data } = await supabase
      .from("calendar_connections")
      .select("caldav_url")
      .eq("id", connectionId)
      .eq("profile_id", user.id)
      .eq("provider", "apple")
      .maybeSingle<{ caldav_url: string | null }>();
    caldavUrl = data?.caldav_url ?? null;
  }

  let connDelete = supabase
    .from("calendar_connections")
    .delete()
    .eq("profile_id", user.id)
    .eq("provider", "apple");
  if (connectionId) {
    connDelete = connDelete.eq("id", connectionId);
  }
  await connDelete;

  let eventDelete = supabase
    .from("calendar_events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("owner_parent_id", user.id)
    .eq("external_source", "apple");
  if (caldavUrl) {
    eventDelete = eventDelete.eq("external_calendar_id", caldavUrl);
  }
  await eventDelete;

  return NextResponse.json({ success: true });
}
