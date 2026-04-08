import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/api-auth";
import { getAnthropicClient, ANTHROPIC_MODEL } from "@/lib/anthropic";
import { buildCommuteLine } from "@/lib/commute";
import { buildDateNightSuggestion } from "@/lib/date-night";
import { detectPickupRisk } from "@/lib/pickup-risk";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
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
    // ── §3A: Run pickup risk detection before building context ────────────────
    // Creates any new OPEN coordination_issues for today's pickup windows.
    // Runs idempotently — deduped by window start time.
    await detectPickupRisk(supabase, profileId).catch(() => {
      // Non-fatal: if detection fails, briefing continues without pickup context
    });

    // ── §B20: Resolve primary household ID ───────────────────────────────────
    // coordination_issues.household_id always stores the primary parent's ID.
    // Partner users have household_id set to the primary parent's ID in their
    // profiles row; primary users have household_id = null (they ARE primary).
    const { data: idRow } = await supabase
      .from("profiles")
      .select("household_id")
      .eq("id", profileId)
      .single<{ household_id: string | null }>();
    const primaryId = idRow?.household_id ?? profileId;

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
      { data: openIssues },
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
      // §3A: fetch OPEN + ACKNOWLEDGED coordination issues for briefing context.
      // S2-LE-05 (morning-briefing-prompt.md session 13): ACKNOWLEDGED issues must be
      // included so the model can apply softer framing ("still open — acknowledged")
      // rather than OPEN discovery framing ("you're both tied up at that time").
      // RESOLVED issues excluded — state machine discipline same as chat route.
      // §B20: use primaryId — coordination_issues.household_id stores the primary parent's ID;
      // querying by profileId would return 0 rows for partner users.
      supabase
        .from("coordination_issues")
        .select("trigger_type, content, state")
        .eq("household_id", primaryId)
        .in("state", ["OPEN", "ACKNOWLEDGED"])
        .order("surfaced_at", { ascending: false })
        .limit(5),
    ]);

    // Build briefing context
    let briefingContext = `MORNING BRIEFING FOR ${profile?.family_name || "Family"}

Today: ${new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })}`;

    // §3A + S2-LE-05: Include OPEN and ACKNOWLEDGED coordination issues.
    // State is passed explicitly so the model applies correct framing:
    //   OPEN → discovery framing ("coverage is unconfirmed")
    //   ACKNOWLEDGED → status-update framing ("still open — parent is aware")
    // Pickup risk is the highest-priority insight — surface it first.
    const issueList = openIssues ?? [];
    const pickupIssues = issueList.filter(
      (i: { trigger_type: string; content: string; state: string }) =>
        i.trigger_type === "pickup_risk"
    );
    const otherIssues = issueList.filter(
      (i: { trigger_type: string; content: string; state: string }) =>
        i.trigger_type !== "pickup_risk"
    );

    if (issueList.length > 0) {
      briefingContext += `

═══════════════════════════════════════════════════════════════
 COORDINATION ISSUES — LEAD WITH THESE (highest priority)
═══════════════════════════════════════════════════════════════
INSTRUCTION: Open the briefing with the most critical coordination issue below.
State field determines framing: OPEN = discovery alert; ACKNOWLEDGED = status update (softer language — parent already aware).
Do not bury these. They are the primary reason for the briefing.`;

      if (pickupIssues.length > 0) {
        briefingContext += `\n\nPickup risk:`;
        pickupIssues.forEach(
          (i: { content: string; state: string }) => {
            briefingContext += `\n  - [state: ${i.state}] ${i.content}`;
          }
        );
      }

      if (otherIssues.length > 0) {
        briefingContext += `\n\nOther coordination issues:`;
        otherIssues.forEach(
          (i: { trigger_type: string; content: string; state: string }) => {
            briefingContext += `\n  - [${i.trigger_type}] [state: ${i.state}] ${i.content}`;
          }
        );
      }
    }

    briefingContext += `

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

    // ── System prompt from docs/prompts/morning-briefing-prompt.md (IE session 13) ──
    // Source of truth: docs/prompts/morning-briefing-prompt.md
    // Updated run AX: added ACKNOWLEDGED state framing (S2-LE-05) + relief selection guide.
    // §5: 1 primary insight + 1 supporting detail, ≤4 sentences total
    // §7: return null when nothing worth surfacing
    // §8: no forbidden openers; first-person present tense; exact relief language only
    // §23: HIGH = direct; MEDIUM = one qualifier max; LOW = null
    const systemPrompt = `You are Kin, a family coordination AI. You surface the one thing a busy parent most needs to know right now — not a summary of their day, but the single implication that will save them a scramble.

## YOUR ROLE
Generate the morning briefing for the Today screen. This runs once per day, early morning, based on the household's calendar, pickup assignments, known conflicts, and recent coordination changes.

## OUTPUT RULES — NON-NEGOTIABLE

**Length:** 1 primary insight + 1 supporting detail. Never more than 4 sentences total. If you have nothing meaningful to surface, return null — do not fill space.

**Lead with implication, not data.** The user already has a calendar. Your job is to tell them what it means for today — specifically for coordination, coverage, and family logistics.

**Never open with:**
- "Based on your calendar…"
- "It looks like…"
- "You may want to consider…"
- "Just a heads up…"
- "I noticed that…"
- "Good morning" or any greeting
- "You've got a busy day"

**Always use first-person present tense.** ("I'm watching the 3pm pickup window." — not "It appears the 3pm pickup may be affected.")

**Confidence:**
- High confidence → state directly, no framing
- Medium confidence → one qualifier max ("looks like", "worth confirming", "probably")
- Low confidence → return null (silence is correct here)

**Relief language — use exact phrases only. Selection guide:**
- "I'll remind you when it's time to leave." → use when there is a specific departure or action time the parent needs to hit (a pickup window, a school dropoff, a hard deadline)
- "I'll keep an eye on it." → use when an unresolved issue exists but is not yet escalated; Kin is actively watching for changes
- "I'll flag it if anything changes." → use when the current state is adequate but dynamic; Kin is in standby, not active watch

One relief line max per briefing. Only include if monitoring is genuinely warranted. Do not append a relief line to a null briefing.

**Never use:**
- "I've got this" or "Don't worry"
- Stacked hedges ("It looks like it might be worth…")
- Generic reassurance

**ACKNOWLEDGED state framing:** Coordination issues in the context include a [state: OPEN] or [state: ACKNOWLEDGED] tag.
- OPEN → full discovery framing ("coverage is unconfirmed — you're both tied up at that time")
- ACKNOWLEDGED → status-update framing: a parent has already seen this alert and is presumably handling it. Use softer language: "still open — acknowledged but not yet resolved." Do NOT re-alert with full urgency. This is a status check, not a discovery.

## OUTPUT FORMAT
Return a JSON object:
{
  "primary_insight": "string — the single most important thing, ≤2 sentences",
  "supporting_detail": "string or null — one additional sentence if it adds material value",
  "relief_line": "string or null — one of the three exact relief phrases if monitoring is warranted"
}

Return null for the entire object if there is nothing worth surfacing (§7 silence rule).

## WHAT COUNTS AS WORTH SURFACING
- A pickup with no confirmed handler
- A schedule change in the last 12 hours that affects coverage
- Both parents with conflicting commitments during a required window
- A hard deadline the household needs to move around

## WHAT DOES NOT COUNT
- A normally scheduled busy day
- Routine events with confirmed coverage
- Anything the family already resolved
- Events outside the current day`;

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

    if (!textBlock?.text) return "Unable to generate briefing";

    // ── Parse structured JSON output from IE-approved prompt ─────────────────
    // The prompt returns { primary_insight, supporting_detail, relief_line } or null.
    // Assemble into plain-text string for the mobile briefing card (§5 ≤4 sentences).
    try {
      const parsed: {
        primary_insight: string;
        supporting_detail: string | null;
        relief_line: string | null;
      } | null = JSON.parse(textBlock.text);

      if (!parsed) {
        // §7 silence rule: AI returned null — nothing worth surfacing today
        return "";
      }

      const parts = [parsed.primary_insight];
      if (parsed.supporting_detail) parts.push(parsed.supporting_detail);
      if (parsed.relief_line) parts.push(parsed.relief_line);
      return parts.join(" ");
    } catch {
      // If the model doesn't return clean JSON (e.g. wraps in markdown code fence),
      // fall back to returning raw text — better than surfacing a parse error.
      return textBlock.text;
    }
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

    // ── Rate limiting (BACKLOG-007): 1 req/day per user ──────────────────────
    const rl = await checkRateLimit(user.id, "morning-briefing");
    if (!rl.allowed) return rateLimitResponse(rl);

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

    // ── Rate limiting (BACKLOG-007): 1 req/day per user ──────────────────────
    const rl = await checkRateLimit(user.id, "morning-briefing");
    if (!rl.allowed) return rateLimitResponse(rl);

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
