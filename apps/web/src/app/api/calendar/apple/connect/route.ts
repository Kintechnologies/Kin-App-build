import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/api-auth";
import { listAppleCalendars } from "@/lib/calendar/apple";
import { syncCalendarForConnection } from "@/lib/calendar/sync";
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

    // Store connection. Migration 067 dropped the full UNIQUE (profile_id,
    // provider) and replaced it with a partial unique index on
    // (profile_id, provider) WHERE provider = 'apple'. PostgreSQL won't infer
    // a partial index from a bare ON CONFLICT (profile_id, provider) without
    // the matching WHERE clause, so the legacy upsert silently overwrote or
    // errored. Handle the conflict explicitly: update if a row exists for this
    // profile/provider, else insert.
    const baseRow = {
      profile_id: user.id,
      provider: "apple" as const,
      access_token: appleId,            // username
      refresh_token: appPassword,       // app-specific password
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
export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createClient();

  await supabase
    .from("calendar_connections")
    .delete()
    .eq("profile_id", user.id)
    .eq("provider", "apple");

  await supabase
    .from("calendar_events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("owner_parent_id", user.id)
    .eq("external_source", "apple");

  return NextResponse.json({ success: true });
}
