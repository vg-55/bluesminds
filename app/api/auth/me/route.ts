// ============================================================================
// GET CURRENT USER API ROUTE
// ============================================================================

import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { errorResponse, successResponse, AuthenticationError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = await createServerClient()

    // Get current user
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      throw new AuthenticationError('Not authenticated')
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (profileError) {
      logger.error('Failed to get user profile', profileError)
      throw new Error('Failed to get user profile')
    }

    return successResponse({
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      company_name: profile.company_name,
      tier: profile.tier,
      status: profile.status,
      referral_code: profile.referral_code,
      credits_balance: profile.credits_balance,
      created_at: profile.created_at,
    })
  } catch (error) {
    logger.error('Get current user error', error)
    return errorResponse(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = await createServerClient()

    // Get current user
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      throw new AuthenticationError('Not authenticated')
    }

    // Parse request body
    const body = await request.json()

    // Update user profile
    const { data: profile, error: updateError } = await supabase
      .from('users')
      .update({
        full_name: body.full_name,
        company_name: body.company_name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', authUser.id)
      .select()
      .single()

    if (updateError) {
      logger.error('Failed to update user profile', updateError)
      throw new Error('Failed to update profile')
    }

    logger.info('User profile updated', { userId: authUser.id })

    return successResponse(profile)
  } catch (error) {
    logger.error('Update user profile error', error)
    return errorResponse(error)
  }
}
