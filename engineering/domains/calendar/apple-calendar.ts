// Kin AI — Apple CalDAV Sync (Track C1.2)
// Implements Apple iCloud Calendar sync via CalDAV protocol
// Uses: tsdav npm package for CalDAV protocol
// Uses: ical.js npm package for parsing .ics format
// Auth: App-specific password (user generates in Apple ID settings)
// No webhooks available — polling every 15 minutes
// Author: Lead Engineer (Track C1)
// Date: 2026-04-02

import { supabase } from '../../lib/supabase'
import type { CalendarConnection, CalendarEvent } from '../../types'

// ============================================================================
// TYPES
// ============================================================================

export interface AppleCalendarConfig {
  parentId: string
  icloudEmail: string
  appPassword: string // App-specific password, not regular password
}

interface ICalEvent {
  uid: string
  summary: string
  description?: string
  location?: string
  dtstart: string // ISO format
  dtend: string // ISO format
  dtstamp: string
  class?: 'PUBLIC' | 'PRIVATE' | 'CONFIDENTIAL'
}

// ============================================================================
// SETUP & AUTHENTICATION
// ============================================================================

/**
 * Initiate Apple Calendar setup
 * Shows instruction screen for generating app-specific password
 * Collects: iCloud email + app-specific password
 * Tests connection via CalDAV PROPFIND
 */
export async function initiateAppleCalendarSetup(parentId: string): Promise<{
  success: boolean
  connectionId?: string
  error?: string
}> {
  try {
    // This function is called from UI after user generates app-specific password
    // The actual connection is tested in storeAppleCalendarConnection below
    return {
      success: true,
    }
  } catch (error) {
    console.error('Error initiating Apple Calendar setup:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Store Apple Calendar connection after user provides credentials
 * Tests connection via CalDAV PROPFIND
 */
export async function storeAppleCalendarConnection(
  parentId: string,
  icloudEmail: string,
  appPassword: string
): Promise<{
  success: boolean
  connectionId?: string
  error?: string
}> {
  try {
    // Test connection first
    const testResult = await testAppleCalendarConnection(icloudEmail, appPassword)

    if (!testResult.success) {
      return testResult
    }

    // Encrypt app password before storing (in production, use proper encryption)
    // For MVP, use base64 (NOT secure — production must use proper encryption)
    const encryptedPassword = Buffer.from(appPassword).toString('base64')

    // Store in calendar_connections
    const { data, error } = await supabase
      .from('calendar_connections')
      .insert([
        {
          parent_id: parentId,
          provider: 'apple',
          access_token: encryptedPassword, // Store encrypted password in access_token field
          calendar_id: icloudEmail,
          is_read_only: false,
          sync_status: 'pending',
          last_synced_at: null,
        },
      ])
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      connectionId: data.id,
    }
  } catch (error) {
    console.error('Error storing Apple Calendar connection:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Test Apple Calendar connection via CalDAV
 */
async function testAppleCalendarConnection(
  icloudEmail: string,
  appPassword: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // CalDAV endpoint for Apple iCloud
    const caldavUrl = `https://caldav.icloud.com/`

    // Basic auth header
    const authHeader = `Basic ${Buffer.from(`${icloudEmail}:${appPassword}`).toString('base64')}`

    // Test PROPFIND request
    const response = await fetch(caldavUrl, {
      method: 'PROPFIND',
      headers: {
        Authorization: authHeader,
        Depth: '0',
        'Content-Type': 'application/xml',
      },
      body: `<?xml version="1.0" encoding="utf-8" ?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:resourcetype/>
  </D:prop>
</D:propfind>`,
    })

    if (response.status === 401) {
      return {
        success: false,
        error: 'Invalid credentials',
      }
    }

    if (!response.ok) {
      return {
        success: false,
        error: `CalDAV connection failed: ${response.statusText}`,
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    console.error('Error testing Apple Calendar connection:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// POLLING & SYNC
// ============================================================================

/**
 * Poll Apple Calendar for events
 * CalDAV REPORT request with time range (last 6 months + future)
 * Parse each .ics event via ical.js
 * Upsert events into calendar_events
 */
export async function pollAppleCalendar(connectionId: string): Promise<{
  success: boolean
  eventsImported: number
  error?: string
}> {
  try {
    // Fetch connection
    const { data: connection, error: fetchError } = await supabase
      .from('calendar_connections')
      .select()
      .eq('id', connectionId)
      .single()

    if (fetchError || !connection) {
      throw new Error('Calendar connection not found')
    }

    // Decrypt password
    const appPassword = Buffer.from(connection.access_token || '', 'base64').toString('utf-8')
    const icloudEmail = connection.calendar_id

    if (!appPassword || !icloudEmail) {
      throw new Error('Missing credentials')
    }

    // Get user's principal collection
    const principalUrl = await discoverAppleCalendarPrincipal(icloudEmail, appPassword)

    if (!principalUrl) {
      throw new Error('Could not discover calendar principal')
    }

    // Fetch all calendars
    const calendars = await discoverAppleCalendars(principalUrl, icloudEmail, appPassword)

    let eventsImported = 0

    // Poll each calendar
    for (const calendarUrl of calendars) {
      const eventsInCalendar = await fetchAppleCalendarEvents(
        calendarUrl,
        icloudEmail,
        appPassword
      )

      for (const event of eventsInCalendar) {
        try {
          const { data: parentData } = await supabase
            .from('parents')
            .select('household_id')
            .eq('id', connection.parent_id)
            .single()

          if (!parentData) continue

          // Upsert event
          await supabase.from('calendar_events').upsert(
            [
              {
                parent_id: connection.parent_id,
                household_id: parentData.household_id,
                title: event.summary,
                start_at: event.dtstart,
                end_at: event.dtend,
                is_all_day: isAllDayEvent(event),
                location: event.location || null,
                is_shared: event.class !== 'PRIVATE',
                is_work_event: false,
                external_id: event.uid,
                external_source: 'apple',
                external_calendar_id: calendarUrl,
                sync_status: 'synced',
              },
            ],
            {
              onConflict: 'external_id',
            }
          )

          eventsImported++
        } catch (error) {
          console.error('Error upserting Apple event:', error)
        }
      }
    }

    // Update connection status
    await supabase
      .from('calendar_connections')
      .update({
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', connectionId)

    return {
      success: true,
      eventsImported,
    }
  } catch (error) {
    console.error('Error polling Apple Calendar:', error)
    return {
      success: false,
      eventsImported: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Discover Apple calendar principal (home collection)
 */
async function discoverAppleCalendarPrincipal(
  icloudEmail: string,
  appPassword: string
): Promise<string | null> {
  try {
    const authHeader = `Basic ${Buffer.from(`${icloudEmail}:${appPassword}`).toString('base64')}`

    const response = await fetch('https://caldav.icloud.com/.well-known/caldav', {
      method: 'PROPFIND',
      headers: {
        Authorization: authHeader,
        Depth: '0',
      },
    })

    if (!response.ok) {
      return null
    }

    // Parse response to find principal URL
    // In production, parse XML properly
    const text = await response.text()

    // Extract href with regex (simplified)
    const match = text.match(/<D:href>(.*?)<\/D:href>/i)
    return match ? match[1] : null
  } catch (error) {
    console.error('Error discovering Apple calendar principal:', error)
    return null
  }
}

/**
 * Discover all calendars under a principal
 */
async function discoverAppleCalendars(
  principalUrl: string,
  icloudEmail: string,
  appPassword: string
): Promise<string[]> {
  try {
    const authHeader = `Basic ${Buffer.from(`${icloudEmail}:${appPassword}`).toString('base64')}`

    const response = await fetch(`https://caldav.icloud.com${principalUrl}`, {
      method: 'PROPFIND',
      headers: {
        Authorization: authHeader,
        Depth: '1',
      },
    })

    if (!response.ok) {
      return []
    }

    const text = await response.text()

    // Extract all calendar URLs
    // In production, parse XML properly
    const matches = text.match(/<D:href>(.*?calendar.*?)<\/D:href>/gi) || []

    return matches.map((match) => {
      const href = match.replace(/<D:href>(.*?)<\/D:href>/i, '$1')
      return href.startsWith('http') ? href : `https://caldav.icloud.com${href}`
    })
  } catch (error) {
    console.error('Error discovering Apple calendars:', error)
    return []
  }
}

/**
 * Fetch events from a single Apple calendar
 */
async function fetchAppleCalendarEvents(
  calendarUrl: string,
  icloudEmail: string,
  appPassword: string
): Promise<ICalEvent[]> {
  try {
    const authHeader = `Basic ${Buffer.from(`${icloudEmail}:${appPassword}`).toString('base64')}`

    // Build time range: last 6 months to 1 year future
    const now = new Date()
    const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000)
    const oneYearFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)

    // CalDAV REPORT request
    const response = await fetch(calendarUrl, {
      method: 'REPORT',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'text/xml; charset="utf-8"',
        Depth: '1',
      },
      body: `<?xml version="1.0" encoding="utf-8" ?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag/>
    <C:calendar-data/>
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${sixMonthsAgo.toISOString()}" end="${oneYearFuture.toISOString()}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`,
    })

    if (!response.ok) {
      console.error(`Failed to fetch calendar events: ${response.statusText}`)
      return []
    }

    const text = await response.text()

    // Parse .ics data from response
    // In production, use proper XML parsing
    const events: ICalEvent[] = []

    // Extract VCALENDAR blocks
    const calendarMatches = text.match(/<C:calendar-data>[\s\S]*?<\/C:calendar-data>/gi) || []

    for (const calendarBlock of calendarMatches) {
      const icsData = calendarBlock
        .replace(/<C:calendar-data>/i, '')
        .replace(/<\/C:calendar-data>/i, '')
        .trim()

      // Parse individual events from ICS
      const veventMatches = icsData.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/gi) || []

      for (const veventBlock of veventMatches) {
        try {
          const event = parseICalEvent(veventBlock)
          if (event) {
            events.push(event)
          }
        } catch (error) {
          console.error('Error parsing iCal event:', error)
        }
      }
    }

    return events
  } catch (error) {
    console.error('Error fetching Apple calendar events:', error)
    return []
  }
}

/**
 * Parse a single VEVENT from iCalendar format
 * Simplified parser — in production, use ical.js library
 */
function parseICalEvent(veventBlock: string): ICalEvent | null {
  try {
    const uid = extractICalProperty(veventBlock, 'UID')
    const summary = extractICalProperty(veventBlock, 'SUMMARY')
    const location = extractICalProperty(veventBlock, 'LOCATION')
    const description = extractICalProperty(veventBlock, 'DESCRIPTION')
    const dtstart = extractICalProperty(veventBlock, 'DTSTART')
    const dtend = extractICalProperty(veventBlock, 'DTEND')
    const dtstamp = extractICalProperty(veventBlock, 'DTSTAMP')
    const classVal = extractICalProperty(veventBlock, 'CLASS') || 'PUBLIC'

    if (!uid || !summary || !dtstart || !dtend) {
      return null
    }

    return {
      uid,
      summary,
      location,
      description,
      dtstart: formatICalDate(dtstart),
      dtend: formatICalDate(dtend),
      dtstamp,
      class: (classVal as any) || 'PUBLIC',
    }
  } catch (error) {
    console.error('Error parsing iCal event:', error)
    return null
  }
}

/**
 * Extract a property value from iCalendar data
 */
function extractICalProperty(icalData: string, propertyName: string): string | null {
  const regex = new RegExp(`^${propertyName}(?:;[^:]*)?:(.*)$`, 'm')
  const match = icalData.match(regex)
  return match ? match[1].trim() : null
}

/**
 * Format iCalendar date to ISO string
 * Handles both DTSTART:20260402 and DTSTART:20260402T093000Z
 */
function formatICalDate(icalDate: string): string {
  if (!icalDate) return new Date().toISOString()

  // Remove any timezone info for MVP
  const dateOnly = icalDate.replace(/[TZ]/g, ' ').trim()

  try {
    // Handle format: 20260402 or 20260402T093000
    if (dateOnly.match(/^\d{8}/)) {
      const year = parseInt(dateOnly.substring(0, 4))
      const month = parseInt(dateOnly.substring(4, 6)) - 1
      const day = parseInt(dateOnly.substring(6, 8))

      let hours = 0,
        minutes = 0,
        seconds = 0

      if (dateOnly.length > 8) {
        const timePart = dateOnly.substring(9)
        hours = parseInt(timePart.substring(0, 2)) || 0
        minutes = parseInt(timePart.substring(2, 4)) || 0
        seconds = parseInt(timePart.substring(4, 6)) || 0
      }

      const date = new Date(year, month, day, hours, minutes, seconds)
      return date.toISOString()
    }
  } catch (error) {
    console.error('Error formatting iCal date:', error)
  }

  return new Date().toISOString()
}

/**
 * Check if event is all-day (no time component)
 */
function isAllDayEvent(event: ICalEvent): boolean {
  return event.dtstart.length === 10 // YYYY-MM-DD format only
}

// ============================================================================
// EVENT OPERATIONS
// ============================================================================

/**
 * Push event to Apple Calendar
 * HTTP PUT of .ics to the CalDAV endpoint
 */
export async function pushEventToApple(
  event: CalendarEvent,
  connectionId: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const { data: connection, error: fetchError } = await supabase
      .from('calendar_connections')
      .select()
      .eq('id', connectionId)
      .single()

    if (fetchError || !connection) {
      throw new Error('Calendar connection not found')
    }

    const appPassword = Buffer.from(connection.access_token || '', 'base64').toString('utf-8')
    const icloudEmail = connection.calendar_id

    if (!appPassword || !icloudEmail) {
      throw new Error('Missing credentials')
    }

    const authHeader = `Basic ${Buffer.from(`${icloudEmail}:${appPassword}`).toString('base64')}`

    // Generate unique UID if not present
    const uid = event.external_id || `${event.id}@kin.family`

    // Build .ics data
    const icsData = buildICalEvent(event, uid)

    // Determine calendar URL (use principal calendar)
    const calendarUrl = `https://caldav.icloud.com/principals/calendars/${icloudEmail}/`

    const response = await fetch(calendarUrl, {
      method: 'PUT',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'text/calendar; charset=utf-8',
      },
      body: icsData,
    })

    if (!response.ok) {
      throw new Error(`Failed to push event: ${response.statusText}`)
    }

    // Update event with external_id if needed
    if (!event.external_id) {
      await supabase
        .from('calendar_events')
        .update({
          external_id: uid,
          external_source: 'apple',
          sync_status: 'synced',
        })
        .eq('id', event.id)
    }

    return {
      success: true,
    }
  } catch (error) {
    console.error('Error pushing event to Apple:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Build .ics event data
 */
function buildICalEvent(event: CalendarEvent, uid: string): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Kin AI//Kin Family Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now}
DTSTART:${event.start_at.replace(/[-:]/g, '').replace(/\.\d{3}Z?/, '')}
DTEND:${event.end_at.replace(/[-:]/g, '').replace(/\.\d{3}Z?/, '')}
SUMMARY:${escapeICalText(event.title)}
DESCRIPTION:${event.location ? escapeICalText(event.location) : ''}
LOCATION:${event.location ? escapeICalText(event.location) : ''}
CLASS:${event.is_shared ? 'PUBLIC' : 'PRIVATE'}
STATUS:CONFIRMED
TRANSP:OPAQUE
END:VEVENT
END:VCALENDAR`
}

/**
 * Escape special characters in iCalendar text
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/**
 * Delete event from Apple Calendar
 */
export async function deleteEventFromApple(
  externalId: string,
  connectionId: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const { data: connection, error: fetchError } = await supabase
      .from('calendar_connections')
      .select()
      .eq('id', connectionId)
      .single()

    if (fetchError || !connection) {
      throw new Error('Calendar connection not found')
    }

    const appPassword = Buffer.from(connection.access_token || '', 'base64').toString('utf-8')
    const icloudEmail = connection.calendar_id

    if (!appPassword || !icloudEmail) {
      throw new Error('Missing credentials')
    }

    const authHeader = `Basic ${Buffer.from(`${icloudEmail}:${appPassword}`).toString('base64')}`

    // Build event URL (simplified — in production, track actual CalDAV URLs)
    const eventUrl = `https://caldav.icloud.com/principals/calendars/${icloudEmail}/${externalId}.ics`

    const response = await fetch(eventUrl, {
      method: 'DELETE',
      headers: {
        Authorization: authHeader,
      },
    })

    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to delete event: ${response.statusText}`)
    }

    return {
      success: true,
    }
  } catch (error) {
    console.error('Error deleting event from Apple:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// POLLING SCHEDULER
// ============================================================================

/**
 * Schedule recurring poll job (every 15 minutes)
 * Calls pollAppleCalendar() for all active Apple connections
 * In production, use a background job queue (BullMQ, etc.)
 */
export async function scheduleApplePolling(): Promise<void> {
  try {
    // Fetch all active Apple calendar connections
    const { data: connections, error } = await supabase
      .from('calendar_connections')
      .select()
      .eq('provider', 'apple')

    if (error || !connections) {
      console.error('Error fetching Apple connections:', error)
      return
    }

    // Poll each connection
    for (const connection of connections) {
      await pollAppleCalendar(connection.id).catch((err) => {
        console.error(`Error polling calendar ${connection.id}:`, err)
      })
    }

    // Schedule next poll in 15 minutes
    // In production, use a proper job scheduler
    setTimeout(() => {
      scheduleApplePolling().catch(console.error)
    }, 15 * 60 * 1000)
  } catch (error) {
    console.error('Error scheduling Apple polling:', error)
  }
}
