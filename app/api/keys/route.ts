// ============================================================================
// API KEYS MANAGEMENT ROUTES
// ============================================================================

import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { createApiKeySchema } from '@/lib/validations'
import { createApiKey, listApiKeys } from '@/lib/gateway/api-keys'
import { errorResponse, successResponse, ValidationError, AuthenticationError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

// GET /api/keys - List user's API keys
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

    // List API keys
    const apiKeys = await listApiKeys(user.id)

    return successResponse(apiKeys)
  } catch (error) {
    logger.error('List API keys error', error)
    return errorResponse(error)
  }
}

// POST /api/keys - Create new API key
export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json()
    const validated = createApiKeySchema.safeParse(body)

    if (!validated.success) {
      throw new ValidationError('Invalid API key data', validated.error.errors)
    }

    // Create API key
    const result = await createApiKey(user.id, validated.data)

    return successResponse(
      {
        api_key: result.apiKey,
        key: result.key, // Only time we return the actual key!
        message: 'API key created. Save this key securely - you will not be able to see it again!',
      },
      201
    )
  } catch (error) {
    logger.error('Create API key error', error)
    return errorResponse(error)
  }
}
