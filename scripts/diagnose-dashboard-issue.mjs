#!/usr/bin/env node
/**
 * Dashboard Data Diagnostic Script
 * Checks why dashboard shows no recent requests
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables manually
function loadEnv(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8')
    content.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim().replace(/^["']|["']$/g, '')
        if (!process.env[key]) {
          process.env[key] = value
        }
      }
    })
  } catch (err) {
    // File doesn't exist, skip
  }
}

loadEnv(resolve(__dirname, '../.env.local'))
loadEnv(resolve(__dirname, '../.env'))

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

console.log('🔍 Dashboard Data Diagnostic Report')
console.log('=' .repeat(80))
console.log()

async function checkTableStructure() {
  console.log('📊 1. Checking usage_logs table structure...')
  console.log()

  // Check if table exists and get columns
  const { data: columns, error } = await supabase
    .from('usage_logs')
    .select('*')
    .limit(1)

  if (error) {
    console.error('❌ Error querying usage_logs:', error.message)
    return false
  }

  if (columns && columns.length > 0) {
    console.log('✓ Table exists')
    console.log('✓ Columns:', Object.keys(columns[0]).join(', '))
    console.log()
  }

  return true
}

async function checkRecentLogs() {
  console.log('📈 2. Checking recent usage logs...')
  console.log()

  // Get total count
  const { count: totalCount, error: countError } = await supabase
    .from('usage_logs')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.error('❌ Error counting logs:', countError.message)
    return
  }

  console.log(`Total logs in database: ${totalCount || 0}`)
  console.log()

  // Get recent logs (last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: recentLogs, error: recentError } = await supabase
    .from('usage_logs')
    .select('*')
    .gte('created_at', oneDayAgo)
    .order('created_at', { ascending: false })
    .limit(10)

  if (recentError) {
    console.error('❌ Error fetching recent logs:', recentError.message)
    return
  }

  console.log(`Logs in last 24 hours: ${recentLogs?.length || 0}`)
  console.log()

  if (recentLogs && recentLogs.length > 0) {
    console.log('Recent requests:')
    recentLogs.forEach((log, i) => {
      console.log(`  ${i + 1}. ${log.model}`)
      console.log(`     Time: ${log.created_at}`)
      console.log(`     User: ${log.user_id}`)
      console.log(`     Provider: ${log.provider || 'NULL'}`)
      console.log(`     Tokens: ${log.total_tokens} (source: ${log.token_source || 'NULL'})`)
      console.log(`     Status: ${log.status_code}`)
      console.log()
    })
  } else {
    console.log('⚠️  No logs in last 24 hours!')
    console.log()
  }

  // Get logs in last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count: lastHourCount } = await supabase
    .from('usage_logs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', oneHourAgo)

  console.log(`Logs in last hour: ${lastHourCount || 0}`)
  console.log()

  if (lastHourCount === 0) {
    console.log('⚠️  USER REPORTED: 150 requests made, but no logs in last hour!')
    console.log('⚠️  This indicates a logging failure!')
    console.log()
  }
}

async function checkUsers() {
  console.log('👥 3. Checking users...')
  console.log()

  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, tier, status')
    .limit(5)

  if (error) {
    console.error('❌ Error fetching users:', error.message)
    return
  }

  console.log(`Total users: ${users?.length || 0}`)
  if (users && users.length > 0) {
    users.forEach((user, i) => {
      console.log(`  ${i + 1}. ${user.email} (${user.tier}, ${user.status})`)
    })
  }
  console.log()
}

async function checkAPIKeys() {
  console.log('🔑 4. Checking API keys...')
  console.log()

  const { count: totalKeys, error: countError } = await supabase
    .from('api_keys')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  if (countError) {
    console.error('❌ Error counting API keys:', countError.message)
    return
  }

  console.log(`Active API keys: ${totalKeys || 0}`)
  console.log()

  // Check if there are logs for each API key
  const { data: keys, error: keysError } = await supabase
    .from('api_keys')
    .select('id, name, user_id, is_active')
    .eq('is_active', true)
    .limit(5)

  if (keysError) {
    console.error('❌ Error fetching API keys:', keysError.message)
    return
  }

  if (keys && keys.length > 0) {
    console.log('Checking usage per API key:')
    for (const key of keys) {
      const { count } = await supabase
        .from('usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('api_key_id', key.id)

      console.log(`  ${key.name}: ${count || 0} requests`)
    }
    console.log()
  }
}

async function checkTokenSource() {
  console.log('🎯 5. Checking token_source distribution...')
  console.log()

  const { data: logs, error } = await supabase
    .from('usage_logs')
    .select('token_source')

  if (error) {
    console.error('❌ Error fetching token sources:', error.message)
    return
  }

  if (!logs || logs.length === 0) {
    console.log('No logs found to analyze')
    console.log()
    return
  }

  const distribution = logs.reduce((acc, log) => {
    const source = log.token_source || 'NULL'
    acc[source] = (acc[source] || 0) + 1
    return acc
  }, {})

  console.log('Token source distribution:')
  Object.entries(distribution).forEach(([source, count]) => {
    const percentage = ((count / logs.length) * 100).toFixed(1)
    console.log(`  ${source}: ${count} (${percentage}%)`)
  })
  console.log()
}

async function checkPartitions() {
  console.log('📅 6. Checking table partitions...')
  console.log()

  // Check if current month partition exists
  const currentDate = new Date()
  const year = currentDate.getFullYear()
  const month = String(currentDate.getMonth() + 1).padStart(2, '0')
  const partitionName = `usage_logs_${year}_${month}`

  console.log(`Current date: ${currentDate.toISOString()}`)
  console.log(`Expected partition: ${partitionName}`)
  console.log()

  // Try to insert a test row (will rollback)
  try {
    const testData = {
      user_id: '00000000-0000-0000-0000-000000000000',
      api_key_id: '00000000-0000-0000-0000-000000000000',
      request_id: 'test-diagnostic',
      endpoint: '/test',
      model: 'test',
      provider: 'test',
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      token_source: 'unknown',
      cost_usd: 0,
      response_time_ms: 0,
      status_code: 200,
      is_error: false,
    }

    // Try insert (will fail due to foreign key, but that's OK)
    const { error } = await supabase.from('usage_logs').insert(testData)

    if (error) {
      if (error.message.includes('partition')) {
        console.error('❌ PARTITION ERROR:', error.message)
        console.log()
        console.log('⚠️  This is likely the root cause!')
        console.log(`⚠️  Partition ${partitionName} may not exist`)
        console.log()
      } else if (error.message.includes('foreign key')) {
        console.log('✓ Partition exists (insert failed on foreign key as expected)')
      } else {
        console.log('Insert test result:', error.message)
      }
    } else {
      console.log('✓ Test insert succeeded (will delete)')
      // Clean up
      await supabase.from('usage_logs').delete().eq('request_id', 'test-diagnostic')
    }
  } catch (err) {
    console.error('Error testing partition:', err.message)
  }
  console.log()
}

async function checkMigrations() {
  console.log('🔧 7. Checking if token_source column exists...')
  console.log()

  const { data, error } = await supabase
    .from('usage_logs')
    .select('token_source')
    .limit(1)

  if (error) {
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.error('❌ token_source column does NOT exist!')
      console.log('⚠️  Migration 015_token_source.sql has not been run!')
      console.log()
      console.log('Fix: Run migrations:')
      console.log('  cd supabase')
      console.log('  supabase db push')
      console.log()
    } else {
      console.error('Error:', error.message)
    }
  } else {
    console.log('✓ token_source column exists')
    console.log()
  }
}

async function main() {
  const tableOk = await checkTableStructure()
  if (!tableOk) {
    console.log('❌ Cannot proceed - usage_logs table issues')
    process.exit(1)
  }

  await checkMigrations()
  await checkPartitions()
  await checkRecentLogs()
  await checkUsers()
  await checkAPIKeys()
  await checkTokenSource()

  console.log('=' .repeat(80))
  console.log('✅ Diagnostic complete')
  console.log()
  console.log('Summary:')
  console.log('  If no logs appear in last hour despite making 150 requests:')
  console.log('  1. Check if partition for current month exists')
  console.log('  2. Check application logs for "Failed to log usage" errors')
  console.log('  3. Verify token_source column exists')
  console.log('  4. Check if requests are actually reaching the API')
  console.log()
}

main().catch(console.error)
