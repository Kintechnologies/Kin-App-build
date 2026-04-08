/**
 * Chat Route — B30 + thread_type routing pre-wire (run AN)
 *
 * Wires docs/prompts/chat-prompt.md system prompt for the personal thread.
 * Replaces pre-pivot buildSystemPrompt (broad family-OS prompt) with the
 * IE-approved coordination-only prompt per §5/§7/§8/§11/§16/§19/§23.
 *
 * thread_type routing (added run AN):
 *   "household" → HOUSEHOLD_CHAT_SYSTEM_PROMPT (docs/prompts/household-chat-prompt.md)
 *   "personal" | "general" | undefined → CHAT_SYSTEM_PROMPT (personal thread)
 *
 * HOUSEHOLD_CHAT_SYSTEM_PROMPT is now wired (run AX) from
 * docs/prompts/household-chat-prompt.md (IE session 13). §16 balanced framing
 * active for all household thread requests. Fallback to personal prompt is
 * superseded — household prompt is no longer empty.
 *
 * P1-NEW-2 fixed (run BA): Ambiguous-responsibility framing example updated —
 * "It looks like [event] needs a coverage decision." → "Coverage for [event] is
 * unclear — worth a quick decision between you." (forbidden opener removed;
 * MEDIUM confidence framing retained; §8 + §16 now fully consistent).
 *
 * Coordination context (speaking_to, today_events, open_coordination_issues,
 * recent_schedule_changes) is prepended to each user message per chat-prompt.md
 * § CONTEXT PROVIDED PER MESSAGE.
 *
 * Web search tool is retained (Lead Eng directive: "Web search tool stays").
 * Scope restriction is enforced by the system prompt, not by removing the tool.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/api-auth";
import { getAnthropicClient, ANTHROPIC_MODEL } from "@/lib/anthropic";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import Anthropic from "@anthropic-ai/sdk";
import * as Sentry from "@sentry/nextjs";

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

// ─── Household system prompt (source: docs/prompts/household-chat-prompt.md) ──
//
// WIRED — run AX. Source: IE session 13 (docs/prompts/household-chat-prompt.md).
// Prompt delivers §16 balanced framing — neither parent singled out; collaborative
// framing for both-conflicted; neutral framing for one-parent-caused conflicts.
// Routing infrastructure was live since run AN; fallback to CHAT_SYSTEM_PROMPT
// while placeholder was empty is now superseded — HOUSEHOLD_CHAT_SYSTEM_PROMPT
// takes effect for all thread_type === "household" requests.
//
// ── ACTIVE CONTEXT KEYS (all 6 documented in household-chat-prompt.md) ─────────
//
//   speaking_to                    "parent_a" | "parent_b"
//   today_events                   array — logged-in parent's calendar events for today
//   partner_today_events           array — partner's calendar events for today
//                                  (household thread only; omitted when partner has no events)
//   open_coordination_issues       array — OPEN/ACKNOWLEDGED items from coordination_issues
//   recent_schedule_changes        array — logged-in parent's events updated in last 24h
//   partner_recent_schedule_changes array — partner's events updated in last 24h
//                                  (household thread only; omitted when empty or partner not linked)
//
// P2-NEW-2 resolved: all 6 context keys now documented in household-chat-prompt.md.
// Conversation history: fetched at .limit(50) — satisfies prompt N≥10 requirement.
// P2-NEW-BB-1 resolved: CONTEXT PROVIDED section synced to source household-chat-prompt.md —
//   added trigger_type annotation on open_coordination_issues, N≥10 history guidance, and
//   Note on pickup assignments block.
const HOUSEHOLD_CHAT_SYSTEM_PROMPT = `You are Kin, a family coordination AI. In the household thread, both parents see everything you write. Your job here is coordination — not coaching, not sides, not attribution of fault.

## YOUR ROLE IN THE HOUSEHOLD THREAD
The household thread is a shared space. Both parents read every message. Your output must:
- Surface coordination facts, not narratives
- Never single out one parent as responsible or at fault
- Support both parents solving the problem together

This is distinct from the personal thread, where Kin can speak candidly to one parent. Here, every word is visible to both.

## WHO YOU ARE
You are not a mediator, a therapist, or a productivity coach. You are a coordination layer — you surface what's in the data and let both parents decide what to do with it.

You know:
- Today's household schedule (events, pickups, assignments)
- Known coordination issues and their current state (OPEN / ACKNOWLEDGED / RESOLVED)
- Recent schedule changes
- Which coordination issues are unresolved

You do not know (and should not guess):
- Why a schedule changed
- Whose fault a conflict is
- What either parent privately discussed in their personal thread

## CONVERSATION RULES

**Tone (§16):** Balanced, factual, collaborative. Neither parent is the subject of blame or sole responsibility in household context — even if the data makes it clear who caused a conflict. Surface the issue; let them own the resolution.

**Length:** Prefer short. Most outputs should be 1–2 sentences. Never more than a short paragraph unless both parents explicitly ask for detail.

**Lead with implication, not data.** If asked "what's going on today?", surface the one coordination matter that most needs both parents' attention.

**Never open a message with:**
- "Based on your calendar…"
- "It looks like…"
- "You may want to consider…"
- "Just a heads up…"
- "I noticed that…"
- "Great question!"
- "Certainly!" or "Of course!" or "Absolutely!"

**Always use first-person present tense.**

**Tone by scenario (§16):**
- Both parents conflicted → "You've both got conflicts at that time — [implication]." (collaborative framing)
- One parent created the conflict → Do NOT name them. Surface as "A schedule change lands on [event] — [implication]." (neutral framing)
- Ambiguous responsibility → "Coverage for [event] is unclear — worth a quick decision between you." (MEDIUM confidence, coordination prompt)
- Never: "[Parent A] caused this problem" or "[Parent B] needs to handle it"

**Confidence (§23):**
- High → direct statement, no framing
- Medium → one qualifier max ("looks like", "probably", "worth confirming")
- Low → say so: "I don't have enough to go on here — do you want to walk me through what changed?"

**No repetition:** If the same coordination issue was already surfaced in this household thread and nothing has changed, confirm status briefly rather than restating. Check conversation history before responding.

**Relief language — use exact phrases only:**
- Time-based: "I'll remind you when it's time to leave."
- Monitoring: "I'll keep an eye on it."
- Conditional: "I'll flag it if anything changes."

**Never use:** "I've got this" / "Don't worry" / "You're all set" / generic reassurance.

## WHAT YOU HELP WITH
- "What's the coordination situation today?" → Surface the top open issue affecting both parents
- "Who's doing pickup?" → State assignment status; flag if unconfirmed
- "We sorted Leo's pickup" → Acknowledge, check for downstream impacts if any
- General questions about shared household schedule

## WHAT YOU DO NOT DO
- Take sides in disagreements between parents
- Attribute fault or responsibility to a named parent
- Discuss anything visible only in one parent's personal thread
- Make promises you can't keep
- Answer questions outside family coordination

## CONTEXT PROVIDED PER MESSAGE
Each message will include:
- speaking_to: "parent_a" | "parent_b" — which parent is sending this message
- today_events: logged-in parent's calendar events for today
- partner_today_events: partner's calendar events for today (omitted when partner has no events)
- open_coordination_issues: array of OPEN/ACKNOWLEDGED items from coordination_issues table; \`trigger_type\` includes "pickup_risk" for pickup coverage gaps
- recent_schedule_changes: logged-in parent's events updated in last 24 hours
- partner_recent_schedule_changes: partner's events updated in last 24 hours (omitted when empty or partner not linked)

Conversation history is provided as the preceding message turns in this thread (fetched at .limit(50) — satisfies the no-repetition rule N≥10 requirement). If context length is a concern, prefer truncating older messages over reducing below 10.

> **Note on pickup assignments:** Pickup coverage is surfaced via \`open_coordination_issues\` (trigger_type: "pickup_risk") rather than a separate \`pickup_assignments\` key. When "Who's doing pickup?" is asked, reason from open issues and today_events — do not expect a structured pickup_assignments field in context.
`;

// ─── Web search tool ──────────────────────────────────────────────────────────

// Retained per sprint directive: "Web search tool stays."
// Scope restriction (coordination-only) is enforced by the active system prompt.
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
    } catch (err) {
      // Non-fatal — falls through to the fallback message below
      Sentry.captureException(err);
    }
  }

  return `[Web search is not configured. Add TAVILY_API_KEY to .env.local to enable real-time search.]`;
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const { message, thread_type } = await request.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Rate limiting (BACKLOG-007): 10 req/min per user ─────────────────────
    const rl = await checkRateLimit(user.id, "chat");
    if (!rl.allowed) return rateLimitResponse(rl);

    // ── Select system prompt based on thread_type (run AN pre-wire) ───────────
    // "household" → HOUSEHOLD_CHAT_SYSTEM_PROMPT when IE delivers it.
    // Falls back to CHAT_SYSTEM_PROMPT while placeholder is empty.
    const activeSystemPrompt =
      thread_type === "household" && HOUSEHOLD_CHAT_SYSTEM_PROMPT.trim()
        ? HOUSEHOLD_CHAT_SYSTEM_PROMPT
        : CHAT_SYSTEM_PROMPT;

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

    // ── P2-23: Resolve partner profile ID for household thread context ─────────
    // Household thread must show both parents' calendars so Kin can reason about
    // shared schedule conflicts, not just the logged-in parent's view.
    //   parent_a (primary): partner has household_id = user.id
    //   parent_b (non-primary): partner is the primary user (primaryId)
    let partnerProfileId: string | null = null;
    if (thread_type === "household") {
      if (speakingTo === "parent_a") {
        const { data: partnerRow } = await supabase
          .from("profiles")
          .select("id")
          .eq("household_id", user.id)
          .single<{ id: string }>();
        partnerProfileId = partnerRow?.id ?? null;
      } else {
        partnerProfileId = primaryId;
      }
    }

    // Pre-build partner events query so it runs in parallel with main fetches
    const partnerEventsQuery = partnerProfileId
      ? supabase
          .from("calendar_events")
          .select("title, start_time, end_time, owner_parent_id")
          .eq("profile_id", partnerProfileId)
          .gte("start_time", `${today}T00:00:00Z`)
          .lte("start_time", `${today}T23:59:59Z`)
          .is("deleted_at", null)
          .order("start_time", { ascending: true })
          .limit(10)
      : Promise.resolve({
          data: null as CalendarEventRow[] | null,
          error: null,
        });

    // Pre-build partner recent schedule changes query — P2-NEW (AR)
    // Household thread must include both parents' recent changes so Kin can detect
    // schedule conflicts that originated from the partner's side (§3C, §11, §16).
    const partnerRecentChangesQuery = partnerProfileId
      ? supabase
          .from("calendar_events")
          .select("title, start_time, end_time")
          .eq("profile_id", partnerProfileId)
          .gte("updated_at", since24h)
          .is("deleted_at", null)
          .order("updated_at", { ascending: false })
          .limit(5)
      : Promise.resolve({
          data: null as RecentChangeRow[] | null,
          error: null,
        });

    // ── Fetch coordination context + conversation history ──────────────────────
    const [
      { data: todayEvents },
      { data: openIssues },
      { data: recentChanges },
      { data: history },
      { data: partnerTodayEvents },
      { data: partnerRecentChanges },
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

      // Events updated in the last 24 hours (recent schedule changes — this parent)
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

      // Partner's today calendar events (household thread only — P2-23)
      partnerEventsQuery,

      // Partner's recent schedule changes (household thread only — P2-NEW AR)
      partnerRecentChangesQuery,
    ]);

    // ── Build coordination context block ──────────────────────────────────────
    const mappedPartnerEvents = (partnerTodayEvents ?? []).map(
      (e: CalendarEventRow) => ({
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
      })
    );

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
      ...(mappedPartnerEvents.length > 0
        ? { partner_today_events: mappedPartnerEvents }
        : {}),
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
      // Partner's recent schedule changes — household thread only (P2-NEW AR)
      // Mirrors partner_today_events pattern: omitted when empty or partner not linked.
      ...((partnerRecentChanges ?? []).length > 0
        ? {
            partner_recent_schedule_changes: (partnerRecentChanges ?? []).map(
              (e: RecentChangeRow) => ({
                title: e.title,
                start_time: e.start_time,
              })
            ),
          }
        : {}),
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
      system: activeSystemPrompt,
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
          system: activeSystemPrompt,
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
  } catch (err) {
    Sentry.captureException(err);
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
