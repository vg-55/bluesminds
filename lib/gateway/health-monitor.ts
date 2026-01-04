// ============================================================================
// HEALTH MONITORING MODULE
// ============================================================================

import { supabaseAdmin } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { healthCheckConfig } from '@/lib/config/app'
import type { LiteLLMServer, ServerHealthStatus } from '@/lib/types'

// Perform health check on a server
export async function performHealthCheck(server: LiteLLMServer): Promise<{
  healthy: boolean
  responseTimeMs: number
  error?: string
}> {
  const startTime = Date.now()

  try {
    // Health check endpoint (assuming LiteLLM has a /health endpoint)
    const healthUrl = new URL('/health', server.base_url)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), healthCheckConfig.timeout)

    const response = await fetch(healthUrl.toString(), {
      method: 'GET',
      headers: server.api_key
        ? { Authorization: `Bearer ${server.api_key}` }
        : {},
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const responseTimeMs = Date.now() - startTime
    const healthy = response.ok

    if (!healthy) {
      return {
        healthy: false,
        responseTimeMs,
        error: `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    return {
      healthy: true,
      responseTimeMs,
    }
  } catch (error) {
    const responseTimeMs = Date.now() - startTime

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          healthy: false,
          responseTimeMs,
          error: 'Health check timed out',
        }
      }

      return {
        healthy: false,
        responseTimeMs,
        error: error.message,
      }
    }

    return {
      healthy: false,
      responseTimeMs,
      error: 'Unknown error',
    }
  }
}

// Determine health status based on consecutive failures
function determineHealthStatus(
  consecutiveFailures: number
): ServerHealthStatus {
  if (consecutiveFailures === 0) {
    return 'healthy'
  } else if (consecutiveFailures < 3) {
    return 'degraded'
  } else {
    return 'unhealthy'
  }
}

// Check health of a single server and update database
export async function checkServerHealth(server: LiteLLMServer): Promise<void> {
  try {
    logger.debug('Performing health check', { serverId: server.id, serverName: server.name })

    const result = await performHealthCheck(server)

    // Update database with health check results
    const healthStatus = result.healthy ? 'healthy' : determineHealthStatus(1)

    await supabaseAdmin
      .from('litellm_servers')
      .update({
        health_status: healthStatus,
        last_health_check_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', server.id)

    logger.health(server.name, healthStatus, {
      responseTimeMs: result.responseTimeMs,
      error: result.error,
    })
  } catch (error) {
    logger.error('Health check error', error, { serverId: server.id })
  }
}

// Check health of all servers
export async function checkAllServersHealth(): Promise<void> {
  try {
    // Get all active servers
    const { data: servers, error } = await supabaseAdmin
      .from('litellm_servers')
      .select('*')
      .eq('is_active', true)

    if (error) {
      logger.error('Failed to fetch servers for health check', error)
      return
    }

    if (!servers || servers.length === 0) {
      logger.warn('No active servers to check')
      return
    }

    logger.info(`Starting health check for ${servers.length} servers`)

    // Check all servers in parallel
    await Promise.all(
      servers.map((server) => checkServerHealth(server as LiteLLMServer))
    )

    logger.info('Completed health check for all servers')
  } catch (error) {
    logger.error('Check all servers health error', error)
  }
}

// Start periodic health checks (call this on server startup)
export function startHealthCheckScheduler(): NodeJS.Timeout {
  logger.info(`Starting health check scheduler (interval: ${healthCheckConfig.interval}ms)`)

  // Perform initial health check
  checkAllServersHealth()

  // Schedule periodic health checks
  return setInterval(() => {
    checkAllServersHealth()
  }, healthCheckConfig.interval)
}

// Stop health check scheduler
export function stopHealthCheckScheduler(intervalId: NodeJS.Timeout): void {
  clearInterval(intervalId)
  logger.info('Stopped health check scheduler')
}

// Get health summary of all servers
export async function getHealthSummary(): Promise<{
  total: number
  healthy: number
  degraded: number
  unhealthy: number
  unknown: number
  servers: Array<{
    id: string
    name: string
    health_status: ServerHealthStatus
    last_health_check_at: string | null
    is_active: boolean
  }>
}> {
  try {
    const { data: servers, error } = await supabaseAdmin
      .from('litellm_servers')
      .select('id, name, health_status, last_health_check_at, is_active')
      .order('priority', { ascending: true })

    if (error) {
      logger.error('Failed to get health summary', error)
      throw new Error('Failed to get health summary')
    }

    const summary = {
      total: servers?.length || 0,
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
      unknown: 0,
      servers: servers || [],
    }

    for (const server of servers || []) {
      const status = server.health_status as ServerHealthStatus
      if (status === 'healthy') summary.healthy++
      else if (status === 'degraded') summary.degraded++
      else if (status === 'unhealthy') summary.unhealthy++
      else summary.unknown++
    }

    return summary
  } catch (error) {
    logger.error('Get health summary error', error)
    throw error
  }
}

// Check if a server can handle more requests
export function canHandleRequest(server: LiteLLMServer): boolean {
  // Check if server is active
  if (!server.is_active) {
    return false
  }

  // Check if server is healthy
  if (server.health_status === 'unhealthy') {
    return false
  }

  // Check if server has capacity
  if (server.current_requests >= server.max_concurrent_requests) {
    return false
  }

  return true
}

// Auto-scale: Detect if we need more servers
export async function detectScalingNeed(): Promise<{
  needsScaling: boolean
  reason?: string
  metrics: {
    totalCapacity: number
    currentLoad: number
    utilizationPercent: number
    healthyServers: number
    totalServers: number
  }
}> {
  try {
    const { data: servers } = await supabaseAdmin
      .from('litellm_servers')
      .select('*')
      .eq('is_active', true)

    if (!servers || servers.length === 0) {
      return {
        needsScaling: true,
        reason: 'No active servers available',
        metrics: {
          totalCapacity: 0,
          currentLoad: 0,
          utilizationPercent: 0,
          healthyServers: 0,
          totalServers: 0,
        },
      }
    }

    const healthyServers = servers.filter((s) => s.health_status === 'healthy')
    const totalCapacity = servers.reduce((acc, s) => acc + s.max_concurrent_requests, 0)
    const currentLoad = servers.reduce((acc, s) => acc + s.current_requests, 0)
    const utilizationPercent = totalCapacity > 0 ? (currentLoad / totalCapacity) * 100 : 0

    const metrics = {
      totalCapacity,
      currentLoad,
      utilizationPercent,
      healthyServers: healthyServers.length,
      totalServers: servers.length,
    }

    // Need scaling if utilization > 80% or less than 2 healthy servers
    const needsScaling =
      utilizationPercent > 80 || healthyServers.length < 2

    let reason: string | undefined
    if (utilizationPercent > 80) {
      reason = `High utilization: ${utilizationPercent.toFixed(1)}%`
    } else if (healthyServers.length < 2) {
      reason = `Insufficient healthy servers: ${healthyServers.length}`
    }

    return {
      needsScaling,
      reason,
      metrics,
    }
  } catch (error) {
    logger.error('Detect scaling need error', error)
    throw error
  }
}
