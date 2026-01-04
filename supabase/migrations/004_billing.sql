-- ============================================================================
-- BILLING SYSTEM
-- ============================================================================
-- This migration creates tables for billing plans, invoices, and payments
-- ============================================================================

-- ============================================================================
-- BILLING PLANS TABLE
-- ============================================================================
-- Defines available subscription tiers and their pricing

CREATE TABLE IF NOT EXISTS billing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  tier TEXT UNIQUE NOT NULL CHECK (tier IN ('free', 'starter', 'pro', 'enterprise')),

  -- Pricing
  price_monthly DECIMAL(10,2) NOT NULL,
  included_tokens INTEGER DEFAULT 0, -- Monthly included tokens
  overage_rate_per_1k_tokens DECIMAL(6,4) DEFAULT 0.0000,

  -- Rate limits for this plan
  rate_limit_rpm INTEGER DEFAULT 60,
  rate_limit_tpm INTEGER DEFAULT 100000,
  quota_daily INTEGER DEFAULT 10000,
  quota_monthly INTEGER DEFAULT 300000,

  -- Features (JSON for flexibility)
  features JSONB DEFAULT '{}'::JSONB,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT billing_plans_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  CONSTRAINT billing_plans_price_non_negative CHECK (price_monthly >= 0),
  CONSTRAINT billing_plans_tokens_non_negative CHECK (included_tokens >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_billing_plans_tier ON billing_plans(tier);
CREATE INDEX IF NOT EXISTS idx_billing_plans_active ON billing_plans(is_active);

-- ============================================================================
-- INSERT DEFAULT BILLING PLANS
-- ============================================================================

INSERT INTO billing_plans (name, tier, price_monthly, included_tokens, overage_rate_per_1k_tokens, rate_limit_rpm, rate_limit_tpm, quota_daily, quota_monthly, features) VALUES
  (
    'Free',
    'free',
    0.00,
    10000, -- 10K tokens/month
    0.0000, -- No overage allowed
    10, -- 10 requests/minute
    10000, -- 10K tokens/minute
    1000, -- 1K tokens/day
    10000, -- 10K tokens/month
    '{"max_api_keys": 1, "analytics_retention_days": 7, "support": "community"}'::JSONB
  ),
  (
    'Starter',
    'starter',
    29.00,
    500000, -- 500K tokens/month
    0.0020, -- $0.002 per 1K overage tokens
    60, -- 60 requests/minute
    100000, -- 100K tokens/minute
    20000, -- 20K tokens/day
    500000, -- 500K tokens/month
    '{"max_api_keys": 5, "analytics_retention_days": 30, "support": "email", "rate_limit_burst": true}'::JSONB
  ),
  (
    'Pro',
    'pro',
    99.00,
    2000000, -- 2M tokens/month
    0.0015, -- $0.0015 per 1K overage tokens
    200, -- 200 requests/minute
    500000, -- 500K tokens/minute
    100000, -- 100K tokens/day
    2000000, -- 2M tokens/month
    '{"max_api_keys": 20, "analytics_retention_days": 90, "support": "priority", "rate_limit_burst": true, "custom_rate_limits": true, "webhook_notifications": true}'::JSONB
  ),
  (
    'Enterprise',
    'enterprise',
    499.00,
    10000000, -- 10M tokens/month
    0.0010, -- $0.001 per 1K overage tokens
    1000, -- 1000 requests/minute
    2000000, -- 2M tokens/minute
    500000, -- 500K tokens/day
    10000000, -- 10M tokens/month
    '{"max_api_keys": 100, "analytics_retention_days": 365, "support": "24/7", "rate_limit_burst": true, "custom_rate_limits": true, "webhook_notifications": true, "dedicated_server": true, "sla": "99.9%", "custom_contract": true}'::JSONB
  )
ON CONFLICT (tier) DO NOTHING;

-- ============================================================================
-- INVOICES TABLE
-- ============================================================================
-- Stores monthly invoices for each user

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE NOT NULL,

  -- Billing period
  billing_period_start TIMESTAMPTZ NOT NULL,
  billing_period_end TIMESTAMPTZ NOT NULL,

  -- Charges breakdown
  base_charge DECIMAL(10,2) DEFAULT 0.00, -- Monthly plan price
  usage_charge DECIMAL(10,2) DEFAULT 0.00, -- Overage charges
  referral_credit DECIMAL(10,2) DEFAULT 0.00, -- Credits from referrals
  discount DECIMAL(10,2) DEFAULT 0.00, -- Any discounts applied
  tax DECIMAL(10,2) DEFAULT 0.00, -- Tax amount
  total_amount DECIMAL(10,2) NOT NULL, -- Final amount to charge

  -- Usage metadata
  tokens_used BIGINT DEFAULT 0,
  tokens_included BIGINT DEFAULT 0,
  overage_tokens BIGINT DEFAULT 0,
  total_requests BIGINT DEFAULT 0,

  -- Payment status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  paid_at TIMESTAMPTZ,
  payment_method TEXT, -- e.g., 'stripe', 'paypal', 'credit_card'
  payment_id TEXT, -- External payment provider ID

  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT invoices_period_valid CHECK (billing_period_end > billing_period_start),
  CONSTRAINT invoices_amounts_non_negative CHECK (
    base_charge >= 0 AND
    usage_charge >= 0 AND
    referral_credit >= 0 AND
    discount >= 0 AND
    tax >= 0
  ),
  CONSTRAINT invoices_tokens_non_negative CHECK (
    tokens_used >= 0 AND
    tokens_included >= 0 AND
    overage_tokens >= 0 AND
    total_requests >= 0
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id, billing_period_start DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_period ON invoices(billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

-- ============================================================================
-- PAYMENT TRANSACTIONS TABLE (OPTIONAL - FOR DETAILED TRACKING)
-- ============================================================================
-- Tracks individual payment attempts and their results

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Transaction details
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_method TEXT, -- e.g., 'credit_card', 'paypal', 'stripe'
  payment_provider TEXT, -- e.g., 'stripe', 'paypal'
  provider_transaction_id TEXT UNIQUE, -- External transaction ID

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded')),
  error_message TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT payment_transactions_amount_positive CHECK (amount > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_invoice ON payment_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider ON payment_transactions(provider_transaction_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_year TEXT;
  v_month TEXT;
  v_count INTEGER;
  v_invoice_number TEXT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  v_month := TO_CHAR(NOW(), 'MM');

  -- Count existing invoices this month
  SELECT COUNT(*) INTO v_count
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || v_year || v_month || '%';

  v_count := v_count + 1;

  -- Format: INV-YYYYMM-0001
  v_invoice_number := 'INV-' || v_year || v_month || '-' || LPAD(v_count::TEXT, 4, '0');

  RETURN v_invoice_number;
END;
$$;

-- Function to calculate invoice total
CREATE OR REPLACE FUNCTION calculate_invoice_total(
  p_user_id UUID,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ
)
RETURNS TABLE(
  base_charge DECIMAL(10,2),
  usage_charge DECIMAL(10,2),
  referral_credit DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  tokens_used BIGINT,
  tokens_included BIGINT,
  overage_tokens BIGINT,
  total_requests BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_user users;
  v_plan billing_plans;
  v_tokens_used BIGINT;
  v_requests_count BIGINT;
  v_overage_tokens BIGINT;
  v_base_charge DECIMAL(10,2);
  v_usage_charge DECIMAL(10,2);
  v_referral_credit DECIMAL(10,2);
  v_total DECIMAL(10,2);
BEGIN
  -- Get user and their plan
  SELECT * INTO v_user FROM users WHERE id = p_user_id;
  SELECT * INTO v_plan FROM billing_plans WHERE tier = v_user.tier;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User or plan not found';
  END IF;

  -- Calculate total tokens used in period
  SELECT
    COALESCE(SUM(total_tokens), 0),
    COUNT(*)
  INTO v_tokens_used, v_requests_count
  FROM usage_logs
  WHERE user_id = p_user_id
    AND created_at >= p_period_start
    AND created_at < p_period_end;

  -- Calculate overage
  v_overage_tokens := GREATEST(v_tokens_used - v_plan.included_tokens, 0);

  -- Calculate charges
  v_base_charge := v_plan.price_monthly;
  v_usage_charge := (v_overage_tokens / 1000.0) * v_plan.overage_rate_per_1k_tokens;
  v_referral_credit := LEAST(v_user.credits_balance, v_base_charge + v_usage_charge);
  v_total := v_base_charge + v_usage_charge - v_referral_credit;

  RETURN QUERY SELECT
    v_base_charge,
    v_usage_charge,
    v_referral_credit,
    v_total,
    v_tokens_used,
    v_plan.included_tokens::BIGINT,
    v_overage_tokens,
    v_requests_count;
END;
$$;

-- Function to create monthly invoice
CREATE OR REPLACE FUNCTION create_monthly_invoice(
  p_user_id UUID,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ
)
RETURNS invoices
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice invoices;
  v_invoice_number TEXT;
  v_calculation RECORD;
BEGIN
  -- Calculate charges
  SELECT * INTO v_calculation
  FROM calculate_invoice_total(p_user_id, p_period_start, p_period_end);

  -- Generate invoice number
  v_invoice_number := generate_invoice_number();

  -- Create invoice
  INSERT INTO invoices (
    user_id,
    invoice_number,
    billing_period_start,
    billing_period_end,
    base_charge,
    usage_charge,
    referral_credit,
    total_amount,
    tokens_used,
    tokens_included,
    overage_tokens,
    total_requests,
    status
  ) VALUES (
    p_user_id,
    v_invoice_number,
    p_period_start,
    p_period_end,
    v_calculation.base_charge,
    v_calculation.usage_charge,
    v_calculation.referral_credit,
    v_calculation.total_amount,
    v_calculation.tokens_used,
    v_calculation.tokens_included,
    v_calculation.overage_tokens,
    v_calculation.total_requests,
    CASE WHEN v_calculation.total_amount <= 0 THEN 'paid' ELSE 'pending' END
  )
  RETURNING * INTO v_invoice;

  RETURN v_invoice;
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE billing_plans IS 'Available subscription tiers and their pricing';
COMMENT ON COLUMN billing_plans.included_tokens IS 'Monthly token quota included in base price';
COMMENT ON COLUMN billing_plans.overage_rate_per_1k_tokens IS 'Cost per 1000 tokens over quota';

COMMENT ON TABLE invoices IS 'Monthly invoices for users';
COMMENT ON COLUMN invoices.invoice_number IS 'Unique invoice number (format: INV-YYYYMM-0001)';

COMMENT ON TABLE payment_transactions IS 'Individual payment attempts and results';

COMMENT ON FUNCTION generate_invoice_number IS 'Generates unique invoice number';
COMMENT ON FUNCTION calculate_invoice_total IS 'Calculates invoice charges for a billing period';
COMMENT ON FUNCTION create_monthly_invoice IS 'Creates a new invoice for a user';
