/**
 * Sentry initialisation for Kin mobile (Expo / React Native).
 *
 * Call `initSentry()` once at app startup (RootLayout) before rendering any
 * screens. After that, import `* as Sentry from "@sentry/react-native"` in
 * any file that needs to capture exceptions.
 *
 * DSN is sourced from EXPO_PUBLIC_SENTRY_DSN in the environment. If the var
 * is absent (local dev without a Sentry project) init is skipped gracefully.
 */

import * as Sentry from "@sentry/react-native";

export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    if (__DEV__) {
      console.warn("[Sentry] EXPO_PUBLIC_SENTRY_DSN not set — Sentry disabled.");
    }
    return;
  }

  Sentry.init({
    dsn,
    // Capture 100 % of traces in development; lower in production once we
    // have baseline data.
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    // Don't log Sentry internals to the console in production.
    debug: __DEV__,
    // Enable automatic session tracking so we see crash-free session rates.
    enableAutoSessionTracking: true,
  });
}
