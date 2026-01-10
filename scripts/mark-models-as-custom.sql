-- ============================================================================
-- Script: Mark Seed Models as Custom
-- ============================================================================
-- Run this in your Supabase SQL Editor to mark seed models as custom
-- so they appear in the Model Pricing Management UI

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

-- Verify the update
SELECT model_name, is_custom, provider
FROM model_pricing
WHERE is_custom = true
ORDER BY provider, model_name;
