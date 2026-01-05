#!/usr/bin/env node
/**
 * Debug script for BluesMinds AI Gateway
 * Identifies issues with chat completions and model checking
 */

const API_KEY = 'gw_InoS_9Ak6XYvklXG4n4rsMZ4MDxi9Aue5saT72-KqTw'
const BASE_URL = 'http://localhost:3000'

console.log('='.repeat(80))
console.log('BLUEMINDS AI GATEWAY DIAGNOSTICS')
console.log('='.repeat(80))
console.log()

// Test 1: Check if server is running
console.log('1. Testing server availability...')
try {
  const response = await fetch(`${BASE_URL}/api/health`)
  console.log(`   ✓ Server is running (status: ${response.status})`)
} catch (error) {
  console.log(`   ✗ Server is not accessible: ${error.message}`)
  process.exit(1)
}
console.log()

// Test 2: Check models endpoint
console.log('2. Testing models endpoint...')
try {
  const response = await fetch(`${BASE_URL}/api/v1/models`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` }
  })
  const data = await response.json()

  if (data.success && data.data?.data) {
    console.log(`   ✓ Models endpoint working (${data.data.data.length} models available)`)
    console.log(`   Models: ${data.data.data.slice(0, 3).map(m => m.id).join(', ')}...`)
  } else {
    console.log(`   ✗ Models endpoint failed:`, data)
  }
} catch (error) {
  console.log(`   ✗ Models endpoint error: ${error.message}`)
}
console.log()

// Test 3: Check LiteLLM server configuration (via models API)
console.log('3. Checking LiteLLM server configuration...')
try {
  const response = await fetch(`${BASE_URL}/api/v1/models`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` }
  })
  const data = await response.json()

  if (data.success) {
    console.log('   ✓ LiteLLM servers are configured')
  }
} catch (error) {
  console.log(`   ✗ Could not check server config: ${error.message}`)
}
console.log()

// Test 4: Test chat completions with simple request
console.log('4. Testing chat completions endpoint...')
try {
  const requestBody = {
    model: 'granite-3.3-8b-base',
    messages: [{ role: 'user', content: 'Hi' }],
    max_tokens: 5
  }

  console.log('   Request:', JSON.stringify(requestBody))

  const response = await fetch(`${BASE_URL}/api/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  const contentType = response.headers.get('content-type')
  console.log(`   Response status: ${response.status}`)
  console.log(`   Response content-type: ${contentType}`)

  const responseText = await response.text()
  console.log(`   Response body length: ${responseText.length} bytes`)
  console.log(`   Response preview: ${responseText.substring(0, 200)}`)

  try {
    const data = JSON.parse(responseText)
    if (data.success === false && data.error) {
      console.log(`   ✗ Chat completions failed: ${data.error.message}`)
      console.log(`   Error details:`, JSON.stringify(data.error, null, 2))
    } else if (data.choices) {
      console.log(`   ✓ Chat completions working!`)
      console.log(`   Response:`, data.choices[0]?.message?.content)
    }
  } catch (parseError) {
    console.log(`   ✗ Failed to parse response as JSON: ${parseError.message}`)
    console.log(`   Raw response: ${responseText}`)
  }
} catch (error) {
  console.log(`   ✗ Chat completions error: ${error.message}`)
  console.log(`   Stack:`, error.stack)
}
console.log()

// Test 5: Direct LiteLLM server connectivity
console.log('5. Testing direct LiteLLM server connectivity...')
const litellmUrl = process.env.LITELLM_SERVER_1_URL || 'http://localhost:4000'
console.log(`   Testing: ${litellmUrl}`)

try {
  const response = await fetch(`${litellmUrl}/health`)
  console.log(`   ✓ LiteLLM server is accessible (status: ${response.status})`)
  const text = await response.text()
  console.log(`   Health response: ${text}`)
} catch (error) {
  console.log(`   ✗ LiteLLM server is not accessible: ${error.message}`)
  console.log(`   Make sure LiteLLM is running at ${litellmUrl}`)
}
console.log()

console.log('='.repeat(80))
console.log('DIAGNOSTICS COMPLETE')
console.log('='.repeat(80))
