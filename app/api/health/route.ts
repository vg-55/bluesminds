// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================
// Used by load balancers and monitoring systems to check application health

import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/utils/errors'
import { supabaseAdmin } from '@/lib/supabase/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  checks: {
    database: {
      status: 'up' | 'down'
      responseTime?: number
      error?: string
    }
    memory: {
      used: number
      total: number
      percentage: number
    }
    uptime: number
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const health: HealthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      checks: {
        database: {
          status: 'up',
        },
        memory: {
          used: 0,
          total: 0,
          percentage: 0,
        },
        uptime: process.uptime(),
      },
    }

    // Check database connectivity
    try {
      const dbStartTime = Date.now()

      if (!supabaseAdmin) {
        health.checks.database = {
          status: 'down',
          error: 'Supabase admin client not available',
        }
        health.status = 'unhealthy'
      } else {
        // Simple query to check database
        const { error } = await supabaseAdmin.from('users').select('id').limit(1)

        const dbResponseTime = Date.now() - dbStartTime

        if (error) {
          health.checks.database = {
            status: 'down',
            error: error.message,
            responseTime: dbResponseTime,
          }
          health.status = 'degraded'
        } else {
          health.checks.database = {
            status: 'up',
            responseTime: dbResponseTime,
          }
        }
      }
    } catch (error) {
      health.checks.database = {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown database error',
      }
      health.status = 'unhealthy'
    }

    // Memory check
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage()
      const totalMemory = memUsage.heapTotal
      const usedMemory = memUsage.heapUsed
      const percentage = (usedMemory / totalMemory) * 100

      health.checks.memory = {
        used: Math.round(usedMemory / 1024 / 1024), // MB
        total: Math.round(totalMemory / 1024 / 1024), // MB
        percentage: Math.round(percentage * 100) / 100,
      }

      // Mark as degraded if memory usage is over 90%
      if (percentage > 90) {
        health.status = 'degraded'
      }
    }

    // Return appropriate status code based on health
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503

    return successResponse(health, statusCode)
  } catch (error) {
    return errorResponse(error)
  }
}

// HEAD request for simple liveness check
export async function HEAD() {
  return new Response(null, { status: 200 })
}
