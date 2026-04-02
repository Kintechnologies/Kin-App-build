import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/api-auth";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/invite/[code]/accept
 * Auth required. Marks the invite as accepted and links the two profiles.
 *
 * After this call:
 *   - household_invites row: accepted=true, accepted_by_profile_id=partner.id
 *   - partner profile: household_id = inviter profile id
 *
 * Returns: { success: true }
 */
export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = params;
    if (!code) {
      return NextResponse.json({ error: "Invite code required" }, { status: 400 });
    }

    // Use admin client to read invite and update profiles (bypasses per-user RLS)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: "Server not fully configured — contact support" },
        { status: 503 }
      );
    }

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminClient = createAdminClient();

    // Fetch the invite
    const { data: invite, error: fetchErr } = await adminClient
      .from("household_invites")
      .select("id, inviter_profile_id, invitee_email, accepted, expires_at")
      .eq("invite_code", code)
      .maybeSingle();

    if (fetchErr || !invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    // Guard: already accepted
    if (invite.accepted) {
      return NextResponse.json({ error: "Invite already used" }, { status: 409 });
    }

    // Guard: expired
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
    }

    // Guard: inviter cannot accept their own invite
    if (invite.inviter_profile_id === user.id) {
      return NextResponse.json({ error: "You cannot accept your own invite" }, { status: 400 });
    }

    // Guard: only the intended recipient can accept this invite (prevents leaked-code abuse)
    if (user.email?.toLowerCase() !== invite.invitee_email.toLowerCase()) {
      return NextResponse.json(
        { error: "This invite was not sent to your email address" },
        { status: 403 }
      );
    }

    // Guard: partner is already in a household
    const { data: partnerProfile } = await adminClient
      .from("profiles")
      .select("household_id")
      .eq("id", user.id)
      .single();

    if (partnerProfile?.household_id) {
      return NextResponse.json(
        { error: "You are already part of a household — contact support to merge" },
        { status: 409 }
      );
    }

    // ── Link profiles ───────────────────────────────────────────────────────
    // Partner's household_id → inviter's profile id
    const { error: profileErr } = await adminClient
      .from("profiles")
      .update({ household_id: invite.inviter_profile_id })
      .eq("id", user.id);

    if (profileErr) {
      return NextResponse.json({ error: "Failed to link household" }, { status: 500 });
    }

    // ── Mark invite as accepted ─────────────────────────────────────────────
    const { error: acceptErr } = await adminClient
      .from("household_invites")
      .update({
        accepted: true,
        accepted_by_profile_id: user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invite.id);

    if (acceptErr) {
      // Non-fatal: household is already linked. Log in dev only.
      if (process.env.NODE_ENV !== "production") {
        console.log(`[invite] Failed to mark invite ${invite.id} as accepted:`, acceptErr.message);
      }
      // TODO: route to Sentry before GA
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to accept invite" }, { status: 500 });
  }
}
