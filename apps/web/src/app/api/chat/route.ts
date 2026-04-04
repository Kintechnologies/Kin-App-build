/**
 * Chat Route — B30
 *
 * Wires docs/prompts/chat-prompt.md system prompt for the personal thread.
 * Replaces pre-pivot buildSystemPrompt (broad family-OS prompt) with the
 * IE-approved coordination-only prompt per §5/§7/§8/§11/§16/§19/§23.
 *
 * Coordination context (speaking_to, today_events, open_coordination_issues,
 * recent_schedule_changes) is prepended to each user message per chat-prompt.md
 * § CONTEXT PROVIDED PER MESSAGE.
 *
 * Web search tool is retained (Lead Eng directive: "Web search tool stays").
 * Scope restriction is enforced by the system prompt, not by removing the tool.
 *
 * Household thread uses the same prompt until IE authors household-chat-prompt.md.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/api-auth";
import { getAnthropicClient, ANTHROPIC_MODEL } from "@/lib/anthropic";
import Anthropic from "@anthropic-ai/sdk";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarEventRow {
  title: string;
  start_time: string;
  end_time: string | null;
  owner_parent_id: string | null;
}

interface RecentChangeRow {
  title: string;
  start_time: string;
  end_time: string | null;
}

interface CoordinationIssueRow {
  trigger_type: string;
  content: string;
  state: string;
}

interface ConversationRow {
  role: string;
  content: string;
}

// ─── System Prompt (source: docs/prompts/chat-prompt.md, IE S1.7) ─────────────

const CHAT_SYSTEM_PROMPT = `You are Kin, a family coordination AI for a two-parent household. You help parents stay ahead of logistics, pickups, and schedule conflicts — not by tracking everything, but by surfacing the one thing that matters before it becomes a scramble.

## YOUR ROLE IN CHAT
The Conversations screen has two thread types:
1. Personal thread (this prompt): Kin speaks privately with one parent. Candid, direct, efficient.
2. Household thread: Both parents see the output. Balanced, neither parent singled out.

This prompt governs the personal thread only.

## WHO YOU ARE
You are not a general assistant. You do not answer questions about recipes, the news, trivia, or anything outside family coordination. If asked, redirect gently: "I'm focused on your family's schedule and coordination — is there something on that front I can help with?"

You know:
- Today's household schedule (events, pickups, assignments)
- Known coordination issues and their current state (OPEN / ACKNOWLEDGED / RESOLVED)
- Which parent you are talking to (this context is always provided)
- Recent schedule changes

You do not know (and should not pretend to know):
- Anything not in the household data provided
- Medical details, financial details, personal relationship dynamics

## CONVERSATION RULES

**Tone:** Candid, efficient, kind. Not clinical. Not a chatbot. Imagine a trusted coordinator who knows the family well and has been doing this for years.

**Length:** Prefer short. Most answers should be 1–3 sentences. Never more than a short paragraph unless explicitly asked for detail. Long responses signal something went wrong.

**Lead with implication, not data.** If asked "what's happening today?", don't list events — surface the one thing that matters.

**Never open a message with:**
- "Based on your calendar…"
- "It looks like…"
- "You may want to consider…"
- "Just a heads up…"
- "I noticed that…"
- "Great question!"
- "Certainly!" or "Of course!" or "Absolutely!"

**Always use first-person present tense.** ("I see Leo's pickup is unconfirmed." — not "It appears Leo's pickup may be unconfirmed.")

**Confidence (§23):**
- High → direct statement, no framing
- Medium → one qualifier max ("looks like", "probably", "worth confirming")
- Low → say so directly: "I don't have enough information on that right now."
- Never guess. Never hallucinate schedule data.

**No repetition:** If you already surfaced an insight in this conversation and the underlying situation has not changed, do not surface it again. Check \`conversation_history\` before responding. If the parent is asking about something you already covered, confirm the status briefly ("Still the same — Leo's pickup is unconfirmed.") rather than restating the full context.

**Failure modes to avoid (§11):**
- Vague outputs: "Looks like you have a busy evening." This tells them nothing.
- Repeating yourself: If you surfaced an insight in this conversation and nothing changed, don't repeat it.
- Wrong parent assignment: If pickup ownership is ambiguous, never confidently assign it. Ask or surface as a shared question.
- Over-explaining silence: If there's nothing to flag, say nothing or say it briefly — not "I've reviewed your entire schedule and found no issues at this time."

**Relief language — use exact phrases only:**
- Time-based: "I'll remind you when it's time to leave."
- Monitoring: "I'll keep an eye on it."
- Conditional: "I'll flag it if anything changes."

**Never use:** "I've got this" / "Don't worry" / "You're all set" / generic reassurance.

## WHAT YOU HELP WITH
- "What do I need to know today?" → Surface the one most important coordination implication
- "Who's doing pickup?" → Check assignment; if confirmed, say so directly; if unconfirmed, say that
- "Can you remind me to leave at 2:45?" → "I'll remind you when it's time to leave."
- "What's my partner handling?" → Surface what you know; flag if unconfirmed
- "Something changed on my calendar" → Acknowledge, check for coordination impact, surface if any
- General coordination questions about the household schedule

## WHAT YOU DO NOT DO
- Answer questions outside family coordination
- Make promises you can't keep ("I'll book the babysitter")
- Give opinions on parenting decisions
- Take sides in household disagreements
- Discuss other people's schedules beyond what's in the household data

## CONTEXT PROVIDED PER MESSAGE
Each message will include:
- speaking_to: "parent_a" | "parent_b"
- today_events: array of household events
- open_coordination_issues: array of OPEN/ACKNOWLEDGED items from coordination_issues table
- recent_schedule_changes: events updated in the last 24 hours`;

// ─── Web search tool ──────────────────────────────────────────────────────────

// Retained per sprint directive: "Web search tool stays."
// Scope restriction (coordination-only) is enforced by CHAT_SYSTEM_PROMPT.
const SEARCH_TOOL: Anthropic.Tool = {
  name: "web_search",
  description:
    "Search the internet for current information relevant to family coordination — local services, school schedules, activity programs, or anything requiring up-to-date real-world data to assist with a coordination question.",
  input_schema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description:
          "The search query. Be specific — include location, age ranges, or timing if relevant.",
      },
    },
    required: ["query"],
  },
};

// ─── Web search helper ────────────────────────────────────────────────────────

async function performWebSearch(query: string): Promise<string> {
  if (process.env.TAVILY_API_KEY) {
    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query,
          search_depth: "basic",
          max_results: 5,
          include_answer: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        let resultText = "";

        if (data.answer) {
          resultText += `Summary: ${data.answer}\n\n`;
        }

        if (data.results) {
          resultText += "Sources:\n";
          for (const result of data.results.slice(0, 5)) {
            resultText += `- ${result.title}: ${result.content?.slice(0, 200)}... (${result.url})\n`;
          }
        }

        return resultText || "No results found.";
      }
    } catch {
      // Non-fatal — falls through to the fallback message below
      // TODO: log to Sentry before GA
    }
  }

  return `[Web search is not configured. Add TAVILY_API_KEY to .env.local to enable real-time search.]`;
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();

    // ── §B20: Resolve primary household ID ────────────────────────────────────
    // coordination_issues.household_id stores the primary parent's ID.
    // Primary users: household_id is null (they ARE the primary → parent_a).
    // Partner users: household_id = primary parent's ID (→ parent_b).
    const { data: idRow } = await supabase
      .from("profiles")
      .select("household_id")
      .eq("id", user.id)
      .single<{ household_id: string | null }>();
    const primaryId = idRow?.household_id ?? user.id;
    const speakingTo: "parent_a" | "parent_b" =
      idRow?.household_id == null ? "parent_a" : "parent_b";

    const today = new Date().toISOString().split("T")[0];
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // ── Fetch coordination context + conversation history ──────────────────────
    const [
      { data: todayEvents },
      { data: openIssues },
      { data: recentChanges },
      { data: history },
    ] = await Promise.all([
      // Today's calendar events for this parent
      supabase
        .from("calendar_events")
        .select("title, start_time, end_time, owner_parent_id")
        .eq("profile_id", user.id)
        .gte("start_time", `${today}T00:00:00Z`)
        .lte("start_time", `${today}T23:59:59Z`)
        .is("deleted_at", null)
        .order("start_time", { ascending: true })
        .limit(10),

      // Open + acknowledged coordination issues for this household
      supabase
        .from("coordination_issues")
        .select("trigger_type, content, state")
        .eq("household_id", primaryId)
        .in("state", ["OPEN", "ACKNOWLEDGED"])
        .order("surfaced_at", { ascending: false })
        .limit(5),

      // Events updated in the last 24 hours (recent schedule changes)
      supabase
        .from("calendar_events")
        .select("title, start_time, end_time")
        .eq("profile_id", user.id)
        .gte("updated_at", since24h)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(5),

      // Conversation history (last 50 messages in this thread)
      supabase
        .from("conversations")
        .select("role, content")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: true })
        .limit(50),
    ]);

    // ── Build coordination context block ──────────────────────────────────────
    const context = {
      speaking_to: speakingTo,
      today_events: (todayEvents ?? []).map((e: CalendarEventRow) => ({
        time: new Date(e.start_time).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
        end_time: e.end_time
          ? new Date(e.end_time).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })
          : null,
        title: e.title,
        owner_parent_id: e.owner_parent_id,
      })),
      open_coordination_issues: (openIssues ?? []).map(
        (i: CoordinationIssueRow) => ({
          trigger_type: i.trigger_type,
          content: i.content,
          state: i.state,
        })
      ),
      recent_schedule_changes: (recentChanges ?? []).map(
        (e: RecentChangeRow) => ({
          title: e.title,
          start_time: e.start_time,
        })
      ),
    };

    // ── Build Anthropic message history ───────────────────────────────────────
    const messages: Anthropic.MessageParam[] = (history ?? []).map(
      (h: ConversationRow) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })
    );

    // Prepend coordination context to user message per chat-prompt.md spec
    const userMessageWithContext = `[CONTEXT]\n${JSON.stringify(context, null, 2)}\n\n[MESSAGE]\n${message}`;
    messages.push({ role: "user", content: userMessageWithContext });

    // Save raw user message (without context block) to conversation history
    await supabase.from("conversations").insert({
      profile_id: user.id,
      role: "user",
      content: message,
    });

    // ── Mock response (no API key) ────────────────────────────────────────────
    if (!process.env.ANTHROPIC_API_KEY) {
      const mockResponse = getMockResponse(message);
      await supabase.from("conversations").insert({
        profile_id: user.id,
        role: "assistant",
        content: mockResponse,
      });
      return NextResponse.json({ response: mockResponse });
    }

    // ── Call Anthropic with chat-prompt.md system prompt ─────────────────────
    const anthropic = getAnthropicClient();
    let response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: CHAT_SYSTEM_PROMPT,
      tools: [SEARCH_TOOL],
      messages,
    });

    // ── Tool use loop (Claude may invoke web_search, then respond) ────────────
    let finalText = "";
    let iterations = 0;
    const maxIterations = 3;

    while (iterations < maxIterations) {
      iterations++;

      const toolUseBlock = response.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );

      if (toolUseBlock) {
        const searchResults = await performWebSearch(
          (toolUseBlock.input as { query: string }).query
        );

        messages.push({
          role: "assistant",
          content: response.content as Anthropic.ContentBlockParam[],
        });
        messages.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: toolUseBlock.id,
              content: searchResults,
            },
          ],
        });

        response = await anthropic.messages.create({
          model: ANTHROPIC_MODEL,
          max_tokens: 1024,
          system: CHAT_SYSTEM_PROMPT,
          tools: [SEARCH_TOOL],
          messages,
        });
      } else {
        const textBlock = response.content.find(
          (block): block is Anthropic.TextBlock => block.type === "text"
        );
        finalText = textBlock?.text || "I couldn't generate a response right now.";
        break;
      }
    }

    if (!finalText) {
      const textBlock = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === "text"
      );
      finalText = textBlock?.text || "I couldn't generate a response right now.";
    }

    // ── Save assistant response ───────────────────────────────────────────────
    await supabase.from("conversations").insert({
      profile_id: user.id,
      role: "assistant",
      content: finalText,
    });

    return NextResponse.json({ response: finalText });
  } catch {
    // TODO: log to Sentry before GA
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}

// ─── Mock response (no ANTHROPIC_API_KEY) ────────────────────────────────────
// Coordination-focused only — reflects chat-prompt.md scope.

function getMockResponse(message: string): string {
  const lower = message.toLowerCase();

  if (
    lower.includes("pickup") ||
    lower.includes("who's getting") ||
    lower.includes("who is getting")
  ) {
    return "I don't have live pickup data in this environment — connect your calendar to get real-time coordination insights.";
  }

  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    return "Hey — what's on your mind?";
  }

  return "I'm focused on your family's schedule and coordination — is there something on that front I can help with?";
}
