// ============================================================================
// ADMIN INDIVIDUAL SERVER ROUTES
// ============================================================================

import { NextRequest } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/supabase/client'
import { getServer } from '@/lib/gateway/load-balancer'
import { updateServerSchema } from '@/lib/validations'
import { errorResponse, successResponse, ValidationError, ServerError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'
import { checkAdminAccess } from '@/lib/utils/check-admin'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/admin/servers/[id]
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createServerClient()
    await checkAdminAccess(supabase)

    const server = await getServer(id)

    return successResponse(server)
  } catch (error) {
    logger.error('Get server error', error)
    return errorResponse(error)
  }
}

// PATCH /api/admin/servers/[id]
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createServerClient()
    await checkAdminAccess(supabase)

    // Parse and validate request body
    const body = await request.json()
    const validated = updateServerSchema.safeParse(body)

    if (!validated.success) {
      throw new ValidationError('Invalid update data', validated.error.errors)
    }

    // Update server
    if (!supabaseAdmin) {
      throw new ServerError('Database client not available')
    }

    const { data, error } = await supabaseAdmin
      .from('litellm_servers')
      // @ts-expect-error - Supabase types issue with update after null check
      .update({
        ...validated.data,
        updated_at: new Date().toISOString(),
      })
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

// DELETE /api/admin/servers/[id]
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createServerClient()
    await checkAdminAccess(supabase)

    // Delete server
    if (!supabaseAdmin) {
      throw new ServerError('Database client not available')
    }

    const { error } = await supabaseAdmin
      .from('litellm_servers')
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('Failed to delete server', error)
      throw new Error('Failed to delete server')
    }

    logger.info('Server deleted', { serverId: id })

    return successResponse({ message: 'Server deleted successfully' })
  } catch (error) {
    logger.error('Delete server error', error)
    return errorResponse(error)
  }
}
