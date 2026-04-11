// Kin AI — Read-Only Work Calendar (Track C1.3)
// Work calendars are connected separately from personal calendars
// They are read-only — Kin never writes to them
// Same Google OAuth flow as personal, but with readonly scope
// Event TITLES are private to the owning parent (never shown to partner)
// Only timing/availability is shared with household view (not titles)
// Author: Lead Engineer (Track C1)
// Date: 2026-04-02

import { supabase } from '../../lib/supabase'
import { initiateGoogleCalendarOAuth, importGoogleEvents } from './google-calendar'
import type { CalendarConnection } from '../../types'

// ============================================================================
// SETUP
// ============================================================================

/**
 * Connect work calendar via Google OAuth
 * Uses readonly scope: https://www.googleapis.com/auth/calendar.readonly
 * Stores connection with is_read_only = true
 */
export async function connectWorkCalendar(parentId: string): Promise<{
  success: boolean
  connectionId?: string
  error?: string
}> {
  try {
    // Initiate OAuth with isWorkCalendar = true
    // This passes readonly scope to the OAuth flow
    const result = await initiateGoogleCalendarOAuth(parentId, true)

    return result
  } catch (error) {
    console.error('Error connecting work calendar:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Sync work calendar events
 * Uses standard importGoogleEvents but marks events with is_work_event = true
 * Note: importGoogleEvents already handles is_work_event based on provider
 */
export async function syncWorkCalendar(connectionId: string): Promise<{
  success: boolean
  eventsImported: number
  error?: string
}> {
  try {
    // Verify connection is work calendar (readonly)
    const { data: connection, error: fetchError } = await supabase
      .from('calendar_connections')
      .select()
      .eq('id', connectionId)
      .single()

    if (fetchError || !connection) {
      throw new Error('Calendar connection not found')
    }

    if (!connection.is_read_only) {
      throw new Error('This is not a work calendar')
    }

    // Import events (same as personal, but is_work_event = true)
    const result = await importGoogleEvents(connectionId)

    return result
  } catch (error) {
    console.error('Error syncing work calendar:', error)
    return {
      success: false,
      eventsImported: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// PRIVACY-RESPECTING QUERIES
// ============================================================================

/**
 * Get work event times for a parent on a given date
 * Returns {start, end}[] with NO titles
 * Used by the household view to show "busy" blocks without revealing content
 */
export async function getWorkEventTimes(
  parentId: string,
  date: string
): Promise<
  Array<{
    start: string
    end: string
  }>
> {
  try {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    // Fetch work events for this parent on this date
    const { data: events, error } = await supabase
      .from('calendar_events')
      .select()
      .eq('parent_id', parentId)
      .eq('is_work_event', true)
      .gte('start_at', startOfDay.toISOString())
      .lte('start_at', endOfDay.toISOString())

    if (error) {
      console.error('Error fetching work event times:', error)
      return []
    }

    if (!events) return []

    // Return only timing, no titles
    return events.map((event) => ({
      start: event.start_at,
      end: event.end_at,
    }))
  } catch (error) {
    console.error('Error getting work event times:', error)
    return []
  }
}

/**
 * Get formatted "busy" block for household calendar view
 * Shows only time range, no event title, for partner's work events
 */
export async function getWorkEventBusyBlock(
  parentId: string,
  date: string
): Promise<
  Array<{
    id: string
    title: string // Always "Busy"
    start_at: string
    end_at: string
    is_work_event: boolean
    is_shared: boolean
  }>
> {
  try {
    const times = await getWorkEventTimes(parentId, date)

    return times.map((time, index) => ({
      id: `work-busy-${parentId}-${index}`,
      title: 'Busy',
      start_at: time.start,
      end_at: time.end,
      is_work_event: true,
      is_shared: false, // Work events are never shared to show titles
    }))
  } catch (error) {
    console.error('Error getting work event busy blocks:', error)
    return []
  }
}

// ============================================================================
// PARTNER PRIVACY FILTER
// ============================================================================

/**
 * Filter calendar events for display to partner
 * Work event titles are hidden (only show "Busy" blocks)
 * Personal private events are hidden completely
 * Only shared events and work busy times appear in household view
 */
export async function getPartnerVisibleEvents(
  householdId: string,
  parentId: string,
  date: string
): Promise<
  Array<{
    id: string
    title: string
    start_at: string
    end_at: string
    is_work_event: boolean
    is_shared: boolean
    location?: string
  }>
> {
  try {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    // Fetch events for this parent on this date
    const { data: events, error } = await supabase
      .from('calendar_events')
      .select()
      .eq('parent_id', parentId)
      .eq('household_id', householdId)
      .gte('start_at', startOfDay.toISOString())
      .lte('start_at', endOfDay.toISOString())

    if (error) {
      console.error('Error fetching events:', error)
      return []
    }

    if (!events) return []

    // Filter and transform for partner visibility
    const visibleEvents = events
      .filter((event) => {
        // Hide private personal events
        if (!event.is_shared && !event.is_work_event) {
          return false
        }

        return true
      })
      .map((event) => {
        // Replace work event titles with "Busy"
        if (event.is_work_event) {
          return {
            id: event.id,
            title: 'Busy',
            start_at: event.start_at,
            end_at: event.end_at,
            is_work_event: true,
            is_shared: false,
          }
        }

        // Shared events shown in full
        return {
          id: event.id,
          title: event.title,
          start_at: event.start_at,
          end_at: event.end_at,
          is_work_event: false,
          is_shared: event.is_shared,
          location: event.location,
        }
      })

    return visibleEvents
  } catch (error) {
    console.error('Error getting partner visible events:', error)
    return []
  }
}

// ============================================================================
// CONFLICT DETECTION WITH WORK CALENDARS
// ============================================================================

/**
 * Check if parent has work conflict at a given time
 * Returns true if parent has any work event during this time
 * Used for conflict detection: pickup at 3:30, but parent busy 3:00-4:00
 */
export async function hasWorkConflict(
  parentId: string,
  startTime: string,
  endTime: string
): Promise<boolean> {
  try {
    const start = new Date(startTime)
    const end = new Date(endTime)

    // Fetch work events that overlap with this time
    const { data: events, error } = await supabase
      .from('calendar_events')
      .select()
      .eq('parent_id', parentId)
      .eq('is_work_event', true)

    if (error || !events) {
      return false
    }

    // Check for overlap
    for (const event of events) {
      const eventStart = new Date(event.start_at)
      const eventEnd = new Date(event.end_at)

      // Events overlap if: eventStart < end AND start < eventEnd
      if (eventStart < end && start < eventEnd) {
        return true
      }
    }

    return false
  } catch (error) {
    console.error('Error checking work conflict:', error)
    return false
  }
}

/**
 * Get summary of parent's work day
 * Returns: meeting count, first meeting time, has back-to-back meetings
 */
export async function getWorkDaySummary(
  parentId: string,
  date: string
): Promise<{
  meetingCount: number
  firstMeetingTime?: string
  hasBackToBack: boolean
  busyTimeBlocks: Array<{
    start_at: string
    end_at: string
  }>
}> {
  try {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const { data: events, error } = await supabase
      .from('calendar_events')
      .select()
      .eq('parent_id', parentId)
      .eq('is_work_event', true)
      .gte('start_at', startOfDay.toISOString())
      .lte('end_at', endOfDay.toISOString())
      .order('start_at', { ascending: true })

    if (error || !events) {
      return {
        meetingCount: 0,
        hasBackToBack: false,
        busyTimeBlocks: [],
      }
    }

    // Detect back-to-back (events with no gap between them)
    let hasBackToBack = false
    for (let i = 0; i < events.length - 1; i++) {
      const current = new Date(events[i].end_at)
      const next = new Date(events[i + 1].start_at)

      // If next meeting starts within 15 minutes of current ending
      const gapMinutes = (next.getTime() - current.getTime()) / (1000 * 60)
      if (gapMinutes < 15) {
        hasBackToBack = true
        break
      }
    }

    return {
      meetingCount: events.length,
      firstMeetingTime: events.length > 0 ? events[0].start_at : undefined,
      hasBackToBack,
      busyTimeBlocks: events.map((e) => ({
        start_at: e.start_at,
        end_at: e.end_at,
      })),
    }
  } catch (error) {
    console.error('Error getting work day summary:', error)
    return {
      meetingCount: 0,
      hasBackToBack: false,
      busyTimeBlocks: [],
    }
  }
}
