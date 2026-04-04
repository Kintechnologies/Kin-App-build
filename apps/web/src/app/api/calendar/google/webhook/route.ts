import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncCalendarForConnection } from "@/lib/calendar/sync";

// POST /api/calendar/google/webhook — Google push notification
export async function POST(request: Request) {
  const channelId = request.headers.get("x-goog-channel-id");
  const resourceId = request.headers.get("x-goog-resource-id");
  const resourceState = request.headers.get("x-goog-resource-state");
  const channelToken = request.headers.get("x-goog-channel-token");

  if (!channelId || !resourceId) {
    return NextResponse.json({ error: "Missing headers" }, { status: 400 });
  }

  // Verify the channel token matches our shared secret (Google's recommended approach).
  // See: https://developers.google.com/calendar/api/guides/push#receiving_notifications
  // GOOGLE_WEBHOOK_SECRET must be set in env vars and passed when registering channels.
  const webhookSecret = process.env.GOOGLE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    if (process.env.NODE_ENV === "production") {
      // Fail hard in production — unauthenticated webhook requests must never be accepted.
      console.error("GOOGLE_WEBHOOK_SECRET is not set. All Google Calendar webhook requests are being rejected.");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }
    // In development, allow through with a warning so local testing isn't blocked.
    console.warn("GOOGLE_WEBHOOK_SECRET not set — skipping token verification (dev only)");
  } else if (channelToken !== webhookSecret) {
    return NextResponse.json({ error: "Invalid channel token" }, { status: 401 });
  }

  // Ignore the initial sync confirmation
  if (resourceState === "sync") {
    return NextResponse.json({ ok: true });
  }

  const supabase = createClient();

  // Find the connection by channel ID
  const { data: connection } = await supabase
    .from("calendar_connections")
    .select("id")
    .eq("google_channel_id", channelId)
    .eq("google_resource_id", resourceId)
    .single();

  if (!connection) {
    return NextResponse.json({ error: "Unknown channel" }, { status: 404 });
  }

  // Trigger sync (non-blocking)
  syncCalendarForConnection(connection.id).catch(() => {
    // TODO: log to Sentry before GA
    if (process.env.NODE_ENV !== "production") {
      console.error("Webhook-triggered sync error for connection:", connection.id);
    }
  });

  return NextResponse.json({ ok: true });
}
