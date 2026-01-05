// ============================================================================
// APPLICATION CONFIGURATION
// ============================================================================

import { env, features, defaultRateLimits } from './env'
import type { AppConfig } from '@/lib/types'

export const appConfig: AppConfig = {
  app: {
    name: 'AI Gateway',
    url: env.NEXT_PUBLIC_APP_URL,
    environment: env.NODE_ENV,
  },
  features,
  rateLimits: {
    default: {
      rpm: defaultRateLimits.rpm,
      tpm: defaultRateLimits.tpm,
      daily_quota: defaultRateLimits.daily_quota,
      monthly_quota: defaultRateLimits.monthly_quota,
    },
  },
  billing: {
    enabled: features.billing,
    currency: 'USD',
  },
}

// API Key configuration
export const apiKeyConfig = {
  prefix: 'gw_', // Gateway prefix
  length: 32, // Length of the random part
  displayLength: 8, // Characters to show in UI
}

// ============================================================================
// REQUEST-BASED PRICING (Primary billing model)
// ============================================================================

// Model pricing (cost per request) - Used for billing
export const modelPricingRequests: Record<string, number> = {
  // OpenAI
  'gpt-4': 0.02,
  'gpt-4-turbo': 0.01,
  'gpt-4o': 0.005,
  'gpt-3.5-turbo': 0.005,

  // Anthropic
  'claude-3-opus-20240229': 0.015,
  'claude-3-sonnet-20240229': 0.008,
  'claude-3-haiku-20240307': 0.003,
  'claude-3-5-sonnet-20241022': 0.008,

  // Google
  'gemini-pro': 0.002,
  'gemini-1.5-pro': 0.004,
  'gemini-1.5-flash': 0.001,

  // Default fallback
  'default': 0.005,
}

// Get pricing for a model (with fallback to default)
export function getModelPricingRequest(model: string): number {
  // Try exact match first
  if (model in modelPricingRequests) {
    return modelPricingRequests[model]
  }

  // Try partial match (e.g., "gpt-4-0613" -> "gpt-4")
  const baseModel = Object.keys(modelPricingRequests).find((key) =>
    model.startsWith(key)
  )
  if (baseModel) {
    return modelPricingRequests[baseModel]
  }

  // Fallback to default
  return modelPricingRequests.default
}

// Calculate cost per request (request-based billing)
export function calculateCostByRequest(model: string): number {
  return getModelPricingRequest(model)
}

// ============================================================================
// TOKEN-BASED PRICING (Legacy - kept for analytics only)
// ============================================================================

// Model pricing (cost per 1K tokens) - Used for analytics/logging only
export const modelPricing: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },

  // Anthropic
  'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
  'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
  'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
  'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },

  // Google
  'gemini-pro': { input: 0.00025, output: 0.0005 },
  'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
  'gemini-1.5-flash': { input: 0.000125, output: 0.0005 },

  // Default fallback
  'default': { input: 0.001, output: 0.002 },
}

// Get pricing for a model (with fallback to default)
export function getModelPricing(model: string): { input: number; output: number } {
  // Try exact match first
  if (model in modelPricing) {
    return modelPricing[model]
  }

  // Try partial match (e.g., "gpt-4-0613" -> "gpt-4")
  const baseModel = Object.keys(modelPricing).find((key) => model.startsWith(key))
  if (baseModel) {
    return modelPricing[baseModel]
  }

  // Fallback to default
  return modelPricing.default
}

// Calculate cost based on token usage (for analytics/logging only, not billing)
export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = getModelPricing(model)
  const inputCost = (promptTokens / 1000) * pricing.input
  const outputCost = (completionTokens / 1000) * pricing.output
  return inputCost + outputCost
}

// Health check intervals (in milliseconds)
export const healthCheckConfig = {
  interval: 60000, // Check every 60 seconds
  timeout: 10000, // 10 second timeout
  retries: 3, // Retry 3 times before marking as unhealthy
}

// Request timeouts (in milliseconds)
export const timeoutConfig = {
  gateway: 30000, // 30 seconds for gateway requests
  litellm: 60000, // 60 seconds for LiteLLM proxy requests
  streaming: 300000, // 5 minutes for streaming requests
}

// Pagination defaults
export const paginationConfig = {
  defaultPage: 1,
  defaultPerPage: 20,
  maxPerPage: 100,
}

// CORS configuration
export const corsConfig = {
  allowedOrigins: env.NODE_ENV === 'production'
    ? [env.NEXT_PUBLIC_APP_URL] // Only allow your domain in production
    : ['http://localhost:3000', 'http://localhost:3001'], // Allow localhost in dev
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-API-Key',
    'X-Request-ID',
  ],
}
