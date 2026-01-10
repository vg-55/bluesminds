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
    // In production, log info and above (info, warn, error)
    return ['info', 'warn', 'error'].includes(level)
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
  }

  private async sendToExternalService(level: LogLevel, message: string, context?: LogContext) {
    // Always log to console with structured format for easy parsing
    const structuredLog = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      ...context,
    }

    // Send to Logtail if configured
    if (env.LOGTAIL_SOURCE_TOKEN) {
      try {
        await fetch('https://in.logtail.com/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.LOGTAIL_SOURCE_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dt: new Date().toISOString(),
            level: level,
            message: message,
            ...context,
          }),
        }).catch((err) => {
          // Fail silently but log to console
          console.error('Failed to send log to Logtail:', err.message)
        })
      } catch (err) {
        // Fail silently - we don't want logging to break the app
      }
    }

    // Send to Sentry for errors
    if (level === 'error' && env.SENTRY_DSN) {
      try {
        // For now, just log - actual Sentry SDK integration would go here
        // import * as Sentry from '@sentry/nextjs'
        // Sentry.captureException(new Error(message), { extra: context })
        console.error('SENTRY:', structuredLog)
      } catch (err) {
        // Fail silently
      }
    }
  }

  debug(message: string, context?: LogContext) {
    if (this.shouldLog('debug')) {
      const formatted = this.formatMessage('debug', message, context)
      console.debug(formatted)
    }
  }

  info(message: string, context?: LogContext) {
    if (this.shouldLog('info')) {
      const formatted = this.formatMessage('info', message, context)
      console.info(formatted)
      // Fire and forget - don't wait for external service
      this.sendToExternalService('info', message, context).catch(() => {})
    }
  }

  warn(message: string, context?: LogContext) {
    if (this.shouldLog('warn')) {
      const formatted = this.formatMessage('warn', message, context)
      console.warn(formatted)
      // Fire and forget - don't wait for external service
      this.sendToExternalService('warn', message, context).catch(() => {})
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
      const formatted = this.formatMessage('error', message, errorContext)
      console.error(formatted)
      // Fire and forget - don't wait for external service
      this.sendToExternalService('error', message, errorContext).catch(() => {})
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
