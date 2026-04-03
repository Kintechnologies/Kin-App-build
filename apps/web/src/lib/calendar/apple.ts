import { createDAVClient, DAVCalendar, DAVObject } from "tsdav";
import ICAL from "ical.js";
import type { CalendarEvent } from "@/types";

// ── CalDAV Client ──

export async function getAppleCalDAVClient(
  username: string,
  appSpecificPassword: string
) {
  const client = await createDAVClient({
    serverUrl: "https://caldav.icloud.com",
    credentials: {
      username,
      password: appSpecificPassword,
    },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });

  return client;
}

// ── Fetch Calendars ──

export async function listAppleCalendars(
  username: string,
  password: string
): Promise<DAVCalendar[]> {
  const client = await getAppleCalDAVClient(username, password);
  const calendars = await client.fetchCalendars();
  return calendars;
}

// ── Pull Events ──

export async function pullAppleEvents(
  username: string,
  password: string,
  calendarUrl: string,
  sinceMonths: number = 6
): Promise<{ events: ParsedAppleEvent[]; objects: DAVObject[] }> {
  const client = await getAppleCalDAVClient(username, password);

  const timeRangeStart = new Date();
  timeRangeStart.setMonth(timeRangeStart.getMonth() - sinceMonths);

  const timeRangeEnd = new Date();
  timeRangeEnd.setFullYear(timeRangeEnd.getFullYear() + 1);

  const objects = await client.fetchCalendarObjects({
    calendar: { url: calendarUrl } as DAVCalendar,
    timeRange: {
      start: timeRangeStart.toISOString(),
      end: timeRangeEnd.toISOString(),
    },
  });

  const events: ParsedAppleEvent[] = [];

  for (const obj of objects) {
    if (!obj.data) continue;
    try {
      const parsed = parseICalEvent(obj.data, obj.url, obj.etag || undefined);
      if (parsed) events.push(parsed);
    } catch (e) {
      console.error("Failed to parse iCal event:", e);
    }
  }

  return { events, objects };
}

// ── Push Event ──

export async function pushEventToApple(
  username: string,
  password: string,
  calendarUrl: string,
  event: CalendarEvent,
  existingUrl?: string
): Promise<string> {
  const client = await getAppleCalDAVClient(username, password);

  const icsContent = kinEventToICS(event);
  const eventUrl =
    existingUrl || `${calendarUrl}${event.id}.ics`;

  if (existingUrl) {
    await client.updateCalendarObject({
      calendarObject: {
        url: existingUrl,
        data: icsContent,
      },
    });
  } else {
    await client.createCalendarObject({
      calendar: { url: calendarUrl } as DAVCalendar,
      filename: `${event.id}.ics`,
      iCalString: icsContent,
    });
  }

  return eventUrl;
}

// ── Delete Event ──

export async function deleteAppleEvent(
  username: string,
  password: string,
  eventUrl: string
): Promise<void> {
  const client = await getAppleCalDAVClient(username, password);
  await client.deleteCalendarObject({
    calendarObject: { url: eventUrl },
  });
}

// ── iCal Parsing ──

export interface ParsedAppleEvent {
  uid: string;
  url: string;
  etag?: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  recurrenceRule?: string;
}

function parseICalEvent(
  icsData: string,
  url: string,
  etag?: string
): ParsedAppleEvent | null {
  const jcalData = ICAL.parse(icsData);
  const comp = new ICAL.Component(jcalData);
  const vevent = comp.getFirstSubcomponent("vevent");

  if (!vevent) return null;

  const event = new ICAL.Event(vevent);
  const dtstart = vevent.getFirstPropertyValue("dtstart") as ICAL.Time;
  const allDay = dtstart?.isDate || false;

  const rruleProp = vevent.getFirstPropertyValue("rrule");
  const recurrenceRule = rruleProp ? rruleProp.toString() : undefined;

  return {
    uid: event.uid,
    url,
    etag,
    title: event.summary || "(No title)",
    description: event.description || undefined,
    location: event.location || undefined,
    startTime: event.startDate.toJSDate().toISOString(),
    endTime: event.endDate.toJSDate().toISOString(),
    allDay,
    recurrenceRule,
  };
}

export function appleEventToKinEvent(
  parsed: ParsedAppleEvent,
  profileId: string,
  calendarUrl: string
): Partial<CalendarEvent> {
  return {
    profile_id: profileId,
    owner_parent_id: profileId,
    title: parsed.title,
    description: parsed.description,
    location: parsed.location,
    start_time: parsed.startTime,
    end_time: parsed.endTime,
    all_day: parsed.allDay,
    recurrence_rule: parsed.recurrenceRule,
    external_id: parsed.uid,
    external_source: "apple" as const,
    external_calendar_id: calendarUrl,
    external_etag: parsed.etag,
    sync_status: "synced" as const,
    is_shared: false,
    is_kid_event: false,
  };
}

// ── ICS Generation ──

function kinEventToICS(event: CalendarEvent): string {
  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const formatDate = (iso: string, allDay: boolean) => {
    if (allDay) {
      return iso.split("T")[0].replace(/-/g, "");
    }
    return iso.replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const dtstart = event.all_day
    ? `DTSTART;VALUE=DATE:${formatDate(event.start_time, true)}`
    : `DTSTART:${formatDate(event.start_time, false)}`;

  const dtend = event.all_day
    ? `DTEND;VALUE=DATE:${formatDate(event.end_time, true)}`
    : `DTEND:${formatDate(event.end_time, false)}`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kin Family AI//EN",
    "BEGIN:VEVENT",
    `UID:${event.external_id || event.id}`,
    `DTSTAMP:${now}`,
    dtstart,
    dtend,
    `SUMMARY:${event.title}`,
  ];

  if (event.description) ics.push(`DESCRIPTION:${event.description}`);
  if (event.location) ics.push(`LOCATION:${event.location}`);
  if (event.recurrence_rule) ics.push(`RRULE:${event.recurrence_rule}`);

  ics.push("END:VEVENT", "END:VCALENDAR");

  return ics.join("\r\n");
}
