// ============================================================================
// BILLING CHECKOUT API ROUTE
// ============================================================================

import { NextRequest } from 'next/server'
import { createServerClient as createServerClientSSR } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase/client'
import { createCreemCheckout } from '@/lib/billing/creem'
import { errorResponse, successResponse, ValidationError, AuthenticationError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'
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

    // Get user profile
    let { data: profile } = await supabaseAdmin
      .from('users')
      .select('id,email,metadata')
      .eq('id', user.id)
      .single()

    // If profile doesn't exist, create it (edge case: authenticated but no profile)
    if (!profile) {
      logger.warn('User profile missing during checkout, creating...', { userId: user.id })

      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || null,
          company_name: user.user_metadata?.company_name || null,
          tier: 'free',
          status: 'active',
        })
        .select('id,email,metadata')
        .single()

      if (createError) {
        logger.error('Failed to create user profile during checkout', createError)
        throw new Error('User profile not found')
      }

      profile = newProfile
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
