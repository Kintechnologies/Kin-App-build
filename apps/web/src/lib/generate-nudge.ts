/**
 * One-shot outbound SMS generator for short Kin messages — the Sunday check-in
 * and the engagement nudges (calendar-connect prompts, onboarding-resume
 * prompts, trial drip).
 *
 * Why an LLM and not a template string?
 *   The briefing voice is carefully tuned. When we hardcode a nudge as a
 *   template, it drifts the moment the briefing voice evolves. Pushing these
 *   one-shots through Claude with the shared voice block (kin-voice.ts) keeps
 *   them in lockstep — change the voice once, every surface follows.
 *
 * Safety: every call has a validated template fallback. If Claude fails,
 * times out, or returns empty, the caller's family still gets the message.
 */

import { getAnthropicClient, ANTHROPIC_MODEL } from "@/lib/anthropic";
import { buildKinVoiceBlock } from "@/lib/kin-voice";

const TIMEOUT_MS = 8000;

export interface KinMessageInput {
  /** What this message is and what it should accomplish — 1–3 sentences. */
  intent: string;
  /** Background the model needs to write it (name, day, link, etc.). */
  context: Record<string, string | number | null | undefined>;
  /** Template string used if the LLM call fails or returns nothing. */
  fallback: string;
  /** Hard character ceiling. Output is sliced to this length. */
  maxChars?: number;
}

const SYSTEM_PROMPT = `${buildKinVoiceBlock({ format: "sms" })}

## YOUR JOB
You are writing a single, short outbound SMS to a parent. The user message contains:
  - INTENT: what this message is for (a check-in, a nudge, a reminder).
  - CONTEXT: the variables (the parent's first name, links, days remaining).

Write the message. Stay inside the voice rules above. If a link is given in
CONTEXT, include it verbatim — never invent or shorten URLs. Output the
message text only — no preamble, no quotes, no signoff.`;

/**
 * Generate a short SMS in Kin's voice. Returns the model output trimmed to
 * `maxChars`, or `fallback` on failure / empty response.
 */
export async function generateKinMessage(
  input: KinMessageInput
): Promise<string> {
  const maxChars = input.maxChars ?? 320;
  const userMessage = buildUserMessage(input);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await getAnthropicClient()
      .messages.create(
        {
          model: ANTHROPIC_MODEL,
          max_tokens: 180,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMessage }],
        },
        { signal: controller.signal }
      )
      .finally(() => clearTimeout(timeout));

    const first = response.content[0];
    if (first?.type !== "text") return input.fallback;
    const trimmed = first.text.trim();
    if (!trimmed) return input.fallback;
    return trimmed.slice(0, maxChars);
  } catch (err) {
    clearTimeout(timeout);
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "generateKinMessage: falling back to template",
        err instanceof Error ? err.message : err
      );
    }
    return input.fallback;
  }
}

function buildUserMessage(input: KinMessageInput): string {
  const ctxLines = Object.entries(input.context)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `  ${k}: ${v}`)
    .join("\n");

  return `INTENT:\n${input.intent}\n\nCONTEXT:\n${ctxLines || "  (none)"}\n\nWrite the SMS now.`;
}
