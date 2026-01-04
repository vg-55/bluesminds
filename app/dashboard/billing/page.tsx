// ============================================================================
// BILLING & SUBSCRIPTION PAGE
// ============================================================================

import { createServerClient } from '@/lib/supabase/client'
import { PricingCards } from '@/components/dashboard/pricing-cards'
import { BillingPortalButton } from '@/components/dashboard/billing-portal-button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle } from 'lucide-react'

export default async function BillingPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get billing plan details
  const { data: plan } = await supabase
    .from('billing_plans')
    .select('*')
    .eq('tier', profile?.tier || 'free')
    .single()

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-white [text-shadow:_0_4px_20px_rgb(0_0_0_/_60%)] font-open-sans-custom">
          Billing & Subscription
        </h1>
        <p className="text-gray-400 [text-shadow:_0_2px_10px_rgb(0_0_0_/_50%)] font-open-sans-custom text-lg">
          Manage your subscription and billing details
        </p>
      </div>

      {/* Current Plan Card */}
      <div className="relative group bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_32px_rgba(255,255,255,0.1)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-white [text-shadow:_0_4px_20px_rgb(0_0_0_/_60%)] font-open-sans-custom capitalize">
                {profile?.tier} Plan
              </h2>
              <Badge variant="default" className="bg-green-500/20 text-green-300 border-green-400/30 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)]">
                Current Plan
              </Badge>
            </div>

            {plan && (
              <div className="mt-6 space-y-4">
                <p className="text-4xl font-bold text-white [text-shadow:_0_4px_20px_rgb(0_0_0_/_60%)] font-open-sans-custom">
                  ${plan.price_monthly}
                  <span className="text-lg font-normal text-gray-400 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)]">/month</span>
                </p>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-300 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    {plan.included_tokens.toLocaleString()} tokens/month included
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    {plan.rate_limit_rpm} requests per minute
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    {plan.rate_limit_tpm.toLocaleString()} tokens per minute
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            {profile?.tier !== 'free' && <BillingPortalButton />}
          </div>
        </div>

        {/* Subtle gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </div>

      {/* Usage This Month */}
      <div className="relative group bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_32px_rgba(255,255,255,0.1)]">
        <h3 className="text-2xl font-semibold text-white [text-shadow:_0_2px_10px_rgb(0_0_0_/_60%)] font-open-sans-custom mb-6">
          Usage This Month
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <p className="text-sm text-gray-400 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom uppercase tracking-wide">
              Tokens Used
            </p>
            <p className="text-3xl font-bold text-white mt-2 [text-shadow:_0_2px_10px_rgb(0_0_0_/_60%)] font-open-sans-custom">
              0
            </p>
            <p className="text-xs text-gray-500 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom mt-1">
              of {plan?.included_tokens.toLocaleString()} included
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <p className="text-sm text-gray-400 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom uppercase tracking-wide">
              Requests Made
            </p>
            <p className="text-3xl font-bold text-white mt-2 [text-shadow:_0_2px_10px_rgb(0_0_0_/_60%)] font-open-sans-custom">
              0
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <p className="text-sm text-gray-400 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom uppercase tracking-wide">
              Estimated Cost
            </p>
            <p className="text-3xl font-bold text-white mt-2 [text-shadow:_0_2px_10px_rgb(0_0_0_/_60%)] font-open-sans-custom">
              ${plan?.price_monthly || 0}
            </p>
          </div>
        </div>

        {/* Subtle gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </div>

      {/* Upgrade Options */}
      {profile?.tier === 'free' && (
        <div>
          <h2 className="text-3xl font-bold text-white [text-shadow:_0_4px_20px_rgb(0_0_0_/_60%)] font-open-sans-custom mb-6">
            Upgrade Your Plan
          </h2>
          <PricingCards currentTier={profile.tier} />
        </div>
      )}
    </div>
  )
}
