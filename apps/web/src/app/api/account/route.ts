/**
 * DELETE /api/account
 *
 * Hard-deletes the authenticated user's account and all associated data.
 *
 * The full data delete is performed by the SECURITY DEFINER Postgres function
 * `public.delete_user_account(uid)` (migration 070) which runs as a single
 * transaction — either every row goes, or none do. Eliminates the V3 partial-
 * delete failure mode where a mid-route Vercel timeout left orphaned rows.
 * Only after the DB transaction commits do we delete auth.users (a separate
 * connection that can't participate in the same tx).
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/lib/supabase/api-auth";
import { isSameOrigin } from "@/lib/csrf";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import * as Sentry from "@sentry/nextjs";

export async function DELETE(request: Request) {
  try {
    // CSRF defense-in-depth. Account deletion is the highest-impact destructive
    // endpoint in the app — a forged DELETE from a same-site context
    // (subdomain takeover, malicious extension, XSS via a third-party script)
    // would otherwise irreversibly hard-delete the user. (V7 P0-5)
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    }

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Per-user rate limit — 3/hour. Irreversible operation; an honest user
    // never needs more than one or two retries on transient failure. (V7 P0-5)
    const rl = await checkRateLimit(user.id, "account-delete");
    if (!rl.allowed) return rateLimitResponse(rl);

    const uid = user.id;
    const admin = createAdminClient();

    const { error: rpcError } = await admin.rpc("delete_user_account", { uid });
    if (rpcError) {
      throw new Error(`Account data deletion failed: ${rpcError.message}`);
    }

    const { error: authDeleteError } = await admin.auth.admin.deleteUser(uid);
    if (authDeleteError) {
      // The DB tx already committed — profile + child rows are gone but the
      // auth.users row remains. Capture so we can manually clean up; the user
      // experience is still "you're deleted" (no profile means no app access).
      Sentry.captureException(
        new Error(`Auth deletion failed post-tx: ${authDeleteError.message}`)
      );
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
