// ============================================================================
// USER LOGIN API ROUTE
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from '@/lib/config/env'
import { userLoginSchema } from '@/lib/validations'
import { errorResponse, ValidationError, AuthenticationError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'
import type { Database } from '@/lib/types/database.types'

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validated = userLoginSchema.safeParse(body)

    if (!validated.success) {
      throw new ValidationError('Invalid login data', validated.error.errors)
    }

    const { email, password } = validated.data

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
            cookiesToSet.forEach(({ name, value, options }) => {
              // Ensure cookies are set with proper options for persistence
              cookieStore.set(name, value, {
                ...options,
                sameSite: 'lax',
                secure: env.NODE_ENV === 'production',
                httpOnly: true,
                path: '/',
              })
            })
          },
        },
      }
    )

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      logger.auth('Login failed', false, { email })
      throw new AuthenticationError('Invalid email or password')
    }

    if (!authData.user) {
      throw new AuthenticationError('Login failed')
    }

    // Check if email is verified
    if (!authData.user.email_confirmed_at) {
      throw new AuthenticationError(
        'Please verify your email address. Check your inbox for a verification link.'
      )
    }

    // Get user profile (use service client to ensure access)
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    // If profile doesn't exist, create it (fallback for old users or trigger failures)
    if (!profile || profileError) {
      logger.warn('User profile not found, creating...', { userId: authData.user.id })

      const { error: createError } = await supabase.from('users').insert({
        id: authData.user.id,
        email: authData.user.email!,
        full_name: authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || null,
        company_name: authData.user.user_metadata?.company_name || null,
        tier: 'free',
        status: 'active',
        role: 'user',
        credits_balance: 0,
        free_requests_balance: 0,
        referral_code: null,
        referred_by: null,
        created_at: authData.user.created_at,
        updated_at: new Date().toISOString(),
      })

      if (createError) {
        logger.error('Failed to create user profile', createError)
        // Continue anyway - they can still use the service
      }

      // Fetch the newly created profile
      const { data: newProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      // Check status
      if (newProfile?.status !== 'active') {
        throw new AuthenticationError(`Account is ${newProfile?.status || 'inactive'}`)
      }

      // Use new profile
      logger.info('User profile created on login', { userId: authData.user.id })

      return NextResponse.json({
        success: true,
        data: {
          user: {
            id: authData.user.id,
            email: authData.user.email,
            full_name: newProfile?.full_name,
            tier: newProfile?.tier,
          },
          session: authData.session,
        },
      })
    }

    // Check user status
    if (profile.status !== 'active') {
      throw new AuthenticationError(`Account is ${profile.status}`)
    }

    logger.auth('Login successful', true, {
      userId: authData.user.id,
      email,
    })

    // Return success response with user data
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          full_name: profile?.full_name,
          tier: profile?.tier,
        },
        session: authData.session,
      },
    })
  } catch (error) {
    logger.error('Login error', error)
    return errorResponse(error)
  }
}
