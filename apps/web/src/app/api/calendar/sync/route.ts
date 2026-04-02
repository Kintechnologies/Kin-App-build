import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/api-auth";
import { syncCalendarForConnection } from "@/lib/calendar/sync";

// POST /api/calendar/sync — trigger sync for current user's connections
export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createClient();

  const { data: connections } = await supabase
    .from("calendar_connections")
    .select("id, provider, sync_status")
    .eq("profile_id", user.id)
    .eq("enabled", true);

  if (!connections?.length) {
    return NextResponse.json({ message: "No connected calendars" });
  }

  const results = [];
  for (const conn of connections) {
    try {
      await syncCalendarForConnection(conn.id);
      results.push({ provider: conn.provider, status: "synced" });
    } catch (err) {
      results.push({
        provider: conn.provider,
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ results });
}

// GET /api/calendar/sync — get sync status
export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createClient();

  const { data: connections } = await supabase
    .from("calendar_connections")
    .select("id, provider, sync_status, sync_error, last_synced_at, enabled")
    .eq("profile_id", user.id);

  return NextResponse.json({ connections: connections || [] });
}
