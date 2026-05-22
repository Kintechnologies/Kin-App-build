import { withSentryConfig } from "@sentry/nextjs";

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
});
