/**
 * POST /api/account/onboarding-complete
 *
 * Fire-and-forget endpoint the client hits once web onboarding finishes
 * (profile created, name + household details collected). It does two things:
 *
 *  1. Sends the user their first SMS from Kin — a warm, conversational welcome,
 *     not a transactional notice. Gated on profiles.welcome_sms_sent_at so it
 *     never double-texts.
 *  2. Fires the partner invite if a partner phone was captured earlier
 *     (profiles.partner_phone_pending) and the user isn't already in a
 *     household — the reliable trigger for web-onboarded users, who never pass
 *     through the SMS onboarding bot where this otherwise fires.
 *
 * Always returns 200 — the client must never block on this.
 */

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/twilio";
import { dispatchPartnerInvite } from "@/lib/partner-invite";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/csrf";

/** Mask all but the last 4 digits — preserves "did you mean this number?" UX
 *  without leaking the full phone to the client. P1-P4 (audit v7). */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "•••••••";
  const last4 = digits.slice(-4);
  return `••• ••• ${last4}`;
}

interface ProfileRow {
  family_name: string | null;
  phone_number: string | null;
  household_id: string | null;
  partner_phone_pending: string | null;
  welcome_sms_sent_at: string | null;
  sms_opted_out_at: string | null;
}

export async function POST(request: Request) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(user.id, "onboarding-complete");
    if (!rl.allowed) return rateLimitResponse(rl);

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("family_name, phone_number, household_id, partner_phone_pending, welcome_sms_sent_at, sms_opted_out_at")
      .eq("id", user.id)
      .single<ProfileRow>();

    if (!profile) {
      return NextResponse.json({ ok: false });
    }

    let welcomeSmsSent = false;
    // P2-A3 (audit v6): surface "welcome SMS failed" to the client so
    // /onboarding/done can show a copy variant instead of always "All set".
    let welcomeSmsFailed = false;
    let partnerInvited = false;

    // ── 1. Welcome SMS ────────────────────────────────────────────────────────
    // Skip if the user already texted STOP — sending after opt-out would be a
    // TCPA violation and Twilio would block it anyway.
    if (profile.phone_number && !profile.welcome_sms_sent_at && !profile.sms_opted_out_at) {
      const firstName = profile.family_name?.trim().split(/\s+/)[0] || "there";
      const message =
        `Hey ${firstName}! This is Kin. I'll be sending you a morning briefing to ` +
        `help coordinate your family's day. Your first one arrives tomorrow at 6am. ` +
        `If you ever need anything, just text me back. Reply STOP to opt out.`;

      // Claim the welcome-SMS slot BEFORE sending (audit V7 P2-S5):
      // conditional UPDATE returning the id means the SMS-onboarding race
      // can't double-send when both paths reach the gate within the same
      // tick. We rollback the timestamp on send failure so a retry can try
      // again rather than getting silently latched.
      const claimedAt = new Date().toISOString();
      const { data: claimed } = await admin
        .from("profiles")
        .update({ welcome_sms_sent_at: claimedAt })
        .eq("id", user.id)
        .is("welcome_sms_sent_at", null)
        .select("id");
      const wonClaim = !!(claimed && claimed.length > 0);
      if (!wonClaim) {
        // The other path already sent — nothing more to do here.
        welcomeSmsSent = true;
      }
      try {
        if (wonClaim) {
          await sendSms(profile.phone_number, message);
          await admin.from("sms_conversations").insert({
            profile_id: user.id,
            direction: "outbound",
            body: message,
            from_number: process.env.TWILIO_PHONE_NUMBER ?? "",
            to_number: profile.phone_number,
          });
          welcomeSmsSent = true;
        }
      } catch (err) {
        // Release the claim so a retry can pick it up.
        if (wonClaim) {
          await admin
            .from("profiles")
            .update({ welcome_sms_sent_at: null })
            .eq("id", user.id)
            .eq("welcome_sms_sent_at", claimedAt);
        }
        console.error("Welcome SMS failed:", err);
        Sentry.captureException(err);
        welcomeSmsFailed = true;
        await admin.from("sms_conversations").insert({
          profile_id: user.id,
          direction: "outbound_failed",
          body: message,
          from_number: process.env.TWILIO_PHONE_NUMBER ?? "",
          to_number: profile.phone_number,
        });
      }
    }

    // ── 2. Partner invite (phone channel) ─────────────────────────────────────
    // Only the primary parent invites — a profile already linked into a
    // household (household_id set) is the partner and must not re-invite.
    //
    // P1-P4 (audit v7): we return the masked partner phone to the client so
    // the /onboarding/done page can show "We texted *** *** -1234" without
    // ever storing the full phone in sessionStorage (where any same-origin
    // script could read it). The masking confirms the user typed the right
    // number without leaking the digits.
    let partnerPhoneMasked: string | null = null;
    if (profile.partner_phone_pending && !profile.household_id) {
      try {
        await dispatchPartnerInvite({
          db: admin,
          inviterProfileId: user.id,
          inviterFamilyName: profile.family_name,
          partnerPhone: profile.partner_phone_pending,
        });
        partnerInvited = true;
        partnerPhoneMasked = maskPhone(profile.partner_phone_pending);
      } catch (err) {
        console.error("Partner invite dispatch failed:", err);
      }
      // Clear regardless so the invite isn't re-sent on a later call.
      await admin
        .from("profiles")
        .update({ partner_phone_pending: null })
        .eq("id", user.id);
    }

    return NextResponse.json({
      ok: true,
      welcomeSmsSent,
      welcomeSmsFailed,
      partnerInvited,
      partnerPhone: partnerPhoneMasked,
    });
  } catch (err) {
    // Non-fatal for the user — never block onboarding completion. But the
    // outer catch must still report to Sentry, otherwise welcome-SMS failures
    // and partner-invite dispatch errors are invisible in production.
    Sentry.captureException(err);
    return NextResponse.json({ ok: false });
  }
}
