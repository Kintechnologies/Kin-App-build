import { createClient } from "@/lib/supabase/server";
import {
  pullGoogleEvents,
  googleEventToKinEvent,
  refreshGoogleToken,
  listGoogleCalendars,
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

  // Refresh token if needed. 60s buffer (v5 P2-C1): a token whose expiry is
  // <= now races the upcoming Google API call — by the time the request
  // arrives, the token is rejected. Refresh anything expiring in the next
  // minute too.
  let accessToken = connection.access_token!;
  if (
    connection.token_expires_at &&
    new Date(connection.token_expires_at).getTime() <= Date.now() + 60_000
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

  // Pre-V5 connections only synced "primary". Fan out across every non-hidden
  // calendar so school district, sports league, partner-shared, kid-pediatric,
  // etc. show up in the briefing. The first sub-calendar of a fresh connection
  // boots from no sync token; subsequent runs resume per-calendar via the
  // google_sync_tokens jsonb map (migration 067). Returning [] (e.g. brand-new
  // OAuth where calendarList hasn't propagated yet) falls back to "primary".
  let subCalendars: { id: string; primary: boolean }[];
  try {
    const discovered = await listGoogleCalendars(accessToken);
    subCalendars = discovered.length
      ? discovered.map((c) => ({ id: c.id, primary: c.primary }))
      : [{ id: "primary", primary: true }];
  } catch {
    subCalendars = [{ id: "primary", primary: true }];
  }

  // google_sync_tokens is a JSONB column added in migration 067; existing rows
  // default to {}. Legacy single google_sync_token applies to "primary".
  const syncTokensRaw =
    (connection as CalendarConnection & {
      google_sync_tokens?: Record<string, string> | null;
    }).google_sync_tokens ?? {};
  const syncTokens: Record<string, string> = { ...syncTokensRaw };
  if (connection.google_sync_token && !syncTokens["primary"]) {
    syncTokens["primary"] = connection.google_sync_token;
  }

  for (const cal of subCalendars) {
    let result = await pullGoogleEvents(
      accessToken,
      cal.id,
      syncTokens[cal.id] || undefined
    );

    if (result.requiresFullSync) {
      result = await pullGoogleEvents(accessToken, cal.id);
    }

    for (const gEvent of result.events) {
      if (gEvent.status === "cancelled") {
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
        cal.id
      );

      const { data: existing } = await supabase
        .from("calendar_events")
        .select("id, external_etag, updated_at")
        .eq("external_id", gEvent.id)
        .eq("external_source", "google")
        .eq("owner_parent_id", connection.profile_id)
        .eq("external_calendar_id", cal.id)
        .maybeSingle();

      if (existing) {
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

    if (result.nextSyncToken) {
      syncTokens[cal.id] = result.nextSyncToken;
    }
  }

  await supabase
    .from("calendar_connections")
    .update({
      google_sync_tokens: syncTokens,
      // Keep the legacy column in lockstep with "primary" so downgrades or
      // pre-migration consumers don't lose their cursor.
      google_sync_token: syncTokens["primary"] ?? connection.google_sync_token,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);
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

  // Track every external_id we observed on this pull so the deletion sweep at
  // the end can soft-delete the ones that disappeared. CalDAV has no
  // "cancelled" record like Google — deleted events just vanish from
  // subsequent responses — so we have to reconcile by absence. (audit v5 P1-C5)
  const seenExternalIds = new Set<string>();

  for (const parsed of events) {
    seenExternalIds.add(parsed.uid);
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
      .maybeSingle();

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

  // ── Deletion sweep ────────────────────────────────────────────────────────
  // Pull every previously-stored Apple event for this profile and soft-delete
  // the ones that did not appear in this sync. Bounded to the active set so
  // we don't keep re-deleting already-deleted rows on every run.
  const { data: priorEvents } = await supabase
    .from("calendar_events")
    .select("id, external_id")
    .eq("external_source", "apple")
    .eq("owner_parent_id", connection.profile_id)
    .is("deleted_at", null);

  const orphanedIds =
    priorEvents
      ?.filter((row) => row.external_id && !seenExternalIds.has(row.external_id))
      .map((row) => row.id) ?? [];

  if (orphanedIds.length > 0) {
    await supabase
      .from("calendar_events")
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in("id", orphanedIds);
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
