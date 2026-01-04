// ============================================================================
// DASHBOARD OVERVIEW PAGE
// ============================================================================

import { createServerClient } from '@/lib/supabase/client'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { UsageChart } from '@/components/dashboard/usage-chart'
import { RecentRequests } from '@/components/dashboard/recent-requests'
import { QuickActions } from '@/components/dashboard/quick-actions'

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get user's stats directly (no need to call API from Server Component)
  let stats = null
  try {
    const { getUserUsageStats } = await import('@/lib/gateway/usage-tracker')
    stats = await getUserUsageStats(user.id)
  } catch (error) {
    console.error('Failed to load stats:', error)
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-white dark:text-white text-slate-900 font-open-sans-custom">
          Overview
        </h1>
        <p className="text-gray-400 dark:text-gray-400 text-slate-600 font-open-sans-custom text-lg">
          Monitor your API usage and performance metrics
        </p>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Stats Cards */}
      <StatsCards userId={user.id} stats={stats} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UsageChart userId={user.id} />
        <RecentRequests userId={user.id} />
      </div>
    </div>
  )
}
