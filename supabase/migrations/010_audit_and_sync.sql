-- ============================================================================
-- AUDIT AND DATA SYNCHRONIZATION
-- ============================================================================
-- This migration creates comprehensive audit trails and data synchronization:
-- 1. Referral settings history with versioning
-- 2. Admin audit log for all admin actions
-- 3. Platform settings table for system-wide settings
-- 4. Enhanced referrals table with settings linkage
-- ============================================================================

-- ============================================================================
-- REFERRAL SETTINGS HISTORY TABLE
-- ============================================================================
-- Tracks all changes to referral settings with versioning

CREATE TABLE IF NOT EXISTS referral_settings_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL,

  -- Settings snapshot (same fields as referral_settings)
  referrer_reward_type TEXT NOT NULL CHECK (referrer_reward_type IN ('fixed', 'percentage')),
  referrer_reward_value DECIMAL(10,2) NOT NULL,
  referee_reward_type TEXT NOT NULL CHECK (referee_reward_type IN ('fixed', 'percentage')),
  referee_reward_value DECIMAL(10,2) NOT NULL,
  min_purchase_amount DECIMAL(10,2) NOT NULL,
  enabled BOOLEAN NOT NULL,

  -- Audit fields
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  change_reason TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT referral_settings_history_unique_version UNIQUE (version),
  CONSTRAINT referral_settings_history_values_non_negative CHECK (
    referrer_reward_value >= 0 AND
    referee_reward_value >= 0 AND
    min_purchase_amount >= 0
  )
);

-- Index for fast version lookup
CREATE INDEX IF NOT EXISTS idx_referral_settings_history_version ON referral_settings_history(version DESC);
CREATE INDEX IF NOT EXISTS idx_referral_settings_history_created_at ON referral_settings_history(created_at DESC);

-- ============================================================================
-- ADMIN AUDIT LOG TABLE
-- ============================================================================
-- Comprehensive log of all admin actions across the system

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who and what
  admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('create', 'update', 'delete', 'activate', 'deactivate')),
  resource_type TEXT NOT NULL, -- e.g., 'referral_settings', 'redemption_code', 'user', 'server', etc.
  resource_id UUID, -- ID of the affected resource (nullable for system-wide actions)

  -- Details
  action_description TEXT NOT NULL,
  old_values JSONB, -- Previous state (for updates/deletes)
  new_values JSONB, -- New state (for creates/updates)

  -- Context
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT admin_audit_log_description_length CHECK (char_length(action_description) >= 1 AND char_length(action_description) <= 500)
);

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin ON admin_audit_log(admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_resource ON admin_audit_log(resource_type, resource_id) WHERE resource_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_resource_type ON admin_audit_log(resource_type, created_at DESC);

-- ============================================================================
-- PLATFORM SETTINGS TABLE
-- ============================================================================
-- Persistent storage for system-wide settings

CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- System settings
  maintenance_mode BOOLEAN DEFAULT false,
  new_user_signups BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  rate_limit_default INTEGER DEFAULT 1000,
  default_user_tier TEXT DEFAULT 'free' CHECK (default_user_tier IN ('free', 'starter', 'pro', 'enterprise')),

  -- Metadata
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB,

  -- Constraints
  CONSTRAINT platform_settings_rate_limit_positive CHECK (rate_limit_default > 0)
);

-- Insert default row with known ID for easy access
INSERT INTO platform_settings (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ENHANCE REFERRALS TABLE
-- ============================================================================
-- Add settings version linkage to referrals

-- Add new columns to referrals table
ALTER TABLE referrals
ADD COLUMN IF NOT EXISTS settings_version INTEGER,
ADD COLUMN IF NOT EXISTS settings_snapshot JSONB DEFAULT '{}'::JSONB;

-- Add foreign key constraint (after we populate data)
-- We'll add this after backfilling

-- ============================================================================
-- DATA BACKFILL AND INITIALIZATION
-- ============================================================================

-- Create baseline version 1 from current referral_settings
INSERT INTO referral_settings_history (
  version,
  referrer_reward_type,
  referrer_reward_value,
  referee_reward_type,
  referee_reward_value,
  min_purchase_amount,
  enabled,
  change_reason,
  created_at
)
SELECT
  1,
  referrer_reward_type,
  referrer_reward_value,
  referee_reward_type,
  referee_reward_value,
  min_purchase_amount,
  enabled,
  'Initial baseline version created during migration',
  created_at
FROM referral_settings
LIMIT 1
ON CONFLICT (version) DO NOTHING;

-- Backfill existing referrals with current settings as version 1
UPDATE referrals
SET
  settings_version = 1,
  settings_snapshot = (
    SELECT jsonb_build_object(
      'referrer_reward_type', referrer_reward_type,
      'referrer_reward_value', referrer_reward_value,
      'referee_reward_type', referee_reward_type,
      'referee_reward_value', referee_reward_value,
      'min_purchase_amount', min_purchase_amount,
      'enabled', enabled
    )
    FROM referral_settings
    LIMIT 1
  )
WHERE settings_version IS NULL;

-- Now add the foreign key constraint
ALTER TABLE referrals
ADD CONSTRAINT referrals_settings_version_fk
FOREIGN KEY (settings_version)
REFERENCES referral_settings_history(version)
ON DELETE SET NULL;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_referrals_settings_version ON referrals(settings_version);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get the next settings version number
CREATE OR REPLACE FUNCTION get_next_settings_version()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version), 0) + 1 INTO next_version
  FROM referral_settings_history;
  RETURN next_version;
END;
$$;

-- Function to automatically create settings history entry when referral_settings is updated
CREATE OR REPLACE FUNCTION audit_referral_settings_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_version INTEGER;
BEGIN
  -- Get next version number
  next_version := get_next_settings_version();

  -- Insert new version into history
  INSERT INTO referral_settings_history (
    version,
    referrer_reward_type,
    referrer_reward_value,
    referee_reward_type,
    referee_reward_value,
    min_purchase_amount,
    enabled,
    change_reason,
    metadata
  ) VALUES (
    next_version,
    NEW.referrer_reward_type,
    NEW.referrer_reward_value,
    NEW.referee_reward_type,
    NEW.referee_reward_value,
    NEW.min_purchase_amount,
    NEW.enabled,
    'Automatic version created by trigger',
    jsonb_build_object(
      'trigger', 'audit_referral_settings_changes',
      'updated_at', NEW.updated_at
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger for automatic audit logging (optional - can be disabled if app handles it)
-- Commented out by default, uncomment if you want automatic DB-level auditing
-- CREATE TRIGGER trigger_audit_referral_settings
-- AFTER UPDATE ON referral_settings
-- FOR EACH ROW
-- WHEN (OLD.* IS DISTINCT FROM NEW.*)
-- EXECUTE FUNCTION audit_referral_settings_changes();

-- Function to get current settings with version
CREATE OR REPLACE FUNCTION get_current_settings_with_version()
RETURNS TABLE (
  version INTEGER,
  referrer_reward_type TEXT,
  referrer_reward_value DECIMAL,
  referee_reward_type TEXT,
  referee_reward_value DECIMAL,
  min_purchase_amount DECIMAL,
  enabled BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rsh.version,
    rsh.referrer_reward_type,
    rsh.referrer_reward_value,
    rsh.referee_reward_type,
    rsh.referee_reward_value,
    rsh.min_purchase_amount,
    rsh.enabled
  FROM referral_settings_history rsh
  ORDER BY rsh.version DESC
  LIMIT 1;
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE referral_settings_history IS 'Versioned history of all referral settings changes for audit and rollback';
COMMENT ON COLUMN referral_settings_history.version IS 'Sequential version number (1, 2, 3...) for settings snapshots';
COMMENT ON COLUMN referral_settings_history.changed_by IS 'Admin user who made this change';
COMMENT ON COLUMN referral_settings_history.change_reason IS 'Optional reason for the settings change';

COMMENT ON TABLE admin_audit_log IS 'Comprehensive audit trail of all admin actions across the system';
COMMENT ON COLUMN admin_audit_log.resource_type IS 'Type of resource affected (referral_settings, redemption_code, user, server, etc.)';
COMMENT ON COLUMN admin_audit_log.old_values IS 'JSONB snapshot of previous state for updates/deletes';
COMMENT ON COLUMN admin_audit_log.new_values IS 'JSONB snapshot of new state for creates/updates';

COMMENT ON TABLE platform_settings IS 'System-wide platform settings (single row with known ID)';
COMMENT ON COLUMN platform_settings.id IS 'Fixed ID 00000000-0000-0000-0000-000000000001 for easy access';

COMMENT ON COLUMN referrals.settings_version IS 'Links to the settings version that was active when this referral was created';
COMMENT ON COLUMN referrals.settings_snapshot IS 'Denormalized JSONB snapshot of settings for fast access without joins';

COMMENT ON FUNCTION get_next_settings_version IS 'Returns the next available settings version number';
COMMENT ON FUNCTION audit_referral_settings_changes IS 'Trigger function to automatically version settings changes';
COMMENT ON FUNCTION get_current_settings_with_version IS 'Returns the most recent settings version with all fields';
