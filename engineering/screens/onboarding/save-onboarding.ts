// Kin AI — Save Onboarding Data to Supabase
// Persists all onboarded family data at the end of Screen 5
// Author: Lead Engineer
// Date: 2026-04-02

import { supabase } from '../../lib/supabase'
import { completeOnboarding } from '../../lib/auth'
import type { OnboardingState, ParsedSchedulePattern } from './onboarding-state'

export interface SaveOnboardingResult {
  householdId: string
  parentId: string
  userId: string
  success: boolean
  errors: string[]
}

/**
 * Save all onboarded data to Supabase
 * Called from Screen 5 after account creation
 * Handles errors gracefully — logs but continues
 */
export async function saveOnboardingData(
  state: OnboardingState,
  userId: string,
  parentName: string,
  email: string
): Promise<SaveOnboardingResult> {
  const errors: string[] = []

  try {
    // Get the parent record created by signUp
    const { data: parentData, error: parentFetchError } = await supabase
      .from('parents')
      .select('id, household_id')
      .eq('user_id', userId)
      .single()

    if (parentFetchError || !parentData) {
      errors.push('Failed to fetch parent record')
      throw new Error('Cannot proceed without parent record')
    }

    const parentId = parentData.id
    const householdId = parentData.household_id

    // Update household with family name (if not already set)
    if (state.familyName) {
      const { error: householdError } = await supabase
        .from('households')
        .update({ family_name: state.familyName })
        .eq('id', householdId)

      if (householdError) {
        errors.push('Failed to update household family name')
      }
    }

    // Update parent with home location
    if (state.homeLocation) {
      const { error: parentUpdateError } = await supabase
        .from('parents')
        .update({ home_location: state.homeLocation })
        .eq('id', parentId)

      if (parentUpdateError) {
        errors.push('Failed to update parent home location')
      }
    }

    // Insert children
    for (const child of state.children) {
      try {
        const { data: childData, error: childError } = await supabase
          .from('children')
          .insert([
            {
              household_id: householdId,
              name: child.name,
              age: child.age,
              grade: child.grade,
            },
          ])
          .select()
          .single()

        if (childError) {
          errors.push(`Failed to insert child ${child.name}: ${childError.message}`)
          continue
        }

        // Insert allergies for this child
        if (child.allergies && child.allergies.length > 0) {
          const allergyRecords = child.allergies.map((allergen) => ({
            child_id: childData.id,
            household_id: householdId,
            allergen,
            severity: 'avoid' as const,
          }))

          const { error: allergyError } = await supabase.from('children_allergies').insert(allergyRecords)

          if (allergyError) {
            errors.push(`Failed to insert allergies for ${child.name}: ${allergyError.message}`)
          }
        }
      } catch (childErr) {
        errors.push(`Unexpected error inserting child: ${childErr instanceof Error ? childErr.message : String(childErr)}`)
      }
    }

    // Insert pets
    for (const pet of state.pets) {
      try {
        const { error: petError } = await supabase.from('pets').insert([
          {
            household_id: householdId,
            name: pet.name,
            species: pet.species,
            breed: pet.breed,
            vet_name: pet.vetName,
          },
        ])

        if (petError) {
          errors.push(`Failed to insert pet ${pet.name}: ${petError.message}`)
        }
      } catch (petErr) {
        errors.push(`Unexpected error inserting pet: ${petErr instanceof Error ? petErr.message : String(petErr)}`)
      }
    }

    // Insert budget categories (default categories + user's grocery budget)
    try {
      const budgetCategories = [
        { name: 'Groceries', monthly_limit: state.groceryBudget, color: '#D4A843' },
        { name: 'Dining Out', monthly_limit: 300, color: '#D4A843' },
        { name: 'Transportation', monthly_limit: 400, color: '#7AADCE' },
        { name: 'Kids Activities', monthly_limit: 200, color: '#E07B5A' },
        { name: 'Entertainment', monthly_limit: 150, color: '#7CB87A' },
        { name: 'Home Maintenance', monthly_limit: 250, color: '#A07EC8' },
      ]

      const { error: budgetError } = await supabase.from('budget_categories').insert(
        budgetCategories.map((cat) => ({
          household_id: householdId,
          name: cat.name,
          monthly_limit: cat.monthly_limit,
          color: cat.color,
        }))
      )

      if (budgetError) {
        errors.push(`Failed to insert budget categories: ${budgetError.message}`)
      }
    } catch (budgetErr) {
      errors.push(`Unexpected error with budget categories: ${budgetErr instanceof Error ? budgetErr.message : String(budgetErr)}`)
    }

    // Insert schedule pattern as kin_memory
    if (state.schedulePattern) {
      try {
        const { error: memoryError } = await supabase.from('kin_memory').insert([
          {
            parent_id: parentId,
            household_id: householdId,
            memory_type: 'fact',
            content: {
              type: 'schedule_pattern',
              data: state.schedulePattern,
            },
          },
        ])

        if (memoryError) {
          errors.push(`Failed to save schedule pattern: ${memoryError.message}`)
        }
      } catch (memoryErr) {
        errors.push(`Unexpected error saving schedule pattern: ${memoryErr instanceof Error ? memoryErr.message : String(memoryErr)}`)
      }
    }

    // Create trial state (if not already created by signUp)
    try {
      const { data: existingTrial } = await supabase
        .from('trial_state')
        .select('id')
        .eq('parent_id', parentId)
        .single()

      if (!existingTrial) {
        const trialStarted = new Date().toISOString()
        const trialEnds = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

        const { error: trialError } = await supabase.from('trial_state').insert([
          {
            parent_id: parentId,
            trial_started_at: trialStarted,
            trial_ends_at: trialEnds,
            is_subscribed: false,
          },
        ])

        if (trialError) {
          errors.push(`Failed to create trial state: ${trialError.message}`)
        }
      }
    } catch (trialErr) {
      errors.push(`Unexpected error with trial state: ${trialErr instanceof Error ? trialErr.message : String(trialErr)}`)
    }

    // Mark onboarding complete
    try {
      await completeOnboarding(parentId)
    } catch (completeErr) {
      errors.push(`Failed to mark onboarding complete: ${completeErr instanceof Error ? completeErr.message : String(completeErr)}`)
    }

    return {
      householdId,
      parentId,
      userId,
      success: errors.length === 0,
      errors,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    errors.push(`Fatal error: ${errorMessage}`)

    return {
      householdId: '',
      parentId: '',
      userId,
      success: false,
      errors,
    }
  }
}
