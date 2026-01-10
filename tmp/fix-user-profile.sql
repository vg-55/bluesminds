-- ============================================================================
-- FIX USER PROFILE - Emergency script to create/update user profile
-- ============================================================================
-- This script ensures the user profile has all required fields
-- User ID from your session: 3122993e-0a65-47e7-8378-ecf7fa0a306c
-- ============================================================================

-- First, let's see if the user exists in auth.users
SELECT
  id,
  email,
  created_at,
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data->>'name' as name
FROM auth.users
WHERE id = '3122993e-0a65-47e7-8378-ecf7fa0a306c';

-- Check if profile exists in public.users
SELECT * FROM public.users WHERE id = '3122993e-0a65-47e7-8378-ecf7fa0a306c';

-- Create or update the user profile with all required fields
INSERT INTO public.users (
  id,
  email,
  full_name,
  company_name,
  tier,
  status,
  role,
  credits_balance,
  free_requests_balance,
  referral_code,
  referred_by,
  created_at,
  updated_at
)
SELECT
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    'User'
  ),
  au.raw_user_meta_data->>'company_name',
  'free',
  'active',
  'user',
  0,
  0,
  NULL,
  NULL,
  au.created_at,
  NOW()
FROM auth.users au
WHERE au.id = '3122993e-0a65-47e7-8378-ecf7fa0a306c'
ON CONFLICT (id) DO UPDATE
SET
  role = COALESCE(EXCLUDED.role, public.users.role, 'user'),
  credits_balance = COALESCE(public.users.credits_balance, 0),
  free_requests_balance = COALESCE(public.users.free_requests_balance, 0),
  referral_code = public.users.referral_code,
  referred_by = public.users.referred_by,
  updated_at = NOW();

-- Verify the fix
SELECT
  id,
  email,
  full_name,
  tier,
  status,
  role,
  credits_balance,
  free_requests_balance,
  created_at
FROM public.users
WHERE id = '3122993e-0a65-47e7-8378-ecf7fa0a306c';
