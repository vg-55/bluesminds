// ============================================================================
// USAGE STATISTICS API ROUTE
// ============================================================================

import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { getUserUsageStats, getUsageByModel, getDailyUsageStats } from '@/lib/gateway/usage-tracker'
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
    const startDate = searchParams.get('start_date') || undefined
    const endDate = searchParams.get('end_date') || undefined
    const groupBy = searchParams.get('group_by') || 'overall'

    // Get different types of stats based on group_by parameter
    let stats

    if (groupBy === 'model') {
      stats = await getUsageByModel(user.id, startDate, endDate)
    } else if (groupBy === 'daily') {
      stats = await getDailyUsageStats(user.id, startDate, endDate)
    } else {
      stats = await getUserUsageStats(user.id, startDate, endDate)
    }

    return successResponse(stats)
  } catch (error) {
    logger.error('Get usage stats error', error)
    return errorResponse(error)
  }
}
