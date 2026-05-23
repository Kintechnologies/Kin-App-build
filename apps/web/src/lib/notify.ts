/**
 * Slack alerting for briefing reliability.
 *
 * Posts to SLACK_ALERTS_WEBHOOK_URL. If the webhook isn't configured yet, falls back
 * to texting the first entry in ADMIN_PHONES (Austin's number) so a reliability
 * alert is never silently lost. Never throws — alerting must not be able to break
 * a request.
 *
 * P1-P5 (audit v7): V6 P1-I2 renamed the ops dashboard env to ADMIN_PHONES
 * (plural, comma-separated) but this fallback still read singular ADMIN_PHONE.
 * Misconfigured Vercel envs silently dropped the SMS fallback. We now read
 * ADMIN_PHONES first and fall back to ADMIN_PHONE for one deploy cycle so a
 * machine without the new env still alerts; drop ADMIN_PHONE next deploy.
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

  const webhook = process.env.SLACK_ALERTS_WEBHOOK_URL;
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

  const adminPhone =
    process.env.ADMIN_PHONES?.split(",")[0]?.trim() ||
    process.env.ADMIN_PHONE;
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
