/**
 * CSRF defense-in-depth for state-changing POST endpoints.
 *
 * SameSite=Lax on the Supabase auth cookie already blocks cross-site form
 * POSTs (P2-A1 from audit v6). This check adds a second layer: reject any
 * POST whose Origin/Referer header doesn't match our own origin. The two
 * cooperate — SameSite stops the browser from sending the auth cookie at
 * all on a true cross-origin POST, and this origin check stops a
 * misconfigured CORS preflight or a cookie-less script-tag POST from
 * being honored.
 *
 * Webhook endpoints (Stripe, Twilio, Google) must NOT use this — they're
 * authenticated by signature, not by being same-origin.
 */

const ALLOWED_HOSTS = new Set<string>([
  "kinai.family",
  "www.kinai.family",
  "localhost",
  "127.0.0.1",
]);

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  // Production: app URL is the source of truth.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  let expectedHost: string | null = null;
  if (appUrl) {
    try {
      expectedHost = new URL(appUrl).host;
    } catch {
      // Fall through to host-header check.
    }
  }

  const matchesHost = (candidate: string): boolean => {
    try {
      const url = new URL(candidate);
      if (expectedHost && url.host === expectedHost) return true;
      if (host && url.host === host) return true;
      // Vercel preview deploys: *.vercel.app
      if (url.host.endsWith(".vercel.app")) return true;
      const bare = url.host.split(":")[0];
      return ALLOWED_HOSTS.has(bare);
    } catch {
      return false;
    }
  };

  if (origin) return matchesHost(origin);
  // Some browsers omit Origin on same-site POSTs from older code paths;
  // fall back to Referer when present.
  if (referer) return matchesHost(referer);
  // No Origin and no Referer — treat as cross-origin and reject. Honest
  // browser POSTs from our own pages send at least one of these.
  return false;
}
