/**
 * Transactional + lifecycle email via Resend.
 *
 * sendEmail() is the single send path; it no-ops (with a warning) when
 * RESEND_API_KEY is absent so local dev and CI never fail on a missing key.
 * Email is always a best-effort side channel — callers should not block a
 * user flow on a send succeeding.
 *
 * Each template is a pure function: it takes profile data and returns an
 * EmailTemplate ({ subject, html, text }). Rendering goes through buildEmail()
 * so the HTML and plain-text bodies are always generated from one source.
 *
 * Env:
 *   RESEND_API_KEY      — https://resend.com api key. If absent, sends are skipped.
 *   RESEND_FROM         — sender, defaults to "Kin <hello@kinai.family>". The
 *                         kinai.family domain must be verified in Resend.
 *   NEXT_PUBLIC_APP_URL — base URL for dashboard links.
 */

import { Resend } from "resend";

const DEFAULT_FROM = "Kin <hello@kinai.family>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://kinai.family";
const BILLING_URL = `${APP_URL}/dashboard/billing`;

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

// ─── Rendering ──────────────────────────────────────────────────────────────

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface Stat {
  value: string | number;
  label: string;
}

interface EmailOptions {
  subject: string;
  /** Hidden inbox-preview line. */
  preheader: string;
  heading: string;
  /** Body paragraphs — may contain <br> and inline tags. */
  paragraphs: string[];
  /** Optional stat block, rendered as a card row directly under the heading. */
  stats?: Stat[];
  /** Optional sage-marked list, rendered after the paragraphs. */
  bullets?: string[];
  /** Optional closing paragraphs, rendered after the bullets. */
  outro?: string[];
  cta?: { label: string; url: string };
  footnote?: string;
}

// Kin brand — dark warm background, sage accent, off-white type.
const C = {
  bg: "#0C0F0A",
  card: "#14180F",
  cardBorder: "#2C3024",
  statBg: "#10130C",
  heading: "#F2EFE6",
  body: "#C5C3B6",
  sage: "#9DBF8E",
  muted: "#787C70",
};

/**
 * Render an on-brand Kin email: a centered card on the dark Kin background,
 * sage accents, warm off-white type. Table-based and inline-styled for
 * broad mail-client compatibility.
 */
function renderHtml(o: EmailOptions): string {
  const stats = o.stats?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 22px;">
         <tr>${o.stats
           .map(
             (s, i) =>
               `${i > 0 ? '<td style="width:10px;">&nbsp;</td>' : ""}<td align="center" style="background:${C.statBg};border:1px solid ${C.cardBorder};border-radius:10px;padding:14px 6px;">
                  <div style="font-size:26px;line-height:1;font-weight:700;color:${C.sage};">${s.value}</div>
                  <div style="margin-top:6px;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:${C.muted};">${s.label}</div>
                </td>`
           )
           .join("")}</tr>
       </table>`
    : "";

  const para = (ps: string[]) =>
    ps
      .map(
        (p) =>
          `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${C.body};">${p}</p>`
      )
      .join("");

  const body = para(o.paragraphs);
  const outro = o.outro?.length ? para(o.outro) : "";

  const bullets = o.bullets?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 18px;">
         ${o.bullets
           .map(
             (b) =>
               `<tr><td style="padding:0 0 12px;font-size:15px;line-height:1.6;color:${C.body};">
                  <span style="color:${C.sage};font-weight:700;">&rsaquo;</span>&nbsp;&nbsp;${b}
                </td></tr>`
           )
           .join("")}
       </table>`
    : "";

  const button = o.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
         <tr><td style="border-radius:8px;background:${C.sage};">
           <a href="${o.cta.url}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:${C.bg};text-decoration:none;border-radius:8px;">${o.cta.label}</a>
         </td></tr>
       </table>`
    : "";

  const foot = o.footnote
    ? `<p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:${C.muted};">${o.footnote}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${o.heading}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${o.preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
      <tr><td style="padding:0 4px 20px;">
        <span style="font-size:18px;font-weight:700;letter-spacing:-0.02em;color:${C.sage};">Kin</span>
      </td></tr>
      <tr><td style="background:${C.card};border:1px solid ${C.cardBorder};border-radius:14px;padding:32px;">
        <h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;font-weight:700;letter-spacing:-0.02em;color:${C.heading};">${o.heading}</h1>
        ${stats}
        ${body}
        ${bullets}
        ${outro}
        ${button}
        ${foot}
      </td></tr>
      <tr><td style="padding:20px 4px 0;">
        <p style="margin:0;font-size:12px;line-height:1.5;color:${C.muted};">Kin — the AI that helps busy families stay coordinated.<br>You're receiving this because you signed up at kinai.family.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/** Strip inline HTML to readable plain text. */
function htmlToText(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&rsaquo;/g, "›")
    .replace(/&rsquo;/g, "’")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

function renderText(o: EmailOptions): string {
  const lines: string[] = [o.heading, ""];
  if (o.stats?.length) {
    lines.push(o.stats.map((s) => `${s.value} ${s.label}`).join("  ·  "), "");
  }
  for (const p of o.paragraphs) lines.push(htmlToText(p), "");
  if (o.bullets?.length) {
    for (const b of o.bullets) lines.push(`- ${htmlToText(b)}`);
    lines.push("");
  }
  if (o.outro?.length) {
    for (const p of o.outro) lines.push(htmlToText(p), "");
  }
  if (o.cta) lines.push(`${o.cta.label}: ${o.cta.url}`, "");
  if (o.footnote) lines.push(htmlToText(o.footnote));
  return lines.join("\n").trim();
}

function buildEmail(o: EmailOptions): EmailTemplate {
  return { subject: o.subject, html: renderHtml(o), text: renderText(o) };
}

/** "Hi Sarah," / "Hi there," — first-name greeting with a safe fallback. */
function greeting(firstName?: string | null): string {
  const name = (firstName ?? "").trim();
  return name ? `Hi ${name},` : "Hi there,";
}

// ─── Templates ──────────────────────────────────────────────────────────────

/**
 * Welcome email — sent once after onboarding completes (SMS step 9, or web
 * signup). Confirms the briefing schedule and the always-on text channel.
 */
export function welcomeEmail(firstName?: string | null): EmailTemplate {
  return buildEmail({
    subject: "Welcome to Kin",
    preheader: "Your first morning briefing arrives tomorrow.",
    heading: "Welcome to Kin",
    paragraphs: [
      `${greeting(firstName)} welcome to Kin — I'm really glad you're here.`,
      "Every morning, before your day gets going, I'll text you a short briefing: both parents' calendars pulled together, the day's conflicts flagged, and pickup sorted — so your family's day is handled before your coffee is.",
      "Your first briefing arrives tomorrow morning. And this isn't a one-way thing — reply to any text I send to ask me anything. \"Who's got pickup?\" \"What's Thursday look like?\" Plans changed? Just tell me. I'm always one text away.",
      "Talk soon,<br>Kin",
    ],
  });
}

/**
 * Trial drip — Day 2. Reframes Kin as a conversation, not a one-way briefing,
 * with concrete prompts the user can try today.
 */
export function trialDay2Email(firstName?: string | null): EmailTemplate {
  return buildEmail({
    subject: "Getting the most out of Kin",
    preheader: "Kin works best as a conversation — here's how.",
    heading: "Getting the most out of Kin",
    paragraphs: [
      `${greeting(firstName)} two days in — hope your mornings already feel a little lighter.`,
      "Here's the thing most people miss at first: Kin isn't just a briefing that lands in the morning. It's a conversation. The more you text, the sharper it gets. A few ways to put it to work:",
    ],
    bullets: [
      "Text Kin when plans change — \"soccer moved to 5pm\" or \"I'm working late Thursday.\" It updates everything around it.",
      "Ask about your schedule anytime — \"who's got pickup tomorrow?\" or \"what does Friday look like?\"",
      "Mention what's coming — a doctor's appointment, a school event, a weekend trip — and Kin folds it into your briefings.",
    ],
    outro: [
      "Treat Kin like the family member who quietly keeps track of everything. The texts you send today make next week's briefings sharper.",
      "Talk soon,<br>Kin",
    ],
  });
}

/**
 * Trial drip — Day 4. The longitudinal angle: Kin compounds in value the
 * longer it knows a family.
 */
export function trialDay4Email(firstName?: string | null): EmailTemplate {
  return buildEmail({
    subject: "What Kin learns over time",
    preheader: "Week 2, month 2 — Kin keeps getting sharper.",
    heading: "What Kin learns over time",
    paragraphs: [
      `${greeting(firstName)} you're halfway through your first week. Here's what makes Kin different from a calendar app: it gets smarter the longer it knows you.`,
      "Right now Kin is learning your routines — who does drop-off, when practice runs late, which days are quietly chaos. That's just the start:",
    ],
    bullets: [
      "Week 2 — Kin knows your rhythms. It sees a tight Thursday coming before you mention it.",
      "Month 1 — Kin anticipates conflicts. A meeting colliding with pickup gets flagged days early, not the morning of.",
      "Month 2 and beyond — Kin holds the long view. The recital you mentioned in spring resurfaces exactly when it matters.",
    ],
    outro: [
      "That's the real promise: one place that holds your family's context over time, so nothing important slips.",
      "More soon,<br>Kin",
    ],
  });
}

/**
 * Trial drip — Day 6. Soft, confident reminder that the trial ends tomorrow,
 * with a preview of what's ahead and a dashboard link.
 */
export function trialDay6Email(firstName?: string | null): EmailTemplate {
  return buildEmail({
    subject: "Your trial wraps up tomorrow",
    preheader: "Tomorrow's your last trial day — here's what's ahead.",
    heading: "Your trial wraps up tomorrow",
    paragraphs: [
      `${greeting(firstName)} your free trial wraps up tomorrow. No pressure — just a heads up so nothing catches you off guard.`,
      "If the morning briefings have earned a spot in your routine, keeping Kin going takes about a minute. And there's a lot still coming:",
    ],
    bullets: [
      "Spouse &amp; co-parent coordination — both calendars, one shared family view.",
      "Smarter conflict detection — collisions caught earlier, with more context.",
      "Seasonal awareness — Kin learns the rhythm of your school year, sports seasons, and holidays.",
    ],
    cta: { label: "Go to your dashboard", url: BILLING_URL },
    footnote: "You can add or update payment details from your dashboard anytime.",
  });
}

/**
 * Day-7 trial expiry — sent the morning the trial ends. Direct CTA to billing,
 * with the founding-pricing note for beta members.
 */
export function trialExpiryEmail(firstName?: string | null): EmailTemplate {
  return buildEmail({
    subject: "Your Kin trial is complete",
    preheader: "Your first week's done — keep Kin going for $39/mo.",
    heading: "Your Kin trial is complete",
    paragraphs: [
      `${greeting(firstName)} that's your first week with Kin.`,
      "If Kin's been useful — if your mornings have felt a little more handled — keep it going for $39/mo. As a beta member, you lock in founding pricing for as long as you stay.",
      "Nothing changes when you do: same morning briefings, same number, same Kin. Just add your payment details and it keeps going without missing a day.",
    ],
    cta: { label: "Keep Kin going", url: BILLING_URL },
    footnote:
      "Founding pricing is reserved for beta members and stays locked to your account.",
  });
}

/**
 * Weekly recap — sent Sunday evening. A progress report on how well Kin knows
 * the family, built from the week's briefings and tracked events.
 */
export function weeklyRecapEmail(opts: {
  firstName?: string | null;
  briefingsSent: number;
  eventsTracked: number;
  familyMembers: number;
}): EmailTemplate {
  const { firstName, briefingsSent, eventsTracked, familyMembers } = opts;

  const briefingLine =
    briefingsSent > 0
      ? `${briefingsSent} morning ${briefingsSent === 1 ? "briefing" : "briefings"} landed before your day got going this week.`
      : "Your briefings are warming up — once your calendar's connected, they land every morning.";

  const eventLine =
    eventsTracked > 0
      ? `I kept ${eventsTracked} ${eventsTracked === 1 ? "event" : "events"} in view across the week — appointments, activities, and the small things that are easy to lose track of.`
      : "As your calendar fills in, I'll track every event so nothing slips.";

  return buildEmail({
    subject: "Your week with Kin",
    preheader: "A look back at your week — and what Kin's been learning.",
    heading: "Your week with Kin",
    stats: [
      { value: briefingsSent, label: briefingsSent === 1 ? "briefing" : "briefings" },
      { value: eventsTracked, label: eventsTracked === 1 ? "event" : "events" },
      { value: familyMembers, label: familyMembers === 1 ? "person" : "people" },
    ],
    paragraphs: [
      `${greeting(firstName)} here's how your week with Kin went.`,
      briefingLine,
      eventLine,
      "Every week, your household's picture in my head gets a little clearer — the routines, the rhythms, the things that matter to your family. That's what makes next week's briefings sharper than this week's.",
      "See you tomorrow morning,<br>Kin",
    ],
  });
}

/**
 * Payment confirmation — triggered by the Stripe webhook on first successful
 * payment. Reassures that nothing about the experience changes.
 */
export function paymentConfirmationEmail(firstName?: string | null): EmailTemplate {
  return buildEmail({
    subject: "You're all set",
    preheader: "Your Kin subscription is active — nothing else to do.",
    heading: "You're all set",
    paragraphs: [
      `${greeting(firstName)} your subscription is active — thank you for keeping Kin in your family's corner.`,
      "Here's the best part: nothing changes. Same morning briefings, same number, same Kin. It just keeps going, every day, the way it has been.",
      "You can manage your subscription anytime from your dashboard. And as always — I'm one text away whenever you need me.",
      "Onward,<br>Kin",
    ],
    cta: { label: "View your dashboard", url: BILLING_URL },
  });
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
  return buildEmail({
    subject: `${inviterName} invited you to Kin`,
    preheader: `${inviterName} invited you to join their household on Kin.`,
    heading: `${inviterName} invited you to Kin`,
    paragraphs: [
      `${inviterName} is using Kin to keep your family coordinated and wants you on board too.`,
      "Kin is an AI that texts each parent a short morning briefing — both calendars in one place, conflicts flagged, pickup and drop-off sorted. Joining links you into the same household, so you both see a shared family view.",
      `Tap below to join ${familyLabel}. It takes about two minutes to set up.`,
    ],
    cta: { label: "Join your household", url: inviteUrl },
    footnote:
      "This invite link expires in 7 days. If you weren't expecting this, you can ignore this email.",
  });
}
