// ============================================================================
// CREEM WEBHOOK VERIFICATION + NORMALIZATION
// ============================================================================

import crypto from 'crypto'
import { env } from '@/lib/config/env'
import { logger } from '@/lib/utils/logger'

/**
 * Creem webhook signature verification.
 *
 * Creem docs: https://docs.creem.io/getting-started/introduction
 *
 * NOTE: Header names can vary by provider. We support a small set of common
 * patterns and allow overriding via CREEM_WEBHOOK_SIGNATURE_HEADER.
 */
export function verifyCreemWebhookSignature(params: {
  rawBody: string
  headers: Headers
}): { ok: true } | { ok: false; reason: string } {
  if (!env.CREEM_WEBHOOK_SECRET) return { ok: false, reason: 'CREEM_WEBHOOK_SECRET not configured' }

  const signatureHeaderName =
    process.env.CREEM_WEBHOOK_SIGNATURE_HEADER ||
    'creem-signature'

  const signature =
    params.headers.get(signatureHeaderName) ||
    params.headers.get('x-creem-signature') ||
    params.headers.get('creem-signature') ||
    params.headers.get('x-signature')

  if (!signature) return { ok: false, reason: 'Missing signature header' }

  // We assume HMAC-SHA256 over raw body. If Creem uses a different scheme,
  // adjust here (kept isolated for production safety).
  const expected = crypto
    .createHmac('sha256', env.CREEM_WEBHOOK_SECRET)
    .update(params.rawBody, 'utf8')
    .digest('hex')

  const sigBuf = Buffer.from(signature, 'utf8')
  const expBuf = Buffer.from(expected, 'utf8')

  if (sigBuf.length !== expBuf.length) return { ok: false, reason: 'Invalid signature length' }

  const valid = crypto.timingSafeEqual(
    new Uint8Array(sigBuf),
    new Uint8Array(expBuf)
  )
  if (!valid) return { ok: false, reason: 'Invalid signature' }

  return { ok: true }
}

export type CreemWebhookEvent = {
  id?: string
  type: string
  createdAt?: string
  data?: any
}

/**
 * Best-effort normalization: Creem payloads may differ by version.
 * We keep this permissive and validate required fields per handler.
 */
export function parseCreemWebhookEvent(rawBody: string): CreemWebhookEvent {
  try {
    const parsed = JSON.parse(rawBody)

    // Common shapes:
    // { id, type, data }
    // { event: { id, type, data } }
    const event = parsed?.event ?? parsed

    if (!event?.type || typeof event.type !== 'string') {
      throw new Error('Missing event.type')
    }

    return {
      id: typeof event.id === 'string' ? event.id : undefined,
      type: event.type,
      createdAt: typeof event.createdAt === 'string' ? event.createdAt : undefined,
      data: event.data,
    }
  } catch (error) {
    logger.error('Failed to parse Creem webhook payload', error)
    throw error
  }
}