import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncCalendarForConnection } from "@/lib/calendar/sync";

// POST /api/calendar/google/webhook — Google push notification
export async function POST(request: Request) {
  const channelId = request.headers.get("x-goog-channel-id");
  const resourceId = request.headers.get("x-goog-resource-id");
  const resourceState = request.headers.get("x-goog-resource-state");

  if (!channelId || !resourceId) {
    return NextResponse.json({ error: "Missing headers" }, { status: 400 });
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
  syncCalendarForConnection(connection.id).catch((err) =>
    console.error("Webhook-triggered sync error:", err)
  );

  return NextResponse.json({ ok: true });
}
