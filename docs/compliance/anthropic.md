# Anthropic Workspace Logging Posture

> **⚠️ BETA LAUNCH BLOCKER (Audit V8 P0-3):** The verification below has
> never been performed. Workspace logging is the only control on what
> Anthropic retains after an inference completes, and every briefing
> prompt carries kid names, school names, partner names, and calendar
> event titles. **This must be verified in the Anthropic Console
> before beta launches to any external cohort.** Walk through the
> verification steps below, then fill in the recording table at the
> bottom with the date, your name, the workspace ID, and a screenshot
> path.

(Audit V7 P2-P6) Anthropic's Console exposes a per-workspace
"workspace logging" toggle. When ON, every prompt and completion sent
through API keys in that workspace is retained server-side. Our
morning-briefing prompts include household PII (kid names, school
names, calendar event titles, partner names), so the production API
key MUST live in a workspace with logging disabled.

## Verification steps

1. Sign in to https://console.anthropic.com as an org owner.
2. Click the workspace selector → choose the workspace whose key is
   set as `ANTHROPIC_API_KEY` in Vercel production.
3. Settings → Privacy → confirm **"Workspace logging"** is **OFF**.
4. Settings → API keys → confirm the production key is scoped to this
   workspace and not a personal workspace.

## Recording the evidence

When this verification is performed, append a row below with the date,
the operator who verified, and a screenshot path. Re-verify whenever
the production API key is rotated or the workspace owner changes.

| Date | Verified by | Workspace ID | Screenshot |
|---|---|---|---|
| _pending initial verification_ | | | |

## Why this matters even with the scrubber

The `sentry-scrub.ts` redaction layer covers errors flowing into
Sentry. It does NOT touch the LLM prompts we send to Anthropic — those
must include the user's calendar / kid / partner names for the
briefing to be useful at all. Workspace-logging-disabled is the only
control that keeps Anthropic from retaining those prompts after the
inference response is returned.
