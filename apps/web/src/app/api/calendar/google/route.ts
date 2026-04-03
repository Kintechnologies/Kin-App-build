import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/api-auth";
import { getGoogleAuthUrl } from "@/lib/calendar/google";

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

// DELETE /api/calendar/google — disconnect Google Calendar
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
    .eq("provider", "google");

  // Soft-delete all google-sourced events
  await supabase
    .from("calendar_events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("owner_parent_id", user.id)
    .eq("external_source", "google");

  return NextResponse.json({ success: true });
}
