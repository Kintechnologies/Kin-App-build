// Shared SMS helpers for the Next.js side. The Deno edge functions can't
// import from apps/web, so the identical helper lives at
// supabase/functions/_shared/sms-utils.ts — keep them in sync.

import type { SupabaseClient } from "@supabase/supabase-js";

const STOP_FOOTER = "\n\n\nReply STOP to opt out.";
const STOP_PATTERN = /\bSTOP\b|opt\s*out/i;
const MONTHLY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Unconditionally append the opt-out footer (idempotent — no-op if the body
 * already mentions STOP or opt out). Use on first-touch messages where the
 * recipient may have never been told how to opt out: welcome SMS, waitlist
 * confirmation, partner invites.
 */
export function ensureStopFooter(body: string): string {
  return STOP_PATTERN.test(body) ? body : `${body}${STOP_FOOTER}`;
}

/**
 * Append the opt-out footer only if no outbound message containing STOP/opt-out
 * has been sent to this phone in the last 30 days. Use on recurring sends
 * (morning briefing, sunday check-in, pickup-risk alerts, engagement nudges)
 * so the footer lands at most once per month instead of on every send.
 *
 * The "no prior STOP message in 30 days" branch naturally handles the
 * first-recurring-message case (no history → footer included).
 */
export async function ensureStopFooterMonthly(
  supabase: SupabaseClient,
  phoneNumber: string | null,
  body: string
): Promise<string> {
  if (STOP_PATTERN.test(body)) return body;
  if (!phoneNumber) return `${body}${STOP_FOOTER}`;

  const cutoff = new Date(Date.now() - MONTHLY_WINDOW_MS).toISOString();
  const { data } = await supabase
    .from("sms_conversations")
    .select("id")
    .eq("to_number", phoneNumber)
    .eq("direction", "outbound")
    .gte("sent_at", cutoff)
    .or("body.ilike.%STOP%,body.ilike.%opt out%")
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  return data ? body : `${body}${STOP_FOOTER}`;
}
