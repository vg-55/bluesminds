// ============================================================================
// CRYPTOGRAPHIC UTILITIES
// ============================================================================

import { randomBytes, createHash, createHmac } from 'crypto'
import bcrypt from 'bcryptjs'
import { env } from '@/lib/config/env'
import { apiKeyConfig } from '@/lib/config/app'

// Generate a secure random API key
export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const randomPart = randomBytes(apiKeyConfig.length).toString('base64url')
  const key = `${apiKeyConfig.prefix}${randomPart}`
  const prefix = key.substring(0, apiKeyConfig.displayLength)
  const hash = hashApiKey(key)

  return { key, prefix, hash }
}

// Hash an API key using bcrypt (for storage)
export function hashApiKey(key: string): string {
  return bcrypt.hashSync(key, env.BCRYPT_ROUNDS)
}

// Verify an API key against its hash
export function verifyApiKey(key: string, hash: string): boolean {
  return bcrypt.compareSync(key, hash)
}

// Generate a secure random string (for secrets, tokens, etc.)
export function generateSecureToken(length = 32): string {
  return randomBytes(length).toString('base64url')
}

// Generate a unique request ID
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36)
  const random = randomBytes(8).toString('base64url')
  return `req_${timestamp}_${random}`
}

// Hash a string using SHA-256 (for non-sensitive data)
export function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex')
}

// HMAC signature (for webhook verification)
export function createHmacSignature(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('hex')
}

// Verify HMAC signature
export function verifyHmacSignature(
  data: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = createHmacSignature(data, secret)
  return timingSafeEqual(signature, expectedSignature)
}

// Timing-safe string comparison (prevents timing attacks)
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

// Generate a referral code (short, human-readable)
export function generateReferralCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Avoid ambiguous characters
  const bytes = randomBytes(length)
  let code = ''

  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length]
  }

  return code
}

// Mask sensitive data (for logging)
export function maskString(str: string, visibleChars = 4): string {
  if (str.length <= visibleChars) {
    return '*'.repeat(str.length)
  }
  return str.substring(0, visibleChars) + '*'.repeat(str.length - visibleChars)
}
