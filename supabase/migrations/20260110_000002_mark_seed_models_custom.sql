-- ============================================================================
-- MIGRATION: Mark Seed Model Pricing as Custom
-- ============================================================================
-- This migration marks the seed model pricing entries as custom so they
-- appear in the Model Pricing Management UI by default.
--
-- This allows admins to manage pricing for common models without needing
-- to create custom model mappings first.

UPDATE model_pricing
SET is_custom = true
WHERE model_name IN (
  'gpt-4',
  'gpt-4-turbo',
  'gpt-4o',
  'gpt-3.5-turbo',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-5-sonnet-20241022',
  'claude-3-haiku-20240307',
  'gemini-pro',
  'gemini-1.5-pro',
  'gemini-1.5-flash'
)
AND is_custom = false;

-- Note: We don't mark 'default' as custom since it's a special fallback model
