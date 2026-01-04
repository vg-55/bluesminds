-- ============================================================================
-- BLUESMIND AI GATEWAY - INITIAL SCHEMA
-- ============================================================================
-- This migration creates the core tables for the BluesMinds AI Gateway:
-- - users: User accounts with tiers and credits
-- - api_keys: API key management with rate limits
-- - litellm_servers: LiteLLM server pool management
-- ============================================================================

-- Note: gen_random_uuid() is built into PostgreSQL 13+ (no extension needed)

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Extends Supabase auth.users with additional application-specific fields

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  company_name TEXT,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'starter', 'pro', 'enterprise')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES users(id) ON DELETE SET NULL,
  credits_balance DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);

-- ============================================================================
-- API KEYS TABLE
-- ============================================================================
-- Stores hashed API keys with scopes and rate limits

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash TEXT UNIQUE NOT NULL, -- bcrypt hash of the actual key
  key_prefix TEXT NOT NULL, -- First 8 chars for display (e.g., "bm_1a2b3c")
  name TEXT NOT NULL,
  scopes TEXT[] DEFAULT ARRAY['chat.completions', 'embeddings']::TEXT[],

  -- Rate limits
  rate_limit_rpm INTEGER DEFAULT 60, -- Requests per minute
  rate_limit_tpm INTEGER DEFAULT 100000, -- Tokens per minute
  quota_daily INTEGER DEFAULT 10000, -- Daily token quota
  quota_monthly INTEGER DEFAULT 300000, -- Monthly token quota

  -- Status and metadata
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB,

  -- Constraints
  CONSTRAINT api_keys_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  CONSTRAINT api_keys_rpm_positive CHECK (rate_limit_rpm > 0),
  CONSTRAINT api_keys_tpm_positive CHECK (rate_limit_tpm > 0)
);

-- Indexes for api_keys table
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- LITELLM SERVERS TABLE
-- ============================================================================
-- Manages the pool of LiteLLM servers for load balancing

CREATE TABLE IF NOT EXISTS litellm_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  base_url TEXT UNIQUE NOT NULL,
  api_key TEXT, -- Encrypted API key for the LiteLLM server (if required)

  -- Load balancing configuration
  priority INTEGER DEFAULT 1, -- Lower number = higher priority
  weight INTEGER DEFAULT 1, -- For weighted round-robin
  max_concurrent_requests INTEGER DEFAULT 100,
  current_requests INTEGER DEFAULT 0,

  -- Health monitoring
  health_status TEXT DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
  last_health_check_at TIMESTAMPTZ,

  -- Performance metrics
  total_requests BIGINT DEFAULT 0,
  failed_requests BIGINT DEFAULT 0,
  avg_response_time_ms INTEGER DEFAULT 0,

  -- Configuration
  supported_models TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT litellm_servers_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255),
  CONSTRAINT litellm_servers_base_url_format CHECK (base_url ~ '^https?://'),
  CONSTRAINT litellm_servers_priority_positive CHECK (priority > 0),
  CONSTRAINT litellm_servers_weight_positive CHECK (weight > 0),
  CONSTRAINT litellm_servers_concurrent_positive CHECK (max_concurrent_requests > 0 AND current_requests >= 0)
);

-- Indexes for litellm_servers table
CREATE INDEX IF NOT EXISTS idx_litellm_servers_health ON litellm_servers(health_status);
CREATE INDEX IF NOT EXISTS idx_litellm_servers_active ON litellm_servers(is_active);
CREATE INDEX IF NOT EXISTS idx_litellm_servers_priority ON litellm_servers(priority, weight);
CREATE INDEX IF NOT EXISTS idx_litellm_servers_base_url ON litellm_servers(base_url);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'Application users extending Supabase auth.users';
COMMENT ON COLUMN users.tier IS 'Subscription tier: free, starter, pro, enterprise';
COMMENT ON COLUMN users.referral_code IS 'Unique referral code for user-generated referrals';
COMMENT ON COLUMN users.referred_by IS 'User ID who referred this user';

COMMENT ON TABLE api_keys IS 'API keys for gateway authentication';
COMMENT ON COLUMN api_keys.key_hash IS 'Bcrypt hash of the API key (never store plain text)';
COMMENT ON COLUMN api_keys.key_prefix IS 'First 8 characters of key for display purposes';
COMMENT ON COLUMN api_keys.scopes IS 'Array of allowed scopes (e.g., chat.completions, embeddings)';

COMMENT ON TABLE litellm_servers IS 'Pool of LiteLLM servers for load balancing';
COMMENT ON COLUMN litellm_servers.priority IS 'Server priority (lower = higher priority)';
COMMENT ON COLUMN litellm_servers.weight IS 'Weight for weighted load balancing';
COMMENT ON COLUMN litellm_servers.health_status IS 'Current health status from health checks';
