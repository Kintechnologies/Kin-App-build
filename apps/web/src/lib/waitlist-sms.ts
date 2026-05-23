/**
 * Phone-first waitlist over SMS.
 *
 * kinai.family's waitlist collects only a phone number. The marketing API
 * (apps/marketing /api/waitlist) saves the row and texts a confirmation SMS
 * asking for the texter's name + email. This module handles their reply on
 * the inbound webhook:
 *
 *   - findPendingWaitlistReply — is this number a waitlist signup still
 *                                missing its email? Phone-first rows insert
 *                                with email NULL.
 *   - parseWaitlistReply       — pull a name + email out of a free-text SMS.
 *   - handleWaitlistReply      — fill in the row and return the TwiML reply.
 *
 * Waitlist signups have no `profiles` row, so nothing here touches
 * sms_conversations — its profile_id FK would reject them.
 */

import type { createAdminClient } from "@/lib/supabase/admin";
import { twimlReply } from "@/lib/twilio";
import { normalizePhone } from "@/lib/sms-access";
import * as Sentry from "@sentry/nextjs";

type AdminClient = ReturnType<typeof createAdminClient>;

interface PendingWaitlistRow {
  id: string;
  name: string | null;
}

// Loose match to locate an email anywhere in free text; stops at whitespace
// and the punctuation people commonly trail an email with.
const EMAIL_LOOSE = /[^\s@,;:]+@[^\s@,;:]+\.[^\s@,;:]+/;
// Strict full-string check, mirroring the waitlist_email_format DB constraint.
const EMAIL_STRICT = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Is this number a waitlist signup still waiting to give us their email?
 * Phone-first rows insert with email NULL; once the texter replies the email
 * is set, so a completed signup returns null here and falls through to the
 * inbound webhook's normal handling.
 *
 * Opted-out rows (sms_opted_out_at set) are excluded — TCPA forbids texting
 * a number that replied STOP, so we never send them the waitlist reply.
 */
export async function findPendingWaitlistReply(
  supabase: AdminClient,
  phone: string
): Promise<PendingWaitlistRow | null> {
  // Defensive read-site normalization (audit V7 P2-S4): writers already
  // normalize, but normalizing on read too prevents a class of bugs the day
  // a new caller passes a digits-only or human-typed number.
  const normalized = normalizePhone(phone) ?? phone;
  const { data } = await supabase
    .from("waitlist")
    .select("id, name")
    .eq("phone", normalized)
    .is("email", null)
    .is("sms_opted_out_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<PendingWaitlistRow>();
  return data ?? null;
}

/**
 * Pull a name + email out of a free-text waitlist reply. Handles plain
 * "Jane Doe, jane@email.com" as well as chattier "my name is Jane and my
 * email is jane@email.com". Either field may come back null.
 */
export function parseWaitlistReply(body: string): {
  name: string | null;
  email: string | null;
} {
  const emailMatch = body.match(EMAIL_LOOSE);
  let email: string | null = null;
  if (emailMatch) {
    const candidate = emailMatch[0].toLowerCase().replace(/[.,;:]+$/, "");
    if (EMAIL_STRICT.test(candidate)) email = candidate;
  }

  let name = emailMatch ? body.replace(emailMatch[0], " ") : body;
  name = name
    // Strip common connective filler so only the name itself is left.
    .replace(
      /\b(my name is|name's|name is|names|i am|i'm|im|this is|it is|it's|its|email is|e-?mail|and|name)\b/gi,
      " "
    )
    // Keep letters (incl. Latin-1 accents), spaces, apostrophes, hyphens —
    // drops digits and punctuation.
    .replace(/[^a-zA-ZÀ-ÿ\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { name: name ? name.slice(0, 100) : null, email };
}

/**
 * Apply a waitlist reply to its row and return the SMS reply to send back.
 * Called only for numbers findPendingWaitlistReply matched.
 */
export async function handleWaitlistReply(
  supabase: AdminClient,
  row: PendingWaitlistRow,
  body: string
): Promise<Response> {
  const { name, email } = parseWaitlistReply(body);

  // No usable email — re-prompt rather than half-completing the row.
  // Every waitlist SMS carries opt-out instructions (TCPA / A2P 10DLC).
  if (!email) {
    return twimlReply(
      "Almost there! Reply with your name and email so we can keep you posted — " +
        "like: Jane Doe, jane@email.com. Reply STOP to opt out."
    );
  }

  const update: { email: string; name?: string } = { email };
  if (name) update.name = name;

  let { error } = await supabase
    .from("waitlist")
    .update(update)
    .eq("id", row.id);

  // Another waitlist row already claimed this email (unique constraint). Keep
  // the name so the signup still completes; the email simply isn't re-stored.
  if (error?.code === "23505" && name) {
    ({ error } = await supabase
      .from("waitlist")
      .update({ name })
      .eq("id", row.id));
  }

  if (error) {
    Sentry.captureException(error);
    return twimlReply(
      "Got it — thanks! You're on the Kin waitlist. " +
        "We'll text you when it's your turn. Reply STOP to opt out."
    );
  }

  const firstName = name ? name.split(" ")[0] : null;
  return twimlReply(
    firstName
      ? `Thanks ${firstName}! You're on the Kin waitlist. ` +
          "We'll text you when it's your turn. Reply STOP to opt out."
      : "Thanks! You're on the Kin waitlist. " +
          "We'll text you when it's your turn. Reply STOP to opt out."
  );
}
