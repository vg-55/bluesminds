// ============================================================================
// USER DATA SYNCHRONIZATION UTILITIES
// ============================================================================
// Helpers to ensure user data is properly synced between auth and database

import { createBrowserClient } from '@/lib/supabase/client'

/**
 * Ensures the current user has a profile in the users table
 * Call this after successful authentication on the client side
 *
 * @returns True if profile exists or was created successfully
 */
export async function ensureUserProfile(): Promise<boolean> {
  try {
    const supabase = createBrowserClient()

    // Get current auth user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('No authenticated user', authError)
      return false
    }

    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    // If profile exists, we're good
    if (profile && !profileError) {
      return true
    }

    console.warn('User profile not found, attempting to create...')

    // Try to create profile (this should trigger the server to create it)
    const { error: createError } = await supabase.from('users').insert({
      id: user.id,
      email: user.email!,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      company_name: user.user_metadata?.company_name || null,
      tier: 'free',
      status: 'active',
    })

    if (createError) {
      // Might fail due to RLS, but that's okay - trigger should handle it
      console.warn('Could not create user profile directly', createError)

      // Wait a bit for trigger to process
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Check again
      const { data: retryProfile } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

      return !!retryProfile
    }

    return true
  } catch (error) {
    console.error('Error in ensureUserProfile', error)
    return false
  }
}

/**
 * Gets the current user's complete profile
 *
 * @returns User profile or null
 */
export async function getCurrentUserProfile() {
  try {
    const supabase = createBrowserClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return null
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile', profileError)
      return null
    }

    return profile
  } catch (error) {
    console.error('Error in getCurrentUserProfile', error)
    return null
  }
}

/**
 * Refreshes the user session and ensures profile sync
 * Call this periodically or when you suspect session issues
 */
export async function refreshUserSession() {
  try {
    const supabase = createBrowserClient()

    // Refresh the session
    const {
      data: { session },
      error,
    } = await supabase.auth.refreshSession()

    if (error) {
      console.error('Error refreshing session', error)
      return false
    }

    if (!session) {
      console.log('No active session to refresh')
      return false
    }

    // Ensure profile exists
    await ensureUserProfile()

    return true
  } catch (error) {
    console.error('Error in refreshUserSession', error)
    return false
  }
}
