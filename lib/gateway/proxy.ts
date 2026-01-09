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
    // Build target URL - normalize base URL to avoid double slashes
    const baseUrl = server.base_url.endsWith('/')
      ? server.base_url.slice(0, -1)
      : server.base_url
    const path = request.path.startsWith('/')
      ? request.path
      : `/${request.path}`
    const targetUrl = new URL(path, baseUrl)

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
      url: targetUrl.toString(),
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
    let responseText = ''

    try {
      // First, get the response text
      responseText = await response.text()

      // Check if response is empty
      if (!responseText || responseText.trim() === '') {
        logger.error('Empty response from LiteLLM server', {
          server: server.name,
          url: targetUrl.toString(),
          status: response.status,
          contentType,
          headers: Object.fromEntries(response.headers.entries()),
        })

        throw new GatewayError(
          `Empty response from LiteLLM server "${server.name}" at ${server.base_url}. ` +
          `Please verify the server is running and properly configured.`,
          response.status >= 400 ? response.status : 502
        )
      }

      // Parse based on content type
      if (contentType.includes('application/json')) {
        try {
          body = JSON.parse(responseText)
        } catch (parseError) {
          logger.error('Invalid JSON response from LiteLLM server', {
            server: server.name,
            url: targetUrl.toString(),
            status: response.status,
            contentType,
            responsePreview: responseText.substring(0, 200),
            error: parseError,
          })

          throw new GatewayError(
            `Invalid JSON response from LiteLLM server "${server.name}". ` +
            `Server returned: ${responseText.substring(0, 100)}... ` +
            `Please verify the server is running correctly at ${server.base_url}`,
            response.status >= 400 ? response.status : 502
          )
        }
      } else if (contentType.includes('text/html')) {
        // HTML response usually means wrong endpoint or error page
        logger.error('HTML response from LiteLLM server (expected JSON)', {
          server: server.name,
          url: targetUrl.toString(),
          status: response.status,
          contentType,
          responsePreview: responseText.substring(0, 200),
        })

        throw new GatewayError(
          `LiteLLM server "${server.name}" returned HTML instead of JSON. ` +
          `This usually means the endpoint is incorrect or the server is misconfigured. ` +
          `URL: ${targetUrl.toString()}`,
          response.status >= 400 ? response.status : 502
        )
      } else {
        body = responseText
      }
    } catch (error) {
      // Re-throw GatewayErrors as-is
      if (error instanceof GatewayError) {
        throw error
      }

      // Handle other errors
      logger.error('Failed to parse LiteLLM response', {
        server: server.name,
        url: targetUrl.toString(),
        status: response.status,
        contentType,
        responsePreview: responseText.substring(0, 200),
        error,
      })

      throw new GatewayError(
        `Failed to process response from LiteLLM server "${server.name}". ` +
        `Please verify the server is accessible at ${server.base_url}`,
        response.status || 502
      )
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
  // Handle provider prefixes in model names (e.g., "anthropic/claude-opus-4-5", "azure_ai/claude-sonnet-4-5")
  if (model.includes('/')) {
    const [providerPrefix] = model.split('/')
    // Normalize common provider prefixes
    const normalizedProvider = providerPrefix.toLowerCase()
      .replace('_', '-')
      .replace('azure-ai', 'azure')
      .replace('azure-openai', 'azure')
    return normalizedProvider
  }

  // Fallback to model name pattern matching
  const providers: Record<string, string[]> = {
    openai: ['gpt-', 'text-', 'davinci', 'curie', 'babbage', 'ada', 'o1-', 'o3-'],
    anthropic: ['claude-'],
    google: ['gemini-', 'palm-', 'bard-'],
    cohere: ['command-', 'embed-'],
    meta: ['llama-'],
    deepseek: ['deepseek-'],
    mistral: ['mistral-', 'mixtral-'],
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
  source: 'actual' | 'unknown'
} | null {
  if (typeof body === 'object' && body !== null && 'usage' in body) {
    const usage = (body as { usage: unknown }).usage
    if (typeof usage === 'object' && usage !== null) {
      const u = usage as Record<string, number>

      const promptTokens = u.prompt_tokens || 0
      const completionTokens = u.completion_tokens || 0
      let totalTokens = u.total_tokens || 0

      // Validate that total matches sum (allow ±1 for rounding)
      const expectedTotal = promptTokens + completionTokens
      if (totalTokens > 0 && Math.abs(totalTokens - expectedTotal) > 1) {
        logger.warn('Token count mismatch in response', {
          provided: totalTokens,
          expected: expectedTotal,
          promptTokens,
          completionTokens,
        })
        // Fix it by using the sum
        totalTokens = expectedTotal
      }

      // If all tokens are 0, the provider didn't supply usage data
      if (totalTokens === 0 && promptTokens === 0 && completionTokens === 0) {
        return {
          promptTokens,
          completionTokens,
          totalTokens,
          source: 'unknown',
        }
      }

      // We have real token data from the provider
      return {
        promptTokens,
        completionTokens,
        totalTokens,
        source: 'actual',
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
