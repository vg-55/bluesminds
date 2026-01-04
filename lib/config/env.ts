// ============================================================================
// ENVIRONMENT CONFIGURATION WITH VALIDATION
// ============================================================================

import { z } from 'zod'

// Check if we're on the server
const isServer = typeof window === 'undefined'

// Client-safe environment schema (only NEXT_PUBLIC_* variables)
const clientEnvSchema = z.object({
  // Supabase (public)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),

  // Stripe (public, optional)
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // Feature flags
  ENABLE_STREAMING: z.coerce.boolean().default(true),
  ENABLE_WEBHOOKS: z.coerce.boolean().default(true),
  ENABLE_CACHING: z.coerce.boolean().default(false),
  ENABLE_REFERRALS: z.coerce.boolean().default(true),
})

// Full server environment schema
const serverEnvSchema = clientEnvSchema.extend({
  // Supabase (server-only)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.preprocess((val) => val === '' ? undefined : val, z.string().url().optional()),

  // Security (server-only)
  JWT_SECRET: z.string().min(32),
  API_KEY_SECRET: z.string().min(32),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),

  // LiteLLM
  LITELLM_SERVER_1_URL: z.preprocess((val) => val === '' ? undefined : val, z.string().url().optional()),
  LITELLM_SERVER_1_KEY: z.string().optional(),

  // Stripe (server-only, optional)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Redis (optional)
  REDIS_URL: z.preprocess((val) => val === '' ? undefined : val, z.string().url().optional()),

  // Monitoring (optional)
  SENTRY_DSN: z.preprocess((val) => val === '' ? undefined : val, z.string().url().optional()),
  LOGTAIL_SOURCE_TOKEN: z.string().optional(),

  // Rate limiting defaults
  DEFAULT_RATE_LIMIT_RPM: z.coerce.number().int().positive().default(60),
  DEFAULT_RATE_LIMIT_TPM: z.coerce.number().int().positive().default(100000),
  DEFAULT_QUOTA_DAILY: z.coerce.number().int().positive().default(10000),
  DEFAULT_QUOTA_MONTHLY: z.coerce.number().int().positive().default(300000),

  // Email (optional)
  EMAIL_FROM: z.preprocess((val) => val === '' ? undefined : val, z.string().email().optional()),
  RESEND_API_KEY: z.string().optional(),

  // Admin
  ADMIN_EMAILS: z.string().optional(),
})

// Parse and validate environment variables
function getEnv() {
  try {
    // Use appropriate schema based on environment
    const schema = isServer ? serverEnvSchema : clientEnvSchema
    return schema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.issues.map((issue) => issue.path.join('.')).join(', ')
      throw new Error(
        `Missing or invalid environment variables: ${missing}\n\n` +
          `Please check your .env.local file and ensure all required variables are set.\n` +
          `See .env.example for reference.`
      )
    }
    throw error
  }
}

export const env = getEnv() as z.infer<typeof serverEnvSchema>

// Helper to check if we're in production
export const isProduction = env.NODE_ENV === 'production'
export const isDevelopment = env.NODE_ENV === 'development'
export const isStaging = env.NODE_ENV === 'staging'

// Admin emails list
export const adminEmails = env.ADMIN_EMAILS
  ? env.ADMIN_EMAILS.split(',').map((email) => email.trim())
  : []

// Feature flags
export const features = {
  streaming: env.ENABLE_STREAMING,
  webhooks: env.ENABLE_WEBHOOKS,
  caching: env.ENABLE_CACHING,
  referrals: env.ENABLE_REFERRALS,
  billing: !!(env.STRIPE_SECRET_KEY && env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
}

// Default rate limits
export const defaultRateLimits = {
  rpm: env.DEFAULT_RATE_LIMIT_RPM,
  tpm: env.DEFAULT_RATE_LIMIT_TPM,
  daily_quota: env.DEFAULT_QUOTA_DAILY,
  monthly_quota: env.DEFAULT_QUOTA_MONTHLY,
}
