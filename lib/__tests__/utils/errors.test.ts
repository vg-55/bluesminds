import { describe, it, expect } from 'vitest'
import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  RateLimitError,
  NotFoundError,
  ServerError,
  ServiceUnavailableError,
  GatewayError,
  handleApiError,
  errorResponse,
  successResponse,
  isErrorType,
} from '@/lib/utils/errors'

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create an AppError with correct properties', () => {
      const error = new AppError('TEST_CODE', 'Test message', 400, { test: true })

      expect(error.code).toBe('TEST_CODE')
      expect(error.message).toBe('Test message')
      expect(error.status).toBe(400)
      expect(error.details).toEqual({ test: true })
      expect(error.name).toBe('AppError')
    })

    it('should serialize to JSON correctly', () => {
      const error = new AppError('TEST_CODE', 'Test message', 400)
      const json = error.toJSON()

      expect(json).toEqual({
        code: 'TEST_CODE',
        message: 'Test message',
        status: 400,
        details: undefined,
      })
    })

    it('should default to status 500', () => {
      const error = new AppError('TEST_CODE', 'Test message')
      expect(error.status).toBe(500)
    })
  })

  describe('AuthenticationError', () => {
    it('should create with default message', () => {
      const error = new AuthenticationError()

      expect(error.code).toBe('AUTHENTICATION_ERROR')
      expect(error.message).toBe('Authentication failed')
      expect(error.status).toBe(401)
      expect(error.name).toBe('AuthenticationError')
    })

    it('should accept custom message and details', () => {
      const error = new AuthenticationError('Invalid token', { token: 'abc' })

      expect(error.message).toBe('Invalid token')
      expect(error.details).toEqual({ token: 'abc' })
    })
  })

  describe('AuthorizationError', () => {
    it('should create with correct properties', () => {
      const error = new AuthorizationError()

      expect(error.code).toBe('AUTHORIZATION_ERROR')
      expect(error.status).toBe(403)
      expect(error.name).toBe('AuthorizationError')
    })
  })

  describe('ValidationError', () => {
    it('should create with correct properties', () => {
      const error = new ValidationError('Invalid input', { field: 'email' })

      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.status).toBe(400)
      expect(error.message).toBe('Invalid input')
      expect(error.details).toEqual({ field: 'email' })
    })
  })

  describe('RateLimitError', () => {
    it('should include retryAfter property', () => {
      const error = new RateLimitError('Too many requests', 60)

      expect(error.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(error.status).toBe(429)
      expect(error.retryAfter).toBe(60)
    })
  })

  describe('NotFoundError', () => {
    it('should format message with resource name', () => {
      const error = new NotFoundError('User')

      expect(error.code).toBe('NOT_FOUND')
      expect(error.message).toBe('User not found')
      expect(error.status).toBe(404)
    })
  })

  describe('ServerError', () => {
    it('should create with correct properties', () => {
      const error = new ServerError()

      expect(error.code).toBe('SERVER_ERROR')
      expect(error.status).toBe(500)
    })
  })

  describe('ServiceUnavailableError', () => {
    it('should create with correct properties', () => {
      const error = new ServiceUnavailableError()

      expect(error.code).toBe('SERVICE_UNAVAILABLE')
      expect(error.status).toBe(503)
    })
  })

  describe('GatewayError', () => {
    it('should create with correct properties', () => {
      const error = new GatewayError('Upstream error')

      expect(error.code).toBe('GATEWAY_ERROR')
      expect(error.status).toBe(502)
      expect(error.message).toBe('Upstream error')
    })
  })
})

describe('handleApiError', () => {
  it('should handle AppError instances', () => {
    const error = new ValidationError('Invalid data')
    const result = handleApiError(error)

    expect(result.status).toBe(400)
    expect(result.error.code).toBe('VALIDATION_ERROR')
    expect(result.error.message).toBe('Invalid data')
  })

  it('should handle Zod validation errors', () => {
    const zodError = { issues: [{ message: 'Required' }] }
    const result = handleApiError(zodError)

    expect(result.status).toBe(400)
    expect(result.error.code).toBe('VALIDATION_ERROR')
    expect(result.error.message).toBe('Invalid request data')
  })

  it('should handle generic Error instances', () => {
    const error = new Error('Something went wrong')
    const result = handleApiError(error)

    expect(result.status).toBe(500)
    expect(result.error.code).toBe('SERVER_ERROR')
    expect(result.error.message).toBe('Something went wrong')
  })

  it('should handle unknown errors', () => {
    const error = 'string error'
    const result = handleApiError(error)

    expect(result.status).toBe(500)
    expect(result.error.code).toBe('UNKNOWN_ERROR')
    expect(result.error.message).toBe('An unknown error occurred')
  })
})

describe('errorResponse', () => {
  it('should return a Response object with error', () => {
    const error = new NotFoundError('Resource')
    const response = errorResponse(error)

    expect(response).toBeInstanceOf(Response)
    expect(response.status).toBe(404)
  })
})

describe('successResponse', () => {
  it('should return a Response object with data', () => {
    const data = { id: 1, name: 'Test' }
    const response = successResponse(data)

    expect(response).toBeInstanceOf(Response)
    expect(response.status).toBe(200)
  })

  it('should accept custom status code', () => {
    const data = { created: true }
    const response = successResponse(data, 201)

    expect(response.status).toBe(201)
  })
})

describe('isErrorType', () => {
  it('should correctly identify error types', () => {
    const authError = new AuthenticationError()
    const validationError = new ValidationError()

    expect(isErrorType(authError, AuthenticationError)).toBe(true)
    expect(isErrorType(authError, ValidationError)).toBe(false)
    expect(isErrorType(validationError, ValidationError)).toBe(true)
  })

  it('should return false for non-errors', () => {
    const notAnError = { message: 'I am not an error' }

    expect(isErrorType(notAnError, AppError)).toBe(false)
  })
})
