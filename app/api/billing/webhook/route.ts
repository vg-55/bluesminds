/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// CREEM WEBHOOK HANDLER
// ============================================================================

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { parseCreemWebhookEvent, verifyCreemWebhookSignature } from '@/lib/billing/creem-webhook'
import { markWebhookEventProcessed } from '@/lib/billing/webhook-idempotency'

type Tier = 'free' | 'starter' | 'pro' | 'enterprise'

function mapCreemProductToTier(productId?: string): Tier {
  const starter = process.env.CREEM_PRODUCT_STARTER
  const pro = process.env.CREEM_PRODUCT_PRO
  const enterprise = process.env.CREEM_PRODUCT_ENTERPRISE

  if (productId && starter && productId === starter) return 'starter'
  if (productId && pro && productId === pro) return 'pro'
  if (productId && enterprise && productId === enterprise) return 'enterprise'
  return 'free'
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()

    const sig = verifyCreemWebhookSignature({ rawBody, headers: request.headers })
    if (!sig.ok) {
      logger.warn('Creem webhook signature verification failed', { reason: sig.reason })
      return new Response('Invalid signature', { status: 400 })
    }

    const event = parseCreemWebhookEvent(rawBody)
    logger.info(`Creem webhook received: ${event.type}`, { eventId: event.id })

    // Idempotency: if no event id, we still process (but log).
    if (event.id) {
      const { alreadyProcessed } = await markWebhookEventProcessed({
        provider: 'creem',
        eventId: event.id,
        payload: event,
      })
      if (alreadyProcessed) {
        return new Response('OK', { status: 200 })
      }
    } else {
      logger.warn('Creem webhook missing event id; cannot enforce idempotency', { type: event.type })
    }

    if (!supabaseAdmin) throw new Error('Server misconfigured: supabaseAdmin unavailable')

    // Handle event types (best-effort; keep safe failure modes)
    switch (event.type) {
      // Subscription lifecycle
      case 'subscription.created':
      case 'subscription.updated':
        await handleSubscriptionUpsert(event)
        break
      case 'subscription.canceled':
      case 'subscription.deleted':
        await handleSubscriptionCanceled(event)
        break

      // Checkout completion can also carry subscription/customer info
      case 'checkout.completed':
        await handleCheckoutCompleted(event)
        break

      default:
        logger.info(`Unhandled Creem event type: ${event.type}`)
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    logger.error('Creem webhook error', error as any)
    // Return 400 so provider retries only if they treat non-2xx as retryable.
    return new Response('Webhook error', { status: 400 })
  }
}

async function handleCheckoutCompleted(event: { id?: string; type: string; data?: any }) {
  const data = event.data || {}
  const customerId = data.customer?.id || data.customerId
  const subscriptionId = data.subscription?.id || data.subscriptionId
  const productId = data.product?.id || data.productId
  const status = data.subscription?.status || data.status

  const userId = data.metadata?.userId || data.metadata?.user_id
  if (!userId) {
    logger.warn('checkout.completed missing metadata.userId; skipping', { eventId: event.id })
    return
  }

  const tier = mapCreemProductToTier(productId)

  // Production schema may not have `users.metadata`; only update known columns.
  await (supabaseAdmin as any)
    .from('users')
    .update({
      tier,
    })
    .eq('id', userId)

  if (customerId || subscriptionId || productId || status) {
    logger.warn('Creem identifiers not persisted (users.metadata not available)', {
      userId,
      customerId,
      subscriptionId,
      productId,
      status,
    })
  }

  logger.billing('Checkout completed', {
    provider: 'creem',
    userId,
    tier,
    subscriptionId,
    customerId,
  })
}

async function handleSubscriptionUpsert(event: { id?: string; type: string; data?: any }) {
  const data = event.data || {}
  const subscriptionId = data.id || data.subscriptionId
  const customerId = data.customer?.id || data.customerId
  const productId = data.product?.id || data.productId
  const status = data.status

  const tier = mapCreemProductToTier(productId)

  // Prefer mapping by customer id; fallback to metadata userId if present.
  let userId: string | undefined

  // Production schema may not have `users.metadata`; cannot map by stored customer id.
  if (customerId) {
    logger.warn('Cannot map Creem customerId to user via users.metadata (column not available)', {
      customerId,
      eventId: event.id,
    })
  }

  if (!userId) {
    userId = data.metadata?.userId || data.metadata?.user_id
  }

  if (!userId) {
    logger.warn('Subscription event could not be mapped to a user', {
      eventId: event.id,
      customerId,
      subscriptionId,
    })
    return
  }

  // Production schema may not have `users.metadata`; only update known columns.
  await (supabaseAdmin as any)
    .from('users')
    .update({
      tier,
    })
    .eq('id', userId)

  if (customerId || subscriptionId || productId || status) {
    logger.warn('Creem identifiers not persisted (users.metadata not available)', {
      userId,
      customerId,
      subscriptionId,
      productId,
      status,
    })
  }

  logger.billing('Subscription updated', {
    provider: 'creem',
    userId,
    tier,
    status,
    subscriptionId,
  })
}

async function handleSubscriptionCanceled(event: { id?: string; type: string; data?: any }) {
  const data = event.data || {}
  const customerId = data.customer?.id || data.customerId
  const subscriptionId = data.id || data.subscriptionId
  const status = data.status || 'canceled'

  if (!customerId) {
    logger.warn('Subscription canceled event missing customerId', { eventId: event.id, subscriptionId })
    return
  }

  // Production schema may not have `users.metadata`; cannot map by stored customer id.
  logger.warn('Cannot process subscription cancel by customerId (users.metadata not available)', {
    eventId: event.id,
    customerId,
    subscriptionId,
  })
  return

  // Note: without `users.metadata`, we cannot reliably map cancel events to a user record.
  // Intentionally no-op beyond logging above.
}
