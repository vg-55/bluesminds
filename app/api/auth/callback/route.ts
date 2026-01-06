// ============================================================================
// OAUTH CALLBACK API ROUTE
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from '@/lib/config/env'
import { logger } from '@/lib/utils/logger'
import type { Database } from '@/lib/types/database.types'

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next') ?? '/dashboard'

    if (code) {
      const cookieStore = await cookies()

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

      const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code)

      if (authError) {
        logger.error('OAuth callback error', authError)
        return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin))
      }

      if (authData.user) {
        // Check if email is verified
        const isEmailVerified = !!authData.user.email_confirmed_at

        if (!isEmailVerified) {
          logger.warn('User email not verified', { userId: authData.user.id })
          return NextResponse.redirect(
            new URL('/login?error=email_not_verified&message=Please verify your email first', requestUrl.origin)
          )
        }

        // Check if user profile exists
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .single()

        // If profile doesn't exist, create it (for OAuth or newly verified email users)
        if (!profile) {
          logger.info('Creating user profile for verified user', {
            userId: authData.user.id,
            isOAuth: !!authData.user.app_metadata?.provider
          })

          const { error: createError } = await supabase.from('users').insert({
            id: authData.user.id,
            email: authData.user.email!,
            full_name: authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || null,
            company_name: authData.user.user_metadata?.company_name || null,
            tier: 'free',
            status: 'active',
          })

          if (createError) {
            logger.error('Failed to create user profile', createError)
            // Continue anyway - they can still use the service
          }
        }

        logger.auth('Authentication successful', true, {
          userId: authData.user.id,
          email: authData.user.email,
          type: authData.user.app_metadata?.provider ? 'oauth' : 'email_verification',
        })
      }

      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }

    // No code present, redirect to login
    return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin))
  } catch (error) {
    logger.error('OAuth callback error', error)
    return NextResponse.redirect(new URL('/login?error=server_error', request.url))
  }
}
