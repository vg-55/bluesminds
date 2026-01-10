// ============================================================================
// CREEM BILLING INTEGRATION
// ============================================================================

import { Creem } from 'creem'
import { env } from '@/lib/config/env'
import { logger } from '@/lib/utils/logger'

export type BillingTier = 'starter' | 'pro' | 'enterprise'

export const CREEM_PRODUCT_IDS: Record<BillingTier, string> = {
  starter: env.CREEM_PRODUCT_STARTER || '',
  pro: env.CREEM_PRODUCT_PRO || '',
  enterprise: env.CREEM_PRODUCT_ENTERPRISE || '',
}

export function isCreemConfigured(): boolean {
  return !!(env.CREEM_API_KEY && env.CREEM_WEBHOOK_SECRET)
}

function getCreemClient() {
  if (!env.CREEM_API_KEY) throw new Error('Creem not configured')
  return new Creem({
    // Creem SDK uses x-api-key per request; we keep a client instance for retries/config.
    retryConfig: {
      strategy: 'backoff',
      backoff: {
        initialInterval: 1,
        maxInterval: 20,
        exponent: 1.5,
        maxElapsedTime: 60,
      },
      retryConnectionErrors: true,
    },
  })
}

export async function createCreemCheckout(params: {
  tier: BillingTier
  userId: string
  email: string
  successUrl: string
  cancelUrl: string
  existingCustomerId?: string
}): Promise<{ checkoutId: string; url: string; customerId?: string }> {
  const { tier, userId, email, successUrl, cancelUrl, existingCustomerId } = params

  const productId = CREEM_PRODUCT_IDS[tier]
  if (!productId) throw new Error(`Creem product ID not configured for tier: ${tier}`)

  const creem = getCreemClient()

  try {
    logger.info('Creating Creem checkout', {
      userId,
      tier,
      productId,
      email,
      hasExistingCustomerId: !!existingCustomerId,
      apiKeyPrefix: env.CREEM_API_KEY!.substring(0, 15) + '...',
    })

    const checkout = await creem.createCheckout({
      xApiKey: env.CREEM_API_KEY!,
      createCheckoutRequest: {
        productId,
        units: 1,
        customer: {
          id: existingCustomerId,
          email,
        },
        metadata: {
          userId,
          tier,
          source: 'bluesminds',
        },
        // Creem product can have default success URL, but we set explicit URLs for safety.
        // If the SDK/API doesn't support these fields, they will be ignored.
        ...(successUrl ? ({ successUrl } as any) : {}),
        ...(cancelUrl ? ({ cancelUrl } as any) : {}),
      },
    })

    // The SDK returns a CheckoutEntity; it typically includes id + url.
    const checkoutId = (checkout as any).id as string | undefined
    const url = (checkout as any).url as string | undefined
    const customerId = (checkout as any).customer?.id as string | undefined

    if (!checkoutId || !url) {
      logger.error('Creem checkout response missing id/url', undefined, { checkout })
      throw new Error('Creem checkout creation failed (missing checkout URL)')
    }

    return { checkoutId, url, customerId }
  } catch (error: any) {
    logger.error('Failed to create Creem checkout', error, {
      userId,
      tier,
      productId,
      errorMessage: error?.message,
      errorStatus: error?.status || error?.statusCode,
      errorBody: error?.body,
      apiKeyPrefix: env.CREEM_API_KEY!.substring(0, 15) + '...',
    })
    throw error
  }
}

export async function createCreemCustomerPortalLink(params: {
  customerId: string
}): Promise<{ url: string }> {
  const creem = getCreemClient()

  try {
    const res = await creem.generateCustomerLinks({
      xApiKey: env.CREEM_API_KEY!,
      createCustomerPortalLinkRequestEntity: {
        customerId: params.customerId,
      },
    })

    const url = (res as any).url as string | undefined
    if (!url) {
      logger.error('Creem customer links response missing url', undefined, { res })
      throw new Error('Creem portal link generation failed')
    }

    return { url }
  } catch (error) {
    logger.error('Failed to create Creem customer portal link', error, {
      customerId: params.customerId,
    })
    throw error
  }
}

export async function retrieveCreemSubscription(params: { subscriptionId: string }) {
  const creem = getCreemClient()
  return creem.retrieveSubscription({
    xApiKey: env.CREEM_API_KEY!,
    subscriptionId: params.subscriptionId,
  })
}