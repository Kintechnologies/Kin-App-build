/**
 * Slack alerting + persistence for ops monitoring.
 *
 * Posts to SLACK_ALERTS_WEBHOOK_URL. If the webhook isn't configured yet,
 * falls back to texting ADMIN_PHONE (Austin's number) so a reliability alert
 * is never silently lost. Every call is also mirrored into alerts_log so the
 * /ops dashboard can show recent activity even when Slack is hard to scroll.
 *
 * Never throws — alerting must not be able to break a request.
 */

import { sendSms } from "@/lib/twilio";
import { createAdminClient } from "@/lib/supabase/admin";

export type Severity = "info" | "warning" | "critical";

export type AlertCategory =
  | "briefing"
  | "sms"
  | "calendar"
  | "payments"
  | "auth"
  | "signup"
  | "system"
  | "summary";

interface NotifyOptions {
  severity?: Severity;
  category?: AlertCategory;
  metadata?: Record<string, unknown>;
}

const SEVERITY_EMOJI: Record<Severity, string> = {
  critical: "🔴",
  warning: "🟠",
  info: "🔵",
};

export async function notifySlack(
  message: string,
  severityOrOptions: Severity | NotifyOptions = "info"
): Promise<void> {
  const opts: NotifyOptions =
    typeof severityOrOptions === "string"
      ? { severity: severityOrOptions }
      : severityOrOptions;
  const severity: Severity = opts.severity ?? "info";
  const category: AlertCategory = opts.category ?? "briefing";

  const emoji = SEVERITY_EMOJI[severity];
  const text = `${emoji} [${category}/${severity}] ${message}`;

  const delivered = await deliverToSlackOrSms(text);
  await persistAlert({
    severity,
    category,
    message,
    metadata: opts.metadata,
    delivered,
  });
}

async function deliverToSlackOrSms(text: string): Promise<boolean> {
  const webhook = process.env.SLACK_ALERTS_WEBHOOK_URL;
  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) return true;
      console.error(`notifySlack: webhook returned ${res.status}`);
    } catch (err) {
      console.error("notifySlack: webhook post failed", err);
    }
  }

  const adminPhone = process.env.ADMIN_PHONE;
  if (adminPhone) {
    try {
      await sendSms(adminPhone, text.slice(0, 600));
      return true;
    } catch (err) {
      console.error("notifySlack: admin SMS fallback failed", err);
    }
  }

  console.error("notifySlack: no delivery channel — alert dropped:", text);
  return false;
}

async function persistAlert(row: {
  severity: Severity;
  category: AlertCategory;
  message: string;
  metadata?: Record<string, unknown>;
  delivered: boolean;
}): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("alerts_log").insert({
      severity: row.severity,
      category: row.category,
      message: row.message,
      metadata: row.metadata ?? null,
      delivered: row.delivered,
    });
  } catch (err) {
    console.error("notifySlack: alerts_log insert failed", err);
  }
}
