-- ============================================================================
-- MULTI-PROVIDER MODEL MAPPINGS
-- ============================================================================
-- Allows the same custom model name to map to multiple providers for load balancing and failover

-- 1. Remove unique constraint on custom_name to allow multiple providers per model
ALTER TABLE custom_models DROP CONSTRAINT IF EXISTS custom_models_custom_name_key;

-- 2. Add priority and weight for provider-level load balancing
ALTER TABLE custom_models
  ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS weight DECIMAL(3,2) DEFAULT 1.0;

-- 3. Add constraint to ensure unique combination of custom_name + provider_id
-- This prevents duplicate mappings of the same model to the same provider
ALTER TABLE custom_models
  ADD CONSTRAINT custom_models_name_provider_unique UNIQUE (custom_name, provider_id);

-- 4. Add constraints for priority and weight
ALTER TABLE custom_models
  ADD CONSTRAINT custom_models_priority_range CHECK (priority >= 1 AND priority <= 1000),
  ADD CONSTRAINT custom_models_weight_range CHECK (weight > 0 AND weight <= 10.0);

-- 5. Create index for efficient querying by custom_name with priority ordering
DROP INDEX IF EXISTS idx_custom_models_custom_name;
CREATE INDEX idx_custom_models_custom_name_priority ON custom_models(custom_name, priority, is_active);

-- 6. Add comments
COMMENT ON COLUMN custom_models.priority IS 'Load balancing priority (lower = higher priority, 1-1000)';
COMMENT ON COLUMN custom_models.weight IS 'Load balancing weight (higher = more traffic, 0.1-10.0)';
COMMENT ON CONSTRAINT custom_models_name_provider_unique ON custom_models IS 'Ensures a custom model name can only be mapped to a provider once';

-- Example usage:
-- To map "gpt-4" to multiple providers with different priorities:
-- INSERT INTO custom_models (custom_name, provider_id, actual_model_name, priority, weight) VALUES
--   ('gpt-4', 'provider-1-id', 'gpt-4-turbo', 1, 1.0),  -- Primary provider
--   ('gpt-4', 'provider-2-id', 'gpt-4-turbo', 2, 1.0),  -- Backup provider
--   ('gpt-4', 'provider-3-id', 'gpt-4-turbo', 2, 0.5);  -- Backup with lower weight
