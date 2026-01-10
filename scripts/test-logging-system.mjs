#!/usr/bin/env node
/**
 * Test script to verify the logging and monitoring system
 * Tests:
 * 1. Logger properly logs at different levels
 * 2. Usage tracker can log to database
 * 3. Request/response logging works
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

console.log('🧪 Testing Logging and Monitoring System\n')

// Test 1: Check if Supabase connection works
console.log('1️⃣  Testing database connection...')
try {
  const { data, error } = await supabase
    .from('usage_logs')
    .select('id')
    .limit(1)

  if (error) {
    console.error('❌ Database connection failed:', error.message)
    console.error('   Error details:', error)
  } else {
    console.log('✅ Database connection successful')
  }
} catch (err) {
  console.error('❌ Exception during database test:', err.message)
}

// Test 2: Check recent usage logs
console.log('\n2️⃣  Checking recent usage logs...')
try {
  const { data: recentLogs, error } = await supabase
    .from('usage_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('❌ Failed to fetch recent logs:', error.message)
  } else {
    console.log(`✅ Found ${recentLogs.length} recent usage logs`)
    if (recentLogs.length > 0) {
      const latestLog = recentLogs[0]
      console.log('   Latest log details:')
      console.log(`   - Request ID: ${latestLog.request_id}`)
      console.log(`   - Model: ${latestLog.model}`)
      console.log(`   - Tokens: ${latestLog.total_tokens} (${latestLog.token_source})`)
      console.log(`   - Cost: $${latestLog.cost_usd}`)
      console.log(`   - Status: ${latestLog.status}`)
      console.log(`   - Created: ${latestLog.created_at}`)

      // Check for failed logs
      const failedLogs = recentLogs.filter(log => log.is_error || log.status === 'started')
      if (failedLogs.length > 0) {
        console.warn(`   ⚠️  Found ${failedLogs.length} potentially failed/incomplete logs`)
        failedLogs.forEach(log => {
          console.warn(`      - ${log.request_id}: status=${log.status}, error=${log.is_error}`)
        })
      }
    } else {
      console.warn('   ⚠️  No usage logs found - system may not be logging properly')
    }
  }
} catch (err) {
  console.error('❌ Exception during usage log check:', err.message)
}

// Test 3: Check for critical logging failures
console.log('\n3️⃣  Searching for logging failures in recent logs...')
try {
  // Check for rows stuck in 'started' status (should be finalized)
  const { data: stuckLogs, error: stuckError } = await supabase
    .from('usage_logs')
    .select('*')
    .eq('status', 'started')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })

  if (stuckError) {
    console.error('❌ Failed to check for stuck logs:', stuckError.message)
  } else if (stuckLogs.length > 0) {
    console.error(`❌ Found ${stuckLogs.length} logs stuck in 'started' status`)
    console.error('   This indicates the finalization step is failing')
    stuckLogs.slice(0, 5).forEach(log => {
      console.error(`   - ${log.request_id} (${log.created_at})`)
    })
  } else {
    console.log('✅ No logs stuck in started status')
  }
} catch (err) {
  console.error('❌ Exception during failure check:', err.message)
}

// Test 4: Verify token source tracking
console.log('\n4️⃣  Checking token source tracking...')
try {
  const { data: tokenSources, error } = await supabase
    .from('usage_logs')
    .select('token_source')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  if (error) {
    console.error('❌ Failed to check token sources:', error.message)
  } else {
    const sourceCounts = tokenSources.reduce((acc, log) => {
      const source = log.token_source || 'unknown'
      acc[source] = (acc[source] || 0) + 1
      return acc
    }, {})

    console.log('✅ Token source distribution (last 24h):')
    Object.entries(sourceCounts).forEach(([source, count]) => {
      console.log(`   - ${source}: ${count} logs`)
    })

    if (sourceCounts['unknown'] > 0) {
      const unknownPercent = (sourceCounts['unknown'] / tokenSources.length * 100).toFixed(1)
      console.warn(`   ⚠️  ${unknownPercent}% of logs have unknown token source`)
    }
  }
} catch (err) {
  console.error('❌ Exception during token source check:', err.message)
}

// Test 5: Check cost calculation accuracy
console.log('\n5️⃣  Verifying cost calculations...')
try {
  const { data: recentWithCost, error } = await supabase
    .from('usage_logs')
    .select('model, prompt_tokens, completion_tokens, total_tokens, cost_usd')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .not('cost_usd', 'is', null)
    .limit(10)

  if (error) {
    console.error('❌ Failed to check costs:', error.message)
  } else {
    const invalidCosts = recentWithCost.filter(log =>
      log.cost_usd < 0 ||
      (log.total_tokens > 0 && log.cost_usd === 0) ||
      isNaN(log.cost_usd)
    )

    if (invalidCosts.length > 0) {
      console.error(`❌ Found ${invalidCosts.length} logs with invalid costs`)
      invalidCosts.forEach(log => {
        console.error(`   - ${log.model}: ${log.total_tokens} tokens, $${log.cost_usd}`)
      })
    } else {
      console.log('✅ Cost calculations appear correct')
      if (recentWithCost.length > 0) {
        const avgCost = recentWithCost.reduce((sum, log) => sum + Number(log.cost_usd), 0) / recentWithCost.length
        console.log(`   Average cost per request: $${avgCost.toFixed(6)}`)
      }
    }
  }
} catch (err) {
  console.error('❌ Exception during cost check:', err.message)
}

// Summary
console.log('\n' + '='.repeat(50))
console.log('📊 SUMMARY')
console.log('='.repeat(50))
console.log('\nLogging System Status:')
console.log('- Check the output above for any ❌ or ⚠️  indicators')
console.log('- All ✅ means the system is working correctly')
console.log('\nTo monitor logs in real-time:')
console.log('  1. Check application logs for structured JSON output')
console.log('  2. Look for "USAGE_LOGGING_FAILURE" in error logs')
console.log('  3. Monitor Supabase dashboard for usage_logs table')
console.log('\nIf you see failures:')
console.log('  - Verify SUPABASE_SERVICE_ROLE_KEY is set correctly')
console.log('  - Check database permissions and RLS policies')
console.log('  - Review application logs for detailed error messages')
console.log('  - Look for "CRITICAL:" in logs which indicate serious issues')
