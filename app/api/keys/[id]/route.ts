// ============================================================================
// INDIVIDUAL API KEY ROUTES
// ============================================================================

import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { updateApiKeySchema } from '@/lib/validations'
import { getApiKey, updateApiKey, revokeApiKey, rotateApiKey } from '@/lib/gateway/api-keys'
import { errorResponse, successResponse, ValidationError, AuthenticationError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/keys/[id] - Get specific API key
export async function GET(request: NextRequest, context: RouteContext) {
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

    // Get API key
    const apiKey = await getApiKey(user.id, id)

    return successResponse(apiKey)
  } catch (error) {
    logger.error('Get API key error', error)
    return errorResponse(error)
  }
}

// PATCH /api/keys/[id] - Update API key
export async function PATCH(request: NextRequest, context: RouteContext) {
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

    // Parse and validate request body
    const body = await request.json()
    const validated = updateApiKeySchema.safeParse(body)

    if (!validated.success) {
      throw new ValidationError('Invalid update data', validated.error.errors)
    }

    // Update API key
    const apiKey = await updateApiKey(user.id, id, validated.data)

    return successResponse(apiKey)
  } catch (error) {
    logger.error('Update API key error', error)
    return errorResponse(error)
  }
}

// DELETE /api/keys/[id] - Revoke API key
export async function DELETE(request: NextRequest, context: RouteContext) {
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

    // Revoke API key
    await revokeApiKey(user.id, id)

    return successResponse({ message: 'API key revoked successfully' })
  } catch (error) {
    logger.error('Revoke API key error', error)
    return errorResponse(error)
  }
}
