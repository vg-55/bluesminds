// ============================================================================
// USAGE TRACKING MODULE
// ============================================================================

import { supabaseAdmin } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { calculateCostByRequest, calculateCostHybrid } from '@/lib/config/app'
import { generateRequestId } from '@/lib/utils/crypto'
import type { UsageLogInsert, TokenSource } from '@/lib/types'

export interface UsageData {
  userId: string
  apiKeyId: string
  serverId?: string
  endpoint: string
  model: string
  provider?: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  tokenSource?: TokenSource // 'actual', 'estimated', or 'unknown'
  responseTimeMs: number
  statusCode: number
  isError: boolean
  errorMessage?: string
  requestMetadata?: Record<string, unknown>
  responseMetadata?: Record<string, unknown>
}

// Log a single usage record
export async function logUsage(data: UsageData): Promise<string> {
  try {
    const requestId = generateRequestId()

    // Validate token consistency
    let totalTokens = data.totalTokens
    if (totalTokens > 0) {
      const expectedTotal = data.promptTokens + data.completionTokens
      if (Math.abs(totalTokens - expectedTotal) > 1) {
        logger.warn('Token count mismatch in usage logging', {
          provided: totalTokens,
          expected: expectedTotal,
          promptTokens: data.promptTokens,
          completionTokens: data.completionTokens,
          model: data.model,
        })
        // Fix it by using the sum
        totalTokens = expectedTotal
      }
    }

    // HYBRID: Use token-based pricing when tokens available, otherwise per-request
    // This provides more accurate cost calculation
    const cost = calculateCostHybrid(
      data.model,
      data.promptTokens,
      data.completionTokens
    )

    const usageLog: UsageLogInsert = {
      user_id: data.userId,
      api_key_id: data.apiKeyId,
      server_id: data.serverId || null,
      request_id: requestId,
      endpoint: data.endpoint,
      model: data.model,
      provider: data.provider || null,
      // Token fields with source tracking
      prompt_tokens: data.promptTokens,
      completion_tokens: data.completionTokens,
      total_tokens: totalTokens,
      token_source: data.tokenSource || 'unknown',
      // Hybrid cost calculation (token-based when available, per-request fallback)
      cost_usd: cost,
      response_time_ms: data.responseTimeMs,
      status_code: data.statusCode,
      is_error: data.isError,
      error_message: data.errorMessage || null,
      request_metadata: data.requestMetadata || {},
      response_metadata: data.responseMetadata || {},
    }

    const { error } = await supabaseAdmin.from('usage_logs').insert(usageLog)

    if (error) {
      logger.error('Failed to log usage', error, { requestId })
      // Don't throw - we don't want to fail the request if logging fails
    }

    return requestId
  } catch (error) {
    logger.error('Usage logging error', error)
    return generateRequestId() // Return a request ID anyway
  }
}

// Batch log multiple usage records (for efficiency)
export async function logUsageBatch(records: UsageData[]): Promise<void> {
  try {
    const usageLogs: UsageLogInsert[] = records.map((data) => {
      const requestId = generateRequestId()

      // Validate token consistency
      let totalTokens = data.totalTokens
      if (totalTokens > 0) {
        const expectedTotal = data.promptTokens + data.completionTokens
        if (Math.abs(totalTokens - expectedTotal) > 1) {
          logger.warn('Token count mismatch in batch usage logging', {
            provided: totalTokens,
            expected: expectedTotal,
            promptTokens: data.promptTokens,
            completionTokens: data.completionTokens,
            model: data.model,
          })
          // Fix it by using the sum
          totalTokens = expectedTotal
        }
      }

      // HYBRID: Use token-based pricing when tokens available, otherwise per-request
      const cost = calculateCostHybrid(
        data.model,
        data.promptTokens,
        data.completionTokens
      )

      return {
        user_id: data.userId,
        api_key_id: data.apiKeyId,
        server_id: data.serverId || null,
        request_id: requestId,
        endpoint: data.endpoint,
        model: data.model,
        provider: data.provider || null,
        // Token fields with source tracking
        prompt_tokens: data.promptTokens,
        completion_tokens: data.completionTokens,
        total_tokens: totalTokens,
        token_source: data.tokenSource || 'unknown',
        // Hybrid cost calculation
        cost_usd: cost,
        response_time_ms: data.responseTimeMs,
        status_code: data.statusCode,
        is_error: data.isError,
        error_message: data.errorMessage || null,
        request_metadata: data.requestMetadata || {},
        response_metadata: data.responseMetadata || {},
      }
    })

    const { error } = await supabaseAdmin.from('usage_logs').insert(usageLogs)

    if (error) {
      logger.error('Failed to batch log usage', error)
    }
  } catch (error) {
    logger.error('Batch usage logging error', error)
  }
}

// Get usage statistics for a user
export async function getUserUsageStats(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<{
  total_requests: number
  total_tokens: number
  total_cost: number
  error_count: number
  avg_response_time: number
  unique_models: number
}> {
  try {
    let query = supabaseAdmin
      .from('usage_logs')
      .select('total_tokens, cost_usd, is_error, response_time_ms, model')
      .eq('user_id', userId)

    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Failed to get user usage stats', error)
      throw new Error('Failed to get usage statistics')
    }

    if (!data || data.length === 0) {
      return {
        total_requests: 0,
        total_tokens: 0,
        total_cost: 0,
        error_count: 0,
        avg_response_time: 0,
        unique_models: 0,
      }
    }

    const uniqueModels = new Set(data.map((log) => log.model))
    const totalResponseTime = data.reduce(
      (acc, log) => acc + (log.response_time_ms || 0),
      0
    )

    const stats = data.reduce(
      (acc, log) => {
        acc.total_requests++
        acc.total_tokens += log.total_tokens || 0
        acc.total_cost += Number(log.cost_usd) || 0
        if (log.is_error) acc.error_count++
        return acc
      },
      {
        total_requests: 0,
        total_tokens: 0,
        total_cost: 0,
        error_count: 0,
        avg_response_time: Math.round(totalResponseTime / data.length),
        unique_models: uniqueModels.size,
      }
    )

    return stats
  } catch (error) {
    logger.error('Get user usage stats error', error)
    throw error
  }
}

// Get usage by model
export async function getUsageByModel(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<
  Array<{
    model: string
    requests: number
    tokens: number
    cost: number
    avg_response_time: number
  }>
> {
  try {
    let query = supabaseAdmin
      .from('usage_logs')
      .select('model, total_tokens, cost_usd, response_time_ms')
      .eq('user_id', userId)

    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Failed to get usage by model', error)
      throw new Error('Failed to get usage by model')
    }

    // Group by model
    const modelStats = new Map<
      string,
      {
        requests: number
        tokens: number
        cost: number
        totalResponseTime: number
      }
    >()

    for (const log of data || []) {
      const existing = modelStats.get(log.model) || {
        requests: 0,
        tokens: 0,
        cost: 0,
        totalResponseTime: 0,
      }

      existing.requests++
      existing.tokens += log.total_tokens || 0
      existing.cost += Number(log.cost_usd) || 0
      existing.totalResponseTime += log.response_time_ms || 0

      modelStats.set(log.model, existing)
    }

    // Convert to array
    return Array.from(modelStats.entries()).map(([model, stats]) => ({
      model,
      requests: stats.requests,
      tokens: stats.tokens,
      cost: stats.cost,
      avg_response_time: Math.round(stats.totalResponseTime / stats.requests),
    }))
  } catch (error) {
    logger.error('Get usage by model error', error)
    throw error
  }
}

// Get daily usage stats (from materialized view)
export async function getDailyUsageStats(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<
  Array<{
    date: string
    requests: number
    tokens: number
    cost: number
    errors: number
  }>
> {
  try {
    let query = supabaseAdmin
      .from('daily_usage_stats')
      .select('*')
      .eq('user_id', userId)
      .order('usage_date', { ascending: false })

    if (startDate) {
      query = query.gte('usage_date', startDate)
    }
    if (endDate) {
      query = query.lte('usage_date', endDate)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Failed to get daily usage stats', error)
      throw new Error('Failed to get daily usage statistics')
    }

    return (data || []).map((row) => ({
      date: row.usage_date || '',
      requests: row.request_count || 0,
      tokens: row.total_tokens || 0,
      cost: Number(row.total_cost) || 0,
      errors: row.error_count || 0,
    }))
  } catch (error) {
    logger.error('Get daily usage stats error', error)
    throw error
  }
}

// Get recent usage logs (paginated)
export async function getRecentUsageLogs(
  userId: string,
  page: number = 1,
  perPage: number = 20
): Promise<{
  logs: Array<{
    id: string
    request_id: string
    endpoint: string
    model: string
    total_tokens: number
    cost_usd: number
    response_time_ms: number
    status_code: number
    is_error: boolean
    error_message: string | null
    created_at: string
  }>
  total: number
  page: number
  per_page: number
  has_more: boolean
}> {
  try {
    const offset = (page - 1) * perPage

    // Get total count
    const { count } = await supabaseAdmin
      .from('usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Get paginated logs
    const { data, error } = await supabaseAdmin
      .from('usage_logs')
      .select(
        'id, request_id, endpoint, model, total_tokens, cost_usd, response_time_ms, status_code, is_error, error_message, created_at'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1)

    if (error) {
      logger.error('Failed to get recent usage logs', error)
      throw new Error('Failed to get usage logs')
    }

    const totalCount = count || 0
    const hasMore = offset + perPage < totalCount

    return {
      logs: data || [],
      total: totalCount,
      page,
      per_page: perPage,
      has_more: hasMore,
    }
  } catch (error) {
    logger.error('Get recent usage logs error', error)
    throw error
  }
}

// Export usage data (for download)
export async function exportUsageData(
  userId: string,
  startDate?: string,
  endDate?: string,
  format: 'json' | 'csv' = 'json'
): Promise<string> {
  try {
    let query = supabaseAdmin
      .from('usage_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Failed to export usage data', error)
      throw new Error('Failed to export usage data')
    }

    if (format === 'csv') {
      return convertToCSV(data || [])
    }

    return JSON.stringify(data || [], null, 2)
  } catch (error) {
    logger.error('Export usage data error', error)
    throw error
  }
}

// Helper to convert data to CSV
function convertToCSV(data: Array<Record<string, unknown>>): string {
  if (data.length === 0) return ''

  const headers = Object.keys(data[0])
  const rows = data.map((row) =>
    headers.map((header) => JSON.stringify(row[header] || '')).join(',')
  )

  return [headers.join(','), ...rows].join('\n')
}
