// ============================================================================
// PUBLIC REFERRAL STATUS API
// ============================================================================
// Returns whether the referral program is currently enabled
// This is a public endpoint (no auth required) for signup/login pages

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

// GET /api/referrals/enabled - Check if referral program is enabled
export async function GET() {
  try {
    // Use supabaseAdmin because this is a public endpoint called by unauthenticated users
    // RLS policies would block unauthenticated access to referral_settings
    if (!supabaseAdmin) {
      console.error('Service role client not available')
      return NextResponse.json({ enabled: false })
    }

    const { data, error } = await supabaseAdmin
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
