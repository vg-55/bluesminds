-- ============================================================================
-- FIX REFERRAL SETTINGS HISTORY TABLE
-- ============================================================================
-- This migration adds missing columns to referral_settings_history that were
-- added to referral_settings in migration 013 but not added to the history table
-- ============================================================================

-- Add missing columns to referral_settings_history
ALTER TABLE referral_settings_history
ADD COLUMN IF NOT EXISTS reward_type TEXT DEFAULT 'requests' CHECK (reward_type IN ('requests', 'credits')),
ADD COLUMN IF NOT EXISTS referrer_requests INTEGER DEFAULT 1000 CHECK (referrer_requests >= 0),
ADD COLUMN IF NOT EXISTS referee_requests INTEGER DEFAULT 500 CHECK (referee_requests >= 0),
ADD COLUMN IF NOT EXISTS min_qualifying_requests INTEGER DEFAULT 10 CHECK (min_qualifying_requests >= 0);

-- Update existing history records to have default values
UPDATE referral_settings_history
SET
  reward_type = COALESCE(reward_type, 'requests'),
  referrer_requests = COALESCE(referrer_requests, 1000),
  referee_requests = COALESCE(referee_requests, 500),
  min_qualifying_requests = COALESCE(min_qualifying_requests, 10)
WHERE reward_type IS NULL OR referrer_requests IS NULL OR referee_requests IS NULL OR min_qualifying_requests IS NULL;

-- Add comments
COMMENT ON COLUMN referral_settings_history.reward_type IS 'Type of reward: requests or credits';
COMMENT ON COLUMN referral_settings_history.referrer_requests IS 'Number of free requests the referrer receives';
COMMENT ON COLUMN referral_settings_history.referee_requests IS 'Number of free requests the referee receives';
COMMENT ON COLUMN referral_settings_history.min_qualifying_requests IS 'Minimum requests the referee must make to complete referral';
