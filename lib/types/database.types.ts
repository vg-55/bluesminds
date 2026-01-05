// ============================================================================
// AUTO-GENERATED SUPABASE DATABASE TYPES
// ============================================================================
// This file is generated from your Supabase schema
// Run: npx supabase gen types typescript --project-id <project-id> > lib/types/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          company_name: string | null
          tier: 'free' | 'starter' | 'pro' | 'enterprise'
          status: 'active' | 'suspended' | 'deleted'
          role: 'user' | 'admin'
          referral_code: string | null
          referred_by: string | null
          credits_balance: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          company_name?: string | null
          tier?: 'free' | 'starter' | 'pro' | 'enterprise'
          status?: 'active' | 'suspended' | 'deleted'
          role?: 'user' | 'admin'
          referral_code?: string | null
          referred_by?: string | null
          credits_balance?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          company_name?: string | null
          tier?: 'free' | 'starter' | 'pro' | 'enterprise'
          status?: 'active' | 'suspended' | 'deleted'
          role?: 'user' | 'admin'
          referral_code?: string | null
          referred_by?: string | null
          credits_balance?: number
          created_at?: string
          updated_at?: string
        }
      }
      api_keys: {
        Row: {
          id: string
          user_id: string
          key_hash: string
          key_prefix: string
          name: string
          scopes: string[]
          rate_limit_rpm: number
          rate_limit_tpm: number
          quota_daily: number
          quota_monthly: number
          is_active: boolean
          last_used_at: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
          metadata: Json
        }
        Insert: {
          id?: string
          user_id: string
          key_hash: string
          key_prefix: string
          name: string
          scopes?: string[]
          rate_limit_rpm?: number
          rate_limit_tpm?: number
          quota_daily?: number
          quota_monthly?: number
          is_active?: boolean
          last_used_at?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
          metadata?: Json
        }
        Update: {
          id?: string
          user_id?: string
          key_hash?: string
          key_prefix?: string
          name?: string
          scopes?: string[]
          rate_limit_rpm?: number
          rate_limit_tpm?: number
          quota_daily?: number
          quota_monthly?: number
          is_active?: boolean
          last_used_at?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
          metadata?: Json
        }
      }
      litellm_servers: {
        Row: {
          id: string
          name: string
          base_url: string
          api_key: string | null
          priority: number
          weight: number
          max_concurrent_requests: number
          current_requests: number
          health_status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
          last_health_check_at: string | null
          total_requests: number
          failed_requests: number
          avg_response_time_ms: number
          supported_models: string[]
          is_active: boolean
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          base_url: string
          api_key?: string | null
          priority?: number
          weight?: number
          max_concurrent_requests?: number
          current_requests?: number
          health_status?: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
          last_health_check_at?: string | null
          total_requests?: number
          failed_requests?: number
          avg_response_time_ms?: number
          supported_models?: string[]
          is_active?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          base_url?: string
          api_key?: string | null
          priority?: number
          weight?: number
          max_concurrent_requests?: number
          current_requests?: number
          health_status?: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
          last_health_check_at?: string | null
          total_requests?: number
          failed_requests?: number
          avg_response_time_ms?: number
          supported_models?: string[]
          is_active?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      custom_models: {
        Row: {
          id: string
          custom_name: string
          provider_id: string
          actual_model_name: string
          display_name: string | null
          description: string | null
          priority: number
          weight: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          custom_name: string
          provider_id: string
          actual_model_name: string
          display_name?: string | null
          description?: string | null
          priority?: number
          weight?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          custom_name?: string
          provider_id?: string
          actual_model_name?: string
          display_name?: string | null
          description?: string | null
          priority?: number
          weight?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      usage_logs: {
        Row: {
          id: string
          user_id: string
          api_key_id: string
          server_id: string | null
          request_id: string
          endpoint: string
          model: string
          provider: string | null
          prompt_tokens: number
          completion_tokens: number
          total_tokens: number
          cost_usd: number
          response_time_ms: number | null
          status_code: number
          is_error: boolean
          error_message: string | null
          request_metadata: Json
          response_metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          api_key_id: string
          server_id?: string | null
          request_id: string
          endpoint: string
          model: string
          provider?: string | null
          prompt_tokens?: number
          completion_tokens?: number
          total_tokens?: number
          cost_usd?: number
          response_time_ms?: number | null
          status_code: number
          is_error?: boolean
          error_message?: string | null
          request_metadata?: Json
          response_metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          api_key_id?: string
          server_id?: string | null
          request_id?: string
          endpoint?: string
          model?: string
          provider?: string | null
          prompt_tokens?: number
          completion_tokens?: number
          total_tokens?: number
          cost_usd?: number
          response_time_ms?: number | null
          status_code?: number
          is_error?: boolean
          error_message?: string | null
          request_metadata?: Json
          response_metadata?: Json
          created_at?: string
        }
      }
      rate_limit_state: {
        Row: {
          id: string
          api_key_id: string
          window_start: string
          window_type: 'minute' | 'hour' | 'day' | 'month'
          request_count: number
          token_count: number
          last_request_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          api_key_id: string
          window_start: string
          window_type: 'minute' | 'hour' | 'day' | 'month'
          request_count?: number
          token_count?: number
          last_request_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          api_key_id?: string
          window_start?: string
          window_type?: 'minute' | 'hour' | 'day' | 'month'
          request_count?: number
          token_count?: number
          last_request_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      rate_limit_events: {
        Row: {
          id: string
          api_key_id: string
          user_id: string
          limit_type: 'rpm' | 'tpm' | 'daily_quota' | 'monthly_quota'
          current_value: number
          limit_value: number
          endpoint: string | null
          model: string | null
          request_id: string | null
          user_agent: string | null
          ip_address: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          api_key_id: string
          user_id: string
          limit_type: 'rpm' | 'tpm' | 'daily_quota' | 'monthly_quota'
          current_value: number
          limit_value: number
          endpoint?: string | null
          model?: string | null
          request_id?: string | null
          user_agent?: string | null
          ip_address?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          api_key_id?: string
          user_id?: string
          limit_type?: 'rpm' | 'tpm' | 'daily_quota' | 'monthly_quota'
          current_value?: number
          limit_value?: number
          endpoint?: string | null
          model?: string | null
          request_id?: string | null
          user_agent?: string | null
          ip_address?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      billing_plans: {
        Row: {
          id: string
          name: string
          tier: 'free' | 'starter' | 'pro' | 'enterprise'
          price_monthly: number
          included_tokens: number
          overage_rate_per_1k_tokens: number
          rate_limit_rpm: number
          rate_limit_tpm: number
          quota_daily: number
          quota_monthly: number
          features: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          tier: 'free' | 'starter' | 'pro' | 'enterprise'
          price_monthly: number
          included_tokens?: number
          overage_rate_per_1k_tokens?: number
          rate_limit_rpm?: number
          rate_limit_tpm?: number
          quota_daily?: number
          quota_monthly?: number
          features?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          tier?: 'free' | 'starter' | 'pro' | 'enterprise'
          price_monthly?: number
          included_tokens?: number
          overage_rate_per_1k_tokens?: number
          rate_limit_rpm?: number
          rate_limit_tpm?: number
          quota_daily?: number
          quota_monthly?: number
          features?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          user_id: string
          invoice_number: string
          billing_period_start: string
          billing_period_end: string
          base_charge: number
          usage_charge: number
          referral_credit: number
          discount: number
          tax: number
          total_amount: number
          tokens_used: number
          tokens_included: number
          overage_tokens: number
          total_requests: number
          status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded'
          paid_at: string | null
          payment_method: string | null
          payment_id: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          invoice_number: string
          billing_period_start: string
          billing_period_end: string
          base_charge?: number
          usage_charge?: number
          referral_credit?: number
          discount?: number
          tax?: number
          total_amount: number
          tokens_used?: number
          tokens_included?: number
          overage_tokens?: number
          total_requests?: number
          status?: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded'
          paid_at?: string | null
          payment_method?: string | null
          payment_id?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          invoice_number?: string
          billing_period_start?: string
          billing_period_end?: string
          base_charge?: number
          usage_charge?: number
          referral_credit?: number
          discount?: number
          tax?: number
          total_amount?: number
          tokens_used?: number
          tokens_included?: number
          overage_tokens?: number
          total_requests?: number
          status?: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded'
          paid_at?: string | null
          payment_method?: string | null
          payment_id?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      payment_transactions: {
        Row: {
          id: string
          invoice_id: string
          user_id: string
          amount: number
          currency: string
          payment_method: string | null
          payment_provider: string | null
          provider_transaction_id: string | null
          status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded'
          error_message: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          user_id: string
          amount: number
          currency?: string
          payment_method?: string | null
          payment_provider?: string | null
          provider_transaction_id?: string | null
          status?: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded'
          error_message?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          user_id?: string
          amount?: number
          currency?: string
          payment_method?: string | null
          payment_provider?: string | null
          provider_transaction_id?: string | null
          status?: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded'
          error_message?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      daily_usage_stats: {
        Row: {
          user_id: string | null
          usage_date: string | null
          request_count: number | null
          total_tokens: number | null
          total_cost: number | null
          unique_models: number | null
          avg_response_time: number | null
          error_count: number | null
          last_request_at: string | null
        }
      }
    }
    Functions: {
      refresh_daily_usage_stats: {
        Args: Record<string, never>
        Returns: void
      }
      get_or_create_rate_limit_state: {
        Args: {
          p_api_key_id: string
          p_window_start: string
          p_window_type: string
        }
        Returns: Database['public']['Tables']['rate_limit_state']['Row']
      }
      increment_rate_limit_counters: {
        Args: {
          p_api_key_id: string
          p_window_start: string
          p_window_type: string
          p_request_count?: number
          p_token_count?: number
        }
        Returns: Database['public']['Tables']['rate_limit_state']['Row']
      }
      check_rate_limit: {
        Args: {
          p_api_key_id: string
          p_window_type: string
          p_estimated_tokens?: number
        }
        Returns: {
          exceeded: boolean
          limit_type: string | null
          current_value: number
          limit_value: number
          retry_after_seconds: number
        }[]
      }
      cleanup_old_rate_limit_state: {
        Args: Record<string, never>
        Returns: number
      }
      generate_invoice_number: {
        Args: Record<string, never>
        Returns: string
      }
      calculate_invoice_total: {
        Args: {
          p_user_id: string
          p_period_start: string
          p_period_end: string
        }
        Returns: {
          base_charge: number
          usage_charge: number
          referral_credit: number
          total_amount: number
          tokens_used: number
          tokens_included: number
          overage_tokens: number
          total_requests: number
        }[]
      }
      create_monthly_invoice: {
        Args: {
          p_user_id: string
          p_period_start: string
          p_period_end: string
        }
        Returns: Database['public']['Tables']['invoices']['Row']
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
