// ============================================================================
// BLUESMIND AI GATEWAY - TYPE DEFINITIONS
// ============================================================================

import { Database } from './database.types'

// Re-export database types
export type { Database }

// ----------------------------------------------------------------------------
// Database Table Types
// ----------------------------------------------------------------------------
export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type ApiKey = Database['public']['Tables']['api_keys']['Row']
export type ApiKeyInsert = Database['public']['Tables']['api_keys']['Insert']
export type ApiKeyUpdate = Database['public']['Tables']['api_keys']['Update']

export type LiteLLMServer = Database['public']['Tables']['litellm_servers']['Row']
export type LiteLLMServerInsert = Database['public']['Tables']['litellm_servers']['Insert']
export type LiteLLMServerUpdate = Database['public']['Tables']['litellm_servers']['Update']

export type UsageLog = Database['public']['Tables']['usage_logs']['Row']
export type UsageLogInsert = Database['public']['Tables']['usage_logs']['Insert']

export type RateLimitState = Database['public']['Tables']['rate_limit_state']['Row']
export type RateLimitEvent = Database['public']['Tables']['rate_limit_events']['Row']

export type BillingPlan = Database['public']['Tables']['billing_plans']['Row']
export type Invoice = Database['public']['Tables']['invoices']['Row']
export type PaymentTransaction = Database['public']['Tables']['payment_transactions']['Row']

// ----------------------------------------------------------------------------
// User Tiers
// ----------------------------------------------------------------------------
export type UserTier = 'free' | 'starter' | 'pro' | 'enterprise'
export type UserStatus = 'active' | 'suspended' | 'deleted'

// ----------------------------------------------------------------------------
// API Key Scopes
// ----------------------------------------------------------------------------
export type ApiKeyScope =
  | 'chat.completions'
  | 'completions'
  | 'embeddings'
  | 'models'
  | 'images'
  | 'audio'
  | 'admin'

// ----------------------------------------------------------------------------
// LiteLLM Server Types
// ----------------------------------------------------------------------------
export type ServerHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'

export interface ServerMetrics {
  total_requests: number
  failed_requests: number
  avg_response_time_ms: number
  error_rate: number
  uptime_percentage: number
}

export interface ServerSelection {
  server: LiteLLMServer
  reason: 'priority' | 'least_connections' | 'round_robin' | 'failover'
  actualModel?: string // The actual model name to use (for custom model mappings)
}

// ----------------------------------------------------------------------------
// Rate Limiting Types
// ----------------------------------------------------------------------------
export type RateLimitWindow = 'minute' | 'hour' | 'day' | 'month'
export type RateLimitType = 'rpm' | 'tpm' | 'daily_quota' | 'monthly_quota'

export interface RateLimitCheck {
  exceeded: boolean
  limit_type: RateLimitType | null
  current_value: number
  limit_value: number
  retry_after_seconds: number
}

export interface RateLimitConfig {
  rpm: number
  tpm: number
  daily_quota: number
  monthly_quota: number
}

// ----------------------------------------------------------------------------
// Gateway Request/Response Types
// ----------------------------------------------------------------------------
export interface GatewayRequest {
  apiKeyId: string
  userId: string
  endpoint: string
  method: string
  body: unknown
  headers: Record<string, string>
  ip?: string
  userAgent?: string
}

export interface GatewayResponse {
  success: boolean
  data?: unknown
  error?: {
    code: string
    message: string
    details?: unknown
  }
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  server_id?: string
  response_time_ms: number
}

// ----------------------------------------------------------------------------
// OpenAI-Compatible Types (for proxy endpoints)
// ----------------------------------------------------------------------------
export interface ChatCompletionRequest {
  model: string
  messages: ChatMessage[]
  temperature?: number
  top_p?: number
  n?: number
  stream?: boolean
  stop?: string | string[]
  max_tokens?: number
  presence_penalty?: number
  frequency_penalty?: number
  logit_bias?: Record<string, number>
  user?: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function'
  content: string
  name?: string
  function_call?: {
    name: string
    arguments: string
  }
}

export interface ChatCompletionResponse {
  id: string
  object: 'chat.completion'
  created: number
  model: string
  choices: ChatCompletionChoice[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface ChatCompletionChoice {
  index: number
  message: ChatMessage
  finish_reason: 'stop' | 'length' | 'function_call' | 'content_filter' | null
}

export interface EmbeddingRequest {
  model: string
  input: string | string[]
  user?: string
}

export interface EmbeddingResponse {
  object: 'list'
  data: Array<{
    object: 'embedding'
    embedding: number[]
    index: number
  }>
  model: string
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}

export interface ModelInfo {
  id: string
  object: 'model'
  created: number
  owned_by: string
  permission?: unknown[]
  root?: string
  parent?: string
}

export interface ModelsListResponse {
  object: 'list'
  data: ModelInfo[]
}

// ----------------------------------------------------------------------------
// Usage & Analytics Types
// ----------------------------------------------------------------------------

// Token source tracking - indicates where token counts came from
export type TokenSource = 'actual' | 'estimated' | 'unknown'

export interface UsageStats {
  total_requests: number
  total_tokens: number
  total_cost: number
  unique_models: number
  avg_response_time: number
  error_count: number
  error_rate: number
  period: {
    start: string
    end: string
  }
}

export interface UsageByModel {
  model: string
  requests: number
  tokens: number
  cost: number
  avg_response_time: number
}

export interface UsageByDay {
  date: string
  requests: number
  tokens: number
  cost: number
  errors: number
}

// ----------------------------------------------------------------------------
// Billing Types
// ----------------------------------------------------------------------------
export type InvoiceStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded'
export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded'

export interface BillingInfo {
  current_plan: BillingPlan
  usage_this_month: {
    tokens: number
    requests: number
    cost: number
  }
  next_invoice: {
    estimated_amount: number
    billing_date: string
  }
  payment_method?: {
    type: string
    last4: string
  }
}

export interface InvoiceDetails extends Invoice {
  plan_name: string
  line_items: InvoiceLineItem[]
}

export interface InvoiceLineItem {
  description: string
  quantity: number
  unit_price: number
  amount: number
}

// ----------------------------------------------------------------------------
// API Response Wrappers
// ----------------------------------------------------------------------------
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiError
  metadata?: {
    timestamp: string
    request_id?: string
    [key: string]: unknown
  }
}

export interface ApiError {
  code: string
  message: string
  details?: unknown
  status?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
    has_next: boolean
    has_prev: boolean
  }
}

// ----------------------------------------------------------------------------
// Webhook Types
// ----------------------------------------------------------------------------
export type WebhookEvent =
  | 'request.completed'
  | 'request.failed'
  | 'rate_limit.exceeded'
  | 'quota.warning'
  | 'quota.exceeded'
  | 'server.down'
  | 'invoice.created'
  | 'payment.succeeded'
  | 'payment.failed'

export interface WebhookPayload {
  event: WebhookEvent
  timestamp: string
  data: unknown
}

// ----------------------------------------------------------------------------
// Admin Types
// ----------------------------------------------------------------------------
export interface SystemStats {
  total_users: number
  active_users: number
  total_api_keys: number
  total_requests_today: number
  total_tokens_today: number
  total_cost_today: number
  servers: {
    total: number
    healthy: number
    degraded: number
    unhealthy: number
  }
}

// ----------------------------------------------------------------------------
// Configuration Types
// ----------------------------------------------------------------------------
export interface AppConfig {
  app: {
    name: string
    url: string
    environment: 'development' | 'staging' | 'production'
  }
  features: {
    streaming: boolean
    webhooks: boolean
    caching: boolean
    referrals: boolean
  }
  rateLimits: {
    default: RateLimitConfig
  }
  billing: {
    enabled: boolean
    currency: string
  }
}

// ----------------------------------------------------------------------------
// Utility Types
// ----------------------------------------------------------------------------
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys]

export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}
