// Kin AI — Supabase Client Setup for React Native
// Handles session persistence with AsyncStorage
// Author: Lead Engineer
// Date: 2026-04-02

import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables'
  )
}

/**
 * Supabase client instance for React Native
 * - Persists session in AsyncStorage
 * - Auto-refreshes tokens when expired
 * - Does not detect session from URL (mobile app)
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Version': 'kin-mobile-1.0.0',
    },
  },
})

/**
 * Initialize auth state listener
 * Attach to app root to listen for auth changes across the app
 */
export async function initializeAuthListener(
  onAuthStateChange: (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED', session: any) => void
) {
  try {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      onAuthStateChange(event as any, session)
    })

    return subscription
  } catch (error) {
    console.error('Error initializing auth listener:', error)
    return null
  }
}

/**
 * Get the current authenticated session
 */
export async function getCurrentSession() {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) throw error
    return session
  } catch (error) {
    console.error('Error getting current session:', error)
    return null
  }
}

/**
 * Refresh the current session
 */
export async function refreshSession() {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.refreshSession()

    if (error) throw error
    return session
  } catch (error) {
    console.error('Error refreshing session:', error)
    return null
  }
}

/**
 * Verify user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getCurrentSession()
  return !!session?.user
}

/**
 * Get current user ID
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getCurrentSession()
  return session?.user?.id ?? null
}

/**
 * Sign out the current user
 * Clears session from AsyncStorage and Supabase auth state
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    await AsyncStorage.removeItem('SUPABASE_JWT')
    await AsyncStorage.removeItem('SUPABASE_REFRESH_TOKEN')
  } catch (error) {
    console.error('Error signing out:', error)
    throw error
  }
}

/**
 * Check if a session token is still valid
 */
export function isSessionValid(session: any): boolean {
  if (!session?.expires_at) return false
  const expiresAt = new Date(session.expires_at * 1000)
  return expiresAt > new Date()
}

export default supabase
