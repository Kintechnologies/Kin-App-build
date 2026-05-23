/**
 * Shared PII scrubber for Sentry events.
 *
 * Every Sentry.captureException across the codebase forwards raw error objects
 * that can include phone numbers (E.164), emails, household_ids, profile_ids,
 * and Twilio/Stripe identifiers. The cleanup-cron breadcrumb fix in V3
 * patched one site; this `beforeSend` hook runs on every event from every
 * runtime (client, server, edge) and strips PII before transmission.
 *
 * Heuristic-only — never trust upstream to mark fields safe. Anything that
 * resembles a phone, email, or UUID gets redacted. Allowlist Stripe + Twilio
 * resource prefixes (`cus_`, `sub_`, `SM`, `MG`, etc.) so debugging still
 * works — those identifiers are not PII on their own.
 */

import type { ErrorEvent, EventHint } from "@sentry/nextjs";

const PHONE_RE = /\+?\d{10,15}/g;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

// P1-P2 (audit v7): the original allowlist missed several Kin-specific PII
// keys. A captureException whose extras carried a profile row would leak
// family_name, partner_name, body (SMS), context_notes, etc. straight to
// Sentry. Extend the regex to cover everything we identified plus the
// invitee_phone / kid_names / assigned_member surfaces.
const SENSITIVE_KEY_RE =
  /^(phone|phone_number|email|household_id|profile_id|user_id|to|from|to_number|from_number|partner_phone|partner_email|invitee_email|invitee_phone|access_token|refresh_token|app_password|caldav_url|google_channel_id|google_resource_id|family_name|last_name|first_name|partner_name|kid_names?|child_name|assigned_member|body|context_notes|invite_code)$/i;

function redactString(s: string): string {
  return s
    .replace(EMAIL_RE, "<email>")
    .replace(PHONE_RE, "<phone>")
    .replace(UUID_RE, "<uuid>");
}

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 6) return value;
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_RE.test(k)) {
        out[k] = "<redacted>";
      } else {
        out[k] = scrub(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

export function scrubSentryEvent(
  event: ErrorEvent,
  _hint?: EventHint
): ErrorEvent | null {
  // Authoritative PII surfaces Sentry exposes by default. Each one is scrubbed
  // in-place rather than dropped so debugging context still survives.
  if (event.request) {
    event.request = scrub(event.request) as typeof event.request;
  }
  if (event.user) {
    // Keep only an opaque id so events can still be grouped per-user; strip
    // email/username/ip/extras Sentry pulls in via `sendDefaultPii`.
    const id = (event.user as { id?: string }).id;
    event.user = id ? { id } : {};
  }
  if (event.extra) {
    event.extra = scrub(event.extra) as typeof event.extra;
  }
  if (event.contexts) {
    event.contexts = scrub(event.contexts) as typeof event.contexts;
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map(
      (b) => scrub(b) as typeof b
    );
  }
  if (event.message) {
    event.message = redactString(event.message);
  }
  if (event.exception?.values) {
    event.exception.values = event.exception.values.map((v) => ({
      ...v,
      value: v.value ? redactString(v.value) : v.value,
    }));
  }
  return event;
}
