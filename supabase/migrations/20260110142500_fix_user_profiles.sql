-- ============================================================================
-- FIX EXISTING USER PROFILES
-- ============================================================================
-- This migration ensures all existing users have the required fields
-- ============================================================================

-- Update all existing user profiles to have required fields
UPDATE public.users
SET
  role = COALESCE(role, 'user'),
  credits_balance = COALESCE(credits_balance, 0),
  free_requests_balance = COALESCE(free_requests_balance, 0),
  updated_at = NOW()
WHERE role IS NULL
   OR credits_balance IS NULL
   OR free_requests_balance IS NULL;

-- Create profiles for any auth users without profiles
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
    split_part(au.email, '@', 1)
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
WHERE NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = au.id
)
ON CONFLICT (id) DO UPDATE
SET
  role = COALESCE(EXCLUDED.role, public.users.role, 'user'),
  credits_balance = COALESCE(public.users.credits_balance, 0),
  free_requests_balance = COALESCE(public.users.free_requests_balance, 0),
  updated_at = NOW();
