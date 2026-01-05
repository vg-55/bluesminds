-- ============================================================================
-- CUSTOM MODEL MAPPINGS
-- ============================================================================
-- Allows admins to create custom model names that map to provider/model combinations

CREATE TABLE IF NOT EXISTS custom_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Custom model name (what users will use in API calls)
  custom_name TEXT UNIQUE NOT NULL,

  -- Provider reference
  provider_id UUID REFERENCES litellm_servers(id) ON DELETE CASCADE,

  -- Actual model name on the provider
  actual_model_name TEXT NOT NULL,

  -- Display information
  display_name TEXT,
  description TEXT,

  -- Status and configuration
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT custom_models_name_length CHECK (char_length(custom_name) >= 1 AND char_length(custom_name) <= 255),
  CONSTRAINT custom_models_actual_name_length CHECK (char_length(actual_model_name) >= 1 AND char_length(actual_model_name) <= 255)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_custom_models_custom_name ON custom_models(custom_name);
CREATE INDEX IF NOT EXISTS idx_custom_models_provider_id ON custom_models(provider_id);
CREATE INDEX IF NOT EXISTS idx_custom_models_is_active ON custom_models(is_active);

-- Comments
COMMENT ON TABLE custom_models IS 'Custom model mappings for the AI gateway';
COMMENT ON COLUMN custom_models.custom_name IS 'Custom name users will use in API calls (e.g., "my-gpt4")';
COMMENT ON COLUMN custom_models.actual_model_name IS 'Real model name on the provider (e.g., "gpt-4-turbo")';
COMMENT ON COLUMN custom_models.display_name IS 'Human-readable display name';
