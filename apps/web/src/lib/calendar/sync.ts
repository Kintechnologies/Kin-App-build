import { createClient } from "@/lib/supabase/server";
import {
  pullGoogleEvents,
  googleEventToKinEvent,
  pushEventToGoogle,
  deleteGoogleEvent,
  refreshGoogleToken,
} from "./google";
import {
  pullAppleEvents,
  appleEventToKinEvent,
  pushEventToApple,
  deleteAppleEvent,
} from "./apple";
import { detectConflicts, findNewConflicts } from "./conflicts";
import type { CalendarConnection, CalendarEvent, CalendarConflict } from "@/types";

// ── Main Sync Entry Point ──

export async function syncCalendarForConnection(connectionId: string) {
  const supabase = createClient();

  // Mark as syncing
  await supabase
    .from("calendar_connections")
    .update({ sync_status: "syncing", updated_at: new Date().toISOString() })
    .eq("id", connectionId);

  try {
    const { data: connection } = await supabase
      .from("calendar_connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (!connection || !connection.enabled) return;

    if (connection.provider === "google") {
      await syncGoogleCalendar(connection);
    } else if (connection.provider === "apple") {
      await syncAppleCalendar(connection);
    }

    // Process outbound sync queue
    await processOutboundQueue(connection);

    // Update sync status
    await supabase
      .from("calendar_connections")
      .update({
        sync_status: "idle",
        last_synced_at: new Date().toISOString(),
        sync_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionId);

    // Run conflict detection for the household
    await runConflictDetection(connection.profile_id);
  } catch (error) {
    console.error(`Sync error for connection ${connectionId}:`, error);
    await supabase
      .from("calendar_connections")
      .update({
        sync_status: "error",
        sync_error: error instanceof Error ? error.message : "Unknown error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionId);
  }
}

// ── Google Sync ──

async function syncGoogleCalendar(connection: CalendarConnection) {
  const supabase = createClient();

  // Refresh token if needed
  let accessToken = connection.access_token!;
  if (
    connection.token_expires_at &&
    new Date(connection.token_expires_at) <= new Date()
  ) {
    const newTokens = await refreshGoogleToken(connection.refresh_token!);
    accessToken = newTokens.access_token!;

    await supabase
      .from("calendar_connections")
      .update({
        access_token: newTokens.access_token,
        token_expires_at: newTokens.expiry_date
          ? new Date(newTokens.expiry_date).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);
  }

  const calendarId = connection.google_calendar_id || "primary";

  // Pull events (incremental if we have a sync token)
  let result = await pullGoogleEvents(
    accessToken,
    calendarId,
    connection.google_sync_token || undefined
  );

  // If sync token expired, do a full resync
  if (result.requiresFullSync) {
    result = await pullGoogleEvents(accessToken, calendarId);
  }

  // Upsert events into Supabase
  for (const gEvent of result.events) {
    if (gEvent.status === "cancelled") {
      // Soft-delete cancelled events
      await supabase
        .from("calendar_events")
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("external_id", gEvent.id)
        .eq("external_source", "google")
        .eq("owner_parent_id", connection.profile_id);
      continue;
    }

    const kinEvent = googleEventToKinEvent(
      gEvent,
      connection.profile_id,
      calendarId
    );

    // Check if event already exists
    const { data: existing } = await supabase
      .from("calendar_events")
      .select("id, external_etag, updated_at")
      .eq("external_id", gEvent.id)
      .eq("external_source", "google")
      .eq("owner_parent_id", connection.profile_id)
      .single();

    if (existing) {
      // Only update if etag changed (event was modified externally)
      if (existing.external_etag !== gEvent.etag) {
        await supabase
          .from("calendar_events")
          .update({
            ...kinEvent,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      }
    } else {
      await supabase.from("calendar_events").insert({
        ...kinEvent,
        last_synced_at: new Date().toISOString(),
      });
    }
  }

  // Save new sync token
  if (result.nextSyncToken) {
    await supabase
      .from("calendar_connections")
      .update({
        google_sync_token: result.nextSyncToken,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);
  }
}

// ── Apple Sync ──

async function syncAppleCalendar(connection: CalendarConnection) {
  const supabase = createClient();

  if (!connection.access_token || !connection.refresh_token || !connection.caldav_url) {
    throw new Error("Apple Calendar credentials not configured");
  }

  const { events } = await pullAppleEvents(
    connection.access_token, // username (Apple ID email)
    connection.refresh_token, // app-specific password stored here
    connection.caldav_url
  );

  for (const parsed of events) {
    const kinEvent = appleEventToKinEvent(
      parsed,
      connection.profile_id,
      connection.caldav_url
    );

    const { data: existing } = await supabase
      .from("calendar_events")
      .select("id, external_etag")
      .eq("external_id", parsed.uid)
      .eq("external_source", "apple")
      .eq("owner_parent_id", connection.profile_id)
      .single();

    if (existing) {
      if (existing.external_etag !== parsed.etag) {
        await supabase
          .from("calendar_events")
          .update({
            ...kinEvent,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      }
    } else {
      await supabase.from("calendar_events").insert({
        ...kinEvent,
        last_synced_at: new Date().toISOString(),
      });
    }
  }
}

// ── Outbound Sync Queue Processing ──

async function processOutboundQueue(connection: CalendarConnection) {
  const supabase = createClient();

  // Fetch the owner's timezone so pushed events render in the correct local time
  const { data: profileData } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", connection.profile_id)
    .single();
  const profileTimezone: string = (profileData as { timezone?: string } | null)?.timezone ?? "UTC";

  const { data: queue } = await supabase
    .from("calendar_sync_queue")
    .select("*, calendar_events(*)")
    .eq("connection_id", connection.id)
    .lte("next_retry_at", new Date().toISOString())
    .lt("attempts", 5)
    .order("created_at", { ascending: true })
    .limit(50);

  if (!queue?.length) return;

  for (const item of queue) {
    try {
      const event = item.calendar_events as unknown as CalendarEvent;
      if (!event) {
        await supabase.from("calendar_sync_queue").delete().eq("id", item.id);
        continue;
      }

      if (connection.provider === "google") {
        const accessToken = connection.access_token!;

        if (item.action === "delete" && event.external_id) {
          await deleteGoogleEvent(accessToken, event.external_id);
        } else if (item.action === "create" || item.action === "update") {
          const externalId = await pushEventToGoogle(
            accessToken,
            event,
            connection.google_calendar_id || "primary",
            profileTimezone
          );
          await supabase
            .from("calendar_events")
            .update({
              external_id: externalId,
              sync_status: "synced",
              last_synced_at: new Date().toISOString(),
            })
            .eq("id", event.id);
        }
      } else if (connection.provider === "apple") {
        if (item.action === "delete" && event.external_id) {
          await deleteAppleEvent(
            connection.access_token!,
            connection.refresh_token!,
            event.external_id
          );
        } else if (item.action === "create" || item.action === "update") {
          const url = await pushEventToApple(
            connection.access_token!,
            connection.refresh_token!,
            connection.caldav_url!,
            event,
            event.external_id || undefined
          );
          await supabase
            .from("calendar_events")
            .update({
              external_id: url,
              sync_status: "synced",
              last_synced_at: new Date().toISOString(),
            })
            .eq("id", event.id);
        }
      }

      // Remove from queue on success
      await supabase.from("calendar_sync_queue").delete().eq("id", item.id);
    } catch (error) {
      // Increment retry counter
      await supabase
        .from("calendar_sync_queue")
        .update({
          attempts: item.attempts + 1,
          last_error: error instanceof Error ? error.message : "Unknown error",
          next_retry_at: new Date(
            Date.now() + Math.pow(2, item.attempts) * 60000
          ).toISOString(), // exponential backoff
        })
        .eq("id", item.id);
    }
  }
}

// ── Conflict Detection ──

async function runConflictDetection(profileId: string) {
  const supabase = createClient();

  // Get all household events (shared + kid events) for the next 14 days
  const now = new Date();
  const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const { data: events } = await supabase
    .from("calendar_events")
    .select("*")
    .or(`owner_parent_id.eq.${profileId},is_shared.eq.true,is_kid_event.eq.true`)
    .gte("start_time", now.toISOString())
    .lte("start_time", twoWeeksOut.toISOString())
    .is("deleted_at", null);

  if (!events?.length) return;

  const candidates = detectConflicts(events as CalendarEvent[], profileId);

  // Get existing unresolved conflicts
  const { data: existing } = await supabase
    .from("calendar_conflicts")
    .select("*")
    .eq("household_id", profileId)
    .eq("resolved", false);

  const newConflicts = findNewConflicts(
    candidates,
    (existing || []) as CalendarConflict[]
  );

  // Insert new conflicts
  for (const conflict of newConflicts) {
    await supabase.from("calendar_conflicts").insert({
      household_id: profileId,
      event_a_id: conflict.event_a.id,
      event_b_id: conflict.event_b.id,
      conflict_type: conflict.conflict_type,
      description: conflict.description,
    });
  }
}

// ── Queue Helpers (used by API routes when events are created/edited in Kin) ──

export async function queueOutboundSync(
  eventId: string,
  profileId: string,
  action: "create" | "update" | "delete"
) {
  const supabase = createClient();

  // Find connected calendars for this user
  const { data: connections } = await supabase
    .from("calendar_connections")
    .select("id")
    .eq("profile_id", profileId)
    .eq("enabled", true);

  if (!connections?.length) return;

  for (const conn of connections) {
    await supabase.from("calendar_sync_queue").insert({
      connection_id: conn.id,
      event_id: eventId,
      action,
    });
  }
}
