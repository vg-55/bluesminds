// ============================================================================
// USER LOGOUT API ROUTE
// ============================================================================

import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { errorResponse, successResponse } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = await createServerClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Sign out
    const { error } = await supabase.auth.signOut()

    if (error) {
      logger.error('Logout error', error)
      throw error
    }

    logger.auth('Logout successful', true, {
      userId: user?.id,
    })

    return successResponse({ message: 'Logged out successfully' })
  } catch (error) {
    logger.error('Logout error', error)
    return errorResponse(error)
  }
}
