import { google, calendar_v3 } from "googleapis";
import type { CalendarEvent } from "@/types";

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
    scope: ["https://www.googleapis.com/auth/calendar"],
    state,
  });
}

export async function exchangeGoogleCode(code: string) {
  const oauth2Client = getGoogleOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function refreshGoogleToken(refreshToken: string) {
  const oauth2Client = getGoogleOAuthClient();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
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
    const params: calendar_v3.Params$Resource$Events$List = {
      calendarId,
      singleEvents: true,
      orderBy: "startTime",
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

// Push event to Google Calendar
export async function pushEventToGoogle(
  accessToken: string,
  event: CalendarEvent,
  calendarId: string = "primary",
  timezone: string = "UTC"
): Promise<string> {
  const calendar = getCalendarClient(accessToken);

  const googleEvent: calendar_v3.Schema$Event = {
    summary: event.title,
    description: event.description || undefined,
    location: event.location || undefined,
    start: event.all_day
      ? { date: event.start_time.split("T")[0] }
      : { dateTime: event.start_time, timeZone: timezone },
    end: event.all_day
      ? { date: event.end_time.split("T")[0] }
      : { dateTime: event.end_time, timeZone: timezone },
  };

  if (event.external_id) {
    // Update existing
    const response = await calendar.events.update({
      calendarId,
      eventId: event.external_id,
      requestBody: googleEvent,
    });
    return response.data.id || event.external_id;
  } else {
    // Create new
    const response = await calendar.events.insert({
      calendarId,
      requestBody: googleEvent,
    });
    return response.data.id!;
  }
}

// Delete event from Google Calendar
export async function deleteGoogleEvent(
  accessToken: string,
  externalId: string,
  calendarId: string = "primary"
): Promise<void> {
  const calendar = getCalendarClient(accessToken);
  await calendar.events.delete({ calendarId, eventId: externalId });
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

  return {
    profile_id: profileId,
    owner_parent_id: profileId,
    title: gEvent.summary || "(No title)",
    description: gEvent.description || undefined,
    location: gEvent.location || undefined,
    start_time: isAllDay
      ? new Date(gEvent.start!.date!).toISOString()
      : gEvent.start!.dateTime!,
    end_time: isAllDay
      ? new Date(gEvent.end!.date!).toISOString()
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
