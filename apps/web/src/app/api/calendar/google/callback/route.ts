import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import * as Sentry from "@sentry/nextjs";
import {
  exchangeGoogleCode,
  registerGoogleWebhook,
} from "@/lib/calendar/google";
import { syncCalendarForConnection } from "@/lib/calendar/sync";
import { randomUUID } from "crypto";

// GET /api/calendar/google/callback — OAuth callback
//
// `state` carries who the connection belongs to. Two forms:
//   - "<profile_id>"   — web user with a session (RLS-scoped client).
//   - "sms:<token>"    — SMS-onboarded texter with no web session. The
//     one-time calendar_connect_token maps to their profile; an admin client
//     is required since there is no auth.uid() to satisfy RLS.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  const isSms = !!state && state.startsWith("sms:");
  const smsToken = isSms ? state.slice(4) : null;

  const errorRedirect = (reason: string) =>
    isSms
      ? `${appUrl}/connect/${smsToken}?error=${reason}`
      : `${appUrl}/settings?calendar_error=${reason}`;

  if (error) {
    return NextResponse.redirect(errorRedirect(error));
  }

  if (!code || !state) {
    return NextResponse.redirect(errorRedirect("missing_params"));
  }

  try {
    // ── Resolve which profile this connection belongs to ──────────────────────
    let profileId: string;
    let db: SupabaseClient;

    if (isSms) {
      const admin = createAdminClient();
      const { data: tokenProfile } = await admin
        .from("profiles")
        .select("id")
        .eq("calendar_connect_token", smsToken)
        .maybeSingle<{ id: string }>();

      if (!tokenProfile) {
        return NextResponse.redirect(errorRedirect("invalid_token"));
      }
      profileId = tokenProfile.id;
      db = admin;
    } else {
      profileId = state;
      db = createClient();
    }

    const tokens = await exchangeGoogleCode(code);

    // Upsert the connection
    const { data: connection, error: dbError } = await db
      .from("calendar_connections")
      .upsert(
        {
          profile_id: profileId,
          provider: "google",
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: tokens.expiry_date
            ? new Date(tokens.expiry_date).toISOString()
            : null,
          sync_status: "idle",
          enabled: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "profile_id,provider" }
      )
      .select()
      .single();

    if (dbError) throw dbError;

    // Register webhook for push notifications
    try {
      const channelId = randomUUID();
      const webhookUrl = `${appUrl}/api/calendar/google/webhook`;
      const webhook = await registerGoogleWebhook(
        tokens.access_token!,
        "primary",
        webhookUrl,
        channelId
      );

      await db
        .from("calendar_connections")
        .update({
          google_channel_id: webhook.channelId,
          google_resource_id: webhook.resourceId,
          google_channel_expiry: webhook.expiration,
          updated_at: new Date().toISOString(),
        })
        .eq("id", connection.id);
    } catch (err) {
      // Non-fatal — sync will fall back to polling
      Sentry.captureException(err);
    }

    // Trigger initial sync
    await syncCalendarForConnection(connection.id);

    // ── SMS texter: consume the one-time token, land on the confirmation page ─
    if (isSms) {
      await db
        .from("profiles")
        .update({ calendar_connect_token: null })
        .eq("id", profileId);
      return NextResponse.redirect(`${appUrl}/connect/${smsToken}?connected=1`);
    }

    // ── Web user: route new users to the done screen, others to settings ──────
    const { data: profileCheck } = await db
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", profileId)
      .single<{ onboarding_completed: boolean | null }>();

    const redirectPath =
      profileCheck?.onboarding_completed === true
        ? "/settings?calendar_connected=google"
        : "/onboarding/done";

    return NextResponse.redirect(`${appUrl}${redirectPath}`);
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.redirect(errorRedirect("auth_failed"));
  }
}
