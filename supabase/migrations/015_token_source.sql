-- ============================================================================
-- MIGRATION 014: Add Token Source Tracking
-- ============================================================================
-- This migration adds a token_source column to track whether token counts
-- are actual (from LLM provider), estimated (calculated), or unknown.
--
-- This improves billing transparency and allows users to see token accuracy.
-- ============================================================================

-- Add token_source column to usage_logs
-- Default to 'unknown' for existing records
ALTER TABLE usage_logs
  ADD COLUMN IF NOT EXISTS token_source VARCHAR(20) DEFAULT 'unknown'
    CHECK (token_source IN ('actual', 'estimated', 'unknown'));

-- Add index for filtering by token source
CREATE INDEX IF NOT EXISTS idx_usage_logs_token_source
  ON usage_logs(token_source, created_at DESC);

-- Add comment
COMMENT ON COLUMN usage_logs.token_source IS
  'Indicates whether token counts are actual (from provider), estimated (calculated), or unknown';

-- Backfill existing records as 'unknown'
-- We can't retroactively determine if they were actual or estimated
UPDATE usage_logs
SET token_source = 'unknown'
WHERE token_source IS NULL;

-- ============================================================================
-- Update materialized view to include token source stats
-- ============================================================================

-- Drop and recreate the daily_usage_stats view with token source breakdown
DROP MATERIALIZED VIEW IF EXISTS daily_usage_stats;

CREATE MATERIALIZED VIEW daily_usage_stats AS
SELECT
  user_id,
  DATE(created_at) as usage_date,
  COUNT(*) as request_count,
  SUM(total_tokens) as total_tokens,
  SUM(cost_usd) as total_cost,
  COUNT(DISTINCT model) as unique_models,
  AVG(response_time_ms)::INTEGER as avg_response_time,
  SUM(CASE WHEN is_error THEN 1 ELSE 0 END) as error_count,
  -- New: Token source breakdown
  SUM(CASE WHEN token_source = 'actual' THEN 1 ELSE 0 END) as actual_token_count,
  SUM(CASE WHEN token_source = 'estimated' THEN 1 ELSE 0 END) as estimated_token_count,
  SUM(CASE WHEN token_source = 'unknown' THEN 1 ELSE 0 END) as unknown_token_count,
  -- New: Token accuracy percentage
  CASE
    WHEN COUNT(*) > 0 THEN
      (SUM(CASE WHEN token_source = 'actual' THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100)::INTEGER
    ELSE 0
  END as token_accuracy_percent,
  MAX(created_at) as last_request_at
FROM usage_logs
GROUP BY user_id, DATE(created_at);

-- Recreate unique index
CREATE UNIQUE INDEX idx_daily_usage_stats_unique
  ON daily_usage_stats(user_id, usage_date);

-- Recreate additional indexes
CREATE INDEX idx_daily_usage_stats_date
  ON daily_usage_stats(usage_date DESC);

-- Add comments
COMMENT ON MATERIALIZED VIEW daily_usage_stats IS
  'Pre-aggregated daily statistics including token source accuracy metrics';

COMMENT ON COLUMN daily_usage_stats.actual_token_count IS
  'Number of requests with actual token counts from provider';

COMMENT ON COLUMN daily_usage_stats.estimated_token_count IS
  'Number of requests with estimated token counts';

COMMENT ON COLUMN daily_usage_stats.token_accuracy_percent IS
  'Percentage of requests with actual (not estimated) token counts';

-- Refresh the view to populate with current data
REFRESH MATERIALIZED VIEW daily_usage_stats;
