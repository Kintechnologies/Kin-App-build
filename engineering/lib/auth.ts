// Kin AI — Authentication Module
// Handles sign-up, sign-in, and dual-parent household setup
// Author: Lead Engineer
// Date: 2026-04-02

import { supabase } from './supabase'
import type { Parent, Household, PartnerInvite, TrialState, SignUpResponse, SignInResponse } from '../types'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SignUpData {
  email: string
  password: string
  name: string
  isPartner1: boolean
  householdId?: string
  familyName?: string
}

export interface AcceptInviteResult {
  householdId: string
  isValid: boolean
  error?: string
}

// ============================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================

/**
 * Sign up a new parent user
 * - Partner 1: Creates household, creates parent record, starts trial
 * - Partner 2: Joins existing household via invite token
 */
export async function signUp(data: SignUpData): Promise<SignUpResponse> {
  const { email, password, name, isPartner1, householdId, familyName } = data

  try {
    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          is_partner_1: isPartner1,
        },
      },
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('Failed to create auth user')

    const userId = authData.user.id

    // Step 2: Create or join household
    let finalHouseholdId = householdId

    if (isPartner1) {
      if (!familyName) throw new Error('familyName required for Partner 1')

      const { data: householdData, error: householdError } = await supabase
        .from('households')
        .insert([{ family_name: familyName }])
        .select()
        .single()

      if (householdError) throw householdError
      finalHouseholdId = householdData.id
    } else {
      if (!householdId) throw new Error('householdId required for Partner 2')
    }

    // Step 3: Create parent record
    const { data: parentData, error: parentError } = await supabase
      .from('parents')
      .insert([
        {
          household_id: finalHouseholdId,
          user_id: userId,
          name,
          email,
          is_partner_1: isPartner1,
          timezone: 'America/New_York',
          briefing_time: isPartner1 ? '06:00:00' : '06:30:00',
        },
      ])
      .select()
      .single()

    if (parentError) throw parentError

    // Step 4: Create trial state
    const { data: trialData, error: trialError } = await supabase
      .from('trial_state')
      .insert([
        {
          parent_id: parentData.id,
          trial_started_at: new Date().toISOString(),
          trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          is_subscribed: false,
        },
      ])
      .select()
      .single()

    if (trialError) throw trialError

    // Step 5: Fetch household data
    const { data: householdFinalData, error: householdFetchError } = await supabase
      .from('households')
      .select()
      .eq('id', finalHouseholdId)
      .single()

    if (householdFetchError) throw householdFetchError

    return {
      parent: parentData as Parent,
      household: householdFinalData as Household,
      trial: trialData as TrialState,
    }
  } catch (error) {
    console.error('Sign-up error:', error)
    throw error
  }
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<SignInResponse> {
  try {
    // Sign in auth user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) throw authError
    if (!authData.user || !authData.session) throw new Error('Sign-in failed')

    // Fetch parent profile
    const { data: parentData, error: parentError } = await supabase
      .from('parents')
      .select()
      .eq('user_id', authData.user.id)
      .single()

    if (parentError) throw parentError

    return {
      session: {
        user: authData.user,
        session: authData.session,
      } as any,
      parent: parentData as Parent,
    }
  } catch (error) {
    console.error('Sign-in error:', error)
    throw error
  }
}

/**
 * Sign in with Google OAuth
 * Opens native browser for OAuth flow
 */
export async function signInWithGoogle(): Promise<any> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'kin://auth/callback',
      },
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Google sign-in error:', error)
    throw error
  }
}

/**
 * Sign in with Apple
 */
export async function signInWithApple(): Promise<any> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: 'kin://auth/callback',
      },
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Apple sign-in error:', error)
    throw error
  }
}

// ============================================================================
// PARTNER INVITE FUNCTIONS
// ============================================================================

/**
 * Generate a partner invitation link
 * Partner 1 calls this to invite Partner 2
 */
export async function createPartnerInvite(
  parentId: string,
  householdId: string,
  invitedEmail?: string
): Promise<string> {
  try {
    // Generate invite token
    const inviteToken = crypto.getRandomValues(new Uint8Array(16)).toString()

    // Insert into partner_invites
    const { data, error } = await supabase
      .from('partner_invites')
      .insert([
        {
          household_id: householdId,
          invited_by_parent_id: parentId,
          invite_token: inviteToken,
          invited_email: invitedEmail,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ])
      .select()
      .single()

    if (error) throw error

    // Generate deep link URL
    const inviteUrl = `kin://accept-invite?token=${inviteToken}&household=${householdId}`
    return inviteUrl
  } catch (error) {
    console.error('Error creating partner invite:', error)
    throw error
  }
}

/**
 * Validate and accept a partner invitation
 * Called during Partner 2 sign-up to pre-populate household
 */
export async function acceptPartnerInvite(token: string): Promise<AcceptInviteResult> {
  try {
    // Fetch invite
    const { data: inviteData, error: inviteError } = await supabase
      .from('partner_invites')
      .select()
      .eq('invite_token', token)
      .single()

    if (inviteError) {
      return {
        householdId: '',
        isValid: false,
        error: 'Invite token not found',
      }
    }

    const invite = inviteData as PartnerInvite

    // Check expiry
    if (new Date(invite.expires_at) < new Date()) {
      return {
        householdId: '',
        isValid: false,
        error: 'Invite has expired',
      }
    }

    // Check if already accepted
    if (invite.accepted_at) {
      return {
        householdId: '',
        isValid: false,
        error: 'Invite has already been accepted',
      }
    }

    return {
      householdId: invite.household_id,
      isValid: true,
    }
  } catch (error) {
    console.error('Error accepting partner invite:', error)
    return {
      householdId: '',
      isValid: false,
      error: 'Failed to validate invite',
    }
  }
}

/**
 * Mark an invite as accepted
 * Called after Partner 2 completes sign-up
 */
export async function confirmPartnerInvite(inviteToken: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('partner_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('invite_token', inviteToken)

    if (error) throw error
  } catch (error) {
    console.error('Error confirming partner invite:', error)
    throw error
  }
}

// ============================================================================
// PROFILE FUNCTIONS
// ============================================================================

/**
 * Get the currently authenticated parent's full profile
 */
export async function getCurrentParent(): Promise<Parent | null> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Not authenticated')
      return null
    }

    const { data, error } = await supabase
      .from('parents')
      .select()
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching parent profile:', error)
      return null
    }

    return data as Parent
  } catch (error) {
    console.error('Error in getCurrentParent:', error)
    return null
  }
}

/**
 * Get a parent's household
 */
export async function getParentHousehold(parentId: string): Promise<Household | null> {
  try {
    const { data: parentData, error: parentError } = await supabase
      .from('parents')
      .select('household_id')
      .eq('id', parentId)
      .single()

    if (parentError) throw parentError

    const { data: householdData, error: householdError } = await supabase
      .from('households')
      .select()
      .eq('id', parentData.household_id)
      .single()

    if (householdError) throw householdError

    return householdData as Household
  } catch (error) {
    console.error('Error getting parent household:', error)
    return null
  }
}

/**
 * Get the partner in a household
 */
export async function getPartner(parentId: string): Promise<Parent | null> {
  try {
    // Get parent's household
    const { data: parentData, error: parentError } = await supabase
      .from('parents')
      .select('household_id')
      .eq('id', parentId)
      .single()

    if (parentError) throw parentError

    // Get other parent in household
    const { data: partnerData, error: partnerError } = await supabase
      .from('parents')
      .select()
      .eq('household_id', parentData.household_id)
      .neq('id', parentId)
      .single()

    if (partnerError) {
      // No partner exists yet
      return null
    }

    return partnerData as Parent
  } catch (error) {
    console.error('Error getting partner:', error)
    return null
  }
}

/**
 * Update parent profile
 */
export async function updateParent(parentId: string, updates: Partial<Parent>): Promise<Parent | null> {
  try {
    const { data, error } = await supabase
      .from('parents')
      .update(updates)
      .eq('id', parentId)
      .select()
      .single()

    if (error) throw error
    return data as Parent
  } catch (error) {
    console.error('Error updating parent:', error)
    return null
  }
}

/**
 * Mark onboarding as complete
 */
export async function completeOnboarding(parentId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('parents')
      .update({ onboarding_complete: true })
      .eq('id', parentId)

    if (error) throw error
  } catch (error) {
    console.error('Error completing onboarding:', error)
    throw error
  }
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  } catch (error) {
    console.error('Sign-out error:', error)
    throw error
  }
}

/**
 * Reset password via email
 */
export async function resetPassword(email: string): Promise<void> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'kin://reset-password',
    })

    if (error) throw error
  } catch (error) {
    console.error('Error resetting password:', error)
    throw error
  }
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string): Promise<void> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) throw error
  } catch (error) {
    console.error('Error updating password:', error)
    throw error
  }
}

export default {
  signUp,
  signIn,
  signInWithGoogle,
  signInWithApple,
  createPartnerInvite,
  acceptPartnerInvite,
  confirmPartnerInvite,
  getCurrentParent,
  getParentHousehold,
  getPartner,
  updateParent,
  completeOnboarding,
  signOut,
  resetPassword,
  updatePassword,
}
