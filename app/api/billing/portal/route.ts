// ============================================================================
// BILLING PORTAL API ROUTE
// ============================================================================

import { NextRequest } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/supabase/client'
import { createCreemCustomerPortalLink } from '@/lib/billing/creem'
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

    if (!supabaseAdmin) {
      throw new Error('Server misconfigured: supabaseAdmin unavailable')
    }

    // Get user profile with Creem customer ID
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('metadata')
      .eq('id', user.id)
      .single()

    const creemCustomerId = (profile as any)?.metadata?.creem_customer_id as string | undefined

    if (!creemCustomerId) {
      throw new Error('No billing customer found. Please subscribe first.')
    }

    // Create customer portal link (Creem)
    const { url: portalUrl } = await createCreemCustomerPortalLink({
      customerId: creemCustomerId,
    })

    logger.billing('Billing portal session created', { provider: 'creem', userId: user.id })

    return successResponse({ url: portalUrl })
  } catch (error) {
    logger.error('Billing portal error', error)
    return errorResponse(error)
  }
}
