// ============================================================================
// BILLING CHECKOUT API ROUTE
// ============================================================================

import { NextRequest } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/supabase/client'
import { createCreemCheckout } from '@/lib/billing/creem'
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

    if (!supabaseAdmin) {
      throw new Error('Server misconfigured: supabaseAdmin unavailable')
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('id,email,metadata')
      .eq('id', user.id)
      .single()

    if (!profile) {
      throw new Error('User profile not found')
    }

    const existingCreemCustomerId = (profile as any).metadata?.creem_customer_id as
      | string
      | undefined

    // Create Creem checkout session
    const { url: checkoutUrl, customerId: creemCustomerId, checkoutId } =
      await createCreemCheckout({
        tier,
        userId: user.id,
        email: (profile as any).email,
        existingCustomerId: existingCreemCustomerId,
        successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
        cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=true`,
      })

    // Persist customer id (if Creem returned one)
    if (creemCustomerId && creemCustomerId !== existingCreemCustomerId) {
      await (supabaseAdmin as any)
        .from('users')
        .update({
          metadata: {
            ...(profile as any).metadata,
            creem_customer_id: creemCustomerId,
          },
        })
        .eq('id', user.id)
    }

    logger.billing('Checkout session created', {
      provider: 'creem',
      userId: user.id,
      tier,
      checkoutId,
    })

    return successResponse({ url: checkoutUrl })
  } catch (error) {
    logger.error('Checkout error', error)
    return errorResponse(error)
  }
}
