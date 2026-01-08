// ============================================================================
// AUDIT LOGGER
// ============================================================================
// Helper functions to log admin actions to the admin_audit_log table

import { supabaseAdmin } from '@/lib/supabase/client'

export type ActionType = 'create' | 'update' | 'delete' | 'activate' | 'deactivate'

export interface LogAdminActionParams {
  adminUserId: string
  actionType: ActionType
  resourceType: string
  resourceId?: string
  description: string
  oldValues?: any
  newValues?: any
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
}

/**
 * Logs an admin action to the admin_audit_log table
 *
 * @param params - Admin action parameters
 * @returns The created audit log entry or null if failed
 *
 * @example
 * await logAdminAction({
 *   adminUserId: '123',
 *   actionType: 'create',
 *   resourceType: 'redemption_code',
 *   resourceId: 'code-id',
 *   description: 'Created redemption code ABC123',
 *   newValues: { code: 'ABC123', requests: 100 }
 * })
 */
export async function logAdminAction(params: LogAdminActionParams) {
  try {
    // Use supabaseAdmin to bypass RLS restrictions
    if (!supabaseAdmin) {
      console.error('Service role client not available')
      return null
    }

    const { data, error } = await supabaseAdmin
      .from('admin_audit_log')
      .insert({
        admin_user_id: params.adminUserId,
        action_type: params.actionType,
        resource_type: params.resourceType,
        resource_id: params.resourceId || null,
        action_description: params.description,
        old_values: params.oldValues ? JSON.parse(JSON.stringify(params.oldValues)) : null,
        new_values: params.newValues ? JSON.parse(JSON.stringify(params.newValues)) : null,
        ip_address: params.ipAddress || null,
        user_agent: params.userAgent || null,
        metadata: params.metadata || {},
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to log admin action:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in logAdminAction:', error)
    return null
  }
}

/**
 * Extracts IP address and user agent from a Next.js request
 *
 * @param request - Next.js request object
 * @returns Object with ipAddress and userAgent
 */
export function extractRequestContext(request: Request) {
  const headers = request.headers

  // Try to get real IP from various headers (for reverse proxy scenarios)
  const ipAddress =
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') || // Cloudflare
    'unknown'

  const userAgent = headers.get('user-agent') || 'unknown'

  return { ipAddress, userAgent }
}

/**
 * Helper to create old/new values objects for audit logging
 * Useful for comparing state before and after updates
 *
 * @param oldObj - Previous state object
 * @param newObj - New state object
 * @returns Object with oldValues and newValues containing only changed fields
 */
export function createAuditDiff(oldObj: any, newObj: any) {
  const oldValues: Record<string, any> = {}
  const newValues: Record<string, any> = {}

  // Find changed fields
  for (const key in newObj) {
    if (oldObj[key] !== newObj[key]) {
      oldValues[key] = oldObj[key]
      newValues[key] = newObj[key]
    }
  }

  return { oldValues, newValues }
}

/**
 * Convenience function for logging settings changes
 */
export async function logSettingsChange(params: {
  adminUserId: string
  oldSettings: any
  newSettings: any
  ipAddress?: string
  userAgent?: string
}) {
  const { oldValues, newValues } = createAuditDiff(params.oldSettings, params.newSettings)

  const changedFields = Object.keys(newValues)
  const description = `Updated referral settings: ${changedFields.join(', ')}`

  return logAdminAction({
    adminUserId: params.adminUserId,
    actionType: 'update',
    resourceType: 'referral_settings',
    description,
    oldValues,
    newValues,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  })
}

/**
 * Convenience function for logging code operations
 */
export async function logCodeAction(params: {
  adminUserId: string
  actionType: 'create' | 'delete'
  codeId: string
  codeData?: any
  ipAddress?: string
  userAgent?: string
}) {
  const description =
    params.actionType === 'create'
      ? `Created redemption code ${params.codeData?.code || 'unknown'}`
      : `Deleted redemption code`

  return logAdminAction({
    adminUserId: params.adminUserId,
    actionType: params.actionType,
    resourceType: 'redemption_code',
    resourceId: params.codeId,
    description,
    newValues: params.actionType === 'create' ? params.codeData : undefined,
    oldValues: params.actionType === 'delete' ? params.codeData : undefined,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  })
}

/**
 * Convenience function for logging user modifications
 */
export async function logUserAction(params: {
  adminUserId: string
  actionType: ActionType
  targetUserId: string
  description: string
  oldValues?: any
  newValues?: any
  ipAddress?: string
  userAgent?: string
}) {
  return logAdminAction({
    adminUserId: params.adminUserId,
    actionType: params.actionType,
    resourceType: 'user',
    resourceId: params.targetUserId,
    description: params.description,
    oldValues: params.oldValues,
    newValues: params.newValues,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  })
}

/**
 * Convenience function for logging server modifications
 */
export async function logServerAction(params: {
  adminUserId: string
  actionType: ActionType
  serverId: string
  description: string
  oldValues?: any
  newValues?: any
  ipAddress?: string
  userAgent?: string
}) {
  return logAdminAction({
    adminUserId: params.adminUserId,
    actionType: params.actionType,
    resourceType: 'litellm_server',
    resourceId: params.serverId,
    description: params.description,
    oldValues: params.oldValues,
    newValues: params.newValues,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  })
}

/**
 * Convenience function for logging platform settings changes
 */
export async function logPlatformSettingsChange(params: {
  adminUserId: string
  oldSettings: any
  newSettings: any
  ipAddress?: string
  userAgent?: string
}) {
  const { oldValues, newValues } = createAuditDiff(params.oldSettings, params.newSettings)

  const changedFields = Object.keys(newValues)
  const description = `Updated platform settings: ${changedFields.join(', ')}`

  return logAdminAction({
    adminUserId: params.adminUserId,
    actionType: 'update',
    resourceType: 'platform_settings',
    description,
    oldValues,
    newValues,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  })
}
