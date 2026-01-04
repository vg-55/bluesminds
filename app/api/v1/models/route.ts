// ============================================================================
// MODELS LIST ENDPOINT (OpenAI-Compatible)
// ============================================================================

import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/gateway/auth'
import { getAllServers } from '@/lib/gateway/load-balancer'
import { errorResponse, successResponse } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'
import type { ModelsListResponse, ModelInfo } from '@/lib/types'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // AUTHENTICATION
    const authorization = request.headers.get('authorization')
    await withAuth(authorization, 'models')

    // Get all active servers
    const servers = await getAllServers()

    // Collect all unique models from all servers
    const modelsSet = new Set<string>()
    for (const server of servers) {
      if (server.is_active && server.supported_models) {
        server.supported_models.forEach((model) => modelsSet.add(model))
      }
    }

    // Convert to OpenAI-compatible format
    const models: ModelInfo[] = Array.from(modelsSet).map((modelId) => ({
      id: modelId,
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: 'blueminds',
    }))

    const response: ModelsListResponse = {
      object: 'list',
      data: models,
    }

    return successResponse(response)
  } catch (error) {
    logger.error('Models list error', error)
    return errorResponse(error)
  }
}
