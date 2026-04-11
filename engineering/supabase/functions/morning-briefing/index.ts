// Kin AI — Morning Briefing Edge Function
// Generates and sends briefings to all parents at their scheduled time
// Runs on a cron schedule, managed by Supabase
// Author: Lead Engineer
// Date: 2026-04-02

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.17'

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_KEY')!
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const MODEL = 'claude-sonnet-4-20250514'

// ============================================================================
// TYPES
// ============================================================================

interface Parent {
  id: string
  household_id: string
  name: string
  email: string
  timezone: string
  briefing_time: string
}

interface PushToken {
  id: string
  parent_id: string
  expo_push_token: string
}

interface PushMessage {
  to: string
  title: string
  body: string
  sound?: string
  priority?: 'high' | 'normal'
  data?: Record<string, unknown>
}

interface BriefingLog {
  parent_id: string
  parent_name: string
  status: 'success' | 'error'
  message?: string
  timestamp: string
}

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// ============================================================================
// ANTHROPIC CLIENT
// ============================================================================

const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
})

// ============================================================================
// TIMEZONE UTILITIES
// ============================================================================

/**
 * Get the current hour in a specific timezone
 */
function getCurrentHourInTimezone(timezone: string): number {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    hour12: false,
    timeZone: timezone,
  })
  const parts = formatter.formatToParts(now)
  const hour = parts.find((p) => p.type === 'hour')
  return hour ? parseInt(hour.value, 10) : -1
}

/**
 * Get the current minute in a specific timezone
 */
function getCurrentMinuteInTimezone(timezone: string): number {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    minute: '2-digit',
    timeZone: timezone,
  })
  const parts = formatter.formatToParts(now)
  const minute = parts.find((p) => p.type === 'minute')
  return minute ? parseInt(minute.value, 10) : -1
}

/**
 * Check if a parent's briefing time matches current time
 */
function shouldSendBriefing(parent: Parent, toleranceMinutes = 5): boolean {
  const [briefingHour, briefingMinute] = parent.briefing_time.split(':').map((s) => parseInt(s, 10))
  const currentHour = getCurrentHourInTimezone(parent.timezone)
  const currentMinute = getCurrentMinuteInTimezone(parent.timezone)

  // Allow a 5-minute window (e.g., 6:00-6:05 AM)
  if (currentHour !== briefingHour) return false
  if (Math.abs(currentMinute - briefingMinute) <= toleranceMinutes) return true

  return false
}

// ============================================================================
// CONTEXT ASSEMBLY
// ============================================================================

/**
 * Assemble family context for briefing generation
 */
async function assembleBriefingContext(parentId: string, householdId: string) {
  try {
    // Fetch parent
    const { data: parentData, error: parentError } = await supabase
      .from('parents')
      .select()
      .eq('id', parentId)
      .single()

    if (parentError) throw parentError

    // Fetch children
    const { data: childrenData } = await supabase
      .from('children')
      .select()
      .eq('household_id', householdId)

    // Fetch allergies
    const { data: allergyData } = await supabase
      .from('allergy_summary_by_household')
      .select()
      .eq('household_id', householdId)
      .single()

    // Fetch pets
    const { data: petData } = await supabase
      .from('pets')
      .select()
      .eq('household_id', householdId)

    // Fetch budget summary
    const { data: budgetData } = await supabase
      .from('budget_progress_current_month')
      .select()
      .eq('household_id', householdId)

    // Fetch meal plan
    const { data: mealData } = await supabase
      .from('meal_plans')
      .select()
      .eq('household_id', householdId)
      .gte('week_start_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .limit(1)
      .single()

    // Fetch calendar events for today
    const { data: calendarData } = await supabase
      .from('calendar_summary_today')
      .select()
      .eq('parent_id', parentId)

    // Format context for Claude
    const contextStr = `
Family Context:
- Parent: ${parentData?.name} (${parentData?.timezone})
- Children: ${childrenData?.map((c: any) => c.name).join(', ') || 'None'}
- Allergies: ${allergyData?.allergen_list || 'None known'}
- Pets: ${petData?.map((p: any) => p.name).join(', ') || 'None'}

Today's Status:
- Budget: ${budgetData?.map((b: any) => \`\${b.category_name}: $\${b.remaining.toFixed(2)}\`).join(' | ') || 'No data'}
- Tonight's Meal: ${mealData?.meals?.[0]?.meal_name || 'Not planned'}
- Calendar Events: ${calendarData?.length || 0} events
- First Event: ${calendarData?.[0]?.title || 'None'} at ${calendarData?.[0]?.start_at || 'N/A'}
`

    return contextStr
  } catch (error) {
    console.error('Error assembling briefing context:', error)
    throw error
  }
}

// ============================================================================
// BRIEFING GENERATION
// ============================================================================

/**
 * Generate morning briefing via Claude
 */
async function generateBriefing(contextStr: string, parentName: string, familyName: string): Promise<string> {
  try {
    const systemPrompt = `You are Kin, the AI family operating system. Generate a brief, warm, 3-6 sentence morning briefing for ${parentName}.

Priority order:
1. Commute/departure (if applicable)
2. First meeting or work context
3. Family coordination needs (pickup, etc)
4. Budget status
5. Tonight's meal suggestion
6. One proactive observation (fitness, family time, etc)

Be warm, specific with numbers, and direct. Sound like a smart friend. No emoji. No hedging.`

    const userPrompt = `${contextStr}

Generate the morning briefing now.`

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 256,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    const firstContent = response.content[0]
    if (firstContent.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    return firstContent.text
  } catch (error) {
    console.error('Error generating briefing:', error)
    throw error
  }
}

// ============================================================================
// PUSH NOTIFICATION SENDING
// ============================================================================

/**
 * Send push notification via Expo
 */
async function sendPushNotification(token: string, title: string, body: string): Promise<boolean> {
  try {
    const message: PushMessage = {
      to: token,
      title,
      body,
      sound: 'default',
      priority: 'high',
      data: { type: 'morning_briefing' },
    }

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      throw new Error(`Expo API error: ${response.statusText}`)
    }

    const result = await response.json()
    if (result.errors && result.errors.length > 0) {
      console.error('Expo push errors:', result.errors)
      return false
    }

    return true
  } catch (error) {
    console.error('Error sending push notification:', error)
    return false
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

/**
 * Main edge function handler
 * Called on a cron schedule (e.g., every 5 minutes)
 */
async function generateAndSendBriefings() {
  const briefingLogs: BriefingLog[] = []

  try {
    // Fetch all parents
    const { data: allParents, error: parentsError } = await supabase
      .from('parents')
      .select()
      .eq('onboarding_complete', true)

    if (parentsError) {
      throw new Error(`Failed to fetch parents: ${parentsError.message}`)
    }

    if (!allParents || allParents.length === 0) {
      console.log('No parents found for briefing generation')
      return {
        success: true,
        message: 'No parents to process',
        logs: briefingLogs,
      }
    }

    // Check each parent's briefing time
    const parentsToNotify = (allParents as Parent[]).filter((parent) => shouldSendBriefing(parent))

    console.log(`Found ${parentsToNotify.length} parents to notify out of ${allParents.length}`)

    // Process each parent
    for (const parent of parentsToNotify) {
      try {
        // Fetch household
        const { data: householdData, error: householdError } = await supabase
          .from('households')
          .select('family_name')
          .eq('id', parent.household_id)
          .single()

        if (householdError) throw householdError

        // Assemble context
        const contextStr = await assembleBriefingContext(parent.id, parent.household_id)

        // Generate briefing
        const briefingBody = await generateBriefing(contextStr, parent.name, householdData?.family_name || 'Family')

        // Fetch push token
        const { data: tokenData, error: tokenError } = await supabase
          .from('push_tokens')
          .select()
          .eq('parent_id', parent.id)
          .single()

        if (tokenError) {
          briefingLogs.push({
            parent_id: parent.id,
            parent_name: parent.name,
            status: 'error',
            message: 'No push token found',
            timestamp: new Date().toISOString(),
          })
          continue
        }

        // Send notification
        const pushSuccess = await sendPushNotification(
          (tokenData as PushToken).expo_push_token,
          'Good morning',
          briefingBody
        )

        briefingLogs.push({
          parent_id: parent.id,
          parent_name: parent.name,
          status: pushSuccess ? 'success' : 'error',
          message: pushSuccess ? briefingBody : 'Failed to send push notification',
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        console.error(`Error processing parent ${parent.id}:`, error)
        briefingLogs.push({
          parent_id: parent.id,
          parent_name: parent.name,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        })
      }
    }

    return {
      success: true,
      processed: parentsToNotify.length,
      logs: briefingLogs,
    }
  } catch (error) {
    console.error('Fatal error in morning briefing function:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      logs: briefingLogs,
    }
  }
}

// ============================================================================
// DENO SERVE
// ============================================================================

Deno.serve(async (req) => {
  // Verify request is from Supabase cron (check auth if needed)
  try {
    const result = await generateAndSendBriefings()

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: result.success ? 200 : 500,
    })
  } catch (error) {
    console.error('Unhandled error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
