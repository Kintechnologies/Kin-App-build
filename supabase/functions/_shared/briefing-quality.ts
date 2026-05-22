// Runtime briefing quality checks. Two layers run before a briefing's quality
// is recorded:
//
//   1. quickQualityCheck — synchronous, zero-API regex pass over the generated
//      text plus the writer's context. Catches the most embarrassing failures
//      (forbidden opener, wildly off length, weather without grounding, no
//      household names) with zero latency. When it fires we Slack-critical
//      the team immediately because these are prompt-honesty bugs, not edge
//      cases the Haiku judge needs to weigh in on.
//
//   2. scoreBriefing — async call to Claude Haiku that scores the briefing
//      against the SYSTEM_PROMPT rubric (formatting, grounding, humility,
//      addressing, follow-up gate). Cheap and fast enough to run on every
//      briefing in parallel with SMS send. A failing grade Slack-warns the
//      team and is persisted to morning_briefings for trend dashboards.
//
// Neither layer blocks delivery. Quality is observed in production, never
// gates it.
//
// Requires ANTHROPIC_API_KEY in the edge function environment (already set for
// briefing generation — no new secret).

const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY")!;

// Haiku is the right tradeoff here: scoring runs on every briefing, so cost
// and latency matter; the judgement is rubric-driven and doesn't need Sonnet's
// reasoning headroom. Override via BRIEFING_SCORER_MODEL (v5 P2-B4) when
// rolling to a newer Haiku or A/B testing a different model.
const SCORER_MODEL =
  Deno.env.get("BRIEFING_SCORER_MODEL") ?? "claude-haiku-4-5-20251001";

// 70 = C. Below this we Slack the team. Lowered from 80 for beta weeks 1-2
// (audit v5 P2-B1) — Haiku scorer biases low on first-week voice variation,
// and we want signal on actual quality cliffs, not normal voice variation.
// Bump back to 80 once we have a baseline distribution from real users.
export const QUALITY_PASS_THRESHOLD = 70;

export type Grade = "A" | "B" | "C" | "D" | "F";

export interface BriefingScore {
  score: number;
  grade: Grade;
  issues: string[];
  pass: boolean;
}

function gradeFor(score: number): Grade {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick guard — synchronous, zero-API regex check
// ─────────────────────────────────────────────────────────────────────────────

export type QuickIssueType =
  | "forbidden_opener"
  | "too_short"
  | "too_long"
  | "weather_without_context"
  | "missing_family_name"
  | "phantom_partner";

export interface QuickQualityIssue {
  type: QuickIssueType;
  detail: string;
}

// Length floor and ceiling. The floor catches truncation and degenerate output;
// the ceiling catches runaway prose past the 600-char prompt cap (plus the
// payment nudge and any future appends).
const MIN_BRIEFING_CHARS = 100;
const MAX_BRIEFING_CHARS = 2000;

// Weather-related vocabulary. The prompt only allows these tokens when a
// "Weather (City): ..." line is present in the context — the most common
// hallucination is reaching for them without one.
const WEATHER_TERM_PATTERN =
  /\b(weather|forecast|temperature|temps?|degrees?|°|sunny|rain(y|ing|fall)?|cloud(y|s|ing)?|snow(y|ing|fall)?|storm(y|s)?|chilly|frigid|warm|cold|hot|drizzl(e|ing|y)|wind(y|s)?|humid(ity)?|sleet|hail|fog(gy)?|overcast|breezy|blustery|mild|brisk|sunshine|clear skies)\b/i;

const FORBIDDEN_OPENER_PATTERN = /^[\s>*_"'-]*good\s+morning/i;

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Pulls the names of people Kin knows about out of the prompt context, so we
// can check the generated briefing actually used at least one of them. We
// match the two ways names land in the prompt today:
//
//   "Primary parent (the person reading this briefing): Austin"
//   "Household members:\n  Jaxon (son, age 8)\n  Linnea (daughter, age 5)\n"
//
// Names shorter than 2 chars (initials, single-letter placeholders) are
// dropped — matching them in prose is unreliable.
function extractHouseholdNames(context: string): string[] {
  const names = new Set<string>();

  const parent = context.match(/Primary parent[^\n:]*:\s*([^\n]+)/i);
  if (parent) {
    const first = parent[1].trim().split(/\s+/)[0];
    if (first && first.length >= 2) names.add(first);
  }

  const members = context.match(
    /Household members:\s*\n([\s\S]*?)(?:\n\s*\n|\n[A-Z]|$)/
  );
  if (members) {
    for (const line of members[1].split("\n")) {
      const m = line.match(/^\s+([A-Z][A-Za-z'’\-]+)/);
      if (m && m[1].length >= 2) names.add(m[1]);
    }
  }

  return Array.from(names);
}

// Fast, zero-API guard. Runs synchronously on every briefing before the Haiku
// judge — catches the most embarrassing failures (forbidden opener, wildly off
// length, weather without grounding, household members not addressed) without
// adding latency. Pure function: returns the list of issues, callers decide
// how to react. Empty array means the briefing passed every quick check.
//
// `signals` carries structured ground truth derived from family_members data
// (not parsed from the rendered context string). Currently just hasPartner —
// used by the phantom-partner guard. Optional so legacy callers and tests
// keep working; when omitted, partner-aware checks are skipped. (V7 P0-3)
export function quickQualityCheck(
  text: string,
  context?: string,
  signals?: { hasPartner?: boolean }
): QuickQualityIssue[] {
  const issues: QuickQualityIssue[] = [];

  if (FORBIDDEN_OPENER_PATTERN.test(text)) {
    issues.push({
      type: "forbidden_opener",
      detail: 'Briefing opens with "Good morning" — the prompt forbids any time-of-day greeting.',
    });
  }

  const len = text.length;
  if (len < MIN_BRIEFING_CHARS) {
    issues.push({
      type: "too_short",
      detail: `Briefing is ${len} chars (minimum ${MIN_BRIEFING_CHARS}).`,
    });
  } else if (len > MAX_BRIEFING_CHARS) {
    issues.push({
      type: "too_long",
      detail: `Briefing is ${len} chars (maximum ${MAX_BRIEFING_CHARS}).`,
    });
  }

  // Weather check: only meaningful when we have the writer's context to
  // compare against. The context is "grounded" on weather iff the prompt has
  // a "Weather (City): ..." line — that's the exact gate the SYSTEM_PROMPT
  // weather rule checks. Anything else (e.g. "home_location" in context_notes
  // but no Weather line because the API call failed) is NOT grounding.
  if (context) {
    const mentionsWeather = WEATHER_TERM_PATTERN.test(text);
    const contextHasWeather = /\bWeather \(/i.test(context);
    if (mentionsWeather && !contextHasWeather) {
      issues.push({
        type: "weather_without_context",
        detail: "Briefing references weather but no 'Weather (...)' line was in the context.",
      });
    }
  }

  // Family-name check: only meaningful when we know who's in the household.
  // If the context lists names, at least one of them should appear in the
  // briefing — otherwise we're talking past the family.
  if (context) {
    const names = extractHouseholdNames(context);
    if (names.length > 0) {
      const matched = names.some((n) =>
        new RegExp(`\\b${escapeRegex(n)}\\b`, "i").test(text)
      );
      if (!matched) {
        issues.push({
          type: "missing_family_name",
          detail: `Briefing names no household member (known: ${names.join(", ")}).`,
        });
      }
    }
  }

  // Sole-parent guard: a briefing for a profile with no partner in
  // family_members must never lean on a phantom co-parent. The audit's
  // worst-case is "your partner can cover the 3 PM pickup" referring to
  // nobody — embarrassing for a single parent and a betrayal of the
  // family-data signal the user gave us. (audit v5 P1-B5)
  //
  // V7 P0-3: the prior implementation tried to detect partner-presence by
  // regex-matching the rendered ctx string for "partner's calendar" /
  // "spouse's events" — but buildBriefingContext never emits those literal
  // phrases (family members are rendered as `Jontae (partner, age 38)`), so
  // the guard never matched and inverted into a noise-generator. The signal
  // now arrives as structured ground truth from family_members data.
  if (signals && signals.hasPartner === false) {
    const phantomPattern =
      /\b(your\s+partner|the\s+other\s+parent|your\s+spouse|co-?parent)\b/i;
    const phantomMatch = text.match(phantomPattern);
    if (phantomMatch) {
      issues.push({
        type: "phantom_partner",
        detail: `Briefing references "${phantomMatch[0]}" but no partner is on file for this household — this profile is solo.`,
      });
    }
  }

  return issues;
}

// ─────────────────────────────────────────────────────────────────────────────
// Haiku judge — async, rubric-driven score
// ─────────────────────────────────────────────────────────────────────────────

// The judge prompt mirrors the rules baked into SYSTEM_PROMPT in briefing.ts.
// Keep it in lockstep with that prompt — if a rule changes there, update here.
const JUDGE_SYSTEM_PROMPT = `You are a strict quality auditor for Kin's morning SMS briefings. You score a single generated briefing against a fixed rubric and return JSON.

THE RUBRIC — deduct points for each violation observed. Start at 100 and subtract:

FORMATTING (hard rules — large deductions)
- Contains bullet points, numbered lists, dashes-as-bullets, or markdown formatting: -25
- Contains any line breaks (the briefing must be one continuous block of prose): -15
- Exceeds 480 characters AND does not end with a contextual follow-up question: -20
- Exceeds 600 characters under any circumstance: -30
- Starts with "Good morning" or "Morning" or any time-of-day greeting: -15

ADDRESSING THE FAMILY
- Manufactures a family surname from the parent's first name (e.g. "the Austin family" when only "Austin" the first name is on file, with no surname): -25
- Refers to household members generically when their names are known: -10

GROUNDING (when context is provided alongside the briefing)
- Asserts a fact, event, time, person, location, school, or activity that is NOT supported by the context: -20 per fabricated item
- Suggests an action ("leave by 2:40 for the 3pm game") that references an event not present in the context: -20
- Drifts into general parenting tips, news, meal ideas, health advice, or other commentary the context does not support: -25
- Includes a standalone weather forecast not tied to a specific event in the day, OR includes weather when it is mild and uneventful: -10

HUMILITY ON LOGISTICS
- States a time-sensitive logistic ("you have a meeting at 2", "pickup IS yours at 3pm") as flat fact rather than attributing to the calendar ("your calendar shows", "looks like"): -10
- When a DATA FRESHNESS WARNING is in the context, presents a clear calendar as definitely clear without hedging: -15

FOLLOW-UP QUESTION GATE
- Ends with a question on a normal/quiet day (no real scheduling conflict, tight timing, or ambiguous pickup): -20
- Ends with a generic question that does not name a specific event and time and propose a specific concrete action: -15
- Asks anything that hands the user more work instead of offering Kin's help: -15

TONE
- Reads like a database dump (lists facts back without weaving them into prose): -15
- Cold, generic, or impersonal when household details are available to personalize: -10

Cap the final score at [0, 100]. A briefing with zero violations is a 100.

OUTPUT — return ONLY a single JSON object, no prose, no markdown fences:
{"score": <0-100 integer>, "issues": ["<short specific violation>", ...]}

Each issue string should be one short sentence naming the rule violated and pointing at the offending text. If there are no issues, return an empty array.`;

// V6 P1-M2: bound the scorer with the same AbortController pattern the
// writer uses (briefing.ts:ANTHROPIC_TIMEOUT_MS). Without it a stalled
// Anthropic socket can sit on the platform's 60–120s TCP timeout while the
// briefing fan-out loop holds an open promise. Haiku is fast enough that 20s
// is generous — beyond that the call is hung, not slow.
const SCORER_TIMEOUT_MS = 20_000;

// One scoring call. Returns null on any failure — caller treats that as "could
// not score" and proceeds. Never throws.
async function callJudge(prompt: string): Promise<{ score: number; issues: string[] } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SCORER_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: SCORER_MODEL,
        max_tokens: 400,
        system: JUDGE_SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`scoreBriefing: judge call returned ${res.status}: ${body}`);
      return null;
    }
    const data = await res.json();
    const text: string =
      data.content?.[0]?.type === "text" ? data.content[0].text : "";
    if (!text.trim()) {
      console.error("scoreBriefing: judge returned empty content");
      return null;
    }
    // Haiku occasionally wraps JSON in fences despite instructions — strip
    // them before parsing. Look for the first { and last } as a safety net.
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      console.error("scoreBriefing: judge output had no JSON object:", text);
      return null;
    }
    const parsed = JSON.parse(text.slice(start, end + 1));
    const rawScore = Number(parsed?.score);
    if (!Number.isFinite(rawScore)) {
      console.error("scoreBriefing: judge JSON missing numeric score:", parsed);
      return null;
    }
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));
    const issues: string[] = Array.isArray(parsed?.issues)
      ? parsed.issues.filter((s: unknown): s is string => typeof s === "string" && s.trim().length > 0)
      : [];
    return { score, issues };
  } catch (err) {
    console.error(
      "scoreBriefing: judge call threw",
      err instanceof Error ? err.message : String(err)
    );
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Score a generated briefing. Pass the optional `context` (the same string fed
// into SYSTEM_PROMPT as the user message) to enable grounding checks — without
// it, the judge can only score the rule violations visible from the briefing
// text alone.
export async function scoreBriefing(
  briefingText: string,
  context?: string
): Promise<BriefingScore | null> {
  const prompt = context
    ? `CONTEXT THAT WAS AVAILABLE TO THE WRITER:\n${context}\n\n---\n\nGENERATED BRIEFING TO SCORE:\n${briefingText}`
    : `GENERATED BRIEFING TO SCORE (no context provided — score only the rules that are visible from the briefing text):\n${briefingText}`;

  const result = await callJudge(prompt);
  if (!result) return null;

  const grade = gradeFor(result.score);
  return {
    score: result.score,
    grade,
    issues: result.issues,
    pass: result.score >= QUALITY_PASS_THRESHOLD,
  };
}
