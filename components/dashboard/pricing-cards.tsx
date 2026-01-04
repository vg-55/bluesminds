// ============================================================================
// PRICING CARDS COMPONENT
// ============================================================================

'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'

const plans = [
  {
    tier: 'starter',
    name: 'Starter',
    price: 29,
    features: [
      '500K tokens/month',
      '60 requests/minute',
      '5 API keys',
      'Email support',
      '30-day analytics',
    ],
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: 99,
    features: [
      '2M tokens/month',
      '200 requests/minute',
      '20 API keys',
      'Priority support',
      '90-day analytics',
      'Custom rate limits',
      'Webhook notifications',
    ],
    popular: true,
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    price: 499,
    features: [
      '10M tokens/month',
      '1000 requests/minute',
      '100 API keys',
      '24/7 support',
      '365-day analytics',
      'Custom rate limits',
      'Webhooks & SLA',
      'Dedicated server',
      'Custom contract',
    ],
  },
]

export function PricingCards({ currentTier }: { currentTier: string }) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleSubscribe = async (tier: string) => {
    setLoading(tier)
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })

      if (response.ok) {
        const result = await response.json()
        window.location.href = result.data.url
      }
    } catch (error) {
      console.error('Checkout error', error)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {plans.map((plan) => (
        <div
          key={plan.tier}
          className={`relative group bg-white/5 backdrop-blur-xl border rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_32px_rgba(255,255,255,0.1)] ${
            plan.popular
              ? 'border-blue-400/50 shadow-[0_8px_32px_rgba(59,130,246,0.3)]'
              : 'border-white/10'
          }`}
        >
          {plan.popular && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-1.5 rounded-full text-xs font-semibold shadow-[0_4px_16px_rgba(59,130,246,0.4)] font-open-sans-custom">
                Most Popular
              </span>
            </div>
          )}

          <div>
            <h3 className="text-2xl font-bold text-white [text-shadow:_0_2px_10px_rgb(0_0_0_/_60%)] font-open-sans-custom">
              {plan.name}
            </h3>
            <div className="mt-6">
              <span className="text-5xl font-bold text-white [text-shadow:_0_4px_20px_rgb(0_0_0_/_60%)] font-open-sans-custom">
                ${plan.price}
              </span>
              <span className="text-gray-400 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom">/month</span>
            </div>
          </div>

          <ul className="mt-8 space-y-4">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-300 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] font-open-sans-custom">
                  {feature}
                </span>
              </li>
            ))}
          </ul>

          <Button
            className={`w-full mt-8 font-semibold font-open-sans-custom transition-all ${
              plan.popular
                ? 'bg-white text-black hover:bg-gray-100 [text-shadow:_0_1px_2px_rgb(0_0_0_/_10%)] shadow-[0_4px_20px_rgba(255,255,255,0.2)] hover:shadow-[0_4px_30px_rgba(255,255,255,0.3)]'
                : 'border-white/30 bg-white/5 text-white hover:bg-white/10 hover:border-white/50 [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)] backdrop-blur-sm'
            }`}
            onClick={() => handleSubscribe(plan.tier)}
            disabled={loading === plan.tier || currentTier === plan.tier}
            variant={plan.popular ? 'default' : 'outline'}
          >
            {loading === plan.tier
              ? 'Loading...'
              : currentTier === plan.tier
              ? 'Current Plan'
              : 'Subscribe'}
          </Button>

          {/* Subtle gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
      ))}
    </div>
  )
}
