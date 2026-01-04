// ============================================================================
// API KEY ROTATION ROUTE
// ============================================================================

import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { rotateApiKey } from '@/lib/gateway/api-keys'
import { errorResponse, successResponse, AuthenticationError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST /api/keys/[id]/rotate - Rotate API key
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    // Get current user
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new AuthenticationError('Not authenticated')
    }

    // Rotate API key
    const result = await rotateApiKey(user.id, id)

    return successResponse({
      api_key: result.apiKey,
      key: result.key,
      message: 'API key rotated. Old key has been revoked. Save this new key securely!',
    })
  } catch (error) {
    logger.error('Rotate API key error', error)
    return errorResponse(error)
  }
}
