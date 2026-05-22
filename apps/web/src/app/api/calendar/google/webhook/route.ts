import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { syncCalendarForConnection } from "@/lib/calendar/sync";
import * as Sentry from "@sentry/nextjs";

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
  // GOOGLE_WEBHOOK_SECRET must be set in every environment (including previews
  // and local dev) and passed when registering channels — there is no
  // environment in which unauthenticated webhook requests are acceptable.
  const webhookSecret = process.env.GOOGLE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("GOOGLE_WEBHOOK_SECRET is not set. Rejecting webhook request.");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }
  // timingSafeEqual requires equal-length buffers and throws otherwise; the
  // length check both prevents the throw and itself runs in constant time.
  const tokenBuf = Buffer.from(channelToken ?? "");
  const secretBuf = Buffer.from(webhookSecret);
  if (tokenBuf.length !== secretBuf.length || !timingSafeEqual(tokenBuf, secretBuf)) {
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
    // 410 Gone tells Google the channel is permanently dead and to stop
    // retrying. A 404 keeps the channel "live" from Google's perspective and
    // they pound our webhook until the channel TTL (up to 7 days) elapses.
    return NextResponse.json({ error: "Channel no longer registered" }, { status: 410 });
  }

  // Trigger sync (non-blocking)
  syncCalendarForConnection(connection.id).catch((err) => {
    Sentry.captureException(err);
  });

  return NextResponse.json({ ok: true });
}
