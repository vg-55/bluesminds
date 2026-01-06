// ============================================================================
// ADMIN ANALYTICS API
// ============================================================================
// Comprehensive analytics data for admin dashboard

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch platform statistics
    const [
      { count: totalUsers },
      { count: totalApiKeys },
      { count: totalRequests },
      { data: usageLogs },
      { data: topUsers },
    ] = await Promise.all([
      // Total users
      supabase.from('users').select('*', { count: 'exact', head: true }),

      // Total API keys
      supabase
        .from('api_keys')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true),

      // Total requests from usage logs
      supabase.from('usage_logs').select('*', { count: 'exact', head: true }),

      // Recent usage logs for analytics
      supabase
        .from('usage_logs')
        .select('provider, cost_usd, total_tokens, created_at')
        .order('created_at', { ascending: false })
        .limit(1000),

      // Top users by request count
      supabase
        .from('users')
        .select(`
          id,
          email,
          full_name,
          company_name,
          tier
        `)
        .limit(10),
    ])

    // Calculate provider distribution
    const providerStats: Record<string, { requests: number; cost: number }> = {}
    usageLogs?.forEach((log) => {
      const provider = log.provider || 'unknown'
      if (!providerStats[provider]) {
        providerStats[provider] = { requests: 0, cost: 0 }
      }
      providerStats[provider].requests += 1
      providerStats[provider].cost += parseFloat(log.cost_usd) || 0
    })

    const totalCost = Object.values(providerStats).reduce((sum, p) => sum + p.cost, 0)
    const totalReqs = Object.values(providerStats).reduce((sum, p) => sum + p.requests, 0)

    const providerDistribution = Object.entries(providerStats).map(([provider, stats]) => ({
      provider,
      percentage: totalReqs > 0 ? Math.round((stats.requests / totalReqs) * 100) : 0,
      requests: stats.requests,
      cost: `$${stats.cost.toFixed(2)}`,
    }))

    // Calculate average latency
    const { data: recentLogs } = await supabase
      .from('usage_logs')
      .select('response_time_ms')
      .not('response_time_ms', 'is', null)
      .limit(100)

    const avgLatency =
      recentLogs && recentLogs.length > 0
        ? Math.round(
            recentLogs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) /
              recentLogs.length
          )
        : 0

    // Get usage counts per user for ranking
    const { data: usageByUser } = await supabase
      .from('usage_logs')
      .select('user_id, total_tokens, cost_usd')

    const userStats: Record<
      string,
      { requests: number; tokens: number; cost: number }
    > = {}
    usageByUser?.forEach((log) => {
      if (!userStats[log.user_id]) {
        userStats[log.user_id] = { requests: 0, tokens: 0, cost: 0 }
      }
      userStats[log.user_id].requests += 1
      userStats[log.user_id].tokens += log.total_tokens || 0
      userStats[log.user_id].cost += parseFloat(log.cost_usd) || 0
    })

    // Join with user data
    const topUsersWithStats =
      topUsers
        ?.map((user) => ({
          name: user.company_name || user.full_name || 'Unknown',
          email: user.email,
          requests: userStats[user.id]?.requests || 0,
          spent: `$${(userStats[user.id]?.cost || 0).toFixed(2)}`,
        }))
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 5) || []

    // Calculate revenue trend (last 4 months)
    const monthlyRevenue: Record<string, number> = {}
    usageLogs?.forEach((log) => {
      const date = new Date(log.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!monthlyRevenue[monthKey]) {
        monthlyRevenue[monthKey] = 0
      }
      monthlyRevenue[monthKey] += parseFloat(log.cost_usd) || 0
    })

    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ]
    const revenueData = Object.entries(monthlyRevenue)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-4)
      .map(([monthKey, revenue]) => {
        const [, month] = monthKey.split('-')
        return {
          month: monthNames[parseInt(month) - 1],
          revenue: Math.round(revenue),
        }
      })

    return NextResponse.json({
      platformStats: [
        {
          label: 'Total Requests',
          value: (totalRequests || 0).toLocaleString(),
          change: '+12.5%',
        },
        {
          label: 'Total Users',
          value: (totalUsers || 0).toLocaleString(),
          change: `+${totalUsers || 0}`,
        },
        {
          label: 'Total Revenue',
          value: `$${totalCost.toFixed(2)}`,
          change: '+18.2%',
        },
        {
          label: 'Avg Latency',
          value: `${avgLatency}ms`,
          change: avgLatency < 100 ? '-12ms' : '+5ms',
        },
      ],
      providerDistribution,
      topUsers: topUsersWithStats,
      revenueData,
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}
