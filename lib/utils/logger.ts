// ============================================================================
// LOGGING UTILITY
// ============================================================================

import { env, isDevelopment } from '@/lib/config/env'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

class Logger {
  private shouldLog(level: LogLevel): boolean {
    if (isDevelopment) return true
    // In production, only log warnings and errors
    return ['warn', 'error'].includes(level)
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
  }

  private sendToExternalService(level: LogLevel, message: string, context?: LogContext) {
    // Send to Logtail if configured
    if (env.LOGTAIL_SOURCE_TOKEN) {
      // Implementation for Logtail or other logging service
      // This would typically use fetch to send logs to the service
    }

    // Send to Sentry for errors
    if (level === 'error' && env.SENTRY_DSN) {
      // Implementation for Sentry error tracking
    }
  }

  debug(message: string, context?: LogContext) {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context))
    }
  }

  info(message: string, context?: LogContext) {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context))
      this.sendToExternalService('info', message, context)
    }
  }

  warn(message: string, context?: LogContext) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context))
      this.sendToExternalService('warn', message, context)
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    if (this.shouldLog('error')) {
      const errorContext = {
        ...context,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : error,
      }
      console.error(this.formatMessage('error', message, errorContext))
      this.sendToExternalService('error', message, errorContext)
    }
  }

  // Specialized logging methods
  request(method: string, path: string, context?: LogContext) {
    this.info(`${method} ${path}`, { type: 'request', ...context })
  }

  response(method: string, path: string, status: number, duration: number, context?: LogContext) {
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'
    this[level](`${method} ${path} ${status} ${duration}ms`, {
      type: 'response',
      status,
      duration,
      ...context,
    })
  }

  gateway(action: string, context?: LogContext) {
    this.info(`Gateway: ${action}`, { type: 'gateway', ...context })
  }

  rateLimit(apiKeyId: string, limitType: string, context?: LogContext) {
    this.warn(`Rate limit exceeded: ${limitType}`, {
      type: 'rate_limit',
      apiKeyId,
      limitType,
      ...context,
    })
  }

  auth(action: string, success: boolean, context?: LogContext) {
    const level = success ? 'info' : 'warn'
    this[level](`Auth: ${action}`, {
      type: 'auth',
      success,
      ...context,
    })
  }

  billing(action: string, context?: LogContext) {
    this.info(`Billing: ${action}`, { type: 'billing', ...context })
  }

  health(serverName: string, status: string, context?: LogContext) {
    const level = status === 'healthy' ? 'info' : status === 'unhealthy' ? 'error' : 'warn'
    this[level](`Health check: ${serverName} - ${status}`, {
      type: 'health',
      serverName,
      status,
      ...context,
    })
  }
}

export const logger = new Logger()
