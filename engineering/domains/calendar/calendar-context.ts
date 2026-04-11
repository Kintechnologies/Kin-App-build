// Kin AI — Calendar Context for Morning Briefing Engine (Track D Dependency)
// Track D (morning briefing) calls this module to get calendar context
// Returns pre-formatted strings for injection into Claude briefing prompt
// Author: Lead Engineer (Track C1)
// Date: 2026-04-02

import { supabase } from '../../lib/supabase'
import { getPartnerVisibleEvents, getWorkDaySummary } from './work-calendar'
import { getHouseholdCalendarForDay, getConflictsForDate } from './household-calendar'
import type { Parent, CalendarEvent, ChildActivity } from '../../types'

// ============================================================================
// MAIN API FOR TRACK D
// ============================================================================

/**
 * Get today's complete calendar summary for a parent
 * Returns pre-formatted string for injection into Claude briefing prompt
 * Called by: engineering/supabase/functions/morning-briefing
 *
 * Returns: string ready to inject into briefing:
 * "Your 9:30 team sync is in 3 hours. Your wife's 6pm runs late — you've got pickup."
 */
export async function getTodayCalendarSummary(parentId: string): Promise<string> {
  try {
    // Get parent and household
    const { data: parent, error: parentError } = await supabase
      .from('parents')
      .select()
      .eq('id', parentId)
      .single()

    if (parentError || !parent) {
      return ''
    }

    const { data: household, error: householdError } = await supabase
      .from('households')
      .select()
      .eq('id', parent.household_id)
      .single()

    if (householdError || !household) {
      return ''
    }

    // Get today's date
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    // Fetch all calendar data in parallel
    const [
      personalEvents,
      workDaySummary,
      partnerVisibleEvents,
      partnerWorkDaySummary,
      householdEvents,
      conflicts,
    ] = await Promise.all([
      getParentPersonalEvents(parentId, todayStr),
      getWorkDaySummary(parentId, todayStr),
      getPartnerVisibleEventsForParent(parent.household_id, parentId, todayStr),
      getPartnerWorkDaySummary(parent.household_id, parentId, todayStr),
      getHouseholdCalendarForDay(parent.household_id, todayStr),
      getConflictsForDate(parent.household_id, todayStr),
    ])

    // Get partner name
    const { data: partner } = await supabase
      .from('parents')
      .select('name')
      .eq('household_id', parent.household_id)
      .neq('id', parentId)
      .single()

    const partnerName = partner?.name || 'Your partner'

    // Build summary string
    let summary = ''

    // Next event in next 2 hours
    const nextEvent = getNextUpcomingEvent(personalEvents, today)
    if (nextEvent) {
      const timeUntil = getTimeUntilEvent(today, new Date(nextEvent.start_at))
      summary += `Your ${nextEvent.title} is in ${timeUntil}. `
    }

    // Work meeting summary
    if (workDaySummary.meetingCount > 0) {
      summary += `You have ${workDaySummary.meetingCount} meeting${workDaySummary.meetingCount > 1 ? 's' : ''} today`

      if (workDaySummary.hasBackToBack) {
        summary += ' (back-to-back)'
      }

      if (workDaySummary.firstMeetingTime) {
        const firstMeetingTime = new Date(workDaySummary.firstMeetingTime)
        summary += ` starting at ${formatTime(firstMeetingTime)}`
      }

      summary += '. '
    }

    // Partner's schedule
    if (partnerVisibleEvents.length > 0) {
      const partnerNextEvent = getNextUpcomingEvent(partnerVisibleEvents, today)
      if (partnerNextEvent) {
        summary += `${partnerName}'s ${partnerNextEvent.title} is at ${formatTime(new Date(partnerNextEvent.start_at))}. `
      }
    }

    // Conflicts
    if (conflicts.length > 0) {
      const highSeverityConflicts = conflicts.filter((c) => c.severity === 'high')
      if (highSeverityConflicts.length > 0) {
        summary += `⚠️ ${highSeverityConflicts[0].description} `
      }
    }

    // Kids' activities
    const kidsActivities = householdEvents.filter((e) => e.owner === 'kid')
    if (kidsActivities.length > 0) {
      summary += `Kids have activities: ${kidsActivities.map((a) => `${a.ownerName}'s ${a.title}`).join(', ')}. `
    }

    return summary.trim()
  } catch (error) {
    console.error('Error getting calendar summary:', error)
    return ''
  }
}

/**
 * Get detailed calendar context for morning briefing
 * Returns structured data (not just text) for Track D to use
 */
export async function getCalendarContextForBriefing(parentId: string): Promise<{
  todaySummary: string
  upcomingEvents: Array<{
    title: string
    time: string
    location?: string
    type: 'personal' | 'work' | 'shared' | 'kids'
  }>
  conflicts: Array<{
    type: string
    description: string
  }>
  workDayIntensity: 'light' | 'moderate' | 'heavy'
  hasEarlyStart: boolean
  hasLateEnd: boolean
}> {
  try {
    const { data: parent } = await supabase
      .from('parents')
      .select()
      .eq('id', parentId)
      .single()

    if (!parent) {
      return {
        todaySummary: '',
        upcomingEvents: [],
        conflicts: [],
        workDayIntensity: 'light',
        hasEarlyStart: false,
        hasLateEnd: false,
      }
    }

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    const [
      personalEvents,
      workDaySummary,
      householdEvents,
      conflicts,
    ] = await Promise.all([
      getParentPersonalEvents(parentId, todayStr),
      getWorkDaySummary(parentId, todayStr),
      getHouseholdCalendarForDay(parent.household_id, todayStr),
      getConflictsForDate(parent.household_id, todayStr),
    ])

    // Determine work intensity
    let workDayIntensity: 'light' | 'moderate' | 'heavy' = 'light'
    if (workDaySummary.meetingCount > 5) workDayIntensity = 'heavy'
    else if (workDaySummary.meetingCount > 2) workDayIntensity = 'moderate'

    // Check for early start and late end
    const firstEvent = personalEvents[0]
    const lastEvent = personalEvents[personalEvents.length - 1]

    const hasEarlyStart = firstEvent && new Date(firstEvent.start_at).getHours() < 7
    const hasLateEnd = lastEvent && new Date(lastEvent.end_at).getHours() > 18

    // Format upcoming events
    const upcomingEvents = personalEvents.slice(0, 3).map((event) => ({
      title: event.title,
      time: formatTime(new Date(event.start_at)),
      location: event.location,
      type: event.is_work_event ? ('work' as const) : ('personal' as const),
    }))

    const todaySummary = await getTodayCalendarSummary(parentId)

    return {
      todaySummary,
      upcomingEvents,
      conflicts: conflicts.map((c) => ({
        type: c.type,
        description: c.description,
      })),
      workDayIntensity,
      hasEarlyStart,
      hasLateEnd,
    }
  } catch (error) {
    console.error('Error getting calendar context:', error)
    return {
      todaySummary: '',
      upcomingEvents: [],
      conflicts: [],
      workDayIntensity: 'light',
      hasEarlyStart: false,
      hasLateEnd: false,
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get parent's personal events for a day
 * (not work events)
 */
async function getParentPersonalEvents(
  parentId: string,
  dateStr: string
): Promise<CalendarEvent[]> {
  try {
    const startOfDay = new Date(dateStr)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(dateStr)
    endOfDay.setHours(23, 59, 59, 999)

    const { data: events, error } = await supabase
      .from('calendar_events')
      .select()
      .eq('parent_id', parentId)
      .eq('is_work_event', false)
      .gte('start_at', startOfDay.toISOString())
      .lte('start_at', endOfDay.toISOString())
      .order('start_at', { ascending: true })

    if (error) {
      console.error('Error fetching personal events:', error)
      return []
    }

    return events || []
  } catch (error) {
    console.error('Error in getParentPersonalEvents:', error)
    return []
  }
}

/**
 * Get partner's visible events for a parent
 * Hides work event titles
 */
async function getPartnerVisibleEventsForParent(
  householdId: string,
  parentId: string,
  dateStr: string
): Promise<CalendarEvent[]> {
  try {
    // Get partner's ID
    const { data: parent } = await supabase
      .from('parents')
      .select('id')
      .eq('id', parentId)
      .single()

    const { data: partner } = await supabase
      .from('parents')
      .select('id')
      .eq('household_id', householdId)
      .neq('id', parentId)
      .single()

    if (!partner) return []

    // Get partner's events via getPartnerVisibleEvents
    const visibleEvents = await getPartnerVisibleEvents(parent?.id || parentId, dateStr)

    return visibleEvents as any
  } catch (error) {
    console.error('Error getting partner visible events:', error)
    return []
  }
}

/**
 * Get partner's work day summary
 */
async function getPartnerWorkDaySummary(
  householdId: string,
  parentId: string,
  dateStr: string
): Promise<any> {
  try {
    const { data: partner } = await supabase
      .from('parents')
      .select('id')
      .eq('household_id', householdId)
      .neq('id', parentId)
      .single()

    if (!partner) {
      return {
        meetingCount: 0,
        hasBackToBack: false,
        busyTimeBlocks: [],
      }
    }

    return getWorkDaySummary(partner.id, dateStr)
  } catch (error) {
    console.error('Error getting partner work day summary:', error)
    return {
      meetingCount: 0,
      hasBackToBack: false,
      busyTimeBlocks: [],
    }
  }
}

/**
 * Get next upcoming event from a list
 */
function getNextUpcomingEvent(
  events: CalendarEvent[] | any[],
  currentTime: Date
): CalendarEvent | null {
  if (!events || events.length === 0) return null

  for (const event of events) {
    const eventStart = new Date(event.start_at)
    if (eventStart > currentTime) {
      return event
    }
  }

  return null
}

/**
 * Get time until an event (e.g., "3 hours")
 */
function getTimeUntilEvent(now: Date, eventTime: Date): string {
  const diffMs = eventTime.getTime() - now.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))

  if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''}`
  }

  const diffHours = Math.floor(diffMins / 60)
  return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`
}

/**
 * Format time for display (e.g., "9:30 AM")
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}
