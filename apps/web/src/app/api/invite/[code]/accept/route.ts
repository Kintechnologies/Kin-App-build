import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/api-auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import * as Sentry from "@sentry/nextjs";

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

    // Rate limit code submissions per user — defeats brute-force enumeration
    // of short invite codes by an authenticated attacker.
    const rl = await checkRateLimit(user.id, "invite-accept");
    if (!rl.allowed) return rateLimitResponse(rl);

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

    // Guard: for email invites, only the intended recipient can accept (prevents
    // leaked-code abuse). Phone invites carry no email — the code itself is
    // delivered privately by SMS, so code possession is the proof of intent.
    // Use a generic "not found" response so an authenticated attacker can't
    // enumerate which email address a known code was originally sent to. (v6 P1-A2)
    if (
      invite.invitee_email &&
      user.email?.toLowerCase() !== invite.invitee_email.toLowerCase()
    ) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
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

    // ── Atomic claim ────────────────────────────────────────────────────────
    // Mark the invite accepted FIRST with a conditional UPDATE — only succeeds
    // when accepted is still false. This serializes two authenticated users
    // racing the same code through their respective rate-limit windows: only
    // one UPDATE returns a row, the other sees an empty result and bails out
    // before any household_id is written.
    const { data: claimedRows, error: claimErr } = await adminClient
      .from("household_invites")
      .update({
        accepted: true,
        accepted_by_profile_id: user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invite.id)
      .eq("accepted", false)
      .select("id");

    if (claimErr) {
      Sentry.captureException(new Error(claimErr.message));
      return NextResponse.json({ error: "Failed to accept invite" }, { status: 500 });
    }

    if (!claimedRows || claimedRows.length === 0) {
      // Lost the race — another caller accepted between our read and our claim.
      return NextResponse.json({ error: "Invite already used" }, { status: 409 });
    }

    // ── Link profiles ───────────────────────────────────────────────────────
    // Partner's household_id → inviter's profile id. We only get here on a
    // successful claim, so household linking is guaranteed to happen exactly
    // once per invite.
    const { error: profileErr } = await adminClient
      .from("profiles")
      .update({ household_id: invite.inviter_profile_id })
      .eq("id", user.id);

    if (profileErr) {
      // Roll back the claim so a retry can succeed — otherwise the invite is
      // permanently in "accepted but not linked" limbo.
      await adminClient
        .from("household_invites")
        .update({
          accepted: false,
          accepted_by_profile_id: null,
          accepted_at: null,
        })
        .eq("id", invite.id);
      Sentry.captureException(new Error(profileErr.message));
      return NextResponse.json({ error: "Failed to link household" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to accept invite" }, { status: 500 });
  }
}
