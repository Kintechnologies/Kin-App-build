import { createDAVClient, DAVCalendar, DAVObject } from "tsdav";
import ICAL from "ical.js";
import type { CalendarEvent, CalendarEventVisibility } from "@/types";

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
  visibility: CalendarEventVisibility;
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

  // iCalendar CLASS values: PUBLIC | PRIVATE | CONFIDENTIAL (RFC 5545 §3.8.1.3).
  // Map onto our 4-state visibility enum so the briefing layer's private-event
  // stripping logic applies to Apple events too — without this, Apple-side
  // private events leak by name into the AI prompt.
  const classProp = vevent.getFirstPropertyValue("class");
  const classRaw =
    typeof classProp === "string" ? classProp.toLowerCase() : null;
  let visibility: CalendarEventVisibility;
  if (classRaw === "private") visibility = "private";
  else if (classRaw === "confidential") visibility = "confidential";
  else if (classRaw === "public") visibility = "public";
  else visibility = "default";

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
    visibility,
  };
}

/**
 * Stable synthetic etag derived from the event's mutable fields. Used when
 * the CalDAV server omits the etag header (some Apple endpoints do this for
 * read-only shared calendars). Without it, every sync would either update
 * every row (write amplification) or never update at all (no-update race) —
 * v5 P2-C3.
 */
function syntheticEtag(parsed: ParsedAppleEvent): string {
  const composite = [
    parsed.title,
    parsed.startTime,
    parsed.endTime,
    parsed.location ?? "",
    parsed.description ?? "",
    parsed.recurrenceRule ?? "",
    parsed.visibility,
  ].join("|");
  // Lightweight non-crypto hash — collision-resistant enough for change
  // detection between two snapshots of the same event UID.
  let hash = 0;
  for (let i = 0; i < composite.length; i++) {
    hash = (hash << 5) - hash + composite.charCodeAt(i);
    hash |= 0;
  }
  return `kin-${hash.toString(16)}-${composite.length}`;
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
    visibility: parsed.visibility,
    start_time: parsed.startTime,
    end_time: parsed.endTime,
    all_day: parsed.allDay,
    recurrence_rule: parsed.recurrenceRule,
    external_id: parsed.uid,
    external_source: "apple" as const,
    external_calendar_id: calendarUrl,
    // Guard against an empty-string etag falling through (v6 P1-C3): some Apple
    // CalDAV endpoints return "" rather than omitting the header, which `??`
    // wouldn't catch. Fall back to the synthetic etag whenever we don't have a
    // real value so the change-detection comparison on the next sync stays
    // meaningful.
    external_etag:
      parsed.etag && parsed.etag.trim().length > 0
        ? parsed.etag
        : syntheticEtag(parsed),
    sync_status: "synced" as const,
    is_shared: false,
    is_kid_event: false,
  };
}
