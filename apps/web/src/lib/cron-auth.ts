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
 */
export function isAuthorizedCron(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  return authHeader === `Bearer ${cronSecret}`;
}
