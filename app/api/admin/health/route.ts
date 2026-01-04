// ============================================================================
// ADMIN HEALTH CHECK ROUTE
// ============================================================================

import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { getHealthSummary, checkAllServersHealth } from '@/lib/gateway/health-monitor'
import { errorResponse, successResponse, AuthenticationError, AuthorizationError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'
import { adminEmails } from '@/lib/config/env'

// GET /api/admin/health - Get health summary
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new AuthenticationError('Not authenticated')
    }

    if (!adminEmails.includes(user.email || '')) {
      throw new AuthorizationError('Admin access required')
    }

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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new AuthenticationError('Not authenticated')
    }

    if (!adminEmails.includes(user.email || '')) {
      throw new AuthorizationError('Admin access required')
    }

    // Trigger health check (async)
    checkAllServersHealth()

    return successResponse({ message: 'Health check triggered' })
  } catch (error) {
    logger.error('Trigger health check error', error)
    return errorResponse(error)
  }
}
