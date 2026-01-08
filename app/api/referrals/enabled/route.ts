// ============================================================================
// PUBLIC REFERRAL STATUS API
// ============================================================================
// Returns whether the referral program is currently enabled
// This is a public endpoint (no auth required) for signup/login pages

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

// GET /api/referrals/enabled - Check if referral program is enabled
export async function GET() {
  try {
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('referral_settings')
      .select('enabled')
      .limit(1)
      .single()

    if (error) {
      console.error('Error fetching referral settings:', error)
      // Default to disabled if error
      return NextResponse.json({ enabled: false })
    }

    return NextResponse.json({ enabled: data.enabled ?? false })
  } catch (error) {
    console.error('Error checking referral status:', error)
    // Default to disabled on error
    return NextResponse.json({ enabled: false })
  }
}
