import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-log";
import { notifySlack } from "@/lib/notify";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Validate `next` — must be a relative path (starts with /) and NOT a
  // protocol-relative URL (`//evil.com` resolves to https://evil.com after
  // concatenation with origin). Cap length so we don't echo arbitrary
  // user-controlled junk back into the Location header.
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next =
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    rawNext.length <= 200
      ? rawNext
      : "/dashboard";
  // Invite code carried through from /signup?invite=CODE → emailRedirectTo
  const inviteCode = searchParams.get("invite");

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      // The user just lost a sign-in. Warning: one failure is usually a
      // stale link or browser-cookie weirdness, but a pattern means our auth
      // is broken — surface it so we don't only learn from a support email.
      await notifySlack(
        `Auth callback exchangeCodeForSession failed: ${error.message}`,
        "warning"
      ).catch(() => {});
    }

    if (!error) {
      // Fire a one-time signup alert for this user (idempotent).
      await maybeLogSignup().catch(() => {});

      // If arriving via a partner invite, accept it now that the session is live.
      // Fixes #36: signUp() with email confirmation ON has no session, so accept
      // was previously called without auth and silently returned 401.
      if (inviteCode) {
        await tryAcceptInvite(inviteCode);
        // Partner skips full onboarding — route to 2-step abbreviated flow (#42)
        return NextResponse.redirect(`${origin}/onboarding/partner`);
      }

      // SMS-first product: skip the legacy 8-step Family-OS onboarding for
      // every auth method (email, Google OAuth, etc.) and land on the dashboard.
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth error — redirect to signin with error
  return NextResponse.redirect(`${origin}/signin`);
}

/**
 * Fire a "signup" activity event the first time we see this auth user.
 * Idempotent — checks activity_log for an existing row before inserting.
 * Non-fatal on any failure (missing env, table not yet migrated, etc.).
 */
async function maybeLogSignup(): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("activity_log")
      .select("id")
      .eq("event_type", "signup")
      .eq("profile_id", user.id)
      .limit(1)
      .maybeSingle();

    if (existing) return;

    await logActivity({
      eventType: "signup",
      email: user.email ?? null,
      profileId: user.id,
      metadata: {
        provider: user.app_metadata?.provider ?? "unknown",
      },
    });

    // Welcome email for OAuth / email-link signups (these always have an
    // address). Reached only once per user — the activity_log check above
    // returns early on repeat logins.
    if (user.email) {
      try {
        const { sendEmail, welcomeEmail } = await import("@/lib/email");
        await sendEmail({ to: user.email, ...welcomeEmail() });
      } catch (err) {
        console.warn("Welcome email failed:", err);
      }
    }
  } catch {
    // Non-fatal
  }
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
      // Email invites must match the recipient; phone invites carry no email
      // (invitee_email null) and rely on private SMS delivery of the code.
      (invite.invitee_email &&
        user.email?.toLowerCase() !== invite.invitee_email.toLowerCase())
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
