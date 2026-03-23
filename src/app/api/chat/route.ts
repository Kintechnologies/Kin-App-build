import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, ANTHROPIC_MODEL } from "@/lib/anthropic";
import { buildSystemPrompt } from "@/lib/system-prompt";

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch family context
    const [
      { data: profile },
      { data: members },
      { data: prefs },
      { data: history },
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
    ]);

    const kids = (members || []).filter((m) => m.member_type === "child");
    const pets = (members || []).filter((m) => m.member_type === "pet");

    // Build system prompt with family context
    const systemPrompt = buildSystemPrompt({
      family_name: profile?.family_name || "your",
      household_type: profile?.household_type || "unknown",
      p1_name: user.email?.split("@")[0] || "Parent",
      kids: kids.map((k) => ({ name: k.name, age: k.age || 0 })),
      pets: pets.map((p) => ({ name: p.name })),
      grocery_budget: prefs?.weekly_grocery_budget || 200,
      dietary_preferences: prefs?.dietary_preferences || [],
      food_loves: prefs?.food_loves || [],
      food_dislikes: prefs?.food_dislikes || [],
    });

    // Build message history for context
    const messages: { role: "user" | "assistant"; content: string }[] = (history || []).map(
      (h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })
    );

    // Add the new user message
    messages.push({ role: "user", content: message });

    // Save user message to database
    await supabase.from("conversations").insert({
      profile_id: user.id,
      role: "user",
      content: message,
    });

    // Check if Anthropic API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      // Return a helpful mock response when API key isn't set
      const mockResponse = getMockResponse(message, profile?.family_name || "your family");

      await supabase.from("conversations").insert({
        profile_id: user.id,
        role: "assistant",
        content: mockResponse,
      });

      return NextResponse.json({ response: mockResponse });
    }

    // Call Anthropic API
    const anthropic = getAnthropicClient();
    const completion = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const responseText =
      completion.content[0].type === "text"
        ? completion.content[0].text
        : "I couldn't generate a response right now.";

    // Save assistant response to database
    await supabase.from("conversations").insert({
      profile_id: user.id,
      role: "assistant",
      content: responseText,
    });

    return NextResponse.json({ response: responseText });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}

function getMockResponse(message: string, familyName: string): string {
  const lower = message.toLowerCase();

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

  return `This is your first week with Kin, so I'm still getting to know the ${familyName} family. The more you use me — rate meals, log spending, ask questions — the more personalized I get. Right now I can help with meal ideas, budget tracking, or date night planning. What sounds good?`;
}
