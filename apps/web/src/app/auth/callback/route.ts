import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  // Invite code carried through from /signup?invite=CODE → emailRedirectTo
  const inviteCode = searchParams.get("invite");

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // If arriving via a partner invite, accept it now that the session is live.
      // Fixes #36: signUp() with email confirmation ON has no session, so accept
      // was previously called without auth and silently returned 401.
      if (inviteCode) {
        await tryAcceptInvite(inviteCode);
      }

      // Check if onboarding is completed
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .single();

      if (profile && !profile.onboarding_completed) {
        return NextResponse.redirect(`${origin}/onboarding`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth error — redirect to signin with error
  return NextResponse.redirect(`${origin}/signin`);
}

/**
 * Silently accept a household invite for the just-authenticated user.
 * Creates its own server-side Supabase clients so it can be called from
 * the GET handler without threading client instances around.
 *
 * Non-fatal: any failure (missing env var, expired invite, email mismatch,
 * already in household) is swallowed and the caller proceeds to onboarding.
 */
async function tryAcceptInvite(inviteCode: string): Promise<void> {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) return;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminClient = createAdminClient();

    const { data: invite } = await adminClient
      .from("household_invites")
      .select("id, inviter_profile_id, invitee_email, accepted, expires_at")
      .eq("invite_code", inviteCode)
      .maybeSingle();

    if (
      !invite ||
      invite.accepted ||
      new Date(invite.expires_at) < new Date() ||
      invite.inviter_profile_id === user.id ||
      user.email?.toLowerCase() !== invite.invitee_email.toLowerCase()
    ) {
      return; // Invalid or inapplicable invite — proceed to onboarding normally
    }

    // Guard: partner is already in a household
    const { data: partnerProfile } = await adminClient
      .from("profiles")
      .select("household_id")
      .eq("id", user.id)
      .single();

    if (partnerProfile?.household_id) return;

    // Link the partner's profile to the inviter's household
    const { error: profileErr } = await adminClient
      .from("profiles")
      .update({ household_id: invite.inviter_profile_id })
      .eq("id", user.id);

    if (profileErr) return;

    // Mark invite as accepted
    await adminClient
      .from("household_invites")
      .update({
        accepted: true,
        accepted_by_profile_id: user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invite.id);
  } catch {
    // Non-fatal — caller proceeds to onboarding regardless
  }
}
