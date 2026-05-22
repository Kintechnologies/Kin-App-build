/**
 * Shared partner-invite dispatch.
 *
 * One household invite, two delivery channels. Whatever triggers the invite —
 * the web invite form, the phone field in onboarding, or the SMS onboarding
 * bot — ends up here so the partner always gets a real /join/invite/<code>
 * link rather than a bare "sign up at kinai.family" (which would create a
 * separate, unlinked household).
 *
 * SMS is the primary channel; email is a backup sent when an address is known.
 * Both are best-effort: a send failure is logged, never thrown, and the invite
 * row (with its working code) is created regardless.
 */

import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendSms } from "@/lib/twilio";
import { sendEmail, partnerInviteEmail } from "@/lib/email";
import { normalizePhone } from "@/lib/sms-access";

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://kinai.family";
}

export interface DispatchPartnerInviteInput {
  /** Supabase client — admin client preferred so sms_conversations logging works. */
  db: SupabaseClient;
  inviterProfileId: string;
  inviterFamilyName: string | null;
  partnerEmail?: string | null;
  partnerPhone?: string | null;
}

export interface DispatchPartnerInviteResult {
  inviteCode: string;
  inviteUrl: string;
  smsSent: boolean;
  emailSent: boolean;
}

export async function dispatchPartnerInvite(
  input: DispatchPartnerInviteInput
): Promise<DispatchPartnerInviteResult> {
  const { db, inviterProfileId, inviterFamilyName } = input;
  const partnerEmail = input.partnerEmail?.trim().toLowerCase() || null;
  const partnerPhone = input.partnerPhone?.trim() || null;

  // Reuse an existing pending invite from this inviter so the email channel and
  // the phone channel resolve to one stable link, and a re-triggered invite
  // doesn't mint a fresh code every time.
  const { data: existing } = await db
    .from("household_invites")
    .select("invite_code, invitee_email, invitee_phone")
    .eq("inviter_profile_id", inviterProfileId)
    .eq("accepted", false)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let inviteCode = existing?.invite_code ?? null;

  if (!inviteCode) {
    inviteCode = randomBytes(8).toString("hex");
    const { error: insertErr } = await db.from("household_invites").insert({
      inviter_profile_id: inviterProfileId,
      invitee_email: partnerEmail,
      invitee_phone: partnerPhone,
      invite_code: inviteCode,
    });
    if (insertErr) {
      // Migration 075 (v6 P1-S1) added a partial unique index on
      // (inviter_profile_id, invitee_phone) WHERE accepted = false. Two
      // racing dispatch calls collide here — the loser sees Postgres 23505
      // and re-reads the row the winner inserted so both code paths end up
      // with the same invite_code instead of minting two SMS with two
      // different links.
      if ((insertErr as { code?: string }).code === "23505") {
        const { data: retry } = await db
          .from("household_invites")
          .select("invite_code")
          .eq("inviter_profile_id", inviterProfileId)
          .eq("accepted", false)
          .gte("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle<{ invite_code: string }>();
        if (retry?.invite_code) {
          inviteCode = retry.invite_code;
        } else {
          throw new Error(
            `household_invites insert failed (23505 but no row to recover): ${insertErr.message}`
          );
        }
      } else {
        // Without a persisted row the /join/invite/<code> link is dead — fail
        // loudly rather than texting the partner a link that 404s.
        throw new Error(`household_invites insert failed: ${insertErr.message}`);
      }
    }
  } else {
    // Backfill a channel the original row was missing — e.g. the invite began
    // phone-only and we now also have an email address.
    // P2-S1 (audit v6): cheap shape check on backfilled email — the SMS
    // onboarding bot can pass any string here (free-text replies are
    // common), and persisting "not now" or "no thanks" as invitee_email
    // poisons the row and confuses the email-send path downstream.
    const looksLikeEmail = (s: string): boolean =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
    const patch: Record<string, string> = {};
    if (
      partnerEmail &&
      !existing?.invitee_email &&
      looksLikeEmail(partnerEmail)
    ) {
      patch.invitee_email = partnerEmail;
    }
    if (partnerPhone && !existing?.invitee_phone) patch.invitee_phone = partnerPhone;
    if (Object.keys(patch).length > 0) {
      await db.from("household_invites").update(patch).eq("invite_code", inviteCode);
    }
  }

  const inviteUrl = `${appUrl()}/join/invite/${inviteCode}`;
  const inviterFirstName = inviterFamilyName?.split(" ")[0] || "Your partner";
  const familyLabel = inviterFamilyName
    ? `the ${inviterFamilyName} household`
    : "their Kin household";

  let smsSent = false;
  let emailSent = false;

  if (partnerPhone) {
    smsSent = await sendInviteSms(db, inviterProfileId, partnerPhone, inviterFirstName, inviteUrl);
  }

  if (partnerEmail) {
    try {
      const tpl = partnerInviteEmail({ inviterName: inviterFirstName, familyLabel, inviteUrl });
      emailSent = await sendEmail({ to: partnerEmail, ...tpl });
    } catch (err) {
      console.error("Partner invite email failed:", err);
    }
  }

  return { inviteCode, inviteUrl, smsSent, emailSent };
}

async function sendInviteSms(
  db: SupabaseClient,
  inviterProfileId: string,
  partnerPhone: string,
  inviterFirstName: string,
  inviteUrl: string
): Promise<boolean> {
  const body = `${inviterFirstName} set up Kin — a daily 6am briefing that keeps your family's schedule coordinated. Join their household to share calendars: ${inviteUrl}`;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER ?? "";

  // Honor opt-out: if the partner's phone is on a profile that texted STOP,
  // skip silently. Twilio also blocks it (error 21610), but checking first
  // avoids an outbound API call and a misleading "outbound_failed" log row.
  //
  // V6 P1-S2: profiles.phone_number is stored in E.164 ("+11234567890"), but
  // callers can hand us looser formats like "(123) 456-7890". Without
  // normalizePhone here the lookup misses the opt-out and we'd text someone
  // who texted STOP. extractPhone in sms-onboarding was fixed in V5 P1-S3 but
  // this lookup path was not.
  const normalizedPhone = normalizePhone(partnerPhone) ?? partnerPhone;
  const { data: optedOutProfile } = await db
    .from("profiles")
    .select("sms_opted_out_at")
    .eq("phone_number", normalizedPhone)
    .not("sms_opted_out_at", "is", null)
    .maybeSingle();
  if (optedOutProfile) {
    console.warn(`Partner invite SMS skipped — recipient opted out: ${normalizedPhone}`);
    return false;
  }

  try {
    await sendSms(partnerPhone, body);
    await logSms(db, inviterProfileId, "outbound", body, fromNumber, partnerPhone);
    return true;
  } catch (err: unknown) {
    // Error 21610 = recipient opted out — expected, not worth a stack trace.
    const optedOut = String((err as { message?: string })?.message ?? "").includes("21610");
    if (!optedOut) console.error("Partner invite SMS failed:", err);
    await logSms(db, inviterProfileId, "outbound_failed", body, fromNumber, partnerPhone);
    return false;
  }
}

async function logSms(
  db: SupabaseClient,
  profileId: string,
  direction: "outbound" | "outbound_failed",
  body: string,
  fromNumber: string,
  toNumber: string
): Promise<void> {
  try {
    await db.from("sms_conversations").insert({
      profile_id: profileId,
      direction,
      body,
      from_number: fromNumber,
      to_number: toNumber,
    });
  } catch {
    // Logging is non-essential — never let it break the invite.
  }
}
