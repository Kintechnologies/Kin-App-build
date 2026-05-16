/**
 * Transactional email via Resend.
 *
 * sendEmail() is the single send path; it no-ops (with a warning) when
 * RESEND_API_KEY is absent so local dev and CI never fail on a missing key.
 * Email is always a best-effort side channel — callers should not block a
 * user flow on a send succeeding.
 *
 * Env:
 *   RESEND_API_KEY — https://resend.com api key. If absent, sends are skipped.
 *   RESEND_FROM    — sender, defaults to "Kin <kin@kinai.family>". The
 *                    kinai.family domain must be verified in Resend.
 */

import { Resend } from "resend";

const DEFAULT_FROM = "Kin <kin@kinai.family>";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY not set — skipping "${input.subject}"`);
    return false;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || DEFAULT_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
  });

  if (error) {
    throw new Error(`Resend send failed: ${JSON.stringify(error)}`);
  }
  return true;
}

// ─── Shared layout ──────────────────────────────────────────────────────────

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface RenderOptions {
  preheader: string;
  heading: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  footnote?: string;
}

/**
 * Renders an on-brand Kin email: a centered card on a warm off-white
 * background, sage accent button, system fonts. Table-based and inline-styled
 * for mail-client compatibility.
 */
function renderEmail({ preheader, heading, paragraphs, cta, footnote }: RenderOptions): string {
  const body = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3A3A36;">${p}</p>`
    )
    .join("");

  const button = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
         <tr><td style="border-radius:8px;background:#7CB87A;">
           <a href="${cta.url}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#0C0F0A;text-decoration:none;border-radius:8px;">${cta.label}</a>
         </td></tr>
       </table>`
    : "";

  const foot = footnote
    ? `<p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#9A9A92;">${footnote}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:#F2EFE8;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2EFE8;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
      <tr><td style="padding:0 4px 20px;">
        <span style="font-size:18px;font-weight:700;letter-spacing:-0.02em;color:#0C0F0A;">Kin</span>
      </td></tr>
      <tr><td style="background:#FBFAF6;border:1px solid #E6E2D8;border-radius:14px;padding:32px;">
        <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:700;letter-spacing:-0.02em;color:#0C0F0A;">${heading}</h1>
        ${body}
        ${button}
        ${foot}
      </td></tr>
      <tr><td style="padding:20px 4px 0;">
        <p style="margin:0;font-size:12px;line-height:1.5;color:#9A9A92;">Kin — the AI that helps busy families stay coordinated.<br>You're receiving this because you signed up at kinai.family.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ─── Templates ──────────────────────────────────────────────────────────────

/**
 * Welcome email — sent once after signup. Sets expectations about the daily
 * morning briefing. `firstName` is optional (signup happens before onboarding
 * collects a name).
 */
export function welcomeEmail(firstName?: string | null): EmailTemplate {
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";
  const paragraphs = [
    `${greeting} welcome to Kin — I'm really glad you're here.`,
    "Every morning at 6am I'll text you a short briefing that pulls both parents' calendars together, flags the day's conflicts, and sorts out who's got pickup — so your family's day is handled before your coffee is.",
    "Your first briefing arrives tomorrow morning. You can reply to any text I send to ask me anything — a schedule question, a quick reminder, whatever's on your mind.",
    "Talk soon,<br>Kin",
  ];
  return {
    subject: "Welcome to Kin",
    text:
      `${greeting} welcome to Kin — I'm really glad you're here.\n\n` +
      "Every morning at 6am I'll text you a short briefing that pulls both parents' calendars together, flags the day's conflicts, and sorts out who's got pickup — so your family's day is handled before your coffee is.\n\n" +
      "Your first briefing arrives tomorrow morning. You can reply to any text I send to ask me anything.\n\n" +
      "Talk soon,\nKin",
    html: renderEmail({
      preheader: "Your first morning briefing arrives tomorrow at 6am.",
      heading: "Welcome to Kin",
      paragraphs,
    }),
  };
}

/**
 * Partner invite email — a backup channel to the SMS invite. Explains what
 * Kin is and links to the invite landing page so the partner can join the
 * same household.
 */
export function partnerInviteEmail(opts: {
  inviterName: string;
  familyLabel: string;
  inviteUrl: string;
}): EmailTemplate {
  const { inviterName, familyLabel, inviteUrl } = opts;
  const paragraphs = [
    `${inviterName} is using Kin to keep your family coordinated and wants you on board too.`,
    "Kin is an AI that texts each parent a short morning briefing — both calendars in one place, conflicts flagged, pickup and drop-off sorted. Joining links you into the same household, so you both see a shared family view.",
    `Tap below to join ${familyLabel}. It takes about two minutes to set up.`,
  ];
  return {
    subject: `${inviterName} invited you to Kin`,
    text:
      `${inviterName} is using Kin to keep your family coordinated and wants you on board too.\n\n` +
      "Kin is an AI that texts each parent a short morning briefing — both calendars in one place, conflicts flagged, pickup and drop-off sorted.\n\n" +
      `Join ${familyLabel}: ${inviteUrl}\n\n` +
      "This invite link expires in 7 days.",
    html: renderEmail({
      preheader: `${inviterName} invited you to join their household on Kin.`,
      heading: `${inviterName} invited you to Kin`,
      paragraphs,
      cta: { label: "Join your household", url: inviteUrl },
      footnote: "This invite link expires in 7 days. If you weren't expecting this, you can ignore this email.",
    }),
  };
}
