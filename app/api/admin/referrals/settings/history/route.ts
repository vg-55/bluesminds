// ============================================================================
// ADMIN REFERRAL SETTINGS HISTORY API
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAllSettingsVersions } from '@/lib/audit/settings-versioning'

export const dynamic = 'force-dynamic'

// GET /api/admin/referrals/settings/history - Get settings version history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const versions = await getAllSettingsVersions(limit, offset)

    return NextResponse.json({
      versions,
      pagination: {
        limit,
        offset,
        hasMore: versions.length === limit,
      },
    })
  } catch (error) {
    console.error('Error fetching settings history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings history' },
      { status: 500 }
    )
  }
}
