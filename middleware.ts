// ============================================================================
// MIDDLEWARE - SESSION MANAGEMENT & AUTHENTICATION & SECURITY
// ============================================================================

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { applySecurityHeaders, applyCorsHeaders } from '@/lib/config/security'
import { logger } from '@/lib/utils/logger'

export async function middleware(request: NextRequest) {
  const startTime = Date.now()
  const { pathname, search } = request.nextUrl
  const method = request.method
  const fullPath = `${pathname}${search}`

  // Log incoming request
  logger.info('Incoming request', {
    method,
    path: fullPath,
    userAgent: request.headers.get('user-agent')?.substring(0, 100),
    origin: request.headers.get('origin'),
    referer: request.headers.get('referer'),
  })
  // `/docs` should be fast and public: avoid Supabase auth/session refresh entirely.
  // (Also prevents extra middleware latency and any auth-related failures impacting docs.)
  if (request.nextUrl.pathname.startsWith('/docs')) {
    const res = NextResponse.next({ request })
    applySecurityHeaders(res.headers)
    return res
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refreshing the auth token - CRITICAL for session persistence
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Log authentication status
  if (user) {
    logger.info('Authenticated user', {
      userId: user.id,
      email: user.email,
      path: fullPath,
    })
  }

  // Protected routes - redirect to login if not authenticated
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    logger.info('Redirecting to login - unauthenticated user accessing protected route', {
      attemptedPath: fullPath,
    })
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const response = NextResponse.redirect(url)

    const duration = Date.now() - startTime
    logger.info('Response', {
      method,
      path: fullPath,
      status: 307,
      duration,
      redirectTo: '/login',
    })

    return response
  }

  // Redirect to dashboard if already authenticated and trying to access auth pages
  if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup') && user) {
    logger.info('Redirecting to dashboard - authenticated user accessing auth page', {
      userId: user.id,
      attemptedPath: fullPath,
    })
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    const response = NextResponse.redirect(url)

    const duration = Date.now() - startTime
    logger.info('Response', {
      method,
      path: fullPath,
      status: 307,
      duration,
      redirectTo: '/dashboard',
    })

    return response
  }

  // Apply security headers to all responses
  const headers = supabaseResponse.headers
  applySecurityHeaders(headers)

  // Apply CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin')
    applyCorsHeaders(headers, origin)
  }

  // Log response
  const duration = Date.now() - startTime
  logger.info('Response', {
    method,
    path: fullPath,
    status: supabaseResponse.status,
    duration,
    authenticated: !!user,
  })

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - docs (public; avoid Supabase auth in middleware)
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.png|docs(?:/.*)?$|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
