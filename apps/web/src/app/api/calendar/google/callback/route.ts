import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import * as Sentry from "@sentry/nextjs";
import {
  exchangeGoogleCode,
  fetchGoogleAccountEmail,
  listGoogleCalendars,
  registerGoogleWebhook,
} from "@/lib/calendar/google";
import { syncCalendarForConnection } from "@/lib/calendar/sync";
import { randomUUID } from "crypto";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

// SMS-flow OAuth `state` payloads are signed-style opaque tokens (random hex
// from sms-onboarding's randomBytes); accept only the safe character set so a
// crafted `state="sms:../../evil.com"` can't poison the errorRedirect path.
// (v6 P1-A4)
const SMS_TOKEN_RE = /^[a-zA-Z0-9_-]+$/;

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
  const smsTokenRaw = isSms ? state.slice(4) : null;
  // Validate the token shape before it ever lands in a redirect URL. An
  // attacker who can craft `state` must not be able to bend the path to a
  // foreign host or up the directory tree. (v6 P1-A4)
  const smsToken =
    smsTokenRaw && SMS_TOKEN_RE.test(smsTokenRaw) ? smsTokenRaw : null;

  const errorRedirect = (reason: string) =>
    isSms && smsToken
      ? `${appUrl}/connect/${smsToken}?error=${reason}`
      : `${appUrl}/settings?calendar_error=${reason}`;

  if (isSms && !smsToken) {
    return NextResponse.redirect(`${appUrl}/settings?calendar_error=invalid_token`);
  }

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
      // Per-token rate limit (v6 P1-A3) before we touch the DB — slows any
      // attacker probing the connect-token namespace, even though the tokens
      // are 12-byte random hex.
      const rl = await checkRateLimit(smsToken!, "calendar-connect-token");
      if (!rl.allowed) return rateLimitResponse(rl);

      const admin = createAdminClient();
      // Atomic claim (v6 P1-A3): a conditional UPDATE that nulls the
      // calendar_connect_token in the same statement that returns the profile.
      // Two simultaneous OAuth callbacks racing the same token now serialize —
      // only the first claim returns a row; the second sees nothing and bails,
      // so we can't create duplicate calendar_connections rows under different
      // OAuth sessions.
      const { data: claimedProfile } = await admin
        .from("profiles")
        .update({ calendar_connect_token: null })
        .eq("calendar_connect_token", smsToken)
        .select("id")
        .maybeSingle<{ id: string }>();

      if (!claimedProfile) {
        return NextResponse.redirect(errorRedirect("invalid_token"));
      }
      profileId = claimedProfile.id;
      db = admin;
    } else {
      profileId = state;
      db = createClient();
    }

    const tokens = await exchangeGoogleCode(code);

    // Fetch the connected Google account's email so the multi-account dashboard
    // can distinguish personal vs. work Gmail connections. (v6 P1-C1)
    // V7 P0-1: the email is also the partial-unique key for migration 078, so
    // this is now load-bearing — without it, two Google accounts on the same
    // profile can't be told apart.
    const googleAccountEmail = tokens.access_token
      ? await fetchGoogleAccountEmail(tokens.access_token)
      : null;

    // Resolve the primary calendar's real id. The Google API accepts "primary"
    // as a relative alias to the authenticated user's primary calendar, but
    // every account has its own "primary" — storing the alias as
    // google_calendar_id collapsed multi-account rows to the same key
    // (migration 067's partial unique never engaged). Persist the resolved id
    // (e.g. "user@example.com") so per-calendar sync token bookkeeping and
    // multi-account routing have a stable identity. Best-effort: if the lookup
    // fails we fall back to "primary" — sync still works since the API resolves
    // the alias on every request. (V7 P0-1)
    let googleCalendarId = "primary";
    if (tokens.access_token) {
      try {
        const calendars = await listGoogleCalendars(tokens.access_token);
        const primary = calendars.find((c) => c.primary);
        if (primary) googleCalendarId = primary.id;
      } catch (err) {
        Sentry.captureException(err);
      }
    }

    // Look up an existing row for this exact Google account on this profile.
    // Mirrors the Apple SELECT-then-UPDATE-or-INSERT pattern at
    // apple/connect/route.ts:87-112 (v6 P1-C4). Scoping by
    // google_account_email lets a parent connect personal + work Gmail
    // without collision; the legacy upsert keyed only on (profile_id,
    // provider) silently overwrote the first account when the second
    // connected. (V7 P0-1)
    //
    // When the email lookup returned null we scope the lookup to rows that
    // ALSO have no email — so a transient userinfo failure during reconnect
    // never matches a different account's row.
    let priorLookup = db
      .from("calendar_connections")
      .select("id, refresh_token")
      .eq("profile_id", profileId)
      .eq("provider", "google");
    if (googleAccountEmail) {
      priorLookup = priorLookup.eq("google_account_email", googleAccountEmail);
    } else {
      priorLookup = priorLookup.is("google_account_email", null);
    }
    const { data: priorConnection } = await priorLookup.maybeSingle<{
      id: string;
      refresh_token: string | null;
    }>();

    // Google only emits a `refresh_token` on the FIRST consent. Subsequent
    // re-consents (e.g. the user re-runs OAuth after revoking access on the
    // Google account page) often omit it. If we naively pass `undefined`, the
    // upsert clobbers a perfectly good existing refresh_token with NULL, and
    // the next sync calls `refreshGoogleToken(undefined)` which throws "No
    // refresh token is set" — a string the audit's isRevokedTokenError check
    // doesn't recognise, so the connection silently lands in `error` with no
    // reconnect CTA.
    const refreshTokenToPersist =
      tokens.refresh_token ?? priorConnection?.refresh_token ?? null;

    const baseRow = {
      profile_id: profileId,
      provider: "google" as const,
      access_token: tokens.access_token,
      refresh_token: refreshTokenToPersist,
      token_expires_at: tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : null,
      google_account_email: googleAccountEmail,
      google_calendar_id: googleCalendarId,
      sync_status: "idle" as const,
      enabled: true,
      updated_at: new Date().toISOString(),
    };

    let connection;
    if (priorConnection) {
      const { data, error: dbError } = await db
        .from("calendar_connections")
        .update(baseRow)
        .eq("id", priorConnection.id)
        .select()
        .single();
      if (dbError) throw dbError;
      connection = data;
    } else {
      const { data, error: dbError } = await db
        .from("calendar_connections")
        .insert(baseRow)
        .select()
        .single();
      if (dbError) throw dbError;
      connection = data;
    }

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

    // Trigger initial sync. Hanging Google API calls used to leave the user
    // staring at a frozen redirect (the route held an open fetch indefinitely);
    // wrap in a 30s timeout so the redirect always happens. On timeout, flip
    // the connection into `syncing` and let the next cron run backfill — the
    // partial events written before the timeout remain. (audit v3 P1-C3)
    const SYNC_TIMEOUT_MS = 30_000;
    try {
      await Promise.race([
        syncCalendarForConnection(connection.id),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("initial sync exceeded 30s")),
            SYNC_TIMEOUT_MS
          )
        ),
      ]);
    } catch (syncErr) {
      Sentry.captureException(syncErr);
      await db
        .from("calendar_connections")
        .update({
          sync_status: "syncing",
          sync_error:
            "initial sync timed out — will retry on the next scheduled run",
          updated_at: new Date().toISOString(),
        })
        .eq("id", connection.id);
    }

    // ── SMS texter: land on the confirmation page ──
    // Token was already consumed by the atomic claim at the top of this
    // handler — no second clear needed. (v6 P1-A3)
    if (isSms) {
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
