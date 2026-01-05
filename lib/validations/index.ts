// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

import { z } from 'zod'

// ----------------------------------------------------------------------------
// User Schemas
// ----------------------------------------------------------------------------
export const userSignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  full_name: z.string().min(1, 'Full name is required').max(100).optional(),
  company_name: z.string().max(200).optional(),
  referral_code: z.string().length(8).optional(),
})

export const userLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const userUpdateSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  company_name: z.string().max(200).optional(),
})

// ----------------------------------------------------------------------------
// API Key Schemas
// ----------------------------------------------------------------------------
export const createApiKeySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  scopes: z
    .array(
      z.enum([
        'chat.completions',
        'completions',
        'embeddings',
        'models',
        'images',
        'audio',
        'admin',
      ])
    )
    .min(1, 'At least one scope is required')
    .default(['chat.completions', 'embeddings']),
  rate_limit_rpm: z.number().int().positive().optional(),
  rate_limit_tpm: z.number().int().positive().optional(),
  quota_daily: z.number().int().positive().optional(),
  quota_monthly: z.number().int().positive().optional(),
  expires_at: z.string().datetime().optional(),
})

export const updateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  scopes: z
    .array(
      z.enum([
        'chat.completions',
        'completions',
        'embeddings',
        'models',
        'images',
        'audio',
        'admin',
      ])
    )
    .optional(),
  rate_limit_rpm: z.number().int().positive().optional(),
  rate_limit_tpm: z.number().int().positive().optional(),
  quota_daily: z.number().int().positive().optional(),
  quota_monthly: z.number().int().positive().optional(),
  is_active: z.boolean().optional(),
})

// ----------------------------------------------------------------------------
// LiteLLM Server Schemas
// ----------------------------------------------------------------------------
export const createServerSchema = z.object({
  name: z.string().min(1).max(255),
  base_url: z.string().url('Invalid URL format').startsWith('http'),
  api_key: z.string().optional(),
  priority: z.number().int().positive().default(1),
  weight: z.number().int().positive().default(1),
  max_concurrent_requests: z.number().int().positive().default(100),
  supported_models: z.array(z.string()).default([]),
})

export const updateServerSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  base_url: z.string().url().startsWith('http').optional(),
  api_key: z.string().optional(),
  priority: z.number().int().positive().optional(),
  weight: z.number().int().positive().optional(),
  max_concurrent_requests: z.number().int().positive().optional(),
  supported_models: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
})

// ----------------------------------------------------------------------------
// OpenAI-Compatible Request Schemas
// ----------------------------------------------------------------------------
export const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'function', 'tool']),
  content: z.union([z.string(), z.null()]).optional(),
  name: z.string().optional(),
  function_call: z
    .object({
      name: z.string(),
      arguments: z.string(),
    })
    .optional(),
  tool_calls: z.array(z.any()).optional(),
  tool_call_id: z.string().optional(),
})

export const chatCompletionRequestSchema = z.object({
  model: z.string().min(1, 'Model is required'),
  messages: z.array(chatMessageSchema).min(1, 'At least one message is required'),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  n: z.number().int().positive().max(10).optional(),
  stream: z.boolean().optional(),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  max_tokens: z.number().int().positive().optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  logit_bias: z.record(z.number()).optional(),
  user: z.string().optional(),
})

export const embeddingRequestSchema = z.object({
  model: z.string().min(1, 'Model is required'),
  input: z.union([z.string(), z.array(z.string())]),
  user: z.string().optional(),
})

// ----------------------------------------------------------------------------
// Query Parameter Schemas
// ----------------------------------------------------------------------------
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(100).default(20),
})

export const dateRangeSchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
})

export const usageQuerySchema = paginationSchema.merge(dateRangeSchema).extend({
  model: z.string().optional(),
  status: z.enum(['success', 'error', 'all']).default('all'),
})

// ----------------------------------------------------------------------------
// Billing Schemas
// ----------------------------------------------------------------------------
export const subscriptionUpdateSchema = z.object({
  tier: z.enum(['free', 'starter', 'pro', 'enterprise']),
})

export const paymentMethodSchema = z.object({
  type: z.enum(['card', 'bank_transfer']),
  token: z.string(), // Stripe token or similar
})

// ----------------------------------------------------------------------------
// Admin Schemas
// ----------------------------------------------------------------------------
export const adminUserUpdateSchema = z.object({
  tier: z.enum(['free', 'starter', 'pro', 'enterprise']).optional(),
  status: z.enum(['active', 'suspended', 'deleted']).optional(),
  credits_balance: z.number().min(0).optional(),
})

// ----------------------------------------------------------------------------
// Webhook Schemas
// ----------------------------------------------------------------------------
export const webhookSchema = z.object({
  url: z.string().url('Invalid webhook URL'),
  events: z
    .array(
      z.enum([
        'request.completed',
        'request.failed',
        'rate_limit.exceeded',
        'quota.warning',
        'quota.exceeded',
        'server.down',
        'invoice.created',
        'payment.succeeded',
        'payment.failed',
      ])
    )
    .min(1, 'At least one event type is required'),
  secret: z.string().min(32, 'Secret must be at least 32 characters').optional(),
})

// ----------------------------------------------------------------------------
// Export Types
// ----------------------------------------------------------------------------
export type UserSignupInput = z.infer<typeof userSignupSchema>
export type UserLoginInput = z.infer<typeof userLoginSchema>
export type UserUpdateInput = z.infer<typeof userUpdateSchema>
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>
export type CreateServerInput = z.infer<typeof createServerSchema>
export type UpdateServerInput = z.infer<typeof updateServerSchema>
export type ChatCompletionRequest = z.infer<typeof chatCompletionRequestSchema>
export type EmbeddingRequest = z.infer<typeof embeddingRequestSchema>
export type UsageQuery = z.infer<typeof usageQuerySchema>
export type SubscriptionUpdateInput = z.infer<typeof subscriptionUpdateSchema>
export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>
export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>
export type WebhookInput = z.infer<typeof webhookSchema>
