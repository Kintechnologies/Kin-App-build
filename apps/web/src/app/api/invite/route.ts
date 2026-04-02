import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getAuthenticatedUser } from "@/lib/supabase/api-auth";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/invite
 * Creates a household invite for the authenticated user's partner.
 *
 * Body: { partnerEmail: string }
 *
 * Behaviour:
 * 1. Creates a row in `household_invites` with a unique code (expires 7 days).
 * 2. Sends an invite email via Supabase Auth admin API.
 *    Requires SUPABASE_SERVICE_ROLE_KEY. If not set, invite is still created
 *    but email is skipped — log the invite URL for dev/testing.
 *
 * Returns: { success: true, inviteCode: string }
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as { partnerEmail?: string };
    const partnerEmail = body.partnerEmail?.trim().toLowerCase();

    if (!partnerEmail || !partnerEmail.includes("@")) {
      return NextResponse.json({ error: "Valid partner email required" }, { status: 400 });
    }

    // Prevent inviting yourself
    if (partnerEmail === user.email?.toLowerCase()) {
      return NextResponse.json({ error: "You cannot invite yourself" }, { status: 400 });
    }

    const supabase = createClient();

    // Look up the inviter's family name for the email copy
    const { data: profile } = await supabase
      .from("profiles")
      .select("family_name, household_id")
      .eq("id", user.id)
      .single();

    // Guard: don't create a second invite if already in a household
    if (profile?.household_id) {
      return NextResponse.json(
        { error: "You are already in a shared household" },
        { status: 409 }
      );
    }

    // Check for an existing pending invite to the same email from this user
    const { data: existing } = await supabase
      .from("household_invites")
      .select("id, invite_code, expires_at")
      .eq("inviter_profile_id", user.id)
      .eq("invitee_email", partnerEmail)
      .eq("accepted", false)
      .gte("expires_at", new Date().toISOString())
      .maybeSingle();

    // Re-use a valid existing invite rather than creating duplicates
    const inviteCode = existing?.invite_code ?? randomBytes(8).toString("hex");

    if (!existing) {
      const { error: insertErr } = await supabase.from("household_invites").insert({
        inviter_profile_id: user.id,
        invitee_email: partnerEmail,
        invite_code: inviteCode,
      });

      if (insertErr) {
        return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://kinai.family";
    const inviteUrl = `${appUrl}/join/invite/${inviteCode}`;
    const inviterFirstName = profile?.family_name?.split(" ")[0] ?? "Your partner";
    const familyLabel = profile?.family_name ? `the ${profile.family_name} household` : "their Kin household";

    // ── Send invite email via Supabase Admin ──────────────────────────────
    // Requires SUPABASE_SERVICE_ROLE_KEY in env vars.
    // The admin inviteUserByEmail sends a magic-link email that redirects to
    // the invite landing page, creating the partner's account if needed.
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey) {
      try {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const adminClient = createAdminClient();
        await adminClient.auth.admin.inviteUserByEmail(partnerEmail, {
          redirectTo: inviteUrl,
          data: {
            invite_code: inviteCode,
            inviter_name: inviterFirstName,
            family_label: familyLabel,
          },
        });
      } catch {
        // Non-fatal: invite record is created; email will need to be re-sent.
        // Log the invite URL so it can be shared manually during dev/testing.
        console.log(`[invite] Email send failed. Invite URL: ${inviteUrl}`);
      }
    } else {
      // Dev mode — log the invite URL for manual testing
      console.log(`[invite] SUPABASE_SERVICE_ROLE_KEY not set. Invite URL: ${inviteUrl}`);
    }

    return NextResponse.json({ success: true, inviteCode });
  } catch {
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 });
  }
}
