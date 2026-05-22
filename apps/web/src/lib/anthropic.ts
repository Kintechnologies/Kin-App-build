import Anthropic from "@anthropic-ai/sdk";

// Pin to a dated snapshot so we control upgrades explicitly. Bare aliases
// (e.g. "claude-sonnet-4-6") rotate when Anthropic deprecates the model and
// break silently — V6 P1-M1 pinned the SMS edge function for this reason;
// V7 P0-4 pins this writer too. Keep in lockstep with the SMS edge function
// model (supabase/functions/_shared/briefing.ts callAnthropicWithRetry).
export const ANTHROPIC_MODEL = "claude-sonnet-4-6-20250930";

let client: Anthropic | null = null;

export function getAnthropicClient() {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Configure it in the environment " +
          "before calling getAnthropicClient() — every Claude-backed path " +
          "(SMS reply, briefing, household-context analyzer) depends on it."
      );
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}
