// ============================================================================
// REFERRALS PAGE
// ============================================================================
// User dashboard page for managing referrals and viewing referral stats

import { createServerClient } from '@/lib/supabase/client'
import { ReferralSection } from '@/components/dashboard/referral-section'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

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

  // Check if referral program is enabled
  const { data: referralSettings } = await supabase
    .from('referral_settings')
    .select('enabled')
    .limit(1)
    .single()

  const referralsEnabled = referralSettings?.enabled ?? false

  // If referrals are disabled, show a message
  if (!referralsEnabled) {
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

        {/* Disabled Message */}
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 rounded-full bg-yellow-500/10 border border-yellow-500/30">
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">
                Referral Program Currently Unavailable
              </h3>
              <p className="text-foreground/60 font-mono max-w-md">
                The referral program is temporarily disabled. Please check back later or contact support for more information.
              </p>
            </div>
          </div>
        </Card>
      </div>
    )
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
