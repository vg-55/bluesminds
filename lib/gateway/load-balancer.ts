// ============================================================================
// LOAD BALANCER MODULE
// ============================================================================

import { supabaseAdmin } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { ServiceUnavailableError, NotFoundError } from '@/lib/utils/errors'
import type { LiteLLMServer, ServerSelection } from '@/lib/types'

// Custom model mapping type
export interface CustomModelMapping {
  customName: string
  actualModelName: string
  providerId: string
  displayName: string | null
  description: string | null
  priority: number
  weight: number
}

// Resolve custom model mappings (returns all provider mappings for a model)
export async function resolveCustomModel(customName: string): Promise<CustomModelMapping[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('custom_models')
      .select('custom_name, actual_model_name, provider_id, display_name, description, priority, weight')
      .eq('custom_name', customName)
      .eq('is_active', true)
      .order('priority', { ascending: true })
      .order('weight', { ascending: false })

    if (error || !data || data.length === 0) {
      return []
    }

    return data.map(mapping => ({
      customName: mapping.custom_name,
      actualModelName: mapping.actual_model_name,
      providerId: mapping.provider_id,
      displayName: mapping.display_name,
      description: mapping.description,
      priority: mapping.priority || 100,
      weight: mapping.weight || 1.0,
    }))
  } catch (error) {
    logger.warn('Failed to resolve custom model', { customName, error })
    return []
  }
}

// Select a healthy LiteLLM server for routing
export async function selectServer(model?: string): Promise<ServerSelection> {
  try {
    let actualModel = model
    let customMappings: CustomModelMapping[] = []
    let isCustomModel = false

    // Check if this is a custom model mapping
    if (model) {
      customMappings = await resolveCustomModel(model)
      if (customMappings.length > 0) {
        isCustomModel = true

        logger.gateway('Custom model resolved with multiple providers', {
          customName: model,
          providerCount: customMappings.length,
          providers: customMappings.map(m => ({
            providerId: m.providerId,
            actualModel: m.actualModelName,
            priority: m.priority,
            weight: m.weight,
          })),
        })
      }
    }

    let servers: LiteLLMServer[] = []

    // If we have custom model mappings, fetch servers for all mapped providers
    if (customMappings.length > 0) {
      const providerIds = customMappings.map(m => m.providerId)

      const { data, error } = await supabaseAdmin
        .from('litellm_servers')
        .select('*')
        .in('id', providerIds)
        .eq('is_active', true)
        .neq('health_status', 'unhealthy')

      if (error) {
        logger.error('Failed to fetch servers for custom model', error)
        throw new ServiceUnavailableError('Failed to fetch available servers')
      }

      servers = (data || []) as LiteLLMServer[]

      // Enrich servers with custom model mapping info (priority, weight, actual model)
      servers = servers.map(server => {
        const mapping = customMappings.find(m => m.providerId === server.id)
        return {
          ...server,
          // Use custom model priority/weight if available, otherwise use server defaults
          priority: mapping?.priority || server.priority,
          weight: mapping?.weight || server.weight,
          _actualModel: mapping?.actualModelName, // Store actual model name
        } as LiteLLMServer & { _actualModel?: string }
      })

      // If we have the actual model name from mapping, use it
      if (customMappings[0]?.actualModelName) {
        actualModel = customMappings[0].actualModelName
      }
    } else {
      // No custom mapping - use traditional server selection
      let query = supabaseAdmin
        .from('litellm_servers')
        .select('*')
        .eq('is_active', true)
        .neq('health_status', 'unhealthy')
        .order('priority', { ascending: true })
        .order('weight', { ascending: false })

      if (actualModel) {
        // Try to filter by model support if specified
        query = query.contains('supported_models', [actualModel])
      }

      const { data, error } = await query

      if (error) {
        logger.error('Failed to fetch servers', error)
        throw new ServiceUnavailableError('Failed to fetch available servers')
      }

      servers = (data || []) as LiteLLMServer[]
    }

    // Strict mode: Only allow mapped models or models explicitly in supported_models
    if (!servers || servers.length === 0) {
      if (isCustomModel) {
        throw new ServiceUnavailableError(`Model "${model}" is configured but no healthy providers are available`)
      }
      if (model && !isCustomModel) {
        throw new ServiceUnavailableError(`Model "${model}" is not available. Please use a mapped model name from /v1/models endpoint.`)
      }
      throw new ServiceUnavailableError(`No servers available for model "${model}"`)
    }

    // Select server using weighted round-robin with priority
    const selectedServer = selectByWeightedRoundRobin(servers)

    // Get the actual model for this specific server if available
    const serverWithModel = selectedServer as LiteLLMServer & { _actualModel?: string }
    if (serverWithModel._actualModel) {
      actualModel = serverWithModel._actualModel
    }

    logger.gateway('Server selected', {
      serverId: selectedServer.id,
      serverName: selectedServer.name,
      requestedModel: model,
      actualModel,
      isCustomModel,
      availableProviders: servers.length,
      serverPriority: selectedServer.priority,
      serverWeight: selectedServer.weight,
    })

    return {
      server: selectedServer,
      reason: customMappings.length > 1 ? 'multi_provider_rotation' : 'round_robin',
      actualModel, // Return the actual model to use in the request
    }
  } catch (error) {
    if (error instanceof ServiceUnavailableError) {
      throw error
    }
    logger.error('Server selection error', error)
    throw new ServiceUnavailableError('Failed to select server')
  }
}

// Weighted round-robin selection (considers priority and weight)
function selectByWeightedRoundRobin(servers: LiteLLMServer[]): LiteLLMServer {
  // Group servers by priority
  const priorities = new Map<number, LiteLLMServer[]>()

  for (const server of servers) {
    if (!priorities.has(server.priority)) {
      priorities.set(server.priority, [])
    }
    priorities.get(server.priority)!.push(server)
  }

  // Get servers with highest priority (lowest number)
  const highestPriority = Math.min(...priorities.keys())
  const priorityServers = priorities.get(highestPriority)!

  // If only one server at this priority, return it
  if (priorityServers.length === 1) {
    return priorityServers[0]
  }

  // Select based on least current connections and weight
  return priorityServers.reduce((best, server) => {
    // Calculate load factor (lower is better)
    const serverLoad = server.current_requests / (server.max_concurrent_requests * server.weight)
    const bestLoad = best.current_requests / (best.max_concurrent_requests * best.weight)

    return serverLoad < bestLoad ? server : best
  })
}

// Increment server request counter
export async function incrementServerRequests(serverId: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin.rpc('increment_server_requests', {
      p_server_id: serverId,
    }).catch(() => {
      // If function doesn't exist, use manual update
      return supabaseAdmin
        .from('litellm_servers')
        .update({ current_requests: supabaseAdmin.raw('current_requests + 1') })
        .eq('id', serverId)
    })

    if (error) {
      logger.warn('Failed to increment server requests', { error, serverId })
    }
  } catch (error) {
    logger.warn('Increment server requests error', { error, serverId })
    // Don't throw - this is non-critical
  }
}

// Decrement server request counter
export async function decrementServerRequests(serverId: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin.rpc('decrement_server_requests', {
      p_server_id: serverId,
    }).catch(() => {
      // If function doesn't exist, use manual update
      return supabaseAdmin
        .from('litellm_servers')
        .update({
          current_requests: supabaseAdmin.raw('GREATEST(current_requests - 1, 0)')
        })
        .eq('id', serverId)
    })

    if (error) {
      logger.warn('Failed to decrement server requests', { error, serverId })
    }
  } catch (error) {
    logger.warn('Decrement server requests error', { error, serverId })
    // Don't throw - this is non-critical
  }
}

// Record server response (for metrics and health monitoring)
export async function recordServerResponse(
  serverId: string,
  responseTimeMs: number,
  success: boolean
): Promise<void> {
  try {
    // Update server metrics
    const { error } = await supabaseAdmin.rpc('update_server_metrics', {
      p_server_id: serverId,
      p_response_time_ms: responseTimeMs,
      p_success: success,
    }).catch(async () => {
      // If function doesn't exist, use manual update
      const { data: server } = await supabaseAdmin
        .from('litellm_servers')
        .select('total_requests, failed_requests, avg_response_time_ms')
        .eq('id', serverId)
        .single()

      if (!server) return { error: new Error('Server not found') }

      const newTotalRequests = server.total_requests + 1
      const newFailedRequests = server.failed_requests + (success ? 0 : 1)
      const newAvgResponseTime = Math.round(
        (server.avg_response_time_ms * server.total_requests + responseTimeMs) / newTotalRequests
      )

      return supabaseAdmin
        .from('litellm_servers')
        .update({
          total_requests: newTotalRequests,
          failed_requests: newFailedRequests,
          avg_response_time_ms: newAvgResponseTime,
        })
        .eq('id', serverId)
    })

    if (error) {
      logger.warn('Failed to record server response', { error, serverId })
    }

    // Update health status based on error rate
    await updateServerHealth(serverId)
  } catch (error) {
    logger.warn('Record server response error', { error, serverId })
    // Don't throw - this is non-critical
  }
}

// Update server health status based on metrics
async function updateServerHealth(serverId: string): Promise<void> {
  try {
    const { data: server } = await supabaseAdmin
      .from('litellm_servers')
      .select('total_requests, failed_requests')
      .eq('id', serverId)
      .single()

    if (!server || server.total_requests < 10) {
      // Not enough data yet
      return
    }

    const errorRate = server.failed_requests / server.total_requests
    let healthStatus: 'healthy' | 'degraded' | 'unhealthy'

    if (errorRate < 0.05) {
      healthStatus = 'healthy'
    } else if (errorRate < 0.2) {
      healthStatus = 'degraded'
    } else {
      healthStatus = 'unhealthy'
    }

    await supabaseAdmin
      .from('litellm_servers')
      .update({ health_status: healthStatus })
      .eq('id', serverId)

    if (healthStatus !== 'healthy') {
      logger.health(serverId, healthStatus, {
        errorRate,
        totalRequests: server.total_requests,
        failedRequests: server.failed_requests,
      })
    }
  } catch (error) {
    logger.warn('Update server health error', { error, serverId })
  }
}

// Get all servers with their health status
export async function getAllServers(): Promise<LiteLLMServer[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('litellm_servers')
      .select('*')
      .order('priority', { ascending: true })

    if (error) {
      logger.error('Failed to get all servers', error)
      throw new Error('Failed to get servers')
    }

    return (data || []) as LiteLLMServer[]
  } catch (error) {
    logger.error('Get all servers error', error)
    throw error
  }
}

// Get server by ID
export async function getServer(serverId: string): Promise<LiteLLMServer> {
  try {
    const { data, error } = await supabaseAdmin
      .from('litellm_servers')
      .select('*')
      .eq('id', serverId)
      .single()

    if (error) {
      logger.error('Failed to get server', error)
      throw new Error('Server not found')
    }

    return data as LiteLLMServer
  } catch (error) {
    logger.error('Get server error', error)
    throw error
  }
}

// Fallback server selection (if primary selection fails)
export async function selectFallbackServer(
  excludeServerId?: string
): Promise<ServerSelection> {
  try {
    let query = supabaseAdmin
      .from('litellm_servers')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true })
      .limit(1)

    if (excludeServerId) {
      query = query.neq('id', excludeServerId)
    }

    const { data, error } = await query.single()

    if (error || !data) {
      throw new ServiceUnavailableError('No fallback servers available')
    }

    logger.gateway('Fallback server selected', {
      serverId: data.id,
      serverName: data.name,
    })

    return {
      server: data as LiteLLMServer,
      reason: 'failover',
    }
  } catch (error) {
    logger.error('Fallback server selection error', error)
    throw new ServiceUnavailableError('All servers unavailable')
  }
}
