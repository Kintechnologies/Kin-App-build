import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  exchangeGoogleCode,
  registerGoogleWebhook,
} from "@/lib/calendar/google";
import { syncCalendarForConnection } from "@/lib/calendar/sync";
import { randomUUID } from "crypto";

// GET /api/calendar/google/callback — OAuth callback
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // profile_id
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?calendar_error=${error}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?calendar_error=missing_params`
    );
  }

  try {
    const tokens = await exchangeGoogleCode(code);

    const supabase = createClient();

    // Upsert the connection
    const { data: connection, error: dbError } = await supabase
      .from("calendar_connections")
      .upsert(
        {
          profile_id: state,
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
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/google/webhook`;
      const webhook = await registerGoogleWebhook(
        tokens.access_token!,
        "primary",
        webhookUrl,
        channelId
      );

      await supabase
        .from("calendar_connections")
        .update({
          google_channel_id: webhook.channelId,
          google_resource_id: webhook.resourceId,
          google_channel_expiry: webhook.expiration,
          updated_at: new Date().toISOString(),
        })
        .eq("id", connection.id);
    } catch (webhookError) {
      console.error("Failed to register webhook:", webhookError);
      // Non-fatal — sync will fall back to polling
    }

    // Trigger initial sync
    await syncCalendarForConnection(connection.id);

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?calendar_connected=google`
    );
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?calendar_error=auth_failed`
    );
  }
}
