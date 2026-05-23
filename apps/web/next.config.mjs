import { withSentryConfig } from "@sentry/nextjs";

// CSP. Allowlist matches today's third-party surface:
//   Supabase REST / realtime / storage (PostgREST + websocket)
//   Stripe checkout + portal redirects + JS bundle
//   Anthropic — only server-side, no browser calls, so no api.anthropic.com
//   Sentry tunneled via /monitoring (no external host needed)
//   Vercel analytics + Vercel preview hosts during /monitoring tunneling
//   Google Fonts (the marketing site loads Instrument Serif)
//
// P1-I2 (audit v7): V6 shipped this as Content-Security-Policy-Report-Only
// with a promise to flip "once production logs are clean for a week." There
// was no report sink, so "clean" was unverifiable. We now POST violations to
// /api/csp-report (forwards to Sentry). Set CSP_ENFORCE=1 in Vercel to flip
// the header from Report-Only to enforced — the violation feed at
// Sentry > Issues > "csp.violation" must be empty for 7 days first.
const CSP_DIRECTIVES = [
  "default-src 'self'",
  // Next.js inlines a small bootstrap script; 'unsafe-inline' is required
  // until we adopt nonces. 'unsafe-eval' tolerates dev-time HMR; trim once we
  // confirm prod doesn't need it.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  // Supabase realtime is wss://; rest is https://. The wildcard *.supabase.co
  // covers both project subdomains and the storage CDN.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.vercel-insights.com https://va.vercel-scripts.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "form-action 'self' https://checkout.stripe.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "report-uri /api/csp-report",
].join("; ");

const CSP_HEADER_NAME =
  process.env.CSP_ENFORCE === "1"
    ? "Content-Security-Policy"
    : "Content-Security-Policy-Report-Only";

// Baseline security headers applied to every response. Conservative defaults
// per OWASP — locks framing, MIME sniffing, browser sensor APIs, and forces
// HTTPS in supporting browsers. Adjust Permissions-Policy if a feature ever
// needs camera/mic/geolocation.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Defaults to Report-Only; set CSP_ENFORCE=1 in Vercel to flip to
  // enforced once the /api/csp-report Sentry feed is clean for a week.
  // (P1-I2 audit v7)
  { key: CSP_HEADER_NAME, value: CSP_DIRECTIVES },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@kin/shared"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Suppresses source-map upload logs during build
  silent: true,
  // Upload source maps only in CI / production builds
  dryRun: process.env.SENTRY_AUTH_TOKEN === undefined,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // v5 P2-I2: route browser-side Sentry traffic through our own domain so
  // ad-blockers (uBlock, EasyPrivacy) can't suppress error reports — family
  // product audience overlaps heavily with privacy-extension users.
  tunnelRoute: "/monitoring",
  // V6 P1-I4: performance trace sampling is configured in sentry.client/server
  // /edge.config.ts (tracesSampleRate: 0.1 in production, 0 in dev). Those are
  // the canonical surfaces — keeping it here too would silently desync.
});
