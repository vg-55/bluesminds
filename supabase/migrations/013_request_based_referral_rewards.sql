-- ============================================================================
-- REQUEST-BASED REFERRAL REWARDS
-- ============================================================================
-- This migration updates the referral system to use request-based rewards
-- instead of monetary rewards, configurable from the admin panel
-- ============================================================================

-- ============================================================================
-- 1. ADD FREE REQUESTS BALANCE TO USERS
-- ============================================================================
-- Track how many free requests a user has earned through referrals

ALTER TABLE users
ADD COLUMN IF NOT EXISTS free_requests_balance INTEGER DEFAULT 0 CHECK (free_requests_balance >= 0);

CREATE INDEX IF NOT EXISTS idx_users_free_requests ON users(free_requests_balance);

COMMENT ON COLUMN users.free_requests_balance IS 'Number of free API requests earned through referrals and promotions';

-- ============================================================================
-- 2. UPDATE REFERRAL_SETTINGS FOR REQUEST-BASED REWARDS
-- ============================================================================
-- Modify referral_settings to support request-based rewards

-- Add new columns for request-based rewards
ALTER TABLE referral_settings
ADD COLUMN IF NOT EXISTS referrer_requests INTEGER DEFAULT 1000 CHECK (referrer_requests >= 0),
ADD COLUMN IF NOT EXISTS referee_requests INTEGER DEFAULT 500 CHECK (referee_requests >= 0),
ADD COLUMN IF NOT EXISTS reward_type TEXT DEFAULT 'requests' CHECK (reward_type IN ('requests', 'credits'));

-- Add column for minimum qualifying actions
ALTER TABLE referral_settings
ADD COLUMN IF NOT EXISTS min_qualifying_requests INTEGER DEFAULT 10 CHECK (min_qualifying_requests >= 0);

COMMENT ON COLUMN referral_settings.referrer_requests IS 'Number of free requests the referrer receives';
COMMENT ON COLUMN referral_settings.referee_requests IS 'Number of free requests the referee receives';
COMMENT ON COLUMN referral_settings.reward_type IS 'Type of reward: requests or credits';
COMMENT ON COLUMN referral_settings.min_qualifying_requests IS 'Minimum requests the referee must make to complete referral';

-- Update existing settings to use request-based rewards
UPDATE referral_settings
SET
  reward_type = 'requests',
  referrer_requests = 1000,
  referee_requests = 500,
  min_qualifying_requests = 10
WHERE id IS NOT NULL;

-- ============================================================================
-- 3. UPDATE REFERRALS TABLE FOR REQUEST TRACKING
-- ============================================================================
-- Update referrals table to track request rewards instead of monetary rewards

-- Rename existing columns (keep for backwards compatibility, but they'll be deprecated)
-- Add new columns for request-based rewards
ALTER TABLE referrals
ADD COLUMN IF NOT EXISTS referrer_requests_granted INTEGER DEFAULT 0 CHECK (referrer_requests_granted >= 0),
ADD COLUMN IF NOT EXISTS referee_requests_granted INTEGER DEFAULT 0 CHECK (referee_requests_granted >= 0);

COMMENT ON COLUMN referrals.referrer_requests_granted IS 'Number of free requests granted to the referrer';
COMMENT ON COLUMN referrals.referee_requests_granted IS 'Number of free requests granted to the referee';

-- ============================================================================
-- 4. UPDATE COMPLETE_REFERRAL FUNCTION
-- ============================================================================
-- Update the function to grant requests instead of credits

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

  -- Determine reward type and amounts
  IF v_settings.reward_type = 'requests' THEN
    -- Update referral with request rewards
    UPDATE referrals
    SET
      status = 'completed',
      completion_date = NOW(),
      referrer_requests_granted = v_settings.referrer_requests,
      referee_requests_granted = v_settings.referee_requests,
      reward_paid = true,
      updated_at = NOW()
    WHERE id = p_referral_id;

    -- Add free requests to referrer
    UPDATE users
    SET free_requests_balance = free_requests_balance + v_settings.referrer_requests
    WHERE id = v_referral.referrer_id;

    -- Add free requests to referee
    UPDATE users
    SET free_requests_balance = free_requests_balance + v_settings.referee_requests
    WHERE id = v_referral.referee_id;

  ELSE
    -- Use old credit-based system (backwards compatibility)
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
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. CREATE FUNCTION TO CHECK REFERRAL QUALIFICATION
-- ============================================================================
-- Automatically complete referrals when referee makes enough requests

CREATE OR REPLACE FUNCTION check_referral_qualification()
RETURNS TRIGGER AS $$
DECLARE
  v_referee_id UUID;
  v_referral_id UUID;
  v_request_count INTEGER;
  v_min_requests INTEGER;
BEGIN
  -- Get the user_id from the usage log
  v_referee_id := NEW.user_id;

  -- Check if this user has any pending referrals
  SELECT id INTO v_referral_id
  FROM referrals
  WHERE referee_id = v_referee_id
    AND status IN ('pending', 'active')
  LIMIT 1;

  -- If no pending referral, exit
  IF v_referral_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get minimum qualifying requests
  SELECT min_qualifying_requests INTO v_min_requests
  FROM referral_settings
  LIMIT 1;

  -- Count total requests made by referee
  SELECT COUNT(*) INTO v_request_count
  FROM usage_logs
  WHERE user_id = v_referee_id
    AND status = 'success';

  -- If referee has made enough requests, complete the referral
  IF v_request_count >= v_min_requests THEN
    -- Update referral status to active (qualifying but not yet rewarded)
    UPDATE referrals
    SET
      status = 'active',
      updated_at = NOW()
    WHERE id = v_referral_id
      AND status = 'pending';

    -- Note: Actual reward distribution should be done manually or via admin action
    -- to prevent abuse. Uncomment below to auto-complete:
    -- PERFORM complete_referral(v_referral_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_check_referral_qualification ON usage_logs;

-- Create trigger to check referral qualification after each request
CREATE TRIGGER trigger_check_referral_qualification
AFTER INSERT ON usage_logs
FOR EACH ROW
EXECUTE FUNCTION check_referral_qualification();

-- ============================================================================
-- 6. CREATE REQUESTS USAGE TRACKING
-- ============================================================================
-- Add a helper to track free request usage

CREATE TABLE IF NOT EXISTS free_requests_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requests_used INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL CHECK (source IN ('referral', 'promotion', 'bonus', 'admin')),
  referral_id UUID REFERENCES referrals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_free_requests_usage_user ON free_requests_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_free_requests_usage_referral ON free_requests_usage(referral_id);

COMMENT ON TABLE free_requests_usage IS 'Tracks usage of free requests earned through referrals and promotions';

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION complete_referral IS 'Processes referral completion and distributes request rewards (or credits for backwards compatibility)';
COMMENT ON FUNCTION check_referral_qualification IS 'Automatically checks if referee has made enough requests to qualify for referral rewards';
COMMENT ON TRIGGER trigger_check_referral_qualification ON usage_logs IS 'Checks referral qualification after each successful API request';
