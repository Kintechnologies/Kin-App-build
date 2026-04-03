import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/invite/[code]
 * Public — no auth required. Returns invite metadata for the landing page.
 *
 * Returns:
 *   200  { valid: true, inviterName: string, familyName: string, inviteeEmail: string, expiresAt: string }
 *   200  { valid: false, reason: 'expired' | 'accepted' | 'not_found' }
 */
export async function GET(
  _request: Request,
  { params }: { params: { code: string } }
) {
  try {
  const { code } = params;
  if (!code) {
    return NextResponse.json({ valid: false, reason: "not_found" as const });
  }

  const supabase = createClient();

  // Look up the invite — join with the inviter's profile for personalised copy
  // We use service-role read here via a server-side Supabase client.
  // The household_invites table has no public SELECT policy, so we use the
  // admin client for this read-only lookup.
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let invite: {
    accepted: boolean;
    expires_at: string;
    invitee_email: string;
    inviter_profile_id: string;
  } | null = null;

  let inviterProfile: { family_name: string | null } | null = null;

  if (serviceRoleKey) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminClient = createAdminClient();

    const { data: inv } = await adminClient
      .from("household_invites")
      .select("accepted, expires_at, invitee_email, inviter_profile_id")
      .eq("invite_code", code)
      .maybeSingle();

    invite = inv;

    if (inv) {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("family_name")
        .eq("id", inv.inviter_profile_id)
        .single();
      inviterProfile = profile;
    }
  } else {
    // Without service role key we can still look up via the anon client
    // because the landing page is public. We use a service-role bypass
    // by querying via the server client (which uses the anon key).
    // Note: this will only work if RLS allows anonymous reads on this table.
    // For production: ensure SUPABASE_SERVICE_ROLE_KEY is configured.
    const { data: inv } = await supabase
      .from("household_invites")
      .select("accepted, expires_at, invitee_email, inviter_profile_id")
      .eq("invite_code", code)
      .maybeSingle();

    invite = inv;

    if (inv) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("family_name")
        .eq("id", inv.inviter_profile_id)
        .single();
      inviterProfile = profile;
    }
  }

  if (!invite) {
    return NextResponse.json({ valid: false, reason: "not_found" as const });
  }

  if (invite.accepted) {
    return NextResponse.json({ valid: false, reason: "accepted" as const });
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, reason: "expired" as const });
  }

  const familyName = inviterProfile?.family_name ?? null;
  const inviterFirstName = familyName?.split(" ")[0] ?? "Your partner";

  return NextResponse.json({
    valid: true,
    inviterName: inviterFirstName,
    familyName: familyName ?? "your household",
    inviteeEmail: invite.invitee_email,
    expiresAt: invite.expires_at,
  });
  } catch {
    // Unexpected DB / import error — return safe not_found rather than a 500
    // TODO: log to Sentry before GA
    return NextResponse.json({ valid: false, reason: "not_found" as const });
  }
}
