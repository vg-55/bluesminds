// ============================================================================
// BILLING CHECKOUT API ROUTE
// ============================================================================

import { NextRequest } from 'next/server'
import { createServerClient as createServerClientSSR } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase/client'
import { createCreemCheckout } from '@/lib/billing/creem'
import { errorResponse, successResponse, ValidationError, AuthenticationError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'
import { ensureUserProfile } from '@/lib/utils/ensure-user-profile'
import { z } from 'zod'
import { env } from '@/lib/config/env'

const checkoutSchema = z.object({
  tier: z.enum(['starter', 'pro', 'enterprise']),
})

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
      logger.error('Checkout authentication failed', {
        authError: authError?.message,
        hasUser: !!user,
        cookieCount: request.cookies.getAll().length,
        cookies: request.cookies.getAll().map(c => c.name)
      })
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

    // Ensure user profile exists (edge case: authenticated but no profile)
    const ensured = await ensureUserProfile(supabaseAdmin, user.id)
    if (!ensured) {
      logger.error('Checkout failed: could not ensure user profile exists', { userId: user.id })
      throw new Error('Failed to ensure user profile')
    }

    // Get user profile (after ensure)
    // NOTE: Production schema may not have `users.metadata`, so do not select it.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id,email')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      logger.error('Checkout failed: could not load user profile after ensure', {
        userId: user.id,
        profileError: profileError?.message,
      })
      throw new Error('Failed to load user profile')
    }

    // Backward-compatible: if `users.metadata` doesn't exist, we cannot read a stored customer id.
    const existingCreemCustomerId: string | undefined = undefined

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

    // Backward-compatible: do not persist to `users.metadata` (column may not exist in production).
    if (creemCustomerId) {
      logger.warn('Creem customer id not persisted (users.metadata not available)', {
        userId: user.id,
        creemCustomerId,
      })
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
