// ============================================================================
// ADMIN REFERRAL SETTINGS API
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/supabase/client'
import { checkAdminAccess } from '@/lib/utils/check-admin'
import { createSettingsVersion } from '@/lib/audit/settings-versioning'
import { logSettingsChange, extractRequestContext } from '@/lib/audit/audit-logger'

export const dynamic = 'force-dynamic'

// GET /api/admin/referrals/settings - Get referral program settings
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Check admin access
    await checkAdminAccess(supabase)

    // Use supabaseAdmin to bypass RLS restrictions
    if (!supabaseAdmin) {
      throw new Error('Service role client not available')
    }

    const { data, error } = await supabaseAdmin
      .from('referral_settings')
      .select('*')
      .limit(1)
      .single()

    if (error) throw error

    return NextResponse.json({
      rewardType: data.reward_type || 'requests',
      referrerRewardType: data.referrer_reward_type,
      referrerRewardValue: parseFloat(data.referrer_reward_value || 0),
      refereeRewardType: data.referee_reward_type,
      refereeRewardValue: parseFloat(data.referee_reward_value || 0),
      referrerRequests: data.referrer_requests || 1000,
      refereeRequests: data.referee_requests || 500,
      minPurchaseAmount: parseFloat(data.min_purchase_amount || 0),
      minQualifyingRequests: data.min_qualifying_requests || 10,
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

    console.log('[PATCH /api/admin/referrals/settings] Request body:', body)

    // Get current user (admin)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[PATCH /api/admin/referrals/settings] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[PATCH /api/admin/referrals/settings] User:', user.email)

    // Check admin access
    await checkAdminAccess(supabase)
    console.log('[PATCH /api/admin/referrals/settings] Admin access confirmed')

    // Use supabaseAdmin to bypass RLS restrictions
    if (!supabaseAdmin) {
      throw new Error('Service role client not available')
    }

    // Get current settings for audit comparison
    const { data: currentSettings } = await supabaseAdmin
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
      rewardType: currentSettings.reward_type || 'requests',
      referrerRewardType: currentSettings.referrer_reward_type,
      referrerRewardValue: parseFloat(currentSettings.referrer_reward_value || 0),
      refereeRewardType: currentSettings.referee_reward_type,
      refereeRewardValue: parseFloat(currentSettings.referee_reward_value || 0),
      referrerRequests: currentSettings.referrer_requests || 1000,
      refereeRequests: currentSettings.referee_requests || 500,
      minPurchaseAmount: parseFloat(currentSettings.min_purchase_amount || 0),
      minQualifyingRequests: currentSettings.min_qualifying_requests || 10,
      enabled: currentSettings.enabled,
    }

    // New settings object
    const newSettings = {
      rewardType: body.rewardType || 'requests',
      referrerRewardType: body.referrerRewardType,
      referrerRewardValue: body.referrerRewardValue,
      refereeRewardType: body.refereeRewardType,
      refereeRewardValue: body.refereeRewardValue,
      referrerRequests: body.referrerRequests || 1000,
      refereeRequests: body.refereeRequests || 500,
      minPurchaseAmount: body.minPurchaseAmount || 0,
      minQualifyingRequests: body.minQualifyingRequests || 10,
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
    console.log('[PATCH /api/admin/referrals/settings] Updating settings with:', {
      enabled: body.enabled,
      rewardType: body.rewardType,
      settingsId: currentSettings.id,
    })

    const { data, error } = await supabaseAdmin
      .from('referral_settings')
      .update({
        reward_type: body.rewardType || 'requests',
        referrer_reward_type: body.referrerRewardType,
        referrer_reward_value: body.referrerRewardValue || 0,
        referee_reward_type: body.refereeRewardType,
        referee_reward_value: body.refereeRewardValue || 0,
        referrer_requests: body.referrerRequests || 1000,
        referee_requests: body.refereeRequests || 500,
        min_purchase_amount: body.minPurchaseAmount || 0,
        min_qualifying_requests: body.minQualifyingRequests || 10,
        enabled: body.enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentSettings.id)
      .select()
      .single()

    if (error) {
      console.error('[PATCH /api/admin/referrals/settings] Update error:', error)
      throw error
    }

    console.log('[PATCH /api/admin/referrals/settings] Settings updated successfully:', {
      enabled: data.enabled,
      rewardType: data.reward_type,
    })

    // Log the change to audit log
    const { ipAddress, userAgent } = extractRequestContext(request)
    await logSettingsChange({
      adminUserId: user.id,
      oldSettings,
      newSettings,
      ipAddress,
      userAgent,
    })

    const response = {
      rewardType: data.reward_type || 'requests',
      referrerRewardType: data.referrer_reward_type,
      referrerRewardValue: parseFloat(data.referrer_reward_value || 0),
      refereeRewardType: data.referee_reward_type,
      refereeRewardValue: parseFloat(data.referee_reward_value || 0),
      referrerRequests: data.referrer_requests || 1000,
      refereeRequests: data.referee_requests || 500,
      minPurchaseAmount: parseFloat(data.min_purchase_amount || 0),
      minQualifyingRequests: data.min_qualifying_requests || 10,
      enabled: data.enabled,
      version: versionResult.version,
    }

    console.log('[PATCH /api/admin/referrals/settings] Sending response:', response)
    return NextResponse.json(response)
  } catch (error) {
    console.error('[PATCH /api/admin/referrals/settings] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to update referral settings'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
