import { timingSafeEqual } from "node:crypto";

/**
 * Shared auth check for cron API routes.
 *
 * Accepts `Authorization: Bearer <CRON_SECRET>`. The two callers are:
 *
 *   • Vercel Cron — sends CRON_SECRET for daily jobs listed in apps/web/vercel.json.
 *
 *   • The `cron-dispatch` Supabase edge function — proxies pg_cron-scheduled
 *     sub-daily jobs (see supabase/migrations/058_subdaily_crons.sql) and also
 *     sends CRON_SECRET as the Bearer token.
 *
 * CRON_SECRET is the only accepted credential. The service-role key is not
 * a cron credential — it grants full database access and must never be
 * shared with a scheduler-shaped trust boundary.
 *
 * Comparison uses timingSafeEqual to deny secret recovery via response-time
 * side channels (defense in depth against a short-list of plausible attackers
 * who can measure ~10ms latency over the public internet).
 */
export function isAuthorizedCron(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  return safeEqual(authHeader, `Bearer ${cronSecret}`);
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}
