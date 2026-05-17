/**
 * Slack alerting for briefing reliability.
 *
 * Posts to SLACK_WEBHOOK_URL. If the webhook isn't configured yet, falls back
 * to texting ADMIN_PHONE (Austin's number) so a reliability alert is never
 * silently lost. Never throws — alerting must not be able to break a request.
 */

import { sendSms } from "@/lib/twilio";

export type Severity = "info" | "warning" | "critical";

export async function notifySlack(
  message: string,
  severity: Severity = "info"
): Promise<void> {
  const emoji =
    severity === "critical" ? "🔴" : severity === "warning" ? "🟠" : "🔵";
  const text = `${emoji} [briefing/${severity}] ${message}`;

  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) return;
      console.error(`notifySlack: webhook returned ${res.status}`);
    } catch (err) {
      console.error("notifySlack: webhook post failed", err);
    }
  }

  const adminPhone = process.env.ADMIN_PHONE;
  if (adminPhone) {
    try {
      await sendSms(adminPhone, text.slice(0, 600));
      return;
    } catch (err) {
      console.error("notifySlack: admin SMS fallback failed", err);
    }
  }

  console.error("notifySlack: no delivery channel — alert dropped:", text);
}
