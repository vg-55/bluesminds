// ============================================================================
// WEBHOOK IDEMPOTENCY HELPERS
// ============================================================================

import { supabaseAdmin } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'

/**
 * Minimal idempotency store for webhooks.
 *
 * We store processed event IDs in a dedicated table. This prevents double-applying
 * subscription changes when providers retry webhooks.
 *
 * Table: billing_webhook_events
 * Columns: provider TEXT, event_id TEXT, processed_at TIMESTAMPTZ, payload JSONB
 * Unique(provider, event_id)
 */
export async function markWebhookEventProcessed(params: {
  provider: 'creem'
  eventId: string
  payload: unknown
}): Promise<{ alreadyProcessed: boolean }> {
  if (!supabaseAdmin) throw new Error('Server misconfigured: supabaseAdmin unavailable')

  const { provider, eventId, payload } = params

  // Insert with unique constraint; if conflict, treat as already processed.
  const { error } = await (supabaseAdmin as any)
    .from('billing_webhook_events')
    .insert({
      provider,
      event_id: eventId,
      processed_at: new Date().toISOString(),
      payload,
    })

  if (!error) return { alreadyProcessed: false }

  // PostgREST unique violation code is typically 23505 surfaced in message.
  const msg = (error as any)?.message || ''
  if (msg.includes('duplicate') || msg.includes('23505')) {
    return { alreadyProcessed: true }
  }

  logger.error('Failed to mark webhook event processed', error as any, { provider, eventId })
  throw error as any
}