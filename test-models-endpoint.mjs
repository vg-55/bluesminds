#!/usr/bin/env node

/**
 * Test script for the /v1/models endpoint
 * This helps diagnose issues with tools like Kilocode or Roo Code
 *
 * Usage:
 *   node test-models-endpoint.mjs <your-api-key>
 *
 * If no API key is provided, you'll need to create one at:
 *   http://localhost:3000/dashboard/keys
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'

async function testModelsEndpoint() {
  console.log('🔍 Testing /v1/models endpoint...\n')

  // Get API key from command line argument
  const apiKey = process.argv[2]

  if (!apiKey) {
    console.error('❌ No API key provided\n')
    console.error('Usage:')
    console.error('  node test-models-endpoint.mjs <your-api-key>\n')
    console.error('Create an API key at: http://localhost:3000/dashboard/keys')
    console.error('Then run this script with your API key.\n')
    console.error('Example:')
    console.error('  node test-models-endpoint.mjs gw_abcd1234567890...\n')
    process.exit(1)
  }

  console.log(`📝 Using API key: ${apiKey.substring(0, 15)}...${apiKey.substring(apiKey.length - 4)}\n`)

  // Test the endpoint
  console.log('🌐 Calling GET /api/v1/models...')
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    console.log(`📊 Response status: ${response.status} ${response.statusText}\n`)

    const contentType = response.headers.get('content-type')
    console.log(`📄 Content-Type: ${contentType}\n`)

    const data = await response.json()

    if (response.ok) {
      console.log('✅ SUCCESS! Models retrieved:\n')
      console.log(JSON.stringify(data, null, 2))

      if (data.data && Array.isArray(data.data)) {
        console.log(`\n📋 Total models: ${data.data.length}`)
        if (data.data.length === 0) {
          console.log('\n⚠️  WARNING: No models found!')
          console.log('   You need to add custom models in the admin panel.')
          console.log('   Visit: http://localhost:3000/admin/models')
        } else {
          console.log('📝 Available model IDs:')
          data.data.forEach(model => {
            console.log(`   - ${model.id}`)
          })

          console.log('\n✅ Configuration for tools like Kilocode or Roo Code:')
          console.log('   Base URL: http://localhost:3000/api')
          console.log(`   API Key:  ${apiKey.substring(0, 15)}...`)
          console.log('   Models:   ' + data.data.map(m => m.id).join(', '))
        }
      }
    } else {
      console.log('❌ ERROR! Response:\n')
      console.log(JSON.stringify(data, null, 2))

      if (data.error?.code === 'AUTHENTICATION_ERROR') {
        console.log('\n💡 TIP: Your API key may be invalid or expired')
        console.log('   Create a new one at: http://localhost:3000/dashboard/keys')
      } else if (data.error?.message) {
        console.log('\n💡 Error details:', data.error.message)
      }
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message)
    if (error.cause) {
      console.error('   Cause:', error.cause.message)
    }
    console.log('\n💡 TIP: Make sure the server is running on', API_BASE_URL)
    console.log('   Run: pnpm dev')
  }
}

// Run the test
testModelsEndpoint().catch(console.error)
