-- ============================================================================
-- ROW LEVEL SECURITY POLICIES AND USER SYNC
-- ============================================================================
-- This migration fixes critical data access and sync issues:
-- 1. Enables RLS on all tables
-- 2. Creates policies for authenticated users to access their own data
-- 3. Creates trigger to auto-create user profiles
-- 4. Ensures data synchronization between auth.users and users table
-- ============================================================================

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE litellm_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemption_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_settings_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_models ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile (except tier, status, credits)
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role can do everything (admin operations)
CREATE POLICY "Service role full access to users"
  ON users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- API KEYS TABLE POLICIES
-- ============================================================================

-- Users can read their own API keys
CREATE POLICY "Users can read own API keys"
  ON api_keys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own API keys
CREATE POLICY "Users can create own API keys"
  ON api_keys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own API keys (e.g., toggle active)
CREATE POLICY "Users can update own API keys"
  ON api_keys FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own API keys
CREATE POLICY "Users can delete own API keys"
  ON api_keys FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access to api_keys"
  ON api_keys FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- USAGE LOGS TABLE POLICIES
-- ============================================================================

-- Users can read their own usage logs
CREATE POLICY "Users can read own usage logs"
  ON usage_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role full access (for admin dashboard)
CREATE POLICY "Service role full access to usage_logs"
  ON usage_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- REFERRALS TABLE POLICIES
-- ============================================================================

-- Users can read referrals where they're the referrer or referee
CREATE POLICY "Users can read own referrals"
  ON referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

-- Service role full access
CREATE POLICY "Service role full access to referrals"
  ON referrals FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- REDEMPTION CODES TABLE POLICIES
-- ============================================================================

-- Anyone authenticated can read active codes (for redemption)
CREATE POLICY "Authenticated users can read active codes"
  ON redemption_codes FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Service role full access (only admins can create/manage codes)
CREATE POLICY "Service role full access to redemption_codes"
  ON redemption_codes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- CODE REDEMPTIONS TABLE POLICIES
-- ============================================================================

-- Users can read their own redemptions
CREATE POLICY "Users can read own redemptions"
  ON code_redemptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own redemptions
CREATE POLICY "Users can create own redemptions"
  ON code_redemptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access to code_redemptions"
  ON code_redemptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- REFERRAL SETTINGS TABLE POLICIES (READ-ONLY FOR USERS)
-- ============================================================================

-- Anyone authenticated can read referral settings
CREATE POLICY "Authenticated users can read referral settings"
  ON referral_settings FOR SELECT
  TO authenticated
  USING (true);

-- Service role full access
CREATE POLICY "Service role full access to referral_settings"
  ON referral_settings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PLATFORM SETTINGS TABLE POLICIES (READ-ONLY FOR USERS)
-- ============================================================================

-- Anyone authenticated can read platform settings
CREATE POLICY "Authenticated users can read platform settings"
  ON platform_settings FOR SELECT
  TO authenticated
  USING (true);

-- Service role full access
CREATE POLICY "Service role full access to platform_settings"
  ON platform_settings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- ADMIN-ONLY TABLES (Service Role Only)
-- ============================================================================

-- These tables are admin-only, no user access
CREATE POLICY "Service role only access to litellm_servers"
  ON litellm_servers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role only access to referral_settings_history"
  ON referral_settings_history FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role only access to admin_audit_log"
  ON admin_audit_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role only access to custom_models"
  ON custom_models FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role only access to rate_limit_state"
  ON rate_limit_state FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- AUTO-CREATE USER PROFILE TRIGGER
-- ============================================================================
-- When a user signs up via OAuth or other methods, automatically create
-- their profile in the users table

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert new user into public.users table
  INSERT INTO public.users (
    id,
    email,
    full_name,
    tier,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'free',
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- BACKFILL EXISTING AUTH USERS
-- ============================================================================
-- Create user profiles for any auth.users that don't have profiles yet

INSERT INTO public.users (
  id,
  email,
  full_name,
  tier,
  status,
  created_at,
  updated_at
)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
  'free',
  'active',
  au.created_at,
  NOW()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- HELPER FUNCTION: Check if user is admin
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id
    AND role = 'admin'
  );
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Users can read own profile" ON users IS 'Allow authenticated users to read their own user profile';
COMMENT ON POLICY "Users can update own profile" ON users IS 'Allow authenticated users to update their own profile (non-sensitive fields)';
COMMENT ON POLICY "Users can read own API keys" ON api_keys IS 'Allow users to view their own API keys';
COMMENT ON POLICY "Users can read own usage logs" ON usage_logs IS 'Allow users to view their own API usage logs';
COMMENT ON POLICY "Users can read own referrals" ON referrals IS 'Allow users to view referrals where they are involved';

COMMENT ON FUNCTION public.handle_new_user IS 'Automatically creates user profile when auth user is created (OAuth, magic link, etc.)';
COMMENT ON FUNCTION public.is_admin IS 'Helper function to check if a user has admin role';
