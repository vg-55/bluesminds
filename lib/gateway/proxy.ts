// ============================================================================
// GATEWAY PROXY MODULE
// ============================================================================

import { logger } from '@/lib/utils/logger'
import { GatewayError, ServiceUnavailableError } from '@/lib/utils/errors'
import { timeoutConfig } from '@/lib/config/app'
import type { LiteLLMServer } from '@/lib/types'

export interface ProxyRequest {
  method: string
  path: string
  headers: Record<string, string>
  body?: unknown
  stream?: boolean
}

export interface ProxyResponse {
  status: number
  headers: Headers
  body: unknown
  responseTimeMs: number
  stream?: ReadableStream
}

// Forward request to LiteLLM server
export async function proxyRequest(
  server: LiteLLMServer,
  request: ProxyRequest
): Promise<ProxyResponse> {
  const startTime = Date.now()

  try {
    // Build target URL
    const targetUrl = new URL(request.path, server.base_url)

    // Prepare headers
    const headers = new Headers()
    Object.entries(request.headers).forEach(([key, value]) => {
      // Skip hop-by-hop headers
      if (!['host', 'connection', 'keep-alive', 'transfer-encoding'].includes(key.toLowerCase())) {
        headers.set(key, value)
      }
    })

    // Add server API key if configured
    if (server.api_key) {
      headers.set('Authorization', `Bearer ${server.api_key}`)
    }

    // Add BluesMinds identification
    headers.set('X-Forwarded-By', 'BluesMinds-Gateway')

    // Create fetch options
    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
      signal: AbortSignal.timeout(
        request.stream ? timeoutConfig.streaming : timeoutConfig.litellm
      ),
    }

    // Add body for POST/PUT/PATCH
    if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      fetchOptions.body = JSON.stringify(request.body)
      headers.set('Content-Type', 'application/json')
    }

    // Make the request
    logger.gateway('Proxying request to LiteLLM', {
      server: server.name,
      path: request.path,
      method: request.method,
    })

    const response = await fetch(targetUrl.toString(), fetchOptions)
    const responseTimeMs = Date.now() - startTime

    // Handle streaming responses
    if (request.stream && response.body) {
      return {
        status: response.status,
        headers: response.headers,
        body: null,
        responseTimeMs,
        stream: response.body,
      }
    }

    // Handle non-streaming responses
    const contentType = response.headers.get('content-type') || ''
    let body: unknown

    if (contentType.includes('application/json')) {
      body = await response.json()
    } else {
      body = await response.text()
    }

    return {
      status: response.status,
      headers: response.headers,
      body,
      responseTimeMs,
    }
  } catch (error) {
    const responseTimeMs = Date.now() - startTime

    // Handle timeout
    if (error instanceof Error && error.name === 'TimeoutError') {
      logger.error('Request to LiteLLM timed out', error, {
        server: server.name,
        path: request.path,
        responseTimeMs,
      })
      throw new GatewayError('Request to upstream server timed out')
    }

    // Handle network errors
    if (error instanceof TypeError) {
      logger.error('Network error connecting to LiteLLM', error, {
        server: server.name,
        path: request.path,
      })
      throw new ServiceUnavailableError('Failed to connect to upstream server')
    }

    // Other errors
    logger.error('Proxy request error', error, {
      server: server.name,
      path: request.path,
    })
    throw new GatewayError('Failed to proxy request')
  }
}

// Transform request body if needed (provider-specific transformations)
export function transformRequest(body: unknown, targetProvider?: string): unknown {
  // Add provider-specific transformations here if needed
  // For example, different providers might have different API formats

  return body
}

// Transform response body if needed
export function transformResponse(body: unknown, sourceProvider?: string): unknown {
  // Add provider-specific transformations here if needed
  // Normalize responses to OpenAI format

  return body
}

// Stream transformer for SSE (Server-Sent Events)
export class SSETransformStream extends TransformStream<Uint8Array, Uint8Array> {
  constructor() {
    let buffer = ''

    super({
      transform(chunk, controller) {
        // Convert chunk to string
        const text = new TextDecoder().decode(chunk)
        buffer += text

        // Split by newlines
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            // Pass through the SSE data
            controller.enqueue(new TextEncoder().encode(line + '\n\n'))
          }
        }
      },

      flush(controller) {
        // Flush remaining buffer
        if (buffer) {
          controller.enqueue(new TextEncoder().encode(buffer))
        }
      },
    })
  }
}

// Extract model from request
export function extractModelFromRequest(body: unknown): string | undefined {
  if (typeof body === 'object' && body !== null && 'model' in body) {
    return (body as { model: string }).model
  }
  return undefined
}

// Extract provider from model name (e.g., "gpt-4" -> "openai")
export function extractProviderFromModel(model: string): string | undefined {
  const providers: Record<string, string[]> = {
    openai: ['gpt-', 'text-', 'davinci', 'curie', 'babbage', 'ada'],
    anthropic: ['claude-'],
    google: ['gemini-', 'palm-'],
    cohere: ['command-', 'embed-'],
    meta: ['llama-'],
  }

  for (const [provider, prefixes] of Object.entries(providers)) {
    if (prefixes.some((prefix) => model.toLowerCase().startsWith(prefix))) {
      return provider
    }
  }

  return undefined
}

// Check if response indicates an error
export function isErrorResponse(status: number): boolean {
  return status >= 400
}

// Extract error message from response
export function extractErrorMessage(body: unknown): string {
  if (typeof body === 'object' && body !== null) {
    if ('error' in body) {
      const error = (body as { error: unknown }).error
      if (typeof error === 'object' && error !== null && 'message' in error) {
        return (error as { message: string }).message
      }
      if (typeof error === 'string') {
        return error
      }
    }
    if ('message' in body && typeof (body as { message: string }).message === 'string') {
      return (body as { message: string }).message
    }
  }
  return 'Unknown error'
}

// Extract token usage from response
export function extractUsageFromResponse(body: unknown): {
  promptTokens: number
  completionTokens: number
  totalTokens: number
} | null {
  if (typeof body === 'object' && body !== null && 'usage' in body) {
    const usage = (body as { usage: unknown }).usage
    if (typeof usage === 'object' && usage !== null) {
      const u = usage as Record<string, number>
      return {
        promptTokens: u.prompt_tokens || 0,
        completionTokens: u.completion_tokens || 0,
        totalTokens: u.total_tokens || 0,
      }
    }
  }
  return null
}

// Retry logic for failed requests
export async function retryRequest<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry on client errors (4xx)
      if (error instanceof GatewayError && error.status && error.status < 500) {
        throw error
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break
      }

      // Exponential backoff
      const delay = delayMs * Math.pow(2, attempt)
      logger.warn(`Request failed, retrying in ${delay}ms`, {
        attempt: attempt + 1,
        maxRetries,
        error: lastError.message,
      })

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Request failed after retries')
}
