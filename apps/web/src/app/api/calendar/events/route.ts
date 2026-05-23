import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/api-auth";
import { resolveHouseholdId } from "@/lib/household-context";

// GET /api/calendar/events — list events for the current user
export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createClient();

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("start");
  const endDate = searchParams.get("end");
  const view = searchParams.get("view") || "personal"; // personal | household

  let query = supabase
    .from("calendar_events")
    .select("*")
    .is("deleted_at", null)
    .order("start_time", { ascending: true });

  if (view === "household") {
    // Show own events + shared events + kid events
    query = query.or(
      `owner_parent_id.eq.${user.id},is_shared.eq.true,is_kid_event.eq.true`
    );
  } else {
    // Only own events
    query = query.eq("owner_parent_id", user.id);
  }

  if (startDate) query = query.gte("start_time", startDate);
  if (endDate) query = query.lte("start_time", endDate);

  const { data: events, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events });
}

// POST /api/calendar/events — create a new event
export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createClient();

  const body = await request.json();
  const {
    title,
    description,
    location,
    start_time,
    end_time,
    all_day = false,
    is_shared = false,
    is_kid_event = false,
    assigned_member,
    color,
    recurrence_rule,
  } = body;

  if (!title || !start_time || !end_time) {
    return NextResponse.json(
      { error: "Title, start_time, and end_time are required" },
      { status: 400 }
    );
  }

  // Stamp the household primary's id, not the caller's (audit V7 P2-C4).
  // Partner accounts otherwise create events keyed to partner.id, which
  // disappears from the primary's household-scoped briefing query.
  const householdId = await resolveHouseholdId(supabase, user.id);

  const { data: event, error } = await supabase
    .from("calendar_events")
    .insert({
      profile_id: user.id,
      owner_parent_id: user.id,
      household_id: householdId,
      title,
      description,
      location,
      start_time,
      end_time,
      all_day,
      is_shared: is_kid_event ? true : is_shared,
      is_kid_event,
      assigned_member,
      color,
      recurrence_rule,
      external_source: "kin",
      sync_status: "synced",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ event }, { status: 201 });
}

// PUT /api/calendar/events — update an event
//
// P1-A3 (audit v7): allowlist the fields a caller may patch. The previous
// `const { id, ...updates } = body; .update({...updates})` spread accepted
// every key on the request body — including is_shared, is_kid_event, and
// visibility. RLS gates the row, but within their own row a user could flip
// visibility=private → public OR is_shared=true and leak the event into the
// household briefing (defeating migration 051's private-event PII guard).
const ALLOWED_UPDATE_FIELDS = [
  "title",
  "description",
  "location",
  "start_time",
  "end_time",
  "all_day",
  "color",
  "recurrence_rule",
  "assigned_member",
] as const;

export async function PUT(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createClient();

  const body = await request.json();
  const { id } = body as { id?: string };

  if (!id) {
    return NextResponse.json({ error: "Event ID required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (field in body) updates[field] = (body as Record<string, unknown>)[field];
  }

  const { data: event, error } = await supabase
    .from("calendar_events")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("owner_parent_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ event });
}

// DELETE /api/calendar/events — soft-delete an event
export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createClient();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Event ID required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("calendar_events")
    .update({
      deleted_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("owner_parent_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
