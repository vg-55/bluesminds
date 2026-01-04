-- ============================================================================
-- RATE LIMITING STATE
-- ============================================================================
-- This migration creates tables for tracking rate limit state using a
-- sliding window algorithm with support for multiple time windows
-- ============================================================================

-- ============================================================================
-- RATE LIMIT STATE TABLE
-- ============================================================================
-- Tracks request and token counts per API key within time windows

CREATE TABLE IF NOT EXISTS rate_limit_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,

  -- Time window definition
  window_start TIMESTAMPTZ NOT NULL,
  window_type TEXT NOT NULL CHECK (window_type IN ('minute', 'hour', 'day', 'month')),

  -- Counters
  request_count INTEGER DEFAULT 0,
  token_count BIGINT DEFAULT 0,

  -- Metadata
  last_request_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT rate_limit_state_counts_non_negative CHECK (
    request_count >= 0 AND
    token_count >= 0
  ),
  CONSTRAINT rate_limit_state_unique_window UNIQUE(api_key_id, window_start, window_type)
);

-- Indexes for efficient lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limit_state_api_key ON rate_limit_state(api_key_id, window_start DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_state_window ON rate_limit_state(window_start DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_state_type ON rate_limit_state(window_type, window_start DESC);

-- ============================================================================
-- RATE LIMIT EVENTS TABLE (OPTIONAL)
-- ============================================================================
-- Logs when rate limits are hit for analytics and debugging

CREATE TABLE IF NOT EXISTS rate_limit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Event details
  limit_type TEXT NOT NULL CHECK (limit_type IN ('rpm', 'tpm', 'daily_quota', 'monthly_quota')),
  current_value BIGINT NOT NULL,
  limit_value BIGINT NOT NULL,
  endpoint TEXT,
  model TEXT,

  -- Metadata
  request_id TEXT,
  user_agent TEXT,
  ip_address INET,
  metadata JSONB DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT rate_limit_events_positive_values CHECK (
    current_value >= 0 AND
    limit_value > 0
  )
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_rate_limit_events_api_key ON rate_limit_events(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_events_user ON rate_limit_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_events_type ON rate_limit_events(limit_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_events_created_at ON rate_limit_events(created_at DESC);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get or create rate limit state for a specific window
CREATE OR REPLACE FUNCTION get_or_create_rate_limit_state(
  p_api_key_id UUID,
  p_window_start TIMESTAMPTZ,
  p_window_type TEXT
)
RETURNS rate_limit_state
LANGUAGE plpgsql
AS $$
DECLARE
  v_state rate_limit_state;
BEGIN
  -- Try to get existing state
  SELECT * INTO v_state
  FROM rate_limit_state
  WHERE api_key_id = p_api_key_id
    AND window_start = p_window_start
    AND window_type = p_window_type;

  -- If not found, create it
  IF NOT FOUND THEN
    INSERT INTO rate_limit_state (api_key_id, window_start, window_type, request_count, token_count)
    VALUES (p_api_key_id, p_window_start, p_window_type, 0, 0)
    RETURNING * INTO v_state;
  END IF;

  RETURN v_state;
END;
$$;

-- Function to increment rate limit counters atomically
CREATE OR REPLACE FUNCTION increment_rate_limit_counters(
  p_api_key_id UUID,
  p_window_start TIMESTAMPTZ,
  p_window_type TEXT,
  p_request_count INTEGER DEFAULT 1,
  p_token_count BIGINT DEFAULT 0
)
RETURNS rate_limit_state
LANGUAGE plpgsql
AS $$
DECLARE
  v_state rate_limit_state;
BEGIN
  -- Upsert: increment if exists, create if not
  INSERT INTO rate_limit_state (
    api_key_id,
    window_start,
    window_type,
    request_count,
    token_count,
    last_request_at
  )
  VALUES (
    p_api_key_id,
    p_window_start,
    p_window_type,
    p_request_count,
    p_token_count,
    NOW()
  )
  ON CONFLICT (api_key_id, window_start, window_type)
  DO UPDATE SET
    request_count = rate_limit_state.request_count + p_request_count,
    token_count = rate_limit_state.token_count + p_token_count,
    last_request_at = NOW(),
    updated_at = NOW()
  RETURNING * INTO v_state;

  RETURN v_state;
END;
$$;

-- Function to check if rate limit is exceeded
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_api_key_id UUID,
  p_window_type TEXT,
  p_estimated_tokens BIGINT DEFAULT 0
)
RETURNS TABLE(
  exceeded BOOLEAN,
  limit_type TEXT,
  current_value BIGINT,
  limit_value BIGINT,
  retry_after_seconds INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_api_key api_keys;
  v_window_start TIMESTAMPTZ;
  v_state rate_limit_state;
  v_retry_after INTEGER;
BEGIN
  -- Get API key configuration
  SELECT * INTO v_api_key FROM api_keys WHERE id = p_api_key_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'API key not found: %', p_api_key_id;
  END IF;

  -- Calculate window start based on window type
  v_window_start := CASE p_window_type
    WHEN 'minute' THEN date_trunc('minute', NOW())
    WHEN 'hour' THEN date_trunc('hour', NOW())
    WHEN 'day' THEN date_trunc('day', NOW())
    WHEN 'month' THEN date_trunc('month', NOW())
  END;

  -- Get current state
  SELECT * INTO v_state
  FROM rate_limit_state
  WHERE api_key_id = p_api_key_id
    AND window_start = v_window_start
    AND window_type = p_window_type;

  -- If no state exists, not exceeded
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TEXT, 0::BIGINT, 0::BIGINT, 0;
    RETURN;
  END IF;

  -- Check RPM (requests per minute)
  IF p_window_type = 'minute' AND v_state.request_count >= v_api_key.rate_limit_rpm THEN
    v_retry_after := EXTRACT(EPOCH FROM (v_window_start + INTERVAL '1 minute' - NOW()))::INTEGER;
    RETURN QUERY SELECT true, 'rpm'::TEXT, v_state.request_count::BIGINT, v_api_key.rate_limit_rpm::BIGINT, v_retry_after;
    RETURN;
  END IF;

  -- Check TPM (tokens per minute)
  IF p_window_type = 'minute' AND (v_state.token_count + p_estimated_tokens) >= v_api_key.rate_limit_tpm THEN
    v_retry_after := EXTRACT(EPOCH FROM (v_window_start + INTERVAL '1 minute' - NOW()))::INTEGER;
    RETURN QUERY SELECT true, 'tpm'::TEXT, v_state.token_count::BIGINT, v_api_key.rate_limit_tpm::BIGINT, v_retry_after;
    RETURN;
  END IF;

  -- Check daily quota
  IF p_window_type = 'day' AND (v_state.token_count + p_estimated_tokens) >= v_api_key.quota_daily THEN
    v_retry_after := EXTRACT(EPOCH FROM (v_window_start + INTERVAL '1 day' - NOW()))::INTEGER;
    RETURN QUERY SELECT true, 'daily_quota'::TEXT, v_state.token_count::BIGINT, v_api_key.quota_daily::BIGINT, v_retry_after;
    RETURN;
  END IF;

  -- Check monthly quota
  IF p_window_type = 'month' AND (v_state.token_count + p_estimated_tokens) >= v_api_key.quota_monthly THEN
    v_retry_after := EXTRACT(EPOCH FROM (v_window_start + INTERVAL '1 month' - NOW()))::INTEGER;
    RETURN QUERY SELECT true, 'monthly_quota'::TEXT, v_state.token_count::BIGINT, v_api_key.quota_monthly::BIGINT, v_retry_after;
    RETURN;
  END IF;

  -- Not exceeded
  RETURN QUERY SELECT false, NULL::TEXT, 0::BIGINT, 0::BIGINT, 0;
END;
$$;

-- Function to cleanup old rate limit state records (call via cron)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limit_state()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete records older than 7 days
  DELETE FROM rate_limit_state
  WHERE window_start < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Also cleanup old rate limit events (older than 30 days)
  DELETE FROM rate_limit_events
  WHERE created_at < NOW() - INTERVAL '30 days';

  RETURN v_deleted_count;
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE rate_limit_state IS 'Tracks rate limit counters per API key and time window';
COMMENT ON COLUMN rate_limit_state.window_type IS 'Type of time window: minute, hour, day, month';
COMMENT ON COLUMN rate_limit_state.request_count IS 'Number of requests in this window';
COMMENT ON COLUMN rate_limit_state.token_count IS 'Total tokens used in this window';

COMMENT ON TABLE rate_limit_events IS 'Logs when rate limits are exceeded for analytics';

COMMENT ON FUNCTION get_or_create_rate_limit_state IS 'Gets existing or creates new rate limit state for a window';
COMMENT ON FUNCTION increment_rate_limit_counters IS 'Atomically increments rate limit counters';
COMMENT ON FUNCTION check_rate_limit IS 'Checks if rate limit would be exceeded for an API key';
COMMENT ON FUNCTION cleanup_old_rate_limit_state IS 'Removes old rate limit state records (call via cron)';
