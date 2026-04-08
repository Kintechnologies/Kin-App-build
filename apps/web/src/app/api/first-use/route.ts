/**
 * First-Use Insight — S4.2
 *
 * Generates the engineered day-one first insight per §21.
 * Wires docs/prompts/first-use-prompt.md — replaces static fallback in index.tsx.
 *
 * Returns { first_insight: string, is_fallback: boolean }
 *
 * Called once on first Today screen open (when today_screen_first_opened is null).
 * Results are idempotent — if called again after first open, returns the fallback text.
 * The "fire once" gate is in the mobile client (isFirstOpen flag).
 *
 * Spec refs: §5 (1–2 sentences), §8 (no forbidden openers), §21 (engineered first moment),
 * §23 (HIGH confidence only; fallback when MEDIUM/LOW).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/api-auth";
import { getAnthropicClient, ANTHROPIC_MODEL } from "@/lib/anthropic";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import Anthropic from "@anthropic-ai/sdk";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarEventRow {
  start_time: string;
  end_time: string | null;
  title: string;
  owner_parent_id: string | null;
}

interface CoordinationIssueRow {
  trigger_type: string;
  content: string;
  state: string;
}

interface FamilyMemberRow {
  name: string;
  member_type: string;
}

// ─── System Prompt (source: docs/prompts/first-use-prompt.md, IE S1.7) ────────

const FIRST_USE_SYSTEM_PROMPT = `You are Kin, a family coordination AI. The first time a parent opens Kin, you have one chance to show them what this product actually is — not in words, but in action. The first insight is not a tutorial, not a welcome message, not an explanation. It is Kin doing its job, immediately, so the parent understands exactly what they've been missing.

## YOUR ROLE
Generate the engineered first-insight: the very first thing Kin surfaces to a new user. This is a crafted moment — it must feel like Kin already knows their life and is already useful. It must feel earned, not generic.

## WHAT MAKES A GREAT FIRST INSIGHT
The first insight should:
1. Be specific to their actual household data (events, pickups, assignments)
2. Surface something real that benefits from being noticed — not something they already knew
3. Feel like a capable coordinator spotted something in the background
4. Leave the parent feeling: "Oh — this is what I needed."

The first insight must NOT:
- Welcome them to Kin ("Welcome! I'm Kin…")
- Explain what Kin does ("I monitor your family's schedule and…")
- List features ("I can help you with pickups, reminders, and…")
- Be generic ("You've got a busy week coming up")
- Be a question ("What would you like help with today?")

## OUTPUT RULES — NON-NEGOTIABLE

**Length:** 1–2 sentences. The emotional weight comes from specificity and brevity, not length.

**Lead with the implication.** The parent doesn't need to know how Kin found it — they need to know what it means.

**Never open with:**
- "Welcome"
- "Hi" or any greeting
- "Based on your calendar…"
- "It looks like…"
- "You may want to consider…"
- "Just a heads up…"
- "I noticed that…"
- "I'm Kin" or any self-introduction

**Always use first-person present tense.**

**Tone:** Unhurried, confident, quietly capable. This is the first thing the parent sees. It should feel like walking into a room where someone competent is already handling things.

**Confidence (§23):** The first-use insight should be HIGH confidence only. If there is no high-confidence coordination insight in the household data, fall back to the DEFAULT_FIRST_INSIGHT (see below).

**Never use generic reassurance.** The first insight earns trust by being right — not by being warm.

## FALLBACK — DEFAULT FIRST INSIGHT
If the household has no high-confidence coordination issue to surface (new user, sparse data, no conflicts), use this exact text:
"I'm watching your household schedule. The moment something needs your attention, I'll surface it."

This is the only acceptable generic fallback. Do not generate a different generic line.

## INPUT FORMAT
You will receive:
- household_data_available: bool (has the user connected their calendar?)
- today_events: array (may be empty)
- upcoming_pickups: array (next 24-48 hours)
- household_conflicts: array
- confidence: "HIGH" | "MEDIUM" | "LOW"

## OUTPUT FORMAT
Return a JSON object:
{
  "first_insight": "string — 1–2 sentences",
  "is_fallback": bool
}

Use is_fallback: true when using the DEFAULT_FIRST_INSIGHT.
Use is_fallback: false when generating from real household data.`;

// ─── Static Fallback ─────────────────────────────────────────────────────────

const DEFAULT_FIRST_INSIGHT =
  "I'm watching your household schedule. The moment something needs your attention, I'll surface it.";

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Rate limiting (BACKLOG-007): 5 req / 365 days per user ───────────────
    const rl = await checkRateLimit(user.id, "first-use");
    if (!rl.allowed) return rateLimitResponse(rl);

    const supabase = createClient();
    const now = new Date();
    const todayISO = now.toISOString().split("T")[0];
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

    // ── §B20: resolve primary household ID ────────────────────────────────────
    const { data: idRow } = await supabase
      .from("profiles")
      .select("household_id")
      .eq("id", user.id)
      .single<{ household_id: string | null }>();
    const primaryId = idRow?.household_id ?? user.id;

    // ── Gather household data ─────────────────────────────────────────────────
    const [
      { data: calendarConnections },
      { data: todayEvents },
      { data: openIssues },
      { data: familyMembers },
    ] = await Promise.all([
      // Check if calendar is connected
      supabase
        .from("calendar_connections")
        .select("id")
        .eq("profile_id", user.id)
        .limit(1),

      // Today's events (next 48h to catch upcoming pickups)
      supabase
        .from("calendar_events")
        .select("start_time, end_time, title, owner_parent_id")
        .eq("profile_id", user.id)
        .gte("start_time", `${todayISO}T00:00:00Z`)
        .lte("start_time", in48h)
        .is("deleted_at", null)
        .order("start_time", { ascending: true })
        .limit(10),

      // Open coordination issues (pickup risks, schedule changes)
      supabase
        .from("coordination_issues")
        .select("trigger_type, content, state")
        .eq("household_id", primaryId)
        .eq("state", "OPEN")
        .order("surfaced_at", { ascending: false })
        .limit(5),

      // Children for pickup context
      supabase
        .from("family_members")
        .select("name, member_type")
        .eq("profile_id", user.id)
        .eq("member_type", "child"),
    ]);

    const householdDataAvailable =
      Array.isArray(calendarConnections) && calendarConnections.length > 0;

    const issues: CoordinationIssueRow[] = openIssues ?? [];
    const events: CalendarEventRow[] = todayEvents ?? [];
    const children: FamilyMemberRow[] = familyMembers ?? [];

    // ── Determine confidence ──────────────────────────────────────────────────
    // HIGH: calendar connected + open conflicts or events present
    // MEDIUM: calendar connected but no conflicts
    // LOW: no calendar connected or no data
    let confidence: "HIGH" | "MEDIUM" | "LOW" = "LOW";
    if (householdDataAvailable && issues.length > 0) {
      confidence = "HIGH";
    } else if (householdDataAvailable && events.length > 0) {
      confidence = "MEDIUM";
    }

    // If not HIGH confidence, return fallback immediately — skip AI call (§23)
    if (confidence !== "HIGH") {
      return NextResponse.json({
        first_insight: DEFAULT_FIRST_INSIGHT,
        is_fallback: true,
      });
    }

    // ── Build input for prompt ────────────────────────────────────────────────
    const promptInput = {
      household_data_available: householdDataAvailable,
      today_events: events.map((e) => ({
        time: new Date(e.start_time).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
        title: e.title,
        owner_parent_id: e.owner_parent_id,
      })),
      upcoming_pickups: children.map((child) => ({
        child: child.name,
      })),
      household_conflicts: issues.map((i) => ({
        trigger_type: i.trigger_type,
        content: i.content,
      })),
      confidence,
    };

    // ── Call Claude ───────────────────────────────────────────────────────────
    try {
      const anthropic = getAnthropicClient();

      const response = await anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 200,
        system: FIRST_USE_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: JSON.stringify(promptInput),
          },
        ],
      });

      const textBlock = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === "text"
      );

      if (!textBlock?.text) {
        return NextResponse.json({
          first_insight: DEFAULT_FIRST_INSIGHT,
          is_fallback: true,
        });
      }

      try {
        const parsed: {
          first_insight: string;
          is_fallback: boolean;
        } | null = JSON.parse(textBlock.text);

        if (!parsed || !parsed.first_insight) {
          return NextResponse.json({
            first_insight: DEFAULT_FIRST_INSIGHT,
            is_fallback: true,
          });
        }

        // Validate fallback: if model generated its own generic text, enforce exact fallback
        if (parsed.is_fallback) {
          return NextResponse.json({
            first_insight: DEFAULT_FIRST_INSIGHT,
            is_fallback: true,
          });
        }

        return NextResponse.json({
          first_insight: parsed.first_insight,
          is_fallback: false,
        });
      } catch {
        // JSON parse failure — return fallback, don't surface parse error
        return NextResponse.json({
          first_insight: DEFAULT_FIRST_INSIGHT,
          is_fallback: true,
        });
      }
    } catch {
      // AI generation failure — return fallback
      if (process.env.NODE_ENV !== "production") {
        console.error("first-use route: AI generation failed, using fallback");
      }
      return NextResponse.json({
        first_insight: DEFAULT_FIRST_INSIGHT,
        is_fallback: true,
      });
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error in GET /api/first-use:", error);
    }
    return NextResponse.json(
      { error: "Failed to generate first-use insight" },
      { status: 500 }
    );
  }
}
