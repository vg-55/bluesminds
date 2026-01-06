// ============================================================================
// REFERRALS PAGE
// ============================================================================
// User dashboard page for managing referrals and viewing referral stats

import { createServerClient } from '@/lib/supabase/client'
import { ReferralSection } from '@/components/dashboard/referral-section'
import { redirect } from 'next/navigation'

// Revalidate every 30 seconds to show fresh data
export const revalidate = 30

export default async function ReferralsPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-sentient text-foreground">
          <i className="font-light">Referral Program</i>
        </h1>
        <p className="text-foreground/60 text-base font-mono">
          Invite friends and earn rewards for every successful referral
        </p>
      </div>

      {/* Referral Section */}
      <ReferralSection userId={user.id} />
    </div>
  )
}
