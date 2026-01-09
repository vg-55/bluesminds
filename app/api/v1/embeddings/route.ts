// ============================================================================
// EMBEDDINGS PROXY ENDPOINT (OpenAI-Compatible)
// ============================================================================

import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/gateway/auth'
import { checkRateLimits, incrementRateLimitCounters, estimateTokens } from '@/lib/gateway/rate-limiter'
import { selectServer, incrementServerRequests, decrementServerRequests, recordServerResponse } from '@/lib/gateway/load-balancer'
import { proxyRequest, extractProviderFromModel, isErrorResponse, extractErrorMessage, extractUsageFromResponse, retryRequest } from '@/lib/gateway/proxy'
import { logUsage } from '@/lib/gateway/usage-tracker'
import { embeddingRequestSchema } from '@/lib/validations'
import { errorResponse, successResponse, ValidationError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let serverId: string | undefined

  try {
    // 1. AUTHENTICATION
    const authorization = request.headers.get('authorization')
    const authContext = await withAuth(authorization, 'embeddings')

    // 2. PARSE AND VALIDATE REQUEST
    const body = await request.json()
    const validated = embeddingRequestSchema.safeParse(body)

    if (!validated.success) {
      throw new ValidationError('Invalid request', validated.error.errors)
    }

    const requestData = validated.data
    const model = requestData.model

    // 3. ESTIMATE TOKENS
    const inputText = Array.isArray(requestData.input)
      ? requestData.input.join(' ')
      : requestData.input
    const estimatedTokens = estimateTokens(inputText)

    // 4. CHECK RATE LIMITS
    await checkRateLimits(authContext.apiKey, estimatedTokens)

    // 5. SELECT SERVER
    const serverSelection = await selectServer(model)
    serverId = serverSelection.server.id

    // 6. INCREMENT SERVER REQUEST COUNTER
    await incrementServerRequests(serverId)

    // 7. PROXY REQUEST
    const proxyResponse = await retryRequest(async () => {
      return proxyRequest(serverSelection.server, {
        method: 'POST',
        path: '/v1/embeddings',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestData,
      })
    })

    const responseTimeMs = proxyResponse.responseTimeMs
    const isError = isErrorResponse(proxyResponse.status)

    // 8. EXTRACT USAGE
    const usage = extractUsageFromResponse(proxyResponse.body)

    if (usage) {
      await incrementRateLimitCounters(authContext.apiKey.id, usage.totalTokens)
    }

    // 9. LOG USAGE
    const actualModel = serverSelection.actualModel || model
    await logUsage({
      userId: authContext.user.id,
      apiKeyId: authContext.apiKey.id,
      serverId,
      endpoint: '/v1/embeddings',
      model,
      provider: extractProviderFromModel(actualModel) || serverSelection.server.name.toLowerCase(),
      promptTokens: usage?.promptTokens || estimatedTokens,
      completionTokens: 0,
      totalTokens: usage?.totalTokens || estimatedTokens,
      responseTimeMs,
      statusCode: proxyResponse.status,
      isError,
      errorMessage: isError ? extractErrorMessage(proxyResponse.body) : undefined,
    })

    // 10. RECORD SERVER METRICS
    await recordServerResponse(serverId, responseTimeMs, !isError)
    await decrementServerRequests(serverId)

    // 11. RETURN RESPONSE
    if (isError) {
      return new Response(JSON.stringify(proxyResponse.body), {
        status: proxyResponse.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return successResponse(proxyResponse.body, proxyResponse.status)
  } catch (error) {
    if (serverId) {
      await decrementServerRequests(serverId)
      await recordServerResponse(serverId, Date.now() - startTime, false)
    }

    logger.error('Embeddings error', error)
    return errorResponse(error)
  }
}
