// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

import type { ApiError } from '@/lib/types'

// Custom error classes
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 500,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }

  toJSON(): ApiError {
    return {
      code: this.code,
      message: this.message,
      status: this.status,
      details: this.details,
    }
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed', details?: unknown) {
    super('AUTHENTICATION_ERROR', message, 401, details)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Permission denied', details?: unknown) {
    super('AUTHORIZATION_ERROR', message, 403, details)
    this.name = 'AuthorizationError'
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super('VALIDATION_ERROR', message, 400, details)
    this.name = 'ValidationError'
  }
}

export class RateLimitError extends AppError {
  constructor(
    message = 'Rate limit exceeded',
    public retryAfter: number,
    details?: unknown
  ) {
    super('RATE_LIMIT_EXCEEDED', message, 429, details)
    this.name = 'RateLimitError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, details?: unknown) {
    super('NOT_FOUND', `${resource} not found`, 404, details)
    this.name = 'NotFoundError'
  }
}

export class ServerError extends AppError {
  constructor(message = 'Internal server error', details?: unknown) {
    super('SERVER_ERROR', message, 500, details)
    this.name = 'ServerError'
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable', details?: unknown) {
    super('SERVICE_UNAVAILABLE', message, 503, details)
    this.name = 'ServiceUnavailableError'
  }
}

export class GatewayError extends AppError {
  constructor(message = 'Gateway error', details?: unknown) {
    super('GATEWAY_ERROR', message, 502, details)
    this.name = 'GatewayError'
  }
}

// Error handler for API routes
export function handleApiError(error: unknown): {
  error: ApiError
  status: number
} {
  // Handle our custom errors
  if (error instanceof AppError) {
    return {
      error: error.toJSON(),
      status: error.status,
    }
  }

  // Handle Zod validation errors
  if (error && typeof error === 'object' && 'issues' in error) {
    return {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        status: 400,
        details: error,
      },
      status: 400,
    }
  }

  // Handle generic errors
  if (error instanceof Error) {
    return {
      error: {
        code: 'SERVER_ERROR',
        message: error.message,
        status: 500,
      },
      status: 500,
    }
  }

  // Unknown error
  return {
    error: {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      status: 500,
    },
    status: 500,
  }
}

// Error response helper for Next.js API routes
export function errorResponse(error: unknown) {
  const { error: apiError, status } = handleApiError(error)
  return Response.json(
    {
      success: false,
      error: apiError,
    },
    { status }
  )
}

// Success response helper
export function successResponse<T>(data: T, status = 200) {
  return Response.json(
    {
      success: true,
      data,
    },
    { status }
  )
}

// Helper to check if error is a specific type
export function isErrorType<T extends AppError>(
  error: unknown,
  ErrorClass: new (...args: any[]) => T
): error is T {
  return error instanceof ErrorClass
}
