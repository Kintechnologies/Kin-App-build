import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "@/lib/sentry-scrub";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
  debug: false,
  beforeSend: scrubSentryEvent,
  // v5 P2-I2: tag events with the deploy SHA so a regression report can be
  // bisected to a specific commit, and tunnel through /monitoring so
  // ad-blockers (heavy overlap with our privacy-extension audience) don't
  // suppress error reports.
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
});
