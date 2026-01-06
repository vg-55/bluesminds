// ============================================================================
// ADMIN PLATFORM SETTINGS API
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { logPlatformSettingsChange, extractRequestContext } from '@/lib/audit/audit-logger'

export const dynamic = 'force-dynamic'

const PLATFORM_SETTINGS_ID = '00000000-0000-0000-0000-000000000001'

// GET /api/admin/settings - Get platform settings
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('id', PLATFORM_SETTINGS_ID)
      .single()

    if (error) throw error

    return NextResponse.json({
      maintenanceMode: data.maintenance_mode,
      newUserSignups: data.new_user_signups,
      emailNotifications: data.email_notifications,
      rateLimitDefault: data.rate_limit_default,
      defaultUserTier: data.default_user_tier,
      updatedBy: data.updated_by,
      updatedAt: data.updated_at,
    })
  } catch (error) {
    console.error('Error fetching platform settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch platform settings' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/settings - Update platform settings
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
      .from('platform_settings')
      .select('*')
      .eq('id', PLATFORM_SETTINGS_ID)
      .single()

    if (!currentSettings) {
      return NextResponse.json(
        { error: 'Platform settings not found' },
        { status: 404 }
      )
    }

    // Create old settings object for audit
    const oldSettings = {
      maintenanceMode: currentSettings.maintenance_mode,
      newUserSignups: currentSettings.new_user_signups,
      emailNotifications: currentSettings.email_notifications,
      rateLimitDefault: currentSettings.rate_limit_default,
      defaultUserTier: currentSettings.default_user_tier,
    }

    // New settings object
    const newSettings = {
      maintenanceMode: body.maintenanceMode ?? currentSettings.maintenance_mode,
      newUserSignups: body.newUserSignups ?? currentSettings.new_user_signups,
      emailNotifications: body.emailNotifications ?? currentSettings.email_notifications,
      rateLimitDefault: body.rateLimitDefault ?? currentSettings.rate_limit_default,
      defaultUserTier: body.defaultUserTier ?? currentSettings.default_user_tier,
    }

    // Update platform settings
    const { data, error } = await supabase
      .from('platform_settings')
      .update({
        maintenance_mode: newSettings.maintenanceMode,
        new_user_signups: newSettings.newUserSignups,
        email_notifications: newSettings.emailNotifications,
        rate_limit_default: newSettings.rateLimitDefault,
        default_user_tier: newSettings.defaultUserTier,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', PLATFORM_SETTINGS_ID)
      .select()
      .single()

    if (error) throw error

    // Log the change to audit log
    const { ipAddress, userAgent } = extractRequestContext(request)
    await logPlatformSettingsChange({
      adminUserId: user.id,
      oldSettings,
      newSettings,
      ipAddress,
      userAgent,
    })

    return NextResponse.json({
      maintenanceMode: data.maintenance_mode,
      newUserSignups: data.new_user_signups,
      emailNotifications: data.email_notifications,
      rateLimitDefault: data.rate_limit_default,
      defaultUserTier: data.default_user_tier,
      updatedBy: data.updated_by,
      updatedAt: data.updated_at,
    })
  } catch (error) {
    console.error('Error updating platform settings:', error)
    return NextResponse.json(
      { error: 'Failed to update platform settings' },
      { status: 500 }
    )
  }
}
