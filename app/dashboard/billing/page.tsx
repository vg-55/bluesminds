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

  // Get current month usage
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

  const { data: usageLogs } = await supabase
    .from('usage_logs')
    .select('total_tokens, cost_usd')
    .eq('user_id', user.id)
    .gte('created_at', startOfMonth)
    .lte('created_at', endOfMonth)

  const currentUsage = {
    requests: usageLogs?.length || 0,
    tokens: usageLogs?.reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0,
    cost: usageLogs?.reduce((sum, log) => sum + (Number(log.cost_usd) || 0), 0) || 0,
  }

  return (
    <div className="ml-64 p-8 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">
          Billing & Subscription
        </h1>
        <p className="text-foreground/60 text-lg">
          Manage your subscription and billing details
        </p>
      </div>

      {/* Current Plan Card */}
      <Card className="p-8 hover:-translate-y-1 hover:shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-foreground capitalize">
                {profile?.tier} Plan
              </h2>
              <Badge variant="default" className="bg-accent/20 text-accent border-accent/30">
                Current Plan
              </Badge>
            </div>

            {plan && (
              <div className="mt-6 space-y-4">
                <p className="text-4xl font-bold text-foreground">
                  ${plan.price_monthly}
                  <span className="text-lg font-normal text-foreground/60">/month</span>
                </p>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-foreground/70">
                    <CheckCircle className="w-5 h-5 text-accent" />
                    {(plan.included_requests || plan.included_tokens).toLocaleString()} requests/month included
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground/70">
                    <CheckCircle className="w-5 h-5 text-accent" />
                    {plan.rate_limit_rpm} requests per minute
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            {profile?.tier !== 'free' && <BillingPortalButton />}
          </div>
        </div>
      </Card>

      {/* Usage This Month */}
      <Card className="p-8">
        <h3 className="text-2xl font-semibold text-foreground mb-6">
          Usage This Month
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-foreground/[0.02] backdrop-blur-md border border-foreground/10 rounded-xl p-6 hover:border-foreground/20 transition-all duration-300">
            <p className="text-sm text-foreground/60 uppercase tracking-wide">
              Requests Made
            </p>
            <p className="text-3xl font-bold text-foreground mt-2">
              {currentUsage.requests.toLocaleString()}
            </p>
            <p className="text-xs text-foreground/50 mt-1">
              of {(plan?.included_requests || plan?.included_tokens || 0).toLocaleString()} included
            </p>
          </div>

          <div className="bg-foreground/[0.02] backdrop-blur-md border border-foreground/10 rounded-xl p-6 hover:border-foreground/20 transition-all duration-300">
            <p className="text-sm text-foreground/60 uppercase tracking-wide">
              Tokens Used (Analytics)
            </p>
            <p className="text-3xl font-bold text-foreground mt-2">
              {currentUsage.tokens.toLocaleString()}
            </p>
            <p className="text-xs text-foreground/50 mt-1">
              For reference only
            </p>
          </div>

          <div className="bg-foreground/[0.02] backdrop-blur-md border border-foreground/10 rounded-xl p-6 hover:border-foreground/20 transition-all duration-300">
            <p className="text-sm text-foreground/60 uppercase tracking-wide">
              Estimated Cost
            </p>
            <p className="text-3xl font-bold text-foreground mt-2">
              ${(plan?.price_monthly || 0) + currentUsage.cost > 0 ? ((plan?.price_monthly || 0) + currentUsage.cost).toFixed(2) : (plan?.price_monthly || 0).toFixed(2)}
            </p>
          </div>
        </div>
      </Card>

      {/* Upgrade Options */}
      {profile?.tier === 'free' && (
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-6">
            Upgrade Your Plan
          </h2>
          <PricingCards currentTier={profile.tier} />
        </div>
      )}
    </div>
  )
}
