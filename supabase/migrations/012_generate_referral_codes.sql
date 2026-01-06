-- ============================================================================
-- GENERATE REFERRAL CODES FOR USERS
-- ============================================================================
-- This migration creates functions and triggers to automatically generate
-- unique referral codes for users
-- ============================================================================

-- ============================================================================
-- FUNCTION: Generate Unique Referral Code
-- ============================================================================
-- Generates a unique 8-character alphanumeric referral code

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude similar looking chars
  result TEXT := '';
  i INTEGER;
  code_exists BOOLEAN;
BEGIN
  LOOP
    result := '';
    -- Generate 8 character code
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;

    -- Check if code already exists
    SELECT EXISTS(
      SELECT 1 FROM users WHERE referral_code = result
    ) INTO code_exists;

    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Auto-generate referral code on user insert
-- ============================================================================

CREATE OR REPLACE FUNCTION set_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if referral_code is NULL
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS trigger_set_referral_code ON users;

-- Create trigger to auto-generate referral codes
CREATE TRIGGER trigger_set_referral_code
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION set_referral_code();

-- ============================================================================
-- BACKFILL: Generate referral codes for existing users
-- ============================================================================
-- Update all users who don't have a referral code yet

DO $$
DECLARE
  user_record RECORD;
  new_code TEXT;
BEGIN
  FOR user_record IN
    SELECT id FROM users WHERE referral_code IS NULL
  LOOP
    -- Generate unique code for each user
    new_code := generate_referral_code();

    -- Update user with new code
    UPDATE users
    SET referral_code = new_code
    WHERE id = user_record.id;

    RAISE NOTICE 'Generated referral code % for user %', new_code, user_record.id;
  END LOOP;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION generate_referral_code IS 'Generates a unique 8-character alphanumeric referral code';
COMMENT ON FUNCTION set_referral_code IS 'Trigger function to auto-generate referral codes on user creation';
COMMENT ON TRIGGER trigger_set_referral_code ON users IS 'Automatically generates referral code for new users';
