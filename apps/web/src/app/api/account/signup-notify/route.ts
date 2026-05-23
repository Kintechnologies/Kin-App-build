/**
 * POST /api/account/signup-notify
 *
 * Fire-and-forget endpoint the client hits immediately after a successful
 * phone-OTP signup. The OAuth/email-link flow goes through /auth/callback
 * which logs signup server-side; phone OTP completes client-side, so we
 * need this companion route.
 *
 * Idempotent — duplicate calls for the same auth user no-op.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-log";
import { isSameOrigin } from "@/lib/csrf";

export async function POST(request: Request) {
  try {
    // CSRF defense-in-depth (audit V7 P2-A3): closes the email-bomb race
    // between auth setup and first activity_log insert.
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    }
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("activity_log")
      .select("id")
      .eq("event_type", "signup")
      .eq("profile_id", user.id)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ logged: false, reason: "already_logged" });
    }

    await logActivity({
      eventType: "signup",
      email: user.email ?? null,
      profileId: user.id,
      metadata: {
        provider: user.app_metadata?.provider ?? "phone",
        phone: user.phone ?? null,
      },
    });

    // Welcome email — only when an address is on file. Phone-only signups have
    // no email; they get the welcome SMS after onboarding instead.
    if (user.email) {
      try {
        const { sendEmail, welcomeEmail } = await import("@/lib/email");
        await sendEmail({ to: user.email, ...welcomeEmail() });
      } catch (err) {
        console.warn("Welcome email failed:", err);
      }
    }

    return NextResponse.json({ logged: true });
  } catch {
    // Non-fatal — return 200 so the client never blocks signup on this
    return NextResponse.json({ logged: false });
  }
}
