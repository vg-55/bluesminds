// ============================================================================
// ADMIN AUDIT LOG API
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

// GET /api/admin/audit - Get audit logs with filtering
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)

    // Extract query parameters
    const adminUserId = searchParams.get('adminUserId')
    const resourceType = searchParams.get('resourceType')
    const actionType = searchParams.get('actionType')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('admin_audit_log')
      .select(`
        *,
        admin:admin_user_id (
          id,
          email,
          full_name
        )
      `)

    // Apply filters
    if (adminUserId) {
      query = query.eq('admin_user_id', adminUserId)
    }

    if (resourceType) {
      query = query.eq('resource_type', resourceType)
    }

    if (actionType) {
      query = query.eq('action_type', actionType)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    // Order by most recent first
    query = query.order('created_at', { ascending: false })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: logs, error } = await query

    if (error) throw error

    // Get total count for pagination
    let countQuery = supabase
      .from('admin_audit_log')
      .select('*', { count: 'exact', head: true })

    if (adminUserId) countQuery = countQuery.eq('admin_user_id', adminUserId)
    if (resourceType) countQuery = countQuery.eq('resource_type', resourceType)
    if (actionType) countQuery = countQuery.eq('action_type', actionType)
    if (startDate) countQuery = countQuery.gte('created_at', startDate)
    if (endDate) countQuery = countQuery.lte('created_at', endDate)

    const { count } = await countQuery

    // Format response
    const formattedLogs = logs?.map((log) => ({
      id: log.id,
      adminUser: {
        id: log.admin?.id,
        email: log.admin?.email,
        name: log.admin?.full_name || 'Unknown',
      },
      actionType: log.action_type,
      resourceType: log.resource_type,
      resourceId: log.resource_id,
      description: log.action_description,
      oldValues: log.old_values,
      newValues: log.new_values,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      metadata: log.metadata,
      createdAt: log.created_at,
    }))

    return NextResponse.json({
      logs: formattedLogs || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}
