-- ============================================================================
-- REFERRALS AND REDEMPTION CODES
-- ============================================================================
-- This migration creates tables for referral tracking and redemption codes
-- ============================================================================

-- ============================================================================
-- REFERRALS TABLE
-- ============================================================================
-- Tracks referral relationships and rewards

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referrer and referee
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),

  -- Reward tracking
  referrer_reward DECIMAL(10,2) DEFAULT 0.00,
  referee_reward DECIMAL(10,2) DEFAULT 0.00,
  reward_paid BOOLEAN DEFAULT false,

  -- Dates
  signup_date TIMESTAMPTZ DEFAULT NOW(),
  completion_date TIMESTAMPTZ, -- When the referee made their first qualifying purchase

  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT referrals_different_users CHECK (referrer_id != referee_id),
  CONSTRAINT referrals_rewards_non_negative CHECK (referrer_reward >= 0 AND referee_reward >= 0)
);

-- Indexes for referrals
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON referrals(referee_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_completion ON referrals(completion_date) WHERE completion_date IS NOT NULL;

-- ============================================================================
-- REDEMPTION CODES TABLE
-- ============================================================================
-- Stores promotional/redemption codes for free requests

CREATE TABLE IF NOT EXISTS redemption_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Code details
  code TEXT UNIQUE NOT NULL,
  requests INTEGER NOT NULL, -- Number of requests each redemption gives

  -- Usage limits
  type TEXT NOT NULL CHECK (type IN ('one-time', 'multi-use', 'unlimited')),
  max_uses INTEGER, -- NULL for unlimited
  current_uses INTEGER DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'depleted')),

  -- Creator and dates
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT redemption_codes_code_length CHECK (char_length(code) >= 4 AND char_length(code) <= 50),
  CONSTRAINT redemption_codes_requests_positive CHECK (requests > 0),
  CONSTRAINT redemption_codes_max_uses_valid CHECK (
    (type = 'unlimited' AND max_uses IS NULL) OR
    (type != 'unlimited' AND max_uses > 0)
  ),
  CONSTRAINT redemption_codes_uses_valid CHECK (current_uses >= 0 AND (max_uses IS NULL OR current_uses <= max_uses))
);

-- Indexes for redemption_codes
CREATE INDEX IF NOT EXISTS idx_redemption_codes_code ON redemption_codes(code);
CREATE INDEX IF NOT EXISTS idx_redemption_codes_status ON redemption_codes(status);
CREATE INDEX IF NOT EXISTS idx_redemption_codes_expires ON redemption_codes(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_redemption_codes_created_by ON redemption_codes(created_by);

-- ============================================================================
-- CODE REDEMPTIONS TABLE
-- ============================================================================
-- Tracks individual code redemptions by users

CREATE TABLE IF NOT EXISTS code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  code_id UUID NOT NULL REFERENCES redemption_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Details
  requests_granted INTEGER NOT NULL,

  -- Dates
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,

  -- Constraints
  CONSTRAINT code_redemptions_requests_positive CHECK (requests_granted > 0),
  CONSTRAINT code_redemptions_unique_user_code UNIQUE (code_id, user_id) -- Prevent duplicate redemptions by same user
);

-- Indexes for code_redemptions
CREATE INDEX IF NOT EXISTS idx_code_redemptions_code ON code_redemptions(code_id, redeemed_at DESC);
CREATE INDEX IF NOT EXISTS idx_code_redemptions_user ON code_redemptions(user_id, redeemed_at DESC);

-- ============================================================================
-- REFERRAL SETTINGS TABLE
-- ============================================================================
-- Stores global referral program settings

CREATE TABLE IF NOT EXISTS referral_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referrer rewards
  referrer_reward_type TEXT DEFAULT 'fixed' CHECK (referrer_reward_type IN ('fixed', 'percentage')),
  referrer_reward_value DECIMAL(10,2) DEFAULT 50.00,

  -- Referee rewards
  referee_reward_type TEXT DEFAULT 'fixed' CHECK (referee_reward_type IN ('fixed', 'percentage')),
  referee_reward_value DECIMAL(10,2) DEFAULT 10.00,

  -- Program settings
  min_purchase_amount DECIMAL(10,2) DEFAULT 100.00,
  enabled BOOLEAN DEFAULT true,

  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT referral_settings_values_non_negative CHECK (
    referrer_reward_value >= 0 AND
    referee_reward_value >= 0 AND
    min_purchase_amount >= 0
  )
);

-- Insert default referral settings (only one row should exist)
INSERT INTO referral_settings (
  referrer_reward_type,
  referrer_reward_value,
  referee_reward_type,
  referee_reward_value,
  min_purchase_amount,
  enabled
) VALUES (
  'fixed',
  50.00,
  'fixed',
  10.00,
  100.00,
  true
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update code status based on usage
CREATE OR REPLACE FUNCTION update_code_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update current_uses
  UPDATE redemption_codes
  SET
    current_uses = (
      SELECT COUNT(*)
      FROM code_redemptions
      WHERE code_id = NEW.code_id
    ),
    updated_at = NOW()
  WHERE id = NEW.code_id;

  -- Update status if depleted
  UPDATE redemption_codes
  SET status = 'depleted'
  WHERE id = NEW.code_id
    AND type != 'unlimited'
    AND current_uses >= max_uses
    AND status = 'active';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update code status after redemption
CREATE TRIGGER trigger_update_code_status
AFTER INSERT ON code_redemptions
FOR EACH ROW
EXECUTE FUNCTION update_code_status();

-- Function to check and update expired codes
CREATE OR REPLACE FUNCTION check_expired_codes()
RETURNS void AS $$
BEGIN
  UPDATE redemption_codes
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to process referral completion
CREATE OR REPLACE FUNCTION complete_referral(p_referral_id UUID)
RETURNS void AS $$
DECLARE
  v_referral referrals;
  v_settings referral_settings;
BEGIN
  -- Get referral and settings
  SELECT * INTO v_referral FROM referrals WHERE id = p_referral_id;
  SELECT * INTO v_settings FROM referral_settings LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Referral or settings not found';
  END IF;

  -- Only process if pending or active
  IF v_referral.status NOT IN ('pending', 'active') THEN
    RETURN;
  END IF;

  -- Update referral status
  UPDATE referrals
  SET
    status = 'completed',
    completion_date = NOW(),
    referrer_reward = v_settings.referrer_reward_value,
    referee_reward = v_settings.referee_reward_value,
    reward_paid = true,
    updated_at = NOW()
  WHERE id = p_referral_id;

  -- Add credits to referrer
  UPDATE users
  SET credits_balance = credits_balance + v_settings.referrer_reward_value
  WHERE id = v_referral.referrer_id;

  -- Add credits to referee
  UPDATE users
  SET credits_balance = credits_balance + v_settings.referee_reward_value
  WHERE id = v_referral.referee_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE referrals IS 'Tracks user referrals and rewards';
COMMENT ON COLUMN referrals.status IS 'pending: signed up, active: verified, completed: reward paid, cancelled: referral invalidated';

COMMENT ON TABLE redemption_codes IS 'Promotional codes for free requests';
COMMENT ON COLUMN redemption_codes.type IS 'one-time: single use per code, multi-use: limited uses, unlimited: no use limit';

COMMENT ON TABLE code_redemptions IS 'Individual code redemptions by users';

COMMENT ON TABLE referral_settings IS 'Global referral program configuration (single row)';

COMMENT ON FUNCTION update_code_status IS 'Automatically updates code usage and status after redemption';
COMMENT ON FUNCTION check_expired_codes IS 'Checks and updates status of expired codes';
COMMENT ON FUNCTION complete_referral IS 'Processes referral completion and credits distribution';
