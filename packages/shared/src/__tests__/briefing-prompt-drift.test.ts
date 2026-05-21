// Drift-detection test for the SMS morning-briefing system prompt.
//
// The Deno cron path (supabase/functions/_shared/briefing.ts:SYSTEM_PROMPT)
// and the Node test/dev path (apps/web/src/lib/sms-briefing.ts:SMS_BRIEFING_SYSTEM_PROMPT)
// must speak with the same voice — drift means the test endpoint validates a
// different prompt than production sends. Because Deno and Node cannot share
// a runtime module here, the string is duplicated; this test fails CI when
// they diverge.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../../..");

// Extract a template-literal string assigned to `const <name> = \`...\`;`.
// Stops at the first un-escaped backtick that closes the literal.
function extractTemplateLiteral(source: string, varName: string): string {
  const start = source.indexOf(`const ${varName} = \``);
  if (start === -1) {
    throw new Error(`Could not find \`const ${varName} = \`...\`\` in source`);
  }
  const litStart = source.indexOf("`", start) + 1;
  const litEnd = source.indexOf("`;", litStart);
  if (litEnd === -1) {
    throw new Error(`Unterminated template literal for ${varName}`);
  }
  return source.slice(litStart, litEnd);
}

describe("SMS briefing system prompt — drift detection", () => {
  it("apps/web/src/lib/sms-briefing.ts mirrors supabase/functions/_shared/briefing.ts", () => {
    const denoSrc = readFileSync(
      resolve(REPO_ROOT, "supabase/functions/_shared/briefing.ts"),
      "utf-8"
    );
    const nodeSrc = readFileSync(
      resolve(REPO_ROOT, "apps/web/src/lib/sms-briefing.ts"),
      "utf-8"
    );

    const denoPrompt = extractTemplateLiteral(denoSrc, "SYSTEM_PROMPT");
    const nodePrompt = extractTemplateLiteral(
      nodeSrc,
      "SMS_BRIEFING_SYSTEM_PROMPT"
    );

    expect(nodePrompt).toBe(denoPrompt);
  });
});
