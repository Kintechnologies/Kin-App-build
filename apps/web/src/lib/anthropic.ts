import Anthropic from "@anthropic-ai/sdk";

export const ANTHROPIC_MODEL = "claude-sonnet-4-6";

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
