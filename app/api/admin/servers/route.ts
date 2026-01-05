// ============================================================================
// ADMIN SERVER MANAGEMENT ROUTES
// ============================================================================

import { NextRequest } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/supabase/client'
import { getAllServers } from '@/lib/gateway/load-balancer'
import { createServerSchema } from '@/lib/validations'
import { errorResponse, successResponse, ValidationError, AuthenticationError, AuthorizationError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'
import { adminEmails } from '@/lib/config/env'

// Check if user is admin
async function checkAdminAccess(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new AuthenticationError('Not authenticated')
  }

  // Check user role from database
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'admin') {
    throw new AuthorizationError('Admin access required')
  }

  return user
}

// GET /api/admin/servers - List all servers
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    await checkAdminAccess(supabase)

    const servers = await getAllServers()

    return successResponse(servers)
  } catch (error) {
    logger.error('List servers error', error)
    return errorResponse(error)
  }
}

// POST /api/admin/servers - Create new server
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    await checkAdminAccess(supabase)

    // Parse and validate request body
    const body = await request.json()
    const validated = createServerSchema.safeParse(body)

    if (!validated.success) {
      throw new ValidationError('Invalid server data', validated.error.errors)
    }

    // Insert server
    if (!supabaseAdmin) {
      throw new Error('Database client not available')
    }

    const { data, error } = await supabaseAdmin
      .from('litellm_servers')
      // @ts-expect-error - Supabase types issue after null check
      .insert(validated.data)
      .select()
      .single()

    if (error) {
      logger.error('Failed to create server', error)
      throw new Error('Failed to create server')
    }

    logger.info('Server created', { serverId: (data as any)?.id, name: validated.data.name })

    return successResponse(data, 201)
  } catch (error) {
    logger.error('Create server error', error)
    return errorResponse(error)
  }
}

// PATCH /api/admin/servers - Update server
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    await checkAdminAccess(supabase)

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      throw new ValidationError('Server ID is required')
    }

    if (!supabaseAdmin) {
      throw new Error('Database client not available')
    }

    const { data, error } = await supabaseAdmin
      .from('litellm_servers')
      // @ts-expect-error - Supabase types issue
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update server', error)
      throw new Error('Failed to update server')
    }

    logger.info('Server updated', { serverId: id })

    return successResponse(data)
  } catch (error) {
    logger.error('Update server error', error)
    return errorResponse(error)
  }
}

// DELETE /api/admin/servers - Delete server
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    await checkAdminAccess(supabase)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      throw new ValidationError('Server ID is required')
    }

    if (!supabaseAdmin) {
      throw new Error('Database client not available')
    }

    const { error } = await supabaseAdmin
      .from('litellm_servers')
      // @ts-expect-error - Supabase types issue
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('Failed to delete server', error)
      throw new Error('Failed to delete server')
    }

    logger.info('Server deleted', { serverId: id })

    return successResponse({ success: true })
  } catch (error) {
    logger.error('Delete server error', error)
    return errorResponse(error)
  }
}
