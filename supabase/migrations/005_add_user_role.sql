-- ============================================================================
-- ADD ROLE COLUMN TO USERS TABLE
-- ============================================================================
-- Adds a role column to distinguish between regular users and admins

ALTER TABLE users
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Create index for role lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Comment
COMMENT ON COLUMN users.role IS 'User role: user or admin for access control';
