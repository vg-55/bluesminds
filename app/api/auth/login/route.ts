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

    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    // Check user status
    if (profile?.status !== 'active') {
      throw new AuthenticationError(`Account is ${profile?.status || 'inactive'}`)
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
