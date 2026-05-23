// Shared SMS helpers for the Next.js side. The Deno edge functions can't
// import from apps/web, so the identical helper lives at
// supabase/functions/_shared/sms-utils.ts — keep them in sync.

const STOP_FOOTER = "\n\nReply STOP to opt out.";

/**
 * Ensure every recurring outbound SMS carries an opt-out instruction per
 * A2P 10DLC carrier-audit standards. Idempotent: if the body already
 * mentions STOP (any case), it's returned unchanged.
 */
export function ensureStopFooter(body: string): string {
  return /\bSTOP\b/i.test(body) ? body : `${body}${STOP_FOOTER}`;
}
