// ============================================================================
// SECURITY CONFIGURATION
// ============================================================================

export const securityHeaders = {
  // Prevent clickjacking attacks
  'X-Frame-Options': 'DENY',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Enable XSS protection
  'X-XSS-Protection': '1; mode=block',

  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions policy
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',

  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://static.cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
  ].join('; '),
}

export const corsConfig = {
  // Allow specific origins in production, all in development
  allowedOrigins:
    process.env.NODE_ENV === 'production'
      ? (process.env.ALLOWED_ORIGINS?.split(',') || [process.env.NEXT_PUBLIC_APP_URL!])
      : ['*'],

  // Allowed HTTP methods
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  // Allowed headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-API-Key',
  ],

  // Expose these headers to the browser
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],

  // Allow credentials
  credentials: true,

  // Cache preflight requests for 24 hours
  maxAge: 86400,
}

// Rate limit headers
export function getRateLimitHeaders(
  limit: number,
  remaining: number,
  resetTime: Date
): Record<string, string> {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.floor(resetTime.getTime() / 1000).toString(),
  }
}

// Apply security headers to response
export function applySecurityHeaders(headers: Headers): Headers {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    headers.set(key, value)
  })
  return headers
}

// Apply CORS headers to response
export function applyCorsHeaders(
  headers: Headers,
  origin?: string | null
): Headers {
  const allowedOrigin =
    corsConfig.allowedOrigins.includes('*') ||
    (origin && corsConfig.allowedOrigins.includes(origin))
      ? origin || '*'
      : corsConfig.allowedOrigins[0]

  headers.set('Access-Control-Allow-Origin', allowedOrigin)
  headers.set('Access-Control-Allow-Methods', corsConfig.allowedMethods.join(', '))
  headers.set('Access-Control-Allow-Headers', corsConfig.allowedHeaders.join(', '))
  headers.set('Access-Control-Expose-Headers', corsConfig.exposedHeaders.join(', '))
  headers.set('Access-Control-Max-Age', corsConfig.maxAge.toString())

  if (corsConfig.credentials) {
    headers.set('Access-Control-Allow-Credentials', 'true')
  }

  return headers
}

// Handle CORS preflight requests
export function handleCorsPreflightRequest(origin?: string | null): Response {
  const headers = new Headers()
  applyCorsHeaders(headers, origin)
  return new Response(null, { status: 204, headers })
}
