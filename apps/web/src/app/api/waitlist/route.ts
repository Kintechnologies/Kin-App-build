import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-log";
import * as Sentry from "@sentry/nextjs";

/**
 * POST /api/waitlist
 * Public endpoint — no auth required.
 * Stores a row in the `waitlist` table.
 *
 * Body: {
 *   email:           string;       // required
 *   phone?:          string;       // optional — if present, normalized to E.164
 *   smsConsent?:     boolean;      // optional — opt-in to SMS coordination
 *   smsConsentText?: string;       // exact opt-in copy shown to the user
 *   firstName?:      string;       // optional (collected by expanded form)
 *   lastName?:       string;       // optional
 *   situation?:      'co-parent' | 'dual-parent' | 'caregiver' | 'other';
 *   source?:         string;       // defaults to 'landing_page'
 * }
 *
 * Note on Twilio A2P/10DLC: SMS consent must NOT be a required condition
 * for joining the waitlist (carrier rule 30923). Phone + consent are
 * stored when provided but the submission succeeds without them.
 *
 * Responses:
 *   201 { success: true }                       — newly added
 *   200 { success: true, existing: true }       — email already on the list
 *   400 { error: string }                       — invalid input
 *   503 { error: string }                       — service unavailable (env missing)
 *   500 { error: string }                       — unexpected error
 *
 * ──────────────────────────────────────────────────────────────────────────
 * How to see who has signed up
 * ──────────────────────────────────────────────────────────────────────────
 * REST (service role key — never expose to browser):
 *
 *   curl -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
 *        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
 *        "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/waitlist?select=*&order=created_at.desc"
 *
 * Supabase Studio (https://supabase.com/dashboard/project/coxqdpcffmsncvisfyvj):
 *
 *   SELECT email, phone, first_name, last_name, situation, sms_consent, created_at
 *   FROM waitlist
 *   ORDER BY created_at DESC;
 */

const VALID_SITUATIONS = ["co-parent", "dual-parent", "caregiver", "other"] as const;
type Situation = (typeof VALID_SITUATIONS)[number];

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

// Normalize a user-entered phone number into something close to E.164.
// Strips formatting, keeps a leading "+" if the user typed one, and
// assumes US (+1) when no country code is present so we have a complete
// number for downstream A2P sending. Returns null if the digit count
// doesn't fit a plausible international range.
function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  if (hasPlus) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      phone?: string;
      smsConsent?: boolean;
      smsConsentText?: string;
      firstName?: string;
      lastName?: string;
      situation?: string;
      source?: string;
    };

    const email = body.email?.trim().toLowerCase();
    const source = body.source?.trim() || "landing_page";
    const firstName = clean(body.firstName, 100);
    const lastName = clean(body.lastName, 100);
    const phone = body.phone ? normalizePhone(body.phone) : null;
    const smsConsent = body.smsConsent === true;
    const smsConsentText = clean(body.smsConsentText, 1000);
    const situationRaw = body.situation?.trim().toLowerCase();
    const situation: Situation | null =
      situationRaw && (VALID_SITUATIONS as readonly string[]).includes(situationRaw)
        ? (situationRaw as Situation)
        : null;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (!email.includes("@") || !email.includes(".")) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }
    if (body.phone && body.phone.trim() && !phone) {
      return NextResponse.json(
        { error: "Please enter a valid mobile phone number, or leave it blank" },
        { status: 400 }
      );
    }
    if (situationRaw && !situation) {
      return NextResponse.json(
        { error: "Please pick one of the listed situations" },
        { status: 400 }
      );
    }

    let supabase;
    try {
      supabase = createAdminClient();
    } catch {
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 }
      );
    }

    const { error } = await supabase.from("waitlist").insert({
      email,
      phone,
      source,
      first_name: firstName,
      last_name: lastName,
      situation,
      sms_consent: smsConsent,
      sms_consent_at: smsConsent ? new Date().toISOString() : null,
      sms_consent_text: smsConsent ? smsConsentText : null,
    });

    if (error) {
      if (error.code === "23505") {
        await logActivity({
          eventType: "waitlist_existing",
          email,
          metadata: { source },
        });
        return NextResponse.json({ success: true, existing: true }, { status: 200 });
      }
      Sentry.captureException(error);
      return NextResponse.json({ error: "Could not save your email" }, { status: 500 });
    }

    await logActivity({
      eventType: "waitlist_join",
      email,
      metadata: { source },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
