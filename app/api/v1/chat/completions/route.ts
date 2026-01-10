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
import { errorResponse, ValidationError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'
import { parseStreamForUsage } from '@/lib/utils/stream-parser'
import { estimateTokensImproved } from '@/lib/utils/token-estimator'

export const runtime = 'nodejs' // Use Node.js runtime for better streaming support
export const maxDuration = 60 // 60 seconds timeout

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let serverId: string | undefined
  let requestId: string | undefined
  const idempotencyKey =
    request.headers.get('idempotency-key') ||
    request.headers.get('x-idempotency-key') ||
    request.headers.get('x-request-id') ||
    crypto.randomUUID()

  try {
    // 1. AUTHENTICATION
    const authorization = request.headers.get('authorization')
    const authContext = await withAuth(authorization, 'chat.completions')

    // 2. PARSE AND VALIDATE REQUEST
    const body = await request.json()
    const validated = chatCompletionRequestSchema.safeParse(body)

    if (!validated.success) {
      const validationErrors = validated.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }))

      logger.error('Request validation failed', {
        body,
        errors: validationErrors,
      })

      throw new ValidationError('Invalid request: ' + validationErrors.map(e => `${e.field}: ${e.message}`).join(', '), validationErrors)
    }

    const requestData = validated.data
    const requestedModel = requestData.model
    const isStreaming = requestData.stream || false

    // 3. CHECK RATE LIMITS - SIMPLIFIED (RPM only, no token estimation needed)
    await checkRateLimits(authContext.apiKey, 0)

    // 4. SELECT SERVER (this also resolves custom model mappings)
    const serverSelection = await selectServer(requestedModel)
    serverId = serverSelection.server.id

    // Use the actual model name if this is a custom model, otherwise use the requested model
    const actualModel = serverSelection.actualModel || requestedModel

    logger.gateway('Request received', {
      userId: authContext.user.id,
      apiKeyId: authContext.apiKey.id,
      requestedModel,
      actualModel,
      serverId,
      isStreaming,
    })

    // 6. INCREMENT SERVER REQUEST COUNTER
    await incrementServerRequests(serverId)

    // 7. PROXY REQUEST TO LITELLM with actual model name
    const proxyResponse = await retryRequest(async () => {
      return proxyRequest(serverSelection.server, {
        method: 'POST',
        path: '/v1/chat/completions',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          ...requestData,
          model: actualModel, // Use the actual model name for the provider
        },
        stream: isStreaming,
      })
    })

    const responseTimeMs = proxyResponse.responseTimeMs
    const isError = isErrorResponse(proxyResponse.status)

    // 8. HANDLE STREAMING RESPONSES
    if (isStreaming && proxyResponse.stream) {
      // Parse stream to extract actual token counts
      const { stream: passthrough, usagePromise } = parseStreamForUsage(proxyResponse.stream)

      // Use improved estimation as initial fallback
      const tokenEstimate = estimateTokensImproved(
        requestData.messages.map((m) => ({
          role: m.role,
          content: m.content ?? '',
        })) as any,
        actualModel
      )

      // Log usage async - will update with actual tokens when stream completes
      logUsageAsyncWithStreamParsing(
        authContext,
        serverId,
        serverSelection.server.name, // Pass server name for provider tracking
        requestedModel, // Log the model name the user requested
        actualModel, // For provider extraction
        tokenEstimate,
        usagePromise,
        responseTimeMs,
        proxyResponse.status,
        isError,
        idempotencyKey
      )

      // Return streaming response
      return new Response(passthrough, {
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

    if (usage && usage.totalTokens > 0) {
      // Update rate limit counters with actual token usage
      await incrementRateLimitCounters(authContext.apiKey.id, usage.totalTokens)
    }

    // 10. LOG USAGE
    requestId = await logUsage({
      userId: authContext.user.id,
      apiKeyId: authContext.apiKey.id,
      idempotencyKey,
      requestId: idempotencyKey,
      serverId,
      endpoint: '/v1/chat/completions',
      model: requestedModel, // Log the model name the user requested
      provider: extractProviderFromModel(actualModel) || serverSelection.server.name.toLowerCase(), // Extract from model or use server name as fallback
      promptTokens: usage?.promptTokens || 0,
      completionTokens: usage?.completionTokens || 0,
      totalTokens: usage?.totalTokens || 0,
      tokenSource: usage?.source || 'unknown',
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
    // Return raw response for OpenAI compatibility (no wrapper)
    return new Response(JSON.stringify(proxyResponse.body), {
      status: proxyResponse.status,
      headers: { 'Content-Type': 'application/json' },
    })
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

// Async logging for streaming responses with stream parsing
async function logUsageAsyncWithStreamParsing(
  authContext: Awaited<ReturnType<typeof withAuth>>,
  serverId: string,
  serverName: string,
  requestedModel: string,
  actualModel: string,
  tokenEstimate: { promptTokens: number; completionTokens: number; totalTokens: number; source: string },
  usagePromise: Promise<{ promptTokens: number; completionTokens: number; totalTokens: number; source: 'actual' } | null>,
  responseTimeMs: number,
  statusCode: number,
  isError: boolean,
  idempotencyKey: string
) {
  try {
    // Wait for stream parsing to complete (with timeout)
    const timeoutMs = 30000 // 30 seconds max wait
    const actualUsage = await Promise.race([
      usagePromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ])

    // Use actual tokens if found, otherwise use improved estimate
    const promptTokens = actualUsage?.promptTokens || tokenEstimate.promptTokens
    const completionTokens = actualUsage?.completionTokens || tokenEstimate.completionTokens
    const totalTokens = actualUsage?.totalTokens || tokenEstimate.totalTokens
    const tokenSource = actualUsage ? 'actual' : 'estimated'

    logger.gateway('Logging streaming usage', {
      tokenSource,
      promptTokens,
      completionTokens,
      totalTokens,
    })

    await logUsage({
      userId: authContext.user.id,
      apiKeyId: authContext.apiKey.id,
      idempotencyKey,
      requestId: idempotencyKey,
      serverId,
      endpoint: '/v1/chat/completions',
      model: requestedModel,
      provider: extractProviderFromModel(actualModel) || serverName.toLowerCase(),
      promptTokens,
      completionTokens,
      totalTokens,
      tokenSource,
      responseTimeMs,
      statusCode,
      isError,
    })

    // Update rate limit counters
    await incrementRateLimitCounters(authContext.apiKey.id, totalTokens)

    // Decrement server counter
    await decrementServerRequests(serverId)

    // Record server metrics
    await recordServerResponse(serverId, responseTimeMs, !isError)
  } catch (error) {
    logger.error('Async usage logging error', error)
  }
}
