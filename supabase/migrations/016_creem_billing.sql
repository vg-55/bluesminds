-- ============================================================================
-- CREEM BILLING MIGRATION
-- ============================================================================
-- Adds:
-- 1) billing_webhook_events table for webhook idempotency
-- 2) optional metadata keys on users (stored in users.metadata JSONB)
--    - creem_customer_id
--    - creem_subscription_id
--    - creem_subscription_status
--    - creem_product_id
-- ============================================================================

-- Webhook idempotency table
CREATE TABLE IF NOT EXISTS billing_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB DEFAULT '{}'::JSONB,

  CONSTRAINT billing_webhook_events_provider_length CHECK (char_length(provider) >= 1 AND char_length(provider) <= 50),
  CONSTRAINT billing_webhook_events_event_id_length CHECK (char_length(event_id) >= 1 AND char_length(event_id) <= 255)
);

-- Ensure idempotency per provider
CREATE UNIQUE INDEX IF NOT EXISTS billing_webhook_events_provider_event_id_unique
  ON billing_webhook_events(provider, event_id);

CREATE INDEX IF NOT EXISTS billing_webhook_events_processed_at_idx
  ON billing_webhook_events(processed_at DESC);

COMMENT ON TABLE billing_webhook_events IS 'Processed webhook events for idempotency (prevents double-processing on retries)';