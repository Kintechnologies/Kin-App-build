/**
 * DELETE /api/account
 *
 * Hard-deletes the authenticated user's account and all associated data.
 * Called from the Settings screen "Delete Account" flow.
 *
 * Deletion order (respect FK constraints):
 *   1. chat_messages              — thread content
 *   2. chat_threads               — thread metadata
 *   3. calendar_events            — calendar data
 *   4. coordination_issues        — alert data
 *   5. morning_briefings          — briefing data
 *   6. kin_check_ins              — check-in data
 *   7. push_tokens                — device tokens
 *   8. [FK nullification]         — clear partner household_id + accepted_by_profile_id refs
 *   9. profiles                   — user profile
 *  10. auth.users                 — Supabase auth record (admin client, irreversible)
 *
 * Uses service-role admin client for auth.users deletion. All table deletes use
 * the standard server client (RLS + uid check for safety).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/lib/supabase/api-auth";
import * as Sentry from "@sentry/nextjs";

export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uid = user.id;
    const supabase = createClient();

    // ── 1. Delete chat messages ───────────────────────────────────────────────
    await supabase
      .from("chat_messages")
      .delete()
      .eq("profile_id", uid);

    // ── 2. Delete chat threads ────────────────────────────────────────────────
    await supabase
      .from("chat_threads")
      .delete()
      .eq("profile_id", uid);

    // ── 3. Delete calendar events ─────────────────────────────────────────────
    await supabase
      .from("calendar_events")
      .delete()
      .eq("owner_parent_id", uid);

    // ── 4. Delete coordination issues (via household) ─────────────────────────
    // Fetch household first so we can clean up household-scoped data
    const { data: profile } = await supabase
      .from("profiles")
      .select("household_id")
      .eq("id", uid)
      .single();

    if (profile?.household_id) {
      // Only delete household-scoped issues if user is the sole member
      const { data: remainingMembers } = await supabase
        .from("profiles")
        .select("id")
        .eq("household_id", profile.household_id)
        .neq("id", uid);

      if (!remainingMembers || remainingMembers.length === 0) {
        // Sole member — safe to delete household-scoped data
        await supabase
          .from("coordination_issues")
          .delete()
          .eq("household_id", profile.household_id);

        await supabase
          .from("morning_briefings")
          .delete()
          .eq("profile_id", uid);
      } else {
        // Partner remains — only delete personal data
        await supabase
          .from("morning_briefings")
          .delete()
          .eq("profile_id", uid);
      }
    } else {
      await supabase
        .from("morning_briefings")
        .delete()
        .eq("profile_id", uid);
    }

    // ── 5. Delete check-ins ───────────────────────────────────────────────────
    await supabase
      .from("kin_check_ins")
      .delete()
      .eq("profile_id", uid);

    // ── 6. Delete push tokens ─────────────────────────────────────────────────
    await supabase
      .from("push_tokens")
      .delete()
      .eq("profile_id", uid);

    // ── 7. Clear FK references that would block profile deletion ─────────────
    // (a) Partner whose household_id points at this profile (Problem: profiles_household_id_fkey)
    // (b) household_invites.accepted_by_profile_id pointing at this profile
    // Both FKs are declared without CASCADE/SET NULL so we must null them out first.
    const admin = createAdminClient();

    await admin
      .from("profiles")
      .update({ household_id: null })
      .eq("household_id", uid);

    await admin
      .from("household_invites")
      .update({ accepted_by_profile_id: null })
      .eq("accepted_by_profile_id", uid);

    // Note: inviter_profile_id ON DELETE CASCADE handles invite cleanup for the
    // inviter side — no explicit delete needed here.

    // ── 8. Delete profile ─────────────────────────────────────────────────────
    await supabase
      .from("profiles")
      .delete()
      .eq("id", uid);

    // ── 9. Delete Supabase auth user (irreversible) ───────────────────────────
    const { error: authDeleteError } = await admin.auth.admin.deleteUser(uid);
    if (authDeleteError) {
      throw new Error(`Auth deletion failed: ${authDeleteError.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json(
      { error: "Account deletion failed. Please contact support." },
      { status: 500 }
    );
  }
}
