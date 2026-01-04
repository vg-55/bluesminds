// ============================================================================
// BILLING PORTAL BUTTON
// ============================================================================

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'

export function BillingPortalButton() {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
      })

      if (response.ok) {
        const result = await response.json()
        window.location.href = result.data.url
      }
    } catch (error) {
      console.error('Portal error', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      className="bg-white text-black hover:bg-gray-100 [text-shadow:_0_1px_2px_rgb(0_0_0_/_10%)] font-open-sans-custom font-semibold shadow-[0_4px_20px_rgba(255,255,255,0.2)] hover:shadow-[0_4px_30px_rgba(255,255,255,0.3)] transition-all"
    >
      <ExternalLink className="w-4 h-4 mr-2" />
      {loading ? 'Loading...' : 'Manage Subscription'}
    </Button>
  )
}
