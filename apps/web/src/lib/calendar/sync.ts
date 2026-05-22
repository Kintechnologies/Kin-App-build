import { createClient } from "@/lib/supabase/server";
import {
  pullGoogleEvents,
  googleEventToKinEvent,
  refreshGoogleToken,
  GoogleTokenRevokedError,
} from "./google";
import { pullAppleEvents, appleEventToKinEvent } from "./apple";
import { detectConflicts, findNewConflicts } from "./conflicts";
import { detectLateScheduleChanges } from "@/lib/late-schedule-change";
import { notifySlack } from "@/lib/notify";
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

    // §3C: Late Schedule Change detection — creates real-time coordination_issues
    // for events modified during this sync. Non-fatal: sync succeeds even if this fails.
    await detectLateScheduleChanges(supabase, connection.profile_id).catch(
      (err) => {
        if (process.env.NODE_ENV !== "production") {
          console.error(
            `late-schedule-change detection error for profile ${connection.profile_id}:`,
            err
          );
        }
      }
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error(`Sync error for connection ${connectionId}:`, error);
    }
    const msg = error instanceof Error ? error.message : "Unknown error";
    // A revoked refresh_token is a user action ("Remove access" in Google
    // Account settings) — not a transient sync failure. Flip the connection
    // into a dedicated state so the dashboard can render a Reconnect CTA
    // instead of a misleading "Sync error" with no clear next action.
    // (audit v3 P1-C1)
    const isRevoked = error instanceof GoogleTokenRevokedError;
    await supabase
      .from("calendar_connections")
      .update({
        sync_status: isRevoked ? "needs_reconnect" : "error",
        sync_error: msg,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionId);
    // A failed sync degrades the next briefing (stale calendar warning kicks
    // in). Warning, not critical — a single connection failing is recoverable
    // (token refresh, transient API error), but a pattern in the channel is
    // the early signal that auth has actually broken.
    await notifySlack(
      `Calendar sync failed for connection ${connectionId}${isRevoked ? " (needs_reconnect)" : ""}: ${msg}`,
      "warning"
    ).catch(() => {});
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
