// Shared SMS helpers for Deno edge functions. The Next.js side can't
// import from supabase/functions, so the identical helper lives at
// apps/web/src/lib/sms-utils.ts — keep them in sync.

const STOP_FOOTER = "\n\nReply STOP to opt out.";

/**
 * Ensure every recurring outbound SMS carries an opt-out instruction per
 * A2P 10DLC carrier-audit standards. Idempotent: if the body already
 * mentions STOP (any case), it's returned unchanged.
 */
export function ensureStopFooter(body: string): string {
  return /\bSTOP\b/i.test(body) ? body : `${body}${STOP_FOOTER}`;
}
