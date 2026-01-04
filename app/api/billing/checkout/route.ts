// ============================================================================
// BILLING CHECKOUT API ROUTE
// ============================================================================

import { NextRequest } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/supabase/client'
import { createStripeCustomer, createCheckoutSession, STRIPE_PRICE_IDS } from '@/lib/billing/stripe'
import { errorResponse, successResponse, ValidationError, AuthenticationError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'

const checkoutSchema = z.object({
  tier: z.enum(['starter', 'pro', 'enterprise']),
})

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new AuthenticationError('Not authenticated')
    }

    // Parse request
    const body = await request.json()
    const validated = checkoutSchema.safeParse(body)

    if (!validated.success) {
      throw new ValidationError('Invalid request', validated.error.errors)
    }

    const { tier } = validated.data

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      throw new Error('User profile not found')
    }

    // Create or get Stripe customer
    let stripeCustomerId = profile.metadata?.stripe_customer_id as string | undefined

    if (!stripeCustomerId) {
      stripeCustomerId = await createStripeCustomer(
        profile.email,
        profile.full_name || undefined
      )

      // Save Stripe customer ID
      await supabaseAdmin
        .from('users')
        .update({
          metadata: {
            ...profile.metadata,
            stripe_customer_id: stripeCustomerId,
          },
        })
        .eq('id', user.id)
    }

    // Get price ID for tier
    const priceId = STRIPE_PRICE_IDS[tier]
    if (!priceId) {
      throw new Error(`Price ID not configured for tier: ${tier}`)
    }

    // Create checkout session
    const checkoutUrl = await createCheckoutSession(
      stripeCustomerId,
      priceId,
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=true`
    )

    logger.billing('Checkout session created', {
      userId: user.id,
      tier,
    })

    return successResponse({ url: checkoutUrl })
  } catch (error) {
    logger.error('Checkout error', error)
    return errorResponse(error)
  }
}
