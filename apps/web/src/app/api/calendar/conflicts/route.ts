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

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Conflict ID required" }, { status: 400 });
  }

  // Length-cap the free-form note (audit V7 P2-A6): this string lands in the
  // briefing prompt, so an oversized payload balloons LLM token cost. 500
  // chars is a comfortable single-paragraph ceiling.
  let trimmedNote: string | null = null;
  if (resolution_note != null) {
    if (typeof resolution_note !== "string") {
      return NextResponse.json(
        { error: "resolution_note must be a string" },
        { status: 400 }
      );
    }
    trimmedNote = resolution_note.slice(0, 500);
  }

  const { error } = await supabase
    .from("calendar_conflicts")
    .update({
      resolved: true,
      resolved_at: new Date().toISOString(),
      resolution_note: trimmedNote,
    })
    .eq("id", id)
    .eq("household_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
