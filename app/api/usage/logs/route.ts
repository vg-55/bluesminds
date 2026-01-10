// ============================================================================
// USAGE LOGS API ROUTE
// ============================================================================

import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { getRecentUsageLogs } from '@/lib/gateway/usage-tracker'
import { errorResponse, successResponse, AuthenticationError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

// Force dynamic rendering - no caching for real-time data
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new AuthenticationError('Not authenticated')
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const perPage = parseInt(searchParams.get('per_page') || '20', 10)

    // Get logs
    const result = await getRecentUsageLogs(user.id, page, perPage)

    return successResponse(result)
  } catch (error) {
    logger.error('Get usage logs error', error)
    return errorResponse(error)
  }
}
