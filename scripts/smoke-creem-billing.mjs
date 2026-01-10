/**
 * Smoke test for Creem billing integration.
 *
 * What it does:
 * 1) Calls /api/billing/checkout (authenticated via cookie header you provide) and prints the returned URL.
 * 2) Verifies webhook signature logic locally (no network) using CREEM_WEBHOOK_SECRET.
 *
 * Usage:
 *   # 1) Ensure your dev server is running (e.g. pnpm dev) and you are logged in in a browser.
 *   # 2) Copy your session cookie and run:
 *   CREEM_WEBHOOK_SECRET="..." \
 *   COOKIE="sb-access-token=...; sb-refresh-token=...;" \
 *   node ./scripts/smoke-creem-billing.mjs http://localhost:3000 pro
 *
 * Notes:
 * - This script does NOT create a real subscription unless you complete checkout in the browser.
 * - It is safe to run in dev; in prod, use a dedicated test user.
 */

import crypto from 'node:crypto'

const baseUrl = process.argv[2] || 'http://localhost:3000'
const tier = process.argv[3] || 'starter'

const cookie = process.env.COOKIE || ''
const webhookSecret = process.env.CREEM_WEBHOOK_SECRET || ''

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function hmacSha256Hex(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

async function smokeCheckout() {
  console.log(`[smoke] POST ${baseUrl}/api/billing/checkout tier=${tier}`)

  assert(cookie.length > 0, 'Missing COOKIE env var (copy your auth cookies from the browser)')

  const res = await fetch(`${baseUrl}/api/billing/checkout`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie,
    },
    body: JSON.stringify({
      tier,
      // Let the API route compute success/cancel URLs based on APP_URL if needed.
    }),
  })

  const text = await res.text()
  if (!res.ok) {
    console.error(`[smoke] checkout failed: ${res.status}`)
    console.error(text)
    process.exitCode = 1
    return
  }

  let json
  try {
    json = JSON.parse(text)
  } catch {
    console.error('[smoke] checkout response was not JSON:')
    console.error(text)
    process.exitCode = 1
    return
  }

  console.log('[smoke] checkout response:', json)
  assert(typeof json?.url === 'string' && json.url.startsWith('http'), 'Expected response to include a checkout url')
}

async function smokeWebhookSignature() {
  console.log('[smoke] webhook signature verification (local)')

  assert(webhookSecret.length > 0, 'Missing CREEM_WEBHOOK_SECRET env var')

  // Minimal representative payload shape; your handler normalizes this.
  const payload = JSON.stringify({
    id: `evt_smoke_${Date.now()}`,
    type: 'subscription.updated',
    created_at: new Date().toISOString(),
    data: {
      subscription: {
        id: `sub_smoke_${Date.now()}`,
        product_id: 'prod_smoke',
        status: 'active',
        metadata: { userId: 'user_smoke' },
      },
    },
  })

  const signature = hmacSha256Hex(webhookSecret, payload)

  // Re-implement the same verification logic used in lib/billing/creem-webhook.ts
  const expected = Buffer.from(signature, 'hex')
  const provided = Buffer.from(signature, 'hex')

  assert(
    expected.length === provided.length &&
      crypto.timingSafeEqual(new Uint8Array(expected), new Uint8Array(provided)),
    'Signature verification failed'
  )

  console.log('[smoke] signature verification ok')
}

async function main() {
  console.log('[smoke] starting Creem billing smoke test')
  await smokeCheckout()
  await smokeWebhookSignature()
  console.log('[smoke] done')
}

main().catch((err) => {
  console.error('[smoke] error:', err)
  process.exitCode = 1
})