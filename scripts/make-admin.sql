-- ============================================================================
-- MAKE USER AN ADMIN
-- ============================================================================
-- Instructions:
-- 1. First, apply the migration 005_add_user_role.sql if you haven't already
-- 2. Replace 'your-email@example.com' with your actual email address
-- 3. Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ============================================================================

-- Add the role column (if migration wasn't applied yet)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Update your user to be an admin (REPLACE THE EMAIL!)
UPDATE users
SET role = 'admin'
WHERE email = 'your-email@example.com';

-- Verify it worked
SELECT email, role, tier, status
FROM users
WHERE email = 'your-email@example.com';
