#!/usr/bin/env node
/**
 * Check LiteLLM servers configuration and connectivity
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://eoxoiqeswazggavqnocx.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVveG9pcWVzd2F6Z2dhdnFub2N4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzUzNDQ1NywiZXhwIjoyMDgzMTEwNDU3fQ.mQ-GOLUZFjL0GAv_X0UU4zPlFJNUwhpivxvZGnP5TMY'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

console.log('='.repeat(80))
console.log('LITELLM SERVERS CONFIGURATION')
console.log('='.repeat(80))
console.log()

// Fetch all servers
const { data: servers, error } = await supabase
  .from('litellm_servers')
  .select('*')
  .order('priority', { ascending: true })

if (error) {
  console.error('Error fetching servers:', error.message)
  process.exit(1)
}

if (!servers || servers.length === 0) {
  console.log('No LiteLLM servers configured.')
  console.log()
  console.log('To fix this, you need to add a LiteLLM server:')
  console.log('1. Start a LiteLLM server')
  console.log('2. Add it via the admin panel or database')
  process.exit(0)
}

console.log(`Found ${servers.length} configured server(s):\n`)

// Check each server
for (const server of servers) {
  console.log(`Server: ${server.name}`)
  console.log(`  ID: ${server.id}`)
  console.log(`  URL: ${server.base_url}`)
  console.log(`  Active: ${server.is_active ? '✓' : '✗'}`)
  console.log(`  Health: ${server.health_status || 'unknown'}`)
  console.log(`  Models: ${server.supported_models?.length || 0} models`)

  if (server.supported_models && server.supported_models.length > 0) {
    console.log(`    - ${server.supported_models.slice(0, 3).join(', ')}${server.supported_models.length > 3 ? '...' : ''}`)
  }

  // Test connectivity
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(`${server.base_url}/health`, {
      signal: controller.signal
    })
    clearTimeout(timeout)

    if (response.ok) {
      console.log(`  Connectivity: ✓ Accessible`)
    } else {
      console.log(`  Connectivity: ✗ Server returned ${response.status}`)
    }
  } catch (error) {
    console.log(`  Connectivity: ✗ Not accessible (${error.message})`)
  }

  console.log()
}

console.log('='.repeat(80))
console.log()
console.log('RECOMMENDATIONS:')
console.log()

const activeServers = servers.filter(s => s.is_active)
const healthyServers = servers.filter(s => s.health_status === 'healthy')
const accessibleCount = await Promise.all(
  servers.map(async s => {
    try {
      const response = await fetch(`${s.base_url}/health`, {
        signal: AbortSignal.timeout(5000)
      })
      return response.ok
    } catch {
      return false
    }
  })
).then(results => results.filter(Boolean).length)

if (activeServers.length === 0) {
  console.log('⚠️  No active servers configured!')
  console.log('   Enable at least one server in the database.')
}

if (accessibleCount === 0) {
  console.log('⚠️  No servers are accessible!')
  console.log('   Make sure LiteLLM servers are running at the configured URLs.')
  console.log()
  console.log('   Quick fix: Start LiteLLM with:')
  console.log('   $ litellm --config config.yaml --port 4000')
}

console.log()
