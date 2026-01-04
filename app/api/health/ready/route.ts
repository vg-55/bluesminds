// ============================================================================
// READINESS PROBE - Kubernetes/Container Health Check
// ============================================================================
// Returns 200 if the application is ready to serve traffic
// Use for Kubernetes readinessProbe

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return Response.json(
        {
          status: 'not_ready',
          reason: 'Supabase admin client not available',
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      )
    }

    // Check if we can connect to the database
    const { error } = await supabaseAdmin.from('users').select('id').limit(1)

    if (error) {
      return Response.json(
        {
          status: 'not_ready',
          reason: 'Database connection failed',
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      )
    }

    return Response.json(
      {
        status: 'ready',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    return Response.json(
      {
        status: 'not_ready',
        reason: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}

export async function HEAD() {
  try {
    if (!supabaseAdmin) {
      return new Response(null, { status: 503 })
    }

    const { error } = await supabaseAdmin.from('users').select('id').limit(1)

    if (error) {
      return new Response(null, { status: 503 })
    }

    return new Response(null, { status: 200 })
  } catch (error) {
    return new Response(null, { status: 503 })
  }
}
