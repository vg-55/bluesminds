// ============================================================================
// ADMIN ACCESS CHECKER
// ============================================================================
// Centralized admin authentication logic for consistency across all routes

import { createServerClient } from '@/lib/supabase/client'
import { adminEmails } from '@/lib/config/env'
import { AuthenticationError, AuthorizationError } from './errors'

/**
 * Check if the current user has admin access
 * Uses database role as primary source, email list as fallback
 *
 * @throws {AuthenticationError} if user is not authenticated
 * @throws {AuthorizationError} if user is not an admin
 * @returns The authenticated user object
 */
export async function checkAdminAccess(
  supabase: Awaited<ReturnType<typeof createServerClient>>
) {
  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new AuthenticationError('Not authenticated')
  }

  // Check user role from database (PRIMARY SOURCE OF TRUTH)
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    throw new AuthorizationError('Failed to verify user permissions')
  }

  // Check if user is admin (role field first, email list as fallback)
  const isAdmin = profile?.role === 'admin' || adminEmails.includes(user.email || '')

  if (!isAdmin) {
    throw new AuthorizationError('Admin access required')
  }

  return user
}

/**
 * Check if a user has admin role based on database record
 * Does not throw errors, returns boolean
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = await createServerClient()

    const { data: profile } = await supabase
      .from('users')
      .select('role, email')
      .eq('id', userId)
      .single()

    if (!profile) return false

    return profile.role === 'admin' || adminEmails.includes(profile.email || '')
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}
