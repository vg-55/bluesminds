// ============================================================================
// USER SIGNUP API ROUTE
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from '@/lib/config/env'
import { userSignupSchema } from '@/lib/validations'
import { errorResponse, ValidationError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'
import { createReferral } from '@/lib/utils/create-referral'
import type { Database } from '@/lib/types/database.types'

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validated = userSignupSchema.safeParse(body)

    if (!validated.success) {
      throw new ValidationError('Invalid signup data', validated.error.errors)
    }

    const { email, password, full_name, company_name, referral_code } = validated.data

    // Get cookie store
    const cookieStore = await cookies()

    // Create Supabase client with cookie handlers
    const supabase = createServerClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    // Sign up user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
        data: {
          full_name,
          company_name,
        },
      },
    })

    if (authError) {
      logger.error('Signup auth error', authError)
      throw new Error(authError.message)
    }

    if (!authData.user) {
      throw new Error('Failed to create user')
    }

    // Check if user needs email verification
    const needsVerification = !authData.user.email_confirmed_at
    const isEmailConfirmed = !!authData.user.email_confirmed_at

    // Create user profile in our users table (only if email is confirmed or auto-confirmed)
    if (isEmailConfirmed) {
      const { error: profileError } = await supabase.from('users').insert({
        id: authData.user.id,
        email,
        full_name: full_name || null,
        company_name: company_name || null,
        tier: 'free',
        status: 'active',
      })

      if (profileError) {
        logger.error('Failed to create user profile', profileError)
        // Don't throw - auth user was created successfully
      } else {
        // Create referral record if referral code was provided
        if (referral_code) {
          const referralResult = await createReferral({
            referralCode: referral_code,
            newUserId: authData.user.id,
          })

          if (referralResult.success) {
            logger.info('Referral created during signup', {
              userId: authData.user.id,
              referrerId: referralResult.referrerId,
            })
          } else {
            logger.warn('Failed to create referral during signup', {
              userId: authData.user.id,
              error: referralResult.error,
            })
          }
        }
      }
    }

    logger.info('User signed up', {
      userId: authData.user.id,
      email,
      needsVerification,
    })

    // Return appropriate response based on verification status
    if (needsVerification) {
      return NextResponse.json(
        {
          success: true,
          message: 'Account created! Please check your email to verify your account.',
          data: {
            user: {
              id: authData.user.id,
              email: authData.user.email,
              full_name,
            },
            session: null, // No session until verified
            needs_verification: true,
            email_confirmed: false,
          },
        },
        { status: 201 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully!',
        data: {
          user: {
            id: authData.user.id,
            email: authData.user.email,
            full_name,
          },
          session: authData.session,
          needs_verification: false,
          email_confirmed: true,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Signup error', error)
    return errorResponse(error)
  }
}
