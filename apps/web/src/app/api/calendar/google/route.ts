import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/api-auth";
import {
  getGoogleAuthUrl,
  refreshGoogleToken,
  stopGoogleWebhook,
} from "@/lib/calendar/google";
import { decryptToken } from "@/lib/calendar/token-crypto";
import { isSameOrigin } from "@/lib/csrf";
import * as Sentry from "@sentry/nextjs";

// GET /api/calendar/google — initiate Google OAuth
export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const authUrl = getGoogleAuthUrl(user.id);
    return NextResponse.json({ url: authUrl });
  } catch {
    return NextResponse.json(
      { error: "Google Calendar is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment." },
      { status: 503 }
    );
  }
}

// DELETE /api/calendar/google — disconnect Google Calendar.
//
// Targets a specific connection by id when provided so multi-account profiles
// (migration 067 + v6 P1-C4) can disconnect personal vs. work Gmail
// independently. Falls back to "all Google connections for the user" for
// legacy callers without an id.
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

  // Stop the live push channel(s) BEFORE deleting the row(s) — otherwise
  // Google keeps pinging our webhook for up to 7 days (channel TTL) and the
  // webhook returns 404, which Google retries indefinitely. Best-effort: a
  // failed stop must not block the user's disconnect.
  let lookup = supabase
    .from("calendar_connections")
    .select("id, refresh_token, google_channel_id, google_resource_id")
    .eq("profile_id", user.id)
    .eq("provider", "google");
  if (connectionId) {
    lookup = lookup.eq("id", connectionId);
  }
  const { data: rows } = await lookup.returns<
    {
      id: string;
      refresh_token: string | null;
      google_channel_id: string | null;
      google_resource_id: string | null;
    }[]
  >();

  for (const existing of rows ?? []) {
    if (
      existing.refresh_token &&
      existing.google_channel_id &&
      existing.google_resource_id
    ) {
      // Retry channel-stop once on failure (audit V7 P2-C5): if we 410-orphan
      // a live channel, Google keeps pinging our webhook for up to 7 days
      // (billed egress + log noise). The webhook handler 410-handles the
      // resulting POSTs, but every retry attempt we save earns us cleaner ops.
      let stopped = false;
      let lastErr: unknown = null;
      // P1-C4 (audit v7): refresh_token on disk may be encrypted —
      // decrypt before handing it to Google.
      const refreshClear = decryptToken(existing.refresh_token);
      if (!refreshClear) continue;
      for (let attempt = 0; attempt < 2 && !stopped; attempt++) {
        try {
          const tokens = await refreshGoogleToken(refreshClear);
          if (tokens.access_token) {
            await stopGoogleWebhook(
              tokens.access_token,
              existing.google_channel_id,
              existing.google_resource_id
            );
            stopped = true;
          }
        } catch (err) {
          lastErr = err;
        }
      }
      if (!stopped && lastErr) {
        Sentry.captureException(lastErr);
      }
    }
  }

  let del = supabase
    .from("calendar_connections")
    .delete()
    .eq("profile_id", user.id)
    .eq("provider", "google");
  if (connectionId) del = del.eq("id", connectionId);
  await del;

  // Soft-delete all google-sourced events when nuking the whole provider.
  // For a targeted single-connection disconnect we leave the events alone
  // because the row may have been one of several feeding the same household;
  // the next sync of the surviving connections rebuilds the picture.
  if (!connectionId) {
    await supabase
      .from("calendar_events")
      .update({ deleted_at: new Date().toISOString() })
      .eq("owner_parent_id", user.id)
      .eq("external_source", "google");
  }

  return NextResponse.json({ success: true });
}
