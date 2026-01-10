// ============================================================================
// MIDDLEWARE - SESSION MANAGEMENT & AUTHENTICATION & SECURITY
// ============================================================================

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { applySecurityHeaders, applyCorsHeaders } from '@/lib/config/security'

export async function middleware(request: NextRequest) {
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

  // Protected routes - redirect to login if not authenticated
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect to dashboard if already authenticated and trying to access auth pages
  if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup') && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Apply security headers to all responses
  const headers = supabaseResponse.headers
  applySecurityHeaders(headers)

  // Apply CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin')
    applyCorsHeaders(headers, origin)
  }

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
