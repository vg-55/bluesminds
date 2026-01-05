// ============================================================================
// ROOT HEALTH CHECK ENDPOINT
// ============================================================================
// Simple health check at /health (redirects to /api/health for detailed info)

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Simple health check that returns OK if the server is running
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    { status: 200 }
  )
}

// HEAD request for simple liveness check
export async function HEAD() {
  return new Response(null, { status: 200 })
}
