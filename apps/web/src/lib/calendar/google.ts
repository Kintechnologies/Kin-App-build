import { google, calendar_v3 } from "googleapis";
import type { CalendarEvent, CalendarEventVisibility } from "@/types";

// ── OAuth Client ──

export function getGoogleOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/google/callback`
  );
}

export function getGoogleAuthUrl(state: string): string {
  const oauth2Client = getGoogleOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.readonly"],
    state,
  });
}

export async function exchangeGoogleCode(code: string) {
  const oauth2Client = getGoogleOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Thrown when Google rejects the refresh_token (401, invalid_grant, etc.) —
 * meaning the user revoked Kin's access in their Google account, deleted their
 * Google account, or the token simply expired without refresh activity for
 * months. The sync path uses this to flip the connection to `needs_reconnect`
 * so the dashboard surfaces a Reconnect CTA. (audit v3 P1-C1)
 */
export class GoogleTokenRevokedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleTokenRevokedError";
  }
}

function isRevokedTokenError(err: unknown): boolean {
  const e = err as {
    status?: number;
    code?: number | string;
    response?: { data?: { error?: string } };
    message?: string;
  };
  if (e?.status === 401 || e?.code === 401 || e?.code === "401") return true;
  const errCode = e?.response?.data?.error;
  if (errCode === "invalid_grant" || errCode === "unauthorized_client") return true;
  if (typeof e?.message === "string" && /invalid_grant/i.test(e.message)) return true;
  // The google client library throws "No refresh token is set" when callers
  // pass `null`/`undefined` — we used to swallow this as a generic error, then
  // the connection would land in `error` rather than `needs_reconnect` and the
  // dashboard wouldn't render the reconnect CTA. Treat it as a revoked-token
  // condition so users always get a way back. (audit v5 P1-C3)
  if (
    typeof e?.message === "string" &&
    /no refresh token is set/i.test(e.message)
  ) {
    return true;
  }
  return false;
}

export async function refreshGoogleToken(refreshToken: string | null | undefined) {
  if (!refreshToken) {
    // Match the google library's own error string so isRevokedTokenError above
    // routes this through to a needs_reconnect flip.
    throw new GoogleTokenRevokedError(
      "No refresh token is set — user must reconnect"
    );
  }
  const oauth2Client = getGoogleOAuthClient();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
  } catch (err) {
    if (isRevokedTokenError(err)) {
      throw new GoogleTokenRevokedError(
        "Google refresh_token rejected — user must reconnect"
      );
    }
    throw err;
  }
}

// ── Calendar API ──

function getCalendarClient(accessToken: string): calendar_v3.Calendar {
  const oauth2Client = getGoogleOAuthClient();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.calendar({ version: "v3", auth: oauth2Client });
}

// Pull events — initial full sync or incremental with syncToken
export async function pullGoogleEvents(
  accessToken: string,
  calendarId: string = "primary",
  syncToken?: string
): Promise<{
  events: calendar_v3.Schema$Event[];
  nextSyncToken?: string;
  requiresFullSync: boolean;
}> {
  const calendar = getCalendarClient(accessToken);

  try {
    // NOTE: orderBy is intentionally never set. Google omits nextSyncToken
    // from any response that uses orderBy, and rejects (400) syncToken
    // requests that include orderBy/timeMin/timeMax. Events are upserted
    // regardless of order, so sorting here has no value.
    const params: calendar_v3.Params$Resource$Events$List = {
      calendarId,
      singleEvents: true,
      maxResults: 2500,
    };

    if (syncToken) {
      params.syncToken = syncToken;
    } else {
      // Initial sync — 6 months back, all future
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      params.timeMin = sixMonthsAgo.toISOString();
    }

    let allEvents: calendar_v3.Schema$Event[] = [];
    let pageToken: string | undefined;
    let nextSyncToken: string | undefined;

    do {
      const response = await calendar.events.list({
        ...params,
        pageToken,
      });

      allEvents = allEvents.concat(response.data.items || []);
      pageToken = response.data.nextPageToken || undefined;
      nextSyncToken = response.data.nextSyncToken || undefined;
    } while (pageToken);

    return { events: allEvents, nextSyncToken, requiresFullSync: false };
  } catch (error: unknown) {
    const err = error as { code?: number };
    if (err.code === 410) {
      // 410 Gone — syncToken invalid, need full resync
      return { events: [], requiresFullSync: true };
    }
    throw error;
  }
}

/**
 * Return the user's non-hidden, non-deleted calendars (the ones they'd see in
 * Google Calendar today). Used by the sync path to fan out across every
 * coordination-relevant calendar instead of just "primary" — school district
 * calendars, sports leagues, partner shared calendars all live here.
 */
export async function listGoogleCalendars(
  accessToken: string
): Promise<{ id: string; summary: string; primary: boolean }[]> {
  const calendar = getCalendarClient(accessToken);
  const out: { id: string; summary: string; primary: boolean }[] = [];
  let pageToken: string | undefined;
  do {
    const response = await calendar.calendarList.list({
      maxResults: 250,
      showHidden: false,
      showDeleted: false,
      pageToken,
    });
    for (const item of response.data.items ?? []) {
      if (!item.id) continue;
      if (item.hidden || item.deleted) continue;
      out.push({
        id: item.id,
        summary: item.summary ?? item.id,
        primary: item.primary === true,
      });
    }
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);
  return out;
}

// ── Webhook Management ──

export async function registerGoogleWebhook(
  accessToken: string,
  calendarId: string = "primary",
  webhookUrl: string,
  channelId: string
): Promise<{ channelId: string; resourceId: string; expiration: string }> {
  const calendar = getCalendarClient(accessToken);

  const requestBody: { id: string; type: string; address: string; token?: string } = {
    id: channelId,
    type: "web_hook",
    address: webhookUrl,
  };
  // Pass shared secret as channel token so Google echoes it in X-Goog-Channel-Token.
  // Requires GOOGLE_WEBHOOK_SECRET to be set in env vars.
  if (process.env.GOOGLE_WEBHOOK_SECRET) {
    requestBody.token = process.env.GOOGLE_WEBHOOK_SECRET;
  }

  const response = await calendar.events.watch({
    calendarId,
    requestBody,
  });

  return {
    channelId: response.data.id!,
    resourceId: response.data.resourceId!,
    expiration: new Date(Number(response.data.expiration)).toISOString(),
  };
}

export async function stopGoogleWebhook(
  accessToken: string,
  channelId: string,
  resourceId: string
): Promise<void> {
  const calendar = getCalendarClient(accessToken);
  await calendar.channels.stop({
    requestBody: { id: channelId, resourceId },
  });
}

// ── Helpers ──

export function googleEventToKinEvent(
  gEvent: calendar_v3.Schema$Event,
  profileId: string,
  calendarId: string
): Partial<CalendarEvent> {
  const isAllDay = !!gEvent.start?.date;

  // Google reports visibility as 'default' | 'public' | 'private' |
  // 'confidential'. Persisted so the briefing layer can strip details from
  // private/confidential events before they reach the AI prompt.
  const allowedVisibility: CalendarEventVisibility[] = [
    "default",
    "public",
    "private",
    "confidential",
  ];
  const visibility: CalendarEventVisibility = allowedVisibility.includes(
    gEvent.visibility as CalendarEventVisibility
  )
    ? (gEvent.visibility as CalendarEventVisibility)
    : "default";

  // All-day events arrive from Google as `start.date = "2026-05-22"`. JS parses
  // that as UTC midnight (2026-05-22T00:00:00Z), which renders as the PRIOR
  // calendar day for any timezone west of UTC — every PT user would see
  // "Mom's birthday" on the wrong day. Anchor to noon UTC of the target date
  // instead: noon falls on the correct local date for any timezone within
  // ±12h of UTC (essentially all of the US service area). (audit v3 P1-C2)
  const allDayInstant = (dateStr: string) =>
    new Date(`${dateStr}T12:00:00.000Z`).toISOString();

  return {
    profile_id: profileId,
    owner_parent_id: profileId,
    title: gEvent.summary || "(No title)",
    description: gEvent.description || undefined,
    location: gEvent.location || undefined,
    visibility,
    start_time: isAllDay
      ? allDayInstant(gEvent.start!.date!)
      : gEvent.start!.dateTime!,
    end_time: isAllDay
      ? allDayInstant(gEvent.end!.date!)
      : gEvent.end!.dateTime!,
    all_day: isAllDay,
    external_id: gEvent.id!,
    external_source: "google" as const,
    external_calendar_id: calendarId,
    external_etag: gEvent.etag || undefined,
    sync_status: "synced" as const,
    is_shared: false,
    is_kid_event: false,
  };
}
