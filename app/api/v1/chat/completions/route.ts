// ============================================================================
// CHAT COMPLETIONS PROXY ENDPOINT (OpenAI-Compatible)
// ============================================================================

import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/gateway/auth'
import { checkRateLimits, incrementRateLimitCounters, estimateChatTokens } from '@/lib/gateway/rate-limiter'
import { selectServer, incrementServerRequests, decrementServerRequests, recordServerResponse } from '@/lib/gateway/load-balancer'
import { proxyRequest, extractModelFromRequest, extractProviderFromModel, isErrorResponse, extractErrorMessage, extractUsageFromResponse, retryRequest } from '@/lib/gateway/proxy'
import { logUsage } from '@/lib/gateway/usage-tracker'
import { chatCompletionRequestSchema } from '@/lib/validations'
import { errorResponse, successResponse, ValidationError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

export const runtime = 'nodejs' // Use Node.js runtime for better streaming support
export const maxDuration = 60 // 60 seconds timeout

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let serverId: string | undefined
  let requestId: string | undefined

  try {
    // 1. AUTHENTICATION
    const authorization = request.headers.get('authorization')
    const authContext = await withAuth(authorization, 'chat.completions')

    // 2. PARSE AND VALIDATE REQUEST
    const body = await request.json()
    const validated = chatCompletionRequestSchema.safeParse(body)

    if (!validated.success) {
      throw new ValidationError('Invalid request', validated.error.errors)
    }

    const requestData = validated.data
    const model = requestData.model
    const isStreaming = requestData.stream || false

    // 3. ESTIMATE TOKENS FOR RATE LIMITING
    const estimatedTokens = estimateChatTokens(requestData.messages)

    // 4. CHECK RATE LIMITS
    await checkRateLimits(authContext.apiKey, estimatedTokens)

    // 5. SELECT SERVER
    const serverSelection = await selectServer(model)
    serverId = serverSelection.server.id

    logger.gateway('Request received', {
      userId: authContext.user.id,
      apiKeyId: authContext.apiKey.id,
      model,
      serverId,
      isStreaming,
    })

    // 6. INCREMENT SERVER REQUEST COUNTER
    await incrementServerRequests(serverId)

    // 7. PROXY REQUEST TO LITELLM
    const proxyResponse = await retryRequest(async () => {
      return proxyRequest(serverSelection.server, {
        method: 'POST',
        path: '/v1/chat/completions',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestData,
        stream: isStreaming,
      })
    })

    const responseTimeMs = proxyResponse.responseTimeMs
    const isError = isErrorResponse(proxyResponse.status)

    // 8. HANDLE STREAMING RESPONSES
    if (isStreaming && proxyResponse.stream) {
      // For streaming, we return immediately and log usage later
      // Note: Token counting for streaming is approximate
      logUsageAsync(
        authContext,
        serverId,
        model,
        estimatedTokens,
        responseTimeMs,
        proxyResponse.status,
        isError
      )

      // Return streaming response
      return new Response(proxyResponse.stream, {
        status: proxyResponse.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // 9. HANDLE NON-STREAMING RESPONSES
    const usage = extractUsageFromResponse(proxyResponse.body)

    if (usage) {
      // Update rate limit counters with actual token usage
      await incrementRateLimitCounters(authContext.apiKey.id, usage.totalTokens)
    }

    // 10. LOG USAGE
    requestId = await logUsage({
      userId: authContext.user.id,
      apiKeyId: authContext.apiKey.id,
      serverId,
      endpoint: '/v1/chat/completions',
      model,
      provider: extractProviderFromModel(model),
      promptTokens: usage?.promptTokens || 0,
      completionTokens: usage?.completionTokens || 0,
      totalTokens: usage?.totalTokens || 0,
      responseTimeMs,
      statusCode: proxyResponse.status,
      isError,
      errorMessage: isError ? extractErrorMessage(proxyResponse.body) : undefined,
    })

    // 11. RECORD SERVER METRICS
    await recordServerResponse(serverId, responseTimeMs, !isError)

    // 12. DECREMENT SERVER REQUEST COUNTER
    await decrementServerRequests(serverId)

    // 13. RETURN RESPONSE
    if (isError) {
      return new Response(JSON.stringify(proxyResponse.body), {
        status: proxyResponse.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return successResponse(proxyResponse.body, proxyResponse.status)
  } catch (error) {
    // Cleanup server counter on error
    if (serverId) {
      await decrementServerRequests(serverId)

      // Record failed request
      await recordServerResponse(serverId, Date.now() - startTime, false)
    }

    logger.error('Chat completions error', error)
    return errorResponse(error)
  }
}

// Async logging for streaming responses
async function logUsageAsync(
  authContext: Awaited<ReturnType<typeof withAuth>>,
  serverId: string,
  model: string,
  estimatedTokens: number,
  responseTimeMs: number,
  statusCode: number,
  isError: boolean
) {
  try {
    await logUsage({
      userId: authContext.user.id,
      apiKeyId: authContext.apiKey.id,
      serverId,
      endpoint: '/v1/chat/completions',
      model,
      provider: extractProviderFromModel(model),
      promptTokens: Math.floor(estimatedTokens * 0.7), // Rough estimate
      completionTokens: Math.floor(estimatedTokens * 0.3),
      totalTokens: estimatedTokens,
      responseTimeMs,
      statusCode,
      isError,
    })

    // Update rate limit counters
    await incrementRateLimitCounters(authContext.apiKey.id, estimatedTokens)

    // Decrement server counter
    await decrementServerRequests(serverId)

    // Record server metrics
    await recordServerResponse(serverId, responseTimeMs, !isError)
  } catch (error) {
    logger.error('Async usage logging error', error)
  }
}
