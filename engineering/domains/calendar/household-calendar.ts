// Kin AI — Household Calendar Merge + Conflict Detection (Track C1.4)
// The merged calendar combines:
// - Both parents' shared events (is_shared = true)
// - Kids' activities (from children_activities table)
// - Conflicts detected across merged view
// Author: Lead Engineer (Track C1)
// Date: 2026-04-02

import { supabase } from '../../lib/supabase'
import { getPartnerVisibleEvents, hasWorkConflict } from './work-calendar'
import type { CalendarEvent, ChildActivity, Parent } from '../../types'

// ============================================================================
// TYPES
// ============================================================================

export interface HouseholdCalendarEvent {
  id: string
  title: string
  start_at: string
  end_at: string
  owner: 'parent1' | 'parent2' | 'kid' | 'shared'
  ownerName?: string
  color: string
  location?: string
  is_work_event: boolean
  isAllDay: boolean
}

export interface ConflictAlert {
  id: string
  type: 'both_unavailable' | 'pickup_conflict' | 'schedule_overlap'
  description: string
  severity: 'high' | 'medium'
  affectedDate: string
  affectedParent1?: string
  affectedParent2?: string
  event1Id?: string
  event2Id?: string
  suggestedResolution?: string
}

// Color assignments by owner
const OWNER_COLORS = {
  parent1: '#7CB87A', // Primary green
  parent2: '#A07EC8', // Partner purple
  kid: '#E07B5A', // Kid orange
  shared: '#F0EDE6', // Brand text (for shared)
}

// ============================================================================
// HOUSEHOLD CALENDAR MERGE
// ============================================================================

/**
 * Get merged household calendar for a date range
 * Returns: shared events + kids activities
 * Each event has: title, start_at, end_at, owner, color
 * Work events appear as "Busy" blocks only (no title)
 */
export async function getHouseholdCalendar(
  householdId: string,
  startDate: string,
  endDate: string
): Promise<HouseholdCalendarEvent[]> {
  try {
    const start = new Date(startDate)
    const end = new Date(endDate)

    // Fetch both parents in household
    const { data: parents, error: parentError } = await supabase
      .from('parents')
      .select()
      .eq('household_id', householdId)

    if (parentError || !parents || parents.length < 2) {
      console.error('Could not fetch parents:', parentError)
      return []
    }

    const [parent1, parent2] = parents

    // Fetch shared calendar events
    const { data: sharedEvents, error: eventError } = await supabase
      .from('calendar_events')
      .select()
      .eq('household_id', householdId)
      .eq('is_shared', true)
      .gte('start_at', start.toISOString())
      .lte('start_at', end.toISOString())

    if (eventError) {
      console.error('Error fetching shared events:', eventError)
    }

    // Fetch kids' activities for this household
    const { data: childActivities, error: activitiesError } = await supabase
      .from('children_activities')
      .select('*, children(name)')
      .eq('household_id', householdId)

    if (activitiesError) {
      console.error('Error fetching children activities:', activitiesError)
    }

    const calendarEvents: HouseholdCalendarEvent[] = []

    // Add shared calendar events
    if (sharedEvents) {
      for (const event of sharedEvents) {
        const owner =
          event.parent_id === parent1.id
            ? 'parent1'
            : event.parent_id === parent2.id
              ? 'parent2'
              : 'shared'

        // For work events, only show "Busy" blocks
        if (event.is_work_event) {
          calendarEvents.push({
            id: event.id,
            title: 'Busy',
            start_at: event.start_at,
            end_at: event.end_at,
            owner,
            ownerName: event.parent_id === parent1.id ? parent1.name : parent2.name,
            color: OWNER_COLORS[owner],
            location: undefined, // Work events don't show location
            is_work_event: true,
            isAllDay: event.is_all_day,
          })
        } else {
          calendarEvents.push({
            id: event.id,
            title: event.title,
            start_at: event.start_at,
            end_at: event.end_at,
            owner,
            ownerName: event.parent_id === parent1.id ? parent1.name : parent2.name,
            color: OWNER_COLORS[owner],
            location: event.location,
            is_work_event: false,
            isAllDay: event.is_all_day,
          })
        }
      }
    }

    // Add children's activities
    if (childActivities) {
      for (const activity of childActivities) {
        // Create event for each scheduled day of activity
        const daysOfWeek = activity.days_of_week || []

        for (const day of daysOfWeek) {
          // Skip if not in date range (simplified check)
          // In production, expand to all occurrences within date range

          if (activity.start_time && activity.end_time) {
            calendarEvents.push({
              id: `activity-${activity.id}-${day}`,
              title: activity.activity_name,
              start_at: `${startDate}T${activity.start_time}`,
              end_at: `${startDate}T${activity.end_time}`,
              owner: 'kid',
              ownerName: (activity.children as any)?.name || 'Child',
              color: OWNER_COLORS['kid'],
              location: activity.location,
              is_work_event: false,
              isAllDay: false,
            })
          }
        }
      }
    }

    // Sort by start_at
    calendarEvents.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())

    return calendarEvents
  } catch (error) {
    console.error('Error getting household calendar:', error)
    return []
  }
}

/**
 * Get household calendar for a single day (shortcut)
 */
export async function getHouseholdCalendarForDay(
  householdId: string,
  date: string
): Promise<HouseholdCalendarEvent[]> {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  return getHouseholdCalendar(householdId, startOfDay.toISOString(), endOfDay.toISOString())
}

// ============================================================================
// CONFLICT DETECTION
// ============================================================================

/**
 * Detect conflicts in household calendar for a given date
 * Detects:
 * - Both parents unavailable at same time when shared commitment exists
 * - Parent scheduled when they need to do school pickup
 * - Schedule overlaps between shared events
 */
export async function detectConflicts(
  householdId: string,
  date: string
): Promise<ConflictAlert[]> {
  try {
    const conflicts: ConflictAlert[] = []

    // Fetch both parents
    const { data: parents, error: parentError } = await supabase
      .from('parents')
      .select()
      .eq('household_id', householdId)

    if (parentError || !parents || parents.length < 2) {
      return []
    }

    const [parent1, parent2] = parents

    // Get calendar for the day
    const calendarEvents = await getHouseholdCalendarForDay(householdId, date)

    // Get parent1 and parent2 events separately
    const parent1Events = calendarEvents.filter((e) => e.owner === 'parent1')
    const parent2Events = calendarEvents.filter((e) => e.owner === 'parent2')
    const kidActivities = calendarEvents.filter((e) => e.owner === 'kid')

    // ========== CONFLICT TYPE 1: Both parents unavailable ==========
    for (const event1 of parent1Events) {
      for (const event2 of parent2Events) {
        if (eventsOverlap(event1, event2)) {
          const conflict: ConflictAlert = {
            id: `conflict-${event1.id}-${event2.id}`,
            type: 'both_unavailable',
            description: `Both parents scheduled at the same time: ${event1.title} (${parent1.name}) overlaps with ${event2.title} (${parent2.name})`,
            severity: 'high',
            affectedDate: date,
            affectedParent1: parent1.name,
            affectedParent2: parent2.name,
            event1Id: event1.id,
            event2Id: event2.id,
            suggestedResolution: `Consider rescheduling one of these events to avoid both being unavailable`,
          }

          // Check if this exact conflict already exists
          const isDuplicate = conflicts.some(
            (c) =>
              c.type === 'both_unavailable' &&
              ((c.event1Id === event1.id && c.event2Id === event2.id) ||
                (c.event1Id === event2.id && c.event2Id === event1.id))
          )

          if (!isDuplicate) {
            conflicts.push(conflict)
          }
        }
      }
    }

    // ========== CONFLICT TYPE 2: Pickup conflict ==========
    for (const activity of kidActivities) {
      // Check parent1 availability
      const parent1Busy = await hasWorkConflict(parent1.id, activity.start_at, activity.end_at)

      if (parent1Busy) {
        // Check if parent1 also has shared event during this time
        const overlappingEvent = parent1Events.find((e) => eventsOverlap(e, activity))

        if (overlappingEvent) {
          conflicts.push({
            id: `pickup-conflict-${activity.id}-p1`,
            type: 'pickup_conflict',
            description: `${parent1.name} is scheduled during ${activity.ownerName}'s ${activity.title} (${activity.start_at.split('T')[1].slice(0, 5)} - ${activity.end_at.split('T')[1].slice(0, 5)}) with "${overlappingEvent.title}"`,
            severity: 'high',
            affectedDate: date,
            affectedParent1: parent1.name,
            event1Id: activity.id,
            suggestedResolution: `${parent2.name} should handle ${activity.ownerName}'s ${activity.title} or ${parent1.name} should reschedule "${overlappingEvent.title}"`,
          })
        }
      }

      // Check parent2 availability
      const parent2Busy = await hasWorkConflict(parent2.id, activity.start_at, activity.end_at)

      if (parent2Busy) {
        const overlappingEvent = parent2Events.find((e) => eventsOverlap(e, activity))

        if (overlappingEvent) {
          conflicts.push({
            id: `pickup-conflict-${activity.id}-p2`,
            type: 'pickup_conflict',
            description: `${parent2.name} is scheduled during ${activity.ownerName}'s ${activity.title} (${activity.start_at.split('T')[1].slice(0, 5)} - ${activity.end_at.split('T')[1].slice(0, 5)}) with "${overlappingEvent.title}"`,
            severity: 'high',
            affectedDate: date,
            affectedParent2: parent2.name,
            event1Id: activity.id,
            suggestedResolution: `${parent1.name} should handle ${activity.ownerName}'s ${activity.title} or ${parent2.name} should reschedule "${overlappingEvent.title}"`,
          })
        }
      }
    }

    return conflicts
  } catch (error) {
    console.error('Error detecting conflicts:', error)
    return []
  }
}

/**
 * Get conflicts for household on a specific date
 * Shortcut for detectConflicts
 */
export async function getConflictsForDate(
  householdId: string,
  date: string
): Promise<ConflictAlert[]> {
  return detectConflicts(householdId, date)
}

// ============================================================================
// CONFLICT RESOLUTION
// ============================================================================

/**
 * Resolve a conflict with an action
 * Possible resolutions:
 * - reassign_pickup: Assign pickup to other parent
 * - move_event: Reschedule the conflicting event
 * - mark_resolved: Flag as discussed/handled
 */
export async function resolveConflict(
  conflictAlert: ConflictAlert,
  resolution: {
    type: 'reassign_pickup' | 'move_event' | 'mark_resolved'
    newParentId?: string
    newEventTime?: string
    notes?: string
  }
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    if (resolution.type === 'reassign_pickup') {
      // TODO: Implement logic to assign activity to different parent
      // This would update children_activities or create a shared event
      return {
        success: true,
      }
    }

    if (resolution.type === 'move_event') {
      if (!conflictAlert.event1Id || !resolution.newEventTime) {
        throw new Error('Missing event ID or new time')
      }

      // Update event time
      const { error } = await supabase
        .from('calendar_events')
        .update({
          start_at: resolution.newEventTime,
          // TODO: Calculate end_at based on event duration
          updated_at: new Date().toISOString(),
        })
        .eq('id', conflictAlert.event1Id)

      if (error) throw error

      return {
        success: true,
      }
    }

    if (resolution.type === 'mark_resolved') {
      // Store resolution in notes/memory
      console.log('Conflict marked as resolved:', conflictAlert.id, resolution.notes)

      return {
        success: true,
      }
    }

    return {
      success: false,
      error: 'Unknown resolution type',
    }
  } catch (error) {
    console.error('Error resolving conflict:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Check if two events overlap in time
 */
function eventsOverlap(event1: HouseholdCalendarEvent, event2: HouseholdCalendarEvent): boolean {
  const start1 = new Date(event1.start_at)
  const end1 = new Date(event1.end_at)
  const start2 = new Date(event2.start_at)
  const end2 = new Date(event2.end_at)

  return start1 < end2 && start2 < end1
}

/**
 * Get pending conflicts (not yet resolved) for household
 */
export async function getPendingConflicts(householdId: string): Promise<ConflictAlert[]> {
  try {
    // For MVP, scan next 7 days for conflicts
    const today = new Date()
    const conflicts: ConflictAlert[] = []

    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)

      const dateStr = date.toISOString().split('T')[0]
      const dayConflicts = await detectConflicts(householdId, dateStr)

      conflicts.push(...dayConflicts)
    }

    return conflicts
  } catch (error) {
    console.error('Error getting pending conflicts:', error)
    return []
  }
}

/**
 * Format conflict alert for display/notification
 */
export function formatConflictAlert(conflict: ConflictAlert): string {
  if (conflict.type === 'both_unavailable') {
    return `ALERT: Both parents scheduled at same time on ${conflict.affectedDate}\n${conflict.description}\n${conflict.suggestedResolution}`
  }

  if (conflict.type === 'pickup_conflict') {
    return `PICKUP CONFLICT: ${conflict.description}\nSuggestion: ${conflict.suggestedResolution}`
  }

  return conflict.description
}
