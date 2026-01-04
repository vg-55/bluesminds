// ============================================================================
// LIVENESS PROBE - Kubernetes/Container Health Check
// ============================================================================
// Returns 200 if the application is running
// Use for Kubernetes livenessProbe

import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return Response.json(
    {
      status: 'alive',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  )
}

export async function HEAD() {
  return new Response(null, { status: 200 })
}
