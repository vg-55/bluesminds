// ============================================================================
// STRIPE BILLING INTEGRATION
// ============================================================================

import Stripe from 'stripe'
import { env } from '@/lib/config/env'
import { logger } from '@/lib/utils/logger'

// Initialize Stripe
export const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    })
  : null

// Price IDs for each tier (set these in your Stripe dashboard)
export const STRIPE_PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER || '',
  pro: process.env.STRIPE_PRICE_PRO || '',
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE || '',
}

// Create a Stripe customer
export async function createStripeCustomer(
  email: string,
  name?: string
): Promise<string> {
  if (!stripe) throw new Error('Stripe not configured')

  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        source: 'bluesminds',
      },
    })

    return customer.id
  } catch (error) {
    logger.error('Failed to create Stripe customer', error)
    throw error
  }
}

// Create a checkout session for subscription
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  if (!stripe) throw new Error('Stripe not configured')

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    })

    return session.url || ''
  } catch (error) {
    logger.error('Failed to create checkout session', error)
    throw error
  }
}

// Create a billing portal session
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  if (!stripe) throw new Error('Stripe not configured')

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return session.url
  } catch (error) {
    logger.error('Failed to create billing portal session', error)
    throw error
  }
}

// Get subscription details
export async function getSubscription(subscriptionId: string) {
  if (!stripe) throw new Error('Stripe not configured')

  try {
    return await stripe.subscriptions.retrieve(subscriptionId)
  } catch (error) {
    logger.error('Failed to get subscription', error)
    throw error
  }
}

// Cancel subscription
export async function cancelSubscription(subscriptionId: string) {
  if (!stripe) throw new Error('Stripe not configured')

  try {
    return await stripe.subscriptions.cancel(subscriptionId)
  } catch (error) {
    logger.error('Failed to cancel subscription', error)
    throw error
  }
}

// Update subscription
export async function updateSubscription(
  subscriptionId: string,
  priceId: string
) {
  if (!stripe) throw new Error('Stripe not configured')

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    return await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: priceId,
        },
      ],
      proration_behavior: 'create_prorations',
    })
  } catch (error) {
    logger.error('Failed to update subscription', error)
    throw error
  }
}

// Verify webhook signature
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  if (!stripe) throw new Error('Stripe not configured')
  if (!env.STRIPE_WEBHOOK_SECRET) throw new Error('Webhook secret not configured')

  try {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    )
  } catch (error) {
    logger.error('Webhook signature verification failed', error)
    throw error
  }
}

// Get upcoming invoice
export async function getUpcomingInvoice(customerId: string) {
  if (!stripe) throw new Error('Stripe not configured')

  try {
    return await stripe.invoices.retrieveUpcoming({
      customer: customerId,
    })
  } catch (error) {
    // It's okay if there's no upcoming invoice
    return null
  }
}

// List customer invoices
export async function listInvoices(customerId: string, limit: number = 10) {
  if (!stripe) throw new Error('Stripe not configured')

  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit,
    })

    return invoices.data
  } catch (error) {
    logger.error('Failed to list invoices', error)
    throw error
  }
}
