import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/api-auth";
import { createClient } from "@/lib/supabase/server";
import { dispatchPartnerInvite } from "@/lib/partner-invite";
import * as Sentry from "@sentry/nextjs";

/**
 * POST /api/invite
 * Creates (or reuses) a household invite for the authenticated user's partner
 * and delivers it over SMS, email, or both — whichever contact details are
 * supplied.
 *
 * Body: { partnerEmail?: string, partnerPhone?: string } — at least one.
 *
 * The invite is a row in `household_invites` with a unique code (expires 7
 * days). The partner follows /join/invite/<code> to onboard into this
 * household. See lib/partner-invite.ts for delivery.
 *
 * Returns: { success: true, inviteCode: string }
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      partnerEmail?: string;
      partnerPhone?: string;
    };

    const partnerEmail = body.partnerEmail?.trim().toLowerCase() || null;
    const partnerPhone = normalizePhone(body.partnerPhone);

    if (!partnerEmail && !partnerPhone) {
      return NextResponse.json(
        { error: "A partner email or phone number is required" },
        { status: 400 }
      );
    }

    if (partnerEmail && !partnerEmail.includes("@")) {
      return NextResponse.json({ error: "Valid partner email required" }, { status: 400 });
    }

    if (body.partnerPhone && body.partnerPhone.trim() && !partnerPhone) {
      return NextResponse.json({ error: "Valid partner phone number required" }, { status: 400 });
    }

    // Prevent inviting yourself
    if (partnerEmail && partnerEmail === user.email?.toLowerCase()) {
      return NextResponse.json({ error: "You cannot invite yourself" }, { status: 400 });
    }

    const supabase = createClient();

    // Look up the inviter's family name (for the invite copy) and household state
    const { data: profile } = await supabase
      .from("profiles")
      .select("family_name, household_id")
      .eq("id", user.id)
      .single();

    // Guard: a profile already linked into a household can't invite a partner
    if (profile?.household_id) {
      return NextResponse.json(
        { error: "You are already in a shared household" },
        { status: 409 }
      );
    }

    // Prefer the admin client so partner-invite SMS logging (sms_conversations,
    // a service-role-only table) succeeds. Falls back to the request-scoped
    // client when the service role key isn't configured (local dev).
    let db = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      db = createAdminClient();
    }

    const result = await dispatchPartnerInvite({
      db,
      inviterProfileId: user.id,
      inviterFamilyName: profile?.family_name ?? null,
      partnerEmail,
      partnerPhone,
    });

    return NextResponse.json({ success: true, inviteCode: result.inviteCode });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 });
  }
}

/**
 * Normalize a US phone number to E.164. Returns null when the input is missing
 * or doesn't look like a 10/11-digit US number.
 */
function normalizePhone(raw: string | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}
