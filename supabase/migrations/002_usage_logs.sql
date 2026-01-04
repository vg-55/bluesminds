-- ============================================================================
-- USAGE LOGS - PARTITIONED TABLE
-- ============================================================================
-- This migration creates the usage_logs table with monthly partitions
-- for efficient querying and data management at scale
-- ============================================================================

-- ============================================================================
-- USAGE LOGS PARENT TABLE (PARTITIONED)
-- ============================================================================
-- Logs every API request with token usage, costs, and performance metrics

CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  server_id UUID REFERENCES litellm_servers(id) ON DELETE SET NULL,

  -- Request identification
  request_id TEXT NOT NULL,
  endpoint TEXT NOT NULL, -- e.g., /v1/chat/completions
  model TEXT NOT NULL,
  provider TEXT, -- e.g., openai, anthropic, google

  -- Token usage
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,

  -- Cost calculation
  cost_usd DECIMAL(10,6) DEFAULT 0.000000,

  -- Performance metrics
  response_time_ms INTEGER,
  status_code INTEGER,
  is_error BOOLEAN DEFAULT false,
  error_message TEXT,

  -- Request/Response metadata (for debugging and analytics)
  request_metadata JSONB DEFAULT '{}'::JSONB,
  response_metadata JSONB DEFAULT '{}'::JSONB,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Primary key must include partition key
  PRIMARY KEY (id, created_at),

  -- Constraints
  CONSTRAINT usage_logs_request_id_unique UNIQUE (request_id, created_at),
  CONSTRAINT usage_logs_tokens_non_negative CHECK (
    prompt_tokens >= 0 AND
    completion_tokens >= 0 AND
    total_tokens >= 0
  ),
  CONSTRAINT usage_logs_cost_non_negative CHECK (cost_usd >= 0),
  CONSTRAINT usage_logs_response_time_non_negative CHECK (response_time_ms IS NULL OR response_time_ms >= 0),
  CONSTRAINT usage_logs_status_code_valid CHECK (status_code >= 100 AND status_code < 600)
) PARTITION BY RANGE (created_at);

-- ============================================================================
-- CREATE PARTITIONS FOR CURRENT AND NEXT MONTHS
-- ============================================================================
-- Create partitions for January 2026 through December 2026
-- In production, you would automate partition creation using a cron job

-- January 2026
CREATE TABLE IF NOT EXISTS usage_logs_2026_01 PARTITION OF usage_logs
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- February 2026
CREATE TABLE IF NOT EXISTS usage_logs_2026_02 PARTITION OF usage_logs
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- March 2026
CREATE TABLE IF NOT EXISTS usage_logs_2026_03 PARTITION OF usage_logs
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- April 2026
CREATE TABLE IF NOT EXISTS usage_logs_2026_04 PARTITION OF usage_logs
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

-- May 2026
CREATE TABLE IF NOT EXISTS usage_logs_2026_05 PARTITION OF usage_logs
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

-- June 2026
CREATE TABLE IF NOT EXISTS usage_logs_2026_06 PARTITION OF usage_logs
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

-- July 2026
CREATE TABLE IF NOT EXISTS usage_logs_2026_07 PARTITION OF usage_logs
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

-- August 2026
CREATE TABLE IF NOT EXISTS usage_logs_2026_08 PARTITION OF usage_logs
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

-- September 2026
CREATE TABLE IF NOT EXISTS usage_logs_2026_09 PARTITION OF usage_logs
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

-- October 2026
CREATE TABLE IF NOT EXISTS usage_logs_2026_10 PARTITION OF usage_logs
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

-- November 2026
CREATE TABLE IF NOT EXISTS usage_logs_2026_11 PARTITION OF usage_logs
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

-- December 2026
CREATE TABLE IF NOT EXISTS usage_logs_2026_12 PARTITION OF usage_logs
  FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- ============================================================================
-- INDEXES ON PARTITIONED TABLE
-- ============================================================================
-- These indexes will be created on each partition automatically

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_api_key_id ON usage_logs(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_server_id ON usage_logs(server_id) WHERE server_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_request_id ON usage_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_model ON usage_logs(model, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_provider ON usage_logs(provider) WHERE provider IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usage_logs_is_error ON usage_logs(is_error, created_at DESC) WHERE is_error = true;

-- ============================================================================
-- MATERIALIZED VIEW FOR DAILY USAGE STATS
-- ============================================================================
-- Pre-aggregated statistics for faster dashboard queries

CREATE MATERIALIZED VIEW IF NOT EXISTS daily_usage_stats AS
SELECT
  user_id,
  DATE(created_at) as usage_date,
  COUNT(*) as request_count,
  SUM(total_tokens) as total_tokens,
  SUM(cost_usd) as total_cost,
  COUNT(DISTINCT model) as unique_models,
  AVG(response_time_ms)::INTEGER as avg_response_time,
  SUM(CASE WHEN is_error THEN 1 ELSE 0 END) as error_count,
  MAX(created_at) as last_request_at
FROM usage_logs
GROUP BY user_id, DATE(created_at);

-- Unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_usage_stats_unique ON daily_usage_stats(user_id, usage_date);

-- Additional indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_daily_usage_stats_date ON daily_usage_stats(usage_date DESC);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE usage_logs IS 'Partitioned table storing all API request logs with usage and performance metrics';
COMMENT ON COLUMN usage_logs.request_id IS 'Unique identifier for tracking requests across the system';
COMMENT ON COLUMN usage_logs.cost_usd IS 'Calculated cost in USD based on token usage and model pricing';
COMMENT ON COLUMN usage_logs.request_metadata IS 'Additional request data (e.g., user agent, IP, parameters)';
COMMENT ON COLUMN usage_logs.response_metadata IS 'Additional response data (e.g., finish_reason, cached)';

COMMENT ON MATERIALIZED VIEW daily_usage_stats IS 'Pre-aggregated daily statistics for dashboard performance';

-- ============================================================================
-- HELPER FUNCTION: Refresh materialized view
-- ============================================================================
-- Call this function via cron job or scheduled task to refresh stats

CREATE OR REPLACE FUNCTION refresh_daily_usage_stats()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_usage_stats;
END;
$$;

COMMENT ON FUNCTION refresh_daily_usage_stats IS 'Refreshes the daily_usage_stats materialized view (call via cron)';
