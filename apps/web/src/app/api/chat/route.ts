import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/api-auth";
import { getAnthropicClient, ANTHROPIC_MODEL } from "@/lib/anthropic";
import { buildSystemPrompt } from "@/lib/system-prompt";
import Anthropic from "@anthropic-ai/sdk";

// Web search tool definition for Anthropic tool use
const SEARCH_TOOL: Anthropic.Tool = {
  name: "web_search",
  description:
    "Search the internet for current information. Use this when the user asks about local services, activities, events, product recommendations, prices, reviews, or anything that requires up-to-date real-world data. Always search when the question involves finding specific places, programs, camps, classes, restaurants, or services near the family.",
  input_schema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "The search query. Be specific — include location, age ranges, budget if relevant from the family context.",
      },
    },
    required: ["query"],
  },
};

async function performWebSearch(query: string): Promise<string> {
  // Try Tavily first
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

  // Fallback: return a helpful message
  return `[Web search is not configured yet. To enable real-time search, add TAVILY_API_KEY to .env.local. Get a free key at tavily.com]\n\nBased on my training data, I can still help with general recommendations, but I won't have the latest local listings or prices.`;
}

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

    // Fetch family context — CRITICAL: allergies are non-negotiable for meal safety
    const [
      { data: profile },
      { data: members },
      { data: prefs },
      { data: history },
      { data: allergies },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("family_members").select("*").eq("profile_id", user.id),
      supabase.from("onboarding_preferences").select("*").eq("profile_id", user.id).single(),
      supabase
        .from("conversations")
        .select("role, content")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: true })
        .limit(50),
      supabase
        .from("children_allergies")
        .select("*, family_member:family_members(name)")
        .eq("profile_id", user.id),
    ]);

    const adults = (members || []).filter((m) => m.member_type === "adult");
    const kids = (members || []).filter((m) => m.member_type === "child");
    const pets = (members || []).filter((m) => m.member_type === "pet");

    // Use first adult's name from family members; fall back to a friendly default
    const p1Name = adults[0]?.name || "Parent";

    // Build allergen context for meal safety
    interface AllergyRow {
      allergen: string;
      severity: string;
      notes?: string | null;
      family_member?: { name: string } | null;
    }
    const allergenList =
      allergies && allergies.length > 0
        ? (allergies as AllergyRow[])
            .map(
              (a) =>
                `${a.family_member?.name || "Child"}: ${a.allergen} (${a.severity}${a.notes ? ` — ${a.notes}` : ""})`
            )
            .join(", ")
        : "No known allergies";

    // Build system prompt with family context
    const systemPrompt = buildSystemPrompt({
      family_name: profile?.family_name || "your",
      household_type: profile?.household_type || "unknown",
      p1_name: p1Name,
      kids: kids.map((k) => ({ name: k.name, age: k.age || 0 })),
      pets: pets.map((p) => ({ name: p.name })),
      grocery_budget: prefs?.weekly_grocery_budget || 200,
      dietary_preferences: prefs?.dietary_preferences || [],
      food_loves: prefs?.food_loves || [],
      food_dislikes: prefs?.food_dislikes || [],
      children_allergies: allergenList,
    });

    // Build message history
    const messages: Anthropic.MessageParam[] = (history || []).map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    }));

    messages.push({ role: "user", content: message });

    // Save user message
    await supabase.from("conversations").insert({
      profile_id: user.id,
      role: "user",
      content: message,
    });

    // Mock response if no API key
    if (!process.env.ANTHROPIC_API_KEY) {
      const mockResponse = getMockResponse(message, profile?.family_name || "your family");
      await supabase.from("conversations").insert({
        profile_id: user.id,
        role: "assistant",
        content: mockResponse,
      });
      return NextResponse.json({ response: mockResponse });
    }

    // Call Anthropic with tool use
    const anthropic = getAnthropicClient();
    let response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      tools: [SEARCH_TOOL],
      messages,
    });

    // Handle tool use loop (Claude may call search, then respond)
    let finalText = "";
    let iterations = 0;
    const maxIterations = 3;

    while (iterations < maxIterations) {
      iterations++;

      // Check if Claude wants to use a tool
      const toolUseBlock = response.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );

      if (toolUseBlock) {
        // Perform the search
        const searchResults = await performWebSearch((toolUseBlock.input as { query: string }).query);

        // Send results back to Claude
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

        // Get Claude's response with the search results
        response = await anthropic.messages.create({
          model: ANTHROPIC_MODEL,
          max_tokens: 1024,
          system: systemPrompt,
          tools: [SEARCH_TOOL],
          messages,
        });
      } else {
        // No more tool calls — extract text
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

    // Save assistant response
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

function getMockResponse(message: string, familyName: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("camp") || lower.includes("class") || lower.includes("activity") || lower.includes("program")) {
    return `Great question — I'd love to help find options for your family. Once my web search is connected (add TAVILY_API_KEY to .env.local), I'll be able to search for local programs, compare prices, check age eligibility, and filter by your budget. For now, I'd suggest checking your local parks & recreation department and asking other parents in the area — those tend to surface the best hidden gems.`;
  }
  if (lower.includes("meal") || lower.includes("dinner") || lower.includes("lunch") || lower.includes("eat")) {
    return `Based on what the ${familyName} family typically enjoys, I'd suggest a stir-fry tonight — about 25 minutes prep, and you likely have most ingredients on hand. Want me to pull up the full recipe with a quick grocery check?`;
  }
  if (lower.includes("budget") || lower.includes("spend") || lower.includes("money")) {
    return `Your grocery spending is the main category I'm tracking right now. Once you start logging transactions in the Budget tab, I'll give you real-time breakdowns with specific numbers. Head over there to add your first entry — it takes 10 seconds. 💰`;
  }
  if (lower.includes("date night") || lower.includes("date")) {
    return `It's been a while since a date night — families like yours tend to aim for every two weeks. Here are two ideas: a familiar pick like your favorite Italian spot, or something different like a cooking class for two. Want me to block an evening this week? 💕`;
  }
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    return `Hey! I'm Kin — your family's AI chief of staff. This is your first week, so the more you chat with me, rate meals, and log spending, the more dialed in I get. What can I help with right now? 🍽️`;
  }

  return `This is your first week with Kin, so I'm still getting to know the ${familyName} family. The more you use me — rate meals, log spending, ask questions — the more personalized I get. Right now I can help with meal ideas, budget tracking, date night planning, or search the web for local activities and services. What sounds good?`;
}
