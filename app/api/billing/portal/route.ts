// ============================================================================
// BILLING PORTAL API ROUTE
// ============================================================================

import { NextRequest } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/supabase/client'
import { createBillingPortalSession } from '@/lib/billing/stripe'
import { errorResponse, successResponse, AuthenticationError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

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

    // Get user profile with Stripe customer ID
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('metadata')
      .eq('id', user.id)
      .single()

    const stripeCustomerId = profile?.metadata?.stripe_customer_id as string | undefined

    if (!stripeCustomerId) {
      throw new Error('No Stripe customer ID found. Please subscribe first.')
    }

    // Create billing portal session
    const portalUrl = await createBillingPortalSession(
      stripeCustomerId,
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`
    )

    logger.billing('Billing portal session created', { userId: user.id })

    return successResponse({ url: portalUrl })
  } catch (error) {
    logger.error('Billing portal error', error)
    return errorResponse(error)
  }
}
