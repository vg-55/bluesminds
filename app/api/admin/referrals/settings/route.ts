// ============================================================================
// ADMIN REFERRAL SETTINGS API
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { createSettingsVersion } from '@/lib/audit/settings-versioning'
import { logSettingsChange, extractRequestContext } from '@/lib/audit/audit-logger'

export const dynamic = 'force-dynamic'

// GET /api/admin/referrals/settings - Get referral program settings
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

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
    const supabase = await createServerClient()
    const body = await request.json()

    // Get current user (admin)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current settings for audit comparison
    const { data: currentSettings } = await supabase
      .from('referral_settings')
      .select('*')
      .limit(1)
      .single()

    if (!currentSettings) {
      return NextResponse.json(
        { error: 'Current settings not found' },
        { status: 404 }
      )
    }

    // Create old settings object for audit
    const oldSettings = {
      referrerRewardType: currentSettings.referrer_reward_type,
      referrerRewardValue: parseFloat(currentSettings.referrer_reward_value),
      refereeRewardType: currentSettings.referee_reward_type,
      refereeRewardValue: parseFloat(currentSettings.referee_reward_value),
      minPurchaseAmount: parseFloat(currentSettings.min_purchase_amount),
      enabled: currentSettings.enabled,
    }

    // New settings object
    const newSettings = {
      referrerRewardType: body.referrerRewardType,
      referrerRewardValue: body.referrerRewardValue,
      refereeRewardType: body.refereeRewardType,
      refereeRewardValue: body.refereeRewardValue,
      minPurchaseAmount: body.minPurchaseAmount,
      enabled: body.enabled,
    }

    // Create new version in history
    const versionResult = await createSettingsVersion(
      newSettings,
      user.id,
      body.changeReason || 'Settings updated'
    )

    if (!versionResult) {
      return NextResponse.json(
        { error: 'Failed to create settings version' },
        { status: 500 }
      )
    }

    // Update main referral_settings table
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
      .eq('id', currentSettings.id)
      .select()
      .single()

    if (error) throw error

    // Log the change to audit log
    const { ipAddress, userAgent } = extractRequestContext(request)
    await logSettingsChange({
      adminUserId: user.id,
      oldSettings,
      newSettings,
      ipAddress,
      userAgent,
    })

    return NextResponse.json({
      referrerRewardType: data.referrer_reward_type,
      referrerRewardValue: parseFloat(data.referrer_reward_value),
      refereeRewardType: data.referee_reward_type,
      refereeRewardValue: parseFloat(data.referee_reward_value),
      minPurchaseAmount: parseFloat(data.min_purchase_amount),
      enabled: data.enabled,
      version: versionResult.version,
    })
  } catch (error) {
    console.error('Error updating referral settings:', error)
    return NextResponse.json(
      { error: 'Failed to update referral settings' },
      { status: 500 }
    )
  }
}
