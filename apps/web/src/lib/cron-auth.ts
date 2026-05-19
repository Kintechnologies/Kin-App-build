/**
 * Shared auth check for cron API routes.
 *
 * A cron route is reached two ways, and accepts a Bearer token from either:
 *
 *   • Vercel Cron — sends `Authorization: Bearer <CRON_SECRET>` for the daily
 *     jobs still listed in apps/web/vercel.json.
 *
 *   • The `cron-dispatch` Supabase edge function — sends the project's
 *     service-role key as the Bearer token. It moved the sub-daily jobs off
 *     Vercel Cron (the Hobby plan only allows daily schedules — see
 *     supabase/migrations/058_subdaily_crons.sql). The edge function gets the
 *     service-role key auto-injected by Supabase, and this app already holds
 *     the same key as SUPABASE_SERVICE_ROLE_KEY, so the two match with no
 *     extra secret to provision.
 *
 * Both tokens are server-only secrets; matching either proves the caller is
 * one of our own schedulers.
 */
export function isAuthorizedCron(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  const accepted = [
    process.env.CRON_SECRET,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ].filter((s): s is string => Boolean(s));

  return accepted.some((secret) => authHeader === `Bearer ${secret}`);
}
