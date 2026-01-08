// ============================================================================
// DASHBOARD LAYOUT
// ============================================================================

import { createServerClient, supabaseAdmin } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/dashboard/nav'
import { ensureUserProfile } from '@/lib/utils/ensure-user-profile'
import { isUserAdmin } from '@/lib/utils/check-admin'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check authentication
  const supabase = await createServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Ensure user profile exists in database (creates if missing)
  if (supabaseAdmin) {
    await ensureUserProfile(supabaseAdmin, user.id)
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.status !== 'active') {
    redirect('/login')
  }

  // Check if user is admin using centralized function
  const isAdmin = await isUserAdmin(user.id)

  // Check if referral program is enabled
  const { data: referralSettings } = await supabase
    .from('referral_settings')
    .select('enabled')
    .limit(1)
    .single()

  const referralsEnabled = referralSettings?.enabled ?? false

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav
        userTier={profile.tier}
        userEmail={user.email || ''}
        isAdmin={isAdmin}
        referralsEnabled={referralsEnabled}
      />

      <div className="ml-64 flex flex-col min-h-screen">
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
