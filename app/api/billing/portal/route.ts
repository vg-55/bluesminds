// ============================================================================
// BILLING PORTAL API ROUTE
// ============================================================================

import { NextRequest } from 'next/server'
import { createServerClient as createServerClientSSR } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase/client'
import { createCreemCustomerPortalLink } from '@/lib/billing/creem'
import { errorResponse, successResponse, AuthenticationError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'
import { env } from '@/lib/config/env'

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client from request cookies (API route compatible)
    const supabase = createServerClientSSR(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // No-op in API routes - cookies are set by middleware
          },
        },
      }
    )

    // Get current user
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
