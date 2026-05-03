/**
 * Founder-facing activity log + email alert helper.
 *
 * Always inserts a row into activity_log via the service-role client.
 * If RESEND_API_KEY and ACTIVITY_ALERT_EMAIL are configured, it also fires
 * a simple email so the founder gets a real-time signal. Email failures are
 * non-fatal — the activity row is the source of truth.
 *
 * Env:
 *   RESEND_API_KEY        — optional, https://resend.com api key
 *   ACTIVITY_ALERT_EMAIL  — destination address (defaults to founder address)
 *   ACTIVITY_ALERT_FROM   — sender, defaults to "Kin Activity <noreply@kinai.family>"
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type ActivityEventType =
  | "waitlist_join"
  | "waitlist_existing"
  | "signup"
  | "subscription_started"
  | "subscription_canceled";

export interface LogActivityInput {
  eventType: ActivityEventType;
  email?: string | null;
  profileId?: string | null;
  metadata?: Record<string, unknown>;
  /** Subject + body override for the email alert. */
  subject?: string;
  body?: string;
}

const DEFAULT_ALERT_EMAIL = "austin.ford1519@gmail.com";
const DEFAULT_ALERT_FROM = "Kin Activity <noreply@kinai.family>";

export async function logActivity(input: LogActivityInput): Promise<void> {
  const {
    eventType,
    email = null,
    profileId = null,
    metadata = {},
    subject,
    body,
  } = input;

  // ── 1. Persist to activity_log ──────────────────────────────────────────────
  try {
    const supabase = createAdminClient();
    await supabase.from("activity_log").insert({
      event_type: eventType,
      email,
      profile_id: profileId,
      metadata,
    });
  } catch (err) {
    // Non-fatal — the table may not exist yet on a fresh deploy
    console.warn("activity_log insert failed:", err);
  }

  // ── 2. Email alert (best-effort) ────────────────────────────────────────────
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const to = process.env.ACTIVITY_ALERT_EMAIL || DEFAULT_ALERT_EMAIL;
  const from = process.env.ACTIVITY_ALERT_FROM || DEFAULT_ALERT_FROM;

  const emailSubject = subject ?? defaultSubject(eventType, email);
  const emailBody = body ?? defaultBody(eventType, email, metadata);

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: emailSubject,
        text: emailBody,
      }),
    });
  } catch (err) {
    console.warn("activity email failed:", err);
  }
}

function defaultSubject(eventType: ActivityEventType, email?: string | null): string {
  const who = email ?? "someone";
  switch (eventType) {
    case "waitlist_join":
      return `[kin] waitlist: ${who}`;
    case "waitlist_existing":
      return `[kin] waitlist (returning): ${who}`;
    case "signup":
      return `[kin] new account: ${who}`;
    case "subscription_started":
      return `[kin] subscription started: ${who}`;
    case "subscription_canceled":
      return `[kin] subscription canceled: ${who}`;
    default:
      return `[kin] ${eventType}`;
  }
}

function defaultBody(
  eventType: ActivityEventType,
  email: string | null | undefined,
  metadata: Record<string, unknown>
): string {
  const lines: string[] = [];
  lines.push(`Event: ${eventType}`);
  if (email) lines.push(`Email: ${email}`);
  if (Object.keys(metadata).length > 0) {
    lines.push("");
    lines.push("Metadata:");
    for (const [k, v] of Object.entries(metadata)) {
      lines.push(`  ${k}: ${JSON.stringify(v)}`);
    }
  }
  lines.push("");
  lines.push(`Timestamp: ${new Date().toISOString()}`);
  return lines.join("\n");
}
