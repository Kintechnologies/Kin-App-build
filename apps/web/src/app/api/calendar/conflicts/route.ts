import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/api-auth";

// GET /api/calendar/conflicts — list unresolved conflicts
export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createClient();

  const { data: conflicts } = await supabase
    .from("calendar_conflicts")
    .select(`
      *,
      event_a:calendar_events!event_a_id(id, title, start_time, end_time, owner_parent_id, assigned_member, is_kid_event),
      event_b:calendar_events!event_b_id(id, title, start_time, end_time, owner_parent_id, assigned_member, is_kid_event)
    `)
    .eq("household_id", user.id)
    .eq("resolved", false)
    .order("created_at", { ascending: false });

  return NextResponse.json({ conflicts: conflicts || [] });
}

// PUT /api/calendar/conflicts — resolve a conflict
export async function PUT(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createClient();

  const { id, resolution_note } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "Conflict ID required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("calendar_conflicts")
    .update({
      resolved: true,
      resolved_at: new Date().toISOString(),
      resolution_note,
    })
    .eq("id", id)
    .eq("household_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
