import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@kin/shared"],
};

export default withSentryConfig(nextConfig, {
  // Suppresses source-map upload logs during build
  silent: true,
  // Upload source maps only in CI / production builds
  dryRun: process.env.SENTRY_AUTH_TOKEN === undefined,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});
