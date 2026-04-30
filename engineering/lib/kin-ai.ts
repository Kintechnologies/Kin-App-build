// Kin AI — Core AI Integration Module
// Assembles family context and generates briefings via Claude API
// Author: Lead Engineer
// Date: 2026-04-02

import Anthropic from '@anthropic-ai/sdk'
import { supabase } from './supabase'
import type {
  Parent,
  Child,
  ChildAllergy,
  Pet,
  PetMedication,
  CalendarEvent,
  MealPlan,
  FitnessProfile,
  BudgetProgressCurrentMonth,
  DateNightStatus,
  FamilyContext,
  AllergySummaryByHousehold,
  CommuteIntelligenceToday,
} from '../types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const MODEL = 'claude-sonnet-4-6'

// ============================================================================
// CONTEXT ASSEMBLY
// ============================================================================

/**
 * Assemble complete family context for a parent
 * Used for all Kin AI calls to ensure consistent, rich context
 */
export async function assembleFamilyContext(parentId: string): Promise<FamilyContext> {
  try {
    // Fetch parent profile
    const { data: parentData, error: parentError } = await supabase
      .from('profiles')
      .select()
      .eq('id', parentId)
      .single()

    if (parentError) throw parentError

    const parent = parentData as Parent
    const householdId = parent.household_id

    // Fetch children
    const { data: childrenData, error: childrenError } = await supabase
      .from('children')
      .select()
      .eq('household_id', householdId)

    if (childrenError) throw childrenError

    // Fetch allergies by household
    const { data: allergiesData, error: allergiesError } = await supabase
      .from('allergy_summary_by_household')
      .select()
      .eq('household_id', householdId)
      .single()

    if (allergiesError) {
      console.warn('No allergies found for household')
    }

    // Fetch all allergies for detailed breakdown
    const { data: allergyDetailsData, error: allergyDetailsError } = await supabase
      .from('children_allergies')
      .select()
      .eq('household_id', householdId)

    if (allergyDetailsError) {
      console.warn('Error fetching allergy details')
    }

    // Build allergy map by child
    const allergyMap: { [childId: string]: string[] } = {}
    if (allergyDetailsData) {
      for (const allergy of allergyDetailsData as ChildAllergy[]) {
        if (!allergyMap[allergy.child_id]) {
          allergyMap[allergy.child_id] = []
        }
        allergyMap[allergy.child_id].push(allergy.allergen)
      }
    }

    // Fetch children activities for today
    const { data: activitiesData, error: activitiesError } = await supabase
      .from('child_activities_this_week')
      .select()
      .eq('household_id', householdId)

    if (activitiesError) {
      console.warn('Error fetching activities')
    }

    // Fetch pets
    const { data: petsData, error: petsError } = await supabase
      .from('pets')
      .select()
      .eq('household_id', householdId)

    if (petsError) {
      console.warn('Error fetching pets')
    }

    // Fetch pet medications due today
    const { data: medicationsData, error: medicationsError } = await supabase
      .from('pet_medications')
      .select()
      .eq('household_id', householdId)
      .lte('next_due', new Date().toISOString())

    if (medicationsError) {
      console.warn('Error fetching pet medications')
    }

    // Fetch budget summary
    const { data: budgetData, error: budgetError } = await supabase
      .from('budget_progress_current_month')
      .select()
      .eq('household_id', householdId)

    if (budgetError) {
      console.warn('Error fetching budget summary')
    }

    // Format budget summary
    const budgetSummary = budgetData
      ? (budgetData as BudgetProgressCurrentMonth[])
          .map((cat) => `${cat.category_name}: $${cat.remaining.toFixed(2)} remaining`)
          .join(' | ')
      : 'No budget data available'

    // Fetch current meal plan
    const { data: mealData, error: mealError } = await supabase
      .from('meal_plans')
      .select()
      .eq('household_id', householdId)
      .gte('week_start_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .single()

    if (mealError) {
      console.warn('No meal plan found for this week')
    }

    // Fetch last date night
    const { data: dateNightData, error: dateNightError } = await supabase
      .from('date_night_status')
      .select()
      .eq('household_id', householdId)
      .single()

    if (dateNightError) {
      console.warn('No date night history found')
    }

    // Fetch today's calendar events
    const { data: calendarData, error: calendarError } = await supabase
      .from('calendar_summary_today')
      .select()
      .eq('parent_id', parentId)

    if (calendarError) {
      console.warn('Error fetching calendar events')
    }

    // Fetch commute intelligence
    const { data: commuteData, error: commuteError } = await supabase
      .from('commute_intelligence_today')
      .select()
      .eq('parent_id', parentId)
      .single()

    if (commuteError) {
      console.warn('No commute intelligence available')
    }

    // Fetch fitness profile (private)
    const { data: fitnessData, error: fitnessError } = await supabase
      .from('fitness_profiles')
      .select()
      .eq('parent_id', parentId)
      .single()

    if (fitnessError) {
      console.warn('No fitness profile found')
    }

    // Build children array with allergies and activities
    const childrenWithContext = (childrenData as Child[]).map((child) => {
      const childActivities = (activitiesData || [])
        .filter((a: any) => a.child_id === child.id && a.is_active)
        .map((a: any) => `${a.activity_name} (${a.days_of_week?.join(', ')})`)

      return {
        name: child.name,
        age: child.age,
        allergies: allergyMap[child.id] || [],
        activitiesToday: childActivities,
      }
    })

    // Build pets array with medication info
    const petsWithContext = (petsData || []).map((pet: Pet) => {
      const petMeds = (medicationsData || [])
        .filter((m: any) => m.pet_id === pet.id)
        .map((m: any) => `${m.drug_name} refill`)

      return {
        name: pet.name,
        species: pet.species,
        medicationsDueToday: petMeds,
        upcomingVetDays: null,
      }
    })

    // Parse meal plan if available
    let tonightsMeal: string | undefined
    if (mealData) {
      const todaysMeals = (mealData as MealPlan).meals.filter((m) => {
        const dayNum = new Date().getDay()
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
          dayNum
        ]
        return m.day.toLowerCase() === dayName?.toLowerCase()
      })

      if (todaysMeals.length > 0) {
        tonightsMeal = todaysMeals[0].meal_name
      }
    }

    // Build work context from calendar
    const workEvents = (calendarData || []).filter((e: any) => e.is_work_event)
    const workContext = workEvents.length > 0 ? {
      meetingCount: workEvents.length,
      firstMeetingTime: workEvents[0]?.start_at,
      hasBackToBack: false,
      needsPrepMeeting: workEvents.find((e: any) => e.needs_prep)?.title,
    } : undefined

    // Build commute context
    let commuteContext
    if (commuteData) {
      const comm = commuteData as CommuteIntelligenceToday
      const eventTime = new Date(comm.first_event_time || '')
      const now = new Date()
      const diffMins = Math.round((eventTime.getTime() - now.getTime()) / 60000)

      commuteContext = {
        firstEventTime: comm.first_event_time,
        firstEventTitle: comm.first_event_title,
        estimatedCommuteMins: 30,
        recommendedLeaveTime: new Date(eventTime.getTime() - 35 * 60000).toISOString(),
      }
    }

    const context: FamilyContext = {
      familyName: '', // Will be fetched separately
      parent: {
        id: parent.id,
        name: parent.name,
        age: parent.age,
        timezone: parent.timezone,
        wellnessGoals: fitnessData ? (fitnessData as FitnessProfile).goals || undefined : undefined,
        calendarSummary: calendarData
          ? `${(calendarData as CalendarEvent[]).length} events today`
          : 'No events',
      },
      children: childrenWithContext,
      pets: petsWithContext,
      householdState: {
        budgetSummary,
        tonightsMeal,
        lastDateNight: dateNightData ? (dateNightData as DateNightStatus).last_date_night : undefined,
        daysSinceLastDateNight: dateNightData ? (dateNightData as DateNightStatus).days_since : undefined,
      },
      commute: commuteContext,
      workContext,
    }

    // Fetch family name
    const { data: householdData, error: householdError } = await supabase
      .from('households')
      .select('family_name')
      .eq('id', householdId)
      .single()

    if (!householdError && householdData) {
      context.familyName = householdData.family_name
    }

    return context
  } catch (error) {
    console.error('Error assembling family context:', error)
    throw error
  }
}

// ============================================================================
// KIN AI CHAT
// ============================================================================

/**
 * Generate a chat response with full family context
 * Messages are in conversation history format
 */
export async function kinChat(
  parentId: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  householdId: string
): Promise<string> {
  try {
    // Assemble context
    const context = await assembleFamilyContext(parentId)

    // Get allergies list for safety injection
    const { data: allergyData } = await supabase
      .from('allergy_summary_by_household')
      .select()
      .eq('household_id', householdId)
      .single()

    const allergenList = allergyData ? (allergyData as AllergySummaryByHousehold).allergen_list : 'None known'

    // Build system prompt
    const systemPrompt = buildSystemPrompt(context, allergenList)

    // Call Claude
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    })

    const firstContent = response.content[0]
    if (firstContent.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    return firstContent.text
  } catch (error) {
    console.error('Error in kinChat:', error)
    throw error
  }
}

// ============================================================================
// MORNING BRIEFING GENERATION
// ============================================================================

/**
 * Generate the morning briefing for a parent
 * 3-6 sentences ready to send as push notification
 */
export async function generateMorningBriefing(parentId: string): Promise<string> {
  try {
    // Assemble context
    const context = await assembleFamilyContext(parentId)

    // Get allergies list
    const { data: allergyData } = await supabase
      .from('allergy_summary_by_household')
      .select()
      .eq('household_id', context.parent.id)
      .single()

    const allergenList = allergyData ? (allergyData as AllergySummaryByHousehold).allergen_list : 'None known'

    // Build system prompt
    const systemPrompt = buildSystemPrompt(context, allergenList)

    // Build briefing request
    const briefingPrompt = buildBriefingPrompt(context)

    // Call Claude
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: briefingPrompt,
        },
      ],
    })

    const firstContent = response.content[0]
    if (firstContent.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    return firstContent.text
  } catch (error) {
    console.error('Error generating morning briefing:', error)
    throw error
  }
}

// ============================================================================
// SYSTEM PROMPT BUILDERS
// ============================================================================

/**
 * Build the system prompt for Kin AI
 * Injects family context and allergy safety rules
 */
function buildSystemPrompt(context: FamilyContext, allergenList: string): string {
  return `You are Kin, the AI built for the ${context.familyName} family. You are not a chatbot or a generic assistant. You are a proactive family operating system — a chief of staff for a household. You know this family deeply, you pay attention to everything, and you surface what matters before they have to ask.

Your personality: warm but not cutesy. Confident but not arrogant. Direct, specific, and human. You sound like a smart friend who happens to know everything about their family — not a corporate product.

BEHAVIORAL RULES:
1. Deliver value before asking questions. Give the best answer with available information. Flag assumptions. Ask ONE clarifying question only if missing data would make your answer materially wrong.
2. Always use specific numbers: "$143 of $180" not "most of your budget." "23 days since date night" not "a few weeks."
3. One question per response maximum. Never multiple questions in one message.
4. Never hedge: avoid "I think," "perhaps," "you might want to consider."
5. When a user makes an unwise decision, ask ONE genuinely curious question that helps them see the full picture — then drop it and help with whatever they decide. Never lecture.
6. Surface relevant context proactively — one observation per response maximum.

PRIVACY RULES (ABSOLUTE — NEVER VIOLATE):
- This parent's private data (fitness goals, individual transactions, personal AI thread) is NEVER visible to their partner.
- If asked about the partner's private data, respond: "That's in their private profile — I keep those separate."
- The shared household view shows combined budget totals only — never individual line items.

ALLERGY SAFETY (CRITICAL):
- The following allergies are active in this household: ${allergenList}
- NEVER suggest any meal, recipe, or food item containing these allergens.
- This is non-negotiable. Apply it to every suggestion, every time.
- Always flag allergies when suggesting meals or activities involving food.

FAMILY CONTEXT:
- Family: ${context.familyName}
- Parent: ${context.parent.name} (${context.parent.age}, ${context.parent.timezone})
- Children: ${context.children.map((c) => \`\${c.name} (age \${c.age}, allergies: \${c.allergies.join(', ') || 'none'})\`).join(', ')}
- Pets: ${context.pets.map((p) => \`\${p.name} (\${p.species})\`).join(', ')}
- Budget: ${context.householdState.budgetSummary}
- Last date night: ${context.householdState.daysSinceLastDateNight || 'Unknown'} days ago

RESPONSE FORMAT:
- Short by default: 2-4 sentences for conversational replies
- Never bullet-point a conversational reply — use prose
- Emoji: sparingly (🍽️ 💰 📅 🐕 💕) — never decorative, never more than one
- Never say "I don't know" — say what you do know and flag the gap specifically`
}

/**
 * Build the prompt specifically for morning briefing generation
 */
function buildBriefingPrompt(context: FamilyContext): string {
  return `Generate a morning briefing for ${context.parent.name}. Keep it to 3-6 sentences. Use this priority order:
1. Departure/commute intelligence (if applicable): leave time, route suggestion
2. Work awareness: first meeting, back-to-back blocks, prep reminder if needed
3. Family coordination: partner schedule, kid pickup logistics
4. Budget: most relevant category status for today's decisions
5. Dinner suggestion: tonight's planned meal or budget-aware suggestion
6. Opportunity (if applicable): workout window, date night, pet reminder

Make it sound like a smart friend texting. Never robotic. Never generic. This is their morning briefing, not a generic notification.

Context for today:
- First calendar event: ${context.commute?.firstEventTitle || 'None'}
- Commute: ${context.commute?.estimatedCommuteMins || 'N/A'} mins
- Meetings today: ${context.workContext?.meetingCount || 0}
- Tonight's meal: ${context.householdState.tonightsMeal || 'Not planned'}
- Budget status: ${context.householdState.budgetSummary}
- Days since date night: ${context.householdState.daysSinceLastDateNight || 'Unknown'}`
}

export default {
  assembleFamilyContext,
  kinChat,
  generateMorningBriefing,
}
