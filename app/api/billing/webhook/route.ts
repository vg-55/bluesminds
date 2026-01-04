// ============================================================================
// STRIPE WEBHOOK HANDLER
// ============================================================================

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { verifyWebhookSignature } from '@/lib/billing/stripe'
import { logger } from '@/lib/utils/logger'
import type Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return new Response('No signature', { status: 400 })
    }

    // Verify webhook signature
    const event = verifyWebhookSignature(body, signature)

    logger.info(`Stripe webhook received: ${event.type}`)

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        logger.info(`Unhandled event type: ${event.type}`)
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    logger.error('Webhook error', error)
    return new Response('Webhook error', { status: 400 })
  }
}

// Handle subscription creation/update
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const status = subscription.status
  const priceId = subscription.items.data[0]?.price.id

  // Map price ID to tier
  const tierMap: Record<string, string> = {
    [process.env.STRIPE_PRICE_STARTER || '']: 'starter',
    [process.env.STRIPE_PRICE_PRO || '']: 'pro',
    [process.env.STRIPE_PRICE_ENTERPRISE || '']: 'enterprise',
  }

  const tier = tierMap[priceId] || 'free'

  // Find user by Stripe customer ID
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('metadata->>stripe_customer_id', customerId)
    .single()

  if (!user) {
    logger.error('User not found for Stripe customer', { customerId })
    return
  }

  // Update user tier
  await supabaseAdmin
    .from('users')
    .update({
      tier,
      metadata: {
        stripe_subscription_id: subscription.id,
        stripe_subscription_status: status,
      },
    })
    .eq('id', user.id)

  logger.billing('Subscription updated', {
    userId: user.id,
    tier,
    status,
  })
}

// Handle subscription deletion
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  // Find user
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('metadata->>stripe_customer_id', customerId)
    .single()

  if (!user) return

  // Downgrade to free tier
  await supabaseAdmin
    .from('users')
    .update({
      tier: 'free',
      metadata: {
        stripe_subscription_status: 'canceled',
      },
    })
    .eq('id', user.id)

  logger.billing('Subscription canceled', { userId: user.id })
}

// Handle successful invoice payment
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  // Find user
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('metadata->>stripe_customer_id', customerId)
    .single()

  if (!user) return

  // Record invoice in database (optional)
  // You can store invoice details in the invoices table

  logger.billing('Invoice paid', {
    userId: user.id,
    amount: invoice.amount_paid,
  })
}

// Handle failed invoice payment
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  // Find user
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('metadata->>stripe_customer_id', customerId)
    .single()

  if (!user) return

  // Send notification email (implement email service)
  // For now, just log it
  logger.warn('Invoice payment failed', {
    userId: user.id,
    email: user.email,
    amount: invoice.amount_due,
  })
}
