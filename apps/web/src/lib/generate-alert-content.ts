/**
 * Alert Content Generation — IE S1.7
 *
 * Wires docs/prompts/alert-prompt.md into pickup-risk.ts and
 * late-schedule-change.ts. Replaces template strings with AI-generated
 * alert copy that meets §5/§8/§16/§23 spec.
 *
 * Output format matches coordination_issues.content (one sentence,
 * [What changed] — [Implication] format) plus severity for migration 027 column.
 *
 * If AI generation fails or returns null (low-confidence input), the caller
 * falls back to the validated template string — so v0 alert delivery is never
 * silently dropped due to an AI or network error.
 */

import { getAnthropicClient, ANTHROPIC_MODEL } from "@/lib/anthropic";
import Anthropic from "@anthropic-ai/sdk";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlertTriggerType = "PICKUP_RISK" | "LATE_SCHEDULE_CHANGE";
export type AlertSeverity = "RED" | "YELLOW" | "CLEAR";
export type ParentStatus = "CONFLICTED" | "AVAILABLE" | "UNCONFIRMED";
export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export interface AlertContentInput {
  trigger_type: AlertTriggerType;
  severity: AlertSeverity;
  event_window_start: string;
  event_window_end: string;
  affected_child: string;
  parent_a_status: ParentStatus;
  parent_b_status: ParentStatus;
  change_description: string | null;
  confidence: ConfidenceLevel;
}

export interface AlertContentResult {
  content: string;
  severity: "RED" | "YELLOW";
}

// ─── System Prompt (source: docs/prompts/alert-prompt.md, IE S1.7) ────────────

const ALERT_SYSTEM_PROMPT = `You are Kin, a family coordination AI. When a coordination issue is detected, you write the alert text that appears on the alert card. This is the most time-sensitive output Kin produces — it must be immediately actionable and never vague.

## YOUR ROLE
Generate the \`content\` field for a coordination_issues record. This text renders on the alert card in the Today screen when state is OPEN.

## OUTPUT RULES — NON-NEGOTIABLE

**Length:** Exactly 1 sentence. Format: [What changed] — [Implication].
No exceptions. Never 2 sentences. Never a question. Never a list.

**Lead with the fact, then the consequence.** Do not lead with who is affected or which child is involved — lead with the coordination gap.

**Never open with:**
- "Based on your calendar…"
- "It looks like…"
- "You may want to consider…"
- "Just a heads up…"
- "I noticed that…"
- "FYI" or "Heads up"

**Always use first-person present tense.**

**Tone by scenario (§16):**
- BOTH parents conflicted → collaborative, direct: "You've both got conflicts — [implication]."
- ONE parent is the clear responsible party → direct assignment: "[What changed] — pickup's on you tonight."
- AMBIGUOUS responsibility → coordination prompt, not assignment: "[What changed] — worth a quick check between you."
- Never blame or single out one parent in household thread context.

**Confidence (§23):**
- High → direct, no qualifier
- Medium → one qualifier max ("looks like", "probably", "worth confirming")
- Low → do not generate an alert — return null (silence)

**Trigger types:**
- PICKUP_RISK (§3A): Coverage for a required pickup is at risk
- LATE_SCHEDULE_CHANGE (§3C): A schedule change was made within 12 hours of the affected event

## INPUT FORMAT
You will receive a JSON object with:
- trigger_type: "PICKUP_RISK" | "LATE_SCHEDULE_CHANGE"
- severity: "RED" | "YELLOW" | "CLEAR"
- event_window_start: ISO timestamp
- event_window_end: ISO timestamp
- affected_child: string
- parent_a_status: "CONFLICTED" | "AVAILABLE" | "UNCONFIRMED"
- parent_b_status: "CONFLICTED" | "AVAILABLE" | "UNCONFIRMED"
- change_description: string (for LATE_SCHEDULE_CHANGE — what changed)
- confidence: "HIGH" | "MEDIUM" | "LOW"

## OUTPUT FORMAT
Return a JSON object:
{
  "content": "string — exactly 1 sentence in [What changed] — [Implication] format",
  "severity": "RED" | "YELLOW" (pass through from input),
  "trigger_type": "PICKUP_RISK" | "LATE_SCHEDULE_CHANGE" (pass through)
}

Return null if confidence is LOW or severity is CLEAR.

## SEVERITY DEFINITIONS
- RED: Both parents conflicted, no coverage exists → use direct, urgent language
- YELLOW: Default handler unavailable but backup may exist → use responsibility prompt language
- CLEAR: Coverage confirmed → return null (no alert generated)`;

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Generates AI alert content using the IE-approved alert-prompt.
 *
 * Returns { content, severity } on success, or null when:
 * - confidence is LOW (suppress per §23)
 * - severity is CLEAR (no alert needed)
 * - AI generation fails (caller should fall back to template string)
 *
 * Never throws — all errors are caught and return null for fallback safety.
 */
export async function generateAlertContent(
  input: AlertContentInput,
  fallback: string
): Promise<AlertContentResult | null> {
  // CLEAR severity: no issue needed — suppress silently
  if (input.severity === "CLEAR") return null;

  try {
    const anthropic = getAnthropicClient();

    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 150,
      system: ALERT_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],
    });

    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );

    if (!textBlock?.text) return { content: fallback, severity: input.severity as "RED" | "YELLOW" };

    const parsed: {
      content: string;
      severity: "RED" | "YELLOW";
      trigger_type: AlertTriggerType;
    } | null = JSON.parse(textBlock.text);

    if (!parsed) {
      // null = low-confidence suppression — caller should suppress issue creation
      return null;
    }

    // Empty-string guard (P2-6): AI returned {content: "", ...} — use validated fallback
    if (!parsed.content) {
      return { content: fallback, severity: input.severity as "RED" | "YELLOW" };
    }

    return { content: parsed.content, severity: parsed.severity };
  } catch {
    // AI or parse failure → fall back to validated template string
    if (process.env.NODE_ENV !== "production") {
      console.error("generateAlertContent: AI generation failed, using fallback template");
    }
    return { content: fallback, severity: input.severity as "RED" | "YELLOW" };
  }
}
