// ============================================================================
// ADMIN HEALTH CHECK ROUTE
// ============================================================================

import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { getHealthSummary, checkAllServersHealth } from '@/lib/gateway/health-monitor'
import { errorResponse, successResponse } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'
import { checkAdminAccess } from '@/lib/utils/check-admin'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET /api/admin/health - Get health summary
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    await checkAdminAccess(supabase)

    const summary = await getHealthSummary()

    return successResponse(summary)
  } catch (error) {
    logger.error('Get health summary error', error)
    return errorResponse(error)
  }
}

// POST /api/admin/health - Trigger health check
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    await checkAdminAccess(supabase)

    // Trigger health check (async)
    checkAllServersHealth()

    return successResponse({ message: 'Health check triggered' })
  } catch (error) {
    logger.error('Trigger health check error', error)
    return errorResponse(error)
  }
}
