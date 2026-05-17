/**
 * SMS access gating — approved-numbers allowlist + SMS waitlist.
 *
 * Kin's SMS beta is invite-only. The inbound webhook calls isNumberApproved
 * before minting a profile for a brand-new number:
 *   - approved   → the number falls through to the full onboarding flow
 *   - unapproved → recordWaitlistContact saves the number to sms_waitlist and
 *                  the caller replies with WAITLIST_MESSAGE
 *
 * An admin promotes a number with approveNumber (see /api/admin/sms/approve),
 * after which the texter can come back and onboard normally.
 *
 * Both tables are service-role only (RLS denies all direct access); every
 * caller here uses the admin client.
 */

import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

/** The warm reply an unapproved number receives. */
export const WAITLIST_MESSAGE =
  "Hey! Kin isn't open to everyone yet, but you're on the list. " +
  "We'll text you when it's your turn. 💛";

/** The SMS sent to a number the moment an admin approves it — this is the
 * "we'll text you when it's your turn" promise from WAITLIST_MESSAGE coming due. */
export const APPROVED_MESSAGE =
  "Good news — it's your turn! Kin's ready for you. 💛 " +
  "Text me anything to get started.";

/**
 * Normalize a phone number to E.164 (a leading + and digits only), or null if
 * it can't be. Twilio always hands the inbound webhook an E.164 `From`, so the
 * webhook never needs this — it exists so the admin approve endpoint can accept
 * looser human input like "(415) 555-0117" and still match stored numbers.
 */
export function normalizePhone(raw: string): string | null {
  const trimmed = (raw ?? "").trim();
  if (/^\+[1-9]\d{7,14}$/.test(trimmed)) return trimmed;

  const digits = trimmed.replace(/[^\d]/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

/** Is this number on the approved-numbers allowlist? */
export async function isNumberApproved(
  supabase: AdminClient,
  phoneNumber: string
): Promise<boolean> {
  const { data } = await supabase
    .from("sms_approved_numbers")
    .select("phone_number")
    .eq("phone_number", phoneNumber)
    .maybeSingle();
  return !!data;
}

/**
 * Record that an unapproved number texted Kin. First contact inserts a
 * sms_waitlist row; later texts bump message_count and last_texted_at. Swallows
 * its own errors — a waitlist write must never block the warm reply.
 */
export async function recordWaitlistContact(
  supabase: AdminClient,
  phoneNumber: string,
  messageBody: string
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from("sms_waitlist")
      .select("id, message_count")
      .eq("phone_number", phoneNumber)
      .maybeSingle<{ id: string; message_count: number }>();

    if (existing) {
      await supabase
        .from("sms_waitlist")
        .update({
          message_count: (existing.message_count ?? 1) + 1,
          last_texted_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("sms_waitlist").insert({
        phone_number: phoneNumber,
        first_message: messageBody.slice(0, 500),
      });
    }
  } catch (err) {
    console.error("recordWaitlistContact failed:", err);
  }
}

/**
 * Promote a number to the approved allowlist. Idempotent — re-approving an
 * already-approved number is a no-op upsert. Also stamps the matching
 * sms_waitlist row (if any) with approved_at so the admin list shows it cleared.
 */
export async function approveNumber(
  supabase: AdminClient,
  phoneNumber: string,
  opts?: { approvedBy?: string | null; note?: string | null }
): Promise<void> {
  await supabase.from("sms_approved_numbers").upsert(
    {
      phone_number: phoneNumber,
      approved_by: opts?.approvedBy ?? null,
      note: opts?.note ?? null,
    },
    { onConflict: "phone_number" }
  );

  await supabase
    .from("sms_waitlist")
    .update({ approved_at: new Date().toISOString() })
    .eq("phone_number", phoneNumber)
    .is("approved_at", null);
}
