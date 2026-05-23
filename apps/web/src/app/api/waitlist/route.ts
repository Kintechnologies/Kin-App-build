import * as Sentry from "@sentry/nextjs";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { sendSms } from "@/lib/twilio";

// The exact opt-in copy shown beneath every waitlist form. Snapshotted
// onto each row (sms_consent_text) so we can replay it verbatim during a
// carrier A2P/10DLC audit. Must stay in sync with <WaitlistForm>.
const SMS_CONSENT_TEXT =
  "By submitting, you agree to receive SMS messages from Kin. Msg & data rates may apply.";

// The confirmation SMS sent the moment a number joins the waitlist. It asks
// for the name + email that the inbound webhook (apps/web /api/sms/inbound)
// parses out of the reply and writes back onto the row.
//
// TCPA / A2P 10DLC: as the first message to this number it must name the
// sender (Kin), state what they signed up for (the waitlist), and carry
// opt-out instructions. Every later waitlist SMS repeats "Reply STOP".
const CONFIRMATION_SMS =
  "Hey! This is Kin — thanks for joining our waitlist! 🤙 " +
  "What's your name and email so we can keep you in the loop? " +
  "Just reply here. Reply STOP to opt out.";

// Identifies where the SMS opt-in was captured (waitlist.sms_consent_source).
const SMS_CONSENT_SOURCE = "website_waitlist_form";

// Rate limiter: 3 submissions per IP per hour.
// Gracefully disabled when UPSTASH env vars are absent (dev/CI).
let ratelimit: Ratelimit | null = null;
function getRatelimit(): Ratelimit | null {
  if (ratelimit) return ratelimit;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(3, "1 h"),
    prefix: "rl:waitlist",
  });
  return ratelimit;
}

// Normalize a user-typed phone number to E.164. Restricted to US/Canada
// (+1) for the beta — the 10DLC campaign and per-segment cost math both
// assume +1, and any other country code would either fail delivery via
// Twilio's brand registration or get billed at a multiple of the US rate.
// (audit v3 P1-E3) Returns null if the input can't be made valid +1.
function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");

  let e164: string;
  if (trimmed.startsWith("+1") && digits.length === 11) {
    e164 = "+" + digits;
  } else if (digits.length === 10) {
    e164 = "+1" + digits;
  } else if (digits.length === 11 && digits.startsWith("1")) {
    e164 = "+" + digits;
  } else {
    return null;
  }

  return /^\+1\d{10}$/.test(e164) ? e164 : null;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP — public endpoint, no user auth.
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const limiter = getRatelimit();
    if (limiter) {
      const { success, reset } = await limiter.limit(ip);
      if (!success) {
        const retryAfter = Math.ceil((reset - Date.now()) / 1000);
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          {
            status: 429,
            headers: { "Retry-After": String(Math.max(retryAfter, 1)) },
          }
        );
      }
    }

    const { phone } = await req.json();

    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: "Please enter a valid phone number" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      Sentry.captureMessage("Supabase env vars not configured in marketing app");
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // Store the number and the consent record. Submitting this form — which
    // always shows SMS_CONSENT_TEXT — IS the TCPA opt-in, so we snapshot the
    // verbatim copy, the timestamp, and the source onto the row.
    const { error } = await supabase.from("waitlist").insert({
      phone: normalizedPhone,
      sms_consent: true,
      sms_consent_at: new Date().toISOString(),
      sms_consent_text: SMS_CONSENT_TEXT,
      sms_consent_source: SMS_CONSENT_SOURCE,
    });

    if (error) {
      // Duplicate phone — treat as success. Don't re-send the confirmation.
      // Response shape is identical to a fresh signup so enumeration via
      // differential response bodies is closed (audit V7 P2-A1).
      if (error.code === "23505") {
        return NextResponse.json({ success: true });
      }
      Sentry.captureException(error);
      return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 });
    }

    // Text the confirmation that asks for their name + email. A delivery
    // failure must not fail the signup — the number is already saved — so we
    // log it and still return success.
    try {
      await sendSms(normalizedPhone, CONFIRMATION_SMS);
    } catch (smsErr) {
      Sentry.captureException(smsErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
