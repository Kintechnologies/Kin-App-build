// Kin AI — Google Calendar Webhook Handler (Track C1.1)
// Supabase Edge Function: POST /api/calendar/google/webhook
// Handles real-time Google Calendar push notifications
// When Google sends notification that calendar changed:
// 1. Identify which calendar_connection triggered it (via channel ID)
// 2. Call syncFromGoogle(connectionId) to pull latest changes
// 3. Run conflict detection after sync
// This makes Google Calendar feel "real-time" in Kin
// Author: Lead Engineer (Track C1)
// Date: 2026-04-02

import { createClient } from '@supabase/supabase-js'
import type { CalendarConnection } from '../../types'

// Supabase client for Edge Function context
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// ============================================================================
// TYPES
// ============================================================================

interface GoogleWebhookRequest {
  X_GOOG_CHANNEL_ID?: string
  X_GOOG_CHANNEL_EXPIRATION?: string
  X_GOOG_RESOURCE_STATE?: 'exists' | 'not_exists'
}

// ============================================================================
// WEBHOOK HANDLER
// ============================================================================

/**
 * Handle incoming Google Calendar webhook
 * Expected headers from Google:
 * - X-Goog-Channel-ID: channel ID
 * - X-Goog-Channel-Expiration: expiration timestamp
 * - X-Goog-Resource-State: 'exists' or 'not_exists'
 * - X-Goog-Resource-ID: calendar resource ID
 */
export async function handleGoogleWebhook(
  req: Request
): Promise<Response> {
  try {
    // Google sends a POST with special headers, no body needed
    const channelId = req.headers.get('x-goog-channel-id')
    const resourceState = req.headers.get('x-goog-resource-state')
    const expiration = req.headers.get('x-goog-channel-expiration')

    console.log('Google webhook received:', {
      channelId,
      resourceState,
      expiration,
    })

    // Validate channel ID format: kin-{connectionId}-{timestamp}
    if (!channelId || !channelId.startsWith('kin-')) {
      console.warn('Invalid channel ID:', channelId)
      return new Response('Invalid channel ID', { status: 400 })
    }

    // Extract connection ID from channel ID
    const parts = channelId.split('-')
    if (parts.length < 2) {
      console.warn('Invalid channel ID format:', channelId)
      return new Response('Invalid channel ID format', { status: 400 })
    }

    const connectionId = parts[1]

    // If resource state is 'not_exists', calendar was deleted
    if (resourceState === 'not_exists') {
      await handleCalendarDeleted(connectionId)
      return new Response('Calendar deleted', { status: 200 })
    }

    // If resource state is 'exists', trigger sync
    if (resourceState === 'exists') {
      // Trigger async sync in background
      // Don't wait for it — return 200 immediately to acknowledge receipt
      syncCalendarFromWebhook(connectionId).catch((error) => {
        console.error('Error in background sync:', error)
      })
    }

    // Always return 200 OK to Google
    return new Response('Webhook received', { status: 200 })
  } catch (error) {
    console.error('Error handling Google webhook:', error)
    // Return 200 to prevent Google from retrying
    return new Response('Error processed', { status: 200 })
  }
}

// ============================================================================
// SYNC HANDLER
// ============================================================================

/**
 * Trigger incremental sync for a calendar connection
 * Called from webhook handler (background)
 */
async function syncCalendarFromWebhook(connectionId: string): Promise<void> {
  try {
    // Fetch connection
    const { data: connection, error: fetchError } = await supabase
      .from('calendar_connections')
      .select()
      .eq('id', connectionId)
      .single()

    if (fetchError || !connection) {
      console.error('Calendar connection not found:', connectionId)
      return
    }

    // Update status to pending
    await supabase
      .from('calendar_connections')
      .update({
        sync_status: 'pending',
      })
      .eq('id', connectionId)

    // Import events (MVP uses full import, not incremental)
    // In production, implement proper syncToken-based incremental sync
    await importGoogleEventsFromConnection(connection)

    // After sync, run conflict detection
    const { data: parentData } = await supabase
      .from('parents')
      .select('household_id')
      .eq('id', connection.parent_id)
      .single()

    if (parentData) {
      await detectHouseholdConflicts(parentData.household_id)
    }

    // Update status to synced
    await supabase
      .from('calendar_connections')
      .update({
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', connectionId)

    console.log('Calendar synced successfully:', connectionId)
  } catch (error) {
    console.error('Error syncing calendar:', error)

    // Update status to error
    await supabase
      .from('calendar_connections')
      .update({
        sync_status: 'error',
      })
      .eq('id', connectionId)
  }
}

/**
 * Import events for a calendar connection
 * (Backend version of google-calendar.ts importGoogleEvents)
 */
async function importGoogleEventsFromConnection(
  connection: CalendarConnection
): Promise<void> {
  const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

  try {
    // Build time range: last 6 months to future
    const now = new Date()
    const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000)

    const params = new URLSearchParams({
      maxResults: '250',
      singleEvents: 'true',
      timeMin: sixMonthsAgo.toISOString(),
      orderBy: 'startTime',
    })

    const url = `${GOOGLE_CALENDAR_API}/calendars/${
      connection.calendar_id || 'primary'
    }/events?${params.toString()}`

    // Fetch with current access token
    let response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${connection.access_token}`,
      },
    })

    // Handle token expiry
    if (response.status === 401) {
      // Refresh token via backend function
      const tokenResponse = await refreshGoogleTokenBackend(connection.id)
      if (!tokenResponse.success) {
        throw new Error('Failed to refresh token')
      }

      response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${tokenResponse.accessToken}`,
        },
      })
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.statusText}`)
    }

    const data = await response.json()
    const events = data.items || []

    // Get parent's household
    const { data: parentData } = await supabase
      .from('parents')
      .select('household_id')
      .eq('id', connection.parent_id)
      .single()

    if (!parentData) return

    // Upsert events
    for (const googleEvent of events) {
      try {
        const startTime = googleEvent.start?.dateTime || googleEvent.start?.date
        const endTime = googleEvent.end?.dateTime || googleEvent.end?.date

        if (!startTime || !endTime) continue

        const isAllDay = !googleEvent.start?.dateTime

        await supabase.from('calendar_events').upsert(
          [
            {
              parent_id: connection.parent_id,
              household_id: parentData.household_id,
              title: googleEvent.summary || '(No title)',
              start_at: startTime,
              end_at: endTime,
              is_all_day: isAllDay,
              location: googleEvent.location || null,
              is_shared: googleEvent.visibility !== 'private',
              is_work_event: connection.provider === 'work_google',
              external_id: googleEvent.id,
              external_source: 'google',
              external_calendar_id: connection.calendar_id,
              sync_status: 'synced',
            },
          ],
          {
            onConflict: 'external_id',
          }
        )
      } catch (error) {
        console.error('Error upserting event:', error)
      }
    }
  } catch (error) {
    console.error('Error importing Google events:', error)
    throw error
  }
}

/**
 * Refresh Google token (backend version)
 */
async function refreshGoogleTokenBackend(connectionId: string): Promise<{
  success: boolean
  accessToken?: string
  error?: string
}> {
  try {
    const { data: connection, error: fetchError } = await supabase
      .from('calendar_connections')
      .select()
      .eq('id', connectionId)
      .single()

    if (fetchError || !connection?.refresh_token) {
      return {
        success: false,
        error: 'No refresh token',
      }
    }

    // Call Google's token endpoint
    const tokenUrl = 'https://oauth2.googleapis.com/token'
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
        refresh_token: connection.refresh_token,
        grant_type: 'refresh_token',
      }).toString(),
    })

    if (!response.ok) {
      return {
        success: false,
        error: `Token refresh failed: ${response.statusText}`,
      }
    }

    const { access_token } = await response.json()

    // Update in database
    await supabase
      .from('calendar_connections')
      .update({
        access_token,
      })
      .eq('id', connectionId)

    return {
      success: true,
      accessToken: access_token,
    }
  } catch (error) {
    console.error('Error refreshing token:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// CONFLICT DETECTION
// ============================================================================

/**
 * Run conflict detection on household calendar after sync
 * Called after each Google Calendar sync to detect scheduling conflicts
 */
async function detectHouseholdConflicts(householdId: string): Promise<void> {
  try {
    // Get today's merged household calendar
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Fetch household calendar events
    const { data: events } = await supabase
      .from('calendar_events')
      .select()
      .eq('household_id', householdId)
      .gte('start_at', today.toISOString())
      .lt('start_at', tomorrow.toISOString())

    if (!events || events.length === 0) {
      return
    }

    // Get both parents in household
    const { data: parents } = await supabase
      .from('parents')
      .select()
      .eq('household_id', householdId)

    if (!parents || parents.length < 2) {
      return
    }

    // Check for conflicts
    const parent1Events = events.filter((e) => e.parent_id === parents[0].id)
    const parent2Events = events.filter((e) => e.parent_id === parents[1].id)

    // Detect overlapping times
    for (const event1 of parent1Events) {
      for (const event2 of parent2Events) {
        if (event1.is_shared && event2.is_shared && eventsOverlap(event1, event2)) {
          console.warn('Conflict detected:', {
            parent1: parents[0].name,
            parent2: parents[1].name,
            event1: event1.title,
            event2: event2.title,
          })
        }
      }
    }
  } catch (error) {
    console.error('Error detecting conflicts:', error)
  }
}

/**
 * Check if two events overlap in time
 */
function eventsOverlap(
  event1: { start_at: string; end_at: string },
  event2: { start_at: string; end_at: string }
): boolean {
  const start1 = new Date(event1.start_at)
  const end1 = new Date(event1.end_at)
  const start2 = new Date(event2.start_at)
  const end2 = new Date(event2.end_at)

  return start1 < end2 && start2 < end1
}

/**
 * Handle calendar deletion notification
 */
async function handleCalendarDeleted(connectionId: string): Promise<void> {
  try {
    // Mark connection as deleted
    await supabase
      .from('calendar_connections')
      .update({
        sync_status: 'error',
      })
      .eq('id', connectionId)

    console.log('Calendar connection marked as error (deleted):', connectionId)
  } catch (error) {
    console.error('Error handling calendar deletion:', error)
  }
}

/**
 * Export handler for Supabase Edge Function
 */
export const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'POST') {
    return await handleGoogleWebhook(req)
  }

  return new Response('Method not allowed', { status: 405 })
}
