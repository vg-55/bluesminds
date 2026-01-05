#!/usr/bin/env node

/**
 * Test script for chat completions API
 * Usage: node test-chat-api.mjs <api-key>
 */

const API_KEY = process.argv[2] || 'your-api-key-here'
const BASE_URL = 'http://localhost:3000'

async function testModelsEndpoint() {
  console.log('\n📋 Testing /v1/models endpoint...')

  try {
    const response = await fetch(`${BASE_URL}/v1/models`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Failed:', data)
      return false
    }

    console.log('✅ Success:', JSON.stringify(data, null, 2))
    return true
  } catch (error) {
    console.error('❌ Error:', error.message)
    return false
  }
}

async function testChatCompletions() {
  console.log('\n💬 Testing /v1/chat/completions endpoint...')

  try {
    const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Say hello!'
          }
        ],
        temperature: 0.7,
        max_tokens: 100,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Failed:', JSON.stringify(data, null, 2))
      return false
    }

    console.log('✅ Success:', JSON.stringify(data, null, 2))
    return true
  } catch (error) {
    console.error('❌ Error:', error.message)
    return false
  }
}

async function testChatCompletionsStreaming() {
  console.log('\n🌊 Testing streaming /v1/chat/completions endpoint...')

  try {
    const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Count to 5'
          }
        ],
        stream: true,
        max_tokens: 50,
      }),
    })

    if (!response.ok) {
      const data = await response.json()
      console.error('❌ Failed:', JSON.stringify(data, null, 2))
      return false
    }

    console.log('✅ Streaming response:')
    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      process.stdout.write(chunk)
    }

    console.log('\n✅ Streaming completed')
    return true
  } catch (error) {
    console.error('❌ Error:', error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Starting API tests...')
  console.log(`Using API Key: ${API_KEY.substring(0, 20)}...`)

  const results = []

  results.push(await testModelsEndpoint())
  results.push(await testChatCompletions())
  results.push(await testChatCompletionsStreaming())

  const passed = results.filter(Boolean).length
  const total = results.length

  console.log(`\n📊 Results: ${passed}/${total} tests passed`)

  process.exit(passed === total ? 0 : 1)
}

main()
