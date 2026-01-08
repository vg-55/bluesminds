// ============================================================================
// DASHBOARD OVERVIEW PAGE
// ============================================================================

import { createServerClient } from '@/lib/supabase/client'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { UsageChart } from '@/components/dashboard/usage-chart'
import { RecentRequests } from '@/components/dashboard/recent-requests'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { ReferralSection } from '@/components/dashboard/referral-section'

// Revalidate every 30 seconds to show fresh data
export const revalidate = 30

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
    console.log('Dashboard stats loaded:', stats)
  } catch (error) {
    console.error('Failed to load stats:', error)
  }

  // If stats is null, provide default values
  if (!stats) {
    stats = {
      total_requests: 0,
      total_tokens: 0,
      total_cost: 0,
      error_count: 0,
      avg_response_time: 0,
      unique_models: 0,
    }
  }

  // Check if referral program is enabled
  const { data: referralSettings } = await supabase
    .from('referral_settings')
    .select('enabled')
    .limit(1)
    .single()

  const referralsEnabled = referralSettings?.enabled ?? false

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-sentient text-foreground">
          <i className="font-light">Overview</i>
        </h1>
        <p className="text-foreground/60 text-base font-mono">
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

      {/* Referral Section - Only show if enabled */}
      {referralsEnabled && (
        <div className="pt-4">
          <ReferralSection userId={user.id} />
        </div>
      )}
    </div>
  )
}
