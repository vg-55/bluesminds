// ============================================================================
// RATE LIMITING MODULE
// ============================================================================

import { supabaseAdmin } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { RateLimitError } from '@/lib/utils/errors'
import type { ApiKey, RateLimitCheck, RateLimitWindow } from '@/lib/types'

// Check all rate limits for an API key
export async function checkRateLimits(
  apiKey: ApiKey,
  estimatedTokens: number = 0  // Kept for backward compatibility but ignored
): Promise<void> {
  // Check RPM ONLY (requests per minute)
  // TPM, daily quota, and monthly token quotas are no longer enforced
  await checkRateLimit(apiKey.id, 'minute', 0, apiKey)  // Always pass 0 for tokens
}

// Check a specific rate limit window
async function checkRateLimit(
  apiKeyId: string,
  windowType: RateLimitWindow,
  estimatedTokens: number,  // Ignored - kept for backward compatibility
  apiKey: ApiKey
): Promise<void> {
  try {
    // Call the database function (which now only checks RPM)
    const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
      p_api_key_id: apiKeyId,
      p_window_type: windowType,
      p_estimated_tokens: 0,  // Always pass 0 to skip token checks
    })

    if (error) {
      logger.error('Rate limit check failed', error, { apiKeyId, windowType })
      // On error, allow the request (fail open for availability)
      return
    }

    if (data && data.length > 0) {
      const result = data[0] as RateLimitCheck

      if (result.exceeded) {
        // Log rate limit event
        await logRateLimitEvent(apiKeyId, apiKey.user_id, result)

        throw new RateLimitError(
          `Rate limit exceeded: ${result.limit_type}`,
          result.retry_after_seconds,
          {
            limit_type: result.limit_type,
            current_value: result.current_value,
            limit_value: result.limit_value,
          }
        )
      }
    }
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error
    }
    logger.error('Rate limit check error', error, { apiKeyId, windowType })
    // Fail open on unexpected errors
  }
}

// Increment rate limit counters after successful request
export async function incrementRateLimitCounters(
  apiKeyId: string,
  tokensUsed: number  // Still tracked for analytics, but not used for rate limiting
): Promise<void> {
  try {
    const now = new Date()

    // Only track minute-level for RPM enforcement
    // Token counts are still logged for analytics but not used for rate limiting
    const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes())

    const { error } = await supabaseAdmin.rpc('increment_rate_limit_counters', {
      p_api_key_id: apiKeyId,
      p_window_start: windowStart.toISOString(),
      p_window_type: 'minute',
      p_request_count: 1,
      p_token_count: tokensUsed,  // Still log for analytics
    })

    if (error) {
      logger.warn('Failed to increment rate limit counter', {
        error,
        apiKeyId,
        windowType: 'minute',
      })
    }
  } catch (error) {
    logger.error('Increment rate limit counters error', error, { apiKeyId })
    // Don't throw - this is non-critical, we don't want to fail the request
  }
}

// Log rate limit event
async function logRateLimitEvent(
  apiKeyId: string,
  userId: string,
  rateLimitResult: RateLimitCheck
): Promise<void> {
  try {
    await supabaseAdmin.from('rate_limit_events').insert({
      api_key_id: apiKeyId,
      user_id: userId,
      limit_type: rateLimitResult.limit_type!,
      current_value: Number(rateLimitResult.current_value),
      limit_value: Number(rateLimitResult.limit_value),
      metadata: {},
    })

    logger.rateLimit(apiKeyId, rateLimitResult.limit_type!, {
      currentValue: rateLimitResult.current_value,
      limitValue: rateLimitResult.limit_value,
    })
  } catch (error) {
    logger.error('Failed to log rate limit event', error)
    // Don't throw - logging failure shouldn't affect the rate limit check
  }
}

// Get current rate limit usage for an API key
export async function getRateLimitUsage(apiKeyId: string): Promise<{
  minute: { requests: number; tokens: number }
  hour: { requests: number; tokens: number }
  day: { requests: number; tokens: number }
  month: { requests: number; tokens: number }
}> {
  try {
    const now = new Date()
    const windows = [
      { type: 'minute' as RateLimitWindow, start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes()) },
      { type: 'hour' as RateLimitWindow, start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()) },
      { type: 'day' as RateLimitWindow, start: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
      { type: 'month' as RateLimitWindow, start: new Date(now.getFullYear(), now.getMonth(), 1) },
    ]

    const results = await Promise.all(
      windows.map(async ({ type, start }) => {
        const { data } = await supabaseAdmin
          .from('rate_limit_state')
          .select('request_count, token_count')
          .eq('api_key_id', apiKeyId)
          .eq('window_type', type)
          .eq('window_start', start.toISOString())
          .single()

        return {
          type,
          requests: data?.request_count || 0,
          tokens: data?.token_count || 0,
        }
      })
    )

    return {
      minute: { requests: results[0].requests, tokens: results[0].tokens },
      hour: { requests: results[1].requests, tokens: results[1].tokens },
      day: { requests: results[2].requests, tokens: results[2].tokens },
      month: { requests: results[3].requests, tokens: results[3].tokens },
    }
  } catch (error) {
    logger.error('Get rate limit usage error', error, { apiKeyId })
    // Return zeros on error
    return {
      minute: { requests: 0, tokens: 0 },
      hour: { requests: 0, tokens: 0 },
      day: { requests: 0, tokens: 0 },
      month: { requests: 0, tokens: 0 },
    }
  }
}

// ============================================================================
// TOKEN ESTIMATION (Legacy - kept for analytics, not used for rate limiting)
// ============================================================================

// Estimate tokens for a request (simple heuristic)
// NOTE: No longer used for rate limiting, only for analytics/logging
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for English text
  return Math.ceil(text.length / 4)
}

// Estimate tokens for chat completion request
// NOTE: No longer used for rate limiting, only for analytics/logging
export function estimateChatTokens(messages: Array<{ content: string }>): number {
  const totalChars = messages.reduce((acc, msg) => acc + msg.content.length, 0)
  return estimateTokens(totalChars) + messages.length * 4 // Add overhead for message structure
}
