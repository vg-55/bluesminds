// ============================================================================
// ADMIN API KEYS API
// ============================================================================
// Fetch all API keys across all users for admin monitoring

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/supabase/client'
import { ensureUserProfile } from '@/lib/utils/ensure-user-profile'
import { checkAdminAccess } from '@/lib/utils/check-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Check admin access using centralized function
    await checkAdminAccess(supabase)

    // Ensure user profile exists in database (using admin client)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user && supabaseAdmin) {
      await ensureUserProfile(supabaseAdmin, user.id)
    }

    // Fetch all API keys with user information
    const { data: apiKeys, error } = await supabase
      .from('api_keys')
      .select(`
        id,
        key_prefix,
        name,
        is_active,
        created_at,
        last_used_at,
        user:user_id (
          id,
          email,
          full_name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Get usage counts for each API key
    const { data: usageCounts } = await supabase
      .from('usage_logs')
      .select('api_key_id')

    const usageByKey: Record<string, number> = {}
    usageCounts?.forEach((log) => {
      usageByKey[log.api_key_id] = (usageByKey[log.api_key_id] || 0) + 1
    })

    // Format response
    const formattedKeys =
      apiKeys?.map((key) => ({
        id: key.id,
        keyPreview: `${key.key_prefix}...`,
        name: key.name,
        user: key.user?.full_name || 'Unknown',
        email: key.user?.email || 'unknown@example.com',
        created: new Date(key.created_at).toISOString().split('T')[0],
        lastUsed: key.last_used_at
          ? formatTimeAgo(new Date(key.last_used_at))
          : 'Never',
        requests: usageByKey[key.id] || 0,
        status: key.is_active ? ('active' as const) : ('revoked' as const),
      })) || []

    return NextResponse.json({
      keys: formattedKeys,
      stats: {
        totalKeys: formattedKeys.length,
        activeKeys: formattedKeys.filter((k) => k.status === 'active').length,
        totalRequests: formattedKeys.reduce((sum, k) => sum + k.requests, 0),
        revokedKeys: formattedKeys.filter((k) => k.status === 'revoked').length,
      },
    })
  } catch (error) {
    console.error('Error fetching API keys:', error)
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    )
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
  return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`
}
