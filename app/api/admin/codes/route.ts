// ============================================================================
// ADMIN REDEMPTION CODES API
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { logCodeAction, extractRequestContext } from '@/lib/audit/audit-logger'

export const dynamic = 'force-dynamic'

// GET /api/admin/codes - Get all redemption codes
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Fetch all codes
    const { data: codes, error } = await supabase
      .from('redemption_codes')
      .select(`
        id,
        code,
        requests,
        type,
        max_uses,
        current_uses,
        status,
        created_at,
        expires_at,
        created_by,
        creator:created_by (
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Calculate stats
    const stats = {
      totalCodes: codes?.length || 0,
      activeCodes: codes?.filter((c) => c.status === 'active').length || 0,
      totalRedemptions: codes?.reduce((sum, c) => sum + c.current_uses, 0) || 0,
      requestsDistributed: codes?.reduce((sum, c) => sum + c.requests * c.current_uses, 0) || 0,
    }

    return NextResponse.json({
      codes: codes?.map((code) => ({
        id: code.id,
        code: code.code,
        requests: code.requests,
        type: code.type,
        maxUses: code.max_uses,
        currentUses: code.current_uses,
        status: code.status,
        createdBy: code.creator?.email || 'admin@bluesminds.com',
        createdAt: code.created_at,
        expiresAt: code.expires_at,
      })) || [],
      stats,
    })
  } catch (error) {
    console.error('Error fetching codes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch codes' },
      { status: 500 }
    )
  }
}

// POST /api/admin/codes - Create a new redemption code
export async function POST(request: NextRequest) {
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

    // Generate random code
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 12; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length))
    }

    const { data, error } = await supabase
      .from('redemption_codes')
      .insert({
        code,
        requests: body.requests,
        type: body.type,
        max_uses: body.type === 'unlimited' ? null : body.maxUses,
        expires_at: body.expiresAt || null,
        status: 'active',
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    // Log the creation to audit log
    const { ipAddress, userAgent } = extractRequestContext(request)
    await logCodeAction({
      adminUserId: user.id,
      actionType: 'create',
      codeId: data.id,
      codeData: {
        code: data.code,
        requests: data.requests,
        type: data.type,
        maxUses: data.max_uses,
        expiresAt: data.expires_at,
      },
      ipAddress,
      userAgent,
    })

    return NextResponse.json({
      id: data.id,
      code: data.code,
      requests: data.requests,
      type: data.type,
      maxUses: data.max_uses,
      currentUses: data.current_uses,
      status: data.status,
      createdBy: user.id,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
    })
  } catch (error) {
    console.error('Error creating code:', error)
    return NextResponse.json(
      { error: 'Failed to create code' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/codes/[id] - Delete a code
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Code ID required' }, { status: 400 })
    }

    // Get current user (admin)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get code details before deletion for audit log
    const { data: codeData } = await supabase
      .from('redemption_codes')
      .select('*')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('redemption_codes')
      .delete()
      .eq('id', id)

    if (error) throw error

    // Log the deletion to audit log
    if (codeData) {
      const { ipAddress, userAgent } = extractRequestContext(request)
      await logCodeAction({
        adminUserId: user.id,
        actionType: 'delete',
        codeId: id,
        codeData: {
          code: codeData.code,
          requests: codeData.requests,
          type: codeData.type,
        },
        ipAddress,
        userAgent,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting code:', error)
    return NextResponse.json(
      { error: 'Failed to delete code' },
      { status: 500 }
    )
  }
}
