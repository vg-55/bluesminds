// ============================================================================
// ADMIN REFERRAL SETTINGS API
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

// GET /api/admin/referrals/settings - Get referral program settings
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('referral_settings')
      .select('*')
      .limit(1)
      .single()

    if (error) throw error

    return NextResponse.json({
      referrerRewardType: data.referrer_reward_type,
      referrerRewardValue: parseFloat(data.referrer_reward_value),
      refereeRewardType: data.referee_reward_type,
      refereeRewardValue: parseFloat(data.referee_reward_value),
      minPurchaseAmount: parseFloat(data.min_purchase_amount),
      enabled: data.enabled,
    })
  } catch (error) {
    console.error('Error fetching referral settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch referral settings' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/referrals/settings - Update referral program settings
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()

    const { data, error } = await supabase
      .from('referral_settings')
      .update({
        referrer_reward_type: body.referrerRewardType,
        referrer_reward_value: body.referrerRewardValue,
        referee_reward_type: body.refereeRewardType,
        referee_reward_value: body.refereeRewardValue,
        min_purchase_amount: body.minPurchaseAmount,
        enabled: body.enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', (await supabase.from('referral_settings').select('id').limit(1).single()).data?.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      referrerRewardType: data.referrer_reward_type,
      referrerRewardValue: parseFloat(data.referrer_reward_value),
      refereeRewardType: data.referee_reward_type,
      refereeRewardValue: parseFloat(data.referee_reward_value),
      minPurchaseAmount: parseFloat(data.min_purchase_amount),
      enabled: data.enabled,
    })
  } catch (error) {
    console.error('Error updating referral settings:', error)
    return NextResponse.json(
      { error: 'Failed to update referral settings' },
      { status: 500 }
    )
  }
}
