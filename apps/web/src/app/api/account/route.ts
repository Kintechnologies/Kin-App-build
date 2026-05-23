/**
 * DELETE /api/account
 *
 * Schedules the authenticated user's account for deletion in 30 days. The
 * existing daily cleanup cron (apps/web/src/app/api/cron/cleanup/route.ts)
 * picks up any profile whose `data_deletion_at` has passed and invokes the
 * SECURITY DEFINER `public.delete_user_account()` RPC to hard-delete every
 * row in a single transaction.
 *
 * P1-P3 (audit v7): the previous implementation hard-deleted immediately,
 * contradicting the privacy policy's "we will delete your personal data
 * within 30 days" promise and bypassing the 75-day reminder cron the
 * cleanup route already supports. A misclick was unrecoverable. The
 * 30-day grace lets a user undo via support; the immediate hard-delete
 * path now lives only inside the cleanup cron (and migration 070's RPC,
 * still usable by support for admin/CCPA "delete now" requests).
 *
 * During the grace window the auth row is left in place but
 * `cancelled_at` is stamped so any future briefing fan-out, nudge, or
 * billing automation can opt the profile out. The route also flips
 * `sms_opted_out_at` so no further outbound SMS lands.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/lib/supabase/api-auth";
import { isSameOrigin } from "@/lib/csrf";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import * as Sentry from "@sentry/nextjs";

const GRACE_DAYS = 30;

export async function DELETE(request: Request) {
  try {
    // CSRF defense-in-depth. Account deletion is the highest-impact destructive
    // endpoint in the app — a forged DELETE from a same-site context
    // (subdomain takeover, malicious extension, XSS via a third-party script)
    // would otherwise irreversibly schedule the user for deletion. (V7 P0-5)
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    }

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Per-user rate limit — 3/hour. Even with the 30-day grace, an honest
    // user never needs more than one or two retries on transient failure. (V7 P0-5)
    const rl = await checkRateLimit(user.id, "account-delete");
    if (!rl.allowed) return rateLimitResponse(rl);

    const uid = user.id;
    const admin = createAdminClient();
    const now = new Date();
    const deleteAt = new Date(now.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000);

    const { error: updateErr } = await admin
      .from("profiles")
      .update({
        cancelled_at: now.toISOString(),
        data_deletion_at: deleteAt.toISOString(),
        deletion_reminded: false,
        sms_opted_out_at: now.toISOString(),
      })
      .eq("id", uid);

    if (updateErr) {
      throw new Error(`Account deletion scheduling failed: ${updateErr.message}`);
    }

    return NextResponse.json({
      success: true,
      scheduled: true,
      data_deletion_at: deleteAt.toISOString(),
    });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json(
      { error: "Account deletion failed. Please contact support." },
      { status: 500 }
    );
  }
}
