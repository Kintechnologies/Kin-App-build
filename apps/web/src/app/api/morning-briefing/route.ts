import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/api-auth";
import { getAnthropicClient, ANTHROPIC_MODEL } from "@/lib/anthropic";
import { buildCommuteLine } from "@/lib/commute";
import { buildDateNightSuggestion } from "@/lib/date-night";
import Anthropic from "@anthropic-ai/sdk";

// Local shape types for Supabase query results in this route
interface CalendarEventRow {
  start_time: string;
  title: string;
  location?: string;
}

interface ActivityRow {
  day_of_week?: string[];
  name: string;
  start_time?: string;
  family_member?: { name: string };
}

interface BudgetSummaryRow {
  category_name: string;
  total_spent: number;
  monthly_limit: number;
  remaining: number;
}

interface PetMedRow {
  time_of_day?: string[];
  name: string;
  frequency: string;
  family_member?: { name: string };
}

interface PetVaccinationRow {
  name: string;
  next_due_date: string;
  family_member?: { name: string };
}

/**
 * Generates the daily morning briefing for an authenticated user
 * Returns today's briefing if already generated, or generates a new one
 */
async function generateBriefingContent(
  supabase: ReturnType<typeof createClient>,
  profileId: string
): Promise<string> {
  try {
    // Get all necessary data for briefing
    const today = new Date().toISOString().split("T")[0];

    const [
      { data: profile },
      { data: schedule },
      { data: todayEvents },
      { data: _children },
      { data: activities },
      { data: _pets },
      { data: petMeds },
      { data: budgetSummary },
      { data: petVaccinations },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", profileId).single(),
      supabase
        .from("parent_schedules")
        .select("*")
        .eq("profile_id", profileId)
        .single(),
      supabase
        .from("calendar_events")
        .select("*")
        .eq("profile_id", profileId)
        .gte("start_time", `${today}T00:00:00Z`)
        .lte("start_time", `${today}T23:59:59Z`)
        .order("start_time", { ascending: true }),
      supabase
        .from("family_members")
        .select("*")
        .eq("profile_id", profileId)
        .eq("member_type", "child"),
      supabase
        .from("children_activities")
        .select("*, family_member:family_members(name)")
        .eq("profile_id", profileId)
        .eq("active", true),
      supabase
        .from("family_members")
        .select("*")
        .eq("profile_id", profileId)
        .eq("member_type", "pet"),
      supabase
        .from("pet_medications")
        .select("*, family_member:family_members(name)")
        .eq("profile_id", profileId)
        .eq("active", true),
      supabase.rpc("get_budget_summary", { user_id: profileId }),
      supabase
        .from("pet_vaccinations")
        .select("*, family_member:family_members(name)")
        .eq("profile_id", profileId)
        .lte("next_due_date", today)
        .order("next_due_date", { ascending: true }),
    ]);

    // Build briefing context
    let briefingContext = `MORNING BRIEFING FOR ${profile?.family_name || "Family"}

Today: ${new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })}

═══════════════════════════════════════════════════════════════
 TODAY'S SCHEDULE & LOGISTICS
═══════════════════════════════════════════════════════════════`;

    // Add schedule context
    if (schedule) {
      briefingContext += `

Your day:
${schedule.raw_description || "Not specified"}

Locations:
  Home: ${schedule.home_location || "Not set"}
  Work: ${schedule.work_location || "Not set"}
  Commute: ${schedule.commute_mode || "Not specified"}`;
    }

    // Add today's calendar events
    if (todayEvents && todayEvents.length > 0) {
      briefingContext += `

Today's calendar:`;
      todayEvents.forEach((event: CalendarEventRow) => {
        const start = new Date(event.start_time).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
        briefingContext += `
  ${start} - ${event.title}${event.location ? ` (${event.location})` : ""}`;
      });
    } else {
      briefingContext += "\n\nNo calendar events today.";
    }

    // D3 — Commute intelligence: calculate leave-by time for first event
    if (schedule && todayEvents && todayEvents.length > 0) {
      const commuteLine = await buildCommuteLine(
        schedule.home_location,
        schedule.work_location,
        schedule.commute_mode,
        todayEvents
      );
      if (commuteLine) {
        briefingContext += `

Commute:
  ${commuteLine}`;
      }
    }

    // Add kids' activities
    const todayDayName = new Date().toLocaleDateString("en-US", {
      weekday: "long",
    });
    const todayActivities: ActivityRow[] = activities
      ? activities.filter((a: ActivityRow) =>
          (a.day_of_week || []).includes(todayDayName)
        )
      : [];

    if (todayActivities.length > 0) {
      briefingContext += `

Kids' activities today:`;
      todayActivities.forEach((activity: ActivityRow) => {
        const time = activity.start_time
          ? new Date(`2000-01-01T${activity.start_time}`).toLocaleTimeString(
              "en-US",
              { hour: "numeric", minute: "2-digit" }
            )
          : "Time TBD";
        briefingContext += `
  ${activity.family_member?.name}: ${activity.name} @ ${time}`;
      });
    }

    // Add budget status
    briefingContext += `

═══════════════════════════════════════════════════════════════
 BUDGET & SPENDING
═══════════════════════════════════════════════════════════════`;

    if (budgetSummary && budgetSummary.length > 0) {
      budgetSummary.forEach((b: BudgetSummaryRow) => {
        const percentUsed = Math.round((b.total_spent / b.monthly_limit) * 100);
        const status =
          percentUsed > 100
            ? `OVER by $${Math.abs(b.remaining)}`
            : `$${b.remaining} remaining`;
        briefingContext += `
${b.category_name}: $${b.total_spent}/$${b.monthly_limit} (${status})`;
      });
    } else {
      briefingContext += "\nNo budget data yet.";
    }

    // D8/D9 — Date night engine: inject suggestion if 14+ days since last date night
    const dateNightBlock = await buildDateNightSuggestion(supabase, profileId);
    if (dateNightBlock) {
      briefingContext += `

═══════════════════════════════════════════════════════════════
 RELATIONSHIP
═══════════════════════════════════════════════════════════════
${dateNightBlock}`;
    }

    // Add pet medications due today
    const todayMeds: PetMedRow[] = petMeds
      ? petMeds.filter((med: PetMedRow) =>
          (med.time_of_day || []).length > 0 // Has scheduled times
        )
      : [];

    if (todayMeds.length > 0) {
      briefingContext += `

═══════════════════════════════════════════════════════════════
 PET CARE
═══════════════════════════════════════════════════════════════
Medications to give today:`;
      todayMeds.forEach((med: PetMedRow) => {
        briefingContext += `
  ${med.family_member?.name}: ${med.name} - ${med.frequency}`;
      });
    }

    // Add upcoming pet vaccinations
    if (petVaccinations && petVaccinations.length > 0) {
      briefingContext += `
Due vaccination(s):`;
      petVaccinations.forEach((vac: PetVaccinationRow) => {
        briefingContext += `
  ${vac.family_member?.name}: ${vac.name}`;
      });
    }

    // Note: This briefing focuses on logistics and budget — no meal suggestions.
    // Allergies are not needed here. (Meal planning queries allergies separately via /api/meals)
    const anthropic = getAnthropicClient();

    const systemPrompt = `You are Kin, a warm and direct family AI. Your job is to synthesize the family data below into a single, concise morning briefing message.

RULES FOR YOUR BRIEFING:
1. Warm, direct, and human - no corporate language
2. Always use specific numbers ($143 of $180, not "most of your budget")
3. One question maximum, at the very end (maybe a meal suggestion or weekend plan)
4. Never hedge ("I think", "perhaps") - be confident
5. Short by default - readable in 30-60 seconds
6. Open with "Morning." - then give the most important thing first
7. Cover: schedule/commute, calendar conflicts, kids' pickups/activities, budget status, pet care
8. End warmly with something specific to their week

Do NOT:
- Use bullet points
- Say "Here's your briefing..."
- Include the family name more than once
- Over-explain - just state facts
- Give advice unless asked`;

    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: briefingContext,
        },
      ],
    });

    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );

    return textBlock?.text || "Unable to generate briefing";
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error generating briefing content:", error);
    }
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    // Check if briefing already exists for today
    const { data: existingBriefing } = await supabase
      .from("morning_briefings")
      .select("*")
      .eq("profile_id", user.id)
      .eq("briefing_date", today)
      .single();

    if (existingBriefing) {
      return NextResponse.json({
        content: existingBriefing.content,
        deliveryStatus: existingBriefing.delivery_status,
      });
    }

    // Generate new briefing
    const content = await generateBriefingContent(supabase, user.id);

    // Store in database
    await supabase.from("morning_briefings").insert({
      profile_id: user.id,
      briefing_date: today,
      content,
      delivery_status: "generated",
    });

    return NextResponse.json({ content, deliveryStatus: "generated" });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error in GET /api/morning-briefing:", error);
    }
    return NextResponse.json(
      { error: "Failed to generate morning briefing" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    // Delete existing briefing for today (force regeneration)
    await supabase
      .from("morning_briefings")
      .delete()
      .eq("profile_id", user.id)
      .eq("briefing_date", today);

    // Generate new briefing
    const content = await generateBriefingContent(supabase, user.id);

    // Store in database
    await supabase.from("morning_briefings").insert({
      profile_id: user.id,
      briefing_date: today,
      content,
      delivery_status: "generated",
    });

    return NextResponse.json({ content, deliveryStatus: "generated" });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error in POST /api/morning-briefing:", error);
    }
    return NextResponse.json(
      { error: "Failed to generate morning briefing" },
      { status: 500 }
    );
  }
}
