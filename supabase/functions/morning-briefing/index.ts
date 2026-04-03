import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface ExpoNotification {
  to: string[];
  title: string;
  body: string;
  data: Record<string, string>;
}

/**
 * Generates morning briefing for a single user
 * Returns the generated briefing text
 */
async function generateBriefingForUser(
  profileId: string,
  profile: any
): Promise<string> {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Fetch all necessary data
    const [
      { data: schedule },
      { data: todayEvents },
      { data: activities },
      { data: petMeds },
      { data: budgetSummary },
    ] = await Promise.all([
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
        .from("children_activities")
        .select("*, family_member:family_members(name)")
        .eq("profile_id", profileId)
        .eq("active", true),
      supabase
        .from("pet_medications")
        .select("*, family_member:family_members(name)")
        .eq("profile_id", profileId)
        .eq("active", true),
      supabase.rpc("get_budget_summary", { user_id: profileId }),
    ]);

    // Build context for Claude
    let briefingContext = `MORNING BRIEFING FOR ${profile?.family_name || "Family"}

Today: ${new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })}

═══════════════════════════════════════════════════════════════
 TODAY'S SCHEDULE & LOGISTICS
═══════════════════════════════════════════════════════════════`;

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
      todayEvents.forEach((event: any) => {
        const start = new Date(event.start_time).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
        briefingContext += `
  ${start} - ${event.title}${event.location ? ` (${event.location})` : ""}`;
      });
    }

    // Add kids' activities
    const todayDayName = new Date().toLocaleDateString("en-US", {
      weekday: "long",
    });
    const todayActivities = activities
      ? activities.filter((a: any) =>
          (a.day_of_week || []).includes(todayDayName)
        )
      : [];

    if (todayActivities.length > 0) {
      briefingContext += `

Kids' activities today:`;
      todayActivities.forEach((activity: any) => {
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
      budgetSummary.forEach((b: any) => {
        const percentUsed = Math.round((b.total_spent / b.monthly_limit) * 100);
        const status =
          percentUsed > 100
            ? `OVER by $${Math.abs(b.remaining)}`
            : `$${b.remaining} remaining`;
        briefingContext += `
${b.category_name}: $${b.total_spent}/$${b.monthly_limit} (${status})`;
      });
    }

    // Pet medications
    if (petMeds && petMeds.length > 0) {
      briefingContext += `

═══════════════════════════════════════════════════════════════
 PET CARE - MEDICATIONS
═══════════════════════════════════════════════════════════════`;
      petMeds.forEach((med: any) => {
        briefingContext += `
${med.family_member?.name}: ${med.name} - ${med.frequency}`;
      });
    }

    // Call Claude to generate the briefing
    const anthropicResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "x-api-key": anthropicApiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          system: `You are Kin, a warm and direct family AI. Your job is to synthesize family data into a single, concise morning briefing.

RULES:
1. Warm, direct, human - no corporate language
2. Always use specific numbers ($143 of $180, not "most of budget")
3. One question maximum at the very end
4. Never hedge ("I think", "perhaps")
5. Readable in 30-60 seconds
6. Start with "Morning."
7. Cover: schedule, calendar, kids, budget, pet care
8. End warmly with something specific

DO NOT use bullet points, say "Here's your briefing...", or include the family name more than once.`,
          messages: [
            {
              role: "user",
              content: briefingContext,
            },
          ],
        }),
      }
    );

    if (!anthropicResponse.ok) {
      const error = await anthropicResponse.text();
      throw new Error(
        `Anthropic API error: ${anthropicResponse.status} - ${error}`
      );
    }

    const anthropicData = await anthropicResponse.json();
    const briefingText =
      anthropicData.content[0]?.type === "text"
        ? anthropicData.content[0].text
        : "Unable to generate briefing";

    return briefingText;
  } catch (error) {
    console.error(`Error generating briefing for user ${profileId}:`, error);
    throw error;
  }
}

/**
 * Sends push notification via Expo Push API
 */
async function sendExpoNotification(
  expoPushTokens: string[],
  briefingContent: string
): Promise<void> {
  if (!expoPushTokens || expoPushTokens.length === 0) {
    return;
  }

  try {
    const notification: ExpoNotification = {
      to: expoPushTokens,
      title: "Good morning",
      body: briefingContent.substring(0, 150), // Preview of briefing
      data: {
        type: "morning_briefing",
        fullContent: briefingContent,
      },
    };

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
        ...(expoAccessToken
          ? { Authorization: `Bearer ${expoAccessToken}` }
          : {}),
      },
      body: JSON.stringify(notification),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(
        `Expo Push API error: ${response.status} - ${error}`
      );
    }
  } catch (error) {
    console.error("Error sending Expo notification:", error);
    // Don't throw - continue processing other users
  }
}

/**
 * Main handler: processes all users and sends morning briefings
 * Runs daily at 6am per user timezone (or UTC as fallback)
 */
serve(async (req) => {
  try {
    // Verify this is a scheduled invocation (not HTTP)
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const today = new Date().toISOString().split("T")[0];

    // Get all profiles that have:
    // 1. Completed onboarding
    // 2. Have active push tokens
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, family_name")
      .eq("onboarding_completed", true);

    if (profileError) {
      throw new Error(`Failed to fetch profiles: ${profileError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      return new Response("No profiles to process", { status: 200 });
    }

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each profile
    for (const profile of profiles) {
      try {
        // Check if briefing already sent today (deduplication)
        const { data: existingBriefing } = await supabase
          .from("morning_briefings")
          .select("id, delivery_status")
          .eq("profile_id", profile.id)
          .eq("briefing_date", today)
          .single();

        if (existingBriefing && existingBriefing.delivery_status === "sent") {
          console.log(
            `Briefing already sent to ${profile.id} today, skipping`
          );
          continue;
        }

        results.processed++;

        // Generate briefing
        const briefingContent = await generateBriefingForUser(
          profile.id,
          profile
        );

        // Get user's push tokens
        const { data: pushTokens } = await supabase
          .from("push_tokens")
          .select("token")
          .eq("profile_id", profile.id)
          .eq("active", true);

        const tokens = pushTokens?.map((t) => t.token) || [];

        // Send push notification if tokens exist
        if (tokens.length > 0) {
          await sendExpoNotification(tokens, briefingContent);
        }

        // Store briefing in database with delivery status
        const { error: insertError } = await supabase
          .from("morning_briefings")
          .upsert(
            {
              profile_id: profile.id,
              briefing_date: today,
              content: briefingContent,
              delivery_status: tokens.length > 0 ? "sent" : "generated",
              sent_at: tokens.length > 0 ? new Date().toISOString() : null,
            },
            {
              onConflict: "profile_id,briefing_date",
            }
          );

        if (insertError) {
          throw insertError;
        }

        results.succeeded++;
        console.log(
          `Successfully processed briefing for ${profile.family_name}`
        );
      } catch (error) {
        results.failed++;
        const errorMsg = `Error processing ${profile.id}: ${error instanceof Error ? error.message : String(error)}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
        // Continue with next user
      }
    }

    console.log("Morning briefing batch complete:", results);

    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Fatal error in morning briefing function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
