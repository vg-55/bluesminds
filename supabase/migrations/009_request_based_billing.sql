-- Migration 009: Convert from token-based to request-based billing
-- Strategy: Additive changes only - maintains backward compatibility

-- ============================================================================
-- 1. EXTEND BILLING_PLANS TABLE
-- ============================================================================

ALTER TABLE billing_plans
  ADD COLUMN IF NOT EXISTS billing_mode TEXT DEFAULT 'tokens' CHECK (billing_mode IN ('tokens', 'requests')),
  ADD COLUMN IF NOT EXISTS included_requests INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS overage_rate_per_request DECIMAL(6,4) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_billing_plans_billing_mode ON billing_plans(billing_mode);

COMMENT ON COLUMN billing_plans.billing_mode IS 'Billing calculation mode: tokens (legacy) or requests (new)';
COMMENT ON COLUMN billing_plans.included_requests IS 'Monthly request quota included in base price (for request-based billing)';
COMMENT ON COLUMN billing_plans.overage_rate_per_request IS 'Cost per request over quota (for request-based billing)';


-- ============================================================================
-- 2. EXTEND INVOICES TABLE
-- ============================================================================

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS requests_included BIGINT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS overage_requests BIGINT DEFAULT NULL;

COMMENT ON COLUMN invoices.requests_included IS 'Monthly request quota for this billing period';
COMMENT ON COLUMN invoices.overage_requests IS 'Requests over quota in this period';


-- ============================================================================
-- 3. CREATE MODEL_PRICING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS model_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT UNIQUE NOT NULL,

  -- Request-based pricing (new)
  price_per_request DECIMAL(8,6) DEFAULT NULL,

  -- Token-based pricing (legacy, for reference/analytics)
  price_per_1k_input_tokens DECIMAL(8,6) DEFAULT NULL,
  price_per_1k_output_tokens DECIMAL(8,6) DEFAULT NULL,

  -- Metadata
  provider TEXT,
  is_custom BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT model_pricing_name_length CHECK (char_length(model_name) >= 1 AND char_length(model_name) <= 255),
  CONSTRAINT model_pricing_positive_values CHECK (
    price_per_request IS NULL OR price_per_request >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_model_pricing_active ON model_pricing(is_active);
CREATE INDEX IF NOT EXISTS idx_model_pricing_provider ON model_pricing(provider);
CREATE INDEX IF NOT EXISTS idx_model_pricing_custom ON model_pricing(is_custom);

COMMENT ON TABLE model_pricing IS 'Per-model pricing configuration for both request-based and token-based billing';


-- ============================================================================
-- 4. SEED DEFAULT MODEL PRICING
-- ============================================================================

INSERT INTO model_pricing (model_name, price_per_request, price_per_1k_input_tokens, price_per_1k_output_tokens, provider) VALUES
  -- OpenAI models
  ('gpt-4', 0.02, 0.03, 0.06, 'openai'),
  ('gpt-4-turbo', 0.01, 0.01, 0.03, 'openai'),
  ('gpt-4o', 0.005, 0.005, 0.015, 'openai'),
  ('gpt-3.5-turbo', 0.005, 0.0005, 0.0015, 'openai'),

  -- Anthropic models
  ('claude-3-opus-20240229', 0.015, 0.015, 0.075, 'anthropic'),
  ('claude-3-sonnet-20240229', 0.008, 0.003, 0.015, 'anthropic'),
  ('claude-3-5-sonnet-20241022', 0.008, 0.003, 0.015, 'anthropic'),
  ('claude-3-haiku-20240307', 0.003, 0.00025, 0.00125, 'anthropic'),

  -- Google models
  ('gemini-pro', 0.002, 0.00025, 0.0005, 'google'),
  ('gemini-1.5-pro', 0.004, 0.00125, 0.005, 'google'),
  ('gemini-1.5-flash', 0.001, 0.000125, 0.0005, 'google'),

  -- Default fallback
  ('default', 0.005, 0.001, 0.002, 'unknown')
ON CONFLICT (model_name) DO NOTHING;


-- ============================================================================
-- 5. MIGRATE EXISTING PLANS TO REQUEST-BASED BILLING
-- ============================================================================

UPDATE billing_plans SET
  billing_mode = 'requests',
  included_requests = CASE tier
    WHEN 'free' THEN 1000          -- ~10K tokens at 10 tokens/request
    WHEN 'starter' THEN 50000      -- ~500K tokens at 10 tokens/request
    WHEN 'pro' THEN 200000         -- ~2M tokens at 10 tokens/request
    WHEN 'enterprise' THEN 1000000 -- ~10M tokens at 10 tokens/request
  END,
  overage_rate_per_request = CASE tier
    WHEN 'free' THEN 0.0000        -- No overage allowed
    WHEN 'starter' THEN 0.0020     -- $0.002/request
    WHEN 'pro' THEN 0.0015         -- $0.0015/request
    WHEN 'enterprise' THEN 0.0010  -- $0.001/request
  END,
  updated_at = NOW()
WHERE billing_mode IS NULL OR billing_mode = 'tokens';


-- ============================================================================
-- 6. CREATE INVOICE CALCULATION FUNCTION (REQUEST-BASED)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_invoice_total_requests(
  p_user_id UUID,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ
)
RETURNS TABLE(
  base_charge DECIMAL(10,2),
  usage_charge DECIMAL(10,2),
  referral_credit DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  requests_used BIGINT,
  requests_included BIGINT,
  overage_requests BIGINT,
  total_cost_calculated DECIMAL(10,2)
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_user users;
  v_plan billing_plans;
  v_requests_count BIGINT;
  v_total_cost DECIMAL(10,2);
  v_overage_requests BIGINT;
  v_base_charge DECIMAL(10,2);
  v_usage_charge DECIMAL(10,2);
  v_referral_credit DECIMAL(10,2);
  v_total DECIMAL(10,2);
BEGIN
  -- Get user and their plan
  SELECT * INTO v_user FROM users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  SELECT * INTO v_plan FROM billing_plans WHERE tier = v_user.tier;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Billing plan not found for tier: %', v_user.tier;
  END IF;

  -- Calculate total requests and cost in period
  SELECT
    COUNT(*),
    COALESCE(SUM(cost_usd), 0)
  INTO v_requests_count, v_total_cost
  FROM usage_logs
  WHERE user_id = p_user_id
    AND created_at >= p_period_start
    AND created_at < p_period_end;

  -- Calculate overage
  v_overage_requests := GREATEST(v_requests_count - COALESCE(v_plan.included_requests, 0), 0);

  -- Calculate charges
  v_base_charge := v_plan.price_monthly;

  -- For request-based billing, use overage_rate_per_request
  IF v_plan.billing_mode = 'requests' THEN
    v_usage_charge := v_overage_requests * COALESCE(v_plan.overage_rate_per_request, 0);
  ELSE
    -- Fallback to token-based for legacy plans (shouldn't happen after migration)
    v_usage_charge := GREATEST(v_total_cost - v_base_charge, 0);
  END IF;

  -- Apply referral credits
  v_referral_credit := LEAST(COALESCE(v_user.credits_balance, 0), v_base_charge + v_usage_charge);

  -- Calculate total
  v_total := GREATEST(v_base_charge + v_usage_charge - v_referral_credit, 0);

  RETURN QUERY SELECT
    v_base_charge,
    v_usage_charge,
    v_referral_credit,
    v_total,
    v_requests_count,
    COALESCE(v_plan.included_requests, 0)::BIGINT,
    v_overage_requests,
    v_total_cost;
END;
$$;

COMMENT ON FUNCTION calculate_invoice_total_requests IS 'Calculate invoice charges for a billing period using request-based pricing';


-- ============================================================================
-- 7. UPDATE RATE LIMIT FUNCTION TO REMOVE TPM CHECKS
-- ============================================================================

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_api_key_id UUID,
  p_window_type TEXT,
  p_estimated_tokens BIGINT DEFAULT 0  -- Kept for backward compatibility but ignored
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
    ELSE date_trunc('minute', NOW())
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

  -- Check RPM ONLY (requests per minute)
  IF p_window_type = 'minute' AND v_state.request_count >= v_api_key.rate_limit_rpm THEN
    v_retry_after := EXTRACT(EPOCH FROM (v_window_start + INTERVAL '1 minute' - NOW()))::INTEGER;
    RETURN QUERY SELECT true, 'rpm'::TEXT, v_state.request_count::BIGINT, v_api_key.rate_limit_rpm::BIGINT, v_retry_after;
    RETURN;
  END IF;

  -- REMOVED: TPM check (no longer enforced)
  -- REMOVED: Daily/monthly token quota checks

  -- Not exceeded
  RETURN QUERY SELECT false, NULL::TEXT, 0::BIGINT, 0::BIGINT, 0;
END;
$$;

COMMENT ON FUNCTION check_rate_limit IS 'Check rate limits - now only enforces RPM, token limits removed';


-- ============================================================================
-- 8. ADD DEPRECATION COMMENTS TO TOKEN-BASED COLUMNS
-- ============================================================================

COMMENT ON COLUMN rate_limit_state.token_count IS 'DEPRECATED: Token count tracking (kept for analytics only, not used for rate limiting)';
COMMENT ON COLUMN billing_plans.included_tokens IS 'DEPRECATED: Monthly token quota (replaced by included_requests for request-based billing)';
COMMENT ON COLUMN billing_plans.overage_rate_per_1k_tokens IS 'DEPRECATED: Token overage rate (replaced by overage_rate_per_request)';
COMMENT ON COLUMN billing_plans.rate_limit_tpm IS 'DEPRECATED: Tokens per minute limit (no longer enforced, only RPM used)';


-- ============================================================================
-- 9. CREATE HELPER FUNCTION TO GET MODEL PRICING
-- ============================================================================

CREATE OR REPLACE FUNCTION get_model_price_per_request(p_model_name TEXT)
RETURNS DECIMAL(8,6)
LANGUAGE plpgsql
AS $$
DECLARE
  v_price DECIMAL(8,6);
  v_base_model TEXT;
BEGIN
  -- Try exact match first
  SELECT price_per_request INTO v_price
  FROM model_pricing
  WHERE model_name = p_model_name
    AND is_active = true;

  IF FOUND THEN
    RETURN v_price;
  END IF;

  -- Try partial match (e.g., "gpt-4-0613" -> "gpt-4")
  SELECT price_per_request INTO v_price
  FROM model_pricing
  WHERE p_model_name LIKE (model_name || '%')
    AND is_active = true
  ORDER BY char_length(model_name) DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN v_price;
  END IF;

  -- Fallback to default
  SELECT price_per_request INTO v_price
  FROM model_pricing
  WHERE model_name = 'default'
    AND is_active = true;

  RETURN COALESCE(v_price, 0.005);
END;
$$;

COMMENT ON FUNCTION get_model_price_per_request IS 'Get per-request pricing for a model with fuzzy matching and default fallback';


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify migration
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Check billing_plans updated
  SELECT COUNT(*) INTO v_count
  FROM billing_plans
  WHERE billing_mode = 'requests';

  RAISE NOTICE 'Migration complete: % billing plans converted to request-based billing', v_count;

  -- Check model pricing seeded
  SELECT COUNT(*) INTO v_count FROM model_pricing;
  RAISE NOTICE 'Model pricing table seeded with % models', v_count;
END $$;
