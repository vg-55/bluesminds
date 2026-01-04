// ============================================================================
// MONITORING & OBSERVABILITY
// ============================================================================

import { logger } from './logger'

export interface MonitoringConfig {
  sentryDsn?: string
  logtailToken?: string
  enablePerformanceMonitoring?: boolean
}

export const monitoringConfig: MonitoringConfig = {
  sentryDsn: process.env.SENTRY_DSN,
  logtailToken: process.env.LOGTAIL_SOURCE_TOKEN,
  enablePerformanceMonitoring: process.env.ENABLE_PERFORMANCE_MONITORING === 'true',
}

// Initialize monitoring services
export function initMonitoring() {
  // Sentry initialization (if configured)
  if (monitoringConfig.sentryDsn) {
    logger.info('Sentry monitoring initialized')
    // Note: Actual Sentry SDK initialization would go here
    // import * as Sentry from '@sentry/nextjs'
    // Sentry.init({ dsn: monitoringConfig.sentryDsn, ... })
  }

  // Logtail initialization (if configured)
  if (monitoringConfig.logtailToken) {
    logger.info('Logtail logging initialized')
    // Note: Actual Logtail SDK initialization would go here
  }

  logger.info('Monitoring services initialized', {
    sentry: !!monitoringConfig.sentryDsn,
    logtail: !!monitoringConfig.logtailToken,
    performance: monitoringConfig.enablePerformanceMonitoring,
  })
}

// Track custom metrics
export interface Metric {
  name: string
  value: number
  unit: string
  tags?: Record<string, string>
  timestamp?: Date
}

export function trackMetric(metric: Metric) {
  logger.info('Metric tracked', {
    metric: metric.name,
    value: metric.value,
    unit: metric.unit,
    tags: metric.tags,
    timestamp: metric.timestamp || new Date(),
  })

  // Send to monitoring service (Datadog, CloudWatch, etc.)
  // Implementation depends on your monitoring provider
}

// Performance monitoring
export function measurePerformance<T>(
  operationName: string,
  operation: () => T | Promise<T>
): Promise<T> {
  const startTime = Date.now()

  const handleComplete = (result: T) => {
    const duration = Date.now() - startTime

    trackMetric({
      name: `operation.${operationName}.duration`,
      value: duration,
      unit: 'milliseconds',
    })

    if (duration > 1000) {
      logger.warn('Slow operation detected', {
        operation: operationName,
        duration,
      })
    }

    return result
  }

  const handleError = (error: unknown) => {
    const duration = Date.now() - startTime

    logger.error('Operation failed', {
      operation: operationName,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    throw error
  }

  try {
    const result = operation()

    if (result instanceof Promise) {
      return result.then(handleComplete).catch(handleError)
    }

    return Promise.resolve(handleComplete(result))
  } catch (error) {
    return Promise.reject(handleError(error))
  }
}

// Alert on critical errors
export function sendAlert(
  level: 'info' | 'warning' | 'error' | 'critical',
  message: string,
  context?: Record<string, unknown>
) {
  logger[level === 'critical' ? 'error' : level](message, context)

  // Send to alerting service (PagerDuty, Opsgenie, etc.)
  // Implementation depends on your alerting provider

  if (level === 'critical') {
    // Additional critical alert handling
    // E.g., send SMS, page on-call engineer, etc.
  }
}

// Track API usage
export function trackApiUsage(
  endpoint: string,
  method: string,
  statusCode: number,
  duration: number,
  userId?: string
) {
  trackMetric({
    name: 'api.request',
    value: 1,
    unit: 'count',
    tags: {
      endpoint,
      method,
      statusCode: statusCode.toString(),
      userId: userId || 'anonymous',
    },
  })

  trackMetric({
    name: 'api.duration',
    value: duration,
    unit: 'milliseconds',
    tags: {
      endpoint,
      method,
    },
  })

  // Track errors separately
  if (statusCode >= 400) {
    trackMetric({
      name: 'api.error',
      value: 1,
      unit: 'count',
      tags: {
        endpoint,
        method,
        statusCode: statusCode.toString(),
      },
    })
  }
}

// System health metrics
export function collectSystemMetrics() {
  const metrics: Metric[] = []

  // Memory usage
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const memUsage = process.memoryUsage()
    metrics.push({
      name: 'system.memory.used',
      value: memUsage.heapUsed,
      unit: 'bytes',
    })
    metrics.push({
      name: 'system.memory.total',
      value: memUsage.heapTotal,
      unit: 'bytes',
    })
  }

  // CPU usage (Node.js)
  if (typeof process !== 'undefined' && process.cpuUsage) {
    const cpuUsage = process.cpuUsage()
    metrics.push({
      name: 'system.cpu.user',
      value: cpuUsage.user,
      unit: 'microseconds',
    })
    metrics.push({
      name: 'system.cpu.system',
      value: cpuUsage.system,
      unit: 'microseconds',
    })
  }

  // Uptime
  if (typeof process !== 'undefined' && process.uptime) {
    metrics.push({
      name: 'system.uptime',
      value: process.uptime(),
      unit: 'seconds',
    })
  }

  return metrics
}
