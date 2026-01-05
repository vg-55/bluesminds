// ============================================================================
// MODELS LIST ENDPOINT (OpenAI-Compatible)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/gateway/auth'
import { supabaseAdmin } from '@/lib/supabase/client'
import { errorResponse } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'
import { handleCorsPreflightRequest } from '@/lib/config/security'
import type { ModelsListResponse, ModelInfo } from '@/lib/types'

export const runtime = 'nodejs'

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  return handleCorsPreflightRequest(origin)
}

export async function GET(request: NextRequest) {
  try {
    // AUTHENTICATION
    const authorization = request.headers.get('authorization')
    logger.info('Models endpoint called', {
      hasAuth: !!authorization,
      origin: request.headers.get('origin'),
      userAgent: request.headers.get('user-agent')
    })

    await withAuth(authorization, 'models')

    if (!supabaseAdmin) {
      logger.error('Database client not available')
      throw new Error('Database client not available')
    }

    // Get ONLY custom/mapped models - strict control mode
    const { data: customModels, error } = await supabaseAdmin
      .from('custom_models')
      .select('custom_name, display_name, description, created_at')
      .eq('is_active', true)
      .order('display_name', { ascending: true })

    if (error) {
      logger.error('Failed to fetch custom models', error)
      throw error
    }

    logger.info('Custom models fetched', { count: customModels?.length || 0 })

    // Convert to OpenAI-compatible format
    const models: ModelInfo[] = (customModels || []).map((model) => ({
      id: model.custom_name,
      object: 'model' as const,
      created: Math.floor(new Date(model.created_at).getTime() / 1000),
      owned_by: 'blueminds',
    }))

    const response: ModelsListResponse = {
      object: 'list',
      data: models,
    }

    logger.info('Models list retrieved successfully', { count: models.length, modelIds: models.map(m => m.id) })

    // Return raw response for OpenAI compatibility (no wrapper)
    return NextResponse.json(response)
  } catch (error) {
    logger.error('Models list error', error)
    return errorResponse(error)
  }
}
