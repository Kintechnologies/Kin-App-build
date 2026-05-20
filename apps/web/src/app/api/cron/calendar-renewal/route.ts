/**
 * GET /api/cron/calendar-renewal
 *
 * Two jobs in one route, run every 6 hours:
 *
 *   1. Renew Google Calendar push channels that are within 24h of expiring.
 *      Google webhook channels live ~7 days max; without renewal the briefing
 *      silently stops seeing new events. For each near-expiry connection we
 *      register a fresh channel, persist the new id/expiry, and best-effort
 *      stop the old channel.
 *
 *   2. Catch missed pushes by re-syncing any enabled connection whose
 *      last_synced_at is older than 6 hours. Webhooks are best-effort — this
 *      is the safety net.
 *
 * Sub-daily on Vercel Hobby is blocked, so the actual 6-hour schedule lives
 * in pg_cron and reaches this route via the cron-dispatch edge function (see
 * supabase/migrations/059_calendar_renewal_cron.sql). Authenticates the same
 * way every other cron route does — Bearer token via isAuthorizedCron.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/cron-auth";
import {
  registerGoogleWebhook,
  stopGoogleWebhook,
  refreshGoogleToken,
} from "@/lib/calendar/google";
import { syncCalendarForConnection } from "@/lib/calendar/sync";
import { randomUUID } from "crypto";
import * as Sentry from "@sentry/nextjs";

interface ConnectionRow {
  id: string;
  profile_id: string;
  provider: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  google_calendar_id: string | null;
  google_channel_id: string | null;
  google_resource_id: string | null;
  google_channel_expiry: string | null;
  last_synced_at: string | null;
  enabled: boolean;
}

// Channels renewed when within this window of expiry. Six hours of cron
// cadence + safety margin — at 24h we have at minimum three more cron ticks
// to retry before Google drops the channel.
const RENEWAL_THRESHOLD_MS = 24 * 60 * 60 * 1000;

// A connection counts as "stale" — and gets a fallback sync — when this much
// time has passed with no successful sync. Matches the cron cadence so every
// missed tick triggers a catch-up on the next run.
const STALE_SYNC_THRESHOLD_MS = 6 * 60 * 60 * 1000;

async function refreshAccessTokenIfNeeded(
  conn: ConnectionRow
): Promise<string> {
  const supabase = createAdminClient();
  let accessToken = conn.access_token ?? "";

  const expiresAt = conn.token_expires_at
    ? new Date(conn.token_expires_at).getTime()
    : 0;
  if (!accessToken || expiresAt <= Date.now()) {
    if (!conn.refresh_token) {
      throw new Error("no refresh_token");
    }
    const tokens = await refreshGoogleToken(conn.refresh_token);
    accessToken = tokens.access_token ?? "";
    await supabase
      .from("calendar_connections")
      .update({
        access_token: tokens.access_token,
        token_expires_at: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conn.id);
  }
  return accessToken;
}

async function renewOne(conn: ConnectionRow): Promise<void> {
  const supabase = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL not set");

  const accessToken = await refreshAccessTokenIfNeeded(conn);
  const channelId = randomUUID();
  const webhookUrl = `${appUrl}/api/calendar/google/webhook`;
  const calendarId = conn.google_calendar_id || "primary";

  const webhook = await registerGoogleWebhook(
    accessToken,
    calendarId,
    webhookUrl,
    channelId
  );

  // Persist the new channel before stopping the old one — if stop fails we'd
  // rather leak a soon-to-expire channel than lose track of the live one.
  await supabase
    .from("calendar_connections")
    .update({
      google_channel_id: webhook.channelId,
      google_resource_id: webhook.resourceId,
      google_channel_expiry: webhook.expiration,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conn.id);

  if (conn.google_channel_id && conn.google_resource_id) {
    try {
      await stopGoogleWebhook(
        accessToken,
        conn.google_channel_id,
        conn.google_resource_id
      );
    } catch (err) {
      // Non-fatal: the old channel will expire on its own within hours.
      Sentry.captureException(err);
    }
  }
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const renewalCutoff = new Date(now.getTime() + RENEWAL_THRESHOLD_MS).toISOString();
  const staleCutoff = new Date(now.getTime() - STALE_SYNC_THRESHOLD_MS).toISOString();

  // ── 1. Renew near-expiry Google channels ────────────────────────────────
  const { data: nearExpiry, error: renewError } = await supabase
    .from("calendar_connections")
    .select(
      "id, profile_id, provider, access_token, refresh_token, token_expires_at, google_calendar_id, google_channel_id, google_resource_id, google_channel_expiry, last_synced_at, enabled"
    )
    .eq("provider", "google")
    .eq("enabled", true)
    .not("google_channel_expiry", "is", null)
    .lt("google_channel_expiry", renewalCutoff);

  if (renewError) Sentry.captureException(renewError);

  let renewed = 0;
  const renewalErrors: { connection_id: string; error: string }[] = [];
  for (const conn of (nearExpiry ?? []) as ConnectionRow[]) {
    try {
      await renewOne(conn);
      renewed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      renewalErrors.push({ connection_id: conn.id, error: msg });
      Sentry.captureException(err);
    }
  }

  // ── 2. Fallback sync for connections that look quiet ────────────────────
  const { data: staleConnections, error: staleError } = await supabase
    .from("calendar_connections")
    .select("id, last_synced_at")
    .eq("enabled", true)
    .or(`last_synced_at.is.null,last_synced_at.lt.${staleCutoff}`);

  if (staleError) Sentry.captureException(staleError);

  let resynced = 0;
  const syncErrors: { connection_id: string; error: string }[] = [];
  for (const conn of staleConnections ?? []) {
    try {
      await syncCalendarForConnection(conn.id);
      resynced++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      syncErrors.push({ connection_id: conn.id, error: msg });
      Sentry.captureException(err);
    }
  }

  return NextResponse.json({
    timestamp: now.toISOString(),
    renewals: { attempted: nearExpiry?.length ?? 0, succeeded: renewed, errors: renewalErrors },
    fallback_syncs: { attempted: staleConnections?.length ?? 0, succeeded: resynced, errors: syncErrors },
  });
}
